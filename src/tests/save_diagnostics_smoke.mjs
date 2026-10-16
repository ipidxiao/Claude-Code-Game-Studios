/**
 * R29.26 — save replica diagnostics, confirmed repair, and backed-up cleanup.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

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
                const request = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null };
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
        currentLocation: '诊断前',
        roster: [{ name: 'Before' }],
        inventory: [],
        storage: [],
        knownLocations: ['诊断前'],
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

const storage = new MemoryStorage();
const idb = createMemoryIndexedDb();
globalThis.localStorage = storage;
globalThis.indexedDB = idb.indexedDB;
globalThis.window = globalThis;

const save = JSON.parse(await readFile(new URL('./fixtures/r29_19_save.json', import.meta.url), 'utf8'));
const localRaw = JSON.stringify(save);
const older = structuredClone(save);
older.savedAt = '2026-10-03T00:00:00.000Z';
older.location = '较旧 IDB';
older.data.currentLocation = '较旧 IDB';
const olderRaw = JSON.stringify(older);

const { CoCStatePersistence } = await import('../js/state/persistence.mjs');
const gameState = createGameState();
const api = CoCStatePersistence.create(
    { gameState, switchScreen() {} },
    {
        showToast() {},
        _safeLocalStorageSetItem(key, value) {
            storage.setItem(key, value);
            return true;
        },
        _pushSystemNotice() {},
        compactChatHistory() {},
        _formatStorageError(_error, fallback) { return fallback; }
    }
);
await api.getSaveSlots();

storage.setItem('coc_save_slot1', localRaw);
let report = await api.diagnoseSaves();
let slot1 = report.slots.find((row) => row.slotKey === 'slot1');
assert.equal(slot1.selected, 'local');
assert.equal(slot1.local.valid, true);
assert.equal(slot1.local.location, '码头仓库');
assert.equal(slot1.idb.present, false);
assert.equal(slot1.needsRepair, true);
assert.equal((await api.repairSaveReplica('slot1')).reason, 'confirmation-required');
assert.equal(idb.records.has('coc_save_slot1'), false);

const repaired = await api.repairSaveReplica('slot1', { confirmed: true });
assert.equal(repaired.ok, true);
assert.equal(repaired.target, 'idb');
assert.equal(idb.records.get('coc_save_slot1').payload, localRaw);
assert.equal(storage.getItem('coc_save_slot1'), localRaw);
const backup = JSON.parse(storage.getItem(repaired.backupId));
assert.equal(backup.entries[0].source, 'idb');
assert.equal(backup.entries[0].payload, null);

storage.setItem('coc_save_slot2', '{broken-local');
idb.records.set('coc_save_slot2', {
    slotKey: 'coc_save_slot2',
    payload: localRaw,
    savedAt: Date.parse(save.savedAt)
});
report = await api.diagnoseSaves();
const slot2 = report.slots.find((row) => row.slotKey === 'slot2');
assert.equal(slot2.selected, 'idb');
assert.equal(slot2.local.valid, false);
assert.equal(slot2.canCleanup, true);
assert.equal((await api.cleanupInvalidReplica('slot2')).reason, 'confirmation-required');
assert.equal(storage.getItem('coc_save_slot2'), '{broken-local');
const cleaned = await api.cleanupInvalidReplica('slot2', { confirmed: true });
assert.equal(cleaned.ok, true);
assert.equal(storage.getItem('coc_save_slot2'), null);
assert.equal(idb.records.get('coc_save_slot2').payload, localRaw);
assert.equal(JSON.parse(storage.getItem(cleaned.backupId)).entries[0].payload, '{broken-local');

storage.setItem('coc_save_slot3', localRaw);
idb.records.set('coc_save_slot3', {
    slotKey: 'coc_save_slot3',
    payload: olderRaw,
    savedAt: Date.parse(older.savedAt)
});
const diverged = (await api.diagnoseSaves()).slots.find((row) => row.slotKey === 'slot3');
assert.equal(diverged.selected, 'local');
assert.equal(diverged.diverged, true);
assert.equal((await api.repairSaveReplica('slot3', { confirmed: true })).reason, 'diverged-valid-replicas');
assert.equal(idb.records.get('coc_save_slot3').payload, olderRaw);
const overwritten = await api.repairSaveReplica('slot3', { confirmed: true, overwriteValid: true });
assert.equal(overwritten.ok, true);
assert.equal(idb.records.get('coc_save_slot3').payload, localRaw);
assert.equal(JSON.parse(storage.getItem(overwritten.backupId)).entries[0].payload, olderRaw);

console.log('save_diagnostics_smoke: OK');
