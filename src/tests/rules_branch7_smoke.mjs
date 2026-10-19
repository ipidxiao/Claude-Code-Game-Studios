/**
 * Branch 7: firearm rate, jam/reload, dive for cover, cover soak, chase vehicle entity.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.CombatEngine.parseAttacksRate, 'function');
assert.equal(typeof CoCEngine.CombatEngine.checkFireRate, 'function');
assert.equal(typeof CoCEngine.CombatEngine.markWeaponJammed, 'function');
assert.equal(typeof CoCEngine.CombatEngine.applyCoverSoak, 'function');
assert.equal(typeof CoCEngine.diveForCover, 'function');
assert.equal(typeof CoCEngine.ChaseEngine.makeParticipant, 'function');

function char(name, extra) {
    return Object.assign({
        name,
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, INT: 60, POW: 50 },
        skills: { '手枪': 50, '汽车驾驶': 50 },
        derived: { hp: 10, maxHp: 10, sanity: 50, maxSan: 90, db: 0, build: 0, mov: 8 },
        hp: 10,
        mov: 8,
        status: {},
        equipment: { weapon: '手枪', ammo: { count: 0, type: '手枪' } }
    }, extra || {});
}

// —— A1 attacks rate ——
const rate1 = CoCEngine.CombatEngine.parseAttacksRate(1);
assert.equal(rate1.shotsPerRound, 1);
assert.equal(rate1.alternateRound, false);
const rate2 = CoCEngine.CombatEngine.parseAttacksRate('2');
assert.equal(rate2.shotsPerRound, 2);
const rateHalf = CoCEngine.CombatEngine.parseAttacksRate('1/2');
assert.equal(rateHalf.shotsPerRound, 1);
assert.equal(rateHalf.alternateRound, true);

const shooter = char('射手');
const gun = { name: '手枪', type: 'firearm', attacks: 1, skill: '手枪', damage: '1D10', malfunction: 100 };
assert.equal(CoCEngine.CombatEngine.checkFireRate(shooter, gun).ok, true);
CoCEngine.CombatEngine.spendFireRate(shooter, gun, 1);
assert.equal(CoCEngine.CombatEngine.checkFireRate(shooter, gun).ok, false);

const crossbow = char('弩手');
const halfGun = { name: '弩', type: 'firearm', attacks: '1/2', skill: '射击：弓箭', damage: '1D8', malfunction: 100 };
CoCEngine.CombatEngine.spendFireRate(crossbow, halfGun, 1);
assert.equal(!!crossbow.status.altFirePendingBlock, true);
CoCEngine.RoundTick.process({ roster: [crossbow], combat: { round: 1 } });
assert.equal(!!crossbow.status.altFireBlocked, true);
assert.equal(CoCEngine.CombatEngine.checkFireRate(crossbow, halfGun).ok, false);
CoCEngine.RoundTick.process({ roster: [crossbow], combat: { round: 2 } });
assert.equal(!!crossbow.status.altFireBlocked, false);
assert.equal(CoCEngine.CombatEngine.checkFireRate(crossbow, halfGun).ok, true);

// —— A2 jam + canAct + clear ——
const jammed = char('卡壳者', { status: { weaponJammed: true } });
assert.equal(CoCEngine.canAct(jammed, 'fire').ok, false);
assert.ok(/卡壳/.test(CoCEngine.canAct(jammed, 'fire').desc));
const cleared = CoCEngine.CombatEngine.clearWeaponJam(jammed);
assert.equal(cleared.ok, true);
assert.equal(CoCEngine.canAct(jammed, 'fire').ok, true);

const jamShooter = char('故障射手');
const jamGun = { name: '左轮', type: 'firearm', skill: '手枪', damage: '1D10', malfunction: 1 };
const jamRes = CoCEngine.CombatEngine.autoResolveExchange(
    jamShooter,
    char('靶', { isEnemy: true }),
    jamGun,
    {},
    { preRolledAttack: { success: true, level: '成功', rolledValue: 99, targetValue: 50 } }
);
assert.equal(jamRes.jammed, true);
assert.equal(!!jamShooter.status.weaponJammed, true);

// —— A3 dive for cover ——
const diver = char('扑掩者');
const dive = CoCEngine.diveForCover(diver, 'hard');
assert.equal(dive.ok, true);
assert.equal(diver.status.prone, true);
assert.equal(diver.status.cover.kind, 'hard');
assert.equal(dive.cover.kind, 'hard');
const sitDive = CoCEngine.SituationalEngine.resolve({
    attacker: char('敌射手'),
    defender: char('立靶'),
    weapon: { type: 'firearm', damage: '1D6', skill: '手枪' },
    ranged: true,
    situation: { cover: dive.cover }
});
assert.ok(sitDive.penaltyDice >= 2, 'hard cover penalty');
assert.ok(sitDive.notes.some((n) => /硬掩体/.test(n)));

// —— A4 cover soak ——
const soak = CoCEngine.CombatEngine.applyCoverSoak(10, { kind: 'soft', armor: 2, hp: 5 });
assert.equal(soak.soaked, 5);
assert.equal(soak.damageToTarget, 3);
assert.equal(soak.destroyed, true);
assert.equal(soak.cover, null);

const coverState = { kind: 'hard', armor: 5, hp: 15, maxHp: 15 };
const hit = CoCEngine.CombatEngine.autoResolveExchange(
    char('穿掩射手'),
    char('掩后靶', { isEnemy: true, hp: 20, maxHp: 20 }),
    { name: '步枪', type: 'firearm', skill: '步枪', damage: '1D10', malfunction: 100 },
    {
        updateEnemy: () => {}
    },
    {
        preRolledAttack: { success: true, level: '成功', rolledValue: 20, targetValue: 50 },
        preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 40 },
        skipSituation: true,
        flatDamage: 12,
        situation: { coverDetail: coverState },
        onCoverUpdate: (next) => { Object.assign(coverState, next || { hp: 0 }); }
    }
);
assert.ok(hit.coverSoak, 'cover soak applied');
assert.ok(hit.coverSoak.soaked > 0 || hit.damage < 12);

// —— B1 chase vehicle entity ——
const quarry = { name: '逃车', derived: { mov: 8 }, mov: 8 };
const pursuer = { name: '追车', derived: { mov: 8 }, mov: 8 };
const chase = CoCEngine.ChaseEngine.start(quarry, [pursuer], {
    lead: 2,
    vehicle: true,
    vehicleHp: 10,
    vehicleArmor: 2,
    vehicleMov: 12
});
assert.equal(chase.vehicle, true);
assert.ok(chase.participants[0].vehicle);
assert.equal(chase.participants[0].vehicle.hp, 10);
// part.mov keeps the character's own MOV; the vehicle only sets effectiveMov.
assert.equal(chase.participants[0].mov, 8);
assert.equal(chase.participants[0].effectiveMov, 12);
assert.ok(/载具HP/.test(CoCEngine.ChaseEngine.describe(chase)));

const part = CoCEngine.ChaseEngine.find(chase, '逃车');
const beforeHp = part.vehicle.hp;
const mishap = CoCEngine.ChaseEngine.applyVehicleMishap(part, { success: false, level: '失败' }, {
    state: chase, kind: 'collide', damage: 6
});
assert.equal(mishap.damage, 0, 'vehicle absorbs; no character damage channel');
assert.equal(mishap.vehicleDamage, 4, '6 - armor 2');
assert.equal(part.vehicle.hp, beforeHp - 4);

const wreckPart = CoCEngine.ChaseEngine.find(chase, '追车');
wreckPart.actionsLeft = 2;
CoCEngine.ChaseEngine.applyVehicleMishap(wreckPart, { success: false, level: '大失败' }, {
    state: chase, kind: 'lose_control', damage: 100
});
assert.equal(wreckPart.vehicle.wrecked, true);
assert.equal(wreckPart.actionsLeft, 0);

console.log('rules_branch7_smoke: OK');
