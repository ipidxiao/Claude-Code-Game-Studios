/**
 * W1 combat situational + maneuvers smoke
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.resolveSituation, 'function');
assert.equal(typeof CoCEngine.resolveManeuver, 'function');
assert.equal(typeof CoCEngine.SituationalEngine.resolve, 'function');

const shotgun = { name: '12号霰弹', type: 'firearm', damage: '4D6/2D6/1D6', range: '10/20/50', skill: '霰弹枪' };
const close = CoCEngine.resolveSituation({
    attacker: { name: 'A', status: {}, derived: { db: '1D4' } },
    defender: { name: 'B', status: {}, armor: 2 },
    weapon: shotgun,
    distance: 5,
    ranged: true
});
assert.ok(close.damageExpr === '4D6' || close.damageExpr.startsWith('4D'), 'close shotgun ' + close.damageExpr);
assert.ok(!close.armorOverride, 'firearms no longer ignore armor by default');

const mid = CoCEngine.resolveSituation({
    attacker: { name: 'A', status: {} },
    defender: { name: 'B', status: {} },
    weapon: shotgun,
    distance: 15,
    ranged: true
});
assert.ok(mid.damageExpr.includes('2D6') || mid.damageExpr === '2D6', 'mid shotgun ' + mid.damageExpr);

const far = CoCEngine.resolveSituation({
    attacker: { name: 'A', status: {} },
    defender: { name: 'B', status: {} },
    weapon: shotgun,
    distance: 40,
    ranged: true
});
assert.ok(far.damageExpr.includes('1D6') || far.damageExpr === '1D6', 'far shotgun ' + far.damageExpr);
assert.equal(far.difficulty, 'hard');

const melee = CoCEngine.resolveWeaponDamage('1D8+DB', { db: '1D4', rangeBand: 'close' });
assert.ok(melee.expr.includes('1D8') && melee.expr.includes('1D4'), melee.expr);

const surprise = CoCEngine.resolveSituation({
    attacker: { name: 'A', status: {} },
    defender: { name: 'B', status: {} },
    weapon: { type: 'melee', damage: '1D3+DB' },
    situation: { surprise: true, outnumbered: true, darkness: 'partial' }
});
assert.ok(surprise.notes.some((n) => n.includes('突袭')));
assert.ok(surprise.notes.some((n) => n.includes('人数')));
assert.ok(surprise.notes.some((n) => n.includes('黑暗')));
// Net: +1 surprise +1 outnumbered -1 darkness → 1 bonus
assert.equal(surprise.bonusDice, 1);
assert.equal(surprise.penaltyDice, 0);

const strong = { name: '壮汉', derived: { build: 3 }, status: {}, skills: { '斗殴': 60 } };
const weak = { name: '瘦子', derived: { build: 0 }, status: {}, skills: { '斗殴': 40 }, equippedWeapon: '手枪' };
const auto = CoCEngine.resolveManeuver(strong, weak, 'disarm', {});
assert.equal(auto.auto, true);
assert.equal(auto.success, true);
assert.equal(weak.status.disarmed, true);
assert.equal(weak.equippedWeapon, null);

const failBuild = CoCEngine.resolveManeuver(weak, strong, 'grapple', {});
assert.equal(failBuild.auto, true);
assert.equal(failBuild.success, false);

CoCEngine._setTestRolls([10, 90]);
const equalA = { name: '甲', derived: { build: 1 }, status: {}, skills: { '斗殴': 50 }, attrs: {} };
const equalB = { name: '乙', derived: { build: 1 }, status: {}, skills: { '斗殴': 50 }, attrs: {} };
const grap = CoCEngine.resolveManeuver(equalA, equalB, 'grapple', {});
assert.ok(grap.attackRes);
CoCEngine._clearTestRolls();

console.log('combat_situational_smoke: OK');
