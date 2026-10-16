/**
 * Round-20 rulebook alignment smoke (real modules):
 * a pushed roll repeats the original roll at its own difficulty, and monthly
 * treatment for the insane follows the 7e 1D100 table (01-95 private / 01-50
 * institution / 96-100 costs 1D6 SAN, success allows a Sanity roll to recover).
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { canAttemptSkill, recordSkillAttempt } from '../js/engines/skill_attempt.mjs';
import { ASYLUM_CARE } from '../js/data/asylum_care.mjs';

const Engine = buildCoCEngine();

// --- 1. the push inherits the difficulty of the roll it repeats ---
{
    const gs = { skillAttempts: {}, currentLocation: '档案室', chatHistory: [] };
    const hardSpec = { charName: 'Bob', skill: '图书馆使用', difficulty: 'hard' };
    recordSkillAttempt(gs, hardSpec, { success: false, level: '失败' });
    const hardGate = canAttemptSkill(gs, { charName: 'Bob', skill: '图书馆使用', isPush: true });
    assert.equal(hardGate.ok, true);
    assert.equal(hardGate.difficulty, 'hard', 'a hard roll is pushed at hard, not harder');

    const plainSpec = { charName: 'Bob', skill: '侦查' };
    recordSkillAttempt(gs, plainSpec, { success: false, level: '失败' });
    const plainGate = canAttemptSkill(gs, { charName: 'Bob', skill: '侦查', isPush: true });
    assert.equal(plainGate.difficulty, 'normal', 'a regular roll is pushed at regular difficulty');
}

// --- 2. asylum table: thresholds, flat 1D3, and the 96-100 backlash ---
{
    assert.equal(ASYLUM_CARE.good.successRange, 95);
    assert.equal(ASYLUM_CARE.average.successRange, 50);

    const sane = () => ({
        name: '住院者', derived: { sanity: 40, maxSan: 90 }, sanity: 40, status: {},
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
    });

    const priv = sane();
    const good = Engine.SanityEngine.applyAsylumMonth(priv, 'good', { rolledValue: 90 });
    assert.ok(good.recovered >= 1 && good.recovered <= 3, 'private care restores a flat 1D3');
    assert.equal(good.monthRoll, 90);
    assert.equal(priv.derived.sanity, 40 + good.recovered);

    // Institution succeeds on 01-50, or under the attending doctor's Psychoanalysis (65).
    const inst = sane();
    const stalled = Engine.SanityEngine.applyAsylumMonth(inst, 'average', { rolledValue: 70 });
    assert.equal(stalled.recovered, 0, '51-95 in an institution is no progress');
    assert.equal(stalled.worsened, 0, 'no progress must not cost SAN');
    assert.equal(inst.derived.sanity, 40);

    const poor = sane();
    const poorStalled = Engine.SanityEngine.applyAsylumMonth(poor, 'poor', { rolledValue: 60 });
    assert.equal(poorStalled.recovered, 0, 'a poor institution only succeeds on 01-50');

    const unlucky = sane();
    const bad = Engine.SanityEngine.applyAsylumMonth(unlucky, 'good', { rolledValue: 98 });
    assert.equal(bad.recovered, 0);
    assert.ok(bad.worsened >= 1 && bad.worsened <= 6, '96-100 costs the patient 1D6 SAN');
    assert.equal(unlucky.derived.sanity, 40 - bad.worsened);
}

// --- 3. a successful month lets the patient roll to shake off the insanity ---
{
    const patient = {
        name: '不定疯狂者', derived: { sanity: 30, maxSan: 90 }, sanity: 30, status: {},
        insanity: { tempInsane: false, indefInsane: true, indefMonthsLeft: 3, phobias: [], manias: [], dailyLoss: 0, history: [] }
    };
    const res = Engine.SanityEngine.applyAsylumMonth(patient, 'good', { rolledValue: 20 });
    assert.ok(res.sanRoll, 'a successful month grants a Sanity roll');
    assert.equal(patient.insanity.indefInsane, !res.sanRoll.success, 'passing the Sanity roll ends the insanity');
    if (res.sanRoll.success) assert.equal(patient.insanity.indefMonthsLeft, 0);
}

console.log('bugfix_round20_smoke: OK');
