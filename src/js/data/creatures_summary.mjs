/**
 * Minimal creature combat summaries (Keeper Beasts/Monsters/Gods — numeric only).
 */
export const CoCCreatures = Object.freeze({
    byakhee: { id: 'byakhee', name: '拜亚基', str: 85, con: 50, siz: 85, dex: 70, hp: 13, armor: 2, mov: 5, attacks: '爪 1D6+DB', san: '0/1D6' },
    darkyoung: { id: 'darkyoung', name: '黑山羊幼崽', str: 220, con: 100, siz: 220, dex: 40, hp: 32, armor: 5, mov: 8, attacks: '触须 2D6', san: '1D3/1D10' },
    deepone: { id: 'deepone', name: '深潜者', str: 70, con: 50, siz: 70, dex: 50, hp: 12, armor: 1, mov: 8, attacks: '爪 1D6', san: '0/1D6' },
    dimensionalshambler: { id: 'dimensionalshambler', name: '次元吞噬者', str: 95, con: 65, siz: 95, dex: 50, hp: 16, armor: 3, mov: 7, attacks: '撕扯 1D8', san: '0/1D10' },
    elderthing: { id: 'elderthing', name: '古老者', str: 75, con: 65, siz: 80, dex: 60, hp: 14, armor: 7, mov: 8, attacks: '触须 1D6', san: '0/1D6' },
    flyingpolyp: { id: 'flyingpolyp', name: '飞水螅', str: 70, con: 70, siz: 70, dex: 65, hp: 14, armor: 4, mov: 8, attacks: '触须 1D10', san: '1D3/1D20' },
    formlessspawn: { id: 'formlessspawn', name: '无形之子', str: 90, con: 80, siz: 90, dex: 60, hp: 17, armor: 0, mov: 12, attacks: '伪足 1D6', san: '1/1D10' },
    ghoul: { id: 'ghoul', name: '食尸鬼', str: 80, con: 65, siz: 65, dex: 65, hp: 13, armor: 0, mov: 9, attacks: '撕咬 1D6', san: '0/1D6' },
    greatrace: { id: 'greatrace', name: '伊斯坦的伟大种族', str: 50, con: 50, siz: 80, dex: 40, hp: 13, armor: 4, mov: 7, attacks: '爪 1D6', san: '0/1D6' },
    gug: { id: 'gug', name: '古革巨人', str: 200, con: 100, siz: 250, dex: 50, hp: 35, armor: 8, mov: 10, attacks: '撕咬 1D10', san: '0/1D8' },
    huntinghorror: { id: 'huntinghorror', name: '星之猎手', str: 140, con: 50, siz: 140, dex: 80, hp: 19, armor: 5, mov: 12, attacks: '撕咬 1D6', san: '0/1D10' },
    migo: { id: 'migo', name: '米·戈', str: 65, con: 50, siz: 50, dex: 70, hp: 10, armor: 3, mov: 9, attacks: '爪 1D6', san: '0/1D6' },
    nightgaunt: { id: 'nightgaunt', name: '夜魇', str: 70, con: 50, siz: 70, dex: 75, hp: 12, armor: 2, mov: 12, attacks: '擒抱', san: '0/1D6' },
    servitorofoutergods: { id: 'servitorofoutergods', name: '外神仆役', str: 50, con: 50, siz: 50, dex: 50, hp: 10, armor: 0, mov: 7, attacks: '触须 1D4', san: '0/1D6' },
    shoggoth: { id: 'shoggoth', name: '修格斯', str: 350, con: 150, siz: 350, dex: 30, hp: 50, armor: 0, mov: 10, attacks: '碾压 2D6', san: '1D6/1D20' },
    starvampire: { id: 'starvampire', name: '星之吸血鬼', str: 80, con: 50, siz: 80, dex: 60, hp: 13, armor: 4, mov: 8, attacks: '撕咬 1D6', san: '0/1D10' },
    cthulhu: { id: 'cthulhu', name: '克苏鲁', str: 700, con: 525, siz: 900, dex: 70, hp: 160, armor: 21, mov: 16, attacks: '爪 1D6×6', san: '1D10/1D100' },
    hastur: { id: 'hastur', name: '哈斯塔', str: 600, con: 500, siz: 600, dex: 100, hp: 120, armor: 20, mov: 20, attacks: '触须', san: '1D10/1D100' },
    nyarlathotep: { id: 'nyarlathotep', name: '奈亚拉托提普', str: 80, con: 80, siz: 80, dex: 80, hp: 16, armor: 0, mov: 10, attacks: '依化身', san: '1D10/1D100' },
    shubniggurath: { id: 'shubniggurath', name: '莎布·尼古拉丝', str: 500, con: 500, siz: 500, dex: 40, hp: 100, armor: 15, mov: 10, attacks: '践踏', san: '1D10/1D100' },
    yogsothoth: { id: 'yogsothoth', name: '犹格·索托斯', str: 1000, con: 1000, siz: 1000, dex: 1, hp: 200, armor: 0, mov: 0, attacks: '触碰', san: '1D10/1D100' },
    azathoth: { id: 'azathoth', name: '阿撒托斯', str: 0, con: 0, siz: 0, dex: 0, hp: 0, armor: 0, mov: 0, attacks: '—', san: '1D10/1D100' },
    // Module-common humans / hybrids (numeric summary only)
    cultist: { id: 'cultist', name: '邪教徒', str: 50, con: 50, siz: 55, dex: 50, hp: 10, armor: 0, mov: 8, attacks: '匕首 1D4+DB', san: '0/0' },
    security_guard: { id: 'security_guard', name: '保安', str: 55, con: 55, siz: 60, dex: 50, hp: 11, armor: 0, mov: 8, attacks: '警棍 1D6+DB', san: '0/0' },
    asylum_attendant: { id: 'asylum_attendant', name: '疯人院护工', str: 60, con: 55, siz: 65, dex: 45, hp: 12, armor: 0, mov: 8, attacks: '勒抱 1D3+DB', san: '0/0' },
    deepone_hybrid: { id: 'deepone_hybrid', name: '深潜者混血', str: 65, con: 55, siz: 65, dex: 55, hp: 12, armor: 1, mov: 8, attacks: '爪 1D4+DB', san: '0/1D4' }
});

export function lookupCreature(idOrName) {
    if (!idOrName) return null;
    const key = String(idOrName).trim();
    if (CoCCreatures[key]) return Object.assign({}, CoCCreatures[key]);
    const lower = key.toLowerCase().replace(/\s+/g, '');
    if (CoCCreatures[lower]) return Object.assign({}, CoCCreatures[lower]);
    const ids = Object.keys(CoCCreatures);
    for (let i = 0; i < ids.length; i++) {
        const c = CoCCreatures[ids[i]];
        if (c.name === key || c.id === key) return Object.assign({}, c);
    }
    return null;
}
