/**
 * Mythos heat threshold events — flags / journal only (no HP/SAN writes).
 */

export const MYTHOS_HEAT_EVENTS = Object.freeze({
    3: Object.freeze([
        Object.freeze({ id: 'whispers', flag: 'heat_whispers', journal: '热度事件：耳边有潮声般的低语。' }),
        Object.freeze({ id: 'damp_pages', flag: 'heat_damp_pages', journal: '热度事件：笔记本页边渗出水渍。' })
    ]),
    4: Object.freeze([
        Object.freeze({ id: 'missing_npc', flag: 'heat_missing_contact', journal: '热度事件：一名线人失联。' }),
        Object.freeze({ id: 'wrong_moon', flag: 'heat_wrong_moon', journal: '热度事件：你觉得满月提前了。' })
    ]),
    5: Object.freeze([
        Object.freeze({ id: 'gaze', flag: 'mythos_attention', journal: '热度事件：某种目光从深处投来。' }),
        Object.freeze({ id: 'name_echo', flag: 'heat_name_echo', journal: '热度事件：有人用错误的名字叫你。' })
    ])
});

function hashPick(seed, len) {
    const n = Math.abs(Number(seed) || 0);
    return len ? n % len : 0;
}

/**
 * When heat crosses a threshold band, pick one event.
 * @returns {object|null} event applied
 */
export function maybeTriggerHeatEvent(gameState, prevHeat, nextHeat) {
    if (!gameState) return null;
    const prev = Number(prevHeat) || 0;
    const next = Number(nextHeat) || 0;
    const bands = [3, 4, 5];
    const crossed = [];
    for (let i = 0; i < bands.length; i++) {
        const b = bands[i];
        if (prev < b && next >= b) crossed.push(b);
    }
    if (!crossed.length) return null;
    let lastEv = null;
    crossed.forEach((hitBand) => {
        const list = MYTHOS_HEAT_EVENTS[hitBand] || [];
        if (!list.length) return;
        const seed = (Number(gameState.moduleSeed) || 0) + hitBand * 17;
        const ev = list[hashPick(seed, list.length)];
        if (!ev) return;
        if (!gameState.flags) gameState.flags = {};
        gameState.flags[ev.flag] = true;
        const r = gameState.scenarioRunner;
        if (r) {
            if (!r.flags) r.flags = {};
            r.flags[ev.flag] = true;
        }
        if (ev.journal && gameState.chatHistory) {
            gameState.chatHistory.push({
                role: 'system', isLocalOnly: true, isAlert: true,
                content: '👁 ' + ev.journal
            });
        }
        if (!Array.isArray(gameState.heatEventsLog)) gameState.heatEventsLog = [];
        gameState.heatEventsLog.push({
            id: ev.id,
            flag: ev.flag,
            journal: ev.journal,
            band: hitBand,
            at: Date.now()
        });
        lastEv = ev;
    });
    return lastEv;
}

export const CoCMythosHeatEvents = { MYTHOS_HEAT_EVENTS, maybeTriggerHeatEvent };
