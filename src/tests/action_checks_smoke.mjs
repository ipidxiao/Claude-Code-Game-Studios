/**
 * Every story action rolls dice, and a failed roll leads to its own passage (author, 2026-10-18:
 * "每次行动，不管是搜/打/撤（侦察/闪避/力量/图书馆之类），都需要通过选项和骰子才能进行下一步剧情";
 * choices: all actions roll, failure has its own story, the skill is matched to the action).
 *
 * Guards:
 * - every choice of every built-in is decided: it rolls, it already had a check, or it is movement;
 * - the skill named is one the engine can roll for an ordinary investigator;
 * - success lands on the success passage once — its text and clues were applied twice before
 *   (resolveSkillCheckBranch pushed them, then goToNode did again);
 * - failure lands on its own passage, finds nothing, and goes on with the same options; clues and
 *   flags a later choice requires are kept, so one failed roll never closes the story.
 */
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { BUILTIN_SCENARIOS, BUILTIN_BY_ID } = await imp('js/data/scenarios/builtins.mjs');
const { ACTION_CHECKS_BY_ID } = await imp('js/data/scenarios/action_checks/index.mjs');
const { failNodeId } = await imp('js/data/scenarios/action_checks.mjs');

// ---- runner harness (as in scenario_exit_guard_smoke) ----------------------------------------
globalThis.window = globalThis;
window.Vue = { reactive: (x) => x, nextTick: (fn) => { if (typeof fn === 'function') fn(); } };
window.CoCLog = { debug() {}, error() {}, warn() {}, info() {} };
const { CoCEngine } = await imp('js/coc.mjs');
const { createInvestigatorRecord } = await imp('js/state/char_record.mjs');
const { CoCScenarioCatalog } = await imp('js/data/scenarios/catalog.mjs');
const investigator = () => createInvestigatorRecord({ name: 'Ann', isActive: true,
    attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 60, APP: 50, INT: 60, POW: 55, EDU: 60, LUCK: 50 },
    derived: { hp: 12, maxHp: 12, sanity: 55, mp: 11, mov: 8, db: '0' }, skills: { '手枪': 45 } });
const gameState = {};
const reset = () => {
    for (const k of Object.keys(gameState)) delete gameState[k];
    Object.assign(gameState, {
        chatHistory: [], journalLog: [], inventory: [], npcRegistry: [], knownLocations: [], atmosphere: {},
        roster: [investigator()],
        selectedCharIndex: 0, clueBoard: { clues: [], links: [] }, sceneMap: { rooms: [] },
        combat: { active: false, enemies: [], initiativeOrder: [] }, chase: { active: false, participants: [] },
        groupCheckSession: null, scenarioRunner: null, pendingRuleCheck: null, pendingRuleChecks: [], pendingAftermath: [],
        skillAttempts: {}, sanCaps: {}, flags: {}, worldClock: { day: 1, hour: 8 },
        arcLedger: { version: 2, chapters: { unlocked: Object.keys(BUILTIN_BY_ID), completed: [] } }
    });
};
reset();
window.CoCState = {
    gameState, scrollToBottom() {}, addJournalEntry() {}, addNpc() {}, createMap() {}, setPosition: () => true,
    addClue: (id, title, content, type) => { const c = { id, title, content, type }; gameState.clueBoard.clues.push(c); return c; }
};
window.CoCStateAccessor = { getState: () => window.CoCState, getGameState: () => gameState };
window.CoCEngine = CoCEngine;
const { CoCScenarioRunner: R } = await imp('js/scenario/runner.mjs');
R.bindScenarioStore({ isAvailable: (id) => !!BUILTIN_BY_ID[id], getScenario: (id) => BUILTIN_BY_ID[id] || null, validate: (s) => CoCScenarioCatalog.validate(s) });

// 1. Every choice is decided, and every table entry names a real choice.
let rolls = 0;
for (const s of BUILTIN_SCENARIOS) {
    const table = ACTION_CHECKS_BY_ID[s.id];
    assert.ok(table, `${s.id}: has an action-check table`);
    for (const [nodeId, entries] of Object.entries(table)) {
        const node = s.nodes[nodeId];
        assert.ok(node, `${s.id}: table names node ${nodeId}`);
        for (const key of Object.keys(entries)) {
            assert.ok((node.choices || []).some((c) => (c.id || c.label) === key), `${s.id}/${nodeId}: table names choice ${key}`);
        }
    }
    for (const [nodeId, node] of Object.entries(s.nodes)) {
        if (/__fail$/.test(nodeId)) continue;
        for (const c of node.choices || []) {
            const target = s.nodes[c.next];
            if (!target || target.end || target.branch) continue;   // endings and branch checks resolve themselves
            const e = table[nodeId] && table[nodeId][c.id || c.label];
            assert.ok(c.skillCheck || (e && e.roll === false),
                `${s.id}/${nodeId}: "${c.label}" neither rolls nor is marked as movement`);
            if (c.failNext) {
                rolls++;
                assert.equal(c.failNext, failNodeId(nodeId, c.id || c.label));
                const fail = s.nodes[c.failNext];
                assert.ok(fail && fail.narrative, `${s.id}: ${c.failNext} has a passage`);
                assert.equal(fail.choices, target.choices, `${s.id}: ${c.failNext} goes on with ${c.next}'s options`);
                const gated = new Set(Object.values(s.nodes).flatMap((n) => (n.choices || []).map((x) => x.requiresClueId).filter(Boolean)));
                const gatedFlags = new Set(Object.values(s.nodes).flatMap((n) => (n.choices || []).map((x) => x.requiresFlag).filter(Boolean)));
                for (const flag of Object.keys((target.effects && target.effects.flags) || {})) {
                    const kept = !!(fail.effects && fail.effects.flags && flag in fail.effects.flags);
                    assert.equal(kept, gatedFlags.has(flag), `${s.id}: ${c.failNext} keeps flag ${flag} only if a choice requires it`);
                }
                for (const clue of (target.effects && target.effects.clues) || []) {
                    const kept = ((fail.effects && fail.effects.clues) || []).some((k) => k.id === clue.id);
                    assert.equal(kept, gated.has(clue.id), `${s.id}: ${c.failNext} keeps ${clue.id} only if a choice requires it`);
                }
            }
        }
    }
}
assert.ok(rolls >= 400, 'fixture: the built-ins roll for their actions: ' + rolls);

// 2. The engine can roll every skill named, for an ordinary investigator.
const skills = new Set();
for (const s of BUILTIN_SCENARIOS) for (const n of Object.values(s.nodes)) for (const c of n.choices || []) if (c.failNext) skills.add(c.skillCheck.skill);
for (const skill of skills) assert.ok(CoCEngine.getSkillValue(investigator(), skill) > 0, `the engine knows ${skill}`);

// 3. In play: the tutorial's first action, 环顾门厅.
const play = async (success) => {
    reset();
    assert.ok(R.startScenario('tutorial'));
    await new Promise((r) => setTimeout(r, 0));
    const before = gameState.chatHistory.length;
    assert.ok(R.selectChoice('hall_look'));
    assert.ok(gameState.scenarioRunner.pendingBranch, 'choosing the action asks for a roll first');
    assert.equal(gameState.scenarioRunner.currentNodeId, 'intro', 'and the story waits for it');
    R.onSkillCheckResult(success, '侦查', { level: success ? '成功' : '失败' });
    return gameState.chatHistory.slice(before).filter((m) => m.role === 'assistant' && m._scenario).map((m) => m.content);
};
const tut = BUILTIN_BY_ID.tutorial;
let told = await play(true);
assert.equal(gameState.scenarioRunner.currentNodeId, 'hall_look');
assert.equal(told.filter((t) => t === tut.nodes.hall_look.narrative).length, 1, 'success: the passage is written once');
assert.deepEqual(gameState.clueBoard.clues.map((c) => c.id), ['tut_wax'], 'success: its clue is found once');

told = await play(false);
assert.equal(gameState.scenarioRunner.currentNodeId, 'intro__hall_look__fail');
assert.ok(told.includes(tut.nodes.intro__hall_look__fail.narrative), 'failure: its own passage is written');
assert.ok(!told.includes(tut.nodes.hall_look.narrative), 'failure: not the success passage');
assert.deepEqual(gameState.clueBoard.clues, [], 'failure: nothing is found');
assert.deepEqual(gameState.scenarioRunner.choices.map((c) => c.id), tut.nodes.hall_look.choices.map((c) => c.id),
    'failure: the story goes on with the same options');

console.log('action_checks_smoke: OK', { rolls, skills: skills.size });
