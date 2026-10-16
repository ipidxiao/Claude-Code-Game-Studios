/**
 * W2 condition / RoundTick smoke
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.applyCondition, 'function');
assert.equal(typeof CoCEngine.processRound, 'function');
assert.equal(typeof CoCEngine.RoundTick.process, 'function');

const ch = {
    name: '伤员',
    hp: 10,
    attrs: { CON: 50, SIZ: 50 },
    derived: { hp: 10, maxHp: 12 },
    status: {},
    poison: []
};

CoCEngine.applyCondition(ch, 'bleeding', { perRound: 1 });
CoCEngine.applyCondition(ch, 'burning', { intensity: 'minor', roundsLeft: 2 });
CoCEngine.applyCondition(ch, 'stunned', { roundsLeft: 1 });

const gs = { roster: [ch], combat: { round: 1, enemies: [] }, chase: { active: false } };
const tick = CoCEngine.processRound(gs);
assert.ok(tick.events.some((e) => e.kind === 'bleeding'));
assert.ok(tick.events.some((e) => e.kind === 'burning'));
assert.ok(!ch.status.stunned, 'stun cleared after tick');

const drown = { name: '溺者', hp: 10, attrs: { CON: 40 }, derived: { hp: 10, maxHp: 10 }, status: {} };
CoCEngine.applyCondition(drown, 'drowning', { roundsHeld: 0 });
for (let i = 0; i < 25; i++) CoCEngine.ConditionsEngine.tickDrowning(drown);
assert.ok(drown.status.drowning.roundsHeld > 20);

const elec = CoCEngine.EnvironmentalEngine.electricDamage('industrial');
assert.ok(elec.damage > 0);
CoCEngine.applyCondition(ch, 'stunned', { roundsLeft: 2 });
assert.ok(ch.status.stunned);

console.log('condition_tick_smoke: OK');
