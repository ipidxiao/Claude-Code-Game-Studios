/**
 * Chase 7e defaults: speed result, actions vs slowest, hazard stay, escape streak.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

const quarry = { name: '逃', derived: { mov: 10 }, mov: 10 };
const pursuer = { name: '追', derived: { mov: 8 }, mov: 8 };
const state = CoCEngine.ChaseEngine.start(quarry, [pursuer], { lead: 2, skipSpeedCheck: true });
assert.equal(state.round, 1);
assert.equal(state.speedResolved, true);
assert.ok(state.participants[0].actionsLeft >= 1);

const qActs = CoCEngine.ChaseEngine.actionsFor(state.participants[0], state);
assert.equal(qActs, 3); // 10 vs slowest 8 → 1+2

const slow = { name: '慢', derived: { mov: 5 }, mov: 5 };
const fast = { name: '快', derived: { mov: 9 }, mov: 9 };
const wide = CoCEngine.ChaseEngine.start(fast, [slow], { lead: 2, skipSpeedCheck: true });
assert.equal(CoCEngine.ChaseEngine.actionsFor(wide.participants[0], wide), 5); // 9 vs 5 → 1+4

const before = state.round;
CoCEngine.ChaseEngine.tickRound(state);
assert.equal(state.round, before + 1);

const part = CoCEngine.ChaseEngine.find(state, '追');
const push = CoCEngine.ChaseEngine.applyPush(part, { success: true, level: '成功' }, state);
assert.equal(push.moved, 1);

CoCEngine.ChaseEngine.tickRound(state);
part.actionsLeft = CoCEngine.ChaseEngine.actionsFor(part, state);
const barrier = CoCEngine.ChaseEngine.applyHazard(part, { success: false, level: '失败' }, {
    state, hazardKind: 'barrier'
});
assert.equal(barrier.blocked, true);
assert.equal(barrier.moved, 0);

const obstacleLoc = part.location;
part.actionsLeft = 2;
const obstacle = CoCEngine.ChaseEngine.applyHazard(part, { success: false, level: '失败' }, {
    state, hazardKind: 'obstacle'
});
assert.equal(obstacle.moved, 0);
assert.equal(part.location, obstacleLoc);
assert.equal(part.actionsLeft, 0);

const speedPart = CoCEngine.ChaseEngine.find(state, '逃');
const applied = CoCEngine.ChaseEngine.applySpeedResult(speedPart, {
    success: false, level: '失败', rolledValue: 80, targetValue: 50
});
assert.ok(applied.effectiveMov < 10);

const escape = CoCEngine.ChaseEngine.start(quarry, [pursuer], {
    lead: 5, skipSpeedCheck: true, escapeThreshold: 5, escapeRounds: 2
});
assert.equal(escape.escapeStreak, 0);
assert.equal(CoCEngine.ChaseEngine.evaluate(escape).escaped, false);
CoCEngine.ChaseEngine.tickRound(escape);
assert.equal(escape.escapeStreak, 1);
assert.equal(escape.active, true);
CoCEngine.ChaseEngine.tickRound(escape);
assert.equal(escape.escapeStreak, 2);
assert.equal(escape.outcome, 'escaped');
assert.equal(escape.active, false);

const rState = CoCEngine.ChaseEngine.start(quarry, [pursuer], { lead: 2, skipSpeedCheck: true });
const r = CoCEngine.resolveChaseAction(rState, '逃', 'push', { success: true, level: '成功' });
assert.ok(r.desc);

console.log('chase_actions_smoke: OK');
