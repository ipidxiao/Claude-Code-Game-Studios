/**
 * Minimal enchanted items — modifier/resist hooks only.
 */
export const CoCEnchantments = Object.freeze({
    yellow_sign_amulet: {
        id: 'yellow_sign_amulet',
        name: '黄印护符',
        bonusDiceVs: ['哈斯塔', 'Hastur'],
        bonusDice: 1,
        notes: '对哈斯塔相关检定奖励骰'
    },
    elder_sign: {
        id: 'elder_sign',
        name: '旧印',
        sanBuffer: 1,
        notes: '目睹神话时 SAN 损失减免 1（最小 0）'
    },
    powder_of_ibn_ghazi: {
        id: 'powder_of_ibn_ghazi',
        name: '伊本·加齐之粉',
        revealInvisible: true,
        notes: '显形隐形神话生物一回合'
    }
});

export function lookupEnchantment(idOrName) {
    if (!idOrName) return null;
    const key = String(idOrName).trim();
    if (CoCEnchantments[key]) return Object.assign({}, CoCEnchantments[key]);
    const lower = key.toLowerCase();
    if (CoCEnchantments[lower]) return Object.assign({}, CoCEnchantments[lower]);
    const ids = Object.keys(CoCEnchantments);
    for (let i = 0; i < ids.length; i++) {
        const e = CoCEnchantments[ids[i]];
        if (e.name === key || e.id === key) return Object.assign({}, e);
    }
    return null;
}
