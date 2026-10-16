/**
 * NPC witness credibility → clue quality mapping (7e-flavoured table).
 */

export const NPC_CREDIBILITY = Object.freeze({
    dos_fisher: Object.freeze({ id: 'dos_fisher', label: '老渔夫', credibility: 1 }),
    dos_martha: Object.freeze({ id: 'dos_martha', label: '旅馆玛莎', credibility: 2 }),
    default_low: Object.freeze({ id: 'default_low', label: '匿名证人', credibility: 0 }),
    default_mid: Object.freeze({ id: 'default_mid', label: '可靠证人', credibility: 2 }),
    default_high: Object.freeze({ id: 'default_high', label: '权威证人', credibility: 3 })
});

export function getNpcCredibility(npcId) {
    if (!npcId) return null;
    return NPC_CREDIBILITY[npcId] || null;
}

/**
 * Map credibility + skill success level → clue quality.
 * @param {number} credibility 0–3+
 * @param {string} checkLevel 成功|困难成功|极难成功|大成功|…
 */
export function resolveClueQualityFromCredibility(credibility, checkLevel) {
    const cred = Math.max(0, Number(credibility) || 0);
    const level = String(checkLevel || '成功');
    const hard = level === '困难成功' || level === '极难成功' || level === '大成功';
    const extreme = level === '极难成功' || level === '大成功';

    if (cred <= 1) {
        if (hard) return 'solid';
        return 'partial';
    }
    if (cred === 2) {
        if (extreme) return 'decisive';
        return 'solid';
    }
    // high 3+
    if (extreme) return 'decisive';
    return 'solid';
}

export function resolveClueQualityForNpc(npcId, checkLevel) {
    const row = getNpcCredibility(npcId);
    const cred = row ? row.credibility : 2;
    return resolveClueQualityFromCredibility(cred, checkLevel);
}
