// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { safeJsonParse, safeJsonClone } from '../data/utils.mjs';
import { CoCStateCore } from './core.mjs';
import { CoCStateUI } from './ui.mjs';
import { CoCStateGameplay } from './gameplay.mjs';
import { CoCStatePersistence, SAVE_SCHEMA_VERSION } from './persistence.mjs';
import { clampSelectedCharIndex as clampSelectedCharIndexShared, resolveSelectedActiveChar } from './selection.mjs';

/**
 * CoC State — unified entry point.
 *
 * Creates reactive state via CoCStateCore, then composes UI, gameplay,
 * and persistence modules.  The final public API is backward-compatible
 * with the pre-split monolithic state.js.
 */

export function createAutoSaveController(gameState, saveGame, pushSystemNotice, options = {}) {
    const delay = Number.isFinite(Number(options.delay)) ? Number(options.delay) : 8000;
    const setTimer = options.setTimer || setTimeout;
    const clearTimer = options.clearTimer || clearTimeout;
    let timer = null;
    let generation = 0;

    const cancel = () => {
        generation += 1;
        if (timer !== null) clearTimer(timer);
        timer = null;
    };

    const sync = () => {
        cancel();
        if (gameState.roster.length === 0 || gameState.currentScreen !== 'story') return;
        const scheduledModuleId = gameState.activeModuleId || 'default';
        const scheduledGeneration = generation;
        timer = setTimer(() => {
            if (scheduledGeneration !== generation) return;
            timer = null;
            if (gameState.roster.length === 0
                || gameState.currentScreen !== 'story'
                || (gameState.activeModuleId || 'default') !== scheduledModuleId) {
                return;
            }
            Promise.resolve(saveGame('auto', '自动存档')).catch((e) => {
                pushSystemNotice(`💾 [自动存档] ${e && e.message ? e.message : '写入失败'}`, true);
            });
        }, delay);
    };

    return { sync, cancel };
}

/**
 * @role    程序员 (Programmer)
 * @owner   引擎核心 / AI调度 / 状态管理
 * @caution 策划/美术请勿直接修改此文件
 */
export const CoCState = (function(Vue) {
    if (!Vue) return {};

    // 1. Core: reactive objects + basic navigation
    const core = CoCStateCore;
    if (!core || !core.gameState) return {};

    // 2. UI: toast/confirm/compaction
    const uiMod = (CoCStateUI && CoCStateUI.create) ? CoCStateUI.create(core) : {};

    // 3. Gameplay: combat/dice/clues/map/growth/NPC
    const gpMod = (CoCStateGameplay && CoCStateGameplay.create) ? CoCStateGameplay.create(core) : {};

    // 4. Persistence: save/load/migration/modules
    const persistMod = (CoCStatePersistence && CoCStatePersistence.create) ? CoCStatePersistence.create(core, uiMod) : {};

    // Merge all public methods
    const api = {
        ...core,
        ...uiMod,
        ...gpMod,
        ...persistMod,
    };

    const { gameState, playerInput, draftChar, activeCreatorTab, scrollToBottom } = core;
    const { compactChatHistory, _pushSystemNotice } = uiMod;
    const { cleanupInitiativeOrder } = gpMod;
    const { saveGame } = persistMod;

    // ── Watchers ──
    const autoSaveController = createAutoSaveController(
        gameState,
        saveGame,
        _pushSystemNotice
    );
    Vue.watch(
        () => [
            gameState.roster.length,
            gameState.inventory.length,
            gameState.currentLocation,
            gameState.currentScreen,
            gameState.activeModuleId
        ],
        autoSaveController.sync
    );

    Vue.watch(
        () => gameState.chatHistory.length,
        (len) => { if (len > 280) compactChatHistory('watch'); }
    );

    Vue.watch(
        () => gameState.roster.map(c => `${c && c.name}:${c && c.isActive}`).join('|') + `:${gameState.roster.length}`,
        () => { clampSelectedCharIndex(gameState); cleanupInitiativeOrder(); }
    );

    // ── Startup init ──
    if (persistMod._ensureModList) persistMod._ensureModList();
    try {
        const modList = safeJsonParse(localStorage.getItem('coc_module_list'), ['default']);
        if (modList.length <= 1) {
            gameState.activeModuleId = modList[0] || 'default';
            gameState.currentScreen = 'lobby';
        }
    } catch(e) { gameState.currentScreen = 'lobby'; }

    // ── Public API (backward-compatible) ──
    return {
        gameState, playerInput, draftChar, activeCreatorTab,
        scrollToBottom: core.scrollToBottom,
        switchScreen: core.switchScreen,
        showModal: core.showModal,
        closeModal: core.closeModal,
        showToast: uiMod.showToast,
        confirmAction: uiMod.confirmAction,
        resolveConfirm: uiMod.resolveConfirm,
        compactChatHistory: uiMod.compactChatHistory,
        saveSettings: uiMod.saveSettings,
        formatStorageBytes: persistMod.formatStorageBytes,
        getStorageStatus: persistMod.getStorageStatus,
        saveGame: persistMod.saveGame,
        loadGame: persistMod.loadGame,
        deleteSave: persistMod.deleteSave,
        getSaveSlots: persistMod.getSaveSlots,
        getAutoSave: persistMod.getAutoSave,
        diagnoseSaves: persistMod.diagnoseSaves,
        exportSaveDiagnostics: persistMod.exportSaveDiagnostics,
        repairSaveReplica: persistMod.repairSaveReplica,
        cleanupInvalidReplica: persistMod.cleanupInvalidReplica,
        exportGame: persistMod.exportGame,
        importGame: persistMod.importGame,
        getModules: persistMod.getModules,
        createModule: persistMod.createModule,
        renameModule: persistMod.renameModule,
        deleteModule: persistMod.deleteModule,
        enterModule: persistMod.enterModule,
        scanIdentities: persistMod.scanIdentities,
        mergeIdentities: persistMod.mergeIdentities,
        markIdentitiesDistinct: persistMod.markIdentitiesDistinct,
        splitIdentity: persistMod.splitIdentity,
        addJournalEntry: core.addJournalEntry,
        addNpc: gpMod.addNpc,
        updateNpcStatus: gpMod.updateNpcStatus,
        addNpcNote: gpMod.addNpcNote,
        startCombat: gpMod.startCombat,
        endCombat: gpMod.endCombat,
        updateEnemy: gpMod.updateEnemy,
        advanceTurn: gpMod.advanceTurn,
        cleanupInitiativeOrder: gpMod.cleanupInitiativeOrder,
        clampSelectedCharIndex: (gs) => clampSelectedCharIndexShared(gs || gameState),
        resolveSelectedActiveChar: (gs) => resolveSelectedActiveChar(gs || gameState),
        rollImprovement: gpMod.rollImprovement,
        rollEduImprovement: gpMod.rollEduImprovement,
        applyAging: gpMod.applyAging,
        clearSessionSkills: gpMod.clearSessionSkills,
        removeCharacterAt: gpMod.removeCharacterAt,
        createMap: gpMod.createMap,
        updateRoom: gpMod.updateRoom,
        setPosition: gpMod.setPosition,
        addClue: gpMod.addClue,
        linkClues: gpMod.linkClues,
        markClueStatus: gpMod.markClueStatus,
        clearClueBoard: gpMod.clearClueBoard,
        rollCustomDice: gpMod.rollCustomDice,
        groupRoll: gpMod.groupRoll,
        __testing: {
            SAVE_SCHEMA_VERSION,
            migrateSaveData: (save, ctx) => persistMod.migrateSaveData(safeJsonClone(save, null), ctx),
            buildSaveData: persistMod._buildSaveData,
            restoreFromData: persistMod._restoreFromData,
            shouldArchiveToIdb: persistMod._shouldArchiveToIdb,
            SAVE_IDB_THRESHOLD_BYTES: persistMod.SAVE_IDB_THRESHOLD_BYTES,
            SAVE_IDB_QUOTA_RATIO: persistMod.SAVE_IDB_QUOTA_RATIO
        }
    };
})(window.Vue);

function clampSelectedCharIndex(gs) {
    return clampSelectedCharIndexShared(gs);
}

if (typeof window !== 'undefined') {
    window.CoCState = CoCState;
}
