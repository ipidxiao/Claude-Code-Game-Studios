/**
 * Wave E (EV0–EV4) — Encounter Verdict.
 * Read-only score of the seeded encounter gate against the achieved clue tier.
 * Does not mutate heat, flags, HP, or SAN. Does not fork CLUE_QUALITY_RANK
 * or reputation-pressure math. Locked public API signatures stay put.
 *
 * Inference: the tree only stored the acronym EV (no EV0–EVn table).
 * Rejected Event View (ending recap already renders a timeline), Evidence
 * (clue board + endingsByClueQuality), Effect Validation (validateEffects +
 * rules effect IR), and Event Bus (PressureBus + tick bus). Encounter seed
 * writes a variant and a required clue quality, and reputation pressure
 * tightens that gate, but nothing emits a structured short/met/over record.
 * Ending recap only prints the tier string. This module closes that gap.
 *
 * EV0: ENCOUNTER_VERDICT_VERSION + class registry
 * EV1: readEncounterGate(gameState)
 * EV2: scoreEncounterVerdict(gate)
 * EV3: assembleEncounterVerdict(gameState) + one-line copy
 * EV4: runner ending recap consumes the line (see capability_risk freeze)
 */
import { CLUE_QUALITY_RANK, bestClueQualityBranchKey, bestClueQualityRank, clueQualityRank } from './investigate_outcomes.mjs';

/** EV0 — encounter verdict schema stamp. */
export const ENCOUNTER_VERDICT_VERSION = 1;

/** EV0 — closed set of verdict classes. Order is informational, not a rank. */
export const ENCOUNTER_VERDICT_CLASSES = Object.freeze(['unscored', 'short', 'met', 'over']);

const CLASS_LABEL = Object.freeze({
    unscored: '未设门',
    short: '未达标',
    met: '达标',
    over: '超额'
});

/**
 * Map a required-quality token onto CLUE_QUALITY_RANK.
 * "weak" is an ending-branch label (none+partial collapsed for display only);
 * scoring uses bestClueQualityRank, not this collapse, so an empty board
 * does not satisfy a partial gate.
 * @param {string} token
 * @returns {number}
 */
export function clueTierRank(token) {
    const t = String(token || '').toLowerCase();
    if (t === 'weak') return CLUE_QUALITY_RANK.partial;
    return clueQualityRank(t);
}

/**
 * EV1 — read the live encounter gate. No writes.
 * @param {object} gameState
 */
export function readEncounterGate(gameState) {
    const gs = gameState || {};
    const runner = gs.scenarioRunner || {};
    const flags = runner.flags || {};
    const clues = (gs.clueBoard && gs.clueBoard.clues) || [];
    const achievedKey = bestClueQualityBranchKey(clues);
    const rawReq = flags.seedRequiresClueQuality;
    const requiredToken = rawReq ? String(rawReq).trim().toLowerCase() : null;
    const requiredRank = requiredToken ? clueTierRank(requiredToken) : null;
    const invalidRequiredQuality = requiredToken && requiredRank == null ? requiredToken : null;
    const requiredQuality = invalidRequiredQuality ? null : requiredToken;
    return {
        variant: gs.encounterVariant || flags.encounterVariant || null,
        requiredQuality,
        invalidRequiredQuality,
        achievedKey,
        achievedRank: bestClueQualityRank(clues),
        requiredRank
    };
}

/**
 * EV2 — compare achieved rank to the required gate.
 * @param {{ requiredQuality?: string|null, requiredRank?: number|null, achievedRank?: number }} gate
 * @returns {{ klass: 'unscored'|'short'|'met'|'over', delta: number|null }}
 */
export function scoreEncounterVerdict(gate) {
    const g = gate || {};
    if (g.requiredQuality == null || g.requiredRank == null) {
        return { klass: 'unscored', delta: null };
    }
    const delta = (Number(g.achievedRank) || 0) - g.requiredRank;
    let klass = 'met';
    if (delta < 0) klass = 'short';
    else if (delta > 0) klass = 'over';
    return { klass, delta };
}

/**
 * One-line copy for ending recap. Display only.
 * @param {object} verdict
 */
export function formatEncounterVerdictLine(verdict) {
    if (!verdict) return '';
    if (verdict.invalidRequiredQuality) {
        return '遭遇裁决：门槛无效 · 要求' + verdict.invalidRequiredQuality
            + ' · 达成' + (verdict.achievedKey || 'weak');
    }
    const klass = verdict.klass || 'unscored';
    const label = CLASS_LABEL[klass] || klass;
    const req = verdict.requiredQuality || '—';
    const got = verdict.achievedKey || 'weak';
    const variant = verdict.variant ? (' · 变体' + verdict.variant) : '';
    return '遭遇裁决：' + label + ' · 要求' + req + ' · 达成' + got + variant;
}

/**
 * EV3 — full read-only verdict record.
 * @param {object} gameState
 */
export function assembleEncounterVerdict(gameState) {
    const gate = readEncounterGate(gameState);
    const scored = scoreEncounterVerdict(gate);
    const verdict = {
        verdictVersion: ENCOUNTER_VERDICT_VERSION,
        variant: gate.variant,
        requiredQuality: gate.requiredQuality,
        invalidRequiredQuality: gate.invalidRequiredQuality,
        achievedKey: gate.achievedKey,
        achievedRank: gate.achievedRank,
        requiredRank: gate.requiredRank,
        klass: scored.klass,
        delta: scored.delta
    };
    verdict.line = formatEncounterVerdictLine(verdict);
    return verdict;
}

export const CoCEncounterVerdict = {
    ENCOUNTER_VERDICT_VERSION,
    ENCOUNTER_VERDICT_CLASSES,
    clueTierRank,
    readEncounterGate,
    scoreEncounterVerdict,
    formatEncounterVerdictLine,
    assembleEncounterVerdict
};

if (typeof window !== 'undefined') window.CoCEncounterVerdict = CoCEncounterVerdict;
