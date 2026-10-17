// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { safeJsonParse, safeJsonClone } from '../data/utils.mjs';
import { clampSelectedCharIndex } from './selection.mjs';
import { CoCStateAccessor } from './accessor.mjs';
import { KP_ENGINE_DEFAULT_ENABLED, applyKpPreferenceToGameState, loadKpPreference, saveKpPreference } from './kp_config.mjs';
import { KpExecutionEngine } from '../campaign/kp_execution_engine.mjs';
import { CoCEngine } from '../coc.mjs';
import { CoCItemDB } from '../data/items.mjs';
import { CoCContextManager } from '../core/context_manager.mjs';
import { CoCCapabilitySystem } from '../data/capability_system.mjs';
import { flushAftermathToRuleCheck } from './aftermath.mjs';
import { identityRegistry } from './identity_registry.mjs';
import { assignStableIds } from './visibility.mjs';

function _defaultScenePaths() {
    return { currentSceneId: '', paths: [], truePathCount: 0, falsePathCount: 0 };
}

/** Inline for save migration — keep self-contained (no cross-module imports here). */
function _normalizeScenePaths(raw) {
    const def = _defaultScenePaths();
    if (raw == null) return { ...def };
    if (Array.isArray(raw)) {
        const paths = raw.map((item, idx) => {
            if (!item || typeof item !== 'object') return null;
            return {
                id: `path_migrated_${idx}`,
                type: 'environment',
                clueId: null,
                verified: true,
                from: item.from,
                to: item.to,
                label: item.label
            };
        }).filter(Boolean);
        return { currentSceneId: '', paths, truePathCount: paths.length, falsePathCount: 0 };
    }
    if (typeof raw !== 'object') return { ...def };
    const paths = Array.isArray(raw.paths) ? raw.paths.filter((p) => p && typeof p === 'object') : [];
    const truePathCount = Number.isFinite(Number(raw.truePathCount))
        ? Math.max(0, Number(raw.truePathCount))
        : paths.filter((p) => p.verified !== false && p.type !== 'false').length;
    const falsePathCount = Number.isFinite(Number(raw.falsePathCount))
        ? Math.max(0, Number(raw.falsePathCount))
        : paths.filter((p) => p.type === 'false' || p.verified === false).length;
    return {
        currentSceneId: String(raw.currentSceneId ?? ''),
        paths,
        truePathCount,
        falsePathCount
    };
}

function _applyKpPreferenceToGameState(gameState) {
    applyKpPreferenceToGameState(gameState);
}

function _loadKpPreference(moduleId) {
    return loadKpPreference(moduleId);
}

function _saveKpPreference(moduleId, enabled) {
    saveKpPreference(moduleId, enabled);
}

function _kpDefaultEnabled() {
    return KP_ENGINE_DEFAULT_ENABLED !== undefined ? KP_ENGINE_DEFAULT_ENABLED : true;
}

export const SAVE_SCHEMA_VERSION = 9;

function _isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function _defaultScenarioRunner() {
    return {
        active: false,
        scenarioId: null,
        scenarioTitle: '',
        currentNodeId: null,
        choices: [],
        ended: false,
        flags: {},
        pendingBranch: null,
        pendingScenarioId: null
    };
}

function _defaultAtmosphere() {
    return { level: 'calm', note: '' };
}

function _defaultClueBoard() {
    return { clues: [], links: [] };
}

function _defaultSceneMap() {
    return { title: '', rooms: [], currentRoomId: null };
}

function _coerceScenarioRunner(raw) {
    return Object.assign(_defaultScenarioRunner(), _isPlainObject(raw) ? raw : {});
}

function _coerceAtmosphere(raw) {
    if (!_isPlainObject(raw)) return _defaultAtmosphere();
    return {
        level: raw.level != null ? String(raw.level) : 'calm',
        note: raw.note != null ? String(raw.note) : ''
    };
}

function _coerceClueBoard(raw) {
    if (!_isPlainObject(raw)) return _defaultClueBoard();
    return {
        clues: Array.isArray(raw.clues) ? raw.clues.filter((c) => c && typeof c === 'object') : [],
        links: Array.isArray(raw.links) ? raw.links.filter((l) => l && typeof l === 'object') : []
    };
}

function _coerceSceneMap(raw) {
    if (!_isPlainObject(raw)) return _defaultSceneMap();
    return {
        title: raw.title != null ? String(raw.title) : '',
        rooms: Array.isArray(raw.rooms) ? raw.rooms.filter((r) => r && typeof r === 'object') : [],
        currentRoomId: raw.currentRoomId != null ? raw.currentRoomId : null
    };
}


/** Default chase blob for save/load (keep inline — no chase handler import). */
function _emptyChase() {
    return {
        active: false,
        round: 1,
        vehicle: false,
        quarryName: '',
        participants: [],
        outcome: null,
        speedResolved: true,
        escapeStreak: 0,
        escapeThreshold: null,
        escapeRounds: 2,
        lead: 2
    };
}

/** Coerce chase shape; preserve engine fields (hazardKind, vehicleId, participant.vehicle, …). */
function _normalizeChaseForSave(raw) {
    const base = _emptyChase();
    if (!raw || typeof raw !== 'object') return base;
    const out = safeJsonClone(raw, base);
    out.active = !!out.active;
    out.vehicle = !!out.vehicle;
    out.round = Number.isFinite(Number(out.round)) ? Math.max(1, Math.floor(Number(out.round))) : 1;
    out.quarryName = out.quarryName == null ? '' : String(out.quarryName);
    out.participants = Array.isArray(out.participants)
        ? out.participants.filter((p) => p && typeof p === 'object')
        : [];
    if (out.outcome === undefined) out.outcome = null;
    out.speedResolved = out.speedResolved !== false;
    out.escapeStreak = Number.isFinite(Number(out.escapeStreak))
        ? Math.max(0, Math.floor(Number(out.escapeStreak)))
        : 0;
    out.escapeRounds = Number.isFinite(Number(out.escapeRounds)) && Number(out.escapeRounds) >= 1
        ? Math.floor(Number(out.escapeRounds))
        : 2;
    if (out.escapeThreshold != null && Number.isFinite(Number(out.escapeThreshold))) {
        out.escapeThreshold = Math.max(1, Math.floor(Number(out.escapeThreshold)));
    } else {
        out.escapeThreshold = null;
    }
    if (out.lead != null && Number.isFinite(Number(out.lead))) {
        out.lead = Math.max(1, Math.floor(Number(out.lead)));
    }
    return out;
}

const SAVE_IDB_THRESHOLD_BYTES = 512 * 1024;
const SAVE_IDB_QUOTA_RATIO = 0.85;
/**
 * CoC State Persistence — save/load, migration, module management, storage estimation.
 *
 * Factory receives core + ui helpers, returns all persistence methods.
 */
export const CoCStatePersistence = (function() {
    const LOCAL_STORAGE_QUOTA_ESTIMATE_BYTES = 5 * 1024 * 1024;
    const MOD_LIST_KEY = 'coc_module_list';
    const MOD_META_PRE = 'coc_module_';

    const create = function(core, ui) {
        const { gameState, switchScreen } = core;
        const { showToast, _safeLocalStorageSetItem, _pushSystemNotice, compactChatHistory, _formatStorageError } = ui;
        const _moduleDeleteGeneration = new Map();

        const _getModuleId = () => gameState.activeModuleId || 'default';
        const _getModuleDeleteGeneration = (id) => _moduleDeleteGeneration.get(id) || 0;
        const _dispatchSaveChange = (detail = {}) => {
            if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
            try { window.dispatchEvent(new CustomEvent('coc:saves-changed', { detail })); } catch (_e) {}
        };
        const _saveChannel = (typeof document !== 'undefined' && typeof BroadcastChannel !== 'undefined')
            ? new BroadcastChannel('coc-engine-save-events')
            : null;
        if (_saveChannel) {
            _saveChannel.onmessage = (event) => _dispatchSaveChange(event && event.data);
        }
        const _notifySaveChange = (detail = {}) => {
            _dispatchSaveChange(detail);
            try { if (_saveChannel) _saveChannel.postMessage(detail); } catch (_e) {}
        };

        const _getModSavePrefix = () => {
            const id = _getModuleId();
            return id === 'default' ? 'coc_save_' : `coc_module_${id}_save_`;
        };
        const SLOT_LABELS = { auto: '自动存档', slot1: '槽位 1', slot2: '槽位 2', slot3: '槽位 3' };
        /** Human-readable source of a save key, shown as identity evidence ("默认模组 · 槽位 1"). */
        const _sourceLabel = (fullKey) => {
            const m = /^coc_module_(.+)_save_([^_]+)$/.exec(fullKey) || /^coc_save_()([^_]+)$/.exec(fullKey);
            if (!m) return String(fullKey || '');
            const id = m[1] || 'default';
            let name = id === 'default' ? '默认模组' : id;
            try { name = safeJsonParse(localStorage.getItem(MOD_META_PRE + id + '_meta'), {}).name || name; } catch (_e) {}
            return name + ' · ' + (SLOT_LABELS[m[2]] || m[2]);
        };

        const _ensureModList = () => {
            try {
                const raw = localStorage.getItem(MOD_LIST_KEY);
                if (!raw) {
                    _safeLocalStorageSetItem(MOD_LIST_KEY, JSON.stringify(['default']), '模组列表初始化');
                    _safeLocalStorageSetItem(MOD_META_PRE + 'default_meta', JSON.stringify({ name: '默认模组', createdAt: new Date().toISOString() }), '默认模组初始化');
                }
            } catch(e) {}
        };

        const _arcLedgerBlurb = (ledger) => {
            if (window.CoCArcLedger && window.CoCArcLedger.arcLedgerMeta) {
                return window.CoCArcLedger.arcLedgerMeta(ledger).blurb || '';
            }
            if (!ledger || typeof ledger !== 'object') return '';
            const ver = ledger.version != null ? ('v' + ledger.version) : 'v?';
            const heat = Number(ledger.mythosHeatFloor) || 0;
            const snap = Array.isArray(ledger.characterSnapshot) && ledger.characterSnapshot.length > 0;
            return ver + ' · 热度' + heat + '/5' + (snap ? ' · 可继承快照' : ' · 无快照');
        };

        const _arcLedgerMeta = (ledger) => {
            if (window.CoCArcLedger && window.CoCArcLedger.arcLedgerMeta) {
                return window.CoCArcLedger.arcLedgerMeta(ledger);
            }
            return { version: null, heat: 0, hasSnapshot: false, unlockCount: 0, blurb: _arcLedgerBlurb(ledger) };
        };

        // ── Module CRUD ──
        const getModules = async () => {
            _ensureModList();
            try {
                const list = safeJsonParse(localStorage.getItem(MOD_LIST_KEY), ['default']);
                return Promise.all(list.map(async (id) => {
                    try {
                        const meta = safeJsonParse(localStorage.getItem(MOD_META_PRE + id + '_meta'), {});
                        const savePrefix = id === 'default' ? 'coc_save_' : `coc_module_${id}_save_`;
                        const saves = await Promise.all(['auto', 'slot1', 'slot2', 'slot3']
                            .map((slot) => _readSavePayload(savePrefix + slot)));
                        const s = saves[0];
                        const autoSave = s ? {
                            charNames: s.charNames,
                            location: s.location,
                            savedAt: s.savedAt ? new Date(s.savedAt).toLocaleString('zh-CN') : '?',
                            saveBlurb: (s.data && s.data.saveBlurb) || s.saveBlurb || ''
                        } : null;
                        const hasAnySave = saves.some(Boolean);
                        const kpPref = _loadKpPreference(id);
                        const kpEnabled = kpPref !== null ? kpPref : _kpDefaultEnabled();
                        return { id, name: meta.name || '未命名模组', createdAt: meta.createdAt, lastPlayed: meta.lastPlayed, autoSave, hasAnySave, kpEnabled };
                    } catch(e) { return { id, name: id === 'default' ? '默认模组' : id, hasAnySave: false }; }
                }));
            } catch(e) { return [{ id: 'default', name: '默认模组', hasAnySave: false }]; }
        };

        const createModule = (name) => {
            _ensureModList();
            const id = 'mod' + Date.now();
            try {
                const list = safeJsonParse(localStorage.getItem(MOD_LIST_KEY), ['default']);
                list.push(id);
                _safeLocalStorageSetItem(MOD_LIST_KEY, JSON.stringify(list), '模组列表保存');
                _safeLocalStorageSetItem(MOD_META_PRE + id + '_meta', JSON.stringify({ name: name || '新模组', createdAt: new Date().toISOString() }), '模组元数据保存');
            } catch(e) {}
            return id;
        };

        const renameModule = (id, newName) => {
            try {
                const meta = safeJsonParse(localStorage.getItem(MOD_META_PRE + id + '_meta'), {});
                meta.name = newName;
                return _safeLocalStorageSetItem(MOD_META_PRE + id + '_meta', JSON.stringify(meta), '模组重命名');
            } catch(e) { return false; }
        };

        const deleteModule = async (id) => {
            if (id === 'default') return false;
            _moduleDeleteGeneration.set(id, _getModuleDeleteGeneration(id) + 1);
            const saveKeys = ['auto','slot1','slot2','slot3']
                .map((slot) => `coc_module_${id}_save_${slot}`);
            let localOk = true;
            try {
                saveKeys.forEach((key) => localStorage.removeItem(key));
                localStorage.removeItem(MOD_META_PRE + id + '_meta');
                const list = safeJsonParse(localStorage.getItem(MOD_LIST_KEY), []).filter(i => i !== id);
                localOk = _safeLocalStorageSetItem(MOD_LIST_KEY, JSON.stringify(list), '模组删除');
                if (localOk && gameState.activeModuleId === id) {
                    // Avoid auto-save writing ghost keys for a deleted module.
                    enterModule('default');
                }
            } catch(e) {
                localOk = false;
            }
            const idbResults = await Promise.all(saveKeys.map(async (key) => {
                const ok = await _idbDelete(key);
                if (ok) delete _idbCache[key];
                return ok;
            }));
            const deleted = localOk && idbResults.every(Boolean);
            _notifySaveChange({ type: 'module-delete', moduleId: id, ok: deleted });
            return deleted;
        };

        const enterModule = (id) => {
            gameState.activeModuleId = id;
            gameState.roster.splice(0);
            gameState.inventory.splice(0);
            gameState.storage.splice(0);
            gameState.journalLog.splice(0);
            gameState.npcRegistry.splice(0);
            gameState.diceHistory.splice(0);
            gameState.selectedCharIndex = 0;
            gameState.currentLocation = "未知的房间";
            Object.assign(gameState.combat, { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' });
            gameState.chase = { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null, speedResolved: true };
            gameState.pendingRuleCheck = null;
            gameState.pendingRuleChecks = [];
            gameState.pendingAftermath = [];
            gameState.groupCheckSession = null;
            gameState.lastSkillCheck = null;
            gameState.skillAttempts = {};
            gameState.sanCaps = {};
            gameState.worldClock = { day: 1, hour: 0 };
            gameState.heatEventsLog = [];
            gameState.moduleSeed = 0;
            gameState.encounterVariant = null;
            gameState.mythosHeat = 0;
            gameState.flags = {};
            gameState.endingSaveBlurb = '';
            // Keep arcLedger across module enter so short campaigns can chain.
            Object.assign(gameState.sceneMap, { title: '', rooms: [], currentRoomId: null });
            Object.assign(gameState.atmosphere, { level: 'calm', note: '' });
            gameState.clueBoard.clues.splice(0); gameState.clueBoard.links.splice(0);
            gameState.knownLocations.splice(0, gameState.knownLocations.length, "未知的房间");
            Object.assign(gameState.scenarioRunner, {
                active: false, scenarioId: null, scenarioTitle: '', currentNodeId: null,
                choices: [], ended: false, flags: {}, pendingBranch: null, pendingScenarioId: null
            });
            gameState.activeCampaign = null;
            gameState.campaignArchive = null;
            if (typeof window !== 'undefined' && window.KpGameLoop && window.KpGameLoop.unregister) {
                window.KpGameLoop.unregister(gameState);
            }
            if (gameState.kpEngine) {
                Object.assign(gameState.kpEngine, {
                    systemName: 'KP_PROTOCOL',
                    global: { attention: 0, playerPower: 0, phase: 'CALM', doomClock: 0, alertLevel: 0, knowledgeLevel: 0 },
                    rules: null,
                    sessionStartedAt: null,
                    lastEventInjectionAt: null,
                    recentInjectionTypes: [],
                    combatStrategyLog: [],
                    // Per-module key-clue gate progress: must not leak into the next module.
                    scenePaths: _defaultScenePaths(),
                    keyClueBlockedAttempts: 0
                });
                gameState.kpEngine.enabled = _kpDefaultEnabled();
            }
            gameState.kpState = null;
            const sysPrompt = gameState.chatHistory.find(m => m.role === 'system' && m.isHidden);
            gameState.chatHistory.splice(0);
            if (sysPrompt) gameState.chatHistory.push(sysPrompt);
            try {
                const meta = safeJsonParse(localStorage.getItem(MOD_META_PRE + id + '_meta'), {});
                meta.lastPlayed = new Date().toISOString();
                _safeLocalStorageSetItem(MOD_META_PRE + id + '_meta', JSON.stringify(meta), '模组最后游玩时间');
            } catch(e) {}
            _applyKpPreferenceToGameState(gameState);
            if (gameState.kpEngine && gameState.kpEngine.enabled && KpExecutionEngine) {
                KpExecutionEngine.loadKpRulesPreset(gameState);
            } else if (gameState.kpEngine && !gameState.kpEngine.enabled) {
                gameState.kpState = null;
            }
            switchScreen('lobby');
        };

        /**
         * Normalize kpEngine on load: legacy saves without the field stay off;
         * explicit enabled true/false is preserved.
         * @param {boolean} hadKey - whether kpEngine existed on the raw input before migration
         * @param {object} d migrated.data
         */
        const migrateKpEngineField = (hadKey, d) => {
            if (!hadKey) {
                d.kpEngine = { enabled: false };
                return;
            }
            if (d.kpEngine === null || d.kpEngine === undefined) {
                d.kpEngine = { enabled: false };
                return;
            }
            if (typeof d.kpEngine === 'object') {
                d.kpEngine.enabled = d.kpEngine.enabled === undefined ? false : !!d.kpEngine.enabled;
            }
        };

        // ── Save Migration ──
        /**
         * Migrate save data from any previous schema version to the current
         * SAVE_SCHEMA_VERSION.  Handles flat→nested migration, enemy ID
         * normalization, initiative order repair, and chat history trimming.
         * @param {Object|null} save - Raw save object from localStorage or import
         * @param {{label?:string}} [ctx] - where the save came from (identity evidence)
         * @returns {Object|null} Migrated save object, or null if invalid
         */
        const migrateSaveData = (save, ctx = {}) => {
            if (!save || typeof save !== 'object') return null;
            const hadKpEngineKey = save.kpEngine !== undefined
                || (save.data && save.data.kpEngine !== undefined);
            const migrated = save;
            const sourceVersion = Number(migrated.version || 1);
            if (!migrated.data && (migrated.roster || migrated.chatHistory || migrated.inventory)) {
                migrated.data = {
                    roster: migrated.roster || [],
                    inventory: migrated.inventory || [],
                    storage: migrated.storage || [],
                    currentLocation: migrated.currentLocation || migrated.location || '未知的房间',
                    knownLocations: migrated.knownLocations || ['未知的房间'],
                    chatHistory: migrated.chatHistory || [],
                    journalLog: migrated.journalLog || [],
                    npcRegistry: migrated.npcRegistry || [],
                    combat: migrated.combat || { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' },
                    chase: migrated.chase || _emptyChase(),
                    sceneMap: migrated.sceneMap || { title: '', rooms: [], currentRoomId: null },
                    clueBoard: migrated.clueBoard || { clues: [], links: [] },
                    diceHistory: migrated.diceHistory || [],
                    atmosphere: migrated.atmosphere || { level: 'calm', note: '' },
                    scenarioRunner: migrated.scenarioRunner || { active: false, scenarioId: null, scenarioTitle: '', currentNodeId: null, choices: [], ended: false, flags: {}, pendingBranch: null, pendingScenarioId: null },
                    activeCampaign: migrated.activeCampaign === 'masks_london' ? null : (migrated.activeCampaign || null),
                    campaignArchive: migrated.activeCampaign === 'masks_london' ? null : (migrated.campaignArchive || null),
                    arcLedger: migrated.arcLedger || null,
                    kpState: migrated.kpState || migrated.londonKpState || null,
                    kpEngine: migrated.kpEngine || null,
                    selectedCharIndex: migrated.selectedCharIndex || 0
                };
            }
            if (!migrated.data || !Array.isArray(migrated.data.roster)) return null;
            const d = migrated.data;
            d.inventory = Array.isArray(d.inventory) ? d.inventory : [];
            d.storage = Array.isArray(d.storage) ? d.storage : [];
            d.knownLocations = Array.isArray(d.knownLocations) && d.knownLocations.length ? d.knownLocations : ['未知的房间'];
            d.chatHistory = Array.isArray(d.chatHistory) ? d.chatHistory : [];
            if (CoCContextManager && CoCContextManager.trimForSave) {
                d.chatHistory = CoCContextManager.trimForSave(d.chatHistory).messages;
            }
            d.journalLog = Array.isArray(d.journalLog) ? d.journalLog : [];
            d.npcRegistry = Array.isArray(d.npcRegistry) ? d.npcRegistry : [];
            d.diceHistory = Array.isArray(d.diceHistory) ? d.diceHistory : [];
            d.combat = d.combat || { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' };
            d.combat.enemies = Array.isArray(d.combat.enemies) ? d.combat.enemies : [];
            d.combat.enemies.forEach((e, idx) => {
                if (!e || typeof e !== 'object') return;
                if (!e.id) e.id = `enemy_migrated_${idx}_${String(e.name || 'unknown').replace(/\s+/g, '_')}`;
                if (e.isEnemy === undefined) e.isEnemy = true;
                e.hp = Number.isFinite(Number(e.hp)) ? Number(e.hp) : 0;
                e.maxHp = Number.isFinite(Number(e.maxHp)) ? Number(e.maxHp) : Math.max(1, e.hp || 1);
                e.armor = Number.isFinite(Number(e.armor)) ? Number(e.armor) : 0;
                if (e.isDefeated === undefined) e.isDefeated = e.hp <= 0;
            });
            d.combat.initiativeOrder = Array.isArray(d.combat.initiativeOrder) ? d.combat.initiativeOrder : [];
            const enemyNamesForMigration = new Set(d.combat.enemies.map(e => e && e.name).filter(Boolean));
            const enemyIdsForMigration = new Set(d.combat.enemies.map(e => e && e.id).filter(Boolean));
            d.combat.initiativeOrder = d.combat.initiativeOrder.map((turn) => {
                if (!turn || typeof turn !== 'object') return null;
                const normalized = { ...turn };
                const matchesEnemy = normalized.isEnemy === true || enemyIdsForMigration.has(normalized.id) || enemyNamesForMigration.has(normalized.name);
                normalized.isEnemy = !!matchesEnemy;
                if (matchesEnemy) {
                    const enemy = d.combat.enemies.find(e => e && ((normalized.id && e.id === normalized.id) || (normalized.name && e.name === normalized.name)));
                    if (enemy) { normalized.id = enemy.id; normalized.name = enemy.name || normalized.name; }
                }
                if (!normalized.id && normalized.name) normalized.id = normalized.name;
                normalized.initiative = Number.isFinite(Number(normalized.initiative)) ? Number(normalized.initiative) : 0;
                return normalized;
            }).filter(Boolean);
            d.chase = _normalizeChaseForSave(d.chase);
            d.sceneMap = _coerceSceneMap(d.sceneMap);
            d.clueBoard = _coerceClueBoard(d.clueBoard);
            d.atmosphere = _coerceAtmosphere(d.atmosphere);
            d.scenarioRunner = _coerceScenarioRunner(d.scenarioRunner);
            if (d.activeCampaign === 'masks_london') {
                d.activeCampaign = null;
                d.campaignArchive = null;
            }
            if (!d.kpState && d.londonKpState) d.kpState = d.londonKpState;
            if (d.londonKpState !== undefined) delete d.londonKpState;
            d.activeCampaign = d.activeCampaign || null;
            d.campaignArchive = d.campaignArchive || null;
            d.arcLedger = d.arcLedger || null;
            d.kpState = d.kpState || null;
            migrateKpEngineField(hadKpEngineKey, d);
            if (d.kpEngine && typeof d.kpEngine === 'object' && d.kpEngine.scenePaths !== undefined) {
                d.kpEngine.scenePaths = _normalizeScenePaths(d.kpEngine.scenePaths);
            }
            d.selectedCharIndex = Number.isFinite(Number(d.selectedCharIndex)) ? Math.max(0, Math.floor(Number(d.selectedCharIndex))) : 0;
            // v9 (ADR-0003 §1, §8): idempotent normalisation, safe to run on every load.
            // Ids are issued once (the registry remembers what each copy was issued) and merges the
            // player confirmed are applied; loadGame writes the save back when any id changed here.
            let idsChanged = identityRegistry.issue(d.roster, { savedAt: migrated.savedAt, scope: 'roster' });
            if (d.arcLedger && Array.isArray(d.arcLedger.characterSnapshot)) {
                idsChanged += identityRegistry.issue(d.arcLedger.characterSnapshot, { savedAt: migrated.savedAt, scope: 'ledger', donors: d.roster });
            }
            idsChanged += identityRegistry.canonicalize(d);
            identityRegistry.observe(d, { label: ctx.label, savedAt: migrated.savedAt });
            if (idsChanged > 0) Object.defineProperty(migrated, '_idsChanged', { value: idsChanged, enumerable: false, configurable: true });
            assignStableIds(d);
            if (sourceVersion < 9) {
                // Pre-v9 parties moved together: rooms explored then belong to the whole roster.
                // The only version-dependent step; v9+ rooms missing exploredBy stay unexplored.
                const everyone = d.roster.map((c) => c && c.invId).filter(Boolean);
                d.sceneMap.rooms.forEach((r) => {
                    if (!Array.isArray(r.exploredBy) && (r.status === 'explored' || r.status === 'current')) {
                        r.exploredBy = everyone.slice();
                    }
                });
            }
            migrated.location = migrated.location || d.currentLocation || '未知的房间';
            migrated.charNames = migrated.charNames || d.roster.map(r => r && r.name).filter(Boolean).join('、');
            migrated.version = SAVE_SCHEMA_VERSION;
            migrated.sourceVersion = sourceVersion;
            return migrated;
        };

        const _stripTransientFields = (value) => {
            if (!value || typeof value !== 'object') return value;
            if (Array.isArray(value)) return value.map(_stripTransientFields);
            const out = {};
            for (const [key, val] of Object.entries(value)) {
                if (key.startsWith('_')) continue;
                out[key] = _stripTransientFields(val);
            }
            return out;
        };

        let _saveTrimDroppedCount = 0;

        const _buildSaveData = (slotName) => {
            assignStableIds(gameState);
            const rawChatToSave = gameState.chatHistory.filter(m => !m.isLocalOnly && !m.isLocalError);
            let chatToSave = rawChatToSave;
            _saveTrimDroppedCount = 0;
            if (CoCContextManager && CoCContextManager.trimForSave) {
                const trimResult = CoCContextManager.trimForSave(rawChatToSave);
                chatToSave = trimResult.messages;
                _saveTrimDroppedCount = trimResult.droppedCount || 0;
            }
            // Drop ephemeral Vue row keys so reloads don't collide with new _vid seq.
            chatToSave = (chatToSave || []).map((m) => {
                if (!m || typeof m !== 'object') return m;
                if (m._vid == null) return m;
                const copy = Object.assign({}, m);
                delete copy._vid;
                return copy;
            });
            const combatToSave = _stripTransientFields(safeJsonClone(gameState.combat, {
                active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: ''
            }));
            const chaseToSave = _stripTransientFields(_normalizeChaseForSave(gameState.chase));
            return {
                version: SAVE_SCHEMA_VERSION,
                savedAt: new Date().toISOString(),
                slotName: slotName || '存档',
                location: gameState.currentLocation,
                moduleId: gameState.activeModuleId,
                charNames: gameState.roster.map(r => r.name).join('、'),
                data: {
                    roster: safeJsonClone(gameState.roster, []),
                    inventory: [...gameState.inventory],
                    storage: [...gameState.storage],
                    currentLocation: gameState.currentLocation,
                    knownLocations: [...gameState.knownLocations],
                    chatHistory: safeJsonClone(chatToSave, []),
                    journalLog: safeJsonClone(gameState.journalLog, []),
                    npcRegistry: safeJsonClone(gameState.npcRegistry, []),
                    combat: combatToSave,
                    chase: chaseToSave,
                    sceneMap: safeJsonClone(gameState.sceneMap, { title: '', rooms: [], currentRoomId: null }),
                    clueBoard: safeJsonClone(gameState.clueBoard, { clues: [], links: [] }),
                    diceHistory: safeJsonClone(gameState.diceHistory, []),
                    atmosphere: safeJsonClone(gameState.atmosphere, { level: 'calm', note: '' }),
                    scenarioRunner: safeJsonClone(gameState.scenarioRunner, { active: false, scenarioId: null, scenarioTitle: '', currentNodeId: null, choices: [], ended: false, flags: {}, pendingBranch: null, pendingScenarioId: null }),
                    activeCampaign: gameState.activeCampaign || null,
                    campaignArchive: safeJsonClone(gameState.campaignArchive, null),
                    arcLedger: safeJsonClone(gameState.arcLedger, null),
                    kpState: safeJsonClone(gameState.kpState, null),
                    kpEngine: gameState.kpEngine ? safeJsonClone({
                        enabled: gameState.kpEngine.enabled,
                        systemName: gameState.kpEngine.systemName,
                        global: gameState.kpEngine.global,
                        sessionStartedAt: gameState.kpEngine.sessionStartedAt,
                        lastEventInjectionAt: gameState.kpEngine.lastEventInjectionAt,
                        combatStrategyLog: gameState.kpEngine.combatStrategyLog,
                        scenePaths: gameState.kpEngine.scenePaths,
                        keyClueBlockedAttempts: gameState.kpEngine.keyClueBlockedAttempts
                    }, null) : null,
                    selectedCharIndex: gameState.selectedCharIndex,
                    moduleSeed: gameState.moduleSeed || 0,
                    encounterVariant: gameState.encounterVariant || null,
                    keeperStyle: gameState.keeperStyle || 'cinematic',
                    mythosHeat: Number(gameState.mythosHeat) || 0,
                    heatEventsLog: safeJsonClone(gameState.heatEventsLog || [], []),
                    skillAttempts: safeJsonClone(gameState.skillAttempts || {}, {}),
                    sanCaps: safeJsonClone(gameState.sanCaps || {}, {}),
                    worldClock: safeJsonClone(gameState.worldClock || { day: 1, hour: 0 }, { day: 1, hour: 0 }),
                    flags: safeJsonClone(gameState.flags || {}, {}),
                    pendingAftermath: safeJsonClone(gameState.pendingAftermath || [], []),
                    customWeapons: safeJsonClone(gameState._customWeapons || {}, {}),
                    endingSaveBlurb: gameState.endingSaveBlurb || '',
                    saveCompareMeta: CoCCapabilitySystem.buildSaveCompareMeta(gameState),
                    saveBlurb: CoCCapabilitySystem.composeSaveBlurb(gameState, (gs) => (
                        (typeof window !== 'undefined' && window.CoCMythosHeat && window.CoCMythosHeat.buildUnreliableSaveBlurb)
                            ? window.CoCMythosHeat.buildUnreliableSaveBlurb(gs)
                            : ''
                    )),
                    contextMeta: { runtimeChatMessages: gameState.chatHistory.length, savedChatMessages: chatToSave.length }
                }
            };
        };

        // ── Storage Estimation ──
        const _estimateStringBytes = (value) => {
            const text = String(value ?? '');
            try { if (typeof Blob !== 'undefined') return new Blob([text]).size; } catch(e) {}
            return text.length * 2;
        };
        const formatStorageBytes = (bytes) => {
            const n = Number(bytes) || 0;
            if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
            if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
            return `${Math.round(n)} B`;
        };
        const _estimateLocalStorageUsage = () => {
            let usedBytes = 0;
            try {
                if (typeof localStorage !== 'undefined' && Number.isFinite(localStorage.length)) {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key === null || key === undefined) continue;
                        const val = localStorage.getItem(key) || '';
                        usedBytes += _estimateStringBytes(key) + _estimateStringBytes(val);
                    }
                }
            } catch(e) {}
            const quotaBytes = LOCAL_STORAGE_QUOTA_ESTIMATE_BYTES;
            return { usedBytes, quotaBytes, usedRatio: quotaBytes ? usedBytes / quotaBytes : 0 };
        };
        /**
         * Estimate localStorage usage and project impact of writing a save.
         * Updates gameState.storageStatus reactively and returns a clone.
         * @param {string} [slotKey='slot1'] - Target slot key
         * @param {string} [slotName='预估存档'] - Label for the estimate
         * @param {string|null} [payloadOverride=null] - Pre-serialized payload for estimation
         * @param {string|null} [targetKeyOverride=null] - Exact storage key for queued writes
         * @returns {Object} storageStatus snapshot {usedBytes, quotaBytes, warning, ...}
         */
        const getStorageStatus = (slotKey = 'slot1', slotName = '预估存档', payloadOverride = null, targetKeyOverride = null) => {
            const current = _estimateLocalStorageUsage();
            const prefix = _getModSavePrefix();
            const targetKey = targetKeyOverride || (prefix + (slotKey || 'slot1'));
            let existingBytes = 0;
            let payload = payloadOverride;
            try {
                const oldValue = localStorage.getItem(targetKey);
                if (oldValue !== null && oldValue !== undefined) existingBytes = _estimateStringBytes(targetKey) + _estimateStringBytes(oldValue);
            } catch(e) {}
            try {
                if (payload === null || payload === undefined) payload = JSON.stringify(_buildSaveData(slotName));
            } catch(e) { payload = ''; }
            const currentSaveBytes = _estimateStringBytes(payload || '');
            const projectedBytes = Math.max(0, current.usedBytes - existingBytes) + _estimateStringBytes(targetKey) + currentSaveBytes;
            const quotaBytes = current.quotaBytes || LOCAL_STORAGE_QUOTA_ESTIMATE_BYTES;
            const projectedRatio = quotaBytes ? projectedBytes / quotaBytes : 0;
            const usedRatio = quotaBytes ? current.usedBytes / quotaBytes : 0;
            let warning = '';
            if (projectedRatio >= 0.98) warning = '本次存档预计接近 localStorage 上限，建议先导出备份并清理旧存档。';
            else if (projectedRatio >= 0.90) warning = '存储空间已高于 90%，长期战役建议导出备份。';
            else if (projectedRatio >= 0.80) warning = '存储空间已高于 80%，请关注后续自动存档。';
            Object.assign(gameState.storageStatus, {
                usedBytes: current.usedBytes, quotaBytes, usedRatio,
                currentSaveBytes, projectedBytes, projectedRatio, warning, lastCheckedAt: Date.now()
            });
            return safeJsonClone(gameState.storageStatus, { usedBytes: 0, quotaBytes, usedRatio: 0, currentSaveBytes, projectedBytes, projectedRatio, warning, lastCheckedAt: Date.now() });
        };

        // ── Save / Load / Delete ──
        const _restoreArray = (target, value) => {
            target.splice(0, target.length, ...(Array.isArray(value) ? value : []));
        };
        const _restoreObject = (target, value) => {
            Object.keys(target).forEach((key) => delete target[key]);
            Object.assign(target, value && typeof value === 'object' ? value : {});
        };
        const _captureRestoreSnapshot = () => safeJsonClone({
            roster: gameState.roster,
            inventory: gameState.inventory,
            storage: gameState.storage,
            knownLocations: gameState.knownLocations,
            journalLog: gameState.journalLog,
            npcRegistry: gameState.npcRegistry,
            diceHistory: gameState.diceHistory,
            chatHistory: gameState.chatHistory,
            combat: gameState.combat,
            sceneMap: gameState.sceneMap,
            clueBoard: gameState.clueBoard,
            atmosphere: gameState.atmosphere,
            scenarioRunner: gameState.scenarioRunner,
            direct: {
                currentLocation: gameState.currentLocation,
                chase: gameState.chase,
                pendingRuleCheck: gameState.pendingRuleCheck,
                pendingRuleChecks: gameState.pendingRuleChecks,
                groupCheckSession: gameState.groupCheckSession,
                lastSkillCheck: gameState.lastSkillCheck,
                _suppressEnemyAttackAuto: gameState._suppressEnemyAttackAuto,
                activeCampaign: gameState.activeCampaign,
                campaignArchive: gameState.campaignArchive,
                arcLedger: gameState.arcLedger,
                kpState: gameState.kpState,
                kpEngine: gameState.kpEngine,
                selectedCharIndex: gameState.selectedCharIndex,
                moduleSeed: gameState.moduleSeed,
                encounterVariant: gameState.encounterVariant,
                keeperStyle: gameState.keeperStyle,
                mythosHeat: gameState.mythosHeat,
                heatEventsLog: gameState.heatEventsLog,
                skillAttempts: gameState.skillAttempts,
                sanCaps: gameState.sanCaps,
                worldClock: gameState.worldClock,
                endingSaveBlurb: gameState.endingSaveBlurb,
                flags: gameState.flags,
                pendingAftermath: gameState.pendingAftermath,
                _customWeapons: gameState._customWeapons
            }
        }, null);
        const _rollbackRestore = (snapshot) => {
            if (!snapshot) return;
            _restoreArray(gameState.roster, snapshot.roster);
            _restoreArray(gameState.inventory, snapshot.inventory);
            _restoreArray(gameState.storage, snapshot.storage);
            _restoreArray(gameState.knownLocations, snapshot.knownLocations);
            _restoreArray(gameState.journalLog, snapshot.journalLog);
            _restoreArray(gameState.npcRegistry, snapshot.npcRegistry);
            _restoreArray(gameState.diceHistory, snapshot.diceHistory);
            _restoreArray(gameState.chatHistory, snapshot.chatHistory);
            _restoreObject(gameState.combat, snapshot.combat);
            _restoreObject(gameState.sceneMap, snapshot.sceneMap);
            _restoreObject(gameState.clueBoard, snapshot.clueBoard);
            _restoreObject(gameState.atmosphere, snapshot.atmosphere);
            _restoreObject(gameState.scenarioRunner, snapshot.scenarioRunner);
            Object.entries(snapshot.direct || {}).forEach(([key, value]) => {
                gameState[key] = safeJsonClone(value, value);
            });
        };
        let _lastRestoreIdsChanged = 0;
        const _restoreFromData = (save, slotName, ctx) => {
            _lastRestoreIdsChanged = 0;
            save = migrateSaveData(save, ctx);
            if (!save) return false;
            _lastRestoreIdsChanged = save._idsChanged || 0;
            const prepared = safeJsonClone(save, null);
            const d = prepared && prepared.data;
            if (!d || !Array.isArray(d.roster)) return false;
            save = prepared;
            const snapshot = _captureRestoreSnapshot();
            try {
            gameState.roster.splice(0, gameState.roster.length, ...d.roster);
            gameState.inventory.splice(0, gameState.inventory.length, ...(d.inventory || []));
            gameState.storage.splice(0, gameState.storage.length, ...(d.storage || []));
            if (d.currentLocation) gameState.currentLocation = d.currentLocation;
            if (d.knownLocations) gameState.knownLocations.splice(0, gameState.knownLocations.length, ...d.knownLocations);
            if (d.journalLog) gameState.journalLog.splice(0, gameState.journalLog.length, ...d.journalLog);
            if (d.npcRegistry) gameState.npcRegistry.splice(0, gameState.npcRegistry.length, ...d.npcRegistry);
            if (d.combat) Object.assign(gameState.combat, d.combat);
            gameState.chase = safeJsonClone(d.chase || _emptyChase(), _emptyChase());
            // Pending dice specs are not in the save contract — clear live queue on load.
            gameState.pendingRuleCheck = null;
            gameState.pendingRuleChecks = [];
            gameState.groupCheckSession = null;
            gameState.lastSkillCheck = null;
            (gameState.roster || []).forEach((c) => { if (c) c.skillsUsedThisSession = []; });
            // Mid-speed-check saves cannot resume rolls; unlock chase actions and refresh economy.
            if (gameState.chase && gameState.chase.active && gameState.chase.speedResolved === false) {
                gameState.chase.speedResolved = true;
                const CE = (CoCEngine && CoCEngine.ChaseEngine)
                    ? CoCEngine.ChaseEngine
                    : null;
                if (CE && typeof CE.actionsFor === 'function') {
                    (gameState.chase.participants || []).forEach((p) => {
                        if (!p) return;
                        if (p.effectiveMov == null && p.mov != null) p.effectiveMov = p.mov;
                        p.actionsLeft = CE.actionsFor(p, gameState.chase);
                    });
                }
            }
            // Avoid remount auto enemy_attack replaying the same turn after load.
            gameState._suppressEnemyAttackAuto = true;
            Object.assign(gameState.sceneMap, _coerceSceneMap(d.sceneMap));
            Object.assign(gameState.clueBoard, _coerceClueBoard(d.clueBoard));
            if (d.diceHistory) gameState.diceHistory.splice(0, gameState.diceHistory.length, ...d.diceHistory);
            Object.assign(gameState.atmosphere, _coerceAtmosphere(d.atmosphere));
            Object.assign(gameState.scenarioRunner, _coerceScenarioRunner(d.scenarioRunner));
            // Orphan skill-check branch cannot complete without pendingRuleCheck — clear and stay on node.
            if (gameState.scenarioRunner && gameState.scenarioRunner.pendingBranch) {
                gameState.scenarioRunner.pendingBranch = null;
            }
            if (gameState.scenarioRunner && gameState.scenarioRunner.deferredNarrative) {
                delete gameState.scenarioRunner.deferredNarrative;
            }
            const droppedLondon = d.activeCampaign === 'masks_london';
            gameState.activeCampaign = droppedLondon ? null : (d.activeCampaign || null);
            gameState.campaignArchive = droppedLondon ? null : (d.campaignArchive ? safeJsonClone(d.campaignArchive, null) : null);
            gameState.arcLedger = d.arcLedger ? safeJsonClone(d.arcLedger, null) : null;
            const kpBag = d.kpState || d.londonKpState;
            gameState.kpState = kpBag ? safeJsonClone(kpBag, null) : null;
            if (gameState.londonKpState) delete gameState.londonKpState;
            if (d.kpEngine) {
                const restoredKp = safeJsonClone(d.kpEngine, {});
                if (restoredKp && typeof restoredKp === 'object') {
                    gameState.kpEngine = restoredKp;
                }
            }
            if (gameState.kpEngine) {
                const lobbyPref = _loadKpPreference(gameState.activeModuleId);
                if (lobbyPref !== null) {
                    gameState.kpEngine.enabled = lobbyPref;
                }
            }
            if (gameState.kpEngine && gameState.kpEngine.enabled && KpExecutionEngine) {
                KpExecutionEngine.loadKpRulesPreset(gameState);
            } else if (gameState.kpEngine && !gameState.kpEngine.enabled) {
                gameState.kpState = null;
            }
            gameState.selectedCharIndex = d.selectedCharIndex || 0;
            gameState.moduleSeed = Number(d.moduleSeed) || 0;
            gameState.encounterVariant = d.encounterVariant || null;
            gameState.keeperStyle = d.keeperStyle || 'cinematic';
            gameState.mythosHeat = Number(d.mythosHeat) || 0;
            gameState.heatEventsLog = Array.isArray(d.heatEventsLog) ? d.heatEventsLog.slice() : [];
            gameState.skillAttempts = (d.skillAttempts && typeof d.skillAttempts === 'object')
                ? safeJsonClone(d.skillAttempts, {})
                : {};
            gameState.sanCaps = (d.sanCaps && typeof d.sanCaps === 'object')
                ? safeJsonClone(d.sanCaps, {})
                : {};
            gameState.worldClock = (d.worldClock && typeof d.worldClock === 'object')
                ? {
                    day: Math.max(1, Number(d.worldClock.day) || 1),
                    hour: Math.max(0, Number(d.worldClock.hour) || 0) % 24
                }
                : { day: 1, hour: 0 };
            gameState.endingSaveBlurb = d.endingSaveBlurb || '';
            gameState.flags = (d.flags && typeof d.flags === 'object') ? d.flags : {};
            gameState.pendingAftermath = Array.isArray(d.pendingAftermath) ? d.pendingAftermath : [];
            gameState._customWeapons = (d.customWeapons && typeof d.customWeapons === 'object')
                ? safeJsonClone(d.customWeapons, {})
                : {};
            if (CoCItemDB) {
                Object.keys(gameState._customWeapons).forEach((k) => {
                    CoCItemDB[k] = gameState._customWeapons[k];
                });
            }
            clampSelectedCharIndex(gameState);
            let cleanupInitiative = core && core.cleanupInitiativeOrder;
            if (!cleanupInitiative && typeof CoCStateAccessor?.getState === 'function') {
                try {
                    const state = CoCStateAccessor.getState();
                    if (state && typeof state.cleanupInitiativeOrder === 'function') {
                        cleanupInitiative = state.cleanupInitiativeOrder.bind(state);
                    }
                } catch (_e) { /* accessor may be unbound during isolated restore */ }
            }
            if (cleanupInitiative) cleanupInitiative();
            // Aftermath is flushed only after the chat rebuild below: flushing here emitted the
            // dice-panel message and marked the spec _emitted, then the rebuild wiped that message.
            const sysPrompt = gameState.chatHistory.find(m => m.role === 'system' && m.isHidden);
            gameState.chatHistory.splice(0, gameState.chatHistory.length);
            if (sysPrompt) gameState.chatHistory.push(sysPrompt);
            const savedChat = (d.chatHistory || []).filter(m => !(m.role === 'system' && m.isHidden));
            gameState.chatHistory.push(...savedChat);
            // Orphaned force-check prompts (no matching pendingRuleCheck) must not stay clickable.
            let voidedChecks = 0;
            gameState.chatHistory.forEach((m) => {
                if (!m || m.isResolved) return;
                const tools = m.tool_calls || [];
                const hasCheck = tools.some((tc) => tc && (
                    (tc.function && tc.function.name === 'request_skill_check')
                    || tc.name === 'request_skill_check'
                    || tc.skill_name
                ));
                if (!hasCheck && !m.forceCheck) return;
                m.isResolved = true;
                tools.forEach((tc) => { if (tc) tc.isResolved = true; });
                voidedChecks += 1;
            });
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `📂 [存档] 已载入"${slotName || save.slotName}"（保存于 ${save.savedAt ? new Date(save.savedAt).toLocaleString('zh-CN') : '未知时间'}）` });
            if (voidedChecks > 0) {
                gameState.chatHistory.push({
                    role: 'system',
                    isLocalOnly: true,
                    isAlert: true,
                    content: `⚠️ [存档] 已作废 ${voidedChecks} 条未完成的检定提示（检定会话不随存档恢复）。请由守秘人重新宣告行动。`
                });
            }
            // Promote queued aftermath now, so its dice panel lands in the rebuilt chat and is
            // not voided by the orphan pass above.
            try {
                const Engine = CoCEngine || null;
                flushAftermathToRuleCheck(gameState, Engine);
            } catch (_e) { /* non-fatal */ }
            compactChatHistory('load');
            return true;
            } catch (_e) {
                _rollbackRestore(snapshot);
                return false;
            }
        };

        /**
         * Save current game state to localStorage under the given slot key.
         * Runs chat compaction first, estimates storage impact, and warns
         * if approaching quota limits.
         * @param {string} slotKey - Save slot key ('auto', 'slot1', 'slot2', 'slot3')
         * @param {string} slotName - Human-readable slot name
         * @returns {Promise<boolean>} true on success
         */

        // ── IndexedDB async storage (non-blocking) ──
        const _idbName = 'coc-engine-saves';
        const _idbVersion = 1;
        let _idb = null;
        const _openIDB = () => {
            if (_idb) return Promise.resolve(_idb);
            return new Promise((resolve, reject) => {
                if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'));
                const req = indexedDB.open(_idbName, _idbVersion);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('saves')) {
                        db.createObjectStore('saves', { keyPath: 'slotKey' });
                    }
                };
                req.onsuccess = (e) => { _idb = e.target.result; resolve(_idb); };
                req.onerror = () => reject(req.error);
            });
        };
        const _idbRecord = (slotKey, payload) => {
            const save = safeJsonParse(payload, null);
            const parsedSavedAt = save && Date.parse(save.savedAt);
            return {
                slotKey,
                payload,
                savedAt: Number.isFinite(parsedSavedAt) ? parsedSavedAt : Date.now()
            };
        };
        const _idbSave = async (slotKey, payload) => {
            try {
                const db = await _openIDB();
                const record = _idbRecord(slotKey, payload);
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('saves', 'readwrite');
                    tx.objectStore('saves').put(record);
                    tx.oncomplete = () => resolve(record);
                    tx.onerror = () => reject(tx.error);
                    tx.onabort = () => reject(tx.error);
                });
            } catch(e) { return null; }
        };
        const _idbLoad = async (slotKey) => {
            try {
                const db = await _openIDB();
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('saves', 'readonly');
                    const req = tx.objectStore('saves').get(slotKey);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => reject(req.error);
                });
            } catch(e) { return null; }
        };
        const _idbDelete = async (slotKey) => {
            try {
                const db = await _openIDB();
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('saves', 'readwrite');
                    tx.objectStore('saves').delete(slotKey);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => reject(tx.error);
                    tx.onabort = () => reject(tx.error);
                });
            } catch(e) { return false; }
        };

        const _idbCache = {};
        let _idbCachePromise = null;
        const _primeIdbCache = () => {
            if (_idbCachePromise) return _idbCachePromise;
            _idbCachePromise = _openIDB().then((db) => new Promise((resolve) => {
                const tx = db.transaction('saves', 'readonly');
                const req = tx.objectStore('saves').openCursor();
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (!cursor) return;
                    if (!Object.prototype.hasOwnProperty.call(_idbCache, cursor.value.slotKey)) {
                        _idbCache[cursor.value.slotKey] = cursor.value;
                    }
                    cursor.continue();
                };
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            })).catch(() => false);
            return _idbCachePromise;
        };
        _primeIdbCache();

        const _shouldArchiveToIdb = (payloadBytes, projectedRatio) => {
            const bytes = Number(payloadBytes) || 0;
            const ratio = Number(projectedRatio) || 0;
            return bytes >= SAVE_IDB_THRESHOLD_BYTES || ratio >= SAVE_IDB_QUOTA_RATIO;
        };

        const _saveQueues = new Map();
        const _persistPreparedSave = async (request) => {
            try {
                const {
                    slotKey,
                    slotName,
                    payload,
                    moduleId,
                    moduleDeleteGeneration,
                    fullKey
                } = request;
                const storageReport = getStorageStatus(slotKey, slotName, payload, fullKey);
                if (storageReport.warning) showToast(storageReport.warning, 'warning', { timeout: 7000 });
                let localOk = false;
                let localError = null;
                try {
                    localStorage.setItem(fullKey, payload);
                    localOk = true;
                } catch (e) {
                    localError = e;
                }
                const archiveToIdb = _shouldArchiveToIdb(storageReport.currentSaveBytes, storageReport.projectedRatio);
                let idbOk = false;
                let idbCleanupFailed = false;
                let moduleWasDeleted = false;
                if (archiveToIdb || !localOk) {
                    const record = await _idbSave(fullKey, payload);
                    idbOk = !!record;
                    moduleWasDeleted = _getModuleDeleteGeneration(moduleId) !== moduleDeleteGeneration;
                    if (idbOk && moduleWasDeleted) {
                        const cleanupOk = await _idbDelete(fullKey);
                        if (cleanupOk) delete _idbCache[fullKey];
                        idbOk = false;
                    } else if (idbOk) {
                        _idbCache[fullKey] = record;
                    }
                } else if (_idbCache[fullKey]) {
                    const cleanupOk = await _idbDelete(fullKey);
                    if (cleanupOk) delete _idbCache[fullKey];
                    else idbCleanupFailed = true;
                }
                getStorageStatus(slotKey, slotName, payload, fullKey);
                if (moduleWasDeleted) {
                    showToast('模组已删除，已取消旧存档写入。', 'warning', { timeout: 5000 });
                    return false;
                }
                if (!localOk && idbOk) {
                    showToast('localStorage 不可用，存档已保存到 IndexedDB。', 'info', { timeout: 5000 });
                }
                if (!localOk && !idbOk) {
                    const msg = _formatStorageError(localError, '存档失败');
                    _pushSystemNotice(`💾 [存档失败] ${msg}`, true);
                    showToast(msg, 'danger');
                } else if (archiveToIdb && !idbOk) {
                    showToast('IndexedDB 备份失败，localStorage 存档仍可用。', 'warning', { timeout: 5000 });
                } else if (idbCleanupFailed) {
                    showToast('旧 IndexedDB 备份清理失败，localStorage 存档仍可用。', 'warning', { timeout: 5000 });
                }
                const saved = localOk || idbOk;
                if (saved) _notifySaveChange({ type: 'save', moduleId, slotKey });
                return saved;
            } catch(e) {
                const msg = _formatStorageError(e, '存档失败');
                console.error(msg, e);
                _pushSystemNotice(`💾 [存档失败] ${msg}`, true);
                showToast(msg, 'danger');
                return false;
            }
        };
        const saveGame = (slotKey, slotName) => {
            let request;
            try {
                compactChatHistory('save');
                // Merges confirmed while this game was open apply to the live state before it is saved.
                identityRegistry.canonicalize(gameState);
                const built = _buildSaveData(slotName);
                identityRegistry.observe(built.data, { label: _sourceLabel(_getModSavePrefix() + slotKey), savedAt: built.savedAt });
                const payload = JSON.stringify(built);
                if (_saveTrimDroppedCount > 0) {
                    showToast('历史已压缩', 'info', { timeout: 5000 });
                }
                const moduleId = _getModuleId();
                request = {
                    slotKey,
                    slotName,
                    payload,
                    moduleId,
                    moduleDeleteGeneration: _getModuleDeleteGeneration(moduleId),
                    fullKey: _getModSavePrefix() + slotKey
                };
            } catch (e) {
                const msg = _formatStorageError(e, '存档失败');
                _pushSystemNotice(`💾 [存档失败] ${msg}`, true);
                showToast(msg, 'danger');
                return Promise.resolve(false);
            }

            const previous = _saveQueues.get(request.fullKey) || Promise.resolve();
            const run = previous.catch(() => false).then(() => _persistPreparedSave(request));
            let tracked;
            tracked = run.finally(() => {
                if (_saveQueues.get(request.fullKey) === tracked) {
                    _saveQueues.delete(request.fullKey);
                }
            });
            _saveQueues.set(request.fullKey, tracked);
            return tracked;
        };

        /**
         * Load a saved game from localStorage and restore all state.
         * @param {string} slotKey - Save slot key to load from
         * @returns {Promise<boolean>} true if loaded successfully
         */
        const _finishSaveLoading = () => {
            try {
                gameState.ui.saveLoading = false;
                gameState.ui.saveLoadingMessage = '';
            } catch (_) {}
        };

        const _emitSaveLoad = (slotKey, ok) => {
            try {
                if (ok && typeof window !== 'undefined' && window.CoCExtensions && window.CoCExtensions.emit) {
                    window.CoCExtensions.emit('save:load', { slot: slotKey });
                }
            } catch (_e) { /* ignore */ }
            return ok;
        };
        const _decodeSavePayload = (payload, fullKey) => {
            if (!payload) return null;
            return migrateSaveData(safeJsonParse(payload, null), { label: _sourceLabel(fullKey) });
        };
        const _saveTimestamp = (save) => {
            const value = save && Date.parse(save.savedAt);
            return Number.isFinite(value) ? value : 0;
        };
        const _readSaveSelection = async (fullKey) => {
            await _primeIdbCache();
            let localRaw = null;
            try { localRaw = localStorage.getItem(fullKey); } catch (_e) {}
            const localSave = _decodeSavePayload(localRaw, fullKey);

            let idbRecord = _idbCache[fullKey] || null;
            if (!idbRecord) {
                idbRecord = await _idbLoad(fullKey);
                if (idbRecord) _idbCache[fullKey] = idbRecord;
            }
            const idbSave = _decodeSavePayload(idbRecord && idbRecord.payload, fullKey);
            if (!localSave) return { save: idbSave, source: idbSave ? 'idb' : null, localSave, idbSave };
            if (!idbSave) return { save: localSave, source: 'local', localSave, idbSave };
            if (_saveTimestamp(idbSave) > _saveTimestamp(localSave)) {
                return { save: idbSave, source: 'idb', localSave, idbSave };
            }
            return { save: localSave, source: 'local', localSave, idbSave };
        };
        /**
         * ADR-0003 §1: investigator ids are issued once. When loading a replica issued ids (pre-v9)
         * or applied a merge / split the player confirmed (§1.1), write that same replica back — its own migrated content, ids included — so the next load
         * reads them instead of issuing new ones. Only the replica that was loaded is touched: the
         * other replica, corrupt originals and IDB-only slots stay as R29.25 requires.
         * @param {string} fullKey
         * @param {{source:'local'|'idb', save:Object}} candidate the replica restored (migrated in place)
         * @returns {Promise<boolean>}
         */
        const _persistIssuedIds = async (fullKey, candidate) => {
            try {
                const payload = JSON.stringify(candidate.save);
                if (candidate.source === 'local') {
                    localStorage.setItem(fullKey, payload);
                    return true;
                }
                const record = await _idbSave(fullKey, payload);
                if (record) _idbCache[fullKey] = record;
                return !!record;
            } catch (e) {
                // Ids stay valid in memory; the user's next save persists them.
                _pushSystemNotice(`💾 [存档] 调查员编号未能写回旧存档：${_formatStorageError(e, '写入失败')}`, true);
                return false;
            }
        };

        const loadGame = async (slotKey) => {
            try {
                const fullKey = _getModSavePrefix() + slotKey;
                gameState.ui.saveLoading = true;
                gameState.ui.saveLoadingMessage = '正在检查存档副本…';
                try {
                    const selection = await _readSaveSelection(fullKey);
                    if (!selection.save) {
                        showToast('存档不存在或所有副本均已损坏。', 'danger');
                        return false;
                    }
                    const candidates = selection.source === 'idb'
                        ? [
                            { source: 'idb', save: selection.idbSave },
                            { source: 'local', save: selection.localSave }
                        ]
                        : [
                            { source: 'local', save: selection.localSave },
                            { source: 'idb', save: selection.idbSave }
                        ];
                    for (const candidate of candidates) {
                        if (!candidate.save) continue;
                        const ok = _restoreFromData(candidate.save, undefined, { label: _sourceLabel(fullKey) });
                        if (!ok) continue;
                        if (_lastRestoreIdsChanged > 0) {
                            await _persistIssuedIds(fullKey, candidate);
                        }
                        _emitSaveLoad(slotKey, true);
                        if (candidate.source === 'idb') {
                            showToast(
                                candidate === candidates[0] && selection.localSave
                                    ? 'IndexedDB 副本较新，已恢复最新存档。'
                                    : 'localStorage 副本无效，已从 IndexedDB 备份恢复。',
                                'info'
                            );
                        } else if (candidate !== candidates[0]) {
                            showToast('IndexedDB 副本无效，已回退到 localStorage 存档。', 'warning');
                        }
                        return true;
                    }
                    showToast('存档恢复失败，当前游戏状态未更改。', 'danger');
                    return false;
                } catch (_e) {
                    showToast('读取存档副本失败。', 'danger');
                    return false;
                } finally {
                    _finishSaveLoading();
                }
            } catch (e) {
                try { _finishSaveLoading(); } catch (_e) {}
                return false;
            }
        };

        // ── Investigator identity (ADR-0003 §1.1) ──
        /**
         * Read every save of every module so the registry has seen each copy, then list same-name
         * pairs for the player to decide on.
         * @returns {Promise<{suggestions:Array, merges:Array}>}
         */
        const scanIdentities = async () => {
            await getModules();
            return { suggestions: identityRegistry.suggestions(), merges: identityRegistry.merges() };
        };
        /** The player confirmed one person. Applies to the open game now and to each save on its next load. */
        const mergeIdentities = (a, b) => {
            const result = identityRegistry.merge(a, b);
            if (result.ok) identityRegistry.canonicalize(gameState);
            return result;
        };
        const markIdentitiesDistinct = (a, b) => identityRegistry.markDistinct(a, b);
        const splitIdentity = (id) => {
            const ok = identityRegistry.split(id);
            if (ok) identityRegistry.canonicalize(gameState);
            return ok;
        };

        const deleteSave = async (slotKey) => {
            const fullKey = _getModSavePrefix() + slotKey;
            let localOk = true;
            try {
                localStorage.removeItem(fullKey);
            } catch(e) {
                localOk = false;
            }
            const idbOk = await _idbDelete(fullKey);
            if (idbOk) delete _idbCache[fullKey];
            getStorageStatus(slotKey, '预估存档');
            const deleted = localOk && idbOk;
            _notifySaveChange({ type: 'delete', moduleId: _getModuleId(), slotKey, ok: deleted });
            return deleted;
        };

        const _readSavePayload = async (fullKey) => {
            const selection = await _readSaveSelection(fullKey);
            return selection.save;
        };

        const getSaveSlots = async () => {
            const prefix = _getModSavePrefix();
            return Promise.all(['slot1','slot2','slot3'].map(async (key, i) => {
                try {
                    const s = await _readSavePayload(prefix + key);
                    if (!s) return { key, label: '槽位 ' + (i+1), hasData: false };
                    return { key, label: '槽位 ' + (i+1), hasData: true, charNames: s.charNames, location: s.location, savedAt: s.savedAt ? new Date(s.savedAt).toLocaleString('zh-CN') : '?', slotName: s.slotName, saveBlurb: (s.data && s.data.saveBlurb) || s.saveBlurb || '', arcLedgerBlurb: _arcLedgerBlurb(s.data && s.data.arcLedger), arcMeta: _arcLedgerMeta(s.data && s.data.arcLedger), saveCompareMeta: (s.data && s.data.saveCompareMeta) || null };
                } catch(e) { return { key, label: '槽位 ' + (i+1), hasData: false }; }
            }));
        };

        const getAutoSave = async () => {
            try {
                const s = await _readSavePayload(_getModSavePrefix() + 'auto');
                if (!s) return null;
                return {
                    key: 'auto',
                    hasData: true,
                    charNames: s.charNames,
                    location: s.location,
                    savedAt: s.savedAt ? new Date(s.savedAt).toLocaleString('zh-CN') : '?',
                    slotName: s.slotName,
                    saveBlurb: (s.data && s.data.saveBlurb) || s.saveBlurb || '',
                    arcLedgerBlurb: _arcLedgerBlurb(s.data && s.data.arcLedger),
                    arcMeta: _arcLedgerMeta(s.data && s.data.arcLedger),
                    saveCompareMeta: (s.data && s.data.saveCompareMeta) || null
                };
            } catch(e) { return null; }
        };

        const _replicaView = (raw, fullKey) => {
            if (raw == null || raw === '') {
                return { present: false, valid: false, savedAt: null, location: '', error: '' };
            }
            const parsed = safeJsonParse(raw, null);
            if (!parsed) {
                return { present: true, valid: false, savedAt: null, location: '', error: 'invalid-json' };
            }
            const save = migrateSaveData(safeJsonClone(parsed, null), { label: _sourceLabel(fullKey) });
            if (!save) {
                return { present: true, valid: false, savedAt: parsed.savedAt || null, location: '', error: 'invalid-save' };
            }
            return {
                present: true,
                valid: true,
                savedAt: save.savedAt || null,
                location: save.location || (save.data && save.data.currentLocation) || '',
                error: ''
            };
        };
        const _readRawReplicas = async (fullKey) => {
            await _primeIdbCache();
            let localRaw = null;
            try { localRaw = localStorage.getItem(fullKey); } catch (_e) {}
            let idbRecord = _idbCache[fullKey] || null;
            if (!idbRecord) idbRecord = await _idbLoad(fullKey);
            return { localRaw, idbRaw: idbRecord && idbRecord.payload ? idbRecord.payload : null };
        };
        const _inspectSlot = async (slotKey) => {
            const fullKey = _getModSavePrefix() + slotKey;
            const raw = await _readRawReplicas(fullKey);
            const local = _replicaView(raw.localRaw, fullKey);
            const idb = _replicaView(raw.idbRaw, fullKey);
            const selection = await _readSaveSelection(fullKey);
            const diverged = !!(local.valid && idb.valid && local.savedAt !== idb.savedAt);
            return {
                slotKey,
                fullKey,
                local,
                idb,
                selected: selection.source,
                needsRepair: !!(selection.save && ((selection.source === 'local' && !idb.valid) || (selection.source === 'idb' && !local.valid))),
                diverged,
                canCleanup: !!((local.present && !local.valid && idb.valid) || (idb.present && !idb.valid && local.valid))
            };
        };
        const diagnoseSaves = async () => {
            const slots = [];
            for (const slotKey of ['auto', 'slot1', 'slot2', 'slot3']) {
                slots.push(await _inspectSlot(slotKey));
            }
            return {
                moduleId: _getModuleId(),
                generatedAt: new Date().toISOString(),
                schemaVersion: SAVE_SCHEMA_VERSION,
                slots
            };
        };
        const _downloadJson = (filename, value) => {
            if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') return false;
            const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            return true;
        };
        const exportSaveDiagnostics = async () => {
            const report = await diagnoseSaves();
            const downloaded = _downloadJson('CoC_save_diagnostics.json', report);
            if (!downloaded && typeof document !== 'undefined') showToast('诊断报告导出失败。', 'danger');
            return report;
        };
        const _storeDiagnosticBackup = (entries) => {
            const id = 'coc_diag_backup_' + Date.now();
            const ok = _safeLocalStorageSetItem(id, JSON.stringify({
                id,
                createdAt: new Date().toISOString(),
                entries
            }), '存档诊断备份');
            return ok ? id : null;
        };
        const repairSaveReplica = async (slotKey, options = {}) => {
            if (!options || options.confirmed !== true) return { ok: false, reason: 'confirmation-required' };
            const inspection = await _inspectSlot(slotKey);
            const raw = await _readRawReplicas(inspection.fullKey);
            const sourceRaw = inspection.selected === 'local' ? raw.localRaw : raw.idbRaw;
            const target = inspection.selected === 'local' ? 'idb' : 'local';
            const targetView = target === 'idb' ? inspection.idb : inspection.local;
            if (!inspection.selected || !sourceRaw) return { ok: false, reason: 'no-valid-replica' };
            if (targetView.valid && !inspection.diverged) return { ok: true, reason: 'already-aligned', backupId: null };
            if (targetView.valid && inspection.diverged && options.overwriteValid !== true) {
                return { ok: false, reason: 'diverged-valid-replicas' };
            }
            const backupId = _storeDiagnosticBackup([{
                fullKey: inspection.fullKey,
                source: target,
                payload: target === 'local' ? raw.localRaw : raw.idbRaw
            }]);
            if (!backupId) return { ok: false, reason: 'backup-failed' };
            if (target === 'local') {
                if (!_safeLocalStorageSetItem(inspection.fullKey, sourceRaw, '修复 localStorage 副本')) {
                    return { ok: false, reason: 'write-failed', backupId };
                }
            } else {
                const record = await _idbSave(inspection.fullKey, sourceRaw);
                if (!record) return { ok: false, reason: 'write-failed', backupId };
                _idbCache[inspection.fullKey] = record;
            }
            _notifySaveChange({ type: 'repair', moduleId: _getModuleId(), slotKey });
            return { ok: true, reason: 'repaired', backupId, target };
        };
        const cleanupInvalidReplica = async (slotKey, options = {}) => {
            if (!options || options.confirmed !== true) return { ok: false, reason: 'confirmation-required' };
            const inspection = await _inspectSlot(slotKey);
            if (!inspection.canCleanup) return { ok: false, reason: 'nothing-to-clean' };
            const raw = await _readRawReplicas(inspection.fullKey);
            const entries = [];
            if (inspection.local.present && !inspection.local.valid) {
                entries.push({ fullKey: inspection.fullKey, source: 'local', payload: raw.localRaw });
            }
            if (inspection.idb.present && !inspection.idb.valid) {
                entries.push({ fullKey: inspection.fullKey, source: 'idb', payload: raw.idbRaw });
            }
            const backupId = _storeDiagnosticBackup(entries);
            if (!backupId) return { ok: false, reason: 'backup-failed' };
            if (inspection.local.present && !inspection.local.valid) {
                try { localStorage.removeItem(inspection.fullKey); } catch (_e) {
                    return { ok: false, reason: 'cleanup-failed', backupId };
                }
            }
            if (inspection.idb.present && !inspection.idb.valid) {
                const deleted = await _idbDelete(inspection.fullKey);
                if (!deleted) return { ok: false, reason: 'cleanup-failed', backupId };
                delete _idbCache[inspection.fullKey];
            }
            _notifySaveChange({ type: 'cleanup', moduleId: _getModuleId(), slotKey });
            return { ok: true, reason: 'cleaned', backupId };
        };

        const exportGame = () => {
            try {
                const saveData = _buildSaveData('导出存档');
                const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const name = gameState.roster.map(r => r.name).join('_') || '调查员';
                const modMeta = safeJsonParse(localStorage.getItem(MOD_META_PRE + gameState.activeModuleId + '_meta'), {});
                a.download = 'CoC_' + (modMeta.name || '模组') + '_' + name + '_' + new Date().toLocaleDateString('zh-CN').replace(/\//g,'-') + '.json';
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            } catch(e) { showToast('导出失败：' + (e && e.message ? e.message : e), 'danger'); }
        };

        const importGame = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const save = migrateSaveData(safeJsonParse(e.target.result, null), { label: '导入文件 ' + ((file && file.name) || '') });
                        if (!save || !save.data) return reject('文件格式不对，非CoC存档文件。');
                        if (save.moduleId && gameState.activeModuleId
                            && String(save.moduleId) !== String(gameState.activeModuleId)) {
                            return reject(`存档属于模组「${save.moduleId}」，当前为「${gameState.activeModuleId}」。请先切换模组再导入。`);
                        }
                        const ok = _restoreFromData(save, save.slotName);
                        ok ? resolve() : reject('数据恢复失败');
                    } catch(err) { reject('解析失败: ' + err.message); }
                };
                reader.onerror = () => reject('文件读取失败');
                reader.readAsText(file);
            });
        };

        return { formatStorageBytes, getStorageStatus, saveGame, loadGame, deleteSave,
                 getSaveSlots, getAutoSave, diagnoseSaves, exportSaveDiagnostics,
                 repairSaveReplica, cleanupInvalidReplica, exportGame, importGame,
                 getModules, createModule, renameModule, deleteModule, enterModule,
                 scanIdentities, mergeIdentities, markIdentitiesDistinct, splitIdentity,
                 migrateSaveData, _buildSaveData, _restoreFromData,
                 _shouldArchiveToIdb, SAVE_IDB_THRESHOLD_BYTES, SAVE_IDB_QUOTA_RATIO };
    };
    return { create };
})();
