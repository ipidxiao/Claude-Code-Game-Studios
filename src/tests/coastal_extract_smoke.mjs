/**
 * Coastal festival: next-district buttons stay hidden until a clue names that place.
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const coastalUrl = pathToFileURL(path.join(ROOT, 'js/data/scenarios/coastal_festival.mjs')).href;
const auditUrl = pathToFileURL(path.join(ROOT, 'js/scenario/scenario_audit.mjs')).href;
const { CoCScenarioCoastalFestival: coastal } = await import(coastalUrl);
const { auditScenario } = await import(auditUrl);

const audit = auditScenario(coastal);
assert.equal(audit.ok, true, (audit.errors || []).join('\n'));

const nodes = coastal.nodes;
const byNext = (node, next) => (node.choices || []).find((c) => c.next === next);

assert.equal(byNext(nodes.pier, 'square').requiresClueId, 'cf_square');
assert.equal(byNext(nodes.pier, 'tavern').requiresClueId, 'cf_tavern');
assert.equal(byNext(nodes.pier, 'pier_fight').requiresClueId, undefined);
assert.equal(byNext(nodes.pier, 'ending_withdraw').requiresClueId, undefined);
assert.ok(nodes.pier_fog.effects.clues.some((c) => c.id === 'cf_square' && c.content.includes('庆典广场')));
assert.ok(nodes.pier_night_watch.effects.clues.some((c) => c.id === 'cf_tavern' && c.content.includes('盐雾酒馆')));
assert.ok(nodes.tavern_rum.effects.clues.some((c) => c.id === 'cf_journal' && c.content.includes('神龛')));
assert.ok(nodes.tavern.effects.clues.some((c) => c.id === 'cf_tip' && c.content.includes('潮间洞窟')));
assert.equal(byNext(nodes.tavern, 'shrine').requiresClueId, 'cf_journal');
assert.equal(byNext(nodes.tavern, 'cave_approach').requiresClueId, 'cf_tip');
assert.equal(byNext(nodes.shrine, 'cave_approach').requiresClueId, 'cf_tip');
assert.equal(nodes.follow_check.branch.success, 'square');
assert.ok(!nodes.pier.effects.clues.some((c) => c.id === 'cf_square' || c.id === 'cf_tavern'));

globalThis.window = globalThis;
window.Vue = { reactive: (x) => x, nextTick: (fn) => { if (typeof fn === 'function') fn(); } };
const chatHistory = [];
const gameState = {
    chatHistory,
    roster: [{ name: 'Tester', isActive: true, derived: { san: 50, maxSan: 50, hp: 10, maxHp: 10 }, skills: { 斗殴: 50 } }],
    inventory: [],
    clueBoard: { clues: [] },
    knownLocations: [],
    currentLocation: '码头',
    atmosphere: {},
    journalLog: [],
    sceneMap: null,
    groupCheckSession: null,
    scenarioRunner: null,
    selectedCharIndex: 0,
    flags: {}
};
window.CoCState = {
    gameState,
    scrollToBottom: () => {},
    addJournalEntry: () => {},
    addClue: (id, title, content, type) => {
        gameState.clueBoard.clues.push({ id, title, content, type });
    },
    createMap: () => {},
    setPosition: () => {},
    addNpc: () => {}
};
window.CoCStateAccessor = {
    getState: () => window.CoCState,
    getGameState: () => gameState
};
window.CoCEngine = {};
window.CoCLog = { debug: () => {}, error: () => {}, warn: () => {} };

const runnerUrl = pathToFileURL(path.join(ROOT, 'js/scenario/runner.mjs')).href;
const { CoCScenarioRunner } = await import(runnerUrl);
CoCScenarioRunner.bindScenarioStore({
    isAvailable: (id) => id === 'coastal_festival',
    getScenario: (id) => (id === 'coastal_festival' ? coastal : null),
    validate: () => audit
});

assert.equal(CoCScenarioRunner.startScenario('coastal_festival'), true);
await new Promise((r) => setTimeout(r, 400));

const nexts = () => (gameState.scenarioRunner.choices || []).map((c) => c.next);
assert.ok(!nexts().includes('square'), 'square stays hidden');
assert.ok(!nexts().includes('tavern'), 'tavern stays hidden');
assert.ok(!nexts().includes('shrine'));
assert.ok(!nexts().includes('cave_approach'));
assert.ok(nexts().includes('pier_fight'));
assert.ok(nexts().includes('pier_fog'));
assert.ok(nexts().includes('ending_withdraw'));

gameState.clueBoard.clues.push({ id: 'cf_square', title: '广场鼓点', content: '远处鼓点来自庆典广场，与浪涌合拍。' });
CoCScenarioRunner.goToNode('pier');
assert.ok(nexts().includes('square'));
assert.ok(!nexts().includes('tavern'));

gameState.clueBoard.clues.push({ id: 'cf_tavern', title: '隔雾灯火', content: '夜岗雾灯对面是盐雾酒馆，灯还亮着。' });
CoCScenarioRunner.goToNode('pier');
assert.ok(nexts().includes('tavern'));

CoCScenarioRunner.goToNode('tavern');
assert.ok(nexts().includes('cave_approach'));
assert.ok(!nexts().includes('shrine'));

gameState.clueBoard.clues.push({ id: 'cf_journal', title: '记者笔记', content: '镇长夜访神龛' });
CoCScenarioRunner.goToNode('tavern');
assert.ok(nexts().includes('shrine'));

console.log('coastal_extract_smoke: OK');
