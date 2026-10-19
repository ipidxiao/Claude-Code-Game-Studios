/**
 * CoC 7e: failed skill checks cannot be freely retried; one push only.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.canAttemptSkill, 'function', 'skill attempt engine attached');
assert.equal(CoCEngine.isPushableSkill('聆听'), true);
assert.equal(CoCEngine.isPushableSkill('斗殴'), false);
assert.equal(CoCEngine.isPushableSkill('克苏鲁神话'), false);
assert.equal(CoCEngine.isCombatSkill('斗殴'), true);

const gs = { skillAttempts: {}, currentLocation: '门厅', scenarioRunner: { active: true, scenarioId: 'tutorial', currentNodeId: 'intro' } };
const spec = { charName: '侦探', skill: '聆听', choiceId: 'intro_rain_door' };

assert.equal(CoCEngine.canAttemptSkill(gs, spec).ok, true, 'first attempt allowed');
CoCEngine.recordSkillAttempt(gs, spec, { success: false, level: '失败' });
const retry = CoCEngine.canAttemptSkill(gs, spec);
assert.equal(retry.ok, false, 'free retry blocked');
assert.match(retry.reason, /不可重复检定/);

const push = CoCEngine.canAttemptSkill(gs, { ...spec, isPush: true });
assert.equal(push.ok, true, 'one push allowed after failure');
CoCEngine.recordSkillAttempt(gs, { ...spec, isPush: true }, { success: false, level: '失败' });
assert.equal(CoCEngine.canAttemptSkill(gs, { ...spec, isPush: true }).ok, false, 'second push blocked');
assert.equal(CoCEngine.canAttemptSkill(gs, spec).ok, false, 'free retry still blocked after push');

const other = { charName: '侦探', skill: '聆听', choiceId: 'stairs_echo' };
assert.equal(CoCEngine.canAttemptSkill(gs, other).ok, true, 'different situation is a new check');

const combat = { charName: '侦探', skill: '斗殴', choiceId: 'intro_rain_door' };
CoCEngine.recordSkillAttempt(gs, combat, { success: false, level: '失败' });
assert.equal(CoCEngine.canAttemptSkill(gs, combat).ok, true, 'combat attacks are a new situation each time');

const pushFirst = CoCEngine.canAttemptSkill(
    { skillAttempts: {}, currentLocation: '门厅' },
    { charName: '侦探', skill: '聆听', isPush: true }
);
assert.equal(pushFirst.ok, false, 'push without a prior failure is illegal');

console.log('skill_attempt_smoke: ok');
