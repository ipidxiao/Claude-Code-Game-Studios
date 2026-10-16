/**
 * Loading a save with queued aftermath (e.g. wound recovery CON roll) promotes it to the
 * pending rule check. Its dice-panel message must survive the chat rebuild that follows —
 * otherwise pendingRuleCheck is set (and marked _emitted) with nothing clickable, and every
 * later check (SAN, dying) queues behind it forever (R16 "check without a panel" class).
 */
import { strict as assert } from 'node:assert';

class Mem {
    constructor() { this.d = new Map(); }
    get length() { return this.d.size; }
    key(i) { return [...this.d.keys()][i] ?? null; }
    getItem(k) { return this.d.has(k) ? this.d.get(k) : null; }
    setItem(k, v) { this.d.set(k, String(v)); }
    removeItem(k) { this.d.delete(k); }
}
globalThis.localStorage = new Mem();
globalThis.sessionStorage = new Mem();
globalThis.window = globalThis;

const { CoCStatePersistence } = await import('../js/state/persistence.mjs');

const fresh = () => ({
    activeModuleId: 'm1', currentScreen: 'story', currentLocation: '起点', roster: [], inventory: [], storage: [],
    knownLocations: ['起点'], chatHistory: [], journalLog: [], npcRegistry: [], diceHistory: [],
    combat: { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' },
    chase: { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null, speedResolved: true },
    sceneMap: { title: '', rooms: [], currentRoomId: null }, clueBoard: { clues: [], links: [] },
    atmosphere: { level: 'calm', note: '' },
    scenarioRunner: { active: false, scenarioId: null, scenarioTitle: '', currentNodeId: null, choices: [], ended: false, flags: {}, pendingBranch: null, pendingScenarioId: null },
    pendingRuleCheck: null, pendingRuleChecks: [], pendingAftermath: [], groupCheckSession: null,
    activeCampaign: null, campaignArchive: null, arcLedger: null, kpState: null, kpEngine: null,
    selectedCharIndex: 0, moduleSeed: 0, encounterVariant: null, keeperStyle: 'cinematic', mythosHeat: 0,
    heatEventsLog: [], skillAttempts: {}, sanCaps: {}, worldClock: { day: 1, hour: 0 }, flags: {}, endingSaveBlurb: '',
    storageStatus: {}, ui: { saveLoading: false, saveLoadingMessage: '' }
});
const ui = {
    showToast() {}, _safeLocalStorageSetItem: (k, v) => { localStorage.setItem(k, v); return true; },
    _pushSystemNotice() {}, compactChatHistory() {}, _formatStorageError: (_e, f) => f
};

const A = fresh();
A.roster = [{ name: 'Ann', isActive: true, hp: 6, derived: { hp: 6, maxHp: 11, sanity: 50 }, status: { hasMajorWound: true } }];
A.chatHistory = [{ role: 'assistant', content: '你们撤出了码头。' }];
A.pendingAftermath = [{ kind: 'wound_recovery', skill: '体质', roller: 'Ann', target: 'Ann', prompt: '【余波】请进行【体质】检定（Ann）。' }];
const save = JSON.parse(JSON.stringify(CoCStatePersistence.create({ gameState: A, switchScreen() {} }, ui)._buildSaveData('t')));

const B = fresh();
const api = CoCStatePersistence.create({ gameState: B, switchScreen() {} }, ui);
assert.equal(api._restoreFromData(save, 't'), true);

assert.ok(B.pendingRuleCheck, 'queued aftermath becomes the pending rule check on load');
assert.equal(B.pendingRuleCheck.kind, 'wound_recovery');
assert.equal(B.pendingRuleCheck.roller, 'Ann');

const panels = B.chatHistory.filter((m) => m && !m.isResolved && Array.isArray(m.tool_calls)
    && m.tool_calls.some((tc) => tc && !tc.isResolved && tc.function && tc.function.name === 'request_skill_check'));
assert.equal(panels.length, 1, 'exactly one clickable dice panel must exist for the pending check after load');
assert.equal(panels[0].tool_calls[0].target_name, 'Ann');
assert.ok(B.chatHistory.some((m) => m && m.content === '你们撤出了码头。'), 'saved chat still restored');

console.log('load_aftermath_panel_smoke: OK');
