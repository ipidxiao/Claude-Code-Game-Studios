/**
 * W5 social opposed smoke
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.resolveSocial, 'function');

const actor = {
    name: '说客',
    skills: { '说服': 70, '取悦': 60, '话术': 55, '恐吓': 40 },
    status: {}
};
const npc = {
    name: '警官',
    skills: { '心理学': 40, '意志': 50 },
    social: {}
};

CoCEngine._setTestRolls([10, 90]);
const win = CoCEngine.resolveSocial(actor, npc, 'persuade', {});
assert.equal(win.ok, true);
assert.equal(win.winner, 'actor');
assert.ok(npc.social && npc.social.last);
CoCEngine._clearTestRolls();

CoCEngine._setTestRolls([10, 10]);
const tieBreak = CoCEngine.resolveSocial(actor, npc, 'persuade', {
    preRolledActor: { success: true, level: '成功', rolledValue: 10, targetValue: 70 },
    preRolledNpc: { success: true, level: '成功', rolledValue: 10, targetValue: 40 }
});
assert.equal(tieBreak.winner, 'actor', 'higher skill wins tie');
CoCEngine._clearTestRolls();

const pushFail = CoCEngine.resolveSocial(actor, npc, 'fast_talk', {
    pushed: true,
    preRolledActor: { success: false, level: '失败', rolledValue: 90, targetValue: 55 },
    preRolledNpc: { success: true, level: '成功', rolledValue: 10, targetValue: 40 }
});
assert.equal(pushFail.pushedFail, true);
assert.ok(actor.status.socialBackfire);

console.log('social_opposed_smoke: OK');
