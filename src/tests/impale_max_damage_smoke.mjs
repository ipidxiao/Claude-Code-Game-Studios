/**
 * Smoke: checkImpale uses maxDice (CoC 7e max weapon damage), not random parseDice.
 */
import assert from 'assert';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

globalThis.window = globalThis;
// Minimal CoCEngine shell for attachers
const CoCEngine = {
    roll: (n, sides) => n * sides, // unused if maxDice works
    parseDice() { throw new Error('impale must not call parseDice'); },
    maxDice: null,
    getSkillValue: () => 50,
};

const { attachDiceEngine } = await import(
    pathToFileURL(path.join(ROOT, 'js/engines/dice.mjs')).href + `?t=${Date.now()}`
);
attachDiceEngine(CoCEngine);
assert.strictEqual(typeof CoCEngine.maxDice, 'function');
assert.strictEqual(CoCEngine.maxDice('1D8+1'), 9);
assert.strictEqual(CoCEngine.maxDice('2D6'), 12);
assert.strictEqual(CoCEngine.maxDice('1D10'), 10);

const { attachCombatEngine } = await import(
    pathToFileURL(path.join(ROOT, 'js/engines/combat.mjs')).href + `?t=${Date.now()}`
);
attachCombatEngine(CoCEngine);

const weapon = { name: '步枪', type: 'firearm', damage: '2D6+4', impale: true };
const hit = { level: '极难成功', success: true };
const samples = [];
for (let i = 0; i < 8; i++) {
    samples.push(CoCEngine.CombatEngine.checkImpale(weapon, hit).impaleDamage);
}
assert.ok(samples.every((d) => d === 16), `expected stable max 16, got ${samples.join(',')}`);

console.log('impale_max_damage_smoke: OK');
