/**
 * Appendix weapon / armor summaries (numeric kernels only).
 */
export const CoCWeaponsAppendix = Object.freeze({
    knife: { id: 'knife', name: '小刀', skill: '斗殴', damage: '1D4+DB', range: null, attacks: 1, mal: null },
    club: { id: 'club', name: '棍棒', skill: '斗殴', damage: '1D6+DB', range: null, attacks: 1, mal: null },
    handgun: { id: 'handgun', name: '手枪', skill: '手枪', damage: '1D10', range: 15, attacks: 1, mal: 100 },
    rifle: { id: 'rifle', name: '步枪', skill: '步枪/霰弹枪', damage: '2D6+4', range: 110, attacks: 1, mal: 100 },
    shotgun: { id: 'shotgun', name: '霰弹枪', skill: '步枪/霰弹枪', damage: '4D6/2D6/1D6', range: 10, attacks: 1, mal: 100 },
    smg: { id: 'smg', name: '冲锋枪', skill: '冲锋枪', damage: '1D10', range: 20, attacks: '1/3', mal: 97 },
    dynamite: { id: 'dynamite', name: '炸药', skill: '投掷', damage: '4D6', range: 'STR', attacks: 1, mal: null }
});

export const CoCArmorAppendix = Object.freeze({
    none: { id: 'none', name: '无', armor: 0 },
    heavy_coat: { id: 'heavy_coat', name: '厚大衣', armor: 1 },
    leather: { id: 'leather', name: '皮甲', armor: 2 },
    flak: { id: 'flak', name: '防弹衣', armor: 5 },
    steel_helmet: { id: 'steel_helmet', name: '钢盔', armor: 2 }
});

export function lookupWeapon(idOrName) {
    return lookupIn(CoCWeaponsAppendix, idOrName);
}
export function lookupArmor(idOrName) {
    return lookupIn(CoCArmorAppendix, idOrName);
}
function lookupIn(map, idOrName) {
    if (!idOrName) return null;
    const key = String(idOrName).trim();
    if (map[key]) return Object.assign({}, map[key]);
    const lower = key.toLowerCase();
    if (map[lower]) return Object.assign({}, map[lower]);
    const ids = Object.keys(map);
    for (let i = 0; i < ids.length; i++) {
        const v = map[ids[i]];
        if (v.name === key || v.id === key) return Object.assign({}, v);
    }
    return null;
}
