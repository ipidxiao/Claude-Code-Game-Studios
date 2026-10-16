/**
 * Round-16 bugfix smoke (real modules):
 * online sanCheck -> dice panel, online pending exchange -> dice panel,
 * finished tome cannot be re-studied, exact medical item consume,
 * no-op reload keeps chase action, spawn_npc uses the ruleset initiative score.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { character } from '../js/tools/handlers/character.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';

const Engine = buildCoCEngine();

function makeChar(over = {}) {
    return Object.assign({
        name: 'Bob',
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50, INT: 60, EDU: 60, LUCK: 50 },
        skills: { '侦查': 40, '斗殴': 50, '闪避': 30, '急救': 50, '克苏鲁神话': 0 },
        derived: { hp: 10, maxHp: 10, sanity: 55, maxSan: 55, mp: 10, mov: 8, db: '0' },
        hp: 10,
        maxHp: 10,
        status: {},
        equipment: {},
        isActive: true
    }, over);
}

function makeState(over = {}) {
    return Object.assign({
        roster: [makeChar()],
        inventory: [],
        chatHistory: [],
        journalLog: [],
        knownLocations: [],
        atmosphere: {},
        currentLocation: '码头',
        scenarioRunner: { active: false, flags: {} },
        combat: { active: false, enemies: [], initiativeOrder: [], currentTurnIdx: 0 },
        chase: { active: false, participants: [] },
        pendingRuleCheck: null,
        pendingRuleChecks: []
    }, over);
}

// --- 1. online sanCheck must open the dice panel instead of silent-rolling ---
{
    const gs = makeState();
    const sys = system({ gameState: gs, Engine, addJournalEntry: () => {} });
    const sanBefore = gs.roster[0].derived.sanity;
    const out = sys.apply_scenario_effects({ sanCheck: '0/1D6', target_name: 'Bob' });
    assert.equal(typeof out, 'object', 'sanCheck must return a pause result');
    assert.equal(out.forceCheck.skill, 'SAN');
    assert.equal(gs.pendingRuleCheck.kind, 'san');
    assert.equal(gs.pendingRuleCheck.notation, '0/1D6');
    assert.equal(gs.roster[0].derived.sanity, sanBefore, 'SAN must not drop before the roll');
}

// --- 2. online pending exchange must open the dice panel, not hang ---
{
    const gs = makeState();
    const sys = system({ gameState: gs, Engine, addJournalEntry: () => {} });
    const out = sys.apply_scenario_effects({
        combat: { creatureId: 'cultist', pendingRoll: true, attacker: 'pc' },
        target_name: 'Bob'
    });
    assert.equal(typeof out, 'object', 'pending exchange must return a pause result');
    assert.ok(out.forceCheck, 'pending exchange must emit a dice panel');
    assert.equal(gs.pendingRuleCheck.kind, 'combat_attack');
    assert.equal(gs.pendingRuleCheck.enemyName, '邪教徒');
    assert.ok(gs.pendingRuleCheck.weapon && gs.pendingRuleCheck.weapon.skill, 'spec must carry the resolved weapon');
    assert.equal(gs.combat.enemies.length, 1);
}

// --- 3. a finished tome cannot be re-studied for more Mythos / SAN ---
{
    const c = makeChar();
    const first = Engine.MythosEngine.fullStudy(c, '死灵书', 40);
    assert.equal(first.completed, true);
    assert.equal(first.success, true);
    const mythosAfter = c.skills['克苏鲁神话'];
    const sanAfter = c.derived.sanity;
    const spellsAfter = (c.mythosStudy && c.mythosStudy.spells ? c.mythosStudy.spells.length : 0);
    const again = Engine.MythosEngine.fullStudy(c, '死灵书', 40);
    assert.equal(again.success, false, 'a completed tome must not grant again');
    assert.equal(c.skills['克苏鲁神话'], mythosAfter);
    assert.equal(c.derived.sanity, sanAfter);
    assert.equal((c.mythosStudy && c.mythosStudy.spells ? c.mythosStudy.spells.length : 0), spellsAfter);
}

// --- 4. medical consume prefers the exact item name ---
{
    const gs = makeState({ inventory: [{ name: '强效止痛药' }, { name: '止痛药' }] });
    gs.roster[0].hp = 5;
    gs.roster[0].derived.hp = 5;
    const ch = character({ gameState: gs, Engine, addJournalEntry: () => {} });
    ch.apply_healing({ target_name: 'Bob', item_name: '止痛药' });
    const labels = gs.inventory.map((i) => i.name);
    assert.ok(labels.includes('强效止痛药'), 'compound name must survive');
    assert.ok(!labels.includes('止痛药'), 'exact match must be consumed');
}

// --- 5. a no-op reload must not burn a chase action ---
{
    const gs = makeState();
    gs.roster[0].equipment = { weapon: '.38左轮[弹药:6]' };
    gs.chase = {
        active: true,
        round: 1,
        participants: [{ name: 'Bob', mov: 8, effectiveMov: 8, actionsLeft: 2 }]
    };
    const cb = combat({ gameState: gs, Engine, addJournalEntry: () => {}, advanceTurn: () => {} });
    cb.reload_weapon({ actor_name: 'Bob' });
    assert.equal(gs.chase.participants[0].actionsLeft, 2, 'full magazine must not cost a chase action');
}

// --- 6. spawn_npc: real npc_templates ESM path + ruleset sort key ---
{
    const gs = makeState();
    gs.combat = { active: true, enemies: [], initiativeOrder: [], currentTurnIdx: 0 };
    // No window.generateNpcFromTemplate mock — combat.mjs must use ESM import.
    const cb = combat({ gameState: gs, Engine, addJournalEntry: () => {}, advanceTurn: () => {} });
    for (let i = 0; i < 6; i++) cb.spawn_npc({ template: '邪教徒', name: '邪教徒' + i });
    assert.equal(gs.combat.enemies.length, 6, 'spawn_npc must push real template enemies');
    gs.combat.enemies.forEach((e) => {
        assert.equal(e.hp, 11, '邪教徒 template hp');
        assert.ok(e.id, 'spawned enemy must have id');
    });
    const spawned = gs.combat.initiativeOrder.filter((t) => t && t.isEnemy);
    assert.equal(spawned.length, 6, 'spawned npcs must join the initiative order');
    spawned.forEach((t) => {
        assert.equal(t.initiative, 50, '邪教徒 DEX');
        assert.equal(t.sortKey, 500, 'dex_firearm_first sort key, unarmed');
    });
}

console.log('bugfix_round16_smoke: OK');
