/**
 * Smoke: local scenario goToNode must push assistant narrative (P6 regression).
 * Root cause was bare `scenario?.proseScenarioId` ReferenceError inside goToNode.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// --- Static guard ---
const runnerSrc = fs.readFileSync(path.join(ROOT, 'js/scenario/runner.mjs'), 'utf8');
const goToBlock = runnerSrc.match(/const goToNode = \(nodeId[\s\S]*?^\s*\};/m);
assert.ok(goToBlock, 'goToNode block found');
assert.ok(
    /getScenario\(\)/.test(goToBlock[0]) && !/\bscenario\?\.proseScenarioId/.test(goToBlock[0]),
    'goToNode must use getScenario(), not bare scenario'
);

// --- Runtime smoke with minimal mocks ---
globalThis.window = globalThis;
window.Vue = { reactive: (x) => x, nextTick: (fn) => { if (typeof fn === 'function') fn(); } };

const chatHistory = [];
const gameState = {
    chatHistory,
    roster: [{ name: 'Tester', isActive: true, derived: { san: 50, maxSan: 50, hp: 10, maxHp: 10 } }],
    inventory: [],
    clueBoard: { clues: [] },
    knownLocations: [],
    currentLocation: '门厅',
    atmosphere: {},
    journalLog: [],
    sceneMap: null,
    groupCheckSession: null,
    scenarioRunner: null,
    selectedCharIndex: 0,
};

window.CoCState = {
    gameState,
    scrollToBottom: () => {},
    addJournalEntry: () => {},
    addClue: () => {},
    createMap: () => {},
    setPosition: () => {},
    addNpc: () => {},
};
// runner.mjs IIFE needs CoCStateAccessor.getState() at import time
window.CoCStateAccessor = {
    getState: () => window.CoCState,
    getGameState: () => gameState,
};
window.CoCEngine = {};
window.CoCLog = { debug: () => {}, error: () => {}, warn: () => {} };

// The built-in ESM scenario is the only tutorial (the old packages/tutorial.json was removed in R29.67).
const { BUILTIN_BY_ID } = await import(pathToFileURL(path.join(ROOT, 'js/data/scenarios/builtins.mjs')).href);
const tutorial = BUILTIN_BY_ID.tutorial;

const tutorialStore = {
    isAvailable: (id) => id === 'tutorial',
    getScenario: (id) => (id === 'tutorial' ? tutorial : null),
    validate: () => ({ ok: true, errors: [] }),
};

// Stub prose bridge before runner import (runner imports it)
const proseBridgeUrl = pathToFileURL(path.join(ROOT, 'js/scenario/prose_bridge.mjs')).href;
const runnerUrl = pathToFileURL(path.join(ROOT, 'js/scenario/runner.mjs')).href + `?t=${Date.now()}`;

const { CoCScenarioRunner } = await import(runnerUrl);
assert.equal(window.CoCGroupCheck, undefined);
assert.ok(CoCScenarioRunner?.startScenario, 'runner exported');
CoCScenarioRunner.bindScenarioStore(tutorialStore);

const ok = CoCScenarioRunner.startScenario('tutorial');
assert.ok(ok, 'startScenario returns true');

// Prose load may defer goToNode — wait briefly
await new Promise((r) => setTimeout(r, 50));
// If prose bank exists, allow more time for dynamic imports
await new Promise((r) => setTimeout(r, 800));

const assistants = chatHistory.filter((m) => m.role === 'assistant' && m.content);
assert.ok(
    assistants.length >= 1,
    `expected ≥1 assistant narrative, got ${assistants.length}; roles=${chatHistory.map((m) => m.role).join(',')}`
);
assert.ok(
    String(assistants[0].content).length > 40,
    'assistant narrative should be non-trivial'
);
assert.ok(
    gameState.scenarioRunner?.choices?.length > 0 || gameState.scenarioRunner?.active,
    'scenario should be active with choices or active flag'
);

// R29.67: ESM nodes inline the full prose, so enrichment must not prepend the bank text again.
{
    const opening = String(tutorial.nodes[tutorial.startNode].narrative).trim();
    const shown = String(assistants[0].content);
    const head = opening.slice(0, 30);
    assert.equal(shown.split(head).length - 1, 1, 'opening prose must appear exactly once in the player-facing message');
    assert.ok(shown.length < opening.length * 1.5, `opening doubled: shown ${shown.length} vs prose ${opening.length}`);
}

assert.equal(CoCScenarioRunner.startScenario('tutorial'), true, 'second start succeeds');
CoCScenarioRunner.stopScenario({ silent: true });
const messagesAfterStop = chatHistory.length;
await new Promise((r) => setTimeout(r, 50));
assert.equal(
    chatHistory.length,
    messagesAfterStop,
    'stale prose callback must not enter a node after stopScenario'
);
assert.equal(gameState.scenarioRunner.active, false);

console.log('scenario_narrative_push_smoke: OK', {
    assistantLen: assistants[0].content.length,
    choices: gameState.scenarioRunner?.choices?.length || 0,
});
