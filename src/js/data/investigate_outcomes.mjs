/**
 * Skill-check outcome templates for investigation (structured, not prose).
 */
export const INVESTIGATE_OUTCOMES = Object.freeze({
    成功: { id: 'success', clueQuality: 'partial', misleading: false },
    困难成功: { id: 'hard', clueQuality: 'solid', misleading: false },
    极难成功: { id: 'extreme', clueQuality: 'decisive', misleading: false },
    大成功: { id: 'critical', clueQuality: 'decisive', misleading: false },
    失败: { id: 'fail', clueQuality: 'none', misleading: false },
    大失败: { id: 'fumble', clueQuality: 'none', misleading: true }
});

/** none < partial < solid < decisive */
export const CLUE_QUALITY_RANK = Object.freeze({
    none: 0,
    partial: 1,
    solid: 2,
    decisive: 3
});

/** Map best clue quality → ending branch key (plan Wave 1A). */
export const CLUE_QUALITY_BRANCH_KEYS = Object.freeze(['weak', 'solid', 'decisive']);

export function resolveInvestigateOutcome(level) {
    const row = INVESTIGATE_OUTCOMES[level] || INVESTIGATE_OUTCOMES['失败'];
    return Object.assign({}, row, { level: level || '失败' });
}

/** Return a canonical clue-quality rank, or null for an unknown token. */
export function clueQualityRank(value) {
    const token = String(value == null ? '' : value).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(CLUE_QUALITY_RANK, token)) return null;
    return CLUE_QUALITY_RANK[token];
}

/**
 * @param {Array<{quality?: string}>} clues
 * @param {string} minQuality solid|decisive|partial|…
 */
export function hasClueQualityAtLeast(clues, minQuality) {
    if (minQuality == null || String(minQuality).trim() === '') return true;
    const need = clueQualityRank(minQuality);
    if (need == null) return false;
    if (need === 0) return true;
    return (clues || []).some((c) => (clueQualityRank(c && c.quality) ?? 0) >= need);
}

/** Highest quality rank among clues (0 if empty). */
export function bestClueQualityRank(clues) {
    let best = 0;
    (clues || []).forEach((c) => {
        const r = clueQualityRank(c && c.quality) ?? 0;
        if (r > best) best = r;
    });
    return best;
}

/**
 * Map board clues → weak | solid | decisive (none/partial → weak).
 * @returns {'weak'|'solid'|'decisive'}
 */
export function bestClueQualityBranchKey(clues) {
    const rank = bestClueQualityRank(clues);
    if (rank >= CLUE_QUALITY_RANK.decisive) return 'decisive';
    if (rank >= CLUE_QUALITY_RANK.solid) return 'solid';
    return 'weak';
}

/**
 * Pick branch entry from { weak, solid, decisive }.
 * Fallback: preferred key → solid → weak → decisive → first defined.
 * Values may be string nodeId or { next, effects, proseKey, narrative }.
 */
export function pickClueQualityBranch(branchMap, clues) {
    if (!branchMap || typeof branchMap !== 'object') return null;
    const preferred = bestClueQualityBranchKey(clues);
    const order = [preferred, 'solid', 'weak', 'decisive'];
    for (let i = 0; i < order.length; i++) {
        const key = order[i];
        if (branchMap[key] != null) {
            const raw = branchMap[key];
            if (typeof raw === 'string') return { key, next: raw };
            if (typeof raw === 'object') return Object.assign({ key }, raw);
        }
    }
    const keys = Object.keys(branchMap);
    if (!keys.length) return null;
    const raw = branchMap[keys[0]];
    if (typeof raw === 'string') return { key: keys[0], next: raw };
    return Object.assign({ key: keys[0] }, raw || {});
}
