/**
 * Wave C (DP0–DP4) — Display Pipeline for pressure / capability *display*.
 * Read-only orchestration: PressureBus snapshots + CapabilityDecl/system helpers.
 * Does NOT mutate heat/flags/HP/SAN. Does NOT fork heat clamp.
 * Locked APIs (pressureHudLine, pressureChoiceSuffix, previewScenarioCapabilities)
 * remain the thin pure formatters; this module owns assembling inputs from live state.
 *
 * DP0: schema + display channel registry
 * DP1: HUD line assembly from pressureHudInputs → pressureHudLine
 * DP2: choice-hint assembly → pressureChoiceSuffix
 * DP3: desk / save-compare pressure slice helpers (no locked-signature break)
 * DP4: inventory + freeze consumers (see capability_risk)
 */
import { pressureHudLine, pressureChoiceSuffix } from './arc_pressure_copy.mjs';
import { getPressureSnapshot, pressureHudInputs } from '../state/pressure_bus.mjs';
import {
    previewScenarioCapabilities,
    formatCapabilityPreview,
    buildSaveCompareMeta
} from './capability_system.mjs';

/** DP0 — display pipeline schema stamp. */
export const DISPLAY_PIPELINE_VERSION = 1;

const _channels = [];

/**
 * @param {string} id
 * @param {{ kind: 'hud'|'choice'|'desk'|'read', priority?: number, assemble?: Function }} spec
 */
export function registerDisplayChannel(id, spec) {
    if (!id || !spec) return { ok: false, desc: 'invalid display channel' };
    const entry = {
        id: String(id),
        kind: spec.kind || 'read',
        priority: spec.priority != null ? Number(spec.priority) : 100,
        assemble: typeof spec.assemble === 'function' ? spec.assemble : null
    };
    const i = _channels.findIndex((c) => c.id === entry.id);
    if (i >= 0) _channels[i] = entry;
    else _channels.push(entry);
    _channels.sort((a, b) => a.priority - b.priority);
    return { ok: true, id: entry.id };
}

export function listDisplayChannels() {
    return _channels.map((c) => ({ id: c.id, kind: c.kind, priority: c.priority }));
}

export function resetDisplayChannelsForTests() {
    _channels.length = 0;
    _coreRegistered = false;
}

let _coreRegistered = false;

function ensureCoreChannels() {
    if (_coreRegistered) return;
    _coreRegistered = true;
    registerDisplayChannel('core.hud', {
        kind: 'hud',
        priority: 10,
        assemble(gs) {
            return assemblePressureHudLine(gs);
        }
    });
    registerDisplayChannel('core.choice', {
        kind: 'choice',
        priority: 20,
        assemble(gs, opts) {
            return assemblePressureChoiceSuffix(gs, opts);
        }
    });
    registerDisplayChannel('core.desk', {
        kind: 'desk',
        priority: 30,
        assemble(gs, opts) {
            return assembleDeskPressureSlice(gs, opts && opts.scenario);
        }
    });
}

/**
 * DP1 — HUD string from live gameState (locked pressureHudLine stays pure).
 */
export function assemblePressureHudLine(gameState) {
    const inputs = pressureHudInputs(gameState);
    return pressureHudLine(inputs.flags, inputs.mythosHeat) || '';
}

/**
 * DP2 — choice suffix from live state or explicit flags (locked API stays pure).
 * @param {object} gameStateOrNull
 * @param {{ flags?: object }} [opts] — if flags provided, use them; else snapshot
 */
export function assemblePressureChoiceSuffix(gameState, opts) {
    const o = opts || {};
    let flags = o.flags;
    if (!flags) {
        const snap = getPressureSnapshot(gameState);
        flags = snap.flags;
    }
    return pressureChoiceSuffix(flags) || '';
}

/**
 * DP3 — desk / compare slice: pressure + optional capability preview (read-only).
 * Does not change previewScenarioCapabilities / buildSaveCompareMeta signatures.
 */
export function assembleDeskPressureSlice(gameState, scenario) {
    const snap = getPressureSnapshot(gameState);
    const hud = pressureHudLine(snap.flags, snap.heat) || '';
    const choiceSuffix = pressureChoiceSuffix(snap.flags) || '';
    let caps = [];
    let capsLine = '';
    if (scenario) {
        caps = previewScenarioCapabilities(scenario);
        capsLine = formatCapabilityPreview(caps);
    }
    const saveMeta = buildSaveCompareMeta(gameState);
    return {
        pipelineVersion: DISPLAY_PIPELINE_VERSION,
        busVersion: snap.busVersion,
        heat: snap.heat,
        heatFloor: snap.heatFloor,
        flags: snap.flags,
        hudLine: hud,
        choiceSuffix,
        capabilities: caps,
        capabilityPreviewLine: capsLine,
        saveCompareMeta: saveMeta
    };
}

/** Run a registered channel assemble (tests / extensions). */
export function runDisplayChannel(id, gameState, opts) {
    ensureCoreChannels();
    const ch = _channels.find((c) => c.id === id);
    if (!ch || !ch.assemble) return null;
    return ch.assemble(gameState, opts || {});
}

export const CoCDisplayPipeline = {
    DISPLAY_PIPELINE_VERSION,
    registerDisplayChannel,
    listDisplayChannels,
    assemblePressureHudLine,
    assemblePressureChoiceSuffix,
    assembleDeskPressureSlice,
    runDisplayChannel,
    getPressureSnapshot,
    pressureHudInputs
};

if (typeof window !== 'undefined') window.CoCDisplayPipeline = CoCDisplayPipeline;

ensureCoreChannels();
