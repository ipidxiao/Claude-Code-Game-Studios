/**
 * Count CJK Han characters in a scenario object (all player-facing strings) — a report, not a target.
 * It used to gate novella-scale modules at ≥100000; modules were padded with template filler to
 * reach it (phone test 2026-10-18). Story quality is checked by narrative_immersion_smoke.
 */
const CJK_RE = /[\u4e00-\u9fff]/g;


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
