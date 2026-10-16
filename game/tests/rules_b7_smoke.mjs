/**
 * B7: asylum monthly care, pushed-fail consequences, autofire volley hits
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { ASYLUM_CARE } from '../js/data/asylum_care.mjs';
import { pickPushConsequence } from '../js/data/push_consequences.mjs';

assert.ok(ASYLUM_CARE.poor && ASYLUM_CARE.average && ASYLUM_CARE.good);
assert.equal(typeof CoCEngine.SanityEngine.applyAsylumMonth, 'function');
assert.equal(typeof CoCEngine.resolvePushedFailure, 'function');
assert.equal(typeof CoCEngine.executePushedRoll, 'function');

const patient = {
    name: '住院者',
    derived: { sanity: 40, maxSan: 90 },
    sanity: 40,
    attrs: { POW: 50 },
    insanity: {
        tempInsane: false,
        indefInsane: true,
        indefMonthsLeft: 3,
        phobias: [{ name: '黑暗恐惧症', desc: '对黑暗的恐惧' }],
        manias: [],
        dailyLoss: 0,
        history: []
    },
    status: {}
};

CoCEngine._setTestRolls([10]); // doctor psychoanalysis success
const month = CoCEngine.SanityEngine.applyAsylumMonth(patient, 'good', {
    success: true, level: '极难成功', rolledValue: 10, targetValue: 80
});
assert.ok(month.recovered > 0, 'good care should restore SAN');
assert.equal(patient.status.asylumCare, 'good');
assert.ok(patient.derived.sanity > 40);
CoCEngine._clearTestRolls();

const poorPatient = {
    name: '恶劣院',
    derived: { sanity: 50, maxSan: 90 },
    sanity: 50,
    insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] },
    status: {}
};
const poorFail = CoCEngine.SanityEngine.applyAsylumMonth(poorPatient, 'poor', {
    success: false, level: '失败', rolledValue: 90, targetValue: 45
});
assert.equal(poorFail.recovered, 0);
assert.ok(poorFail.desc.includes('恶劣') || poorFail.desc.includes('无效') || poorFail.care === 'poor');

const pushCons = pickPushConsequence('潜行', false);
assert.ok(pushCons.id);
assert.ok(pushCons.summary);
const fumbleCons = pickPushConsequence('锁匠', true);
assert.ok(fumbleCons.fumble || fumbleCons.severity === 'extreme' || fumbleCons.id);

const sneaker = {
    name: '潜行者',
    attrs: { CON: 50, LUCK: 40 },
    derived: { hp: 10, maxHp: 10 },
    hp: 10,
    skills: { '潜行': 40 },
    status: {}
};
const pushed = CoCEngine.resolvePushedFailure(sneaker, '潜行', {
    success: false, level: '失败', rolledValue: 90, targetValue: 40
});
assert.ok(pushed.desc);
assert.ok(sneaker.status.pushFail);
assert.ok(sneaker.status.pushExposed || sneaker.status.pushAlarm || sneaker.status.pushFail);

const shooter = {
    name: '射手',
    skills: { '冲锋枪': 70 },
    derived: {},
    status: {}
};
const target = { name: '靶子', armor: 0, status: {}, skills: { '闪避': 30 } };
const weapon = { name: '汤姆逊', type: 'firearm', skill: '冲锋枪', damage: '1D10', malfunction: 100 };

CoCEngine._setTestRolls([5, 90]); // attack extreme success (5 <= 14), dodge fail
const auto = CoCEngine.CombatEngine.resolveBurstFire(shooter, target, weapon, 10, 'auto');
assert.equal(auto.mode, 'auto');
assert.equal(auto.difficulty, 'extreme');
assert.ok(!auto.malfunction);
assert.equal(auto.hits, 10, 'extreme success → all bullets hit');
CoCEngine._clearTestRolls();

const half = CoCEngine.CombatEngine.resolveBurstFire(shooter, target, weapon, 10, 'auto', {
    preRolledAttack: { success: true, level: '困难成功', rolledValue: 30, targetValue: 70 },
    preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 30 }
});
assert.equal(half.hits, 5, 'hard success → half of 10');

const one = CoCEngine.CombatEngine.resolveBurstFire(shooter, target, weapon, 10, 'auto', {
    preRolledAttack: { success: true, level: '成功', rolledValue: 50, targetValue: 70 },
    preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 30 }
});
assert.equal(one.hits, 1, 'regular success → 1 bullet on full-auto');

CoCEngine._setTestRolls([40, 90]); // regular success vs fail dodge
const burst = CoCEngine.CombatEngine.resolveBurstFire(shooter, target, weapon, 3, 'burst');
assert.equal(burst.mode, 'burst');
assert.equal(burst.difficulty, 'hard');
if (!burst.malfunction && burst.attackRes && burst.attackRes.success) {
    assert.ok(burst.hits >= 1 && burst.hits <= 3);
}
CoCEngine._clearTestRolls();

// One attack roll model: results length == rounds, not per-bullet opposed pair
assert.equal(burst.results.length, 3);

console.log('rules_b7_smoke: OK');
