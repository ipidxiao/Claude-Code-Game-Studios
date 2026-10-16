/**
 * Desk preference archive + optional prompt gate (DevLog feature flag).
 * Default OFF — no confirm dialogs until enabled.
 */

export const DESK_PREF_FEATURE_KEY = 'coc_feature_desk_pref_prompt';
export const DESK_PREF_GLOBAL_KEY = 'coc_desk_pref_global';
export const DESK_PREF_PREFIX = 'coc_desk_pref_';

/** In-memory fallback when localStorage is unavailable (Node smokes). */
const memoryStore = Object.create(null);

const STYLE_LABEL = Object.freeze({
    strict: '严苛',
    cinematic: '电影',
    pulp_lite: '轻Pulp'
});

const CARRY_LABEL = Object.freeze({
    inherit: '继承档案与收获',
    reset: '重置调查员',
    none: '不指定（沿用默认）'
});

function storageGet(key) {
    try {
        if (typeof localStorage !== 'undefined') {
            const v = localStorage.getItem(key);
            if (v != null) return v;
        }
    } catch (_e) { /* ignore */ }
    return memoryStore[key] != null ? memoryStore[key] : null;
}

function storageSet(key, value) {
    memoryStore[key] = value;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }
    } catch (_e) { /* ignore */ }
    return true;
}

/** Test helper: clear memory + optional localStorage keys. */
export function resetDeskPrefStorageForTests() {
    Object.keys(memoryStore).forEach((k) => { delete memoryStore[k]; });
}

export function isDeskPrefPromptEnabled() {
    return storageGet(DESK_PREF_FEATURE_KEY) === '1';
}

export function setDeskPrefPromptEnabled(on) {
    storageSet(DESK_PREF_FEATURE_KEY, on ? '1' : '0');
    return isDeskPrefPromptEnabled();
}

export function emptyDeskPref() {
    return {
        keeperStyle: 'cinematic',
        carryMode: 'inherit',
        capabilityFilter: ''
    };
}

export function normalizeDeskPref(raw) {
    const base = emptyDeskPref();
    if (!raw || typeof raw !== 'object') return base;
    let style = raw.keeperStyle;
    if (style === 'pulp') style = 'pulp_lite';
    if (style === 'strict' || style === 'cinematic' || style === 'pulp_lite') {
        base.keeperStyle = style;
    }
    if (raw.carryMode === 'inherit' || raw.carryMode === 'reset' || raw.carryMode === 'none') {
        base.carryMode = raw.carryMode;
    }
    if (typeof raw.capabilityFilter === 'string') {
        base.capabilityFilter = raw.capabilityFilter;
    }
    return base;
}

export function loadDeskPref(scenarioId) {
    const id = String(scenarioId || '');
    if (!id) return emptyDeskPref();
    try {
        const raw = storageGet(DESK_PREF_PREFIX + id);
        if (!raw) return emptyDeskPref();
        return normalizeDeskPref(JSON.parse(raw));
    } catch (_e) {
        return emptyDeskPref();
    }
}

export function saveDeskPref(scenarioId, pref) {
    const id = String(scenarioId || '');
    if (!id) return false;
    const n = normalizeDeskPref(pref);
    const ok = storageSet(DESK_PREF_PREFIX + id, JSON.stringify(n));
    storageSet(DESK_PREF_GLOBAL_KEY, JSON.stringify(n));
    return ok;
}

export function loadGlobalDeskPref() {
    try {
        const raw = storageGet(DESK_PREF_GLOBAL_KEY);
        if (!raw) return emptyDeskPref();
        return normalizeDeskPref(JSON.parse(raw));
    } catch (_e) {
        return emptyDeskPref();
    }
}

export function saveGlobalDeskPref(pref) {
    const n = normalizeDeskPref(pref);
    return storageSet(DESK_PREF_GLOBAL_KEY, JSON.stringify(n));
}

/** Human-readable prompt body for confirmAction (only when feature enabled). */
export function formatDeskPrefPrompt(pref) {
    const p = normalizeDeskPref(pref);
    const style = STYLE_LABEL[p.keeperStyle] || p.keeperStyle;
    const carry = CARRY_LABEL[p.carryMode] || p.carryMode;
    const filter = p.capabilityFilter ? p.capabilityFilter : '全部';
    return '沿用上次桌规？\n'
        + '· 风格：' + style + '（' + p.keeperStyle + '）\n'
        + '· 开局：' + carry + '\n'
        + '· 能力筛：' + filter + '\n\n'
        + '确认后写入今晚桌规卡；取消则保持当前选择。';
}

export const CoCDeskPref = {
    DESK_PREF_FEATURE_KEY,
    isDeskPrefPromptEnabled,
    setDeskPrefPromptEnabled,
    emptyDeskPref,
    normalizeDeskPref,
    loadDeskPref,
    saveDeskPref,
    loadGlobalDeskPref,
    saveGlobalDeskPref,
    formatDeskPrefPrompt,
    resetDeskPrefStorageForTests,
    STYLE_LABEL,
    CARRY_LABEL
};
