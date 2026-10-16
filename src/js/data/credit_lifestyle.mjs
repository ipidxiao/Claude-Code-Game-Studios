/**
 * CoC 7e Credit Rating → living standard / cash / assets (1920s USD, simplified).
 * Source shape: Keeper Rulebook / Investigator Handbook credit table.
 */

export const CREDIT_LIFESTYLE_BANDS = Object.freeze([
    Object.freeze({
        id: 'penniless',
        min: 0,
        max: 0,
        label: '一文不名',
        spendingLevel: 0.5,
        cashMult: 0,
        cashFlat: 0.5,
        assetsMult: 0,
        assetsFlat: 0
    }),
    Object.freeze({
        id: 'poor',
        min: 1,
        max: 9,
        label: '贫穷',
        spendingLevel: 2,
        cashMult: 0,
        cashFlat: 1,
        assetsMult: 1,
        assetsFlat: 0
    }),
    Object.freeze({
        id: 'average',
        min: 10,
        max: 49,
        label: '普通',
        spendingLevel: 10,
        cashMult: 1,
        cashFlat: 0,
        assetsMult: 10,
        assetsFlat: 0
    }),
    Object.freeze({
        id: 'wealthy',
        min: 50,
        max: 89,
        label: '富裕',
        spendingLevel: 50,
        cashMult: 5,
        cashFlat: 0,
        assetsMult: 50,
        assetsFlat: 0
    }),
    Object.freeze({
        id: 'rich',
        min: 90,
        max: 98,
        label: '富豪',
        spendingLevel: 250,
        cashMult: 20,
        cashFlat: 0,
        assetsMult: 500,
        assetsFlat: 0
    }),
    Object.freeze({
        id: 'super_rich',
        min: 99,
        max: 99,
        label: '超级富豪',
        spendingLevel: 5000,
        cashMult: 0,
        cashFlat: 50000,
        assetsMult: 0,
        assetsFlat: 5000000
    })
]);

/**
 * @param {number} credit
 * @returns {object}
 */
export function lookupLifestyle(credit) {
    const cr = Math.max(0, Math.min(99, Math.floor(Number(credit) || 0)));
    for (let i = 0; i < CREDIT_LIFESTYLE_BANDS.length; i++) {
        const b = CREDIT_LIFESTYLE_BANDS[i];
        if (cr >= b.min && cr <= b.max) {
            const cash = b.cashFlat > 0 ? b.cashFlat : cr * b.cashMult;
            const assets = b.assetsFlat > 0 ? b.assetsFlat : cr * b.assetsMult;
            return {
                id: b.id,
                label: b.label,
                credit: cr,
                spendingLevel: b.spendingLevel,
                cash: Math.round(cash * 100) / 100,
                assets: Math.round(assets * 100) / 100,
                weeklyCost: Math.round(b.spendingLevel * 7 * 100) / 100
            };
        }
    }
    return lookupLifestyle(0);
}

/**
 * Starting wealth snapshot from current Credit Rating skill.
 * @param {number} credit
 */
export function startingWealthFromCredit(credit) {
    const life = lookupLifestyle(credit);
    return {
        cash: life.cash,
        assets: life.assets,
        lifestyleId: life.id,
        lifestyleLabel: life.label,
        spendingLevel: life.spendingLevel
    };
}
