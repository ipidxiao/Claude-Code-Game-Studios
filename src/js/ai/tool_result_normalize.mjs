/**
 * Normalize tool handler return values for LLM tool messages.
 * Prevents String(object) → "[object Object]".
 */
export function normalizeToolResultContent(result) {
    if (result == null) return '';
    if (typeof result === 'string') return result;
    if (typeof result !== 'object') return String(result);
    for (const key of ['description', 'desc', 'message', 'msg']) {
        if (typeof result[key] === 'string' && result[key]) return result[key];
    }
    try {
        return JSON.stringify(result);
    } catch (_) {
        return String(result);
    }
}
