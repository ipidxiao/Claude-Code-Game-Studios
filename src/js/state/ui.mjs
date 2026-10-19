import { CoCContextManager } from '../core/context_manager.mjs';
/**
 * CoC State UI — non-blocking feedback (Toast/Confirm) + chat compaction.
 *
 * Depends on: CoCStateCore (gameState), CoCContextManager (for compaction).
 */
export const CoCStateUI = (function() {
    const create = function(core) {
        const { gameState, scrollToBottom } = core;

        const _isQuotaExceeded = (e) => e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
        const _formatStorageError = (e, prefix = '存储失败') => _isQuotaExceeded(e) ? `${prefix}：浏览器 localStorage 空间不足，请导出备份后清理旧存档。` : `${prefix}：${e && e.message ? e.message : '未知错误'}`;

        const showToast = (message, type = 'info', options = {}) => {
            const text = String(message || '').trim();
            if (!text) return null;
            const id = Date.now() + Math.random();
            const toast = { id, message: text, type, title: options.title || '', createdAt: Date.now() };
            try {
                gameState.ui.toasts.push(toast);
                const limit = Math.max(1, options.limit || 5);
                while (gameState.ui.toasts.length > limit) gameState.ui.toasts.shift();
                const timeout = Number.isFinite(options.timeout) ? options.timeout : 3600;
                if (timeout > 0 && typeof setTimeout === 'function') {
                    setTimeout(() => {
                        const idx = gameState.ui.toasts.findIndex(t => t.id === id);
                        if (idx >= 0) gameState.ui.toasts.splice(idx, 1);
                    }, timeout);
                }
            } catch(e) { try { console.warn(text); } catch(_) {} }
            return id;
        };

        let _confirmResolver = null;
        const confirmAction = (message, options = {}) => new Promise((resolve) => {
            if (_confirmResolver) {
                const prev = _confirmResolver;
                _confirmResolver = null;
                prev(false);
            }
            _confirmResolver = resolve;
            gameState.ui.confirmDialog = {
                message: String(message || ''),
                title: options.title || '确认操作',
                okText: options.okText || '确认',
                cancelText: options.cancelText || '取消',
                danger: !!options.danger
            };
        });
        const resolveConfirm = (ok) => {
            const resolver = _confirmResolver;
            _confirmResolver = null;
            gameState.ui.confirmDialog = null;
            if (resolver) resolver(!!ok);
        };

        /**
         * Trim runtime chat history using CoCContextManager to keep memory
         * bounded during long campaigns.  Injects a system notice when
         * messages are dropped so the user is aware of compaction.
         * @param {string} [reason='auto'] - Compaction trigger label
         * @returns {{droppedCount: number, messages?: Array}}
         */
        const compactChatHistory = (reason = 'auto') => {
            const manager = CoCContextManager;
            if (!manager || !manager.trimRuntimeMessages || !Array.isArray(gameState.chatHistory)) return { droppedCount: 0 };
            const result = manager.trimRuntimeMessages(gameState.chatHistory);
            if (result && result.droppedCount > 0 && Array.isArray(result.messages)) {
                gameState.chatHistory.splice(0, gameState.chatHistory.length, ...result.messages);
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🧹 [上下文] 已压缩较早聊天记录 ${result.droppedCount} 条，以保持长期战役稳定。` });
            }
            return result || { droppedCount: 0 };
        };

        const _pushSystemNotice = (content, isAlert = false) => {
            try { gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert, content }); compactChatHistory('notice'); scrollToBottom(); } catch(e) {}
        };
        const _safeLocalStorageSetItem = (key, value, context = '存储') => {
            try { localStorage.setItem(key, value); return true; }
            catch(e) { console.error(context, e); _pushSystemNotice(`💾 [${context}] ${_formatStorageError(e, '写入失败')}`, true); showToast(_formatStorageError(e, `${context}失败`), 'danger'); return false; }
        };
        const saveSettings = (rememberKey = false) => {
            const payload = JSON.stringify(gameState.aiSettings);
            let ok;
            if (rememberKey) {
                ok = _safeLocalStorageSetItem('vue_coc_api_cloud', payload, 'AI设置保存');
                try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('vue_coc_api_cloud'); } catch(e) {}
            } else {
                let usedSession = false;
                try {
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.setItem('vue_coc_api_cloud', payload);
                        ok = true;
                        usedSession = true;
                    } else {
                        ok = _safeLocalStorageSetItem('vue_coc_api_cloud', payload, 'AI设置保存(回退)');
                    }
                } catch(e) {
                    ok = _safeLocalStorageSetItem('vue_coc_api_cloud', payload, 'AI设置保存(回退)');
                }
                // Clear remembered plaintext key only when session storage actually holds the payload.
                if (usedSession) {
                    try { if (typeof localStorage !== 'undefined') localStorage.removeItem('vue_coc_api_cloud'); } catch(e) {}
                }
            }
            const storageType = rememberKey ? '本地存储（跨会话）' : '会话存储（关闭浏览器后清除）';
            showToast(ok ? `AI 设置已保存到${storageType}。` : 'AI 设置保存失败。', ok ? 'success' : 'danger');
            if (ok) core.switchScreen('lobby');
            return ok;
        };

        // rAF batched rendering for chat messages
        let _batchQueue = [];
        let _batchScheduled = false;
        const flushBatch = () => {
            _batchScheduled = false;
            if (_batchQueue.length === 0) return;
            const msgs = _batchQueue.splice(0);
            gameState.chatHistory.push(...msgs);
        };
        const pushMessageBatched = (msg) => {
            _batchQueue.push(msg);
            if (!_batchScheduled) {
                _batchScheduled = true;
                if (typeof requestAnimationFrame !== 'undefined') {
                    requestAnimationFrame(flushBatch);
                } else {
                    setTimeout(flushBatch, 0);
                }
            }
        };
        const flushMessagesNow = () => { if (_batchScheduled) flushBatch(); };

        return { showToast, confirmAction, resolveConfirm, compactChatHistory, _pushSystemNotice, _safeLocalStorageSetItem, saveSettings, _formatStorageError, _isQuotaExceeded, pushMessageBatched, flushMessagesNow };
    };
    return { create };
})();
