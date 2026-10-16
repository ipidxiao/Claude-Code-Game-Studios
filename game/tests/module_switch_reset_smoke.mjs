/**
 * Switching modules must clear per-module runtime state (same class as R7-R10 / R15 / R17):
 * - kpEngine.scenePaths + keyClueBlockedAttempts drive the key-clue gate (needs 3 true paths);
 *   leaking them makes the gate "already satisfied" in a brand-new module.
 * - lastSkillCheck is what spend_luck binds to when no amount is given; a same-named
 *   investigator carried into the next module must not bind luck to the previous module's roll.
 */
import { strict as assert } from 'node:assert';

class MemoryStorage {
    constructor() { this.data = new Map(); }
    get length() { return this.data.size; }
    key(i) { return [...this.data.keys()][i] ?? null; }
    getItem(k) { return this.data.has(String(k)) ? this.data.get(String(k)) : null; }
    removeItem(k) { this.data.delete(String(k)); }
    setItem(k, v) { this.data.set(String(k), String(v)); }
}

function makeGameState() {
    return {
        activeModuleId: 'mod_a',
        currentScreen: 'story',
        currentLocation: '旧地点',
        roster: [{ name: 'Alice', isActive: true }],
        inventory: [], storage: [],
        knownLocations: ['旧地点'],
        chatHistory: [],
        journalLog: [], npcRegistry: [], diceHistory: [],
        combat: { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' },
        chase: { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null, speedResolved: true },
        sceneMap: { title: '', rooms: [], currentRoomId: null },
        clueBoard: { clues: [], links: [] },
        atmosphere: { level: 'calm', note: '' },
        scenarioRunner: { active: false, scenarioId: null, scenarioTitle: '', currentNodeId: null, choices: [], ended: false, flags: {}, pendingBranch: null, pendingScenarioId: null },
        pendingRuleCheck: null, pendingRuleChecks: [], pendingAftermath: [],
        groupCheckSession: null, activeCampaign: null, campaignArchive: null,
        arcLedger: null, kpState: null,
        kpEngine: {
            enabled: true,
            systemName: 'KP_PROTOCOL',
            global: { attention: 0, playerPower: 0, phase: 'CALM', doomClock: 0, alertLevel: 0, knowledgeLevel: 0 },
            rules: null,
            sessionStartedAt: null,
            lastEventInjectionAt: null,
            combatStrategyLog: [],
            // Module A progress that must NOT survive into module B:
            scenePaths: { currentSceneId: 'vault', paths: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], truePathCount: 3, falsePathCount: 1 },
            keyClueBlockedAttempts: 2
        },
        // Last roll of module A (spend_luck binds to it by character name):
        lastSkillCheck: { charName: 'Alice', skill: '侦查', level: '失败', rolledValue: 80, skillValue: 40, targetValue: 40 },
        selectedCharIndex: 0, moduleSeed: 7, encounterVariant: null, keeperStyle: 'cinematic',
        mythosHeat: 2, heatEventsLog: [], skillAttempts: {}, sanCaps: {},
        worldClock: { day: 3, hour: 5 }, flags: {}, endingSaveBlurb: '',
        storageStatus: {}, ui: { saveLoading: false, saveLoadingMessage: '' }
    };
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = globalThis;

const { CoCStatePersistence } = await import('../js/state/persistence.mjs');
const { KpExecutionEngine } = await import('../js/campaign/kp_execution_engine.mjs');

const gameState = makeGameState();
const api = CoCStatePersistence.create(
    { gameState, switchScreen: (s) => { gameState.currentScreen = s; } },
    {
        showToast() {},
        _safeLocalStorageSetItem: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (_e) { return false; } },
        _pushSystemNotice() {},
        compactChatHistory() {},
        _formatStorageError: (_e, fallback) => fallback
    }
);

// Sanity: before the switch, module A's progress really opens the gate.
assert.equal(gameState.kpEngine.scenePaths.truePathCount, 3);
assert.equal(KpExecutionEngine.evaluateKeyClueRequest(gameState).allowed, true, 'precondition: 3 true paths opens the gate');

api.enterModule('mod_b');

assert.equal(gameState.activeModuleId, 'mod_b');
assert.equal(gameState.kpEngine.scenePaths.truePathCount, 0, 'true path count must reset on module switch');
assert.equal(gameState.kpEngine.scenePaths.falsePathCount, 0, 'false path count must reset on module switch');
assert.deepEqual(gameState.kpEngine.scenePaths.paths, [], 'path list must reset on module switch');
assert.equal(gameState.kpEngine.scenePaths.currentSceneId, '', 'current scene must reset on module switch');
assert.equal(gameState.kpEngine.keyClueBlockedAttempts, 0, 'blocked-attempt counter must reset on module switch');
assert.equal(gameState.lastSkillCheck, null, 'last skill check must not carry into the next module');

// Behaviour: a brand-new module starts with the key-clue gate CLOSED.
const gate = KpExecutionEngine.evaluateKeyClueRequest(gameState);
assert.equal(gate.allowed, false, 'new module must not start with the key-clue gate already open: ' + JSON.stringify(gate));
assert.equal(gate.mode, 'blocked');

console.log('module_switch_reset_smoke: OK');
