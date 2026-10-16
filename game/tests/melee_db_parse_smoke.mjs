/**
 * A1/A2: chained dice parse + melee DB not double-applied after Situational expand.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(CoCEngine.maxDice('1D8+1'), 9);
assert.equal(CoCEngine.maxDice('2D6'), 12);
assert.equal(CoCEngine.maxDice('1D3+1D4'), 7);
assert.equal(CoCEngine.maxDice('1D3+1D4+1'), 8);
assert.equal(CoCEngine.maxDice('0'), 0);

// Deterministic rolls: always max faces for avg check via seeded override
const origRoll = CoCEngine.roll;
CoCEngine.roll = (n, sides) => n * sides;
assert.equal(CoCEngine.parseDice('1D3+1D4'), 7);
assert.equal(CoCEngine.parseDice('1D8+1'), 9);
assert.equal(CoCEngine.parseDice('2D6+1D4'), 16);
CoCEngine.roll = origRoll;

const attacker = {
    name: 'Alice',
    isEnemy: false,
    derived: { db: '1D4' },
    skills: { '斗殴': 50 },
    status: {}
};
const defender = {
    name: '邪教徒',
    isEnemy: true,
    hp: 12,
    maxHp: 12,
    armor: 0,
    skills: { '闪避': 0 },
    status: {}
};

const samples = [];
for (let i = 0; i < 400; i++) {
    const r = CoCEngine.CombatEngine.autoResolveExchange(
        attacker,
        defender,
        { skill: '斗殴', damage: '1D3+DB', type: 'melee' },
        {},
        {
            preRolledAttack: { success: true, level: '成功', rolledValue: 20, targetValue: 50 },
            preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 30 },
            skipSituation: false
        }
    );
    samples.push(r.damage);
}
const min = Math.min(...samples);
const max = Math.max(...samples);
const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
assert.ok(min >= 2 && min <= 3, 'melee min expected ~2–3, got ' + min);
assert.ok(max >= 6 && max <= 7, 'melee max expected ~6–7, got ' + max);
assert.ok(avg > 3.8 && avg < 5.2, 'melee avg expected ~4.5, got ' + avg);

// Impale extra uses max of expanded weapon expression
const imp = CoCEngine.CombatEngine.checkImpale(
    { damage: '1D3+1D4', impale: true },
    { success: true, level: '大成功', rolledValue: 5, targetValue: 50 }
);
assert.equal(imp.impaleDamage, 7);

console.log('melee_db_parse_smoke: OK', { min, max, avg: Number(avg.toFixed(2)) });
