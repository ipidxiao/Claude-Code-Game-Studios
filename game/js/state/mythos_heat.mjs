/**
 * Mythos attention heat (0–5) + unreliable save blurb + threshold events.
 * Sole numeric heat mutator for scenario path — see PRESSURE_WRITE_INVENTORY (capability_risk).
 */
import { maybeTriggerHeatEvent } from '../data/mythos_heat_events.mjs';
import { applyNpcBehavior } from '../engines/npc_behavior.mjs';

export function clampMythosHeat(n) {
    const v = Number(n) || 0;
    return Math.max(0, Math.min(5, Math.floor(v)));
}

export function addMythosHeat(gameState, delta, reason) {
    if (!gameState) return 0;
    const prev = Number(gameState.mythosHeat) || 0;
    gameState.mythosHeat = clampMythosHeat(prev + (Number(delta) || 0));
    maybeTriggerHeatEvent(gameState, prev, gameState.mythosHeat);
    applyNpcBehavior(gameState);
    if (gameState.mythosHeat >= 4) {
        if (!gameState.flags) gameState.flags = {};
        gameState.flags.mythos_attention = true;
        const r = gameState.scenarioRunner;
        if (r) {
            if (!r.flags) r.flags = {};
            r.flags.mythos_attention = true;
        }
        if (reason && gameState.chatHistory) {
            gameState.chatHistory.push({
                role: 'system', isLocalOnly: true, isAlert: true,
                content: '👁 [异常关注] 热度 ' + gameState.mythosHeat + '/5' + (reason ? '：' + reason : '')
            });
        }
    }
    return gameState.mythosHeat;
}

/** Local template summary — never mutates numbers or calls tools. */
export function buildUnreliableSaveBlurb(gameState, opts) {
    const o = opts || {};
    if (!gameState) return '残页模糊。';
    const loc = gameState.currentLocation || '未知之处';
    const journal = gameState.journalLog || [];
    const last = journal.length ? journal[journal.length - 1] : null;
    const summary = (last && (last.summary || last.content)) || '';
    const heat = Number(gameState.mythosHeat) || 0;
    const dayHint = o.dayHint || (journal.length ? '第' + Math.max(1, Math.ceil(journal.length / 3)) + '日' : '某夜');
    let line = dayHint + ' · ' + loc + '。';
    if (summary) {
        const clipped = String(summary).replace(/\s+/g, ' ').slice(0, 48);
        line += '记忆写着：「' + clipped + (String(summary).length > 48 ? '…' : '') + '」——笔迹发颤，未必可靠。';
    } else {
        line += '日记空白，只剩地点与雨声。';
    }
    if (heat >= 3) line += '页边有潮湿的触痕。';
    return line;
}

export const CoCMythosHeat = {
    clampMythosHeat,
    addMythosHeat,
    buildUnreliableSaveBlurb
};

if (typeof window !== 'undefined') window.CoCMythosHeat = CoCMythosHeat;
