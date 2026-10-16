// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * Lorebook — budgeted narrative context injection for KP prompts (Phase 2).
 *
 * gameState / tools remain source of truth; lore only feeds prompt narrative.
 * Entries match by keyword / location / chapter / scenarioId within a char budget.
 */

import { CoCScenarioCatalog } from '../data/scenarios/catalog.mjs';
import { CoCScenarioStore } from '../scenario/store.mjs';

/** Default budget for Chinese prompt section (characters, not tokens). */
export const DEFAULT_LORE_BUDGET_CHARS = 2000;

/**
 * @typedef {object} LoreEntry
 * @property {string} id
 * @property {string[]} [keys] — keyword triggers (matched against recent text blob)
 * @property {string} content
 * @property {number} [priority] — higher first when filling budget (default 0)
 * @property {boolean} [enabled] — default true
 * @property {string[]} [scenarioIds] — if set, only when active scenario matches
 * @property {string[]} [locations] — if set, match currentLocation (substring, case-insensitive)
 * @property {string[]} [chapters] — if set, match current node id / chapter id
 * @property {boolean} [always] — include when scenario/location/chapter gates pass (no keyword needed)
 * @property {string} [title] — optional heading in formatted block
 */

export function normalizeLoreEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').trim();
    const content = String(raw.content || '').trim();
    if (!id || !content) return null;
    const keys = Array.isArray(raw.keys)
        ? raw.keys.map((k) => String(k || '').trim()).filter(Boolean)
        : [];
    return {
        id,
        keys,
        content,
        title: raw.title != null ? String(raw.title).trim() : '',
        priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
        enabled: raw.enabled !== false,
        scenarioIds: Array.isArray(raw.scenarioIds)
            ? raw.scenarioIds.map((s) => String(s || '').trim()).filter(Boolean)
            : null,
        locations: Array.isArray(raw.locations)
            ? raw.locations.map((s) => String(s || '').trim()).filter(Boolean)
            : null,
        chapters: Array.isArray(raw.chapters)
            ? raw.chapters.map((s) => String(s || '').trim()).filter(Boolean)
            : null,
        always: !!raw.always
    };
}

function includesCI(hay, needle) {
    if (!needle) return false;
    return String(hay || '').toLowerCase().includes(String(needle).toLowerCase());
}

function gatesPass(entry, ctx) {
    if (entry.scenarioIds && entry.scenarioIds.length) {
        const sid = String(ctx.scenarioId || '');
        if (!sid || !entry.scenarioIds.some((id) => id === sid)) return false;
    }
    if (entry.locations && entry.locations.length) {
        const loc = String(ctx.location || '');
        if (!loc || !entry.locations.some((l) => includesCI(loc, l))) return false;
    }
    if (entry.chapters && entry.chapters.length) {
        const ch = String(ctx.chapter || '');
        if (!ch || !entry.chapters.some((c) => c === ch || includesCI(ch, c))) return false;
    }
    return true;
}

function keywordMatch(entry, textBlob) {
    if (entry.always) return true;
    if (!entry.keys.length) return false;
    const blob = String(textBlob || '');
    return entry.keys.some((k) => includesCI(blob, k));
}

/**
 * @param {{ entries: LoreEntry[], textBlob?: string, location?: string, chapter?: string, scenarioId?: string, budgetChars?: number }} opts
 * @returns {{ selected: LoreEntry[], usedChars: number, leftoverBudget: number }}
 */
export function selectLoreEntries(opts = {}) {
    let budget = DEFAULT_LORE_BUDGET_CHARS;
    if (opts.budgetChars != null && opts.budgetChars !== '') {
        const n = Number(opts.budgetChars);
        if (Number.isFinite(n) && n >= 0) budget = Math.floor(n);
    }
    budget = Math.max(0, budget);
    const ctx = {
        scenarioId: opts.scenarioId || '',
        location: opts.location || '',
        chapter: opts.chapter || ''
    };
    const textBlob = opts.textBlob || '';
    const rawList = Array.isArray(opts.entries) ? opts.entries : [];
    const candidates = [];
    for (let i = 0; i < rawList.length; i++) {
        const entry = normalizeLoreEntry(rawList[i]);
        if (!entry || !entry.enabled) continue;
        if (!gatesPass(entry, ctx)) continue;
        if (!keywordMatch(entry, textBlob)) continue;
        candidates.push(entry);
    }
    // always-on first (stable), then by priority desc, then id
    candidates.sort((a, b) => {
        if (a.always !== b.always) return a.always ? -1 : 1;
        if (b.priority !== a.priority) return b.priority - a.priority;
        return String(a.id).localeCompare(String(b.id));
    });

    const selected = [];
    let used = 0;
    for (let i = 0; i < candidates.length; i++) {
        const e = candidates[i];
        const cost = e.content.length + (e.title ? e.title.length + 4 : 0) + 8;
        if (selected.length && used + cost > budget) continue;
        if (!selected.length && cost > budget) {
            // Allow a single oversized always/high-priority entry truncated by caller? Skip — keep intact only if fits.
            if (cost > budget) continue;
        }
        selected.push(e);
        used += cost;
        if (used >= budget) break;
    }
    return {
        selected,
        usedChars: used,
        leftoverBudget: Math.max(0, budget - used)
    };
}

/**
 * @param {LoreEntry[]} entries
 * @returns {string}
 */
export function formatLoreBlock(entries) {
    const list = Array.isArray(entries) ? entries : [];
    if (!list.length) return '';
    const parts = ['## 相关设定'];
    for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const heading = e.title || e.id;
        parts.push('### ' + heading);
        parts.push(e.content);
    }
    return parts.join('\n');
}

/** Recent chat + location for keyword matching (not full bible). */
export function buildLoreTextBlob(gameState, opts = {}) {
    const maxMsgs = Math.max(1, Number(opts.maxMessages) || 12);
    const maxChars = Math.max(200, Number(opts.maxChars) || 4000);
    const chunks = [];
    if (gameState) {
        if (gameState.currentLocation) chunks.push(String(gameState.currentLocation));
        const r = gameState.scenarioRunner;
        if (r) {
            // Do not include scenarioTitle — titles like「深潜者之影」false-trigger mythos keys.
            if (r.currentNodeId) chunks.push(String(r.currentNodeId));
        }
        const hist = Array.isArray(gameState.chatHistory) ? gameState.chatHistory : [];
        let taken = 0;
        for (let i = hist.length - 1; i >= 0 && taken < maxMsgs; i--) {
            const m = hist[i];
            if (!m || m.isLocalOnly || m.isHidden || m.isLocalError) continue;
            if (m.role !== 'user' && m.role !== 'assistant') continue;
            const c = String(m.content || '').trim();
            if (!c) continue;
            chunks.push(c.slice(0, 800));
            taken++;
        }
    }
    let blob = chunks.join('\n');
    if (blob.length > maxChars) blob = blob.slice(-maxChars);
    return blob;
}

export function resolveLoreBudget(gameState) {
    const settings = gameState && gameState.aiSettings;
    if (settings && settings.loreBudgetChars != null) {
        const n = Number(settings.loreBudgetChars);
        if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
    return DEFAULT_LORE_BUDGET_CHARS;
}

/** Collect lore entries from active scenario (+ optional gameState.lorebook overlay). */
export function collectLoreEntries(gameState) {
    const out = [];
    const seen = new Set();
    const pushAll = (list) => {
        (list || []).forEach((raw) => {
            const e = normalizeLoreEntry(raw);
            if (!e || seen.has(e.id)) return;
            seen.add(e.id);
            out.push(e);
        });
    };
    if (gameState && Array.isArray(gameState.lorebook)) pushAll(gameState.lorebook);
    const r = gameState && gameState.scenarioRunner;
    const sid = r && r.scenarioId;
    if (sid) {
        let scenario = null;
        if (CoCScenarioStore.getScenario) {
            scenario = CoCScenarioStore.getScenario(sid);
        }
        if (!scenario && CoCScenarioCatalog.get) {
            scenario = CoCScenarioCatalog.get(sid);
        }
        if (scenario && Array.isArray(scenario.lorebook)) pushAll(scenario.lorebook);
    }
    return out;
}

/**
 * Build prompt section + debug stamp on gameState.__loreLastInjected.
 * @returns {string} empty or "\n\n## 相关设定\n..."
 */
export function buildLorePromptInjection(gameState) {
    const entries = collectLoreEntries(gameState);
    if (!entries.length) {
        if (gameState) {
            gameState.__loreLastInjected = { ids: [], chars: 0, leftover: resolveLoreBudget(gameState), at: Date.now() };
        }
        return '';
    }
    const r = gameState && gameState.scenarioRunner;
    const budget = resolveLoreBudget(gameState);
    const result = selectLoreEntries({
        entries,
        textBlob: buildLoreTextBlob(gameState),
        location: (gameState && gameState.currentLocation) || '',
        chapter: (r && r.currentNodeId) || '',
        scenarioId: (r && r.scenarioId) || '',
        budgetChars: budget
    });
    if (gameState) {
        gameState.__loreLastInjected = {
            ids: result.selected.map((e) => e.id),
            chars: result.usedChars,
            leftover: result.leftoverBudget,
            budget,
            at: Date.now()
        };
        try {
            if (typeof window !== 'undefined' && window.CoCExtensions && window.CoCExtensions.emit) {
                window.CoCExtensions.emit('lore:injected', gameState.__loreLastInjected);
            }
        } catch (_e) { /* ignore */ }
    }
    const block = formatLoreBlock(result.selected);
    return block ? ('\n\n' + block) : '';
}

export const CoCLorebook = {
    DEFAULT_LORE_BUDGET_CHARS,
    normalizeLoreEntry,
    selectLoreEntries,
    formatLoreBlock,
    buildLoreTextBlob,
    resolveLoreBudget,
    collectLoreEntries,
    buildLorePromptInjection
};
