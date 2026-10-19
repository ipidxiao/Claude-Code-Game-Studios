/**
 * P7: disease + pulp (runtime). Coverage gates moved to rules_coverage_gates_smoke.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { lookupDisease, CoCDiseases } from '../js/data/diseases.mjs';

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

CoCEngine.setRulesetProfile('pulp');
assert.equal(CoCEngine.getRulesetProfile().optional.pulpHero, true);
const pulpHp = CoCEngine.calculateDerived({ CON: 50, SIZ: 50, POW: 50, STR: 50, DEX: 50 });
assert.equal(pulpHp.hp, 13);
CoCEngine.setRulesetProfile('7e-full');

console.log('rules_p7_freeze_smoke: OK');
