/**
 * OPEN stack 1–24 (post-57) fix smoke — majority coverage.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

globalThis.window = globalThis;

import { buildCoCEngine } from '../js/engines/index.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { dice } from '../js/tools/handlers/dice.mjs';
import { character } from '../js/tools/handlers/character.mjs';
import { chase } from '../js/tools/handlers/chase.mjs';
import { mythos } from '../js/tools/handlers/mythos.mjs';
import { inventory } from '../js/tools/handlers/inventory.mjs';
import { npc } from '../js/tools/handlers/npc.mjs';
import { CoCItemDB } from '../js/data/items.mjs';

const Engine = buildCoCEngine();
window.CoCEngine = Engine;
window.CoCItemDB = CoCItemDB;

function bob(extra = {}) {
    return Object.assign({
        name: 'Bob', isActive: true,
        attrs: { CON: 50, DEX: 50, STR: 50, SIZ: 50, POW: 50, LUCK: 40, EDU: 60 },
        derived: { hp: 10, maxHp: 10, sanity: 50, mp: 12, luck: 40 },
        skills: { '斗殴': 50, '急救': 40, '手枪': 40 },
        status: {}, inventory: [], equipment: {},
        hp: 10, maxHp: 10, sanity: 50, backstory: { ideology: '科学至上' }
    }, extra);
}
function str(r) { return String(r && r.msg != null ? r.msg : r); }
function mkCombat(gs) {
    return combat({
        gameState: gs, Engine, addJournalEntry: () => {},
        startCombat: () => {}, endCombat: () => {}, updateEnemy: () => {}, advanceTurn: () => {}
    });
}
function findActor(g, name) {
    return (g.roster || []).find(r => r && r.name === name)
        || ((g.combat && g.combat.enemies) || []).find(e => e && e.name === name) || null;
}

// 1 start_ritual missing caster
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });
    const r = h.start_ritual({ spell_name: '召唤' });
    assert.match(String(r), /须指定|caster_name/);
    assert.ok(!/undefined/.test(String(r)));
}

// 2 extinguish unknown target
{
    const gs = { roster: [bob({ status: { burning: { intensity: 'moderate' } } })], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {}, dispatch: () => 'x' });
    assert.match(String(h.extinguish_fire({ target_name: 'Ghost' })), /找不到/);
}

// 3–7 reload / stand / dive / aim / melee unknown actor
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false }] }, chase: { active: false }
    };
    const h = mkCombat(gs);
    assert.match(String(h.reload_weapon({ actor_name: 'Ghost' })), /找不到/);
    assert.match(String(h.stand_up({ actor_name: 'Ghost' })), /找不到/);
    assert.match(String(h.dive_for_cover({ actor_name: 'Ghost' })), /找不到/);
    assert.match(String(h.aim_weapon({ shooter_name: 'Ghost' })), /找不到/);
    assert.match(str(h.melee_attack({ actor_name: 'Ghost', enemy_name: 'G' })), /找不到/);
}

// 8 continue_ritual unknown caster does not advance Bob
{
    const gs = { roster: [bob({ status: { ritual: { spellName: 'X', roundsNeeded: 3, roundsDone: 1, complete: false } } })], chatHistory: [] };
    const before = gs.roster[0].status.ritual.roundsDone;
    const h = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(String(h.continue_ritual({ caster_name: 'Ghost' })), /找不到/);
    assert.equal(gs.roster[0].status.ritual.roundsDone, before);
}

// 9 connect_backstory missing key
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = character({
        gameState: gs, Engine, addJournalEntry: () => {},
        findChar: (n) => gs.roster.find(r => r.name === n),
        resolveMedicalItem: () => ({ skill: '急救' }), consumeMedicalItem: () => {}
    });
    const r = h.connect_backstory({ target_name: 'Bob' });
    assert.match(String(r), /须提供|backstory_key|未知背景/);
    assert.ok(!/undefined/.test(String(r)));
}

// 10 apply_healing unknown healer
{
    const gs = { roster: [bob({ hp: 5, derived: { hp: 5, maxHp: 10 } })], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [], worldClock: {} };
    const h = character({
        gameState: gs, Engine, addJournalEntry: () => {},
        findChar: (n) => gs.roster.find(r => r.name === n),
        resolveMedicalItem: () => ({ name: '绷带', skill: '急救', heal: '1D3' }),
        consumeMedicalItem: () => {}
    });
    assert.match(String(h.apply_healing({ target_name: 'Bob', healer_name: 'Ghost', skill_name: '急救' })), /找不到施治者/);
}

// 11 group_roll unknown names
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const d = dice({ gameState: gs, Engine, addJournalEntry: () => {}, rollCustomDice: () => null });
    assert.match(String(d.group_roll({ skill_name: '侦查', char_names: ['Ghost'] })), /找不到/);
}

// 12 apply_enchantment missing id
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });
    const r = h.apply_enchantment({ target_name: 'Bob' });
    assert.match(String(r), /须提供|enchantment/);
    assert.ok(!/undefined/.test(String(r)));
}

// 13 start_chase unknown pursuer
{
    const gs = { roster: [bob()], chatHistory: [], chase: null, combat: { active: false }, npcRegistry: [{ name: '贼' }], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = chase({ gameState: gs, Engine, addJournalEntry: () => {}, findActor });
    assert.match(String(h.start_chase({ quarry_name: '贼', pursuer_names: ['Bob', 'Ghost'], skip_speed_check: true })), /找不到追赶者.*Ghost/);
}

// 14 chase_action push omit actor
{
    const gs = {
        roster: [bob()], chatHistory: [],
        chase: { active: true, speedResolved: true, quarryName: '贼', participants: [{ name: 'Bob', actionsLeft: 2, mov: 8 }, { name: '贼', actionsLeft: 1, mov: 8 }] },
        combat: { active: false }
    };
    const h = chase({ gameState: gs, Engine, addJournalEntry: () => {}, findActor });
    const r = h.chase_action({ action: 'push' });
    assert.match(String(r), /须指定 actor_name/);
    assert.ok(!/undefined/.test(String(r)));
}

// 15 set_crew in schema enum
{
    const defs = readFileSync('js/tools/definitions.mjs', 'utf8');
    const block = defs.slice(defs.indexOf('chase_action:'), defs.indexOf('chase_action:') + 900);
    assert.ok(/set_crew/.test(block), 'chase_action enum must include set_crew');
}

// 16 register_npc missing relation
{
    const gs = { roster: [bob()], chatHistory: [], npcs: [] };
    const journal = [];
    const h = npc({
        gameState: gs, Engine,
        addJournalEntry: (e) => journal.push(e),
        addNpc: (o) => gs.npcs.push(o),
        updateNpcStatus: () => false
    });
    h.register_npc({ name: '李四', description: '路人' });
    assert.ok(!/undefined/.test(JSON.stringify(journal) + JSON.stringify(gs.chatHistory)));
    assert.equal(gs.npcs[0].relation, '未知');
}

// 17 update_npc_status missing name
{
    const gs = { roster: [bob()], chatHistory: [], npcs: [{ name: '李四', status: 'alive' }] };
    const h = npc({
        gameState: gs, Engine, addJournalEntry: () => {},
        addNpc: () => {},
        updateNpcStatus: () => true
    });
    assert.match(String(h.update_npc_status({ status: 'dead' })), /须提供/);
}

// 18 opposed_roll missing char_name
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const d = dice({ gameState: gs, Engine, addJournalEntry: () => {}, rollCustomDice: () => null });
    const r = d.opposed_roll({ char_skill: '斗殴', opponent_name: 'X', opponent_value: 40, label: 't' });
    assert.match(String(r), /须提供 char_name/);
    assert.ok(!/undefined/.test(String(r)));
}

// 19 study_tome missing tome_name
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });
    const r = h.study_tome({ target_name: 'Bob' });
    assert.match(String(r), /须提供 tome_name/);
    assert.ok(!/undefined/.test(String(r)));
}

// 20 enemy_attack missing target_name
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false, skills: { '斗殴': 40 } }] }
    };
    const h = mkCombat(gs);
    const r = h.enemy_attack({ enemy_name: 'G', description: '拳' });
    assert.match(String(r), /须提供 target_name/);
    assert.ok(!/undefined/.test(String(r)));
}

// 21 update_enemy enemy_name alias
{
    const gs = {
        roster: [bob()], chatHistory: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, maxHp: 5, isDefeated: false }] }
    };
    const h = mkCombat(gs);
    const r = h.update_enemy({ enemy_name: 'G', hp: 7, note: '休整' });
    assert.match(String(r), /HP 已更新/);
    assert.equal(gs.combat.enemies[0].hp, 7);
}

// 22 consume exact — 刀 must not take 手术刀
{
    const gs = { roster: [bob()], chatHistory: [], inventory: ['手术刀', '刀鞘'] };
    const h = inventory({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(String(h.consume_inventory_items({ items: ['刀'] })), /缺少|错误/);
    assert.deepEqual(gs.inventory, ['手术刀', '刀鞘']);
    gs.inventory = ['手术刀', '刀'];
    assert.match(String(h.consume_inventory_items({ items: ['刀'] })), /已消耗/);
    assert.deepEqual(gs.inventory, ['手术刀']);
}

// 23 fire_weapon rejects melee equipped
{
    const gs = {
        roster: [bob({ equipment: { weapon: '小刀' } })],
        chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 10, isDefeated: false }] },
        chase: { active: false }
    };
    const h = mkCombat(gs);
    assert.match(str(h.fire_weapon({ shooter_name: 'Bob', enemy_name: 'G' })), /近战|melee_attack/);
}

// 24 social_opposed unknown kind
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {}, dispatch: () => 'x' });
    assert.match(String(h.social_opposed({ actor_name: 'Bob', npc_name: '守卫', kind: 'not_a_kind_zzz' })), /未知社交/);
}

console.log('open_stack_24_smoke: OK');
