/**
 * The ending is what the player reads last, and it says which ending it is (phone test 2026-10-18:
 * "存档坏死，不知道结局。结局余波时间线写得让人看不懂").
 *
 * The defects this guards:
 * - the attic's SAN check was still pending when its skill check led to the finale; the ending card
 *   and "本段剧情已结束" were written first, then the SAN loss below them, so the ending scrolled away;
 * - the ending panel and save-slot blurb were the developer replay: "终局节点：finale",
 *   "证据档：decisive", "遭遇裁决：超额 · 要求solid · 变体B", "下一剧本可在桌规卡选择…".
 */
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { BUILTIN_SCENARIOS, BUILTIN_BY_ID } = await imp('js/data/scenarios/builtins.mjs');

// ---- runner harness (as in scenario_exit_guard_smoke) ----------------------------------------
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


const ID_OR_CODE = /[a-z]+_[a-z0-9_]+|\b(?:finale|weak|partial|solid|decisive)\b|终局节点|证据档|遭遇裁决|桌规卡|变体[AB]/;

// 1. The ending names itself in words, in the chat, the panel and the save blurb.
reset();
assert.ok(R.startScenario('tutorial'));
await new Promise((r) => setTimeout(r, 0));
R.goToNode('finale');
const endMsg = gameState.chatHistory.find((m) => m && m.isEnding);
assert.ok(endMsg && endMsg.content.includes('结局：封印井口'), 'the chat says which ending: ' + (endMsg && endMsg.content));
const recap = gameState.ui.endingRecap;
assert.equal(recap.title, '封印井口');
for (const line of recap.playerLines) assert.ok(!ID_OR_CODE.test(line.text), 'no ids or codes in what the player reads: ' + line.text);
assert.ok(!ID_OR_CODE.test(gameState.endingSaveBlurb), 'nor in the save slot: ' + gameState.endingSaveBlurb);
assert.ok(R.getModeLabel().includes('结局：封印井口'), 'the scenario badge names the ending: ' + R.getModeLabel());
assert.ok(recap.copyText.includes('终局节点：finale'), 'the full developer record is still there to copy');

// 2. An ending reached while a check is pending waits for it.
reset();
assert.ok(R.startScenario('tutorial'));
await new Promise((r) => setTimeout(r, 0));
gameState.pendingRuleCheck = { kind: 'san', roller: 'Ann', skill: 'SAN', sanLoss: '0/1' };
const before = gameState.chatHistory.length;
R.goToNode('finale');
const after = gameState.chatHistory.slice(before);
assert.ok(after.some((m) => m.role === 'assistant' && /盐罐/.test(m.content)), 'fixture: the finale narration was written');
assert.ok(!after.some((m) => m.isEnding), 'no ending card while the SAN check is still to roll');
assert.equal(gameState.ui.endingRecap.title, '封印井口', 'the outcome is recorded at once (panel, save blurb), so a reload keeps it');
assert.equal(gameState.scenarioRunner.ended, true, 'no more choices are offered');
gameState.pendingRuleCheck = null;           // the SAN check resolved (its result lines are written)
gameState.chatHistory.push({ role: 'system', content: '【Ann】进行【SAN】检定：骰出 95/50，失败。' });
assert.equal(R.settlePendingEnding(), true);
const last = gameState.chatHistory.slice(-2);
assert.ok(last[0].isEnding && last[0].content.includes('结局：封印井口'), 'the ending card comes after the SAN result');
assert.ok(/本段剧情已结束/.test(last[1].content));
assert.equal(R.settlePendingEnding(), false, 'and only once');

console.log('scenario_ending_order_smoke: OK');
