/**
 * Bugfix batch 2: emitCheck idempotent + chase speed queue detection.
 */
import { strict as assert } from 'node:assert';
import { pauseForRuleCheck, enqueueRuleCheck, resolvePendingRuleCheck } from '../js/state/rule_check.mjs';

const gs = { pendingRuleCheck: null, pendingRuleChecks: [], chatHistory: [], roster: [] };
enqueueRuleCheck(gs, { skill: '体质', roller: '甲', prompt: '先', kind: 'test_a' });
assert.equal(gs.chatHistory.filter((m) => m && m._ruleCheck).length, 1);
assert.equal(gs.pendingRuleCheck._emitted, true);

resolvePendingRuleCheck(gs, { skill: '体质', charName: '甲', success: true }, null);
assert.equal(gs.pendingRuleCheck, null);

enqueueRuleCheck(gs, { skill: '意志', roller: '甲', prompt: '后', kind: 'test_b' });
assert.equal(gs.chatHistory.filter((m) => m && m._ruleCheck).length, 2);
const before = gs.chatHistory.length;
enqueueRuleCheck(gs, { skill: '幸运', roller: '甲', prompt: '排队' });
assert.equal(gs.chatHistory.length, before); // queued must not emit

const gs2 = {
    pendingRuleCheck: { skill: 'SAN', roller: '甲', kind: 'san' },
    pendingRuleChecks: [],
    chatHistory: []
};
const q = pauseForRuleCheck(gs2, { skill: '体质', roller: '甲', kind: 'chase_speed' });
assert.equal(q.forceCheck, null);
assert.equal(q.queued, true);
const pendingSpeed = [gs2.pendingRuleCheck, ...(gs2.pendingRuleChecks || [])]
    .some((s) => s && s.kind === 'chase_speed');
assert.equal(pendingSpeed, true);

console.log('bugfix_batch2_smoke: OK');
