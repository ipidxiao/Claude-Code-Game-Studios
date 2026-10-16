/** Clamp selectedCharIndex to full roster bounds (index into gameState.roster). */
export function clampSelectedCharIndex(gs) {
    if (!gs || !Array.isArray(gs.roster)) return 0;
    const max = Math.max(0, gs.roster.length - 1);
    const current = Number.isFinite(gs.selectedCharIndex) ? gs.selectedCharIndex : 0;
    gs.selectedCharIndex = Math.max(0, Math.min(current, max));
    return gs.selectedCharIndex;
}

/** Resolve selected PC: prefer roster[selectedCharIndex] if active, else first active. */
export function resolveSelectedActiveChar(gs) {
    if (!gs || !Array.isArray(gs.roster)) return null;
    clampSelectedCharIndex(gs);
    const idx = gs.selectedCharIndex;
    const at = gs.roster[idx];
    if (at && at.isActive) return at;
    return gs.roster.find((c) => c && c.isActive) || null;
}

/** Full-roster index of the last isActive investigator, or 0. */
export function lastActiveRosterIndex(gs) {
    if (!gs || !Array.isArray(gs.roster)) return 0;
    let last = -1;
    for (let i = 0; i < gs.roster.length; i++) {
        if (gs.roster[i] && gs.roster[i].isActive) last = i;
    }
    return Math.max(0, last);
}

export function selectedActiveName(gs, fallback) {
    const ch = resolveSelectedActiveChar(gs);
    return (ch && ch.name) || fallback || null;
}
