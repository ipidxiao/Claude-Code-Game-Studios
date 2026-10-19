// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC Context Manager (AUDITFIX3)
 *
 * Centralizes long-campaign history compaction for three independent use cases:
 * 1) Runtime chat display pruning, so the browser does not keep unbounded DOM/reactive data.
 * 2) Save-file chat pruning, so localStorage and exported saves stay below practical limits.
 * 3) AI request context building, preserving only the latest valid tool-call cluster.
 */
const CoCContextManager = (function() {
    const DEFAULTS = {
        runtimeMaxMessages: 260,
        runtimeMaxChars: 180000,
        saveMaxMessages: 180,
        saveMaxChars: 120000,
        apiMaxMessages: 48,
        apiMaxChars: 60000,
        messageCharLimit: 6000,
        toolArgCharLimit: 6000
    };

    const safeClone = (value, fallback = null) => {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (e) { return fallback; }
    };

    const isHiddenSystemPrompt = (msg) => !!(msg && msg.role === 'system' && msg.isHidden);
    const isUnresolvedToolAssistant = (msg) => !!(msg && msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length && !msg.isResolved);

    const truncateText = (text, maxChars = DEFAULTS.messageCharLimit) => {
        if (text === undefined || text === null) return text;
        const s = String(text);
        if (!Number.isFinite(maxChars) || maxChars <= 0 || s.length <= maxChars) return s;
        return s.slice(0, Math.max(0, maxChars - 28)) + `\n…[已截断 ${s.length - maxChars} 字]`;
    };

    const estimateChars = (messages) => {
        try { return JSON.stringify(messages || []).length; }
        catch (e) { return 0; }
    };

    const cloneMessage = (msg, options = {}) => {
        const copy = safeClone(msg, null);
        if (!copy || typeof copy !== 'object') return null;
        const msgLimit = options.messageCharLimit || DEFAULTS.messageCharLimit;
        const argLimit = options.toolArgCharLimit || DEFAULTS.toolArgCharLimit;
        if (!isHiddenSystemPrompt(copy) && typeof copy.content === 'string') copy.content = truncateText(copy.content, msgLimit);
        if (Array.isArray(copy.tool_calls)) {
            copy.tool_calls = copy.tool_calls.map((tool) => {
                if (tool && tool.function && typeof tool.function.arguments === 'string') {
                    tool.function.arguments = truncateText(tool.function.arguments, argLimit);
                }
                return tool;
            });
        }
        return copy;
    };

    const compactMessages = (messages, options = {}) => {
        const opts = { ...DEFAULTS, ...options };
        const source = Array.isArray(messages) ? messages.filter(Boolean) : [];
        const hidden = source.find(isHiddenSystemPrompt) || null;
        const protectedSet = new Set();
        if (hidden) protectedSet.add(hidden);
        source.forEach((msg) => { if (isUnresolvedToolAssistant(msg)) protectedSet.add(msg); });

        const maxMessages = Math.max(1, opts.maxMessages || opts.runtimeMaxMessages);
        const maxChars = Math.max(1000, opts.maxChars || opts.runtimeMaxChars);
        let kept = source.slice(Math.max(0, source.length - maxMessages));
        protectedSet.forEach((msg) => { if (msg && !kept.includes(msg)) kept.unshift(msg); });

        // Stable de-duplication by object identity.
        const seen = new Set();
        kept = kept.filter((msg) => {
            if (seen.has(msg)) return false;
            seen.add(msg);
            return true;
        });

        let cloned = kept.map((msg) => cloneMessage(msg, opts)).filter(Boolean);
        let droppedCount = source.length - cloned.length;

        const canDrop = (msg) => !isHiddenSystemPrompt(msg) && !isUnresolvedToolAssistant(msg);
        while (estimateChars(cloned) > maxChars && cloned.length > 2) {
            const idx = cloned.findIndex(canDrop);
            if (idx < 0) break;
            cloned.splice(idx, 1);
            droppedCount++;
        }

        return { messages: cloned, droppedCount: Math.max(0, droppedCount), chars: estimateChars(cloned) };
    };

    const trimRuntimeMessages = (messages, options = {}) => compactMessages(messages, {
        maxMessages: options.maxMessages || DEFAULTS.runtimeMaxMessages,
        maxChars: options.maxChars || DEFAULTS.runtimeMaxChars,
        messageCharLimit: options.messageCharLimit || DEFAULTS.messageCharLimit,
        toolArgCharLimit: options.toolArgCharLimit || DEFAULTS.toolArgCharLimit
    });

    const trimForSave = (messages, options = {}) => compactMessages(messages, {
        maxMessages: options.maxMessages || DEFAULTS.saveMaxMessages,
        maxChars: options.maxChars || DEFAULTS.saveMaxChars,
        messageCharLimit: options.messageCharLimit || DEFAULTS.messageCharLimit,
        toolArgCharLimit: options.toolArgCharLimit || DEFAULTS.toolArgCharLimit
    });

    const findLastToolAssistantIndex = (messages) => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m && m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) return i;
        }
        return -1;
    };

    const normalizeApiMessages = (messages, lastToolAssistantIndex) => {
        const out = [];
        const toolIds = new Set();
        if (lastToolAssistantIndex >= 0 && messages[lastToolAssistantIndex]) {
            (messages[lastToolAssistantIndex].tool_calls || []).forEach(t => { if (t && t.id) toolIds.add(t.id); });
        }

        messages.forEach((m, idx) => {
            if (!m || !m.role) return;
            if (m.role === 'tool') {
                if (idx > lastToolAssistantIndex && toolIds.has(m.tool_call_id)) {
                    out.push({ role: 'tool', name: m.name, tool_call_id: m.tool_call_id, content: truncateText(m.content || '', DEFAULTS.messageCharLimit) });
                }
                return;
            }

            const clean = { role: m.role };
            if (m.content !== undefined && m.content !== null) clean.content = truncateText(m.content, DEFAULTS.messageCharLimit);
            else if (m.role === 'tool') clean.content = '';
            if (m.name) clean.name = m.name;
            if (m.tool_call_id) clean.tool_call_id = m.tool_call_id;

            // Old tool-call clusters are converted to plain assistant text, because API providers require
            // each assistant.tool_calls message to be followed by matching tool messages. Keeping only the
            // latest cluster preserves the active continuation while avoiding orphaned historical tools.
            if (idx === lastToolAssistantIndex && Array.isArray(m.tool_calls) && m.tool_calls.length) {
                clean.tool_calls = m.tool_calls.map(t => ({
                    id: t.id,
                    type: 'function',
                    function: {
                        name: t.function && t.function.name,
                        arguments: truncateText((t.function && t.function.arguments) || '{}', DEFAULTS.toolArgCharLimit)
                    }
                }));
            }

            if (clean.role === 'assistant' && !clean.content && !clean.tool_calls) return;
            out.push(clean);
        });
        return out;
    };

    const buildApiMessages = (messages, options = {}) => {
        const opts = { ...DEFAULTS, ...options };
        const source = (Array.isArray(messages) ? messages : [])
            .filter(m => m && !m.isLocalError && !m.isLocalOnly)
            .map(m => cloneMessage(m, opts))
            .filter(Boolean);

        const hidden = source.find(isHiddenSystemPrompt) || null;
        const lastToolOriginalIdx = findLastToolAssistantIndex(source);
        const maxMessages = Math.max(4, opts.maxMessages || opts.apiMaxMessages);
        let start = Math.max(0, source.length - maxMessages);
        if (lastToolOriginalIdx >= 0) start = Math.min(start, lastToolOriginalIdx);

        let slice = source.slice(start);
        if (hidden && !slice.some(isHiddenSystemPrompt)) slice.unshift(hidden);

        let lastToolSliceIdx = findLastToolAssistantIndex(slice);
        while (estimateChars(slice) > (opts.maxChars || DEFAULTS.apiMaxChars) && slice.length > 4) {
            lastToolSliceIdx = findLastToolAssistantIndex(slice);
            const protectedStart = lastToolSliceIdx >= 0 ? lastToolSliceIdx : slice.length;
            let dropIdx = -1;
            for (let i = 0; i < slice.length; i++) {
                if (isHiddenSystemPrompt(slice[i])) continue;
                if (lastToolSliceIdx >= 0 && i >= protectedStart) continue;
                dropIdx = i; break;
            }
            if (dropIdx < 0) break;
            slice.splice(dropIdx, 1);
        }

        lastToolSliceIdx = findLastToolAssistantIndex(slice);
        return normalizeApiMessages(slice, lastToolSliceIdx);
    };

    return {
        DEFAULTS,
        estimateChars,
        truncateText,
        trimRuntimeMessages,
        trimForSave,
        buildApiMessages
    };
})();

export { CoCContextManager };
