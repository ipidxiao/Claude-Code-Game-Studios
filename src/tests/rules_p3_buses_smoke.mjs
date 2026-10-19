/**
 * P3: ModifierBus + TickBus — register extras without forking resolve/RoundTick.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { registerModifierContributor, unregisterModifierContributor } from '../js/rules/modifier_bus.mjs';
import { registerTickPlugin, unregisterTickPlugin } from '../js/rules/tick_bus.mjs';

assert.ok(CoCEngine.ModifierBus);
assert.ok(CoCEngine.TickBus);
assert.ok(CoCEngine.ModifierBus.list().some((c) => c.id === 'core.situation'));
assert.ok(CoCEngine.TickBus.list().some((p) => p.id === 'core.bleeding'));

// Core situation still works via bus
const sit = CoCEngine.resolveSituation({
    attacker: { name: 'a', status: {} },
    defender: { name: 'd', status: {} },
    weapon: { type: 'firearm', damage: '1D6', skill: '手枪' },
    ranged: true,
    situation: { cover: 'hard' }
});
assert.ok(sit.penaltyDice >= 2, 'hard cover via core contributor');

// Extra contributor stacks
registerModifierContributor('test.extra_penalty', function() {
    return [{ penaltyDice: 1, notes: ['test-extra'] }];
}, { priority: 50 });
const sit2 = CoCEngine.resolveSituation({
    attacker: { name: 'a', status: {} },
    defender: { name: 'd', status: {} },
    weapon: { type: 'firearm', damage: '1D6', skill: '手枪' },
    ranged: true,
    situation: { cover: 'hard' }
});
assert.ok(sit2.notes.some((n) => n === 'test-extra'));
assert.ok(sit2.penaltyDice >= 2);
unregisterModifierContributor('test.extra_penalty');

// Extra tick plugin
let saw = false;
registerTickPlugin('test.ping', {
    scope: 'actor',
    when: 'round',
    priority: 999,
    fn: function(ctx) {
        if (ctx.actor && ctx.actor.name === 'Tick目标') {
            saw = true;
            return [{ name: ctx.actor.name, kind: 'test_ping' }];
        }
    }
});
const gs = {
    roster: [{ name: 'Tick目标', status: {}, derived: { hp: 10 } }],
    combat: { round: 1, enemies: [] },
    chase: { active: false }
};
const tick = CoCEngine.RoundTick.process(gs);
assert.equal(saw, true);
assert.ok(tick.events.some((e) => e.kind === 'test_ping'));
unregisterTickPlugin('test.ping');

// Firearm rate still clears via tick plugin
const gunner = { name: '射速', status: { firearmShotsUsed: 2, altFirePendingBlock: true }, derived: { hp: 10 } };
CoCEngine.RoundTick.process({ roster: [gunner], combat: { round: 2, enemies: [] }, chase: { active: false } });
assert.equal(gunner.status.firearmShotsUsed, undefined);
assert.equal(!!gunner.status.altFireBlocked, true);

console.log('rules_p3_buses_smoke: OK');
