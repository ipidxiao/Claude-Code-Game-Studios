/**
 * Central registry of browser global export names (OPT-036).
 * Shim only — does not rename or remove existing window.* symbols.
 */

/** @type {Record<string, { global: string, source: string, status?: string }>} */
export const GLOBALS_REGISTRY = {
    CoCState: { global: 'CoCState', source: 'js/state/state.mjs', status: 'stable' },
    CoCStateAccessor: { global: 'CoCStateAccessor', source: 'js/state/accessor.mjs', status: 'stable' },
    CoCEngine: { global: 'CoCEngine', source: 'js/coc.mjs + js/engines/*.mjs', status: 'stable' },
    CoCItemDB: { global: 'CoCItemDB', source: 'js/data/items.mjs', status: 'stable' },
    CoCAI: { global: 'CoCAI', source: 'js/ai_logic.mjs', status: 'stable' },
    KpExecutionEngine: { global: 'KpExecutionEngine', source: 'js/campaign/kp_execution_engine.mjs', status: 'stable' },
    CoCKpConfig: { global: 'CoCKpConfig', source: 'js/state/kp_config.mjs', status: 'stable' },
    CoCToolHandlers: { global: 'CoCToolHandlers', source: 'js/tools/handlers/index.mjs', status: 'stable' },
    CoCGlobalsRegistry: { global: 'CoCGlobalsRegistry', source: 'js/core/globals_registry.mjs', status: 'meta' },
};

export function listDeprecatedGlobals() {
    return Object.entries(GLOBALS_REGISTRY)
        .filter(([, meta]) => meta.status === 'deprecated-alias')
        .map(([key]) => key);
}

if (typeof window !== 'undefined') {
    window.CoCGlobalsRegistry = GLOBALS_REGISTRY;
    window.listDeprecatedGlobals = listDeprecatedGlobals;
}
