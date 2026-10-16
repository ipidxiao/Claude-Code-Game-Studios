/**
 * Branch 6+: recovery, extinguish, vehicle mishap, dying enqueue
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { enqueueRuleCheck, resolvePendingRuleCheck } from '../js/state/rule_check.mjs';

const rested = {
    name: '休整者',
    hp: 5,
    attrs: { CON: 60 },
    derived: { hp: 5, maxHp: 12 },
    status: {}
};
const nat = CoCEngine.HealingEngine.recoverNatural(rested, 3);
assert.equal(nat.healed, 3);
assert.equal(CoCEngine.currentHp(rested), 8);

const wounded = {
    name: '重伤者',
    hp: 4,
    attrs: { CON: 60 },
    derived: { hp: 4, maxHp: 12 },
    status: { hasMajorWound: true }
};
const blocked = CoCEngine.HealingEngine.recoverNatural(wounded, 2);
assert.equal(blocked.blocked, true);
assert.equal(blocked.healed, 0);

const week = CoCEngine.HealingEngine.recoverMajorWoundWeek(wounded, {
    success: true, level: '成功', rolledValue: 20, targetValue: 60
});
assert.equal(week.ok, true);
assert.equal(wounded.status.majorWoundRecovering, true);
const after = CoCEngine.HealingEngine.recoverNatural(wounded, 2);
assert.equal(after.healed, 2);

const burner = {
    name: '燃烧者',
    hp: 10,
    attrs: { CON: 50 },
    derived: { hp: 10, maxHp: 10 },
    status: {},
    skills: { '急救': 70 }
};
CoCEngine.applyCondition(burner, 'burning', { intensity: 'moderate', roundsLeft: 3 });
const out = CoCEngine.ConditionsEngine.extinguish(burner, {
    success: true, level: '成功', rolledValue: 10, targetValue: 70
});
assert.equal(out.ok, true);
assert.ok(!burner.status.burning);

const quarry = { name: '车逃', derived: { mov: 10 } };
const pursuer = { name: '车追', derived: { mov: 8 } };
const chase = CoCEngine.ChaseEngine.start(quarry, [pursuer], { lead: 2, vehicle: true });
assert.equal(chase.vehicle, true);
const p = CoCEngine.ChaseEngine.find(chase, '车追');
const mishap = CoCEngine.ChaseEngine.applyVehicleMishap(p, {
    success: false, level: '大失败', rolledValue: 100, targetValue: 40
}, { state: chase, kind: 'lose_control' });
assert.equal(mishap.lostControl, true);
assert.equal(p.actionsLeft, 0);
assert.ok((mishap.vehicleDamage || mishap.damage) >= 2);
assert.ok(p.vehicle && p.vehicle.hp < p.vehicle.maxHp);

const dying = {
    name: '濒死者',
    hp: 0,
    attrs: { CON: 50 },
    derived: { hp: 0, maxHp: 10 },
    status: { isDying: true }
};
const gs = {
    roster: [dying],
    chatHistory: [],
    combat: { round: 2, enemies: [] },
    chase: { active: false }
};
const tick = CoCEngine.processRound(gs);
assert.ok(tick.events.some((e) => e.kind === 'dying_check_needed'));
enqueueRuleCheck(gs, {
    kind: 'dying',
    skill: '体质',
    roller: '濒死者',
    target: '濒死者',
    prompt: 'test dying'
});
assert.equal(gs.pendingRuleCheck.kind, 'dying');
assert.ok(gs.chatHistory.some((m) => m.tool_calls));

resolvePendingRuleCheck(gs, {
    charName: '濒死者',
    skill: '体质',
    success: true,
    level: '成功',
    rolledValue: 20,
    targetValue: 50
}, CoCEngine);
assert.equal(dying.status.isDying, true);
assert.ok(!dying.status.isDead);

console.log('recovery_rules_smoke: OK');
