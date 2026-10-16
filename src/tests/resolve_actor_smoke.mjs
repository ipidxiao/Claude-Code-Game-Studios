/**
 * Phase 1 — unified resolveActor / requireField smoke.
 */
import { strict as assert } from 'node:assert';

globalThis.window = globalThis;

import {
    resolveActor, resolveActorFromArgs, resolveEnemy, requireField, normalizeName
} from '../js/tools/resolve.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { character } from '../js/tools/handlers/character.mjs';
import { mythos } from '../js/tools/handlers/mythos.mjs';
import { inventory } from '../js/tools/handlers/inventory.mjs';
import { CoCItemDB } from '../js/data/items.mjs';
import { KpExecutionEngine } from '../js/campaign/kp_execution_engine.mjs';

const Engine = buildCoCEngine();
window.CoCEngine = Engine;
window.CoCItemDB = CoCItemDB;
window.KpExecutionEngine = KpExecutionEngine;

function bob(extra = {}) {
    return Object.assign({
        name: 'Bob', isActive: true,
        attrs: { CON: 50, DEX: 50, STR: 50, SIZ: 50, POW: 50, LUCK: 40 },
        derived: { hp: 8, maxHp: 10, sanity: 50, mp: 10, luck: 40 },
        skills: { '斗殴': 50, '急救': 40, '手枪': 40 },
        status: {}, inventory: [], equipment: {},
        hp: 8, maxHp: 10, sanity: 50
    }, extra);
}
function str(r) { return String(r && r.msg != null ? r.msg : r); }
function mkCombat(gs) {
    return combat({
        gameState: gs, Engine, addJournalEntry: () => {},
        startCombat: () => {}, endCombat: () => {}, updateEnemy: () => {}, advanceTurn: () => {}
    });
}

// --- unit: resolveActor ---
{
    const roster = [bob(), bob({ name: 'Ann', isActive: false })];
    const miss = resolveActor(roster, 'Ghost', { roleLabel: '该角色' });
    assert.equal(miss.ok, false);
    assert.match(miss.error, /找不到/);
    assert.ok(!/undefined/.test(miss.error));

    const omitReq = resolveActor(roster, '', { required: true, roleLabel: '施法者' });
    assert.equal(omitReq.ok, false);
    assert.match(omitReq.error, /须指定/);
    assert.ok(!/undefined/.test(omitReq.error));

    const active = resolveActor(roster, null, { allowActiveFallback: true, roleLabel: '该角色' });
    assert.equal(active.ok, true);
    assert.equal(active.actor.name, 'Bob');

    // unknown name must NOT use isActive
    const ghost = resolveActor(roster, 'Ghost', { allowActiveFallback: true, roleLabel: '该角色' });
    assert.equal(ghost.ok, false);

    const self = resolveActor(roster, '', { fallbackActor: roster[1], roleLabel: '施治者' });
    assert.equal(self.ok, true);
    assert.equal(self.actor.name, 'Ann');
}

// --- unit: requireField ---
{
    const miss = requireField({}, 'backstory_key', { label: 'backstory_key', aliases: ['key'] });
    assert.equal(miss.ok, false);
    assert.ok(!/undefined/.test(miss.error));
    const ok = requireField({ key: ' ideology ' }, 'backstory_key', { aliases: ['key'] });
    assert.equal(ok.ok, true);
    assert.equal(ok.value, 'ideology');
}

// --- unit: resolveEnemy preferLiving ---
{
    const enemies = [
        { name: 'G', hp: 0, isDefeated: true },
        { name: 'G', hp: 5, isDefeated: false }
    ];
    const got = resolveEnemy(enemies, 'G', { preferLiving: true });
    assert.equal(got.ok, true);
    assert.equal(got.enemy.isDefeated, false);
}

// --- handlers: Ghost → error, no Bob side effects ---
{
    const gs = {
        roster: [bob({ status: { burning: { intensity: 'moderate' }, ritual: { spellName: 'X', roundsNeeded: 3, roundsDone: 1, complete: false } } })],
        chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: 'G', hp: 5, isDefeated: false }] },
        chase: { active: false }
    };
    const ritualBefore = gs.roster[0].status.ritual.roundsDone;
    const burningBefore = !!gs.roster[0].status.burning;
    const h = mkCombat(gs);
    const sy = system({ gameState: gs, Engine, addJournalEntry: () => {}, addClue: () => {}, updateEnemy: () => {}, dispatch: () => 'x' });
    const mh = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });

    for (const [label, out] of [
        ['fire', str(h.fire_weapon({ shooter_name: 'Ghost', enemy_name: 'G' }))],
        ['melee', str(h.melee_attack({ actor_name: 'Ghost', enemy_name: 'G' }))],
        ['reload', String(h.reload_weapon({ actor_name: 'Ghost' }))],
        ['stand', String(h.stand_up({ actor_name: 'Ghost' }))],
        ['dive', String(h.dive_for_cover({ actor_name: 'Ghost' }))],
        ['aim', String(h.aim_weapon({ shooter_name: 'Ghost' }))],
        ['extinguish', String(sy.extinguish_fire({ target_name: 'Ghost' }))],
        ['start_ritual', String(mh.start_ritual({ caster_name: 'Ghost', spell_name: 'X' }))],
        ['continue_ritual', String(mh.continue_ritual({ caster_name: 'Ghost' }))]
    ]) {
        assert.match(out, /找不到|须指定/, label + ': ' + out);
        assert.ok(!/undefined/.test(out), label);
    }
    assert.equal(gs.roster[0].status.ritual.roundsDone, ritualBefore, 'continue_ritual must not advance Bob');
    assert.equal(!!gs.roster[0].status.burning, burningBefore, 'extinguish must not clear Bob fire');
    assert.equal(gs.pendingRuleCheck, null, 'no dice panel for Ghost');
}

// --- omit healer → self OK ---
{
    const gs = {
        roster: [bob()], chatHistory: [], pendingRuleCheck: null, pendingRuleChecks: [], worldClock: {}
    };
    const h = character({
        gameState: gs, Engine, addJournalEntry: () => {},
        findChar: (n) => gs.roster.find(r => r.name === n),
        resolveMedicalItem: () => ({ name: '绷带', skill: '急救', heal: '1D3' }),
        consumeMedicalItem: () => {}
    });
    const r = h.apply_healing({ target_name: 'Bob', skill_name: '急救' });
    assert.match(str(r), /Bob 救治 Bob|急救/);
    const bad = h.apply_healing({ target_name: 'Bob', healer_name: 'Ghost', skill_name: '急救' });
    assert.match(String(bad), /找不到施治者/);
}

// --- requireField via connect_backstory ---
{
    const gs = { roster: [bob({ backstory: { ideology: '科学' } })], chatHistory: [] };
    const h = character({
        gameState: gs, Engine, addJournalEntry: () => {},
        findChar: (n) => gs.roster.find(r => r.name === n),
        resolveMedicalItem: () => ({ skill: '急救' }), consumeMedicalItem: () => {}
    });
    const r = h.connect_backstory({ target_name: 'Bob' });
    assert.match(String(r), /须提供/);
    assert.ok(!/undefined/.test(String(r)));
}

assert.equal(normalizeName('  x  '), 'x');
assert.equal(normalizeName('undefined'), '');

// --- mythos update_inventory SAN: no silent isActive / named target ---
{
    function mkInvGs(extra = {}) {
        return Object.assign({
            roster: [
                bob({ name: 'Bob', isActive: true }),
                bob({ name: 'Ann', isActive: true })
            ],
            chatHistory: [],
            inventory: [],
            pendingRuleCheck: null,
            pendingRuleChecks: [],
            kpEngine: { enabled: true },
            selectedCharIndex: 0
        }, extra);
    }
    const hOf = (gs) => inventory({ gameState: gs, Engine, addJournalEntry: () => {} });

    // selection points at inactive Bob → must NOT fall to Ann via isActive
    {
        const gs = mkInvGs({
            roster: [
                bob({ name: 'Bob', isActive: false }),
                bob({ name: 'Ann', isActive: true })
            ],
            selectedCharIndex: 0
        });
        const out = str(hOf(gs).update_inventory({
            items: ['死灵之书残页'], source: 'scenario_find'
        }));
        assert.match(out, /须指定 target_name|接触/, out);
        assert.equal(gs.pendingRuleCheck, null, 'no SAN panel without clear contact');
        assert.ok(!gs.inventory.includes('死灵之书残页'), 'mythos item not added without contact');
        assert.ok(!gs.chatHistory.some(m => /请进行【SAN】/.test(m.content || '')), 'no SAN prompt for wrong PC');
    }

    // named target Ann works
    {
        const gs = mkInvGs({ selectedCharIndex: 0 });
        const r = hOf(gs).update_inventory({
            items: ['死灵之书残页'], source: 'scenario_find', target_name: 'Ann'
        });
        assert.ok(gs.inventory.includes('死灵之书残页'), 'named target adds item');
        assert.ok(gs.pendingRuleCheck, 'SAN panel opened');
        assert.equal(gs.pendingRuleCheck.kind, 'san');
        assert.equal(gs.pendingRuleCheck.roller, 'Ann');
        assert.equal(gs.pendingRuleCheck.target, 'Ann');
        assert.match(str(r), /Ann|SAN|已添加/);
    }

    // clearly selected UI PC (index 1 = Ann) without name
    {
        const gs = mkInvGs({ selectedCharIndex: 1 });
        const r = hOf(gs).update_inventory({
            items: ['死灵之书残页'], source: 'loot', character_name: undefined
        });
        assert.ok(gs.inventory.includes('死灵之书残页'));
        assert.equal(gs.pendingRuleCheck.roller, 'Ann', 'selectedCharIndex wins over Bob isActive');
        assert.ok(r && r.forceCheck, 'returns forceCheck');
    }

    // Ghost name → error, no Bob SAN
    {
        const gs = mkInvGs();
        const out = str(hOf(gs).update_inventory({
            items: ['死灵之书残页'], source: 'loot', target_name: 'Ghost'
        }));
        assert.match(out, /找不到接触者/);
        assert.equal(gs.pendingRuleCheck, null);
        assert.ok(!gs.inventory.includes('死灵之书残页'));
    }
}

console.log('resolve_actor_smoke: OK');
