/**
 * Thin-module encounter seed — variant flags without duplicating node trees.
 */

export function hashSeed(input) {
    const s = String(input == null ? Date.now() : input);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) || 1;
}

export function resolveEncounterVariant(seed) {
    const n = Number(seed) || 0;
    const idx = Math.abs(n) % 3;
    if (idx === 0) {
        return {
            id: 'A',
            requiresClueQuality: 'partial',
            creatureId: 'cultist',
            enchantmentId: null
        };
    }
    if (idx === 1) {
        return {
            id: 'B',
            requiresClueQuality: 'solid',
            creatureId: 'cultist',
            enchantmentId: 'elder_sign'
        };
    }
    return {
        id: 'C',
        requiresClueQuality: 'decisive',
        creatureId: 'deepone_hybrid',
        enchantmentId: null
    };
}

/** Apply seed + variant flags onto gameState / scenario runner. */
export function applyModuleSeed(gameState, opts) {
    const o = opts || {};
    const seed = o.seed != null ? Number(o.seed) : hashSeed(Date.now());
    gameState.moduleSeed = seed;
    const variant = resolveEncounterVariant(seed);
    gameState.encounterVariant = variant.id;
    const r = gameState.scenarioRunner;
    if (r) {
        if (!r.flags) r.flags = {};
        r.flags.encounterVariant = variant.id;
        r.flags['encounter_' + variant.id] = true;
        if (variant.requiresClueQuality) {
            r.flags.seedRequiresClueQuality = variant.requiresClueQuality;
        }
        if (variant.creatureId) r.flags.seedCreatureId = variant.creatureId;
        if (variant.enchantmentId) r.flags.seedEnchantmentId = variant.enchantmentId;
    }
    return { seed, variant };
}

export const CoCEncounterSeed = {
    hashSeed,
    resolveEncounterVariant,
    applyModuleSeed
};
