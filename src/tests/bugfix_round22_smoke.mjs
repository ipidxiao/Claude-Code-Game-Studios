/**
 * Round-22 bugfix smoke (real modules):
 * chase + scenario-choice defects found while auditing the chase engine, the
 * scenario runner and the tool handlers.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { applyScenarioEffects } from '../js/scenario/effects_apply.mjs';
import { mapScenarioChoice } from '../js/scenario/choice_menu.mjs';
import { voidChaseRuleChecks, pauseForRuleCheck } from '../js/state/rule_check.mjs';
import { CoCToolHandlers } from '../js/tools/handlers/index.mjs';

const Engine = buildCoCEngine();

// --- 1. choice mapping keeps branchByClueQuality (selectChoice is the only reader) ---
{
    const mapped = mapScenarioChoice({
        id: 'caught', label: '被追上', next: 'melee_end',
        branchByClueQuality: { decisive: 'ending_win', weak: { next: 'melee_end', effects: { flag: 'second_pursuer' } } }
    });
    assert.ok(mapped.branchByClueQuality, 'evidence-tier choice branching must survive the mapping');
    assert.equal(mapped.branchByClueQuality.decisive, 'ending_win');
}

// --- 2. scenario chase honors cfg.quarryMov for an off-roster quarry ---
{
    const msgs = [];
    const gameState = {
        roster: [{
            name: 'Alice', attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 60, POW: 60, INT: 60 },
            skills: { '体质': 50 }, derived: { hp: 10, maxHp: 10, sanity: 60, mov: 8, db: '0' },
            hp: 10, sanity: 60, status: {}, isActive: true
        }],
        inventory: [], knownLocations: [], atmosphere: {},
        scenarioRunner: { flags: {} }, clueBoard: { clues: [], links: [] },
        combat: { enemies: [] }, chase: null, chatHistory: []
    };
    const ctx = {
        gameState, Engine,
        pushSystem: (t) => msgs.push(String(t)),
        addClue: () => null, addJournalEntry: () => {},
        ensureFlags: () => gameState.scenarioRunner.flags
    };
    const out = applyScenarioEffects(ctx, {
        chase: { quarry: '窃贼', quarryMov: 9, pursuer: 'roster', pursuerMov: 8, lead: 2 }
    }, 'Alice');
    const quarry = out.chase.participants.find((p) => p.name === '窃贼');
    assert.equal(quarry.mov, 9, 'the scenario-declared quarry MOV must be used');
    assert.equal(quarry.actionsLeft, 2, 'MOV 9 against MOV 8 buys the quarry an extra action');
}

// --- 3. a wrecked vehicle drops the crew back to their own MOV ---
{
    const driver = { name: '司机', derived: { mov: 8 }, skills: { '汽车驾驶': 60 } };
    const runner = { name: '徒步追兵', derived: { mov: 8 }, skills: { '体质': 60 } };
    const state = Engine.ChaseEngine.start(driver, [runner], {
        lead: 2, vehicle: true, skipSpeedCheck: true
    });
    const part = Engine.ChaseEngine.find(state, '司机');
    assert.equal(part.mov, 8, 'part.mov stays the character MOV');
    assert.ok(part.effectiveMov > 8, 'but the vehicle drives faster');
    assert.equal(Engine.ChaseEngine.pushSkill(state, part), part.vehicle.skill || '汽车驾驶');

    part.vehicle.hp = 1;
    const wreck = Engine.ChaseEngine.applyVehicleMishap(part, { success: false, level: '失败' }, {
        state, kind: 'collide', damage: 20
    });
    assert.equal(wreck.wrecked, true);
    assert.equal(part.effectiveMov, 8, 'a wreck must cost the vehicle speed advantage');
    assert.equal(Engine.ChaseEngine.pushSkill(state, part), '体质', 'on foot you run, not drive');
    assert.equal(Engine.ChaseEngine.canDrive(part, '任何人'), true, 'seat roles stop mattering once wrecked');
}

// --- 4. seat roles only gate driving, not hazards ---
{
    const gameState = {
        roster: [
            { name: '司机', derived: { mov: 8, hp: 10, maxHp: 10 }, hp: 10, skills: { '汽车驾驶': 60, '跳跃': 60 }, status: {}, isActive: true },
            { name: '枪手', derived: { mov: 8, hp: 10, maxHp: 10 }, hp: 10, skills: { '跳跃': 60 }, status: {} }
        ],
        chatHistory: [], inventory: [],
        combat: { active: false, enemies: [{ name: '逃犯', hp: 12, maxHp: 12, skills: { '汽车驾驶': 50 }, status: {} }] },
        chase: null, pendingRuleCheck: null, pendingRuleChecks: []
    };
    const handlers = CoCToolHandlers.create({
        gameState,
        addJournalEntry() {}, addNpc() {}, updateNpcStatus() {}, startCombat() {}, endCombat() {},
        updateEnemy() {}, advanceTurn() {}, createMap() {}, updateRoom() {}, setPosition() {},
        addClue() {}, linkClues() {}, markClueStatus() {}, rollCustomDice() {}, groupRoll() {}
    }, Engine);

    handlers.start_chase({ quarry_name: '逃犯', pursuer_names: ['司机'], vehicle: true, skip_speed_check: true });
    gameState.chase.speedResolved = true;
    handlers.chase_action({
        action: 'set_crew', actor_name: '司机',
        crew: [{ name: '司机', role: 'driver' }, { name: '枪手', role: 'gunner' }]
    });

    const drive = handlers.chase_action({ action: 'push', actor_name: '枪手' });
    assert.ok(String(drive).includes('不是司机'), 'a gunner still may not drive');
    const hazard = handlers.chase_action({ action: 'hazard', actor_name: '枪手', skill_name: '跳跃' });
    assert.ok(!String(hazard.msg || hazard).includes('不是司机'), 'but a gunner may face a hazard');
}

// --- 5. ending a chase voids the queued chase checks instead of settling them later ---
{
    const gameState = { chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    pauseForRuleCheck(gameState, { kind: 'chase_speed', skill: '体质', roller: 'A', target: 'A', prompt: 'A 速度' });
    pauseForRuleCheck(gameState, { kind: 'chase_speed', skill: '体质', roller: 'B', target: 'B', prompt: 'B 速度' });
    pauseForRuleCheck(gameState, { kind: 'san_check', skill: '意志', roller: 'C', target: 'C', prompt: 'C 理智' });

    const voided = voidChaseRuleChecks(gameState);
    assert.equal(voided, 2, 'both chase specs are dropped');
    assert.equal(gameState.pendingRuleCheck.kind, 'san_check', 'the unrelated check is promoted, not lost');
    assert.equal((gameState.pendingRuleChecks || []).length, 0);
    const openChase = gameState.chatHistory.some((m) => m && m._ruleCheck && Array.isArray(m.tool_calls)
        && m.tool_calls.some((t) => t && !t.isResolved && t.target_name === 'A'));
    assert.equal(openChase, false, 'the stale dice panel is closed');
}

console.log('bugfix_round22_smoke: OK');
