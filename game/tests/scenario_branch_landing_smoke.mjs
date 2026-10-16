/**
 * Landing on a skill-check node without a pending check (R29.68 runner walk):
 * - 28 plain side-room choices (tutorial / coastal / university / lighthouse) jump straight into a
 *   check node; train_to_nowhere chains a branch into another check node (finale).
 * - goToNode cleared the choices and emitted no dice panel → no choices, no check: soft-lock.
 * Now the runner emits the node's own check on landing; resolving it must not replay the node's
 * narrative or effects (attic carries a SAN check) that goToNode already applied.
 */
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

globalThis.window = globalThis;
window.Vue = { reactive: (x) => x, nextTick: (fn) => { if (typeof fn === 'function') fn(); } };
window.CoCLog = { debug() {}, error() {}, warn() {}, info() {} };

const { CoCEngine } = await imp('js/coc.mjs');
const { createInvestigatorRecord } = await imp('js/state/char_record.mjs');
const { BUILTIN_BY_ID } = await imp('js/data/scenarios/builtins.mjs');
const { CoCScenarioCatalog } = await imp('js/data/scenarios/catalog.mjs');

const gameState = {};
function reset() {
    for (const k of Object.keys(gameState)) delete gameState[k];
    Object.assign(gameState, {
        chatHistory: [], journalLog: [], inventory: [], npcRegistry: [], knownLocations: [], atmosphere: {},
        roster: [createInvestigatorRecord({
            name: 'Ann', isActive: true,
            attrs: { STR: 60, CON: 70, SIZ: 60, DEX: 65, APP: 50, INT: 75, POW: 70, EDU: 75, LUCK: 60 },
            derived: { hp: 13, maxHp: 13, sanity: 70, mp: 14, mov: 8, db: '0' },
            skills: { '侦查': 70, '力量': 60, '敏捷': 65 }
        })],
        selectedCharIndex: 0, clueBoard: { clues: [], links: [] }, sceneMap: { title: '', rooms: [], currentRoomId: null },
        combat: { active: false, enemies: [], initiativeOrder: [] }, chase: { active: false, participants: [] },
        groupCheckSession: null, scenarioRunner: null, pendingRuleCheck: null, pendingRuleChecks: [], pendingAftermath: [],
        skillAttempts: {}, sanCaps: {}, flags: {}, worldClock: { day: 1, hour: 8 },
        arcLedger: { version: 2, chapters: { unlocked: Object.keys(BUILTIN_BY_ID), completed: [] } }
    });
}
reset();
window.CoCState = {
    gameState, scrollToBottom() {},
    addJournalEntry: (e) => gameState.journalLog.push(e),
    addClue: (id, title, content, type) => { const c = { id, title, content, type }; gameState.clueBoard.clues.push(c); return c; },
    createMap: (title, rooms) => { gameState.sceneMap = { title, rooms: rooms || [], currentRoomId: null }; },
    setPosition: (id) => { gameState.sceneMap.currentRoomId = id; return true; }, addNpc() {}
};
window.CoCStateAccessor = { getState: () => window.CoCState, getGameState: () => gameState };
window.CoCEngine = CoCEngine;

const { CoCScenarioRunner: R } = await imp('js/scenario/runner.mjs');
R.bindScenarioStore({
    isAvailable: (id) => !!BUILTIN_BY_ID[id],
    getScenario: (id) => BUILTIN_BY_ID[id] || null,
    validate: (sc) => CoCScenarioCatalog.validate(sc)
});

const openPanels = () => gameState.chatHistory.filter((m) => m && m._scenarioCheck && !m.isResolved);
const resolvePanel = (success) => {
    const panel = openPanels().at(-1);
    const skill = panel.tool_calls[0].skill_name;
    panel.isResolved = true;
    panel.tool_calls.forEach((t) => { t.isResolved = true; });
    R.onSkillCheckResult(success, skill, { charName: 'Ann', skill, success, level: success ? '成功' : '失败', rolledValue: success ? 10 : 90, targetValue: 60 });
    return skill;
};

// ---- tutorial: plain side-room choice into the attic check -------------------------------------
{
    reset();
    assert.ok(R.startScenario('tutorial'));
    await new Promise((r) => setTimeout(r, 0));
    R.goToNode('attic_whisper');
    const r = gameState.scenarioRunner;
    const viaAttic = (r.choices || []).find((c) => c.next === 'attic' && !c.skillCheck);
    assert.ok(viaAttic, 'precondition: attic_whisper offers a plain choice into the attic check node');
    assert.ok(R.selectChoice(viaAttic.id));
    assert.equal(r.currentNodeId, 'attic');
    assert.equal(openPanels().length, 1, 'landing on a check node must open its dice panel (was a soft-lock)');
    assert.equal(openPanels()[0].tool_calls[0].skill_name, '力量', 'uses the skill of the node\'s canonical entry');
    assert.ok(r.pendingBranch && r.pendingBranch.nextNode === 'attic');

    const sanBefore = [gameState.pendingRuleCheck, ...(gameState.pendingRuleChecks || [])].filter((s) => s && s.kind === 'san').length;
    const atticHead = String(BUILTIN_BY_ID.tutorial.nodes.attic.narrative).trim().slice(0, 30);
    const countAttic = () => gameState.chatHistory.filter((m) => m && m.role === 'assistant' && String(m.content).includes(atticHead)).length;
    assert.equal(countAttic(), 1, 'attic narrative shown once on landing');

    resolvePanel(true);
    assert.equal(r.currentNodeId, 'finale', 'success follows the attic branch');
    assert.equal(countAttic(), 1, 'attic narrative must not be replayed when the landing check resolves');
    const sanAfter = [gameState.pendingRuleCheck, ...(gameState.pendingRuleChecks || [])].filter((s) => s && s.kind === 'san').length;
    assert.equal(sanAfter, sanBefore, 'attic SAN check must not be queued a second time');
    R.stopScenario({ silent: true });
}

// ---- every plain entry into a check node now opens a panel -------------------------------------
{
    let checked = 0;
    for (const [sid, sc] of Object.entries(BUILTIN_BY_ID)) {
        for (const [fromId, from] of Object.entries(sc.nodes)) {
            for (const c of from.choices || []) {
                const dest = sc.nodes[c.next];
                if (c.skillCheck || !dest || !dest.branch || (dest.choices && dest.choices.length)) continue;
                reset();
                assert.ok(R.startScenario(sid), sid);
                await new Promise((res) => setTimeout(res, 0));
                R.goToNode(fromId);
                const offered = (gameState.scenarioRunner.choices || []).find((x) => x.id === (c.id || c.label));
                if (!offered) { R.stopScenario({ silent: true }); continue; } // gated in this fresh state
                assert.ok(R.selectChoice(offered.id), `${sid}/${fromId}/${c.id}`);
                assert.equal(openPanels().length, 1, `${sid}: ${fromId} → ${c.next} must open a dice panel`);
                checked++;
                R.stopScenario({ silent: true });
            }
        }
    }
    assert.ok(checked >= 20, 'expected to exercise the plain entries, got ' + checked);
}

// ---- train: a check branch that lands on another check node ------------------------------------
{
    reset();
    assert.ok(R.startScenario('train_to_nowhere'));
    await new Promise((r) => setTimeout(r, 0));
    const sc = BUILTIN_BY_ID.train_to_nowhere;
    const entry = Object.entries(sc.nodes).find(([, n]) => (n.choices || []).some((c) => c.next === 'trade_check' && c.skillCheck));
    assert.ok(entry, 'precondition: a choice rolls into trade_check');
    R.goToNode(entry[0]);
    const choice = gameState.scenarioRunner.choices.find((c) => c.next === 'trade_check');
    assert.ok(R.selectChoice(choice.id));
    resolvePanel(sc.nodes.trade_check.branch.success === 'finale');
    assert.equal(gameState.scenarioRunner.currentNodeId, 'finale');
    assert.equal(openPanels().length, 1, 'chained check node (finale) must open its own dice panel');
    assert.equal(openPanels()[0].tool_calls[0].skill_name, '敏捷');
    resolvePanel(true);
    assert.ok(gameState.scenarioRunner.ended, 'finale resolves to an ending');
    R.stopScenario({ silent: true });
}

console.log('scenario_branch_landing_smoke: OK');
