/**
 * P2: Effect IR compile + execute (fire/dive/stand/reload gates).
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.compileIntent, 'function');
assert.equal(typeof CoCEngine.executeEffects, 'function');
assert.ok(CoCEngine.Rules && CoCEngine.Rules.OPS);

const gun = { name: '手枪', type: 'firearm', attacks: 1, skill: '手枪', damage: '1D10' };

// Compile fire_weapon → gate + commit phases
const fireFx = CoCEngine.compileIntent({ kind: 'fire_weapon', weapon: gun, shots: 1 });
assert.ok(fireFx.some((e) => e.op === 'gate_can_act' && e.phase === 'gate'));
assert.ok(fireFx.some((e) => e.op === 'gate_fire_rate' && e.phase === 'gate'));
assert.ok(fireFx.some((e) => e.op === 'spend_fire_rate' && e.phase === 'commit'));

const shooter = {
    name: 'IR射手',
    status: {},
    derived: { hp: 10 },
    attrs: { DEX: 50 }
};

const gateOk = CoCEngine.executeEffects(fireFx, { Engine: CoCEngine, actor: shooter }, { phase: 'gate' });
assert.equal(gateOk.ok, true);
const commit = CoCEngine.executeEffects(fireFx, { Engine: CoCEngine, actor: shooter }, { phase: 'commit' });
assert.equal(commit.ok, true);
assert.equal(shooter.status.firearmShotsUsed, 1);

const gate2 = CoCEngine.executeEffects(fireFx, { Engine: CoCEngine, actor: shooter }, { phase: 'gate' });
assert.equal(gate2.ok, false, 'second shot same round should fail rate gate');

// Jammed actor blocked via IR canAct gate
const jammed = { name: '卡壳', status: { weaponJammed: true }, derived: { hp: 10 } };
const jamGate = CoCEngine.executeEffects(fireFx, { Engine: CoCEngine, actor: jammed }, { phase: 'gate' });
assert.equal(jamGate.ok, false);

// Dive for cover via IR
const diver = { name: '扑掩', status: {}, derived: { hp: 10 } };
const diveFx = CoCEngine.compileIntent({ kind: 'dive_for_cover', cover: 'hard' });
const diveRan = CoCEngine.executeEffects(diveFx, { Engine: CoCEngine, actor: diver });
assert.equal(diveRan.ok, true);
assert.equal(diver.status.prone, true);
assert.equal(diver.status.cover.kind, 'hard');

// Reload clear jam via IR
const fixer = { name: '清障', status: { weaponJammed: true }, derived: { hp: 10 } };
const reloadFx = CoCEngine.compileIntent({ kind: 'reload_weapon', clearJam: true });
const reloadRan = CoCEngine.executeEffects(reloadFx, { Engine: CoCEngine, actor: fixer });
assert.equal(reloadRan.ok, true);
assert.equal(!!fixer.status.weaponJammed, false);

// Stand up via IR
const prone = { name: '倒地', status: { prone: true }, derived: { hp: 10 } };
const standFx = CoCEngine.compileIntent({ kind: 'stand_up' });
const standRan = CoCEngine.executeEffects(standFx, { Engine: CoCEngine, actor: prone });
assert.equal(standRan.ok, true);
assert.equal(!!prone.status.prone, false);

console.log('rules_p2_effect_ir_smoke: OK');
