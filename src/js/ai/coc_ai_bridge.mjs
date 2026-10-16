/**
 * Thin CoCAI access without importing ai_logic.mjs (avoids Vue state graph in UI modules).
 * ai_logic binds the live object on load; window.CoCAI remains a fallback for mocks.
 */
let _ai = null;

export function bindCoCAI(ai) {
    if (ai) _ai = ai;
}

export function getCoCAI() {
    if (_ai) return _ai;
    if (typeof window !== 'undefined' && window.CoCAI) return window.CoCAI;
    return null;
}

/** Proxy-like convenience: same surface as former window.CoCAI reads. */
export const CoCAIRef = {
    get value() { return getCoCAI(); },
    handlePlayerAction(...args) {
        const ai = getCoCAI();
        return ai && typeof ai.handlePlayerAction === 'function' ? ai.handlePlayerAction(...args) : undefined;
    },
    dispatchToolHandler(...args) {
        const ai = getCoCAI();
        return ai && typeof ai.dispatchToolHandler === 'function' ? ai.dispatchToolHandler(...args) : undefined;
    },
    executeSkillCheck(...args) {
        const ai = getCoCAI();
        return ai && typeof ai.executeSkillCheck === 'function' ? ai.executeSkillCheck(...args) : undefined;
    },
    getSafeSkillName(...args) {
        const ai = getCoCAI();
        return ai && typeof ai.getSafeSkillName === 'function' ? ai.getSafeSkillName(...args) : null;
    },
    moveToLocation(...args) {
        const ai = getCoCAI();
        return ai && typeof ai.moveToLocation === 'function' ? ai.moveToLocation(...args) : undefined;
    }
};
