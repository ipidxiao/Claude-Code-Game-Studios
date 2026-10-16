/**
 * Debunk false-lead clues on the board (status + content only; no HP/SAN).
 */

export function debunkFalseLeadClues(gameState, opts) {
    const o = opts || {};
    if (!gameState || !gameState.clueBoard || !Array.isArray(gameState.clueBoard.clues)) {
        return { count: 0 };
    }
    const corrected = o.correctedContent
        || '已更正：此前记录为误导性传闻，证据档不再采信此条。';
    let count = 0;
    const onlyId = o.clueId || null;
    gameState.clueBoard.clues.forEach((c) => {
        if (!c || !c.meta || !c.meta.falseLead) return;
        if (onlyId && c.id !== onlyId) return;
        c.status = 'solved';
        c.content = corrected;
        c.meta.falseLead = false;
        c.meta.debunked = true;
        if (o.title) c.title = o.title;
        count += 1;
    });
    if (count && gameState.flags) gameState.flags.false_lead_debunked = true;
    const r = gameState.scenarioRunner;
    if (count && r) {
        if (!r.flags) r.flags = {};
        r.flags.false_lead_debunked = true;
    }
    return { count };
}

export const CoCFalseLead = { debunkFalseLeadClues };
if (typeof window !== 'undefined') window.CoCFalseLead = CoCFalseLead;
