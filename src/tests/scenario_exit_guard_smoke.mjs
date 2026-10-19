/**
 * Soft-lock guard (R29.68 runner walk): a node whose every exit is gated (requiresClueQuality /
 * requiresFlag / requiresClueId) traps a player who lacks the evidence — abandoned_asylum/diary
 * (only exit needs solid evidence) and missing_child/well (flag or solid) did exactly that.
 *
 * Rule: if all exits are gated, the node's own effects must satisfy at least one gate (e.g.
 * lighthouse_night_watch/log_desk grants a solid clue on arrival). Otherwise add an ungated exit.
 */
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { BUILTIN_SCENARIOS, BUILTIN_BY_ID } = await imp('js/data/scenarios/builtins.mjs');
const { clueQualityRank } = await imp('js/data/investigate_outcomes.mjs');

// ---- 1) static rule over every built-in ---------------------------------------------------------
const gated = (c) => !!(c && (c.requiresClueQuality || c.requiresFlag || c.requiresClueId));
const selfSatisfies = (node, c) => {
    const eff = node.effects || {};
    const clues = Array.isArray(eff.clues) ? eff.clues : [];
    if (c.requiresClueId && clues.some((x) => x && x.id === c.requiresClueId)) return true;
    if (c.requiresFlag && eff.flags && eff.flags[c.requiresFlag]) return true;
    if (c.requiresClueQuality && c.requiresClueQuality !== 'seed') {
        const need = clueQualityRank(c.requiresClueQuality);
        if (need != null && clues.some((x) => x && (clueQualityRank(x.quality) ?? -1) >= need)) return true;
    }
    return false;
};
const traps = [];
for (const sc of BUILTIN_SCENARIOS) {
    for (const [id, node] of Object.entries(sc.nodes)) {
        const choices = node.choices || [];
        if (!choices.length || node.end || !choices.every(gated)) continue;
        if (choices.some((c) => selfSatisfies(node, c))) continue;
        traps.push(`${sc.id}/${id}: every exit gated (${choices.map((c) => c.id).join(', ')}) and nothing here satisfies a gate`);
    }
}
assert.deepEqual(traps, [], 'soft-lock nodes:\n' + traps.join('\n'));

// ---- 2) runtime: the two former traps now let a player without evidence walk back -------------
globalThis.window = globalThis;
window.Vue = { reactive: (x) => x, nextTick: (fn) => { if (typeof fn === 'function') fn(); } };
window.CoCLog = { debug() {}, error() {}, warn() {}, info() {} };
const { CoCEngine } = await imp('js/coc.mjs');
const { createInvestigatorRecord } = await imp('js/state/char_record.mjs');
const { CoCScenarioCatalog } = await imp('js/data/scenarios/catalog.mjs');
const gameState = {};
const reset = () => {
    for (const k of Object.keys(gameState)) delete gameState[k];
    Object.assign(gameState, {
        chatHistory: [], journalLog: [], inventory: [], npcRegistry: [], knownLocations: [], atmosphere: {},
        roster: [createInvestigatorRecord({ name: 'Ann', isActive: true, attrs: { POW: 60, CON: 60, DEX: 60 },
            derived: { hp: 12, maxHp: 12, sanity: 60, mp: 12, mov: 8, db: '0' }, skills: { '侦查': 60 } })],
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

// The retreat may roll (every action rolls, author 2026-10-18 — these retreats also search on the
// way back); either way it leaves: success lands on the node, failure on its own passage that goes
// on with that node's options.
for (const [sid, nodeId, backId, backTo] of [
    ['abandoned_asylum', 'diary', 'back_office', 'office'],
    ['missing_child', 'well', 'back_path', 'well_approach']
]) {
    for (const success of [true, false]) {
        reset();
        assert.ok(R.startScenario(sid), sid);
        await new Promise((r) => setTimeout(r, 0));
        R.goToNode(nodeId);
        // Player holds only weak evidence and no flags.
        gameState.clueBoard.clues.forEach((c) => { c.quality = 'partial'; });
        const r = gameState.scenarioRunner;
        const accepted = r.choices.filter((c) => R.checkRequires(c));
        assert.deepEqual(accepted.map((c) => c.id), [backId], `${sid}/${nodeId}: only the retreat is open without evidence`);
        assert.ok(R.selectChoice(backId));
        if (r.pendingBranch) R.onSkillCheckResult(success, '侦查', { level: success ? '成功' : '失败' });
        const landed = BUILTIN_BY_ID[sid].nodes[r.currentNodeId];
        assert.deepEqual(landed.choices.map((c) => c.id), BUILTIN_BY_ID[sid].nodes[backTo].choices.map((c) => c.id),
            `${sid}: retreat (${success ? 'success' : 'failure'}) leads back to ${backTo}: at ${r.currentNodeId}`);
        R.stopScenario({ silent: true });
    }
}

console.log('scenario_exit_guard_smoke: OK');
