/**
 * Hunger / thirst deprivation stages (Keeper-style simplified daily track).
 */
export const CoCDeprivation = Object.freeze({
    hunger: Object.freeze({
        id: 'hunger',
        label: '饥饿',
        stages: Object.freeze([
            Object.freeze({ stage: 1, days: 1, penaltyDice: 0, damage: '0' }),
            Object.freeze({ stage: 2, days: 2, penaltyDice: 1, damage: '0' }),
            Object.freeze({ stage: 3, days: 4, penaltyDice: 1, damage: '1' }),
            Object.freeze({ stage: 4, days: 7, penaltyDice: 2, damage: '1D3' })
        ])
    }),
    thirst: Object.freeze({
        id: 'thirst',
        label: '干渴',
        stages: Object.freeze([
            Object.freeze({ stage: 1, days: 1, penaltyDice: 1, damage: '0' }),
            Object.freeze({ stage: 2, days: 2, penaltyDice: 1, damage: '1' }),
            Object.freeze({ stage: 3, days: 3, penaltyDice: 2, damage: '1D3' }),
            Object.freeze({ stage: 4, days: 4, penaltyDice: 2, damage: '1D6' })
        ])
    })
});

export function stageForDays(kind, daysWithout) {
    const def = CoCDeprivation[kind];
    if (!def) return null;
    const d = Math.max(0, Math.floor(Number(daysWithout) || 0));
    let best = def.stages[0];
    for (let i = 0; i < def.stages.length; i++) {
        if (d >= def.stages[i].days) best = def.stages[i];
    }
    return Object.assign({ kind, daysWithout: d }, best);
}
