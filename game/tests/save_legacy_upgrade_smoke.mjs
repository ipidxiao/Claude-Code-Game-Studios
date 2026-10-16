/**
 * R29.25 — upgrade real R29.17 / R29.19 save fixtures into the current engine.
 * Load-time migration must restore state without rewriting the on-disk schema.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { SAVE_SCHEMA_VERSION } from '../js/state/persistence.mjs';

class MemoryStorage {
    constructor() {
        this.data = new Map();
    }

    get length() { return this.data.size; }
    key(index) { return [...this.data.keys()][index] ?? null; }
    getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
    removeItem(key) { this.data.delete(String(key)); }
    setItem(key, value) { this.data.set(String(key), String(value)); }
}

function createMemoryIndexedDb() {
    const records = new Map();
    const db = {
        objectStoreNames: { contains: () => true },
        createObjectStore() {},
        transaction() {
            const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
            tx.objectStore = () => ({
                put(record) {
                    queueMicrotask(() => {
                        records.set(String(record.slotKey), { ...record });
                        if (tx.oncomplete) tx.oncomplete();
                    });
                },
                delete(key) {
                    queueMicrotask(() => {
                        records.delete(String(key));
                        if (tx.oncomplete) tx.oncomplete();
                    });
                },
                get(key) {
                    const request = { result: null, onsuccess: null, onerror: null };
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
                        if (!cursor && tx.oncomplete) queueMicrotask(() => tx.oncomplete());
                    });
                    advance();
                    return request;
                }
            });
            return tx;
        }
    };

    return {
        records,
        indexedDB: {
            open() {
                const request = {
                    result: db,
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
        currentScreen: 'lobby',
        currentLocation: '读档前大厅',
        roster: [{ name: 'Before' }],
        inventory: [],
        storage: [],
        knownLocations: ['读档前大厅'],
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

function createApi(storage, idb) {
    globalThis.localStorage = storage;
    globalThis.indexedDB = idb.indexedDB;
    globalThis.window = globalThis;
    const toasts = [];
    const gameState = createGameState();
    return {
        storage,
        gameState,
        toasts,
        async ready(persistence) {
            this.api = persistence.create(
                { gameState, switchScreen: (screen) => { gameState.currentScreen = screen; } },
                {
                    showToast: (message, type) => toasts.push({ message, type }),
                    _safeLocalStorageSetItem: (key, value) => {
                        storage.setItem(key, value);
                        return true;
                    },
                    _pushSystemNotice: () => {},
                    compactChatHistory: () => {},
                    _formatStorageError: (_error, fallback) => fallback
                }
            );
            await this.api.getSaveSlots();
            return this.api;
        }
    };
}

function putIdb(idb, slotKey, save) {
    idb.records.set(slotKey, {
        slotKey,
        payload: JSON.stringify(save),
        savedAt: Date.parse(save.savedAt)
    });
}

assert.equal(SAVE_SCHEMA_VERSION, 8, 'R29.25 must not bump the save schema');

const r2917Save = JSON.parse(await readFile(new URL('./fixtures/r29_17_save.json', import.meta.url), 'utf8'));
const r2919Save = JSON.parse(await readFile(new URL('./fixtures/r29_19_save.json', import.meta.url), 'utf8'));
assert.equal(r2917Save.version, 8);
assert.equal(r2919Save.version, 8);
assert.equal(r2917Save.location, '旧钟楼');
assert.equal(r2919Save.location, '码头仓库');

const { CoCStatePersistence } = await import('../js/state/persistence.mjs');

const localOnly = createApi(new MemoryStorage(), createMemoryIndexedDb());
const localRaw = JSON.stringify(r2917Save);
localOnly.storage.setItem('coc_save_slot1', localRaw);
await localOnly.ready(CoCStatePersistence);
const localSlots = await localOnly.api.getSaveSlots();
assert.equal(localSlots.find((slot) => slot.key === 'slot1').location, '旧钟楼');
assert.equal(await localOnly.api.loadGame('slot1'), true);
assert.equal(localOnly.gameState.currentLocation, '旧钟楼');
assert.deepEqual(localOnly.gameState.roster.map((char) => char.name), ['Alice']);
assert.equal(localOnly.gameState.scenarioRunner.currentNodeId, 'tower');
assert.match(localOnly.gameState.combat.enemies[0].id, /^enemy_migrated_/);
assert.equal(localOnly.storage.getItem('coc_save_slot1'), localRaw, 'load must not rewrite the stored schema');

const idbOnlyStorage = new MemoryStorage();
const idbOnlyDb = createMemoryIndexedDb();
const idbOnly = createApi(idbOnlyStorage, idbOnlyDb);
putIdb(idbOnlyDb, 'coc_save_slot2', r2919Save);
await idbOnly.ready(CoCStatePersistence);
const idbSlots = await idbOnly.api.getSaveSlots();
assert.equal(idbSlots.find((slot) => slot.key === 'slot2').location, '码头仓库');
assert.equal(await idbOnly.api.loadGame('slot2'), true);
assert.equal(idbOnly.gameState.currentLocation, '码头仓库');
assert.deepEqual(idbOnly.gameState.inventory, ['航运清单']);
assert.equal(idbOnly.gameState.worldClock.day, 2);
assert.equal(idbOnly.gameState.flags.legacyAccepted, true);
assert.equal(idbOnlyStorage.getItem('coc_save_slot2'), null, 'IDB-only load must not fabricate a local replica');

const conflictStorage = new MemoryStorage();
const conflictDb = createMemoryIndexedDb();
const olderLocal = structuredClone(r2917Save);
olderLocal.savedAt = '2026-10-03T12:00:00.000Z';
const newerIdb = structuredClone(r2919Save);
newerIdb.savedAt = '2026-10-04T00:00:00.000Z';
conflictStorage.setItem('coc_save_slot1', JSON.stringify(olderLocal));
putIdb(conflictDb, 'coc_save_slot1', newerIdb);
const conflict = createApi(conflictStorage, conflictDb);
await conflict.ready(CoCStatePersistence);
assert.equal((await conflict.api.getSaveSlots()).find((slot) => slot.key === 'slot1').location, '码头仓库');
assert.equal(await conflict.api.loadGame('slot1'), true);
assert.equal(conflict.gameState.currentLocation, '码头仓库');
assert.ok(conflict.toasts.some((toast) => toast.type === 'info' && toast.message.includes('IndexedDB')));
assert.equal(conflictStorage.getItem('coc_save_slot1'), JSON.stringify(olderLocal), 'arbitration must not rewrite the older local replica');

const reverseStorage = new MemoryStorage();
const reverseDb = createMemoryIndexedDb();
const newerLocal = structuredClone(r2919Save);
newerLocal.savedAt = '2026-10-04T02:00:00.000Z';
const olderIdb = structuredClone(r2917Save);
olderIdb.savedAt = '2026-10-03T12:00:00.000Z';
reverseStorage.setItem('coc_save_slot3', JSON.stringify(newerLocal));
putIdb(reverseDb, 'coc_save_slot3', olderIdb);
const reverse = createApi(reverseStorage, reverseDb);
await reverse.ready(CoCStatePersistence);
assert.equal((await reverse.api.getSaveSlots()).find((slot) => slot.key === 'slot3').location, '码头仓库');
assert.equal(await reverse.api.loadGame('slot3'), true);
assert.equal(reverse.gameState.currentLocation, '码头仓库');
assert.equal(reverse.gameState.roster[0].name, 'Bob');

const brokenStorage = new MemoryStorage();
const brokenDb = createMemoryIndexedDb();
brokenStorage.setItem('coc_save_slot1', '{legacy-broken');
putIdb(brokenDb, 'coc_save_slot1', r2917Save);
const broken = createApi(brokenStorage, brokenDb);
await broken.ready(CoCStatePersistence);
assert.equal((await broken.api.getSaveSlots()).find((slot) => slot.key === 'slot1').location, '旧钟楼');
assert.equal(await broken.api.loadGame('slot1'), true);
assert.equal(broken.gameState.currentLocation, '旧钟楼');
assert.ok(broken.toasts.some((toast) => toast.message.includes('IndexedDB')));
assert.equal(brokenStorage.getItem('coc_save_slot1'), '{legacy-broken', 'fallback must leave the damaged local payload untouched');

const brokenIdbStorage = new MemoryStorage();
const brokenIdbDb = createMemoryIndexedDb();
brokenIdbStorage.setItem('coc_save_auto', JSON.stringify(r2919Save));
brokenIdbDb.records.set('coc_save_auto', {
    slotKey: 'coc_save_auto',
    payload: '{idb-broken',
    savedAt: Date.parse(r2919Save.savedAt)
});
const brokenIdb = createApi(brokenIdbStorage, brokenIdbDb);
await brokenIdb.ready(CoCStatePersistence);
assert.equal((await brokenIdb.api.getAutoSave()).location, '码头仓库');
assert.equal(await brokenIdb.api.loadGame('auto'), true);
assert.equal(brokenIdb.gameState.currentLocation, '码头仓库');

const moduleStorage = new MemoryStorage();
const moduleDb = createMemoryIndexedDb();
const moduleSave = structuredClone(r2919Save);
moduleSave.moduleId = 'legacy-mod';
moduleSave.location = '遗产模组码头';
moduleSave.data.currentLocation = '遗产模组码头';
moduleStorage.setItem('coc_module_list', JSON.stringify(['default', 'legacy-mod']));
moduleStorage.setItem('coc_module_legacy-mod_meta', JSON.stringify({ name: '遗产模组' }));
putIdb(moduleDb, 'coc_module_legacy-mod_save_auto', moduleSave);
const moduleCase = createApi(moduleStorage, moduleDb);
await moduleCase.ready(CoCStatePersistence);
const moduleCard = (await moduleCase.api.getModules()).find((module) => module.id === 'legacy-mod');
assert.equal(moduleCard.autoSave.location, '遗产模组码头');
assert.equal(moduleCard.hasAnySave, true);

const londonStorage = new MemoryStorage();
const londonDb = createMemoryIndexedDb();
const londonSave = structuredClone(r2917Save);
londonSave.data.activeCampaign = 'masks_london';
londonSave.data.campaignArchive = { note: 'soho' };
londonSave.data.selectedCharIndex = 2;
londonSave.data.roster = [
    { name: 'Alice', expName: '无' },
    { name: '修', expName: '无' },
    { name: 'V', expName: '面具·伦敦', campaignKey: 'V_Leader' },
    { name: '修', expName: '面具·伦敦', campaignKey: 'Xiu_Avenger' },
    { name: '雨果', expName: '面具·伦敦', campaignKey: 'Hugo_Scholar' },
    { name: '尼尔', expName: '面具·伦敦', campaignKey: 'Neil_Engineer' }
];
londonSave.data.kpEngine = { enabled: true };
londonSave.data.londonKpState = { PHASE: 'CALM', note: 'kept' };
londonStorage.setItem('coc_save_slot1', JSON.stringify(londonSave));
const londonCase = createApi(londonStorage, londonDb);
await londonCase.ready(CoCStatePersistence);
assert.equal(await londonCase.api.loadGame('slot1'), true);
assert.deepEqual(londonCase.gameState.roster.map((char) => char.name), ['Alice', '修', 'V', '修', '雨果', '尼尔']);
assert.equal(londonCase.gameState.activeCampaign, null);
assert.equal(londonCase.gameState.campaignArchive, null);
assert.equal(londonCase.gameState.selectedCharIndex, 2);
assert.equal(londonCase.gameState.kpState.note, 'kept');
assert.equal(londonCase.gameState.londonKpState, undefined);

console.log('save_legacy_upgrade_smoke: OK', {
    schema: SAVE_SCHEMA_VERSION,
    fixtures: ['r29_17_save.json', 'r29_19_save.json']
});
