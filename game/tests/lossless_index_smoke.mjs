/**
 * Lossless A/B: selectedCharIndex space, omit→selected, burst alias, ritual unique,
 * dodge name match, clue title merge, social missing NPC.
 */
import { strict as assert } from 'node:assert';

globalThis.window = globalThis;

import { resolveActor } from '../js/tools/resolve.mjs';
import { lastActiveRosterIndex, resolveSelectedActiveChar } from '../js/state/selection.mjs';
import { resolveFirstWoundedChar } from '../js/components/combat_ui_helpers.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { mythos } from '../js/tools/handlers/mythos.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { CoCItemDB } from '../js/data/items.mjs';
import { KpExecutionEngine } from '../js/campaign/kp_execution_engine.mjs';
import { resolvePendingRuleCheck } from '../js/state/rule_check.mjs';

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
        status: {}, inventory: [], equipment: { weapon: '左轮手枪[弹药:12]' },
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

{
    const gs = {
        roster: [
            bob({ name: 'Ann', isActive: true }),
            bob({ name: 'Bob', isActive: false }),
            bob({ name: 'Cid', isActive: true })
        ],
        selectedCharIndex: 0
    };
    assert.equal(lastActiveRosterIndex(gs), 2);
    gs.selectedCharIndex = 2;
    assert.equal(resolveSelectedActiveChar(gs).name, 'Cid');
    gs.selectedCharIndex = 1;
    assert.equal(resolveSelectedActiveChar(gs).name, 'Ann', 'inactive selected falls to first active');
}

{
    const gs = {
        roster: [bob({ name: 'Ann' }), bob({ name: 'Cid' })],
        selectedCharIndex: 1
    };
    const omit = resolveActor(gs, null, { allowActiveFallback: true, roleLabel: '该角色' });
    assert.equal(omit.ok, true);
    assert.equal(omit.actor.name, 'Cid', 'omit uses selected, not first isActive');
}

{
    const A = bob({ name: 'Ann', derived: { hp: 10, maxHp: 10 }, hp: 10 });
    const B = bob({ name: 'Cid', derived: { hp: 4, maxHp: 10 }, hp: 4 });
    assert.equal(resolveFirstWoundedChar([A, B], [A, B]), 'Cid');
    assert.equal(resolveFirstWoundedChar([A, B], [A, B], A), 'Ann', 'preferred wins even if full HP');
}

{
    const gs = {
        roster: [
            bob({ name: 'Ann', status: { ritual: { spellName: 'X', roundsNeeded: 3, roundsDone: 1 } } }),
            bob({ name: 'Cid', status: { ritual: { spellName: 'Y', roundsNeeded: 3, roundsDone: 1 } } })
        ],
        selectedCharIndex: 1,
        chatHistory: []
    };
    const mh = mythos({ gameState: gs, Engine, addJournalEntry: () => {} });
    assert.match(String(mh.continue_ritual({})), /须指定 caster_name/);
    assert.equal(gs.roster[0].status.ritual.roundsDone, 1);
    assert.equal(gs.roster[1].status.ritual.roundsDone, 1);
}

{
    const gs = {
        roster: [
            bob({ name: 'Ann' }),
            bob({ name: 'Cid', skills: { '冲锋枪': 70, '手枪': 40 }, equipment: { weapon: '汤普森冲锋枪' } })
        ],
        selectedCharIndex: 1,
        inventory: [{ name: '冲锋枪弹药', qty: 30, ammoType: '冲锋枪' }],
        chatHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: [],
        combat: { active: true, enemies: [{ name: '邪教徒', hp: 8, isDefeated: false }] },
        chase: { active: false }
    };
    const h = mkCombat(gs);
    const out = h.burst_fire({ target_name: '邪教徒', rounds: 3, mode: 'burst' });
    assert.ok(!/找不到该角色/.test(str(out)), str(out));
    assert.ok(out && out.forceCheck, 'burst opens panel: ' + str(out));
    assert.equal(gs.pendingRuleCheck.roller, 'Cid');
}

{
    const gs = {
        roster: [bob({ name: 'Ann' }), bob({ name: 'Cid' })],
        selectedCharIndex: 1,
        chatHistory: [],
        pendingRuleCheck: {
            kind: 'combat_react', roller: 'Ann', target: 'Ann', prompt: '请闪避'
        }
    };
    const h = mkCombat(gs);
    assert.match(String(h.dodge({ actor_name: 'Cid' })), /不是Cid/);
    assert.equal(gs.pendingRuleCheck.action, undefined);
    assert.match(String(h.dodge({ actor_name: 'Ann' })), /闪避|掷骰/);
}

{
    const gs = {
        roster: [bob()],
        chatHistory: [],
        pendingRuleCheck: {
            kind: 'social_opposed',
            skill: '说服',
            roller: 'Bob',
            target: 'Bob',
            npcName: '幽灵守卫',
            socialKind: 'persuade'
        },
        npcRegistry: []
    };
    const out = resolvePendingRuleCheck(gs, {
        charName: 'Bob', skill: '说服', success: true, level: '成功',
        rolledValue: 20, targetValue: 50, skillValue: 50, ruleKind: 'social_opposed'
    }, Engine);
    assert.match(String(out), /找不到 NPC/);
}

{
    const sy = system({
        gameState: {
            roster: [bob({ name: 'Ann', isActive: true }), bob({ name: 'Cid', isActive: true, status: { burning: { intensity: 'moderate' } } })],
            selectedCharIndex: 1,
            chatHistory: [],
            pendingRuleCheck: null,
            pendingRuleChecks: []
        },
        Engine,
        addJournalEntry: () => {},
        addClue: () => {},
        updateEnemy: () => {},
        dispatch: () => 'x'
    });
    const out = str(sy.extinguish_fire({}));
    assert.match(out, /Cid|急救|灭火/, out);
    assert.ok(!/Ann 并未着火/.test(out), out);
}

console.log('lossless_index_smoke: OK');
