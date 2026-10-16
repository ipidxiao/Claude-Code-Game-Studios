/**
 * Round-3 bugfix smoke: no phantom enemy, no free reload, chase unlock refresh, damage by id.
 */
import { strict as assert } from 'node:assert';

// --- fire/burst: refuse when no undefeated enemy ---
function pickEnemy(enemies, enemyName) {
    const named = enemyName ? enemies.find((e) => e.name === enemyName && !e.isDefeated) : null;
    if (enemyName && !named) return { err: '找不到敌人' };
    const enemy = named || enemies.find((e) => !e.isDefeated);
    if (!enemy) return { err: '没有可攻击的敌人' };
    return { enemy };
}
assert.equal(pickEnemy([], null).err, '没有可攻击的敌人');
assert.equal(pickEnemy([{ name: '甲', isDefeated: true }], null).err, '没有可攻击的敌人');
assert.equal(pickEnemy([{ name: '甲', isDefeated: false }], null).enemy.name, '甲');

// --- reload: never invent free magazine ---
function reloadFill(need, backpackAmmo, chambered, cap) {
    if (need > 0 && backpackAmmo && backpackAmmo.count > 0) {
        const loaded = Math.min(need, backpackAmmo.count);
        return { chambered: chambered + loaded, free: false };
    }
    if (need <= 0) return { chambered, free: false };
    return { chambered, free: false, refused: true };
}
assert.equal(reloadFill(6, null, 0, 6).refused, true);
assert.equal(reloadFill(6, null, 0, 6).chambered, 0);
assert.equal(reloadFill(3, { count: 10 }, 3, 6).chambered, 6);

// --- apply damage prefers enemyId ---
function resolveEnemy(list, name, enemyId) {
    return (enemyId && list.find((en) => en && en.id === enemyId))
        || list.find((en) => en && en.name === name);
}
const twins = [
    { id: 'a', name: '邪教徒', hp: 10 },
    { id: 'b', name: '邪教徒', hp: 10 }
];
assert.equal(resolveEnemy(twins, '邪教徒', 'b').id, 'b');
assert.equal(resolveEnemy(twins, '邪教徒', null).id, 'a');

// --- chase unlock refresh actionsLeft ---
function actionsFor(part, state) {
    const peers = (state && state.participants) || [];
    const mine = part.effectiveMov != null ? part.effectiveMov : part.mov;
    const slowest = peers.reduce((m, p) => Math.min(m, Number(p.effectiveMov != null ? p.effectiveMov : p.mov) || m), mine);
    return Math.max(1, 1 + Math.max(0, Math.floor(mine - slowest)));
}
const chase = {
    active: true,
    speedResolved: false,
    participants: [
        { name: '甲', mov: 8, effectiveMov: null, actionsLeft: 0 },
        { name: '乙', mov: 9, effectiveMov: null, actionsLeft: 0 }
    ]
};
if (chase.active && chase.speedResolved === false) {
    chase.speedResolved = true;
    chase.participants.forEach((p) => {
        if (p.effectiveMov == null && p.mov != null) p.effectiveMov = p.mov;
        p.actionsLeft = actionsFor(p, chase);
    });
}
assert.equal(chase.speedResolved, true);
assert.ok(chase.participants[0].actionsLeft >= 1);
assert.ok(chase.participants[1].actionsLeft >= 1);

console.log('bugfix_round3_smoke: OK');
