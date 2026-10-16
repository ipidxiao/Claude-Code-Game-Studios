/**
 * Count CJK Han characters in a scenario object (all player-facing strings).
 * Gate for novella-scale offline modules: ≥100000 per scenario.
 */
const CJK_RE = /[\u4e00-\u9fff]/g;

export const MIN_SCENARIO_CJK = 100000;

export function countCjkInText(text) {
    return (String(text || '').match(CJK_RE) || []).length;
}

function walk(value, acc) {
    if (typeof value === 'string') {
        acc.cjk += countCjkInText(value);
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) walk(item, acc);
        return;
    }
    if (value && typeof value === 'object') {
        for (const v of Object.values(value)) walk(v, acc);
    }
}

/** Count CJK across an exported scenario object. */
export function countScenarioCjk(scenario) {
    const acc = { cjk: 0 };
    walk(scenario, acc);
    return acc.cjk;
}

/**
 * @param {object} scenario
 * @returns {{ ok: boolean, cjk: number, min: number, gap: number, id: string }}
 */
export function auditScenarioCjkVolume(scenario) {
    const cjk = countScenarioCjk(scenario);
    const gap = Math.max(0, MIN_SCENARIO_CJK - cjk);
    return {
        ok: cjk >= MIN_SCENARIO_CJK,
        cjk,
        min: MIN_SCENARIO_CJK,
        gap,
        id: scenario?.id || ''
    };
}
