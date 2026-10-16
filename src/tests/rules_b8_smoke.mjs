/**
 * B8: luck-on-check, multi-target sweep, multi-round ritual
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(typeof CoCEngine.spendLuckOnCheck, 'function');
assert.equal(typeof CoCEngine.CombatEngine.resolveSweepFire, 'function');
assert.equal(typeof CoCEngine.MythosEngine.startRitual, 'function');
assert.equal(typeof CoCEngine.MythosEngine.continueRitual, 'function');
assert.equal(typeof CoCEngine.MythosEngine.interruptRitual, 'function');

// —— Luck binds to finished check (1 Luck = 1 point off the roll) ——
const lucky = {
    name: '运气客',
    attrs: { LUCK: 40 },
    skills: { '侦查': 50 }
};
const failMeta = {
    charName: '运气客',
    skill: '侦查',
    success: false,
    level: '失败',
    rolledValue: 72,
    skillValue: 50,
    targetValue: 50
};
const luckUp = CoCEngine.spendLuckOnCheck(lucky, failMeta, '成功');
assert.equal(luckUp.success, true, luckUp.message);
assert.equal(luckUp.spent, 22);
assert.equal(luckUp.newRoll, 50);
assert.equal(luckUp.newLevel, '成功');
assert.equal(lucky.attrs.LUCK, 18);

const tooPoor = { name: '穷光蛋', attrs: { LUCK: 5 } };
const needMore = CoCEngine.spendLuckOnCheck(tooPoor, {
    success: false, level: '失败', rolledValue: 90, skillValue: 40, targetValue: 40
}, '成功');
assert.equal(needMore.success, false);
assert.ok(needMore.needed >= 50);

// —— Multi-target sweep ——
const shooter = {
    name: '扫射手',
    skills: { '冲锋枪': 70, '闪避': 40 },
    derived: { db: 0 },
    attrs: { DEX: 60 }
};
const t1 = { name: '甲', skills: { '闪避': 10 }, armor: 0, isEnemy: true };
const t2 = { name: '乙', skills: { '闪避': 10 }, armor: 0, isEnemy: true };
const gun = { skill: '冲锋枪', damage: '1D10', type: 'firearm', malfunction: 100 };
CoCEngine._setTestRolls([20, 90, 90]); // attack success, both dodges fail
const sweep = CoCEngine.CombatEngine.resolveSweepFire(shooter, [t1, t2], gun, 6, 'auto', {
    preRolledAttack: { success: true, level: '困难成功', rolledValue: 30, targetValue: 35 },
    preRolledDodges: {
        '甲': { success: false, level: '失败', rolledValue: 90, targetValue: 10 },
        '乙': { success: false, level: '失败', rolledValue: 90, targetValue: 10 }
    }
});
CoCEngine._clearTestRolls();
assert.ok(sweep.hits >= 2, 'sweep should distribute multiple hits: ' + sweep.description);
assert.ok(sweep.perTarget.length >= 1, sweep.description);
assert.ok(sweep.totalDamage > 0, sweep.description);

// —— Ritual start → continue → cast ——
const caster = {
    name: '仪式师',
    attrs: { POW: 70 },
    derived: { mp: 20, sanity: 60, maxSan: 90 },
    sanity: 60,
    skills: { '克苏鲁神话': 25, '意志': 70 },
    mythosStudy: { knownSpells: ['召唤/控制拜亚基'] },
    status: {}
};
const blocked = CoCEngine.MythosEngine.castSpell(caster, '召唤/控制拜亚基', null);
assert.equal(blocked.success, false);
assert.equal(blocked.needsRitual, true);

const start = CoCEngine.MythosEngine.startRitual(caster, '召唤/控制拜亚基');
assert.equal(start.ok, true);
assert.equal(caster.status.ritual.roundsDone, 1);
assert.equal(caster.status.ritual.complete, false);

const mid = CoCEngine.MythosEngine.continueRitual(caster);
assert.equal(mid.ok, true);
assert.equal(mid.complete, true);
assert.equal(caster.status.ritual.complete, true);

const cast = CoCEngine.MythosEngine.castSpell(caster, '召唤/控制拜亚基', null, { ritualComplete: true });
assert.equal(cast.success, true, cast.description);
assert.ok(!caster.status.ritual, 'ritual cleared after cast');
assert.ok(caster.derived.mp < 20);

// —— Damage interrupts ritual ——
const interrupted = {
    name: '被打断',
    attrs: { POW: 60 },
    derived: { hp: 12, maxHp: 12, mp: 10, sanity: 50 },
    mythosStudy: { knownSpells: ['召唤/控制食尸鬼'] },
    status: {}
};
CoCEngine.MythosEngine.startRitual(interrupted, '召唤/控制食尸鬼');
assert.ok(interrupted.status.ritual);
const dmg = CoCEngine.applyDamage(interrupted, 3, { type: 'combat', desc: '枪伤' });
assert.ok(dmg.ritualInterrupted && dmg.ritualInterrupted.ok);
assert.ok(!interrupted.status.ritual);

console.log('rules_b8_smoke: ok');
