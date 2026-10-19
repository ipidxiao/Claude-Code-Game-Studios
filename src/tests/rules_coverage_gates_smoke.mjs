/**
 * Coverage gates smoke: core intact + catalog/fill from meta.gates; disease/pulp still checked.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { lookupDisease, CoCDiseases } from '../js/data/diseases.mjs';
import { loadCoverage, validateCoverage } from '../js/data/coverage/load_coverage.mjs';

assert.ok(lookupDisease('热病'));
assert.ok(CoCDiseases.fever);
assert.equal(typeof CoCEngine.ConditionsEngine.tickDisease, 'function');
assert.equal(typeof CoCEngine.ConditionsEngine.treatDisease, 'function');

const patient = {
    name: '病患',
    attrs: { CON: 50, SIZ: 50, POW: 50 },
    derived: { hp: 10, maxHp: 10 },
    hp: 10,
    status: {},
    skills: { '医学': 60 }
};

const infected = CoCEngine.applyCondition(patient, 'disease', { diseaseId: 'flu' });
assert.equal(infected.ok, true);
assert.equal(patient.status.disease.id, 'flu');
assert.equal(patient.status.disease.daysLeft, 3);

const tick = CoCEngine.ConditionsEngine.tickDisease(patient, 1);
assert.ok(tick.damage >= 1);
assert.equal(patient.status.disease.daysLeft, 2);

const treated = CoCEngine.ConditionsEngine.treatDisease(patient, {
    success: true,
    level: '极难成功',
    rolledValue: 5
}, { skill: '医学' });
assert.equal(treated.ok, true);
assert.equal(treated.cured, true);
assert.ok(!patient.status.disease);

CoCEngine.applyCondition(patient, 'disease', { diseaseId: 'fever', days: 6 });
const half = CoCEngine.ConditionsEngine.treatDisease(patient, {
    success: true,
    level: '成功',
    rolledValue: 40
});
assert.equal(half.cured, false);
assert.equal(patient.status.disease.daysLeft, 3);

CoCEngine.setRulesetProfile('7e-full');
const classic = CoCEngine.calculateDerived({ CON: 50, SIZ: 50, POW: 50, STR: 50, DEX: 50 });
assert.equal(classic.hp, 10);

CoCEngine.setRulesetProfile('pulp');
const pulp = CoCEngine.getRulesetProfile();
assert.equal(pulp.optional.pulpHero, true);
assert.equal(pulp.permanentInsanityAtZero, false);
const pulpHp = CoCEngine.calculateDerived({ CON: 50, SIZ: 50, POW: 50, STR: 50, DEX: 50 });
assert.equal(pulpHp.hp, 13);

const luckChar = { name: '运气', attrs: { LUCK: 40 } };
const luck = CoCEngine.recoverLuck(luckChar);
assert.ok(luck.recovered >= 3, '1D10 + pulp bonus 2');

CoCEngine.setRulesetProfile('7e-full');

const cov = loadCoverage();
assert.equal(cov.schemaVersion, 2);
const v = validateCoverage(cov);
assert.equal(v.ok, true, v.errors && v.errors.join('; '));
assert.ok(cov.core.some((e) => e.id === 'architecture.coverage_freeze' && e.status === 'kernel'));
assert.ok(cov.core.some((e) => e.id === 'env.disease' && e.status === 'kernel'));
assert.ok(cov.core.some((e) => e.id === 'optional.pulp' && e.status === 'kernel'));

console.log('rules_coverage_gates_smoke: OK');
