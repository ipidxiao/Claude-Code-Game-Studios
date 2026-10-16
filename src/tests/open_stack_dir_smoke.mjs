/**
 * OPEN 1–16 + directory-dig NEW (N-MAP/CL) fix smoke — majority coverage.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

globalThis.window = globalThis;

import { buildCoCEngine } from '../js/engines/index.mjs';
import { CoCToolDefinitions } from '../js/tools/definitions.mjs';
import { validateToolArguments } from '../js/ai/tool_dispatch.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { dice } from '../js/tools/handlers/dice.mjs';
import { chase } from '../js/tools/handlers/chase.mjs';
import { mythos } from '../js/tools/handlers/mythos.mjs';
import { inventory } from '../js/tools/handlers/inventory.mjs';
import { map as mapHandlers } from '../js/tools/handlers/map.mjs';
import { clues } from '../js/tools/handlers/clues.mjs';
import { CoCItemDB } from '../js/data/items.mjs';

const Engine = buildCoCEngine();
window.CoCEngine = Engine;
window.CoCItemDB = CoCItemDB;
window.CoCToolDefinitions = CoCToolDefinitions;

function bob(extra = {}) {
    return Object.assign({
        name: 'Bob', isActive: true,
        attrs: { CON: 50, DEX: 50, STR: 50, SIZ: 50, POW: 50, LUCK: 40, EDU: 60, APP: 50 },
        derived: { hp: 10, maxHp: 10, sanity: 50, mp: 12, luck: 40 },
        skills: { '斗殴': 50, '手枪': 40, '说服': 50, '急救': 40 },
        status: {}, inventory: [], equipment: { weapon: '.38左轮' },
        hp: 10, maxHp: 10
    }, extra);
}
function str(r) { return String(r && r.msg != null ? r.msg : r); }

function mkCombat(gs, stubs = {}) {
    return combat({
        gameState: gs, Engine,
        addJournalEntry: () => {},
        startCombat: stubs.startCombat || ((enemies) => {
            gs.combat = {
                active: true,
                enemies: enemies.map((e) => typeof e === 'string'
                    ? { name: e, hp: 10, maxHp: 10, isDefeated: false }
                    : Object.assign({ hp: 10, maxHp: 10, isDefeated: false }, e)),
                round: 1
            };
        }),
        endCombat: stubs.endCombat || (() => { gs.combat.active = false; }),
        updateEnemy: stubs.updateEnemy || ((name, hpChange) => {
            const e = (gs.combat.enemies || []).find((x) => x.name === name || x.id === name);
            if (!e) return false;
            e.hp = Math.max(0, (e.hp || 0) + hpChange);
            if (e.hp <= 0) e.isDefeated = true;
            return true;
        }),
        advanceTurn: () => {}
    });
}

function mkSys(gs) {
    return system({
        gameState: gs, Engine,
        addJournalEntry: () => {},
        updateNpcStatus: () => {},
        dispatch: (name, args) => {
            if (name === 'update_character_status' && args.hp_change) {
                const c = gs.roster[0];
                c.derived.hp += args.hp_change;
            }
            return 'ok';
        }
    });
}

// 1 start_chase: no synthesize arbitrary quarry
{
    const gs = {
        roster: [bob()], chatHistory: [], chase: { active: false },
        combat: { active: false }, npcRegistry: [], pendingRuleCheck: null, pendingRuleChecks: []
    };
    const h = chase({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(str(h.start_chase({ quarry_name: '幽灵贼', pursuer_names: ['Bob'], skip_speed_check: true })), /找不到猎物/);
    assert.ok(!gs.chase || !gs.chase.active);
    gs.npcRegistry = [{ name: '幽灵贼' }];
    const ok = h.start_chase({ quarry_name: '幽灵贼', pursuer_names: ['Bob'], skip_speed_check: true });
    assert.ok(gs.chase && gs.chase.active, str(ok));
    assert.equal(gs.chase.quarryName, '幽灵贼');
}

// 6 mutual exclusion combat+chase
{
    const gs = {
        roster: [bob()], chatHistory: [],
        chase: { active: true, quarryName: 'X', participants: [] },
        combat: { active: false }, npcRegistry: [{ name: 'Y' }]
    };
    const h = mkCombat(gs);
    assert.match(str(h.start_combat({ enemies: [{ name: '邪教徒', hp: 8 }] })), /追逐进行中/);
    gs.chase.active = false;
    gs.combat = { active: true, enemies: [{ name: '邪教徒', hp: 8 }] };
    const ch = chase({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(str(ch.start_chase({ quarry_name: 'Y', pursuer_names: ['Bob'], skip_speed_check: true })), /战斗进行中/);
}

// 2 update_enemy absolute hp / reject no-op / no undefined maxHp
{
    const gs = {
        roster: [bob()], chatHistory: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 8, isDefeated: false }] }
    };
    const h = mkCombat(gs);
    assert.match(str(h.update_enemy({ enemy_name: 'G', hp_change: 0 })), /无实际 HP 变化/);
    const r = str(h.update_enemy({ enemy_name: 'G', hp: 5 }));
    assert.match(r, /HP 已更新/);
    assert.ok(!/undefined/.test(r), r);
    assert.equal(gs.combat.enemies[0].hp, 5);
    assert.match(r, /—|\//);
}

// 3 maneuvers reject defeated
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 0, isDefeated: true }] }
    };
    const h = mkCombat(gs);
    for (const fn of ['grapple', 'shove', 'disarm', 'knockdown']) {
        assert.match(str(h[fn]({ actor_name: 'Bob', enemy_name: 'G' })), /倒下|已击败|无法再/, fn);
    }
}

// 4 opposed_roll skill alias
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = dice({ gameState: gs, Engine, rollCustomDice: () => ({}), groupRoll: () => ({}), addJournalEntry: () => {} });
    const r = str(h.opposed_roll({ char_name: 'Bob', skill: '斗殴', opponent_name: '守卫', opponent_value: 40 }));
    assert.match(r, /对抗|斗殴/);
    assert.ok(!/须提供 char_skill/.test(r));
}

// 5 apply_poison require potency
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = mkSys(gs);
    assert.match(str(h.apply_poison({ target_name: 'Bob' })), /须提供.*potency|potency/);
    assert.match(str(h.apply_poison({ target_name: 'Bob', potency: 'moderate' })), /中毒/);
}

// 7 env kind alias + no undefined
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = mkSys(gs);
    assert.match(str(h.apply_environmental_damage({ target_name: 'Bob' })), /须提供 type 或 kind/);
    assert.ok(!/undefined/.test(str(h.apply_environmental_damage({ target_name: 'Bob', kind: 'notreal' }))));
    assert.match(str(h.apply_environmental_damage({ target_name: 'Bob', kind: 'fire', intensity: 'mild' })), /fire|燃烧|伤害/);
}

// 8 end_combat inactive
{
    const gs = { roster: [bob()], chatHistory: [], combat: { active: false, enemies: [] } };
    const h = mkCombat(gs);
    assert.match(str(h.end_combat({})), /没有进行中的战斗/);
}

// 9 apply_disease disease_name
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = mkSys(gs);
    assert.match(str(h.apply_disease({ target_name: 'Bob', disease_name: '流行性感冒' })), /流行性感冒|感染/);
}

// 10 bonus_penalty aliases
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = mkSys(gs);
    const r = str(h.bonus_penalty_roll({ character_name: 'Bob', skill_name: '斗殴', bonus: 2 }));
    assert.match(r, /奖励骰|斗殴/);
}

// 11 dive/stand clear aimBonus
{
    const gs = {
        roster: [bob({ status: { aiming: true, aimBonus: 2 } })],
        chatHistory: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false }] },
        chase: { active: false }
    };
    const h = mkCombat(gs);
    str(h.dive_for_cover({ actor_name: 'Bob' }));
    assert.equal(gs.roster[0].status.aimBonus, 0);
    gs.roster[0].status.aimBonus = 2;
    gs.roster[0].status.aiming = true;
    gs.roster[0].status.prone = true;
    str(h.stand_up({ actor_name: 'Bob' }));
    assert.equal(gs.roster[0].status.aimBonus, 0);
}

// 12 fire_weapon legacy target_name as shooter when enemy_name present
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: '邪教徒', hp: 10, maxHp: 10, isDefeated: false }] },
        chase: { active: false }, inventory: ['.38左轮弹药×12']
    };
    const h = mkCombat(gs);
    const r = str(h.fire_weapon({ target_name: 'Bob', enemy_name: '邪教徒' }));
    assert.match(r, /手枪|开火|Bob/);
    assert.ok(!/找不到该角色：邪教徒/.test(r), r);
}

// 13 start_combat string enemies
{
    const gs = { roster: [bob()], chatHistory: [], combat: { active: false }, chase: { active: false } };
    let captured = null;
    const h = mkCombat(gs, {
        startCombat: (enemies) => { captured = enemies; gs.combat = { active: true, enemies: enemies.slice() }; }
    });
    const r = str(h.start_combat({ enemies: ['邪教徒', '深潜者'] }));
    assert.match(r, /邪教徒/);
    assert.match(r, /深潜者/);
    assert.ok(captured && captured[0].name === '邪教徒' && captured[0].hp === 10);
}

// 14 social_opposed opponent_name + require npc
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = mkSys(gs);
    assert.match(str(h.social_opposed({ actor_name: 'Bob', skill_name: 'persuade' })), /须提供/);
    assert.match(str(h.social_opposed({ actor_name: 'Bob', opponent_name: '守卫', kind: 'persuade' })), /守卫/);
    assert.ok(!/对 对方/.test(str(h.social_opposed({ actor_name: 'Bob', opponent_name: '守卫', kind: 'persuade' }))));
}

// 15 ritual/cast spell alias
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });
    const r1 = str(h.start_ritual({ caster_name: 'Bob', spell: '维瑞之印' }));
    assert.ok(!/undefined/.test(r1), r1);
    const r2 = str(h.cast_spell({ caster_name: 'Bob', spell: '维瑞之印' }));
    assert.ok(!/未知法术：undefined/.test(r2), r2);
}

// 16 update_inventory qty≤0 on object items (string API N/A otherwise)
{
    const gs = { roster: [bob()], chatHistory: [], inventory: [] };
    const h = inventory({ gameState: gs, Engine, addJournalEntry: () => {} });
    const r = str(h.update_inventory({ items: [{ name: '绳索', qty: 0 }] }));
    assert.ok(gs.inventory.length === 0 || /跳过|无物品/.test(r + JSON.stringify(gs.chatHistory)));
    assert.ok(!gs.inventory.includes('绳索'));
}

// 17–18 map room_id requireField
{
    const gs = {
        roster: [bob()], chatHistory: [], currentLocation: '门厅',
        sceneMap: { rooms: [{ id: 'a', name: '门厅', status: 'current' }] }
    };
    const api = mapHandlers({
        gameState: gs,
        createMap: () => {},
        updateRoom: (id) => id === 'a',
        setPosition: (id) => id === 'a'
    });
    assert.match(str(api.update_room({})), /须提供/);
    assert.ok(!/undefined/.test(str(api.update_room({}))));
    assert.match(str(api.set_position({})), /须提供/);
    assert.ok(!/undefined/.test(str(api.set_position({}))));
}

// 19 add_clue missing type
{
    const gs = { roster: [bob()], chatHistory: [], clues: [] };
    const api = clues({
        gameState: gs,
        addClue: () => {},
        linkClues: () => ({ ok: true }),
        markClueStatus: () => true
    });
    assert.match(str(api.add_clue({ id: 'c1', title: '血', content: 'x' })), /须提供 type/);
    assert.ok(!gs.chatHistory.some((m) => /undefined/.test(m.content || '')));
}

// 20 create_map object rooms no crash
{
    const gs = { roster: [bob()], chatHistory: [], currentLocation: 'X', sceneMap: { rooms: [] } };
    let saw = null;
    const api = mapHandlers({
        gameState: gs,
        createMap: (title, rooms) => { saw = rooms; gs.sceneMap = { title, rooms: rooms.slice ? rooms.slice() : rooms }; },
        updateRoom: () => false,
        setPosition: () => false
    });
    const out = str(api.create_map({
        title: '码头',
        rooms: { dock: { id: 'dock', name: '码头' }, wh: { id: 'wh', name: '仓库' } }
    }));
    assert.match(out, /已创建/);
    assert.ok(Array.isArray(saw) && saw.length === 2, JSON.stringify(saw));
    assert.match(gs.chatHistory.slice(-1)[0].content, /2 个区域/);
    assert.ok(!/undefined/.test(gs.chatHistory.slice(-1)[0].content));
}

// 21 create_map schema: x/y not required
{
    const v = validateToolArguments('create_map', {
        title: '码头',
        rooms: [{ id: 'dock', name: '码头' }]
    });
    assert.equal(v.ok, true, v.error);
}

console.log('open_stack_dir_smoke: OK');
