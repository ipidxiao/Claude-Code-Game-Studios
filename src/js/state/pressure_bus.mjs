/**
 * Wave B (PB0–PB4) — PressureBus orchestration.
 * PB0: schema + channel registry
 * PB1: heat channel (delegates to mythos_heat — no formula fork)
 * PB2: flag channel (gameState + scenarioRunner flags)
 * PB3: read snapshot for HUD / audits (display modules stay pure)
 * PB4: inventory + freeze consumers wire through here
 *
 * Does NOT write HP/SAN. Does NOT replace CoCArcPressureCopy display APIs.
 */
import { addMythosHeat, clampMythosHeat } from './mythos_heat.mjs';

/** PB0 — bus schema stamp (independent of CAPABILITY_IR_VERSION). */
export const PRESSURE_BUS_VERSION = 1;

/** Known pressure flag keys promoted across gameState.flags + scenarioRunner.flags. */
export const PRESSURE_FLAG_KEYS = Object.freeze([
    'mythos_attention',
    'police_interest',
    'reputation_hit',
    'arc_pressure',
    'witness_attention',
    'witness_heat',
    'ally_scar'
]);

const _channels = [];

/**
 * @param {string} id
 * @param {{ kind: 'heat'|'flags'|'read'|'orchestrate', priority?: number, onDispatch?: Function }} spec
 */
export function registerPressureChannel(id, spec) {
    if (!id || !spec) return { ok: false, desc: 'invalid channel' };
    const entry = {
        id: String(id),
        kind: spec.kind || 'orchestrate',
        priority: spec.priority != null ? Number(spec.priority) : 100,
        onDispatch: typeof spec.onDispatch === 'function' ? spec.onDispatch : null
    };
    const i = _channels.findIndex((c) => c.id === entry.id);
    if (i >= 0) _channels[i] = entry;
    else _channels.push(entry);
    _channels.sort((a, b) => a.priority - b.priority);
    return { ok: true, id: entry.id };
}

export function listPressureChannels() {
    return _channels.map((c) => ({ id: c.id, kind: c.kind, priority: c.priority }));
}

export function resetPressureChannelsForTests() {
    _channels.length = 0;
    _coreRegistered = false;
}

let _coreRegistered = false;

function ensureCoreChannels() {
    if (_coreRegistered) return;
    _coreRegistered = true;
    registerPressureChannel('core.heat', {
        kind: 'heat',
        priority: 10,
        onDispatch(gs, ev) {
            if (!ev || ev.type !== 'heat.add') return null;
            return addMythosHeat(gs, ev.delta, ev.reason);
        }
    });
    registerPressureChannel('core.flags', {
        kind: 'flags',
        priority: 20,
        onDispatch(gs, ev) {
            if (!ev || (ev.type !== 'flag.set' && ev.type !== 'flag.clear')) return null;
            const key = String(ev.flag || '');
            if (!key) return null;
            return setPressureFlag(gs, key, ev.type === 'flag.set' ? (ev.value !== false) : false);
        }
    });
}

/**
 * PB2 — set/clear a pressure flag on gameState + scenarioRunner (no HP/SAN).
 * @returns {{ flag: string, value: boolean }|null}
 */
export function setPressureFlag(gameState, flag, value) {
    if (!gameState) return null;
    const key = String(flag || '');
    if (!key) return null;
    const on = value !== false && value != null ? !!value : false;
    if (!gameState.flags) gameState.flags = {};
    if (on) gameState.flags[key] = true;
    else delete gameState.flags[key];
    const r = gameState.scenarioRunner;
    if (r) {
        if (!r.flags) r.flags = {};
        if (on) r.flags[key] = true;
        else delete r.flags[key];
    }
    return { flag: key, value: on };
}

/**
 * PB1 — heat delta via bus (same clamp formula as mythos_heat).
 */
export function busAddMythosHeat(gameState, delta, reason) {
    ensureCoreChannels();
    return dispatchPressure(gameState, {
        type: 'heat.add',
        delta: Number(delta) || 0,
        reason: reason || ''
    });
}

/**
 * Generic dispatch — routes to matching channel handlers; returns last heat result or flag result.
 */
export function dispatchPressure(gameState, event) {
    ensureCoreChannels();
    if (!gameState || !event || !event.type) return null;
    let last = null;
    for (const ch of _channels) {
        if (!ch.onDispatch) continue;
        const kindMatch =
            (event.type.startsWith('heat.') && ch.kind === 'heat')
            || (event.type.startsWith('flag.') && ch.kind === 'flags')
            || ch.kind === 'orchestrate';
        if (!kindMatch && ch.kind !== 'orchestrate') continue;
        if (ch.kind === 'orchestrate' && !event.type.startsWith('orch.')) continue;
        const out = ch.onDispatch(gameState, event);
        if (out != null) last = out;
    }
    // Built-in fallback if no channel handled heat/flag (should not happen after ensureCore)
    if (last == null && event.type === 'heat.add') {
        last = addMythosHeat(gameState, event.delta, event.reason);
    }
    if (last == null && (event.type === 'flag.set' || event.type === 'flag.clear')) {
        last = setPressureFlag(
            gameState,
            event.flag,
            event.type === 'flag.set' ? (event.value !== false) : false
        );
    }
    return last;
}

/**
 * PB3 — read-only snapshot for HUD / save compare (display modules must not mutate).
 */
export function getPressureSnapshot(gameState) {
    const gs = gameState || {};
    const runnerFlags = (gs.scenarioRunner && gs.scenarioRunner.flags) || {};
    const flags = Object.assign({}, gs.flags || {}, runnerFlags);
    const pick = {};
    for (const k of PRESSURE_FLAG_KEYS) {
        if (flags[k]) pick[k] = true;
    }
    const ledger = gs.arcLedger || {};
    return {
        busVersion: PRESSURE_BUS_VERSION,
        heat: clampMythosHeat(gs.mythosHeat),
        heatFloor: Math.max(0, Number(ledger.mythosHeatFloor) || 0),
        flags: pick
    };
}

/** Convenience: HUD line inputs from live state (copy module still pure). */
export function pressureHudInputs(gameState) {
    const snap = getPressureSnapshot(gameState);
    return { flags: snap.flags, mythosHeat: snap.heat, busVersion: snap.busVersion };
}

export const CoCPressureBus = {
    PRESSURE_BUS_VERSION,
    PRESSURE_FLAG_KEYS,
    registerPressureChannel,
    listPressureChannels,
    dispatchPressure,
    busAddMythosHeat,
    setPressureFlag,
    getPressureSnapshot,
    pressureHudInputs,
    clampMythosHeat
};

if (typeof window !== 'undefined') window.CoCPressureBus = CoCPressureBus;

// Eager core registration when module loads
ensureCoreChannels();
