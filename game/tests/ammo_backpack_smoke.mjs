/**
 * Ammo parse + backpack fire SoT smokes:
 * - ×N / xN quantity in KP parseAmmoEntry / countBackpackAmmo
 * - parseItemData treats ammo-like names as ammo (not firearm)
 * - fire_weapon: backpack count<=0 fails without magazine fallback
 */
import { strict as assert } from 'node:assert';
import { KpExecutionEngine } from '../js/campaign/kp_execution_engine.mjs';
import { parseItemData } from '../js/data/items.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';

const { countBackpackAmmo, consumeBackpackAmmo } = KpExecutionEngine;

// --- ×N quantity ---
{
    const gs = { inventory: ['.38左轮弹药×12'] };
    assert.equal(countBackpackAmmo(gs, '左轮'), 12, '×12 must parse as 12');
    consumeBackpackAmmo(gs, '左轮', 1);
    assert.equal(countBackpackAmmo(gs, '左轮'), 11, 'consume 1 leaves 11');
}
{
    const gs = { inventory: ['左轮弹药x6'] };
    assert.equal(countBackpackAmmo(gs, '左轮'), 6, 'x6 must parse');
}
{
    const gs = { inventory: ['步枪弹药*3'] };
    assert.equal(countBackpackAmmo(gs, '步枪'), 3, '*3 must parse');
}
{
    const gs = { inventory: ['12发左轮子弹'] };
    assert.equal(countBackpackAmmo(gs, '左轮'), 12, 'N发 still works');
}

// --- parseItemData ammo-first ---
{
    const a = parseItemData('.38左轮弹药×12');
    assert.equal(a.type, 'ammo', 'must not be firearm');
    assert.equal(a.count, 12, '×12 count on parseItemData');
    assert.ok(a.category === '弹药' || a.type === 'ammo');
}
{
    const a = parseItemData('左轮弹药×8');
    assert.equal(a.type, 'ammo');
    assert.equal(a.count, 8);
}
{
    const g = parseItemData('.38左轮手枪');
    assert.ok(g.type === 'firearm' || g.damage, 'real gun still resolves as weapon');
}

// --- fire_weapon empty backpack (count 0) does not use magazine ---
{
    const Engine = buildCoCEngine();
    const bob = {
        name: 'Bob',
        isActive: true,
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50 },
        skills: { '手枪': 50 },
        derived: { hp: 10, maxHp: 10 },
        status: {},
        equipment: { weapon: '.38左轮[弹药:6]', ammo: { count: 6, type: '左轮' } }
    };
    const gs = {
        roster: [bob],
        chatHistory: [],
        inventory: [], // empty backpack
        combat: {
            active: true,
            enemies: [{ id: 'e1', name: '靶', hp: 5, maxHp: 5, isEnemy: true, isDefeated: false }],
            initiativeOrder: [],
            currentTurnIdx: 0
        },
        chase: { active: false }
    };
    const cb = combat({
        gameState: gs,
        Engine,
        addJournalEntry: () => {},
        advanceTurn: () => {},
        updateEnemy: () => {},
        startCombat: () => {},
        endCombat: () => {}
    });
    const msg = cb.fire_weapon({ shooter_name: 'Bob', enemy_name: '靶' });
    assert.equal(msg, '开火失败：背包无匹配弹药。', 'full mag + empty bag must fail');
    assert.equal(bob.equipment.ammo.count, 6, 'magazine untouched');
}

// --- fire with ×N backpack works and decrements ---
{
    const Engine = buildCoCEngine();
    const bob = {
        name: 'Bob',
        isActive: true,
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50 },
        skills: { '手枪': 99 },
        derived: { hp: 10, maxHp: 10 },
        status: {},
        equipment: { weapon: '.38左轮[弹药:0]' }
    };
    const gs = {
        roster: [bob],
        chatHistory: [],
        inventory: ['.38左轮弹药×3'],
        combat: {
            active: true,
            enemies: [{ id: 'e1', name: '靶', hp: 10, maxHp: 10, isEnemy: true, isDefeated: false }],
            initiativeOrder: [],
            currentTurnIdx: 0
        },
        chase: { active: false }
    };
    const cb = combat({
        gameState: gs,
        Engine,
        addJournalEntry: () => {},
        advanceTurn: () => {},
        updateEnemy: () => {},
        startCombat: () => {},
        endCombat: () => {}
    });
    const out = cb.fire_weapon({ shooter_name: 'Bob', enemy_name: '靶' });
    assert.ok(out && (typeof out === 'object' ? out.forceCheck : false), 'fire enqueues check');
    assert.equal(countBackpackAmmo(gs, '左轮'), 2, '×3 → 2 after one shot');
}

console.log('ammo_backpack_smoke: OK');
