const firstFiniteNumber = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return null;
};

/**
 * Build the active-party snapshot injected into the AI prompt.
 * Handles both current records (derived.hp/maxHp) and legacy hp mirrors.
 */
export function buildTeamDetails(activeRoster) {
    return (Array.isArray(activeRoster) ? activeRoster : []).map((c) => {
        const char = c || {};
        const derived = char.derived || {};
        let currentHp;
        let maxHp;
        const derivedHp = firstFiniteNumber(derived.hp);
        const topHp = firstFiniteNumber(char.hp);
        const explicitMax = firstFiniteNumber(derived.maxHp, char.maxHp);
        if (explicitMax != null) {
            currentHp = derivedHp != null ? derivedHp : topHp;
            maxHp = explicitMax;
        } else if (derivedHp != null && topHp != null) {
            currentHp = Math.min(derivedHp, topHp);
            maxHp = Math.max(derivedHp, topHp);
        } else {
            currentHp = derivedHp != null ? derivedHp : topHp;
            maxHp = currentHp;
        }
        const sanity = firstFiniteNumber(derived.sanity, char.sanity, derived.san, char.san);
        const equipment = char.equipment || {};
        const equipmentText = Object.entries(equipment)
            .filter(([, value]) => value)
            .map(([slot, value]) => `${slot}:${value}`)
            .join(', ') || '无装备';
        const hpText = currentHp == null ? '—' : String(currentHp);
        const maxHpText = maxHp == null ? '—' : String(maxHp);
        const sanText = sanity == null ? '—' : String(sanity);
        return `【${char.name || '未命名调查员'}】(HP:${hpText}/${maxHpText}, SAN:${sanText}, 装备:${equipmentText})`;
    }).join('\n');
}
