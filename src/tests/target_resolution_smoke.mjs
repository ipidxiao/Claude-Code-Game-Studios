/**
 * Scenario-effect targets: a non-empty name that is not on the roster must never be
 * silently redirected to the selected / active / first investigator
 * (same contract as tools/resolve.mjs resolveActor, R29 Phase 1).
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { CoCToolHandlers } from '../js/tools/handlers/index.mjs';
import { applyScenarioEffects, pickTarget } from '../js/scenario/effects_apply.mjs';

function makeChar(name, active, sanity = 60) {
    return {
        name,
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50, INT: 50 },
        skills: { '斗殴': 50, '闪避': 30 },
        derived: { hp: 10, maxHp: 10, sanity, mp: 10, mov: 8, db: '0' },
        hp: 10,
        sanity,
        status: {},
        isActive: active
    };
}

function makeState() {
    return {
        roster: [makeChar('Ann', true), makeChar('Bob', false)],
        inventory: [],
        chatHistory: [],
        scenarioRunner: { active: false, flags: {} },
        combat: { enemies: [] },
        flags: {}
    };
}

// ---- pickTarget -------------------------------------------------------------
{
    const gs = makeState();
    assert.equal(pickTarget(gs, 'Bob').name, 'Bob', 'named target found');
    assert.equal(pickTarget(gs, '').name, 'Ann', 'omitted → active investigator');
    assert.equal(pickTarget(gs, undefined).name, 'Ann', 'undefined → active investigator');
    assert.equal(pickTarget(gs, 'undefined').name, 'Ann', 'the string "undefined" counts as omitted');
    assert.equal(pickTarget(gs, 'Bobb'), null, 'unknown non-empty name must NOT fall back to another actor');
    assert.equal(pickTarget(gs, '  Zed '), null, 'unknown name with spaces must NOT fall back either');
}

// ---- applyScenarioEffects: unknown target skips target-bound effects, visibly -
{
    const gs = makeState();
    const seen = [];
    const ctx = { gameState: gs, Engine: CoCEngine, pushSystem: (t) => seen.push(String(t)), deferSanCheck: true };
    const out = applyScenarioEffects(ctx, { san: 5 }, 'Nobody');
    assert.equal(gs.roster[0].derived.sanity, 60, 'Ann must not lose SAN for an unknown target');
    assert.equal(gs.roster[1].derived.sanity, 60, 'Bob must not lose SAN for an unknown target');
    assert.ok(!out.san, 'no SAN result for an unknown target');
    assert.ok(seen.some((m) => m.includes('找不到目标角色') && m.includes('Nobody')), 'skip must be visible: ' + JSON.stringify(seen));
}

// ---- online tool handler ----------------------------------------------------
function makeHandlers(gs) {
    return CoCToolHandlers.create({
        gameState: gs,
        addJournalEntry() {}, addNpc() {}, updateNpcStatus() {}, startCombat() {}, endCombat() {},
        updateEnemy() {}, advanceTurn() {}, createMap() {}, updateRoom() {}, setPosition() {},
        addClue() {}, linkClues() {}, markClueStatus() {}, rollCustomDice() {}, groupRoll() {}
    }, CoCEngine);
}

{
    const gs = makeState();
    const h = makeHandlers(gs);
    const res = h.apply_scenario_effects({ san_check: '0/1', target_name: 'Bobb', cause: '目击' });
    assert.equal(typeof res, 'string');
    assert.ok(res.startsWith('错误：找不到'), 'unknown target_name must be rejected: ' + res);
    assert.ok(res.includes('Bobb'));
    assert.ok(!gs.pendingRuleCheck, 'no SAN dice panel may be opened for anybody');
}

{
    const gs = makeState();
    const h = makeHandlers(gs);
    h.apply_scenario_effects({ san_check: '0/1', target_name: 'Bob', cause: '目击' });
    assert.ok(gs.pendingRuleCheck, 'valid target opens the SAN check');
    assert.equal(gs.pendingRuleCheck.roller, 'Bob');
}

{
    const gs = makeState();
    const h = makeHandlers(gs);
    h.apply_scenario_effects({ san_check: '0/1', cause: '目击' });
    assert.ok(gs.pendingRuleCheck, 'omitted target_name keeps the documented active-investigator default');
    assert.equal(gs.pendingRuleCheck.roller, 'Ann');
}

console.log('target_resolution_smoke: OK');
