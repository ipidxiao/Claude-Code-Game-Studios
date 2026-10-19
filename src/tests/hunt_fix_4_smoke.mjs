/**
 * Hunt-fix 4: group_roll aliases, defeated attack reject, opposed character_name, system_alert type.
 */
import { strict as assert } from 'node:assert';

globalThis.window = globalThis;

import { buildCoCEngine } from '../js/engines/index.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { dice } from '../js/tools/handlers/dice.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { CoCItemDB } from '../js/data/items.mjs';

const Engine = buildCoCEngine();
window.CoCEngine = Engine;
window.CoCItemDB = CoCItemDB;

function bob(extra = {}) {
    return Object.assign({
        name: 'Bob', isActive: true,
        attrs: { CON: 50, DEX: 50, STR: 50, SIZ: 50, POW: 50, LUCK: 40 },
        derived: { hp: 10, maxHp: 10, sanity: 50, mp: 10, luck: 40 },
        skills: { '斗殴': 50, '手枪': 50, '侦查': 40 },
        status: {}, inventory: ['.38左轮'], equipment: { mainHand: '.38左轮' }
    }, extra);
}
function str(r) { return String(r && r.msg != null ? r.msg : r); }
function mkCombat(gs) {
    return combat({
        gameState: gs, Engine, addJournalEntry: () => {},
        startCombat: () => {}, endCombat: () => {}, updateEnemy: () => {}, advanceTurn: () => {}
    });
}

// 1) group_roll aliases — names must not silent-fall to all active
{
    const gs = {
        roster: [bob(), bob({ name: 'Ann', isActive: false })],
        chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: []
    };
    const d = dice({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(str(d.group_roll({ names: ['Ann'], skill: '斗殴' })), /未激活/);
    assert.match(str(d.group_roll({ character_names: ['Ann'], skill_name: '侦查' })), /未激活/);
    assert.match(str(d.group_roll({ targets: ['Ghost'], skill: '斗殴' })), /找不到/);
    // non-empty char_names still works
    assert.match(str(d.group_roll({ char_names: ['Bob'], skill_name: '斗殴' })), /Bob|群体/);
}

// 2) fire / melee reject defeated
{
    const gs = {
        roster: [bob()],
        combat: { active: true, enemies: [{ name: 'G', hp: 0, isDefeated: true }] },
        chatHistory: [], pendingRuleCheck: null
    };
    const h = mkCombat(gs);
    assert.match(str(h.fire_weapon({ shooter_name: 'Bob', enemy_name: 'G' })), /倒下|无法再攻击/);
    assert.equal(gs.pendingRuleCheck, null);
    assert.match(str(h.melee_attack({ actor_name: 'Bob', enemy_name: 'G' })), /倒下|无法再攻击/);
}

// living enemy still ok path (opens check or ammo msg — not defeated error)
{
    const gs = {
        roster: [bob()],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false }] },
        chatHistory: [], pendingRuleCheck: null
    };
    const h = mkCombat(gs);
    const out = str(h.melee_attack({ actor_name: 'Bob', enemy_name: 'G' }));
    assert.ok(!/已倒下/.test(out), out);
}

// 3) opposed_roll character_name alias
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null };
    const d = dice({ gameState: gs, Engine, addJournalEntry: () => {} });
    const out = str(d.opposed_roll({
        character_name: 'Bob', char_skill: '斗殴', opponent_name: 'X', opponent_value: 40, label: 't'
    }));
    assert.ok(!/须提供 char_name/.test(out), out);
    assert.match(out, /Bob|对抗|检定/);
}

// 4) system_alert type gate
{
    const gs = { roster: [bob()], chatHistory: [] };
    const sy = system({
        gameState: gs, Engine, addJournalEntry: () => {},
        addClue: () => {}, updateEnemy: () => {}, dispatch: () => 'x'
    });
    assert.match(str(sy.system_alert({ message: 0 })), /非空字符串|不能为空/);
    assert.match(str(sy.system_alert({ message: false })), /非空字符串|不能为空/);
    assert.match(str(sy.system_alert({ message: '  ' })), /不能为空/);
    assert.equal(str(sy.system_alert({ message: '危险！' })), '已警告');
    assert.ok(gs.chatHistory.some((m) => /危险/.test(m.content)));
}

console.log('hunt_fix_4_smoke: OK');
