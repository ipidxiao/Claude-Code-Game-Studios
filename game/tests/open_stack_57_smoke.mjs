/**
 * OPEN stack 1–57 campaign fix smoke (majority coverage).
 */
import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

globalThis.window = globalThis;

import { buildCoCEngine } from '../js/engines/index.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { dice } from '../js/tools/handlers/dice.mjs';
import { character } from '../js/tools/handlers/character.mjs';
import { clues } from '../js/tools/handlers/clues.mjs';
import { chase } from '../js/tools/handlers/chase.mjs';
import { map as mapH } from '../js/tools/handlers/map.mjs';
import { mythos } from '../js/tools/handlers/mythos.mjs';
import { resolveVehicleOpts } from '../js/data/vehicles.mjs';
import { auditScenario } from '../js/scenario/scenario_audit.mjs';
import { charHp, resolveFirstWoundedChar } from '../js/components/combat_ui_helpers.mjs';
import { clampSelectedCharIndex, resolveSelectedActiveChar } from '../js/state/selection.mjs';
import { CoCStudyState } from '../js/data/mythos_tomes.mjs';

const Engine = buildCoCEngine();
window.CoCEngine = Engine;

function bob(extra = {}) {
    return Object.assign({
        name: 'Bob', isActive: true,
        attrs: { CON: 50, SIZ: 50, STR: 50, DEX: 50, POW: 50, EDU: 60, LUCK: 40 },
        derived: { hp: 10, maxHp: 10, mp: 10, luck: 40, sanity: 50 },
        skills: { '斗殴': 50, '急救': 40, '射击': 40 },
        status: {}, inventory: [], equipment: {}, skillsUsedThisSession: []
    }, extra);
}

let turns = 0;
const mkCombat = (gs, extra = {}) => combat({
    gameState: gs, Engine, addJournalEntry: () => {},
    startCombat: (enemies) => {
        gs.combat = { active: true, enemies: enemies || [], initiativeOrder: [], currentTurnIdx: 0, location: 'X' };
    },
    endCombat: () => { gs.combat.active = false; },
    updateEnemy: () => true,
    advanceTurn: () => { turns++; },
    ...extra
});

// 1 aim_weapon inactive
{
    turns = 0;
    const gs = { roster: [bob()], chatHistory: [], combat: { active: false }, chase: { active: false } };
    const h = mkCombat(gs);
    h.aim_weapon({ shooter_name: 'Bob' });
    assert.equal(turns, 0, 'aim_weapon no advance when inactive');
}

// 4 system_alert
{
    const gs = { chatHistory: [], roster: [] };
    const h = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {} });
    assert.match(String(h.system_alert({})), /错误/);
    assert.match(String(h.system_alert({ message: 'hi' })), /已警告/);
}

// 7 social_opposed unknown
{
    const gs = { roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const h = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {} });
    assert.match(String(h.social_opposed({ actor_name: 'Nope', npc_name: 'X' })), /找不到/);
}

// 8 vehicle unknown
{
    assert.equal(resolveVehicleOpts('flying_saucer_xyz'), null);
    assert.ok(resolveVehicleOpts(null));
}

// 9 dangling next
{
    const r = auditScenario({
        nodes: {
            a: { narrative: 'x'.repeat(80), choices: [{ id: 'c', label: 'go', next: 'missing_node' }] }
        }
    });
    assert.ok(r.errors.some((e) => /dangling choice\.next/.test(e)));
}

// 10 startRitual restart
{
    const c = bob();
    c.mythosStudy = { knownSpells: ['召唤拜亚基'], studiedTomes: {} };
    // may fail unknown spell — just ensure restart path if ritual exists
    c.status.ritual = { spellName: 'X', roundsNeeded: 3, roundsDone: 1, complete: false };
    const r = Engine.MythosEngine.startRitual(c, 'X');
    assert.equal(r.ok, false);
    assert.match(r.desc, /进行中/);
}

// 15 trigger unknown
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {} });
    assert.match(String(h.trigger_affliction({ target_name: 'Ghost' })), /找不到/);
}

// 16 learnSpell empty
{
    const c = bob();
    const r = CoCStudyState.learnSpell(c, '  ');
    assert.equal(r.ok, false);
}

// 17 fire unknown actor
{
    const gs = { roster: [bob()], chatHistory: [], combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false }] }, chase: { active: false } };
    const h = mkCombat(gs);
    assert.match(String(h.fire_weapon({ shooter_name: 'Ghost', enemy_name: 'G' })), /找不到/);
}

// 19 update_enemy prefer living
{
    const gs = {
        roster: [bob()], chatHistory: [],
        combat: {
            active: true,
            enemies: [
                { name: 'Twin', hp: 0, maxHp: 5, isDefeated: true, id: 'a' },
                { name: 'Twin', hp: 5, maxHp: 5, isDefeated: false, id: 'b' }
            ]
        }
    };
    let updated = null;
    const h = combat({
        gameState: gs, Engine, addJournalEntry: () => {},
        startCombat: () => {}, endCombat: () => {},
        updateEnemy: (name, hp) => {
            const list = gs.combat.enemies;
            let e = list.find((en) => en.name === name && !en.isDefeated) || list.find((en) => en.name === name);
            updated = e;
            return true;
        },
        advanceTurn: () => {}
    });
    // prefer living twin — absolute hp set on living copy (not defeated twin)
    const msg = h.update_enemy({ name: 'Twin', hp: 4 });
    assert.match(String(msg), /Twin/);
    assert.equal(gs.combat.enemies.find(e => e.id === 'b').hp, 4);
    assert.equal(gs.combat.enemies.find(e => e.id === 'a').hp, 0);
}

// 21-22 chase
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        chase: { active: false, participants: [], quarryName: '' },
        combat: { active: false }
    };
    const h = chase({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(String(h.chase_action({ action: 'end' })), /没有进行中/);
    gs.chase.active = true;
    gs.chase.speedResolved = true;
    gs.chase.participants = [{ name: 'Bob', isQuarry: false, actionsLeft: 2 }];
    assert.match(String(h.chase_action({ action: 'teleport', actor_name: 'Bob' })), /未知追逐行动/);
}

// 23 UCS noop
{
    const gs = { roster: [bob()], chatHistory: [] };
    const h = character({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(String(h.update_character_status({ target_name: 'Bob' })), /错误/);
}

// 28 enemy miss gate
{
    turns = 0;
    const gs = {
        roster: [bob()], chatHistory: [],
        combat: { active: false, enemies: [{ name: 'G', hp: 5, isDefeated: false, skills: { '斗殴': 1 } }] },
        pendingRuleCheck: null, pendingRuleChecks: []
    };
    const h = mkCombat(gs);
    // force miss by low skill — may still succeed randomly; gate only matters when miss
    // Just call with combat inactive - if miss, turns stay 0
    const orig = Engine.checkSkill;
    Engine.checkSkill = () => ({ success: false, level: '失败', rolledValue: 99, targetValue: 50 });
    h.enemy_attack({ target_name: 'Bob', enemy_name: 'G', description: '拳打' });
    Engine.checkSkill = orig;
    assert.equal(turns, 0);
}

// 29 point-blank firearm skill
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false, rangedSkill: '步枪' }] }
    };
    const h = mkCombat(gs);
    const orig = Engine.checkSkill;
    let used = null;
    Engine.checkSkill = (skill, ...rest) => {
        used = skill;
        return { success: true, level: '成功', rolledValue: 10, targetValue: 50, skillValue: 50 };
    };
    h.enemy_attack({ target_name: 'Bob', enemy_name: 'G', description: '抵近手枪射击', point_blank: true });
    Engine.checkSkill = orig;
    assert.ok(used === '步枪' || used === '射击', 'point-blank uses firearm skill got ' + used);
}

// 30 roll_dice null
{
    const gs = { chatHistory: [] };
    const h = dice({ gameState: gs, rollCustomDice: () => null });
    assert.match(String(h.roll_dice({})), /无效|缺少/);
}

// 31-32 situation
{
    const gs = { chatHistory: [], combat: { situation: { outnumbered: true, surprise: true, distance: 10 } }, roster: [bob()] };
    const h = mkCombat(gs);
    assert.match(String(h.set_combat_situation({ distance: 'far' })), /错误/);
    h.set_combat_situation({ darkness: 'dim' });
    assert.equal(gs.combat.situation.outnumbered, true);
    assert.equal(gs.combat.situation.surprise, true);
}

// 33 reality mythos fallback
{
    const p = Engine.SanityEngine.parseSanNotation('完全虚构的邪神XYZ');
    assert.ok(String(p.notation).includes('/') || p.failDice);
    assert.notEqual(p.failDice, '完全虚构的邪神XYZ');
}

// 34 connect once
{
    const c = bob({ backstory: { ideology: '正义' } });
    const r1 = Engine.InvestigatorEngine.connectBackstory(c, 'ideology');
    assert.equal(r1.ok, true);
    const r2 = Engine.InvestigatorEngine.connectBackstory(c, 'ideology');
    assert.equal(r2.ok, false);
}

// 35 cast_spell null combat
{
    const gs = { roster: [bob()], chatHistory: [], combat: null };
    const h = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });
    // should not throw
    const r = h.cast_spell({ caster_name: 'Bob', spell_name: '不存在', target_name: 'G' });
    assert.ok(typeof r === 'string' || (r && r.msg));
}

// 38 create_map title
{
    const gs = { chatHistory: [], currentLocation: '码头', sceneMap: { title: '', rooms: [] } };
    let stored = null;
    const h = mapH({
        gameState: gs,
        createMap: (t) => { stored = t; gs.sceneMap.title = t; },
        updateRoom: () => {}, setPosition: () => {}
    });
    const msg = h.create_map({ rooms: [] });
    assert.equal(stored, '码头');
    assert.match(String(msg), /码头/);
}

// 39 spend luck english
{
    const c = bob({ attrs: { LUCK: 50 } });
    c.derived.luck = 50;
    const meta = { rolledValue: 60, skillValue: 50, success: false, level: '失败' };
    const r = Engine.spendLuckOnCheck(c, meta, 'hard');
    // hard → 困难成功 needRoll = 25; cost = 60-25 = 35
    assert.ok(r.spent === 35 || r.message);
}

// 40-41-51 skill required
{
    const gs = { roster: [bob(), bob({ name: 'Ann' })], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [] };
    const d = dice({ gameState: gs, rollCustomDice: () => ({ total: 1, kept: [1], sides: 100, count: 1, mod: 0 }) });
    assert.match(String(d.group_roll({})), /skill_name/);
    assert.match(String(d.opposed_roll({ char_name: 'Bob', opponent_name: 'X' })), /char_skill/);
    const sy = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {} });
    assert.match(String(sy.bonus_penalty_roll({ target_name: 'Bob' })), /skill_name/);
}

// 42-43 recoverLuck
{
    const c = bob({ attrs: { LUCK: 95, startingLuck: 50 } });
    c.derived.luck = 95;
    const r = Engine.recoverLuck(c, 20);
    assert.ok(c.attrs.LUCK <= 50);
    assert.equal(r.recovered, 0); // already above cap startingLuck 50? wait cur 95 capped to 50 means actual could be 0
    // After sync, cur=95, cap=min(99,50)=50, next=50, actual=0
    assert.equal(c.attrs.LUCK, 50);
}

// 45-48 hp SoT
{
    assert.equal(charHp({ derived: { hp: 3 }, hp: 10 }), 3);
    const A = { name: 'A', isActive: true, hp: 10, derived: { hp: 2, maxHp: 10 } };
    const B = { name: 'B', isActive: true, hp: 10, derived: { hp: 10, maxHp: 10 } };
    assert.equal(resolveFirstWoundedChar([A, B], [B, A]), 'A');
}

// 47 start_combat empty
{
    const gs = { roster: [bob()], chatHistory: [], combat: { active: false } };
    const h = mkCombat(gs);
    assert.match(String(h.start_combat({})), /敌人/);
}

// 52-55 clues
{
    const gs = { chatHistory: [], clueBoard: { clues: [{ id: 'c1', title: 'A', status: 'new', note: '' }], links: [] } };
    const h = clues({
        gameState: gs,
        addClue: (id, title) => { gs.clueBoard.clues.push({ id: id || 'x', title, status: 'new' }); },
        linkClues: () => ({ ok: true }),
        markClueStatus: (id, status, note) => {
            const c = gs.clueBoard.clues.find((x) => x.id === id);
            if (!c) return false;
            if (status) c.status = status;
            if (note != null) c.note = note;
            return true;
        }
    });
    assert.match(String(h.add_clue({})), /title/);
    assert.match(String(h.mark_clue_status({ id: 'c1', note: 'n' })), /备注/);
    assert.ok(!/undefined/.test(String(h.mark_clue_status({ id: 'c1', note: 'n2' }))));
}

// 53 break_free
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false }] }, chase: { active: false }
    };
    const h = mkCombat(gs);
    assert.match(String(h.break_free({ actor_name: 'Bob' })), /擒抱/);
}

// 54 heal dead
{
    const dead = bob({ name: 'Corpse', status: { isDead: true, untreatedFirstAid: 1 } });
    const gate = Engine.HealingEngine.canTreat(dead, { skill: '急救', type: 'consumable', heal: '1', target: 'HP' }, {});
    assert.equal(gate.ok, false);
}

// 57 EDU hint source
{
    const src = readFileSync(new URL('../js/components/story_growth.mjs', import.meta.url), 'utf8');
    assert.ok(!src.includes('(char.attrs?.EDU || 0) * 5'));
    assert.ok(src.includes('char.attrs?.EDU || 0'));
}

// 11 equip OOB
{
    const { equipItemFromInventory } = await import('../js/components/apex_equip_hud.mjs');
    const gs = { inventory: ['刀'] };
    const c = bob();
    assert.equal(equipItemFromInventory(gs, c, '刀', 5, () => {}), false);
    assert.equal(equipItemFromInventory(gs, c, '枪', 0, () => {}), false);
}

// selection full roster
{
    const gs = {
        roster: [bob({ name: 'Inact', isActive: false }), bob({ name: 'Ann' })],
        selectedCharIndex: 1
    };
    clampSelectedCharIndex(gs);
    const ch = resolveSelectedActiveChar(gs);
    assert.equal(ch.name, 'Ann');
}

// 20 advance_time hours overnight
{
    const gs = {
        roster: [bob({ status: {} })],
        chatHistory: [],
        worldClock: { day: 1, hour: 22 },
        sanCaps: { Bob: 5 },
        pendingRuleCheck: null, pendingRuleChecks: []
    };
    const h = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {} });
    h.advance_time({ hours: 4 });
    assert.equal(gs.worldClock.day, 2);
    assert.equal(gs.worldClock.hour, 2);
    assert.equal(gs.sanCaps.Bob, 5, 'hour overnight must not clear sanCaps');
}

console.log('open_stack_57_smoke: OK');
