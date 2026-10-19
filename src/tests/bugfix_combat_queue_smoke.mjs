/**
 * Bugfix smoke: initiative re-anchor, queued rule checks, duplicate enemy names.
 */
import { strict as assert } from 'node:assert';
import { CoCStateGameplay } from '../js/state/gameplay.mjs';
import { pauseForRuleCheck, resolvePendingRuleCheck } from '../js/state/rule_check.mjs';

const gameState = {
    combat: {
        active: true,
        round: 1,
        enemies: [],
        initiativeOrder: [],
        currentTurnIdx: 0,
        location: '',
        notes: ''
    },
    roster: [{ name: '调查员甲', isActive: true, hp: 12, attrs: { DEX: 50 }, skills: {} }],
    chatHistory: [],
    journalLog: [],
    sceneMap: { rooms: [], currentRoomId: null },
    knownLocations: [],
    currentLocation: '',
    chase: null
};

const gp = CoCStateGameplay.create({
    gameState,
    addJournalEntry: (e) => { gameState.journalLog.push(e); }
});

// --- duplicate enemy names become unique ---
gp.startCombat([{ name: '教徒', hp: 8 }, { name: '教徒', hp: 8 }], '巷口', '');
assert.equal(gameState.combat.enemies.length, 2);
assert.notEqual(gameState.combat.enemies[0].name, gameState.combat.enemies[1].name);
assert.ok(gameState.combat.enemies[1].name.includes('·'));

// Damage second cultist by id must not hit the first
const e0 = gameState.combat.enemies[0];
const e1 = gameState.combat.enemies[1];
const hp0 = e0.hp;
gp.updateEnemy(e1.id, -3);
assert.equal(e1.hp, 5);
assert.equal(e0.hp, hp0);

// --- initiative re-anchor after killing earlier combatant ---
gameState.combat.enemies = [
    { id: 'e1', name: 'E1', hp: 1, maxHp: 10, isEnemy: true, isDefeated: false },
    { id: 'e2', name: 'E2', hp: 10, maxHp: 10, isEnemy: true, isDefeated: false }
];
gameState.combat.initiativeOrder = [
    { id: 'e1', name: 'E1', isEnemy: true },
    { name: '调查员甲', isEnemy: false },
    { id: 'e2', name: 'E2', isEnemy: true }
];
gameState.combat.currentTurnIdx = 1; // PC turn
gameState.combat.round = 1;
gp.updateEnemy('e1', -99); // defeat E1 during PC turn → cleanup
assert.equal(gameState.combat.initiativeOrder[gameState.combat.currentTurnIdx].name, '调查员甲');
gp.advanceTurn();
assert.equal(gameState.combat.initiativeOrder[gameState.combat.currentTurnIdx].name, 'E2');
assert.equal(gameState.combat.round, 1); // must not wrap / skip E2

// --- setPosition invalid target must not clear current ---
gameState.sceneMap.rooms = [
    { id: 'a', name: 'A厅', status: 'current' },
    { id: 'b', name: 'B厅', status: 'unexplored' }
];
gameState.sceneMap.currentRoomId = 'a';
assert.equal(gp.setPosition('nope'), false);
assert.equal(gameState.sceneMap.rooms.find((r) => r.id === 'a').status, 'current');

// --- queued pauseForRuleCheck must not emit forceCheck ---
const gs = { pendingRuleCheck: null, pendingRuleChecks: [], chatHistory: [], roster: [{ name: '甲', isActive: true }] };
const first = pauseForRuleCheck(gs, { skill: '体质', roller: '甲', prompt: '一' });
assert.ok(first.forceCheck);
assert.equal(first.queued, undefined);
const second = pauseForRuleCheck(gs, { skill: '意志', roller: '甲', prompt: '二' });
assert.equal(second.forceCheck, null);
assert.equal(second.queued, true);
assert.equal(gs.pendingRuleChecks.length, 1);

resolvePendingRuleCheck(gs, { skill: '体质', charName: '甲', success: true }, null);
assert.equal(gs.pendingRuleCheck.skill, '意志');
const forceMsgs = gs.chatHistory.filter((m) => m && m.tool_calls);
assert.equal(forceMsgs.length, 1); // only one dice panel after promote

console.log('bugfix_combat_queue_smoke: OK');
