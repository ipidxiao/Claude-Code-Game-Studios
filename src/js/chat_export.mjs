// ===============================================
// Chat Export Utilities — copy & export conversation.
// ===============================================

function isExportableMessage(m) {
    if (!m || m.isHidden || m.isLocalError) return false;
    if (m.role === 'user') return !!(m.content && String(m.content).trim());
    if (m.role === 'assistant') return !!(m.content && String(m.content).trim());
    if (m.role === 'system') return !!(m.content && String(m.content).trim());
    return false;
}

function formatRoleLabel(m) {
    if (m.role === 'user') return '[玩家]';
    if (m.role === 'assistant') return '[守秘人]';
    return '[系统]';
}

function formatRoleMarkdown(m) {
    if (m.role === 'user') return '**玩家**';
    if (m.role === 'assistant') return '**守秘人**';
    return '*系统*';
}

function buildPlainText(history) {
    return (history || [])
        .filter(isExportableMessage)
        .map((m) => `${formatRoleLabel(m)} ${m.content}`)
        .join('\n\n');
}

function copyWithFallback(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject(new Error('execCommand failed'));
}

export const ChatExport = {
    isExportableMessage,
    buildPlainText,

    copyChatText(state) {
        if (!state?.gameState) {
            state?.showToast?.('无法复制：游戏状态未就绪', 'danger');
            return;
        }
        const text = buildPlainText(state.gameState.chatHistory);
        if (!text.trim()) {
            state.showToast?.('当前没有可复制的对话内容', 'warning');
            return;
        }
        copyWithFallback(text)
            .then(() => state.showToast?.(`已复制 ${text.length} 字符到剪贴板`, 'success'))
            .catch(() => state.showToast?.('复制失败，请检查浏览器剪贴板权限', 'danger'));
    },

    exportChatMarkdown(state) {
        if (!state?.gameState) {
            state?.showToast?.('无法导出：游戏状态未就绪', 'danger');
            return;
        }
        const history = state.gameState.chatHistory || [];
        const lines = [
            '# CoC 7th Engine — 对话记录',
            `> 导出时间: ${new Date().toLocaleString('zh-CN')}`,
            `> 地点: ${state.gameState.currentLocation || '未知'}`,
            ''
        ];
        let count = 0;
        history.forEach((m) => {
            if (!isExportableMessage(m)) return;
            count += 1;
            lines.push(`### ${formatRoleMarkdown(m)}`);
            lines.push(String(m.content).replace(/\n/g, '\n\n'));
            lines.push('');
        });
        if (!count) {
            state.showToast?.('当前没有可导出的对话内容', 'warning');
            return;
        }
        const text = lines.join('\n');
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CoC_Chat_${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        state.showToast?.('对话已导出为 Markdown 文件', 'success');
    }
};

if (typeof window !== 'undefined') {
    window.ChatExport = ChatExport;
}
