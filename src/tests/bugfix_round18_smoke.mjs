/**
 * Round-18 rulebook alignment smoke (real modules):
 * cover soaks before worn armor (7e p.113), Medicine is once per instance of
 * damage (not per week), psychoanalysis is monthly and a fumble costs 1D6 SAN
 * and ends that analyst's therapy.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { canAttemptSkill, recordSkillAttempt } from '../js/engines/skill_attempt.mjs';

const Engine = buildCoCEngine();

// --- 1. the shot hits the cover first; worn armor only stops what gets through ---
{
    const shooter = {
        name: '枪手', isEnemy: true,
        skills: { '手枪': 70, '闪避': 0 },
        derived: { db: '0' }, status: {}
    };
    const target = {
        name: '掩体后', hp: 12, maxHp: 12, armor: 3,
        skills: { '闪避': 0 }, derived: { hp: 12, maxHp: 12, db: '0' }, status: {}
    };
    const cover = Engine.CombatEngine.normalizeCover('hard');
    const hpBefore = cover.hp;
    const res = Engine.CombatEngine.autoResolveExchange(
        shooter, target,
        { skill: '手枪', damage: '10', type: 'firearm' },
        {},
        {
            preRolledAttack: { success: true, level: '成功', rolledValue: 30, targetValue: 70 },
            preRolledDefense: { success: false, level: '失败', rolledValue: 95, targetValue: 0 },
            situation: { targetCover: cover }
        }
    );
    assert.ok(res.coverSoak, 'cover must soak a ballistic hit');
    // Cover absorbs from the raw 10, not from 10 - worn armor.
    assert.equal(res.coverSoak.soaked, hpBefore - (res.coverSoak.cover ? res.coverSoak.cover.hp : 0));
    assert.ok(res.coverSoak.soaked > 0);
    assert.ok(res.damage < 10 - 3, 'cover + worn armor must both reduce the hit');
}

// --- 2. Medicine: once per instance of damage, and it does not block First Aid ---
{
    const patient = {
        name: '伤员', hp: 8, maxHp: 12,
        derived: { hp: 8, maxHp: 12 }, status: {},
        skills: { '医学': 90, '急救': 90 }
    };
    Engine.HealingEngine.recordInjury(patient);
    const med = { type: 'consumable', heal: '1D3', target: 'HP', skill: '医学', name: '医疗包' };
    const aid = { type: 'consumable', heal: '1', target: 'HP', skill: '急救', name: '急救包' };

    const first = Engine.HealingEngine.applyHealing(patient, med, patient, { success: true, level: '成功' });
    assert.equal(first.success, true, 'first Medicine attempt on a fresh wound must pass the gate');
    const second = Engine.HealingEngine.applyHealing(patient, med, patient, { success: true, level: '成功' });
    assert.equal(second.success, false, 'Medicine is one attempt per instance of damage');
    const aidRes = Engine.HealingEngine.applyHealing(patient, aid, patient, { success: true, level: '成功' });
    assert.equal(aidRes.success, true, 'First Aid and Medicine may both treat the same wound');

    // A new injury opens a new Medicine slot; a new week does not.
    Engine.HealingEngine.endWeek(patient);
    assert.equal(Engine.HealingEngine.canTreat(patient, med).ok, false, 'a week of rest must not refresh Medicine');
    Engine.HealingEngine.recordInjury(patient);
    assert.equal(Engine.HealingEngine.canTreat(patient, med).ok, true, 'a new wound may be treated again');
}

// --- 3. a failed Medicine roll still spends the attempt (7e: once per instance) ---
{
    const patient = {
        name: '倒霉蛋', hp: 8, maxHp: 12,
        derived: { hp: 8, maxHp: 12 }, status: {}, skills: { '医学': 20 }
    };
    Engine.HealingEngine.recordInjury(patient);
    const med = { type: 'consumable', heal: '1D3', target: 'HP', skill: '医学', name: '医疗包' };
    const failed = Engine.HealingEngine.applyHealing(patient, med, patient, { success: false, level: '失败' });
    assert.equal(failed.success, false);
    assert.equal(Engine.HealingEngine.canTreat(patient, med).ok, false, 'a failed attempt still uses the one attempt');
}

// --- 4. psychoanalysis: monthly cadence, fumble costs 1D6 SAN and ends the relationship ---
{
    const patient = {
        name: '患者', derived: { sanity: 40, maxSan: 90 }, sanity: 40,
        status: {}, insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
    };
    const doc = { name: '弗洛伊德', skills: { '精神分析': 60 } };

    const ok = Engine.SanityEngine.applyTherapy(patient, doc, { success: true, level: '成功', rolledValue: 30, targetValue: 60 });
    assert.ok(ok.recovered > 0, 'a successful session restores SAN');
    const sameMonth = Engine.SanityEngine.applyTherapy(patient, doc, { success: true, level: '成功', rolledValue: 30, targetValue: 60 });
    assert.equal(sameMonth.blocked, true, 'only one session per month');
    Engine.SanityEngine.endWeek(patient);
    assert.equal(Engine.SanityEngine.canTreat(patient).ok, false, 'a week must not refresh the monthly session');
    Engine.SanityEngine.endMonth(patient);
    assert.equal(Engine.SanityEngine.canTreat(patient).ok, true, 'a month refreshes the session');

    const sanBefore = patient.derived.sanity;
    const fumble = Engine.SanityEngine.applyTherapy(patient, doc, { success: false, level: '大失败', rolledValue: 100, targetValue: 60 });
    assert.equal(fumble.recovered, 0);
    assert.ok(fumble.worsened >= 1 && fumble.worsened <= 6, 'fumble costs 1D6 SAN');
    assert.equal(patient.derived.sanity, sanBefore - fumble.worsened);
    Engine.SanityEngine.endMonth(patient);
    assert.equal(Engine.SanityEngine.canTreat(patient, doc.name).ok, false, 'that analyst is done treating this patient');
    assert.equal(Engine.SanityEngine.canTreat(patient, '荣格').ok, true, 'another analyst may still try');
}

// --- 5. the dice-panel push path is gated like every other push ---
{
    const gs = { skillAttempts: {}, currentLocation: '书房', chatHistory: [] };
    const spec = { charName: 'Bob', skill: '图书馆使用', isPush: true };
    assert.equal(canAttemptSkill(gs, spec).ok, false, 'push needs a failed roll first');

    recordSkillAttempt(gs, { charName: 'Bob', skill: '图书馆使用' }, { success: false, level: '失败' });
    assert.equal(canAttemptSkill(gs, spec).ok, true, 'push is legal right after a failure');

    recordSkillAttempt(gs, spec, { success: false, level: '失败' });
    assert.equal(canAttemptSkill(gs, spec).ok, false, 'only one push per situation');
}

console.log('bugfix_round18_smoke: OK');
