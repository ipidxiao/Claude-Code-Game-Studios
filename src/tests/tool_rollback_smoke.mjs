/**
 * Tool rollback must cover everything a handler can write before it throws (R7-R10 / R17 / R24
 * class). ai_logic tells the player "本次工具状态已回滚" after a throw.
 *
 * Real case: advance_time writes worldClock, copies it into kpState.TIME (R29.64 single author),
 * then runs per-investigator engine ticks. If a tick throws, worldClock was rolled back but
 * kpState.TIME was not, so the two clocks disagreed.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { CoCEngine } from '../js/coc.mjs';
import { CoCToolHandlers } from '../js/tools/handlers/index.mjs';
import { createToolSnapshotApi } from '../js/ai/tool_snapshot.mjs';

function makeState() {
    return {
        roster: [{
            name: 'Ann', isActive: true, hp: 8,
            attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50, INT: 50, EDU: 50 },
            derived: { hp: 8, maxHp: 10, sanity: 50, mp: 10, mov: 8, db: '0' }, status: {}
        }],
        inventory: [], storage: [], chatHistory: [], journalLog: [], diceHistory: [], npcRegistry: [],
        combat: { active: false, enemies: [], initiativeOrder: [] },
        chase: { active: false, participants: [] },
        clueBoard: { clues: [], links: [] },
        sceneMap: { title: '', rooms: [], currentRoomId: null },
        scenarioRunner: { active: false, flags: {} },
        pendingRuleCheck: null, pendingRuleChecks: [], pendingAftermath: [],
        skillAttempts: {}, sanCaps: {},
        worldClock: { day: 2, hour: 10 },
        kpState: { TIME: { day: 2, hour: 10 }, antagonist: { ALERT_LEVEL: 1, KNOWLEDGE_LEVEL: 0 } },
        kpEngine: {
            enabled: true, rules: { SYSTEM_NAME: 'KP_PROTOCOL', big: 'preset' },
            global: { attention: 1, playerPower: 0, phase: 'CALM', doomClock: 0, alertLevel: 1, knowledgeLevel: 0 },
            scenePaths: { currentSceneId: 's1', paths: [], truePathCount: 0, falsePathCount: 0 }, keyClueBlockedAttempts: 1
        },
        flags: { a: true }, mythosHeat: 1, heatEventsLog: [],
        currentLocation: '码头', knownLocations: ['码头'], atmosphere: { level: 'calm', note: '' },
        lastSkillCheck: { charName: 'Ann', skill: '侦查', rolledValue: 70 }
    };
}

const noop = () => {};
const ctxFor = (gs) => ({
    gameState: gs, addJournalEntry: noop, addNpc: noop, updateNpcStatus: noop, startCombat: noop, endCombat: noop,
    updateEnemy: noop, advanceTurn: noop, createMap: noop, updateRoom: noop, setPosition: noop, addClue: noop,
    linkClues: noop, markClueStatus: noop, rollCustomDice: noop, groupRoll: () => []
});

// --- 1) advance_time throwing after the kpState.TIME copy --------------------------------------
{
    const gs = makeState();
    // An engine whose daily healing tick throws (e.g. a malformed investigator from an old save).
    const Engine = Object.assign(Object.create(CoCEngine), {
        HealingEngine: Object.assign(Object.create(CoCEngine.HealingEngine || {}), {
            endDay() { throw new Error('boom in endDay'); }
        })
    });
    const handlers = CoCToolHandlers.create(ctxFor(gs), Engine);
    const { makeToolSnapshot, restoreToolSnapshot } = createToolSnapshotApi({ gameState: gs });
    const rulesRef = gs.kpEngine.rules;

    const snap = makeToolSnapshot();
    assert.throws(() => handlers.advance_time({ days: 2 }), /boom in endDay/, 'precondition: the tick throws');
    assert.notDeepEqual(gs.kpState.TIME, { day: 2, hour: 10 }, 'precondition: kpState.TIME was advanced before the throw');
    restoreToolSnapshot(snap);

    assert.deepEqual(gs.worldClock, { day: 2, hour: 10 }, 'worldClock rolled back');
    assert.equal(gs.kpState.TIME.day, gs.worldClock.day, 'kpState.TIME.day must match worldClock after rollback');
    assert.equal(gs.kpState.TIME.hour, gs.worldClock.hour, 'kpState.TIME.hour must match worldClock after rollback');
    assert.equal(gs.kpEngine.rules, rulesRef, 'static KP rules preset is kept by reference, not cloned');
}

// --- 2) every piece of run state written before a throw is restored ----------------------------
{
    const gs = makeState();
    const { makeToolSnapshot, restoreToolSnapshot } = createToolSnapshotApi({ gameState: gs });
    const before = JSON.parse(JSON.stringify(gs));
    const kpEngineObj = gs.kpEngine;
    const atmosphereObj = gs.atmosphere;
    const snap = makeToolSnapshot();

    gs.flags.police_interest = true;
    gs.mythosHeat = 4;
    gs.heatEventsLog.push({ band: 3 });
    gs.kpEngine.keyClueBlockedAttempts = 3;
    gs.kpEngine.scenePaths.truePathCount = 3;
    gs.kpEngine.global.alertLevel = 5;
    gs.kpState.antagonist.ALERT_LEVEL = 5;
    gs.currentLocation = '洞窟';
    gs.knownLocations.push('洞窟');
    gs.atmosphere.level = 'dread';
    gs.journalLog.push({ summary: 'x' });
    gs.storage.push({ name: 'y' });
    gs.diceHistory.push({ total: 3 });
    gs.lastSkillCheck = { charName: 'Ann', skill: '侦查', rolledValue: 20 };
    gs.chatHistory.push({ role: 'system', content: 'half-done' });

    restoreToolSnapshot(snap);
    const after = JSON.parse(JSON.stringify(gs));
    for (const k of Object.keys(before)) {
        assert.deepEqual(after[k], before[k], `rollback must restore ${k}`);
    }
    assert.equal(gs.kpEngine, kpEngineObj, 'kpEngine object identity kept (Vue reactivity)');
    assert.equal(gs.atmosphere, atmosphereObj, 'atmosphere object identity kept (Vue reactivity)');
}

// --- 3) ai_logic uses this module instead of a private copy ------------------------------------
{
    const src = readFileSync(new URL('../js/ai_logic.mjs', import.meta.url), 'utf8');
    assert.ok(src.includes("from './ai/tool_snapshot.mjs'"), 'ai_logic must import tool_snapshot.mjs');
    assert.ok(!/const makeToolSnapshot = \(\) => safeJsonClone/.test(src), 'ai_logic must not keep its own snapshot copy');
}

// --- 4) a dark roll made before the throw is rolled back with the dice panel (ADR-0003 §3) ------
{
    const { recordRoll } = await import('../js/state/visibility.mjs');
    const gs = makeState();
    gs.pendingDarkRolls = [];
    const { makeToolSnapshot, restoreToolSnapshot } = createToolSnapshotApi({ gameState: gs });
    const snap = makeToolSnapshot();
    recordRoll(gs, { rollId: 'r_x', label: '暗中聆听', total: 42, vis: { to: 'keeper' } });
    assert.equal(gs.pendingDarkRolls.length, 1, 'fixture: the dark roll waits for narration');
    restoreToolSnapshot(snap);
    assert.deepEqual(gs.diceHistory, []);
    assert.deepEqual(gs.pendingDarkRolls, [], 'a roll that never happened is not waiting to be redacted');
}

console.log('tool_rollback_smoke: OK');
