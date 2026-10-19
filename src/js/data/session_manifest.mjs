/**
 * Wave D (SM0–SM4) — Session Manifest.
 * Read-mostly assembly of desk / session-start face from scenario + live state.
 * Does NOT mutate heat/flags/HP/SAN. Does NOT fork locked API signatures
 * (previewScenarioCapabilities, pressureHudLine, DeskPref, heat clamp).
 *
 * Inference: tree only had acronym SM (no SM0–SMn table). Chose Session Manifest
 * over Scenario Manifest / Save Manifest / Story Memory / State Machine because
 * lobby deskCard + runner carryBrief duplicated the same session-start slice
 * without a shared IR — CapDecl covers caps, PressureBus writes, Display Pipeline
 * covers HUD/choice; session face was the remaining gap.
 *
 * SM0: SESSION_MANIFEST_VERSION + schema stamp
 * SM1: extractScenarioPackageFace(scenario)
 * SM2: assembleCarrySlice(gameState) — carrySummary + pressureLine via DP
 * SM3: assembleSessionManifest(gameState, scenario, opts) — desk / session face
 * SM4: consumers (lobby deskCard, runner carryBrief) + freeze (see capability_risk)
 */
import {
    previewScenarioCapabilities,
    formatCapabilityPreview,
    bucketContractAudit,
    buildSaveCompareMeta
} from './capability_system.mjs';
import { loadDeskPref, emptyDeskPref, normalizeDeskPref } from './desk_pref.mjs';
import { carrySummary, hasCarrySnapshot } from '../state/arc_ledger.mjs';
import { assemblePressureHudLine } from './display_pipeline.mjs';
import { CoCScenarioCatalog } from './scenarios/catalog.mjs';

/** SM0 — session manifest schema stamp. */
export const SESSION_MANIFEST_VERSION = 1;

/**
 * SM1 — normalized package face from a scenario object (read-only).
 * @param {object} scenario
 */
export function extractScenarioPackageFace(scenario) {
    if (!scenario) {
        return {
            id: '',
            title: '',
            tags: [],
            startNode: null,
            hasClocks: false,
            readsArcLedger: false,
            requiresChapterUnlock: false,
            continuesArc: false
        };
    }
    const reads = !!(scenario.readsArcLedger || scenario.continuesArc);
    const gated = !!scenario.requiresChapterUnlock;
    return {
        id: String(scenario.id || ''),
        title: String(scenario.title || scenario.id || ''),
        tags: Array.isArray(scenario.tags) ? scenario.tags.slice() : [],
        startNode: scenario.startNode || null,
        hasClocks: !!scenario.clocks,
        readsArcLedger: reads,
        requiresChapterUnlock: gated,
        continuesArc: reads || gated
    };
}

/**
 * SM2 — carry / inherit slice from live gameState (read-only).
 * @param {object} gameState
 * @returns {{ carrySummary: object|null, pressureLine: string, hasCarry: boolean }}
 */
export function assembleCarrySlice(gameState) {
    const ledger = gameState && gameState.arcLedger;
    const summary = carrySummary(ledger);
    const hasCarry = !!(summary && summary.hasSnapshot) || hasCarrySnapshot(ledger);
    const pressureLine = gameState ? (assemblePressureHudLine(gameState) || '') : '';
    return {
        carrySummary: summary || null,
        pressureLine,
        hasCarry: !!hasCarry
    };
}

/**
 * Build ui.carryBrief object used by story_view (same shape as prior inline runner).
 * @param {object} gameState
 * @returns {object|null}
 */
export function assembleCarryBrief(gameState) {
    const slice = assembleCarrySlice(gameState);
    if (!slice.hasCarry || !slice.carrySummary) return null;
    const s = slice.carrySummary;
    return {
        names: s.names,
        itemCount: s.itemCount,
        heat: s.heat,
        flagCount: s.flagCount,
        flags: s.flags || [],
        pressureLine: slice.pressureLine
    };
}

/**
 * SM3 — full session / desk face (read-only assembly).
 * @param {object} gameState
 * @param {object} scenario
 * @param {{
 *   keeperStyle?: string,
 *   preferredCarry?: string,
 *   includeContractHealth?: boolean,
 *   validateScenario?: (sc: object) => { ok?: boolean, errors?: string[] },
 *   includeSaveCompare?: boolean,
 *   includePressureDesk?: boolean
 * }} [opts]
 */
export function assembleSessionManifest(gameState, scenario, opts) {
    const o = opts || {};
    const face = extractScenarioPackageFace(scenario);
    const caps = scenario ? previewScenarioCapabilities(scenario) : [];
    const capsLine = formatCapabilityPreview(caps);

    let keeperStyle = o.keeperStyle;
    let preferredCarry = o.preferredCarry;
    if (face.id && (keeperStyle == null || preferredCarry == null)) {
        const pref = loadDeskPref(face.id) || emptyDeskPref();
        const n = normalizeDeskPref(pref);
        if (keeperStyle == null) {
            keeperStyle = n.keeperStyle
                || (gameState && gameState.keeperStyle)
                || 'cinematic';
        }
        if (preferredCarry == null) {
            preferredCarry = n.carryMode || 'inherit';
        }
    }
    if (!keeperStyle) keeperStyle = (gameState && gameState.keeperStyle) || 'cinematic';
    if (!preferredCarry || preferredCarry === 'none') preferredCarry = 'inherit';

    const carry = assembleCarrySlice(gameState);

    let contractHealth = null;
    if (o.includeContractHealth !== false && scenario) {
        let validate = o.validateScenario;
        if (!validate && typeof CoCScenarioCatalog.validate === 'function') {
            validate = (sc) => CoCScenarioCatalog.validate(sc);
        }
        if (typeof validate === 'function') {
            try {
                contractHealth = bucketContractAudit(validate(scenario));
            } catch (_e) {
                contractHealth = null;
            }
        }
    }

    const out = {
        manifestVersion: SESSION_MANIFEST_VERSION,
        id: face.id,
        title: face.title,
        packageFace: face,
        keeperStyle,
        preferredCarry,
        carrySummary: carry.carrySummary,
        hasCarry: carry.hasCarry,
        pressureLine: carry.pressureLine,
        capabilityPreview: caps,
        capabilityPreviewLine: capsLine,
        contractHealth
    };

    if (o.includeSaveCompare && gameState) {
        out.saveCompareMeta = buildSaveCompareMeta(gameState);
    }

    return out;
}

export const CoCSessionManifest = {
    SESSION_MANIFEST_VERSION,
    extractScenarioPackageFace,
    assembleCarrySlice,
    assembleCarryBrief,
    assembleSessionManifest
};

if (typeof window !== 'undefined') window.CoCSessionManifest = CoCSessionManifest;
