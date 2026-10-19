import { CoCEngine } from '../coc.mjs';
import { CoCToolHandlers } from '../tools/handlers/index.mjs';
import { CoCLorebook } from '../ai/lorebook.mjs';
// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * Lightweight extension shell (Phase 3) — event bus + registerExtension.
 * Not a SillyTavern port; debug/plugin hooks only.
 */

const _listeners = new Map(); // event -> Set<fn>
const _extensions = [];

export function on(event, fn) {
    const key = String(event || '');
    if (!key || typeof fn !== 'function') return () => {};
    if (!_listeners.has(key)) _listeners.set(key, new Set());
    _listeners.get(key).add(fn);
    return () => off(event, fn);
}

export function off(event, fn) {
    const set = _listeners.get(String(event || ''));
    if (set) set.delete(fn);
}

export function emit(event, payload) {
    const key = String(event || '');
    const set = _listeners.get(key);
    if (!set || !set.size) return 0;
    let n = 0;
    set.forEach((fn) => {
        try { fn(payload); n++; } catch (e) {
            if (typeof console !== 'undefined') console.warn('[CoCExtensions]', key, e);
        }
    });
    return n;
}

/**
 * Snapshot for extensions / slash — never invent state.
 * When `track` is provided, `on` registrations are recorded for unregister cleanup.
 */
export function getGameContext(track) {
    const gameState = (typeof window !== 'undefined' && window.CoCState && window.CoCState.gameState)
        || (typeof window !== 'undefined' && window.gameState)
        || null;
    const Engine = CoCEngine || null;
    const tools = CoCToolHandlers || null;
    const trackedOn = (event, fn) => {
        const unsub = on(event, fn);
        if (track && typeof fn === 'function') {
            track.push({ event: String(event || ''), fn, unsub });
        }
        return unsub;
    };
    return {
        gameState,
        Engine,
        lorebook: CoCLorebook,
        tools,
        emit,
        on: track ? trackedOn : on,
        off
    };
}

export function registerExtension(ext) {
    if (!ext || !ext.id) throw new Error('registerExtension: id required');
    const id = String(ext.id);
    if (_extensions.some((e) => e.id === id)) {
        throw new Error('registerExtension: duplicate id ' + id);
    }
    const owned = []; // { event, fn, unsub } from setup ctx.on
    const record = { id, setup: ext.setup || null, api: ext, owned };
    _extensions.push(record);
    if (typeof ext.setup === 'function') {
        try {
            ext.setup(getGameContext(owned));
        } catch (e) {
            // Remove zombie: drop from list + clear any listeners setup attached before throw
            const i = _extensions.findIndex((e2) => e2.id === id);
            if (i >= 0) _extensions.splice(i, 1);
            owned.forEach((o) => { try { o.unsub(); } catch (_e) { /* ignore */ } });
            if (typeof console !== 'undefined') console.warn('[CoCExtensions] setup failed', id, e);
            throw e;
        }
    }
    return () => {
        const i = _extensions.findIndex((e) => e.id === id);
        if (i < 0) return;
        const rec = _extensions[i];
        _extensions.splice(i, 1);
        (rec.owned || []).forEach((o) => {
            try { o.unsub(); } catch (_e) { /* ignore */ }
        });
        rec.owned = [];
    };
}

export function listExtensions() {
    return _extensions.map((e) => e.id);
}

export const CoCExtensions = {
    on, off, emit, getGameContext, registerExtension, listExtensions
};

if (typeof window !== 'undefined') {
    window.CoCExtensions = CoCExtensions;
}
