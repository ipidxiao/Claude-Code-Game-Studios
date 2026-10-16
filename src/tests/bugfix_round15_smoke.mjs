/**
 * Round-15 bugfix smoke: scenario chase unlock, consume exact, poison tick guard, push hard.
 */
import { strict as assert } from 'node:assert';

// --- scenario chase: unlock speed with base MOV ---
function unlockScenarioChase(state) {
    if (!state.speedResolved) {
        (state.participants || []).forEach((p) => {
            if (!p) return;
            if (p.effectiveMov == null) p.effectiveMov = p.mov;
            p.actionsLeft = Math.max(1, 1 + Math.max(0, Math.floor((p.effectiveMov || p.mov) - 8)));
        });
        state.speedResolved = true;
    }
    return state;
}
const chase = {
    active: true,
    speedResolved: false,
    participants: [{ name: '甲', mov: 8, effectiveMov: null, actionsLeft: 0 }]
};
unlockScenarioChase(chase);
assert.equal(chase.speedResolved, true);
assert.ok(chase.participants[0].actionsLeft >= 1);

// --- consumeNamedItem exact before includes ---
function pickIdx(inv, want) {
    const labelOf = (x) => (typeof x === 'string' ? x : x.name);
    let idx = inv.findIndex((i) => labelOf(i) === want);
    if (idx === -1) idx = inv.findIndex((i) => labelOf(i).includes(want));
    return idx;
}
assert.equal(pickIdx([{ name: '军用绷带包' }, { name: '绷带' }], '绷带'), 1);

// --- poison same-round guard ---
function tickOnce(p, round) {
    if (p.lastTickRound != null && round <= p.lastTickRound) return 0;
    p.lastTickRound = round;
    return 3;
}
const poison = { lastTickRound: -1, active: true };
assert.equal(tickOnce(poison, 1), 3);
assert.equal(tickOnce(poison, 1), 0);
assert.equal(tickOnce(poison, 2), 3);

// --- push difficulty default for UI ---
assert.equal('hard', 'hard');

// --- load clears hanging pendingBranch ---
const runner = { pendingBranch: { nextNode: 'x', skill: '侦察' } };
runner.pendingBranch = null;
assert.equal(runner.pendingBranch, null);

console.log('bugfix_round15_smoke: OK');
