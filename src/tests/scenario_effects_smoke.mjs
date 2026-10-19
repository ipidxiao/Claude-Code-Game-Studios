/**
 * Scenario effects contract smoke (sanCheck / combat exchange / chase / enchant / audit).
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { applyScenarioEffects, validateEffects, auditScenarioEffects } from '../js/scenario/effects_apply.mjs';
import { auditScenario } from '../js/scenario/scenario_audit.mjs';
import { CoCScenarioMidnightMuseum } from '../js/data/scenarios/midnight_museum.mjs';
import { CoCScenarioDeepOneShadow } from '../js/data/scenarios/deep_one_shadow.mjs';
import { CoCScenarioTutorial } from '../js/data/scenarios/tutorial.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const Engine = buildCoCEngine();
const msgs = [];
const gameState = {
    roster: [{
        name: 'Alice',
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 60, POW: 60, INT: 60 },
        skills: { '斗殴': 50, '闪避': 40, '投掷': 40 },
        derived: { hp: 10, maxHp: 10, sanity: 60, mp: 12, mov: 8, db: '0' },
        hp: 10,
        sanity: 60,
        status: {},
        isActive: true
    }],
    inventory: [],
    knownLocations: [],
    atmosphere: {},
    scenarioRunner: { flags: {} },
    clueBoard: { clues: [], links: [] },
    combat: { enemies: [] },
    chase: null
};

const clues = [];
const ctx = {
    gameState,
    Engine,
    pushSystem: (t) => msgs.push(String(t)),
    addClue: (id, title, content, type) => {
        const c = { id, title, content, type };
        clues.push(c);
        gameState.clueBoard.clues.push(c);
        return c;
    },
    addJournalEntry: () => {},
    ensureFlags: () => gameState.scenarioRunner.flags
};

// flat san still works
applyScenarioEffects(ctx, { san: 2 }, 'Alice');
assert.ok(gameState.roster[0].derived.sanity <= 58);

// sanCheck via Kernel
Engine._setTestRolls([5]); // SAN success likely
const before = gameState.roster[0].derived.sanity;
const rSan = applyScenarioEffects(ctx, { sanCheck: '0/1D6' }, 'Alice');
assert.ok(rSan.san);
assert.ok(typeof gameState.roster[0].derived.sanity === 'number');
Engine._clearTestRolls();

// combat exchange
Engine._setTestRolls([10, 90]);
const rCombat = applyScenarioEffects(ctx, {
    combat: {
        creatureId: 'deepone',
        mode: 'exchange',
        weaponId: 'knife',
        attacker: 'pc',
        onWin: 'won_fight',
        onLose: 'lost_fight'
    }
}, 'Alice');
assert.ok(rCombat.combat && rCombat.combat.foe);
assert.ok(gameState.scenarioRunner.flags.won_fight || gameState.scenarioRunner.flags.lost_fight);
Engine._clearTestRolls();

// pendingRoll: spawn only, no dark exchange
const pendingOut = applyScenarioEffects(ctx, {
    combat: {
        creatureId: 'cultist',
        mode: 'exchange',
        pendingRoll: true,
        attacker: 'pc',
        weaponId: 'knife',
        onWin: 'pend_win',
        onLose: 'pend_lose'
    }
}, 'Alice');
assert.equal(pendingOut.combat.pending, true);
assert.ok(pendingOut.combat.foe);
assert.ok(!gameState.scenarioRunner.flags.pend_win && !gameState.scenarioRunner.flags.pend_lose);

const finished = applyScenarioEffects(ctx, {
    combat: Object.assign({}, pendingOut.combat.cfg, {
        _resolvePending: true,
        preRolledAttack: { success: true, level: '成功' }
    })
}, 'Alice');
assert.ok(finished.combat && finished.combat.exchange);
assert.ok(gameState.scenarioRunner.flags.pend_win || gameState.scenarioRunner.flags.pend_lose);

// chase
const rChase = applyScenarioEffects(ctx, {
    chase: { quarry: 'pc', lead: 2, pursuer: '守卫', pursuerMov: 8 }
}, 'Alice');
assert.ok(rChase.chase && rChase.chase.active);
assert.ok(gameState.chase && gameState.chase.active);

// enchantment
const rEnc = applyScenarioEffects(ctx, { enchantmentId: 'elder_sign' }, 'Alice');
assert.ok(gameState.roster[0].status.enchantmentBuff);
assert.ok(rEnc.messages.some((m) => m.startsWith('enchantment:')));

// dispel (Mythos path)
const rDisp = applyScenarioEffects(ctx, { dispel: true }, 'Alice');
assert.ok(rDisp.messages.includes('dispel'));

// clue quality from last check level
gameState._lastScenarioCheckLevel = '困难成功';
applyScenarioEffects(ctx, {
    clues: [{ id: 't1', title: '测试', content: 'c', type: 'physical' }]
}, 'Alice');
const stamped = clues.find((c) => c.id === 't1');
assert.equal(stamped.quality, 'solid');
assert.equal(stamped.fromCheck, true);

// schema validation
const bad = validateEffects({ combat: { mode: 'exchange' } }, 'n');
assert.equal(bad.ok, false);

// thin modules audit + effects
for (const sc of [CoCScenarioMidnightMuseum, CoCScenarioDeepOneShadow]) {
    const a = auditScenario(sc);
    assert.equal(a.ok, true, sc.id + ': ' + a.errors.join('; '));
    const ea = auditScenarioEffects(sc);
    assert.equal(ea.ok, true, sc.id + ' effects: ' + ea.errors.join('; '));
    const hasSanCheck = JSON.stringify(sc).includes('sanCheck');
    assert.ok(hasSanCheck, sc.id + ' needs sanCheck');
}
assert.ok(JSON.stringify(CoCScenarioDeepOneShadow).includes('creatureId'));
assert.ok(JSON.stringify(CoCScenarioDeepOneShadow).includes('"chase"'));
assert.ok(JSON.stringify(CoCScenarioMidnightMuseum).includes('enchantmentId'));
assert.ok(JSON.stringify(CoCScenarioMidnightMuseum).includes('dispel'));
assert.ok(JSON.stringify(CoCScenarioMidnightMuseum).includes('security_guard') || JSON.stringify(CoCScenarioMidnightMuseum).includes('cultist'));
assert.ok(JSON.stringify(CoCScenarioDeepOneShadow).includes('dispel'));
assert.ok(JSON.stringify(CoCScenarioDeepOneShadow).includes('enchantmentId'));
assert.ok(JSON.stringify(CoCScenarioDeepOneShadow).includes('requiresClueQuality'));
assert.ok(JSON.stringify(CoCScenarioDeepOneShadow).includes('pendingRoll'));

import { CoCScenarioCarnivalOfMasks } from '../js/data/scenarios/carnival_of_masks.mjs';
import { CoCScenarioUniversityOccult } from '../js/data/scenarios/university_occult.mjs';
import { CoCScenarioCoastalFestival } from '../js/data/scenarios/coastal_festival.mjs';
import { CoCScenarioMissingChild } from '../js/data/scenarios/missing_child.mjs';
import { CoCScenarioTrainToNowhere } from '../js/data/scenarios/train_to_nowhere.mjs';
for (const sc of [
    CoCScenarioCarnivalOfMasks,
    CoCScenarioUniversityOccult,
    CoCScenarioCoastalFestival,
    CoCScenarioMissingChild,
    CoCScenarioTrainToNowhere
]) {
    const a = auditScenario(sc);
    assert.equal(a.ok, true, sc.id + ': ' + a.errors.join('; '));
    const ea = auditScenarioEffects(sc);
    assert.equal(ea.ok, true, sc.id + ' effects: ' + ea.errors.join('; '));
    assert.ok(JSON.stringify(sc).includes('sanCheck'), sc.id + ' needs sanCheck');
    assert.ok(JSON.stringify(sc).includes('pendingRoll'), sc.id + ' needs pendingRoll');
}

// pack JSON shares the audit path (tutorial builtin mjs + a downloadable community package)
const tut = auditScenario(CoCScenarioTutorial);
assert.equal(tut.ok, true, 'tutorial: ' + tut.errors.join('; '));
const packPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..', 'js', 'data', 'scenarios', 'packages', 'cc_asylum_whispers.json'
);
assert.ok(fs.existsSync(packPath), 'downloadable package missing: ' + packPath);
{
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const pe = auditScenarioEffects(pack);
    assert.equal(pe.ok, true, 'pack effects: ' + pe.errors.join('; '));
}

void before;
console.log('scenario_effects_smoke: OK');
