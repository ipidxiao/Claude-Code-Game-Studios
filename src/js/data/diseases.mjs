/**
 * CoC 7e disease templates (simplified) — daily tick via advance_time / ConditionsEngine.
 */
export const CoCDiseases = Object.freeze({
    fever: Object.freeze({
        id: 'fever',
        name: '热病',
        days: 5,
        damagePerDay: '1D3',
        treatSkill: '医学',
        notes: '高烧；休息与医学可缩短病程'
    }),
    flu: Object.freeze({
        id: 'flu',
        name: '流行性感冒',
        days: 3,
        damagePerDay: '1',
        treatSkill: '医学',
        notes: '轻度；多数可自愈'
    }),
    wound_infection: Object.freeze({
        id: 'wound_infection',
        name: '伤口感染',
        days: 7,
        damagePerDay: '1D4',
        treatSkill: '医学',
        notes: '重伤未妥善处理时常见'
    }),
    plague: Object.freeze({
        id: 'plague',
        name: '瘟疫',
        days: 10,
        damagePerDay: '1D6',
        treatSkill: '医学',
        notes: '剧毒疫病；需积极治疗'
    }),
    food_poisoning: Object.freeze({
        id: 'food_poisoning',
        name: '食物中毒',
        days: 2,
        damagePerDay: '1D3',
        treatSkill: '急救',
        notes: '短期胃肠危机'
    })
});

/**
 * @param {string} idOrName
 * @returns {object|null}
 */
export function lookupDisease(idOrName) {
    if (!idOrName) return null;
    const key = String(idOrName).trim();
    if (CoCDiseases[key]) return Object.assign({}, CoCDiseases[key]);
    const lower = key.toLowerCase();
    if (CoCDiseases[lower]) return Object.assign({}, CoCDiseases[lower]);
    const ids = Object.keys(CoCDiseases);
    for (let i = 0; i < ids.length; i++) {
        const d = CoCDiseases[ids[i]];
        if (d.name === key || d.id === key) return Object.assign({}, d);
    }
    return null;
}
