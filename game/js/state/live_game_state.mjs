/**
 * Tiny read of the live Vue gameState without importing Accessor/Engine.
 * Used by engines that sit under coc.mjs to avoid accessor→coc→engine cycles.
 * SoT remains window.CoCState (reactive core); do not use for writes.
 */
export function getLiveGameState() {
    if (typeof window === 'undefined') return null;
    const st = window.CoCState;
    return (st && st.gameState) ? st.gameState : null;
}

export function getLiveWorldClock() {
    const gs = getLiveGameState();
    const clock = gs && gs.worldClock;
    if (clock && Number.isFinite(Number(clock.day))) return clock;
    return null;
}
