/**
 * Single source of truth for KP engine defaults and per-module lobby preference.
 */
import { KpExecutionEngine } from '../campaign/kp_execution_engine.mjs';

/** Default KP enabled for fresh game sessions (global bottom-layer design). */
export const KP_ENGINE_DEFAULT_ENABLED = true;

const KP_PREF_STORAGE_PREFIX = 'coc_kp_pref_';

export function kpPrefStorageKey(moduleId) {
    return KP_PREF_STORAGE_PREFIX + (moduleId || 'default');
}

/** @returns {boolean|null} null when no stored preference */
export function loadKpPreference(moduleId) {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(kpPrefStorageKey(moduleId));
        if (raw === null || raw === undefined) return null;
        return raw === 'true' || raw === '1';
    } catch (e) {
        return null;
    }
}

export function saveKpPreference(moduleId, enabled) {
    try {
        if (typeof localStorage === 'undefined') return false;
        localStorage.setItem(kpPrefStorageKey(moduleId), String(!!enabled));
        return true;
    } catch (e) {
        return false;
    }
}

export function applyKpPreferenceToGameState(gameState) {
    if (!gameState || !gameState.kpEngine) return;
    const pref = loadKpPreference(gameState.activeModuleId);
    if (pref !== null) gameState.kpEngine.enabled = pref;
}

/** Shared accessor for KP runtime. */
export function getKpEngine() {
    if (KpExecutionEngine) return KpExecutionEngine;
    if (typeof window !== 'undefined' && window.KpExecutionEngine) return window.KpExecutionEngine;
    return null;
}

export const CoCKpConfig = {
    KP_ENGINE_DEFAULT_ENABLED,
    kpPrefStorageKey,
    loadKpPreference,
    saveKpPreference,
    applyKpPreferenceToGameState,
    getKpEngine
};

const _browserRoot = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : null);
if (_browserRoot && _browserRoot.window) {
    _browserRoot.window.CoCKpConfig = CoCKpConfig;
} else if (typeof window !== 'undefined') {
    window.CoCKpConfig = CoCKpConfig;
}
