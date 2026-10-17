import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

class MemoryStorage {
    constructor() {
        this.data = new Map();
        this.failSaveWrites = false;
    }

    get length() { return this.data.size; }
    key(index) { return [...this.data.keys()][index] ?? null; }
    getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
    removeItem(key) { this.data.delete(String(key)); }
    setItem(key, value) {
        if (this.failSaveWrites && String(key).includes('_save_')) {
            throw new DOMException('quota', 'QuotaExceededError');
        }
        this.data.set(String(key), String(value));
    }
}

function createMemoryIndexedDb() {
    const records = new Map();
    const controls = {
        failWrites: false,
        failDeletes: false,
        delayPuts: false,
        pendingPuts: [],
        delayCursors: false,
        pendingCursors: []
    };

    const completeLater = (tx, action, shouldFail) => {
        const complete = () => queueMicrotask(() => {
            if (shouldFail()) {
                tx.error = new DOMException('transaction failed', 'AbortError');
                if (tx.onerror) tx.onerror();
                return;
            }
            action();
            if (tx.oncomplete) tx.oncomplete();
        });
        return complete;
    };

    const db = {
        objectStoreNames: { contains: () => true },
        createObjectStore() {},
        transaction() {
            const tx = {
                error: null,
                oncomplete: null,
                onerror: null,
                onabort: null,
                objectStore() {
                    return {
                        put(record) {
                            const complete = completeLater(
                                tx,
                                () => records.set(String(record.slotKey), { ...record }),
                                () => controls.failWrites
                            );
                            if (controls.delayPuts) controls.pendingPuts.push(complete);
                            else complete();
                        },
                        delete(key) {
                            completeLater(
                                tx,
                                () => records.delete(String(key)),
                                () => controls.failDeletes
                            )();
                        },
                        get(key) {
                            const request = { result: null, error: null, onsuccess: null, onerror: null };
                            queueMicrotask(() => {
                                request.result = records.get(String(key)) || null;
                                if (request.onsuccess) request.onsuccess();
                            });
                            return request;
                        },
                        openCursor() {
                            const request = { onsuccess: null, onerror: null };
                            const values = [...records.values()];
                            let index = 0;
                            const advance = () => queueMicrotask(() => {
                                const value = values[index++];
                                const cursor = value ? { value, continue: advance } : null;
                                if (request.onsuccess) request.onsuccess({ target: { result: cursor } });
                                if (!cursor) queueMicrotask(() => tx.oncomplete && tx.oncomplete());
                            });
                            if (controls.delayCursors) controls.pendingCursors.push(advance);
                            else advance();
                            return request;
                        }
                    };
                }
            };
            return tx;
        }
    };

    return {
        records,
        controls,
        indexedDB: {
            open() {
                const request = {
                    result: db,
                    error: null,
                    onupgradeneeded: null,
                    onsuccess: null,
                    onerror: null
                };
                queueMicrotask(() => {
                    if (request.onupgradeneeded) request.onupgradeneeded({ target: { result: db } });
                    if (request.onsuccess) request.onsuccess({ target: { result: db } });
                });
                return request;
            }
        }
    };
}

function createGameState() {
    return {
        activeModuleId: 'default',
        currentScreen: 'story',
        currentLocation: '测试地点',
        roster: [{ name: 'Alice' }],
        inventory: [],
        storage: [],
        knownLocations: ['测试地点'],
        chatHistory: [],
        journalLog: [],
        npcRegistry: [],
        diceHistory: [],
        combat: { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' },
        chase: { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null, speedResolved: true },
        sceneMap: { title: '', rooms: [], currentRoomId: null },
        clueBoard: { clues: [], links: [] },
        atmosphere: { level: 'calm', note: '' },
        scenarioRunner: { active: false, scenarioId: null, scenarioTitle: '', currentNodeId: null, choices: [], ended: false, flags: {}, pendingBranch: null, pendingScenarioId: null },
        pendingRuleCheck: null,
        pendingRuleChecks: [],
        pendingAftermath: [],
        groupCheckSession: null,
        activeCampaign: null,
        campaignArchive: null,
        arcLedger: null,
        kpState: null,
        kpEngine: null,
        selectedCharIndex: 0,
        moduleSeed: 0,
        encounterVariant: null,
        keeperStyle: 'cinematic',
        mythosHeat: 0,
        heatEventsLog: [],
        skillAttempts: {},
        sanCaps: {},
        worldClock: { day: 1, hour: 0 },
        flags: {},
        endingSaveBlurb: '',
        storageStatus: {},
        ui: { saveLoading: false, saveLoadingMessage: '' }
    };
}

const localStorage = new MemoryStorage();
const memoryIdb = createMemoryIndexedDb();
globalThis.localStorage = localStorage;
globalThis.indexedDB = memoryIdb.indexedDB;
globalThis.window = globalThis;

const { CoCStatePersistence } = await import('../js/state/persistence.mjs');
const notices = [];
const toasts = [];
const gameState = createGameState();
const api = CoCStatePersistence.create(
    { gameState, switchScreen: (screen) => { gameState.currentScreen = screen; } },
    {
        showToast: (message, type) => toasts.push({ message, type }),
        _safeLocalStorageSetItem: (key, value) => {
            try { localStorage.setItem(key, value); return true; } catch (_e) { return false; }
        },
        _pushSystemNotice: (message) => notices.push(message),
        compactChatHistory: () => {},
        _formatStorageError: (_error, fallback) => fallback
    }
);
await api.getSaveSlots();

const r2917Save = JSON.parse(await readFile(new URL('./fixtures/r29_17_save.json', import.meta.url), 'utf8'));
const migratedR2917 = api.migrateSaveData(structuredClone(r2917Save));
assert.equal(migratedR2917.version, 9);
assert.equal(migratedR2917.sourceVersion, 8);
assert.match(migratedR2917.data.combat.enemies[0].id, /^enemy_migrated_/);
assert.equal(migratedR2917.data.combat.initiativeOrder[0].isEnemy, true);
assert.equal(api._restoreFromData(structuredClone(r2917Save)), true);
assert.equal(gameState.currentLocation, '旧钟楼');
assert.deepEqual(gameState.roster.map((char) => char.name), ['Alice']);
assert.equal(gameState.scenarioRunner.currentNodeId, 'tower');

const r2919Save = JSON.parse(await readFile(new URL('./fixtures/r29_19_save.json', import.meta.url), 'utf8'));
assert.equal(api._restoreFromData(structuredClone(r2919Save)), true);
assert.equal(gameState.currentLocation, '码头仓库');
assert.deepEqual(gameState.inventory, ['航运清单']);
assert.equal(gameState.worldClock.day, 2);
assert.equal(gameState.flags.legacyAccepted, true);

localStorage.setItem('quota-pressure', 'x'.repeat(4600 * 1024));
memoryIdb.controls.failWrites = true;
assert.equal(await api.saveGame('slot1', '槽位 1'), true, 'local success must survive IDB mirror failure');
assert.equal(notices.some((message) => message.includes('存档失败')), false);
assert.ok(toasts.some((toast) => toast.type === 'warning' && toast.message.includes('IndexedDB')));
localStorage.removeItem('quota-pressure');

const localOlder = JSON.parse(localStorage.getItem('coc_save_slot1'));
localOlder.savedAt = '2026-01-01T00:00:00.000Z';
localOlder.location = '较旧 local';
localOlder.data.currentLocation = '较旧 local';
localStorage.setItem('coc_save_slot1', JSON.stringify(localOlder));
const idbNewer = structuredClone(localOlder);
idbNewer.savedAt = '2026-01-02T00:00:00.000Z';
idbNewer.location = '较新 IDB';
idbNewer.data.currentLocation = '较新 IDB';
memoryIdb.records.set('coc_save_slot1', {
    slotKey: 'coc_save_slot1',
    payload: JSON.stringify(idbNewer),
    savedAt: Date.parse(idbNewer.savedAt)
});
assert.equal(
    (await api.getSaveSlots()).find((slot) => slot.key === 'slot1').location,
    '较新 IDB',
    'newest valid replica must win'
);

localStorage.failSaveWrites = true;
assert.equal(await api.saveGame('slot2', '槽位 2'), false, 'double storage failure must return false');
localStorage.failSaveWrites = false;
memoryIdb.controls.failWrites = false;

const crossTabSave = structuredClone(idbNewer);
crossTabSave.location = '跨标签页槽位';
crossTabSave.data.currentLocation = '跨标签页槽位';
memoryIdb.records.set('coc_save_slot2', {
    slotKey: 'coc_save_slot2',
    payload: JSON.stringify(crossTabSave),
    savedAt: Date.parse(crossTabSave.savedAt)
});
assert.equal(
    (await api.getSaveSlots()).find((slot) => slot.key === 'slot2').location,
    '跨标签页槽位',
    'cache miss must fall back to IndexedDB'
);

localStorage.failSaveWrites = true;
memoryIdb.controls.delayPuts = true;
gameState.currentLocation = '并发写 A';
const firstQueuedSave = api.saveGame('auto', '自动存档');
gameState.currentLocation = '并发写 B';
const secondQueuedSave = api.saveGame('auto', '自动存档');
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(memoryIdb.controls.pendingPuts.length, 1, 'second write must wait for the first');
memoryIdb.controls.pendingPuts.shift()();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(memoryIdb.controls.pendingPuts.length, 1, 'second write starts after first completion');
memoryIdb.controls.pendingPuts.shift()();
assert.deepEqual(await Promise.all([firstQueuedSave, secondQueuedSave]), [true, true]);
assert.equal(
    JSON.parse(memoryIdb.records.get('coc_save_auto').payload).location,
    '并发写 B',
    'queued writes must preserve call order'
);
localStorage.failSaveWrites = false;
memoryIdb.controls.delayPuts = false;

const primeRaceStorage = new MemoryStorage();
const primeRaceIdb = createMemoryIndexedDb();
const primeRaceOld = structuredClone(idbNewer);
primeRaceOld.location = 'prime 旧副本';
primeRaceOld.data.currentLocation = 'prime 旧副本';
primeRaceIdb.records.set('coc_save_slot1', {
    slotKey: 'coc_save_slot1',
    payload: JSON.stringify(primeRaceOld),
    savedAt: Date.parse(primeRaceOld.savedAt)
});
primeRaceIdb.controls.delayCursors = true;
globalThis.localStorage = primeRaceStorage;
globalThis.indexedDB = primeRaceIdb.indexedDB;
const primeRaceState = createGameState();
primeRaceState.currentLocation = 'prime 新写入';
const primeRaceApi = CoCStatePersistence.create(
    { gameState: primeRaceState, switchScreen: (screen) => { primeRaceState.currentScreen = screen; } },
    {
        showToast: () => {},
        _safeLocalStorageSetItem: (key, value) => {
            try { primeRaceStorage.setItem(key, value); return true; } catch (_e) { return false; }
        },
        _pushSystemNotice: () => {},
        compactChatHistory: () => {},
        _formatStorageError: (_error, fallback) => fallback
    }
);
await new Promise((resolve) => setTimeout(resolve, 0));
primeRaceStorage.failSaveWrites = true;
assert.equal(await primeRaceApi.saveGame('slot1', '槽位 1'), true);
primeRaceIdb.controls.pendingCursors.splice(0).forEach((advance) => advance());
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(
    (await primeRaceApi.getSaveSlots()).find((slot) => slot.key === 'slot1').location,
    'prime 新写入',
    'late cache priming must not overwrite a newer in-session write'
);
globalThis.localStorage = localStorage;
globalThis.indexedDB = memoryIdb.indexedDB;

localStorage.removeItem('coc_save_slot1');
localStorage.failSaveWrites = true;
assert.equal(await api.saveGame('slot3', '槽位 3'), true);
localStorage.failSaveWrites = false;
memoryIdb.controls.failDeletes = true;
assert.equal(await api.deleteSave('slot3'), false, 'IDB delete failure must return false, not throw');
const slot3 = (await api.getSaveSlots()).find((slot) => slot.key === 'slot3');
assert.equal(slot3.hasData, true, 'failed deletion must not hide the cached IDB copy');
memoryIdb.controls.failDeletes = false;

const moduleAutoSave = structuredClone(idbNewer);
moduleAutoSave.moduleId = 'mod-card';
moduleAutoSave.location = 'IDB 模组自动存档';
moduleAutoSave.data.currentLocation = 'IDB 模组自动存档';
localStorage.setItem('coc_module_list', JSON.stringify(['default', 'mod-card']));
localStorage.setItem('coc_module_mod-card_meta', JSON.stringify({ name: 'IDB 模组' }));
memoryIdb.records.set('coc_module_mod-card_save_auto', {
    slotKey: 'coc_module_mod-card_save_auto',
    payload: JSON.stringify(moduleAutoSave),
    savedAt: Date.parse(moduleAutoSave.savedAt)
});
const moduleCard = (await api.getModules()).find((module) => module.id === 'mod-card');
assert.equal(moduleCard.autoSave.location, 'IDB 模组自动存档');
assert.equal(moduleCard.hasAnySave, true, 'module cards must include IDB-only saves');

gameState.activeModuleId = 'mod-race';
localStorage.setItem('coc_module_list', JSON.stringify(['default', 'mod-card', 'mod-race']));
localStorage.setItem('coc_module_mod-race_meta', JSON.stringify({ name: 'Race' }));
localStorage.failSaveWrites = true;
memoryIdb.controls.delayPuts = true;
const pendingSave = api.saveGame('auto', '自动存档');
await new Promise((resolve) => setTimeout(resolve, 0));
const pendingDelete = api.deleteModule('mod-race');
await new Promise((resolve) => setTimeout(resolve, 0));
memoryIdb.controls.pendingPuts.splice(0).forEach((complete) => complete());
assert.equal(await pendingSave, false, 'save finishing after module deletion must be cancelled');
assert.equal(await pendingDelete, true);
assert.equal(
    [...memoryIdb.records.keys()].some((key) => key.startsWith('coc_module_mod-race_save_')),
    false,
    'deleted module must not be recreated by an in-flight IDB write'
);
localStorage.failSaveWrites = false;
memoryIdb.controls.delayPuts = false;

const fallbackStorage = new MemoryStorage();
const fallbackIdb = createMemoryIndexedDb();
fallbackStorage.setItem('coc_save_slot1', '{broken json');
const fallbackSave = structuredClone(idbNewer);
fallbackSave.location = 'IDB 完整副本';
fallbackSave.data.currentLocation = 'IDB 完整副本';
fallbackIdb.records.set('coc_save_slot1', {
    slotKey: 'coc_save_slot1',
    payload: JSON.stringify(fallbackSave),
    savedAt: Date.parse(fallbackSave.savedAt)
});
globalThis.localStorage = fallbackStorage;
globalThis.indexedDB = fallbackIdb.indexedDB;
const fallbackState = createGameState();
const fallbackApi = CoCStatePersistence.create(
    {
        gameState: fallbackState,
        switchScreen: (screen) => { fallbackState.currentScreen = screen; },
        cleanupInitiativeOrder: () => {}
    },
    {
        showToast: () => {},
        _safeLocalStorageSetItem: (key, value) => {
            try { fallbackStorage.setItem(key, value); return true; } catch (_e) { return false; }
        },
        _pushSystemNotice: () => {},
        compactChatHistory: () => {},
        _formatStorageError: (_error, fallback) => fallback
    }
);
assert.equal(await fallbackApi.loadGame('slot1'), true);
assert.equal(fallbackState.currentLocation, 'IDB 完整副本', 'broken local replica must fall back to IDB');

const rollbackStorage = new MemoryStorage();
const rollbackIdb = createMemoryIndexedDb();
const rollbackSave = structuredClone(idbNewer);
rollbackSave.location = '不应提交';
rollbackSave.data.currentLocation = '不应提交';
rollbackSave.data.roster = [{ name: 'Loaded' }];
rollbackStorage.setItem('coc_save_slot1', JSON.stringify(rollbackSave));
globalThis.localStorage = rollbackStorage;
globalThis.indexedDB = rollbackIdb.indexedDB;
const rollbackState = createGameState();
rollbackState.currentLocation = '读档前地点';
rollbackState.roster.splice(0, rollbackState.roster.length, { name: 'Before' });
const rollbackToasts = [];
const rollbackApi = CoCStatePersistence.create(
    {
        gameState: rollbackState,
        switchScreen: (screen) => { rollbackState.currentScreen = screen; },
        cleanupInitiativeOrder: () => { throw new Error('restore hook failed'); }
    },
    {
        showToast: (message, type) => rollbackToasts.push({ message, type }),
        _safeLocalStorageSetItem: (key, value) => {
            try { rollbackStorage.setItem(key, value); return true; } catch (_e) { return false; }
        },
        _pushSystemNotice: () => {},
        compactChatHistory: () => {},
        _formatStorageError: (_error, fallback) => fallback
    }
);
assert.equal(await rollbackApi.loadGame('slot1'), false);
assert.equal(rollbackState.currentLocation, '读档前地点');
assert.deepEqual(rollbackState.roster.map((char) => char.name), ['Before']);
assert.equal(
    rollbackToasts.filter((toast) => toast.type === 'danger').length,
    1,
    'persistence owns the single final load failure toast'
);
globalThis.localStorage = localStorage;
globalThis.indexedDB = memoryIdb.indexedDB;

const { createAutoSaveController } = await import('../js/state/state.mjs');
const scheduled = [];
const cleared = [];
let autoSaveCalls = 0;
gameState.activeModuleId = 'default';
gameState.currentScreen = 'story';
gameState.roster.splice(0, gameState.roster.length, { name: 'Alice' });
const controller = createAutoSaveController(
    gameState,
    async () => { autoSaveCalls += 1; return true; },
    () => {},
    {
        setTimer: (callback) => { scheduled.push(callback); return scheduled.length; },
        clearTimer: (timer) => cleared.push(timer),
        delay: 1
    }
);
controller.sync();
gameState.activeModuleId = 'other';
controller.sync();
assert.deepEqual(cleared, [1], 'module switch must cancel the old timer');
scheduled[0]();
await Promise.resolve();
assert.equal(autoSaveCalls, 0, 'stale timer callback must re-check its module');
gameState.currentScreen = 'lobby';
controller.sync();
assert.deepEqual(cleared, [1, 2], 'leaving story must cancel the replacement timer');

console.log('save_idb_consistency_smoke: OK');
