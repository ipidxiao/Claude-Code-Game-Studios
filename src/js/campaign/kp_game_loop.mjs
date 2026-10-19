// KP narrative game loop — session timers, clue path enforcement
//
// SINGLE-INSTANCE CONSTRAINT: only one KpGameLoop timer may be active globally.
// register() always clears any prior timer (module-level or on another gameState).
// Timer id is stored on gameState._kpGameLoopTimerId for instance binding.

import { KpExecutionEngine, ensureKpEngine } from '../campaign/kp_execution_engine.mjs';
import { KP_PROTOCOL } from '../data/kp_protocol.mjs';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const TEST_INTERVAL_MS = 30 * 1000;
/** Minimum gap between injections even if the interval fires early (anti-spam). */
const MIN_INJECTION_GAP_MS = 5 * 60 * 1000;
const RECENT_EVENT_WINDOW = 3;

let _timerId = null;
let _mountedGameState = null;
/** Injectable RNG for tests — defaults to Math.random. */
let _random = () => Math.random();

export function setKpGameLoopRandom(rng) {
    _random = typeof rng === 'function' ? rng : () => Math.random();
}

export function resetKpGameLoopRandom() {
    _random = () => Math.random();
}

/** Offline local scenarios are authored graphs — KP clocks must not inject. */
export function isLocalScenarioActive(gameState) {
    return !!(gameState && gameState.scenarioRunner && gameState.scenarioRunner.active);
}

export function isKpGameLoopAllowed(gameState) {
    if (!gameState || !KpExecutionEngine.isEnabled(gameState)) return false;
    if (isLocalScenarioActive(gameState)) return false;
    return true;
}

function getIntervalMs(gameState) {
    if (typeof window !== 'undefined' && window.__KP_GAME_LOOP_TEST_MODE__) return TEST_INTERVAL_MS;
    const kp = gameState && gameState.kpEngine;
    if (kp && kp.eventIntervalMs) return kp.eventIntervalMs;
    return DEFAULT_INTERVAL_MS;
}

export function checkCluePaths(clues) {
    const list = Array.isArray(clues) ? clues : [];
    const minPaths = (KP_PROTOCOL.NARRATIVE_CORE &&
        KP_PROTOCOL.NARRATIVE_CORE.ENFORCEMENT &&
        KP_PROTOCOL.NARRATIVE_CORE.ENFORCEMENT.clue_rule &&
        KP_PROTOCOL.NARRATIVE_CORE.ENFORCEMENT.clue_rule.min_paths) || 3;
    const active = list.filter((c) => c && c.status !== 'discarded');
    return {
        ok: active.length >= minPaths,
        count: active.length,
        minPaths,
        suggestion: active.length < minPaths
            ? `线索路径不足（${active.length}/${minPaths}）。建议调用 add_clue 补充调查分支。`
            : null
    };
}

function clearTimerForState(gameState) {
    if (!gameState) return;
    if (gameState._kpGameLoopTimerId != null) {
        clearInterval(gameState._kpGameLoopTimerId);
        gameState._kpGameLoopTimerId = null;
    }
}

function injectTimedEvent(gameState) {
    if (!isKpGameLoopAllowed(gameState)) return;
    // Do not inject while an AI round is in flight (avoid racing chatHistory / tools).
    if (gameState.isLoading || (gameState._aiBusyCount || 0) > 0) return;
    const kp = ensureKpEngine(gameState);
    const now = Date.now();
    const last = kp.lastEventInjectionAt || 0;
    if (last && now - last < MIN_INJECTION_GAP_MS) return;

    const events = ['clue', 'danger', 'choice'];
    const recent = Array.isArray(kp.recentInjectionTypes) ? kp.recentInjectionTypes : [];
    let candidates = events.filter((e) => !recent.includes(e));
    if (!candidates.length) candidates = events;
    const pick = candidates[Math.floor(_random() * candidates.length)];
    kp.recentInjectionTypes = [...recent, pick].slice(-RECENT_EVENT_WINDOW);
    kp.lastEventInjectionAt = now;

    const labels = { clue: '新线索浮现', danger: '威胁逼近', choice: '关键抉择' };
    if (gameState.chatHistory) {
        gameState.chatHistory.push({
            role: 'system',
            isLocalOnly: true,
            isAlert: pick === 'danger',
            content: `⏱️ [KP引擎·叙事循环] 30分钟事件注入：${labels[pick] || pick}。守秘人须推进调查/危险/抉择之一。`
        });
    }
    KpExecutionEngine.runAntagonistTick(gameState, {
        type: pick === 'clue' ? 'clue' : (pick === 'choice' ? 'observe' : 'danger')
    });
    if (KpExecutionEngine.tickDoomClock) {
        KpExecutionEngine.tickDoomClock(gameState, 'game_loop');
    }
    const clueCheck = checkCluePaths(gameState.clueBoard && gameState.clueBoard.clues);
    if (clueCheck.suggestion && gameState.chatHistory) {
        gameState.chatHistory.push({
            role: 'system',
            isLocalOnly: true,
            content: `📋 [KP引擎] ${clueCheck.suggestion}`
        });
    }
}

export function registerKpGameLoop(gameState) {
    if (!isKpGameLoopAllowed(gameState)) {
        unregisterKpGameLoop(gameState);
        return;
    }
    if (_mountedGameState === gameState && _timerId != null && gameState._kpGameLoopTimerId === _timerId) {
        return;
    }
    unregisterKpGameLoop();
    _mountedGameState = gameState;
    const kp = ensureKpEngine(gameState);
    if (!kp.sessionStartedAt) kp.sessionStartedAt = Date.now();
    const ms = getIntervalMs(gameState);
    _timerId = setInterval(() => {
        if (_mountedGameState && isKpGameLoopAllowed(_mountedGameState)) {
            injectTimedEvent(_mountedGameState);
        }
    }, ms);
    gameState._kpGameLoopTimerId = _timerId;
}

export function unregisterKpGameLoop(gameState) {
    if (gameState) clearTimerForState(gameState);
    if (_timerId) {
        clearInterval(_timerId);
        _timerId = null;
    }
    if (_mountedGameState && _mountedGameState !== gameState) {
        clearTimerForState(_mountedGameState);
    }
    _mountedGameState = null;
}

export const KpGameLoop = {
    register: registerKpGameLoop,
    unregister: unregisterKpGameLoop,
    checkCluePaths,
    injectTimedEvent,
    isLocalScenarioActive,
    isKpGameLoopAllowed,
    setKpGameLoopRandom,
    resetKpGameLoopRandom,
    MIN_INJECTION_GAP_MS
};

if (typeof window !== 'undefined') {
    window.KpGameLoop = KpGameLoop;
}
