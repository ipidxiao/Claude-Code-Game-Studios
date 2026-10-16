/**
 * Modifier contributor bus — appendix / optional rules register here
 * instead of forking SituationalEngine.resolve.
 */
const _contributors = [];

/**
 * @param {string} id
 * @param {(ctx: object) => object[]|{ parts?: object[], band?: string, damageExpr?: string, ranged?: boolean }} fn
 * @param {object} [opts]
 * @param {number} [opts.priority] lower runs first (default 100; core uses 0)
 */
export function registerModifierContributor(id, fn, opts) {
    if (!id || typeof fn !== 'function') return { ok: false, desc: 'invalid contributor' };
    const priority = (opts && opts.priority != null) ? Number(opts.priority) : 100;
    const existing = _contributors.findIndex((c) => c.id === id);
    const entry = { id: String(id), fn: fn, priority: priority };
    if (existing >= 0) _contributors[existing] = entry;
    else _contributors.push(entry);
    _contributors.sort((a, b) => a.priority - b.priority);
    return { ok: true, id: entry.id };
}

export function unregisterModifierContributor(id) {
    const i = _contributors.findIndex((c) => c.id === id);
    if (i < 0) return false;
    _contributors.splice(i, 1);
    return true;
}

export function listModifierContributors() {
    return _contributors.map((c) => ({ id: c.id, priority: c.priority }));
}

/**
 * Collect parts from all contributors.
 * @returns {{ parts: object[], band: string|null, damageExpr: string|null, ranged: boolean }}
 */
export function collectModifiers(ctx) {
    const parts = [];
    let band = null;
    let damageExpr = null;
    let ranged = !!(ctx && ctx.ranged);
    for (let i = 0; i < _contributors.length; i++) {
        const out = _contributors[i].fn(ctx || {});
        if (!out) continue;
        if (Array.isArray(out)) {
            for (let j = 0; j < out.length; j++) parts.push(out[j]);
            continue;
        }
        if (Array.isArray(out.parts)) {
            for (let j = 0; j < out.parts.length; j++) parts.push(out.parts[j]);
        }
        if (out.band != null) band = out.band;
        if (out.damageExpr != null) damageExpr = out.damageExpr;
        if (out.ranged != null) ranged = !!out.ranged;
    }
    return { parts: parts, band: band, damageExpr: damageExpr, ranged: ranged };
}

/** Test helper */
export function _resetModifierBusForTests() {
    _contributors.length = 0;
}

export function attachModifierBus(CoCEngine) {
    CoCEngine.ModifierBus = {
        register: registerModifierContributor,
        unregister: unregisterModifierContributor,
        list: listModifierContributors,
        collect: collectModifiers
    };
    CoCEngine.registerModifierContributor = registerModifierContributor;
}
