/**
 * Tool-handler rollback (moved out of ai_logic so it can be tested directly).
 *
 * When a handler throws, ai_logic tells the player "本次工具状态已回滚", so the snapshot must
 * cover every piece of state a handler can write before throwing. Keys added in R29.66:
 * flags / mythosHeat / heatEventsLog (pressure bus), kpState + kpEngine (advance_time copies
 * worldClock into kpState.TIME; add_clue / mark_clue_status write scenePaths and
 * keyClueBlockedAttempts), currentLocation / knownLocations / atmosphere (set_position, effects),
 * journalLog / storage / diceHistory, lastSkillCheck (spend_luck).
 */
import { safeJsonClone } from './network.mjs';

/** Snapshot keys restored by plain replacement (value may be null). */
const REPLACE_KEYS = Object.freeze([
    'pendingRuleCheck', 'lastSkillCheck', 'kpState', 'mythosHeat', 'currentLocation'
]);

/** kpEngine fields that are static preset data, not run state: kept by reference, never cloned. */
const KP_ENGINE_STATIC = Object.freeze(['rules']);

function kpEngineState(kp) {
    if (!kp || typeof kp !== 'object') return kp == null ? null : kp;
    const out = {};
    for (const k of Object.keys(kp)) if (!KP_ENGINE_STATIC.includes(k)) out[k] = kp[k];
    return out;
}

function replaceArray(target, source) {
    target.splice(0, target.length, ...(Array.isArray(source) ? source : []));
}

/** Replace an object's own keys in place (keeps Vue reactivity on the same object). */
function replaceObjectInPlace(target, source, keep = []) {
    Object.keys(target).forEach((k) => {
        if (keep.includes(k)) return;
        if (!Object.prototype.hasOwnProperty.call(source, k)) delete target[k];
    });
    Object.assign(target, source);
}

/**
 * @param {{ gameState: object, itemDb?: object|null }} deps
 */
export function createToolSnapshotApi({ gameState, itemDb = null }) {
    const makeToolSnapshot = () => safeJsonClone({
        roster: gameState.roster,
        inventory: gameState.inventory,
        storage: gameState.storage || [],
        combat: gameState.combat,
        chase: gameState.chase,
        clueBoard: gameState.clueBoard,
        npcRegistry: gameState.npcRegistry,
        sceneMap: gameState.sceneMap,
        pendingRuleCheck: gameState.pendingRuleCheck,
        pendingRuleChecks: gameState.pendingRuleChecks || [],
        skillAttempts: gameState.skillAttempts || {},
        pendingAftermath: gameState.pendingAftermath || [],
        scenarioRunner: gameState.scenarioRunner || null,
        sanCaps: gameState.sanCaps || {},
        worldClock: gameState.worldClock || { day: 1, hour: 0 },
        customWeapons: gameState._customWeapons || {},
        flags: gameState.flags || {},
        mythosHeat: gameState.mythosHeat == null ? 0 : gameState.mythosHeat,
        heatEventsLog: gameState.heatEventsLog || [],
        kpState: gameState.kpState == null ? null : gameState.kpState,
        kpEngine: kpEngineState(gameState.kpEngine),
        currentLocation: gameState.currentLocation,
        knownLocations: gameState.knownLocations || [],
        atmosphere: gameState.atmosphere || null,
        journalLog: gameState.journalLog || [],
        diceHistory: gameState.diceHistory || [],
        lastSkillCheck: gameState.lastSkillCheck == null ? null : gameState.lastSkillCheck,
        chatHistoryLength: gameState.chatHistory.length
    }, null);

    const restoreToolSnapshot = (snapshot) => {
        if (!snapshot) return;
        replaceArray(gameState.roster, snapshot.roster);
        replaceArray(gameState.inventory, snapshot.inventory);
        if (Array.isArray(gameState.storage)) replaceArray(gameState.storage, snapshot.storage);
        if (snapshot.combat) {
            Object.keys(gameState.combat || {}).forEach((k) => {
                if (snapshot.combat && !Object.prototype.hasOwnProperty.call(snapshot.combat, k)) {
                    delete gameState.combat[k];
                }
            });
            Object.assign(gameState.combat, snapshot.combat);
        }
        if (snapshot.chase) gameState.chase = safeJsonClone(snapshot.chase, gameState.chase);
        if (snapshot.clueBoard && gameState.clueBoard) {
            gameState.clueBoard.clues = Array.isArray(snapshot.clueBoard.clues) ? snapshot.clueBoard.clues.slice() : [];
            gameState.clueBoard.links = Array.isArray(snapshot.clueBoard.links) ? snapshot.clueBoard.links.slice() : [];
        }
        if (Array.isArray(snapshot.npcRegistry) && Array.isArray(gameState.npcRegistry)) {
            replaceArray(gameState.npcRegistry, snapshot.npcRegistry);
        }
        if (snapshot.sceneMap && gameState.sceneMap) {
            Object.assign(gameState.sceneMap, safeJsonClone(snapshot.sceneMap, gameState.sceneMap));
        }
        gameState.pendingRuleChecks = Array.isArray(snapshot.pendingRuleChecks) ? snapshot.pendingRuleChecks.slice() : [];
        gameState.skillAttempts = snapshot.skillAttempts && typeof snapshot.skillAttempts === 'object'
            ? safeJsonClone(snapshot.skillAttempts, {})
            : {};
        gameState.pendingAftermath = Array.isArray(snapshot.pendingAftermath)
            ? safeJsonClone(snapshot.pendingAftermath, [])
            : [];
        if (snapshot.scenarioRunner && gameState.scenarioRunner) {
            Object.keys(gameState.scenarioRunner).forEach((k) => {
                if (!Object.prototype.hasOwnProperty.call(snapshot.scenarioRunner, k)) {
                    delete gameState.scenarioRunner[k];
                }
            });
            Object.assign(gameState.scenarioRunner, snapshot.scenarioRunner);
        }
        gameState.sanCaps = snapshot.sanCaps && typeof snapshot.sanCaps === 'object'
            ? safeJsonClone(snapshot.sanCaps, {})
            : {};
        gameState.worldClock = snapshot.worldClock && typeof snapshot.worldClock === 'object'
            ? safeJsonClone(snapshot.worldClock, { day: 1, hour: 0 })
            : { day: 1, hour: 0 };

        for (const k of REPLACE_KEYS) gameState[k] = safeJsonClone(snapshot[k], snapshot[k]);
        gameState.flags = snapshot.flags && typeof snapshot.flags === 'object' ? safeJsonClone(snapshot.flags, {}) : {};
        gameState.heatEventsLog = Array.isArray(snapshot.heatEventsLog) ? safeJsonClone(snapshot.heatEventsLog, []) : [];
        if (Array.isArray(gameState.knownLocations)) replaceArray(gameState.knownLocations, snapshot.knownLocations);
        if (snapshot.atmosphere && gameState.atmosphere && typeof gameState.atmosphere === 'object') {
            replaceObjectInPlace(gameState.atmosphere, safeJsonClone(snapshot.atmosphere, {}));
        }
        if (Array.isArray(gameState.journalLog)) replaceArray(gameState.journalLog, snapshot.journalLog);
        if (Array.isArray(gameState.diceHistory)) replaceArray(gameState.diceHistory, snapshot.diceHistory);
        if (snapshot.kpEngine && gameState.kpEngine && typeof gameState.kpEngine === 'object') {
            replaceObjectInPlace(gameState.kpEngine, safeJsonClone(snapshot.kpEngine, {}), KP_ENGINE_STATIC);
        } else if (snapshot.kpEngine === null) {
            gameState.kpEngine = null;
        }

        const prevCustom = gameState._customWeapons || {};
        gameState._customWeapons = snapshot.customWeapons && typeof snapshot.customWeapons === 'object'
            ? safeJsonClone(snapshot.customWeapons, {})
            : {};
        if (itemDb) {
            Object.keys(prevCustom).forEach((k) => {
                if (!gameState._customWeapons[k]) delete itemDb[k];
            });
            Object.keys(gameState._customWeapons).forEach((k) => {
                itemDb[k] = gameState._customWeapons[k];
            });
        }
        if (Number.isFinite(snapshot.chatHistoryLength)) {
            gameState.chatHistory.splice(snapshot.chatHistoryLength);
        }
    };

    return { makeToolSnapshot, restoreToolSnapshot };
}
