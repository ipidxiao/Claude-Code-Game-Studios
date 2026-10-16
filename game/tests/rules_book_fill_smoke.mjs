/**
 * M2–M5 book-fill smoke: deprivation, crew, tables, dispel, experience, combined, thrown, investigate.
 */
import assert from 'node:assert/strict';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { loadCoverage, validateCoverage, computeFillRate } from '../js/data/coverage/load_coverage.mjs';

const CoCEngine = buildCoCEngine();

assert.equal(typeof CoCEngine.checkCombined, 'function');
assert.equal(typeof CoCEngine.CombatEngine.resolveThrownAttack, 'function');
assert.equal(typeof CoCEngine.ChaseEngine.setCrew, 'function');
assert.equal(typeof CoCEngine.MythosEngine.dispel, 'function');
assert.equal(typeof CoCEngine.lookupEnchantment, 'function');
assert.equal(typeof CoCEngine.experienceCheck, 'function');
assert.equal(typeof CoCEngine.ConditionsEngine.tickDeprivation, 'function');
assert.equal(typeof CoCEngine.SocialEngine.resolveInvestigate, 'function');
assert.ok(CoCEngine.lookupCreature('ghoul'));
assert.ok(CoCEngine.lookupWeapon('handgun'));
assert.ok(CoCEngine.lookupArmor('flak'));

const inv = {
    name: 'Alice',
    attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50, INT: 60, EDU: 70 },
    skills: { '侦察': 40, '图书馆使用': 50, '投掷': 60, '闪避': 40 },
    derived: { hp: 10, mp: 10, sanity: 50, mov: 8, db: '0' },
    hp: 10,
    status: {}
};

CoCEngine.applyCondition(inv, 'hunger', { daysWithout: 4 });
assert.equal(inv.status.hunger.stage, 3);
const depTick = CoCEngine.ConditionsEngine.tickDeprivation(inv, 1);
assert.ok(depTick && depTick.desc);

const foe = { name: 'Cultist', attrs: { DEX: 50 }, skills: { '闪避': 30 }, armor: 0, derived: { db: '' } };
CoCEngine._setTestRolls([20, 90]);
const thrown = CoCEngine.CombatEngine.resolveThrownAttack(inv, foe, { weaponId: 'dynamite' });
assert.ok(thrown && thrown.res);
CoCEngine._clearTestRolls();

const creature = CoCEngine.CombatEngine.spawnCreature('deepone');
assert.equal(creature.creatureId, 'deepone');
assert.ok(creature.hp > 0);

const chase = CoCEngine.ChaseEngine.start(inv, [foe], { vehicle: true, vehicleId: 'automobile', lead: 2 });
const part = CoCEngine.ChaseEngine.find(chase, inv.name);
const crew = CoCEngine.ChaseEngine.setCrew(part, [
    { name: inv.name, role: 'driver' },
    { name: 'Bob', role: 'passenger' }
]);
assert.equal(crew.ok, true);
assert.equal(CoCEngine.ChaseEngine.canDrive(part, inv.name), true);
assert.equal(CoCEngine.ChaseEngine.canDrive(part, 'Bob'), false);

inv.status.ritual = { spellName: '束缚术', roundsNeeded: 2, roundsDone: 1 };
const dispel = CoCEngine.MythosEngine.dispel(inv, inv, { mpCost: 1 });
assert.equal(dispel.ok, true);
assert.ok(!inv.status.ritual);

const enc = CoCEngine.MythosEngine.applyEnchantmentBuff(inv, 'elder_sign');
assert.equal(enc.ok, true);

CoCEngine.InvestigatorEngine.markImprovement(inv, '侦察');
const xp = CoCEngine.experienceCheck(inv, '侦察', { preRoll: 55, preGain: 3 });
assert.equal(xp.improved, true);
assert.equal(inv.skills['侦察'], 43);

// Deprivation now feeds penalty dice into checkSkill — clear it so this asserts checkCombined only.
CoCEngine.ConditionsEngine.clear(inv, 'hunger');
CoCEngine._setTestRolls([10, 10]);
const comb = CoCEngine.checkCombined(
    [{ skill: '侦察' }, { skill: '图书馆使用' }],
    inv,
    { mode: 'worst' }
);
assert.equal(comb.success, true);
CoCEngine._clearTestRolls();

const invOut = CoCEngine.SocialEngine.resolveInvestigate('困难成功');
assert.equal(invOut.clueQuality, 'solid');

const cov = loadCoverage();
const v = validateCoverage(cov);
assert.equal(v.ok, true, v.errors && v.errors.join('; '));
const fill = computeFillRate(cov);
assert.ok(fill.rate + 1e-9 >= 0.95, 'fill ' + fill.rate);

console.log('rules_book_fill_smoke: OK fill=' + (fill.rate * 100).toFixed(1) + '%');
