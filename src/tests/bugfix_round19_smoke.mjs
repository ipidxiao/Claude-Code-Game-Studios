/**
 * Round-19 rulebook alignment smoke (real modules):
 * Medicine is Regular on the day of the wound and Hard afterwards, a failed
 * First Aid may be pushed once (a dying patient dies on a failed push),
 * psychoanalysis restores a flat 1D3, and curing a phobia / mania needs the
 * patient's own Sanity roll and grants no SAN.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';

const Engine = buildCoCEngine();

function makePatient(over = {}) {
    return Object.assign({
        name: '伤员', hp: 8, maxHp: 12,
        derived: { hp: 8, maxHp: 12 }, status: {},
        skills: { '急救': 60, '医学': 60 }
    }, over);
}

const firstAid = { type: 'consumable', heal: '1', target: 'HP', skill: '急救', name: '急救包' };
const medicine = { type: 'consumable', heal: '1D3', target: 'HP', skill: '医学', name: '医疗包' };

// --- 1. Medicine: same day is Regular, later is Hard ---
{
    const c = makePatient();
    Engine.HealingEngine.recordInjury(c);
    assert.equal(Engine.HealingEngine.medicineDifficulty(c), 'normal', 'same-day Medicine is Regular');
    Engine.HealingEngine.endDay(c);
    assert.equal(Engine.HealingEngine.medicineDifficulty(c), 'hard', 'treating an older wound needs a Hard success');
    Engine.HealingEngine.recordInjury(c);
    assert.equal(Engine.HealingEngine.medicineDifficulty(c), 'normal', 'a fresh wound is Regular again');
}

// --- 2. First Aid: one attempt, then exactly one push ---
{
    const c = makePatient();
    Engine.HealingEngine.recordInjury(c);
    const failed = Engine.HealingEngine.applyHealing(c, firstAid, c, { success: false, level: '失败' });
    assert.equal(failed.success, false);
    assert.equal(Engine.HealingEngine.canTreat(c, firstAid).ok, false, 'no free retry after a failed First Aid');
    assert.equal(Engine.HealingEngine.canTreat(c, firstAid, { isPush: true }).ok, true, 'the failed roll may be pushed');

    const pushed = Engine.HealingEngine.applyHealing(c, firstAid, c, { success: true, level: '成功' }, { isPush: true });
    assert.equal(pushed.success, true, 'a successful push heals');
    assert.equal(Engine.HealingEngine.canTreat(c, firstAid, { isPush: true }).ok, false, 'only one push per wound');
}

// --- 3. a pushed First Aid that fails kills a dying patient ---
{
    const c = makePatient({ hp: 0, derived: { hp: 0, maxHp: 12 } });
    c.status.isDying = true;
    Engine.HealingEngine.recordInjury(c);
    Engine.HealingEngine.applyHealing(c, firstAid, c, { success: false, level: '失败' });
    const pushFail = Engine.HealingEngine.applyHealing(c, firstAid, c, { success: false, level: '失败' }, { isPush: true });
    assert.equal(pushFail.died, true, 'a failed pushed First Aid is fatal for the dying');
    assert.equal(c.status.isDead, true);
    assert.equal(c.status.isDying, false);
}

// --- 4. psychoanalysis restores a flat 1D3 on any success level ---
{
    const patient = {
        name: '患者', derived: { sanity: 40, maxSan: 90 }, sanity: 40, status: {},
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
    };
    const doc = { name: '弗洛伊德', skills: { '精神分析': 60 } };
    const crit = Engine.SanityEngine.applyTherapy(patient, doc, { success: true, level: '大成功', rolledValue: 1, targetValue: 60 });
    assert.ok(crit.recovered >= 1 && crit.recovered <= 3, 'even a critical session only restores 1D3');
    assert.equal(crit.cured, undefined, 'a session no longer cures an affliction for free');
}

// --- 5. curing a phobia: analyst success + patient Sanity roll, and no SAN gain ---
{
    const phobia = { name: '黑暗恐惧症', desc: '对黑暗的恐惧' };
    const patient = {
        name: '患者', derived: { sanity: 40, maxSan: 90 }, sanity: 40, status: {},
        insanity: { tempInsane: false, indefInsane: true, phobias: [phobia], manias: [], dailyLoss: 0, history: [] }
    };
    const doc = { name: '荣格', skills: { '精神分析': 60 } };

    const missing = Engine.SanityEngine.applyTherapy(patient, doc, { success: true, level: '成功' }, { cureTarget: '深海恐惧症' });
    assert.equal(missing.blocked, true, 'an unknown affliction must not burn the month');
    assert.ok(!patient.status.therapyMonthUsed);

    const step1 = Engine.SanityEngine.applyTherapy(patient, doc, { success: true, level: '成功', rolledValue: 20, targetValue: 60 }, { cureTarget: '黑暗恐惧症' });
    assert.equal(step1.needsSanRoll, true, 'the patient still has to make a Sanity roll');
    assert.equal(step1.recovered, 0, 'the cure attempt replaces the SAN gain');
    assert.equal(patient.derived.sanity, 40);

    const missed = Engine.SanityEngine.resolveTherapyCure(patient, '黑暗恐惧症', { success: false, level: '失败' });
    assert.equal(missed.cured, null, 'a failed Sanity roll bestows no benefit');
    assert.equal(patient.insanity.phobias.length, 1);

    const cured = Engine.SanityEngine.resolveTherapyCure(patient, '黑暗恐惧症', { success: true, level: '成功' });
    assert.equal(cured.cured, phobia);
    assert.equal(patient.insanity.phobias.length, 0);
    assert.equal(patient.derived.sanity, 40, 'curing grants no SAN points');
    assert.equal(patient.insanity.indefInsane, false, 'the last affliction cleared lifts indefinite insanity');
}

// --- 6. fumbling the patient's Sanity roll costs 1D6 SAN ---
{
    const mania = { name: '纵火癖', desc: '' };
    const patient = {
        name: '患者', derived: { sanity: 40, maxSan: 90 }, sanity: 40, status: {},
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [mania], dailyLoss: 0, history: [] }
    };
    const res = Engine.SanityEngine.resolveTherapyCure(patient, '纵火癖', { success: false, level: '大失败' });
    assert.equal(res.cured, null);
    assert.ok(res.worsened >= 1 && res.worsened <= 6);
    assert.equal(patient.derived.sanity, 40 - res.worsened);
    assert.equal(patient.insanity.manias.length, 1, 'the mania stays');
}

console.log('bugfix_round19_smoke: OK');
