/**
 * lighthouse_night_watch (R29.69): the log clue's evidence tier follows the Library Use roll that
 * reads the log, so all three evidence endings are reachable. Before, log_desk granted a fixed
 * "solid" clue on every route and ending_weak / ending_decisive could never happen.
 *
 *   失败 / 成功 → none / partial → ending_weak
 *   困难成功    → solid          → ending_win
 *   极难 / 大成功 → decisive      → ending_decisive
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

const SC = BUILTIN_BY_ID.lighthouse_night_watch;

// ---- static contract ----------------------------------------------------------------------------
assert.equal(SC.nodes.log_desk.effects.clues.find((c) => c.id === 'lnw_log').quality, undefined,
    'log clue must not carry a fixed tier');
assert.ok(SC.nodes.lamp_room.choices.find((c) => c.id === 'log').skillCheck, 'reading the log is a roll');
assert.ok(SC.nodes.false_done.choices.find((c) => c.id === 'back').skillCheck, 'the false-lead route also reads the log');
assert.ok(!SC.nodes.log_desk.choices.find((c) => c.id === 'finish').requiresClueQuality, 'finish is open at any tier');

// ---- runtime -------------------------------------------------------------------------------------
const gameState = {};
const reset = () => {
    for (const k of Object.keys(gameState)) delete gameState[k];
    Object.assign(gameState, {
        chatHistory: [], journalLog: [], inventory: [], npcRegistry: [], knownLocations: [], atmosphere: {},
        roster: [createInvestigatorRecord({
            name: 'Ann', isActive: true, attrs: { POW: 60, CON: 60, DEX: 60, STR: 60, SIZ: 60 },
            derived: { hp: 12, maxHp: 12, sanity: 60, mp: 12, mov: 8, db: '0' },
            skills: { '图书馆使用': 60, '聆听': 60, '斗殴': 60, '闪避': 40 }
        })],
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
    addClue: (id, title, content, type) => {
        const old = gameState.clueBoard.clues.find((c) => c.id === id);
        if (old) return old;
        const c = { id, title, content, type }; gameState.clueBoard.clues.push(c); return c;
    }
};
window.CoCStateAccessor = { getState: () => window.CoCState, getGameState: () => gameState };
window.CoCEngine = CoCEngine;
const { CoCScenarioRunner: R } = await imp('js/scenario/runner.mjs');
R.bindScenarioStore({ isAvailable: (id) => !!BUILTIN_BY_ID[id], getScenario: (id) => BUILTIN_BY_ID[id] || null, validate: (s) => CoCScenarioCatalog.validate(s) });

const openPanel = () => [...gameState.chatHistory].reverse().find((m) => m && m._scenarioCheck && !m.isResolved);
function roll(level) {
    const panel = openPanel();
    assert.ok(panel, 'expected an open dice panel');
    const skill = panel.tool_calls[0].skill_name;
    panel.isResolved = true;
    panel.tool_calls.forEach((t) => { t.isResolved = true; });
    const success = level !== '失败' && level !== '大失败';
    R.onSkillCheckResult(success, skill, { charName: 'Ann', skill, success, level, rolledValue: success ? 5 : 95, targetValue: 60 });
    return skill;
}
async function start() {
    reset();
    assert.ok(R.startScenario('lighthouse_night_watch'));
    await new Promise((r) => setTimeout(r, 0));
    // lamp_room opens with a scenario exchange (dice panel) — settle it first.
    if (openPanel()) roll('成功');
    gameState.pendingRuleCheck = null;
    gameState.pendingRuleChecks = [];
    return gameState.scenarioRunner;
}
const logTier = () => (gameState.clueBoard.clues.find((c) => c.id === 'lnw_log') || {}).quality;

const cases = [
    ['失败', 'none', 'ending_weak'],
    ['成功', 'partial', 'ending_weak'],
    ['困难成功', 'solid', 'ending_win'],
    ['极难成功', 'decisive', 'ending_decisive'],
    ['大成功', 'decisive', 'ending_decisive']
];
for (const [level, tier, ending] of cases) {
    const r = await start();
    assert.equal(r.currentNodeId, 'lamp_room');
    assert.ok(R.selectChoice('log'));
    assert.equal(roll(level), '图书馆使用', 'reading the log rolls Library Use');
    assert.equal(r.currentNodeId, 'log_desk', `${level}: both outcomes reach the log desk (no soft-lock)`);
    assert.equal(logTier(), tier, `${level}: log clue tier`);
    const finish = r.choices.find((c) => c.id === 'finish');
    assert.ok(finish && R.checkRequires(finish), `${level}: finish is open`);
    assert.ok(R.selectChoice('finish'));
    assert.equal(r.currentNodeId, ending, `${level}: ending`);
    assert.ok(r.ended);
    R.stopScenario({ silent: true });
}

// False-lead route: the reading roll still decides the tier, and debunking still leads to the finale.
{
    const r = await start();
    assert.ok(R.selectChoice('rumor'));
    roll('成功');                                  // hear the rumour out → false_path → false_done
    assert.equal(r.currentNodeId, 'false_done');
    assert.ok(R.selectChoice('back'));
    roll('困难成功');
    assert.equal(r.currentNodeId, 'log_desk');
    assert.equal(logTier(), 'solid', 'tier comes from the log reading, not the earlier listen roll');
    const debunk = r.choices.find((c) => c.id === 'debunk');
    assert.ok(debunk && R.checkRequires(debunk), 'debunk available after taking the false lead');
    assert.ok(R.selectChoice('debunk'));
    assert.ok(R.selectChoice(r.choices[0].id));     // debunk_note → ending_by_evidence
    assert.equal(r.currentNodeId, 'ending_win');
    R.stopScenario({ silent: true });
}

console.log('night_watch_evidence_smoke: OK', { endings: [...new Set(cases.map((c) => c[2]))] });
