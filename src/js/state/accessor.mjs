// V18.1: CoCState accessor — decoupling bridge (ESM boot)
// Prefer: import { CoCStateAccessor } from this module (UI/views/rule_check since R29.3).
// window.CoCStateAccessor kept for legacy shell + Node smoke mocks (IIFE window-first).
// CoCState remains window-bound (Vue reactive core). Engine / ItemDB prefer ESM.

import { CoCEngine } from '../coc.mjs';
import { CoCItemDB } from '../data/items.mjs';
import { ensureInvIds } from './char_record.mjs';

function createCoCStateAccessor() {
    let _state = null;

    function ensure() {
        if (!_state) {
            const fromWin = (typeof window !== 'undefined') ? window.CoCState : null;
            // Require live gameState — empty {} from pre-Vue ESM must not bind.
            if (fromWin && fromWin.gameState) _state = fromWin;
        }
        if (!_state || !_state.gameState) {
            throw new Error('CoCState not loaded — ensure state.mjs runs before accessor.mjs');
        }
        return _state;
    }

    function engine() {
        if (CoCEngine) return CoCEngine;
        return (typeof window !== 'undefined') ? window.CoCEngine : null;
    }
    function itemDb() {
        if (CoCItemDB) return CoCItemDB;
        return (typeof window !== 'undefined') ? window.CoCItemDB : null;
    }

    return {
        getRoster:       function() { return ensure().gameState.roster; },
        getActiveChar:   function() {
            const s = ensure();
            if (typeof s.resolveSelectedActiveChar === 'function') {
                return s.resolveSelectedActiveChar(s.gameState);
            }
            const roster = s.gameState.roster || [];
            if (typeof s.clampSelectedCharIndex === 'function') s.clampSelectedCharIndex(s.gameState);
            const idx = Math.max(0, Math.min(Number(s.gameState.selectedCharIndex) || 0, Math.max(0, roster.length - 1)));
            const at = roster[idx];
            if (at && at.isActive) return at;
            return roster.find((c) => c && c.isActive) || null;
        },
        addToRoster:     function(c) { const r = ensure().gameState.roster; r.push(c); ensureInvIds(r); },
        findChar:        function(name) {
            const roster = ensure().gameState.roster || [];
            const matches = roster.filter((c) => c && c.name === name);
            if (!matches.length) return null;
            return matches.find((c) => c.isActive) || matches[0];
        },
        clampSelectedCharIndex: function(gs) { const s = ensure(); return s.clampSelectedCharIndex ? s.clampSelectedCharIndex(gs || s.gameState) : 0; },
        resolveSelectedActiveChar: function(gs) {
            const s = ensure();
            if (typeof s.resolveSelectedActiveChar === 'function') return s.resolveSelectedActiveChar(gs || s.gameState);
            return null;
        },

        showToast:       function(msg, type, opts) { const s = ensure(); if (s.showToast) s.showToast(msg, type, opts); },
        pushMessage:     function(msg) { const s = ensure(); if (s.pushMessageBatched) s.pushMessageBatched(msg); },
        getChatHistory:  function() { return ensure().gameState.chatHistory; },
        isLoading:       function() { return ensure().gameState.isLoading; },
        confirmAction:   function(msg, opts) { const s = ensure(); return s.confirmAction ? s.confirmAction(msg, opts) : Promise.resolve(false); },
        scrollToBottom:  function() { const s = ensure(); if (s.scrollToBottom) s.scrollToBottom(); },

        getCombat:       function() { return ensure().gameState.combat; },
        isCombatActive:  function() { const c = ensure().gameState.combat; return c && c.active; },
        getEnemies:      function() { const c = ensure().gameState.combat; return c ? c.enemies || [] : []; },
        getChase:        function() { return ensure().gameState.chase; },
        isChaseActive:   function() { const c = ensure().gameState.chase; return !!(c && c.active); },
        advanceTurn:     function() { const s = ensure(); if (typeof s.advanceTurn === 'function') s.advanceTurn(); },
        updateEnemy:     function(name, hpChange, note) {
            const s = ensure();
            if (typeof s.updateEnemy === 'function') return s.updateEnemy(name, hpChange, note);
            return false;
        },
        setPlayerInput:  function(text) {
            const s = ensure();
            if (s.playerInput && typeof s.playerInput === 'object') s.playerInput.value = text == null ? '' : String(text);
        },
        addJournalEntry: function(entry) {
            const s = ensure();
            if (typeof s.addJournalEntry === 'function') return s.addJournalEntry(entry);
        },
        markClueStatus:  function(id, status, note) {
            const s = ensure();
            if (typeof s.markClueStatus === 'function') return s.markClueStatus(id, status, note);
        },
        updateNpcStatus: function(name, status, note) {
            const s = ensure();
            if (typeof s.updateNpcStatus === 'function') return s.updateNpcStatus(name, status, note);
        },
        addNpcNote:      function(id, note) {
            const s = ensure();
            if (typeof s.addNpcNote === 'function') return s.addNpcNote(id, note);
        },
        rollImprovement: function(charName, skillName) {
            const s = ensure();
            return typeof s.rollImprovement === 'function' ? s.rollImprovement(charName, skillName) : null;
        },
        rollEduImprovement: function(charName) {
            const s = ensure();
            return typeof s.rollEduImprovement === 'function' ? s.rollEduImprovement(charName) : null;
        },
        applyAging:      function(charName) {
            const s = ensure();
            return typeof s.applyAging === 'function' ? s.applyAging(charName) : null;
        },
        clearSessionSkills: function() {
            const s = ensure();
            if (typeof s.clearSessionSkills === 'function') s.clearSessionSkills();
        },
        /** Vue Options API setup(): shallow-copy CoCState bind (same reactive refs). */
        bindVueSetup:    function(extra) {
            try {
                const state = this.getState();
                return Object.assign({}, state, extra || {});
            } catch (_e) {
                return Object.assign({
                    gameState: { roster: [], selectedCharIndex: 0, currentScreen: '?' },
                    clampSelectedCharIndex: function () { return 0; }
                }, extra || {});
            }
        },

        getCurrentLocation: function() { return ensure().gameState.currentLocation; },
        getSceneMap:     function() { return ensure().gameState.sceneMap; },
        getClueBoard:    function() { return ensure().gameState.clueBoard; },

        getInventory:    function(charName) { const c = charName ? this.findChar(charName) : this.getActiveChar(); return c ? c.inventory || [] : []; },
        getEquipment:    function(charName) { const c = charName ? this.findChar(charName) : this.getActiveChar(); return c ? c.equipment || {} : {}; },
        getEquipSlots:   function() { const db = itemDb(); return db && db.EQUIP_SLOTS ? db.EQUIP_SLOTS : {}; },
        resolveItem:     function(item) {
            if (!item) return {};
            if (typeof item === 'object' && item.name) return item;
            const db = itemDb();
            return db && db.resolve ? db.resolve(item) : { name: String(item), category: '杂物', tier: 'C' };
        },
        getSlotForItem:  function(item) { const db = itemDb(); return db && db.getSlotForItem ? db.getSlotForItem(item) : null; },
        canReplaceItem:  function(existing, newcomer) { const db = itemDb(); return db && db.canReplace ? db.canReplace(existing, newcomer) : true; },
        getItemTier:     function(tier) { const db = itemDb(); return db && db.TIERS ? db.TIERS[tier] : null; },

        getNpcRoster:    function() { return ensure().gameState.npcRegistry || []; },
        getNpcRegistry:  function() { return this.getNpcRoster(); },

        saveGame:        function(slot, name) { const s = ensure(); if (s.saveGame) return s.saveGame(slot, name); },
        loadGame:        function(slot) { const s = ensure(); if (s.loadGame) return s.loadGame(slot); return false; },
        deleteSave:      function(slot) { const s = ensure(); if (s.deleteSave) return s.deleteSave(slot); },
        getSaveSlots:    function() { const s = ensure(); return s.getSaveSlots ? s.getSaveSlots() : []; },
        getAutoSave:     function() { const s = ensure(); return s.getAutoSave ? s.getAutoSave() : null; },
        scanIdentities:  async function() { const s = ensure(); return s.scanIdentities ? s.scanIdentities() : { suggestions: [], merges: [] }; },
        mergeIdentities: function(a, b) { const s = ensure(); return s.mergeIdentities ? s.mergeIdentities(a, b) : { ok: false, reason: 'unavailable' }; },
        markIdentitiesDistinct: function(a, b) { const s = ensure(); return s.markIdentitiesDistinct ? s.markIdentitiesDistinct(a, b) : { ok: false }; },
        splitIdentity:   function(id) { const s = ensure(); return s.splitIdentity ? s.splitIdentity(id) : { ok: false }; },
        diagnoseSaves:   function() { const s = ensure(); return s.diagnoseSaves ? s.diagnoseSaves() : null; },
        exportSaveDiagnostics: function() { const s = ensure(); return s.exportSaveDiagnostics ? s.exportSaveDiagnostics() : null; },
        repairSaveReplica: function(slot, options) { const s = ensure(); return s.repairSaveReplica ? s.repairSaveReplica(slot, options) : { ok: false, reason: 'unavailable' }; },
        cleanupInvalidReplica: function(slot, options) { const s = ensure(); return s.cleanupInvalidReplica ? s.cleanupInvalidReplica(slot, options) : { ok: false, reason: 'unavailable' }; },
        getStorageStatus:function(slot, name, payload) { const s = ensure(); return s.getStorageStatus ? s.getStorageStatus(slot, name, payload) : {}; },
        getModules:      async function() { const s = ensure(); return s.getModules ? s.getModules() : []; },
        createModule:    function(name) { const s = ensure(); return s.createModule ? s.createModule(name) : null; },
        renameModule:    function(id, name) { const s = ensure(); return s.renameModule ? s.renameModule(id, name) : false; },
        deleteModule:    function(id) { return ensure().deleteModule ? ensure().deleteModule(id) : false; },
        enterModule:     function(id) { const s = ensure(); if (s.enterModule) s.enterModule(id); },

        rollCustomDice:  function(notation, label, rolledBy, context, opts) {
            const s = ensure();
            return s.rollCustomDice ? s.rollCustomDice(notation, label, rolledBy, context, opts) : null;
        },
        checkSkill:      function(skillName, char, difficulty, options) {
            const e = engine();
            return e && e.checkSkill ? e.checkSkill(skillName, char, difficulty, options) : null;
        },
        executePushedRoll: function(skillName, char, difficulty) {
            const e = engine();
            return e && e.executePushedRoll ? e.executePushedRoll(skillName, char, difficulty) : null;
        },
        canAttemptSkill: function(spec) {
            const e = engine();
            return e && e.canAttemptSkill ? e.canAttemptSkill(ensure().gameState, spec) : { ok: true };
        },
        recordSkillAttempt: function(spec, result) {
            const e = engine();
            if (e && e.recordSkillAttempt) e.recordSkillAttempt(ensure().gameState, spec, result);
        },
        isVisibleSkillName: function(name) {
            const e = engine();
            return e && e.isVisibleSkillName ? e.isVisibleSkillName(name) : true;
        },
        getSkillDef:     function(name) {
            const e = engine();
            return e && e.BaseSkills ? e.BaseSkills[name] : undefined;
        },

        switchScreen:    function(screen) { const s = ensure(); if (s.switchScreen) s.switchScreen(screen); },
        getActiveTab:    function() {
            const gs = ensure().gameState;
            return (gs.ui && gs.ui.openStoryTab) || null;
        },

        getState:        function() { return ensure(); },
        getGameState:    function() { return ensure().gameState; }
    };
}

export const CoCStateAccessor = createCoCStateAccessor();

if (typeof window !== 'undefined' && !window.CoCStateAccessor) {
    // Avoid clobbering Node smoke mocks set before dynamic import.
    window.CoCStateAccessor = CoCStateAccessor;
}
