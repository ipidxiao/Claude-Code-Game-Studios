/**
 * Online settlement sync smoke: mode cleanup, narrow effects tool, situation key, narrative reconcile.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { applyScenarioEffects, pickOnlineEffects, validateEffects } from '../js/scenario/effects_apply.mjs';
import { situationFromState, canAttemptSkill, recordSkillAttempt } from '../js/engines/skill_attempt.mjs';
import { reconcileNarrativeSettlement } from '../js/ai/narrative_settle_reconcile.mjs';
import { CoCScenarioTutorial } from '../js/data/scenarios/tutorial.mjs';
import { CoCScenarioLighthouseSignal } from '../js/data/scenarios/lighthouse_signal.mjs';
import { CoCScenarioMidnightMuseum } from '../js/data/scenarios/midnight_museum.mjs';
import { CoCScenarioDeepOneShadow } from '../js/data/scenarios/deep_one_shadow.mjs';
import { auditScenario } from '../js/scenario/scenario_audit.mjs';

const Engine = buildCoCEngine();

// pickOnlineEffects strips non-narrow keys
const narrow = pickOnlineEffects({ sanCheck: '0/1', location: 'x', clues: [] });
assert.ok(narrow.sanCheck);
assert.ok(!narrow.location);

const gameState = {
    roster: [{
        name: 'Bob',
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50 },
        skills: { '侦查': 40, '斗殴': 50, '闪避': 30 },
        derived: { hp: 10, maxHp: 10, sanity: 55, mp: 10, mov: 8, db: '0' },
        hp: 10,
        status: {},
        isActive: true
    }],
    inventory: [],
    knownLocations: [],
    atmosphere: {},
    currentLocation: '码头',
    scenarioRunner: { active: false, flags: {} },
    chatHistory: [{ role: 'user', content: '我仔细搜查码头木箱' }],
    combat: { enemies: [{ name: '幽灵怪', fromScenario: true, hp: 5 }] },
    chase: { active: true, participants: [] },
    pendingRuleCheck: { kind: 'test' },
    _lastScenarioCheckLevel: '成功',
    _scenarioEffectActor: 'Bob',
    clueBoard: { clues: [], links: [] }
};

// N0-style clear
function clearScenarioTransients(gs) {
    gs.chase = { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null };
    if (gs.combat && Array.isArray(gs.combat.enemies)) {
        gs.combat.enemies = gs.combat.enemies.filter((e) => e && !e.fromScenario);
    }
    gs.pendingRuleCheck = null;
    delete gs._lastScenarioCheckLevel;
    delete gs._scenarioEffectActor;
}
clearScenarioTransients(gameState);
assert.equal(gameState.chase.active, false);
assert.equal(gameState.combat.enemies.length, 0);
assert.equal(gameState.pendingRuleCheck, null);
assert.equal(gameState._lastScenarioCheckLevel, undefined);

// apply_scenario_effects path (sanCheck)
Engine._setTestRolls([3]);
const r = applyScenarioEffects({
    gameState,
    Engine,
    pushSystem: () => {},
    ensureFlags: () => gameState.scenarioRunner.flags
}, pickOnlineEffects({ sanCheck: '0/1' }), 'Bob');
assert.ok(r.san);
Engine._clearTestRolls();

// enchant via engine (tool-equivalent)
const enc = Engine.MythosEngine.applyEnchantmentBuff(gameState.roster[0], 'elder_sign');
assert.equal(enc.ok, true);

// N4 online situation includes action key
const sit = situationFromState(gameState, { skill: '侦查' });
assert.ok(sit.startsWith('loc:码头:侦查:'));
assert.ok(sit.split(':').length >= 4);

recordSkillAttempt(gameState, { charName: 'Bob', skill: '侦查' }, { success: false, level: '失败' });
const blocked = canAttemptSkill(gameState, { charName: 'Bob', skill: '侦查' });
assert.equal(blocked.ok, false);

// N5 reconcile (category-aware)
const bad = reconcileNarrativeSettlement('他损失了 3 HP 并倒地。', []);
assert.equal(bad.needsReprompt, true);
const good = reconcileNarrativeSettlement('他损失了 3 HP。', [{ function: { name: 'melee_attack' } }]);
assert.equal(good.needsReprompt, false);
const mismatch = reconcileNarrativeSettlement('你击杀了邪教徒。', [{ function: { name: 'cast_spell' } }]);
assert.equal(mismatch.needsReprompt, true);
const chaseOk = reconcileNarrativeSettlement('追逐开始了。', [{ function: { name: 'start_chase' } }]);
assert.equal(chaseOk.needsReprompt, false);
const chaseBad = reconcileNarrativeSettlement('追逐开始了。', [{ function: { name: 'melee_attack' } }]);
assert.equal(chaseBad.needsReprompt, true);

// modules
assert.ok(JSON.stringify(CoCScenarioTutorial).includes('sanCheck'));
assert.ok(JSON.stringify(CoCScenarioLighthouseSignal).includes('sanCheck'));
assert.ok(JSON.stringify(CoCScenarioMidnightMuseum).includes('dispel'));
assert.ok(JSON.stringify(CoCScenarioDeepOneShadow).includes('dispel'));
assert.equal(auditScenario(CoCScenarioTutorial).ok, true, auditScenario(CoCScenarioTutorial).errors.join(';'));
assert.equal(auditScenario(CoCScenarioLighthouseSignal).ok, true, auditScenario(CoCScenarioLighthouseSignal).errors.join(';'));

const v = validateEffects({ combat: { creatureId: 'deepone', mode: 'exchange' } });
assert.equal(v.ok, true);

console.log('online_settlement_smoke: OK');
