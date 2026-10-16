/**
 * Wave A (IR0–IR4) — CapabilityDecl intermediate representation.
 * IR0: schema stamp  CAPABILITY_DECL_SCHEMA
 * IR1: frozen decl table for all canonical capability ids
 * IR2+: consumers (glossary / soft-vs-hard) read via helpers below
 * Do not break LOCKED_PUBLIC_APIS signatures on CoCCapabilitySystem.
 */

/** IR0 — schema version for CapabilityDecl rows (independent of CAPABILITY_IR_VERSION stamp). */
export const CAPABILITY_DECL_SCHEMA = 1;

/**
 * @typedef {object} CapabilityDecl
 * @property {string} id — canonical Chinese id
 * @property {string} label
 * @property {string} gloss — keeper-facing short help
 * @property {'hard'|'soft'} kind — hard: tag↔structure parity required; soft: tag-only ads OK
 * @property {readonly string[]} aliases
 * @property {readonly string[]} structuralHints — documentation of structural detectors (not enforced here)
 * @property {number} schema — CAPABILITY_DECL_SCHEMA at land time
 */

/** IR1 — CapabilityDecl table (must cover CANONICAL_CAPABILITY_IDS). */
export const CAPABILITY_DECL_TABLE = Object.freeze([
    Object.freeze({
        id: '证据分叉',
        label: '证据分叉',
        gloss: '终局与选项随线索质量（弱/实/铁）分叉。',
        kind: 'hard',
        aliases: Object.freeze(['evidence', '证据分叉']),
        structuralHints: Object.freeze(['endingsByClueQuality', 'branchByClueQuality', 'requiresClueQuality']),
        schema: CAPABILITY_DECL_SCHEMA
    }),
    Object.freeze({
        id: '追逐',
        label: '追逐',
        gloss: '徒步或载具追逐段；可能含险情与速度检定。',
        kind: 'hard',
        aliases: Object.freeze(['chase', '追逐']),
        structuralHints: Object.freeze(['effects.chase', 'node.chase']),
        schema: CAPABILITY_DECL_SCHEMA
    }),
    Object.freeze({
        id: '神话热度',
        label: '神话热度',
        gloss: '异常关注 0–5；高热度影响叙事与存档笔迹。',
        kind: 'soft',
        aliases: Object.freeze(['heat', 'mythos_heat', '神话热度']),
        structuralHints: Object.freeze(['effects.mythosHeat', 'effects.addMythosHeat']),
        schema: CAPABILITY_DECL_SCHEMA
    }),
    Object.freeze({
        id: '战后余波',
        label: '战后余波',
        gloss: '重伤/目击/信誉等余波写入下局压力。',
        kind: 'soft',
        aliases: Object.freeze(['aftermath', '战后余波']),
        structuralHints: Object.freeze(['aftermath flags / reputation']),
        schema: CAPABILITY_DECL_SCHEMA
    }),
    Object.freeze({
        id: '战役账本',
        label: '战役账本',
        gloss: '短模可继承档案、热度下限与章节解锁。',
        kind: 'hard',
        aliases: Object.freeze(['arc', 'arc_ledger', '战役账本']),
        structuralHints: Object.freeze(['readsArcLedger', 'requiresChapterUnlock']),
        schema: CAPABILITY_DECL_SCHEMA
    }),
    Object.freeze({
        id: '双时钟',
        label: '双时钟',
        gloss: '调查/仪式双轨推进；满轨可强制终局。',
        kind: 'hard',
        aliases: Object.freeze(['clocks', '双时钟']),
        structuralHints: Object.freeze(['scenario.clocks']),
        schema: CAPABILITY_DECL_SCHEMA
    }),
    Object.freeze({
        id: '假线索',
        label: '假线索',
        gloss: '可疑笔记可空耗一轮；线索板可揭穿。',
        kind: 'hard',
        aliases: Object.freeze(['false_lead', 'falseLead', '假线索']),
        structuralHints: Object.freeze(['falseLead', 'falseNext', 'effects.debunkFalseLead']),
        schema: CAPABILITY_DECL_SCHEMA
    })
]);

const _byId = Object.freeze(
    Object.fromEntries(CAPABILITY_DECL_TABLE.map((d) => [d.id, d]))
);

export function getCapabilityDecl(id) {
    const key = String(id || '');
    return _byId[key] || null;
}

export function listCapabilityDecls() {
    return CAPABILITY_DECL_TABLE.slice();
}

export function softCapabilityIds() {
    return CAPABILITY_DECL_TABLE.filter((d) => d.kind === 'soft').map((d) => d.id);
}

export function hardCapabilityIds() {
    return CAPABILITY_DECL_TABLE.filter((d) => d.kind === 'hard').map((d) => d.id);
}

/**
 * IR4 — assert table covers expected canonical ids and schema stamp.
 * @param {readonly string[]} canonicalIds
 */
export function assertCapabilityDeclTable(canonicalIds) {
    const errors = [];
    const ids = CAPABILITY_DECL_TABLE.map((d) => d.id);
    const set = new Set(ids);
    if (ids.length !== set.size) errors.push('duplicate decl ids');
    for (const id of canonicalIds || []) {
        if (!set.has(id)) errors.push('missing decl for canonical id: ' + id);
    }
    for (const d of CAPABILITY_DECL_TABLE) {
        if (!d || !d.id) errors.push('empty decl');
        else if (Number(d.schema) !== CAPABILITY_DECL_SCHEMA) {
            errors.push('schema mismatch for ' + d.id);
        } else if (d.kind !== 'hard' && d.kind !== 'soft') {
            errors.push('bad kind for ' + d.id);
        } else if (!d.gloss) {
            errors.push('missing gloss: ' + d.id);
        }
    }
    for (const id of set) {
        if (canonicalIds && canonicalIds.length && !canonicalIds.includes(id)) {
            errors.push('decl id not in canonical list: ' + id);
        }
    }
    return { ok: errors.length === 0, errors, ids };
}

/** Glossary rows derived from decls (keeps Phase-6 shape). */
export function glossaryFromDecls() {
    return CAPABILITY_DECL_TABLE.map((d) =>
        Object.freeze({ id: d.id, label: d.label, gloss: d.gloss })
    );
}

export const CoCCapabilityDecl = {
    CAPABILITY_DECL_SCHEMA,
    CAPABILITY_DECL_TABLE,
    getCapabilityDecl,
    listCapabilityDecls,
    softCapabilityIds,
    hardCapabilityIds,
    assertCapabilityDeclTable,
    glossaryFromDecls
};

if (typeof window !== 'undefined') window.CoCCapabilityDecl = CoCCapabilityDecl;
