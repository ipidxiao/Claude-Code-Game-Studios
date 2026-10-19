/**
 * Capability risk gates + Wave A IR stamp: aliases, tag↔structure parity, API lock,
 * pressure write-path guards, markCapability canonicalization, CapabilityDecl re-exports.
 */

import {
    CAPABILITY_DECL_SCHEMA,
    CAPABILITY_DECL_TABLE,
    getCapabilityDecl,
    assertCapabilityDeclTable,
    softCapabilityIds,
    hardCapabilityIds
} from './capability_decl.mjs';

export {
    CAPABILITY_DECL_SCHEMA,
    CAPABILITY_DECL_TABLE,
    getCapabilityDecl,
    assertCapabilityDeclTable,
    softCapabilityIds,
    hardCapabilityIds
} from './capability_decl.mjs';

/** Canonical capability ids (must stay aligned with CAPABILITY_GLOSSARY). */
export const CANONICAL_CAPABILITY_IDS = Object.freeze([
    '证据分叉', '追逐', '神话热度', '战后余波', '战役账本', '双时钟', '假线索'
]);

/** Map non-canonical labels → canonical Chinese capability ids. */
export const CAPABILITY_ALIASES = Object.freeze({
    chase: '追逐',
    追逐: '追逐',
    clocks: '双时钟',
    双时钟: '双时钟',
    false_lead: '假线索',
    falseLead: '假线索',
    假线索: '假线索',
    evidence: '证据分叉',
    证据分叉: '证据分叉',
    heat: '神话热度',
    mythos_heat: '神话热度',
    神话热度: '神话热度',
    aftermath: '战后余波',
    战后余波: '战后余波',
    arc: '战役账本',
    arc_ledger: '战役账本',
    战役账本: '战役账本'
});

export function canonicalizeCapabilityId(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (CAPABILITY_ALIASES[s]) return CAPABILITY_ALIASES[s];
    if (CANONICAL_CAPABILITY_IDS.includes(s)) return s;
    return '';
}

export function normalizeCapabilityList(list) {
    const out = [];
    for (const item of list || []) {
        const id = canonicalizeCapabilityId(item);
        if (id && !out.includes(id)) out.push(id);
    }
    return out;
}

/** Wave A (IR0–IR4): CapabilityDecl table landed — stamp endingRecap / saveCompareMeta. */
export const CAPABILITY_IR_VERSION = 1;

/** Resolve runtime markCapability argument — aliases ok; unknown throws. */
export function resolveMarkCapabilityId(raw) {
    const id = canonicalizeCapabilityId(raw);
    if (!id) {
        throw new Error('non-canonical capability id: ' + String(raw || ''));
    }
    return id;
}

/** Strip line and block comments so doc examples are not treated as call sites. */
function stripJsComments(source) {
    return String(source || '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

/** Extract markCapability('id') / markCapability("id") literals from source text. */
export function extractMarkCapabilityLiterals(source) {
    const out = [];
    const re = /markCapability\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    const text = stripJsComments(source);
    while ((m = re.exec(text)) !== null) {
        out.push(m[1]);
    }
    return out;
}

export function assertMarkCapabilitySourceCanonical(source) {
    const literals = extractMarkCapabilityLiterals(source);
    const bad = [];
    for (const lit of literals) {
        try {
            resolveMarkCapabilityId(lit);
        } catch (_e) {
            bad.push(lit);
        }
    }
    return { ok: bad.length === 0, literals, bad };
}

function hasNodeFlag(scenario, pred) {
    const nodes = scenario && scenario.nodes;
    if (!nodes) return false;
    for (const node of Object.values(nodes)) {
        if (pred(node)) return true;
        for (const c of node.choices || []) {
            if (pred(c)) return true;
        }
    }
    return false;
}

/** Structural detect only — ignores scenario.tags (IR-ready). */
export function detectStructuralCapabilities(scenario) {
    if (!scenario) return [];
    const out = [];
    const add = (id) => {
        if (id && !out.includes(id)) out.push(id);
    };
    if (scenario.clocks) add('双时钟');
    if (scenario.readsArcLedger || scenario.requiresChapterUnlock) add('战役账本');
    if (hasNodeFlag(scenario, (n) => n && (n.falseLead || n.falseNext || (n.effects && n.effects.debunkFalseLead)))) {
        add('假线索');
    }
    if (hasNodeFlag(scenario, (n) => n && ((n.effects && n.effects.chase) || n.chase))) {
        add('追逐');
    }
    if (hasNodeFlag(scenario, (n) => n && (n.endingsByClueQuality || n.branchByClueQuality || n.requiresClueQuality))) {
        add('证据分叉');
    }
    if (hasNodeFlag(scenario, (n) => n && n.effects && (n.effects.mythosHeat != null || n.effects.addMythosHeat))) {
        add('神话热度');
    }
    return out;
}

export function tagsAsCapabilities(scenario) {
    return normalizeCapabilityList(scenario && scenario.tags);
}

/**
 * Tag ↔ structure parity.
 * @returns {{ ok: boolean, errors: string[], warnings: string[], structural: string[], tagged: string[] }}
 */
export function auditScenarioCapabilityParity(scenario, opts) {
    const o = opts || {};
    const strict = !!o.strict;
    const structural = detectStructuralCapabilities(scenario);
    const tagged = tagsAsCapabilities(scenario);
    const errors = [];
    const warnings = [];

    const mustAdvertise = structural.filter((id) => id !== '神话热度');
    for (const id of mustAdvertise) {
        if (!tagged.includes(id)) {
            const msg = (scenario.id || '?') + ': structural "' + id + '" missing from tags';
            if (strict) errors.push(msg);
            else warnings.push(msg);
        }
    }

    const seen = Object.create(null);
    for (const t of scenario.tags || []) {
        const id = canonicalizeCapabilityId(t);
        if (!id) continue;
        if (seen[id]) {
            const msg = (scenario.id || '?') + ': duplicate capability tag "' + id + '"';
            if (strict) errors.push(msg);
            else warnings.push(msg);
        }
        seen[id] = true;
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        structural,
        tagged
    };
}

/** Public surface that A/B must keep as thin wrappers. */
export const LOCKED_PUBLIC_APIS = Object.freeze({
    CoCCapabilitySystem: Object.freeze([
        'previewScenarioCapabilities',
        'diffCapabilities',
        'formatCapabilityPreview',
        'buildEndingSaveBlurb',
        'composeSaveBlurb',
        'buildSaveCompareMeta',
        'formatSaveCompareDiff',
        'bucketContractAudit',
        'buildEffectsCoverageMatrix',
        'CAPABILITY_GLOSSARY',
        'CAPABILITY_FILTER_IDS'
    ]),
    CoCArcPressureCopy: Object.freeze([
        'PRESSURE_HINTS',
        'pressureChoiceSuffix',
        'pressureHudLine'
    ]),
    CoCDeskPref: Object.freeze([
        'isDeskPrefPromptEnabled',
        'setDeskPrefPromptEnabled',
        'loadDeskPref',
        'saveDeskPref',
        'formatDeskPrefPrompt'
    ]),
    CoCMythosHeat: Object.freeze([
        'addMythosHeat',
        'clampMythosHeat',
        'buildUnreliableSaveBlurb'
    ])
});

/**
 * Pressure / heat write inventory.
 * mode=mutate | mutate-flags | display
 */
export const PRESSURE_WRITE_INVENTORY = Object.freeze([
    Object.freeze({
        file: 'js/state/mythos_heat.mjs',
        mode: 'mutate',
        symbols: Object.freeze(['addMythosHeat', 'clampMythosHeat']),
        role: 'mutates mythosHeat 0–5; may set flags.mythos_attention'
    }),
    Object.freeze({
        file: 'js/state/arc_ledger.mjs',
        mode: 'mutate',
        symbols: Object.freeze(['importArcLedger', 'applyReputationPressure', 'resetInvestigatorCarry']),
        role: 'heat floor raise; reputation/police → encounter tiers; reset clears heat'
    }),
    Object.freeze({
        file: 'js/scenario/effects_apply.mjs',
        mode: 'mutate',
        symbols: Object.freeze(['mythosHeat', 'flags.mythos_heat_delta']),
        role: 'scenario effects call addMythosHeat only'
    }),
    Object.freeze({
        file: 'js/state/aftermath.mjs',
        mode: 'mutate-flags',
        symbols: Object.freeze(['pendingAftermath']),
        role: 'queues aftermath; may set reputation/police flags; no direct HP/SAN numeric writes'
    }),
    Object.freeze({
        file: 'js/state/pressure_bus.mjs',
        mode: 'orchestrate',
        symbols: Object.freeze(['dispatchPressure', 'busAddMythosHeat', 'setPressureFlag', 'getPressureSnapshot']),
        role: 'Wave B PressureBus — routes heat/flags; no HP/SAN; no formula fork'
    }),
    Object.freeze({
        file: 'js/data/arc_pressure_copy.mjs',
        mode: 'display',
        symbols: Object.freeze(['pressureChoiceSuffix', 'pressureHudLine']),
        role: 'DISPLAY ONLY — never mutate heat/flags/HP/SAN'
    }),
    Object.freeze({
        file: 'js/data/display_pipeline.mjs',
        mode: 'display',
        symbols: Object.freeze(['assemblePressureHudLine', 'assemblePressureChoiceSuffix', 'assembleDeskPressureSlice']),
        role: 'Wave C Display Pipeline — read-only assemble from PressureBus; no heat/flags/HP/SAN writes'
    }),
    Object.freeze({
        file: 'js/data/session_manifest.mjs',
        mode: 'display',
        symbols: Object.freeze(['extractScenarioPackageFace', 'assembleCarrySlice', 'assembleCarryBrief', 'assembleSessionManifest']),
        role: 'Wave D Session Manifest — read-only desk/session-start face; no heat/flags/HP/SAN writes'
    }),
    Object.freeze({
        file: 'js/data/encounter_verdict.mjs',
        mode: 'display',
        symbols: Object.freeze(['readEncounterGate', 'scoreEncounterVerdict', 'assembleEncounterVerdict', 'formatEncounterVerdictLine']),
        role: 'Wave E Encounter Verdict — read-only seed-gate vs clue tier; no heat/flags/HP/SAN writes'
    }),
    Object.freeze({
        file: 'js/data/timeline_contract.mjs',
        mode: 'display',
        symbols: Object.freeze(['normalizeTimelineRow', 'auditTimelineContract', 'assembleTimelineContract']),
        role: 'Wave F Timeline Contract — read-only ending-recap row schema; no heat/flags/HP/SAN writes'
    })
]);

export const PRESSURE_DISPLAY_FORBIDDEN_RE = Object.freeze([
    /mythosHeat\s*=/,
    /\.hp\s*[+\-/]?=/,
    /\.san\s*[+\-/]?=/,
    /\.mp\s*[+\-/]?=/,
    /flags\.[a-zA-Z_]+\s*=/,
    /addMythosHeat\s*\(/
]);


export const PRESSURE_ORCHESTRATE_FORBIDDEN_RE = Object.freeze([
    /\.hp\s*[+\-/]?=/,
    /\.san\s*[+\-/]?=/,
    /applyDamage\s*\(/,
    /Kernel\.(?:damage|heal|san)/
]);

export const AFTERMATH_HP_SAN_FORBIDDEN_RE = Object.freeze([
    /\.hp\s*[+\-/]?=/,
    /\.san\s*[+\-/]?=/,
    /applyDamage\s*\(/,
    /Kernel\.(?:damage|heal|san)/
]);

/**
 * @param {{ readFile: (rel: string) => string }} io
 */
export function auditPressureWriteGuards(io) {
    const errors = [];
    for (const entry of PRESSURE_WRITE_INVENTORY) {
        let text = '';
        try {
            text = io.readFile(entry.file);
        } catch (_e) {
            errors.push('missing inventory file: ' + entry.file);
            continue;
        }
        if (entry.mode === 'display') {
            for (const re of PRESSURE_DISPLAY_FORBIDDEN_RE) {
                if (re.test(text)) {
                    errors.push(entry.file + ': display module hits forbidden pattern ' + String(re));
                }
            }
        }
        if (entry.mode === 'mutate-flags') {
            for (const re of AFTERMATH_HP_SAN_FORBIDDEN_RE) {
                if (re.test(text)) {
                    errors.push(entry.file + ': aftermath hits HP/SAN pattern ' + String(re));
                }
            }
        }
        if (entry.mode === 'orchestrate') {
            for (const re of PRESSURE_ORCHESTRATE_FORBIDDEN_RE) {
                if (re.test(text)) {
                    errors.push(entry.file + ': orchestrate hits HP/SAN pattern ' + String(re));
                }
            }
        }
    }
    return { ok: errors.length === 0, errors };
}

export const SCOPE_FREEZE_AF = Object.freeze({
    /** Waves A–F done. frozenWaves is empty. Do not invent a G wave. */
    status: 'wave_f_done',
    waves: Object.freeze(['IR0-IR4', 'PB0-PB4', 'DP', 'SM', 'EV', 'TC']),
    completedWaves: Object.freeze(['IR0-IR4', 'PB0-PB4', 'DP', 'SM', 'EV', 'TC']),
    frozenWaves: Object.freeze([]),
    until: 'A–F complete',
    forbid: Object.freeze([
        'inventing a G wave',
        'breaking PressureBus / heat clamp formulas without review',
        'breaking previewScenarioCapabilities / pressureHudLine signatures',
        'mutating heat/flags/HP/SAN from Display Pipeline',
        'mutating heat/flags/HP/SAN from Session Manifest',
        'mutating heat/flags/HP/SAN from Encounter Verdict',
        'mutating heat/flags/HP/SAN from Timeline Contract',
        'markCapability non-canonical ids'
    ])
});

export const CoCCapabilityRisk = {
    CAPABILITY_ALIASES,
    CAPABILITY_IR_VERSION,
    CAPABILITY_DECL_SCHEMA,
    CAPABILITY_DECL_TABLE,
    getCapabilityDecl,
    assertCapabilityDeclTable,
    softCapabilityIds,
    hardCapabilityIds,
    canonicalizeCapabilityId,
    normalizeCapabilityList,
    resolveMarkCapabilityId,
    extractMarkCapabilityLiterals,
    assertMarkCapabilitySourceCanonical,
    detectStructuralCapabilities,
    tagsAsCapabilities,
    auditScenarioCapabilityParity,
    auditPressureWriteGuards,
    LOCKED_PUBLIC_APIS,
    PRESSURE_WRITE_INVENTORY,
    PRESSURE_DISPLAY_FORBIDDEN_RE,
    PRESSURE_ORCHESTRATE_FORBIDDEN_RE,
    AFTERMATH_HP_SAN_FORBIDDEN_RE,
    SCOPE_FREEZE_AF,
    CANONICAL_CAPABILITY_IDS
};

if (typeof window !== 'undefined') window.CoCCapabilityRisk = CoCCapabilityRisk;
