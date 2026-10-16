/**
 * Wave F (TC0–TC4) — Timeline Contract.
 * Closed schema for ending-recap timeline rows. Read-only: normalizes and
 * audits copies; does not write heat, flags, HP, or SAN, and does not fork
 * clue-rank, heat clamp, or locked public API signatures.
 *
 * Inference: docs/NEW_SESSION has no capability_risk CHANGELOG and no
 * TC0–TCn table — only the acronym TC on the A–F freeze. Rejected readings:
 * Trace Contract (capability marks are already canonical via IR), Turn Clock
 * (worldClock plus investigation/ritual clocks already advance time), Threat
 * Check (would sit on mythos heat / encounter pressure), Tool Contract
 * (tool_result_normalize and tool_alias_schema already cover the tool
 * surface). Ending recap still pushes ad-hoc {t, text} rows. Encounter
 * Verdict scores the seed gate; it does not own the row set. This module
 * closes that gap.
 *
 * TC0: TIMELINE_CONTRACT_VERSION + closed kind registry
 * TC1: normalizeTimelineRow
 * TC2: auditTimelineContract
 * TC3: assembleTimelineContract
 * TC4: runner pushEndingRecap stamps the contract (see capability_risk freeze)
 */

/** TC0 — timeline contract schema stamp. */
export const TIMELINE_CONTRACT_VERSION = 1;

/**
 * TC0 — closed set of ending-recap row kinds, in the only legal order.
 * heat may repeat; every other kind is a singleton.
 */
export const TIMELINE_ROW_KINDS = Object.freeze([
    'end',
    'evidence',
    'verdict',
    'heat',
    'flag',
    'unlock',
    'cap',
    'capdiff',
    'hint'
]);

/** Kinds a complete ending recap must include at least once. */
export const TIMELINE_REQUIRED_KINDS = Object.freeze(['end', 'evidence', 'heat', 'flag', 'hint']);

const KIND_SET = new Set(TIMELINE_ROW_KINDS);
const SINGLETON_KINDS = new Set([
    'end',
    'evidence',
    'verdict',
    'flag',
    'unlock',
    'cap',
    'capdiff',
    'hint'
]);

/**
 * TC1 — copy a row down to {t, text}. Does not mutate the input.
 * @param {object} row
 * @returns {{ ok: true, row: { t: string, text: string } } | { ok: false, error: string }}
 */
export function normalizeTimelineRow(row) {
    if (!row || typeof row !== 'object') return { ok: false, error: 'row-not-object' };
    const t = String(row.t || '');
    const text = String(row.text == null ? '' : row.text).trim();
    if (!KIND_SET.has(t)) return { ok: false, error: 'unknown-kind:' + t };
    if (!text) return { ok: false, error: 'empty-text:' + t };
    return { ok: true, row: { t, text } };
}

function indexOfKind(kinds, kind) {
    return kinds.indexOf(kind);
}

/**
 * TC2 — audit an already-normalized row list.
 * Order matches pushEndingRecap: end, evidence, optional verdict, one or
 * more contiguous heat rows, flag, optional unlock, optional cap, optional
 * capdiff, hint last.
 * @param {Array<{ t: string, text: string }>} rows
 */
export function auditTimelineContract(rows) {
    const errors = [];
    const list = Array.isArray(rows) ? rows : [];
    const kinds = list.map((r) => (r && r.t) || '');
    const counts = Object.create(null);
    for (const k of kinds) counts[k] = (counts[k] || 0) + 1;

    for (const req of TIMELINE_REQUIRED_KINDS) {
        if (!counts[req]) errors.push('missing:' + req);
    }
    for (const k of Object.keys(counts)) {
        if (!KIND_SET.has(k)) errors.push('unknown-kind:' + k);
        if (SINGLETON_KINDS.has(k) && counts[k] > 1) errors.push('duplicate:' + k);
    }

    if (kinds.length === 0 || kinds[0] !== 'end') errors.push('end-not-first');
    if (kinds.length === 0 || kinds[kinds.length - 1] !== 'hint') errors.push('hint-not-last');

    const end = indexOfKind(kinds, 'end');
    const evidence = indexOfKind(kinds, 'evidence');
    const heat = indexOfKind(kinds, 'heat');
    const flag = indexOfKind(kinds, 'flag');
    const hint = indexOfKind(kinds, 'hint');
    const verdict = indexOfKind(kinds, 'verdict');
    const unlock = indexOfKind(kinds, 'unlock');
    const cap = indexOfKind(kinds, 'cap');
    const capdiff = indexOfKind(kinds, 'capdiff');

    if (end >= 0 && evidence >= 0 && !(end < evidence)) errors.push('order:end<evidence');
    if (evidence >= 0 && heat >= 0 && !(evidence < heat)) errors.push('order:evidence<heat');
    if (heat >= 0 && flag >= 0 && !(heat < flag)) errors.push('order:heat<flag');
    if (flag >= 0 && hint >= 0 && !(flag < hint)) errors.push('order:flag<hint');
    if (verdict >= 0 && !(evidence >= 0 && heat >= 0 && evidence < verdict && verdict < heat)) {
        errors.push('order:verdict');
    }
    if (unlock >= 0 && !(flag >= 0 && hint >= 0 && flag < unlock && unlock < hint)) {
        errors.push('order:unlock');
    }
    if (cap >= 0 && !(flag >= 0 && hint >= 0 && flag < cap && cap < hint)) {
        errors.push('order:cap');
    }
    if (unlock >= 0 && cap >= 0 && !(unlock < cap)) errors.push('order:unlock<cap');
    if (capdiff >= 0) {
        if (cap >= 0) {
            if (!(cap < capdiff && hint >= 0 && capdiff < hint)) errors.push('order:capdiff');
        } else if (!(flag >= 0 && hint >= 0 && flag < capdiff && capdiff < hint)) {
            errors.push('order:capdiff');
        }
        if (unlock >= 0 && !(unlock < capdiff)) errors.push('order:unlock<capdiff');
    }

    const heatIdx = [];
    for (let i = 0; i < kinds.length; i++) {
        if (kinds[i] === 'heat') heatIdx.push(i);
    }
    for (let i = 1; i < heatIdx.length; i++) {
        if (heatIdx[i] !== heatIdx[i - 1] + 1) {
            errors.push('heat-not-contiguous');
            break;
        }
    }

    const missing = TIMELINE_REQUIRED_KINDS.filter((k) => !counts[k]);
    return { ok: errors.length === 0, errors, missing };
}

/**
 * TC3 — normalize then audit. Returns copies; does not mutate input rows.
 * @param {Array<object>} rows
 */
export function assembleTimelineContract(rows) {
    const normalized = [];
    const errors = [];
    const input = Array.isArray(rows) ? rows : [];
    input.forEach((row, i) => {
        const n = normalizeTimelineRow(row);
        if (!n.ok) errors.push('row' + i + ':' + n.error);
        else normalized.push(n.row);
    });
    const audit = auditTimelineContract(normalized);
    const allErrors = errors.concat(audit.errors);
    return {
        contractVersion: TIMELINE_CONTRACT_VERSION,
        ok: allErrors.length === 0,
        errors: allErrors,
        rows: normalized,
        missing: audit.missing
    };
}

export const CoCTimelineContract = {
    TIMELINE_CONTRACT_VERSION,
    TIMELINE_ROW_KINDS,
    TIMELINE_REQUIRED_KINDS,
    normalizeTimelineRow,
    auditTimelineContract,
    assembleTimelineContract
};

if (typeof window !== 'undefined') window.CoCTimelineContract = CoCTimelineContract;
