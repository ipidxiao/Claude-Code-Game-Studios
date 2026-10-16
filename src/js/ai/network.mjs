// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { safeJsonParse, safeJsonClone } from '../data/utils.mjs';
export { safeJsonParse, safeJsonClone };
/**
 * CoC AI Network Layer
 *
 * HTTP transport, retry with exponential backoff, timeout handling, and
 * AI-specific error formatting.  All symbols are file-scoped globals.
 */
export const MAX_TOOL_ROUNDS = 10;
export const AI_REQUEST_TIMEOUT_MS = 30000;
export const AI_REQUEST_MAX_ATTEMPTS = 3;
const DEFAULT_AI_RETRY_BACKOFF_MS = [0, 800, 1600];
export const MAX_TOOL_ARG_STRING_LENGTH = 2000;
export const MAX_TOOL_ARG_ARRAY_ITEMS = 40;
/**
 * Fetch with AbortController timeout.  Automatically aborts after timeoutMs.
 * @param {string} url - Request URL
 * @param {Object} [options={}] - Standard fetch options
 * @param {number} [timeoutMs=AI_REQUEST_TIMEOUT_MS] - Timeout in ms
 * @returns {Promise<Response>}
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS) => {
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
    } finally {
        if (timer) clearTimeout(timer);
    }
};
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms || 0)));
/**
 * Get retry backoff delay for a given failed attempt.
 * Supports override via window.COC_AI_RETRY_BACKOFF_MS.
 * @param {number} failedAttempt - 1-indexed attempt that just failed
 * @returns {number} Delay in milliseconds
 */
export const getAiRetryBackoffMs = (failedAttempt) => {
    const override = (typeof window !== 'undefined' && Array.isArray(window.COC_AI_RETRY_BACKOFF_MS)) ? window.COC_AI_RETRY_BACKOFF_MS : null;
    const source = override || DEFAULT_AI_RETRY_BACKOFF_MS;
    const value = source[Math.min(Math.max(0, failedAttempt), source.length - 1)];
    return Number.isFinite(value) ? value : 0;
};
/**
 * Determine whether an AI request error is transient and should be retried.
 * Covers AbortError, HTTP 408/409/425/429, 5xx, and network TypeError.
 * @param {Error} err - The caught error
 * @returns {boolean}
 */
export const isRetryableAiError = (err) => {
    if (!err) return false;
    if (err.name === 'AbortError') return true;
    if (err.status === 408 || err.status === 409 || err.status === 425 || err.status === 429) return true;
    if (Number.isFinite(err.status) && err.status >= 500 && err.status <= 599) return true;
    // Browser fetch uses TypeError for network/CORS-level failures. Treat it as transient.
    if (err.name === 'TypeError' && !Number.isFinite(err.status)) return true;
    return false;
};
export const formatAiError = (err) => {
    if (!err) return '未知错误';
    if (err.name === 'AbortError') return `请求超时（>${Math.round(AI_REQUEST_TIMEOUT_MS / 1000)}秒）`;
    if (Number.isFinite(err.status)) return `HTTP ${err.status}${err.statusText ? ' ' + err.statusText : ''}`;
    return err.message || String(err);
};
/**
 * AI endpoints receive the API key, so only https — or plain http to this machine —
 * is allowed (same rule as the public catalog base in scenario/store.mjs).
 * @param {string} url
 * @returns {boolean}
 */
export const isSafeAiEndpoint = (url) => {
    let parsed;
    try { parsed = new URL(String(url || '').trim()); } catch (_e) { return false; }
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol !== 'http:') return false;
    const host = String(parsed.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};
/** True when the browser reports no network connectivity. */
export const isBrowserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
/**
 * Fetch AI completion with automatic retry on transient errors.
 * @param {string} url - API endpoint
 * @param {Object} [options={}] - fetch options (method, headers, body)
 * @param {number} [timeoutMs=AI_REQUEST_TIMEOUT_MS] - Per-request timeout
 * @param {number} [maxAttempts=AI_REQUEST_MAX_ATTEMPTS] - Max total attempts
 * @param {Function} [onRetry] - Callback(err, nextAttempt, maxAttempts, delayMs) on retry
 * @returns {Promise<{response: Response, attempts: number}>}
 * @throws {Error} With .attempts and .retryable properties on final failure
 */
export const fetchAiCompletionWithRetry = async (url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS, maxAttempts = AI_REQUEST_MAX_ATTEMPTS, onRetry = null) => {
    if (!isSafeAiEndpoint(url)) {
        // The request carries the API key: refuse before fetch, and do not retry.
        const err = new Error('接口地址须使用 https://（仅本机地址可用 http://），已拒绝发送密钥');
        err.name = 'AiEndpointError';
        err.attempts = 0;
        err.retryable = false;
        throw err;
    }
    const attempts = Math.max(1, maxAttempts || 1);
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const res = await fetchWithTimeout(url, options, timeoutMs);
            if (!res.ok) {
                const err = new Error(`HTTP ${res.status}`);
                err.status = res.status;
                err.statusText = res.statusText || '';
                try { err.body = typeof res.text === 'function' ? await res.text() : ''; } catch(_) {}
                throw err;
            }
            return { response: res, attempts: attempt };
        } catch (err) {
            lastError = err;
            const retryable = isRetryableAiError(err);
            if (!retryable || attempt >= attempts) {
                err.attempts = attempt;
                err.retryable = retryable;
                throw err;
            }
            const delayMs = getAiRetryBackoffMs(attempt);
            try { if (typeof onRetry === 'function') onRetry(err, attempt + 1, attempts, delayMs); } catch(_) {}
            if (delayMs > 0) await sleep(delayMs);
        }
    }
    throw lastError || new Error('AI请求失败');
};
