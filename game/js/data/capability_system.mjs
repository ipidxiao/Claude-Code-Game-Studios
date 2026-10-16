/**
 * Creative Phase 6 — capability preview, glossary, chapter progress, save blurb compose.
 * Pure data helpers; no HP/SAN writes.
 */
import {
    detectStructuralCapabilities,
    normalizeCapabilityList,
    tagsAsCapabilities,
    CAPABILITY_IR_VERSION,
    softCapabilityIds
} from './capability_risk.mjs';
import { glossaryFromDecls } from './capability_decl.mjs';

/** Filter / HUD tags — IR2: derived from CapabilityDecl table (wave A). */
export const CAPABILITY_GLOSSARY = Object.freeze(glossaryFromDecls());

export const CAPABILITY_FILTER_IDS = Object.freeze(
    CAPABILITY_GLOSSARY.map((e) => e.id)
);

/**
 * Derive "本局会用到" from tags + structural fields (desk preview).
 * Tags are canonicalized via capability_risk aliases.
 * @returns {string[]}
 */
export function previewScenarioCapabilities(scenario) {
    if (!scenario) return [];
    const out = [];
    const add = (tag) => {
        if (tag && !out.includes(tag)) out.push(tag);
    };
    for (const t of tagsAsCapabilities(scenario)) add(t);
    for (const t of detectStructuralCapabilities(scenario)) add(t);
    // Tag-only soft caps (decl.kind === soft) still allowed without structural detect.
    const soft = new Set(softCapabilityIds());
    for (const t of normalizeCapabilityList(scenario.tags || [])) {
        if (soft.has(t)) add(t);
    }
    return out;
}

export function capabilityGloss(id) {
    const hit = CAPABILITY_GLOSSARY.find((e) => e.id === id);
    return hit ? hit.gloss : '';
}

export function formatCapabilityPreview(caps) {
    const list = Array.isArray(caps) ? caps : [];
    if (!list.length) return '本局会用到：常规调查（无特殊标签）';
    return '本局会用到：' + list.join(' · ');
}

/**
 * @param {{ status: string }[]} rows
 */
export function chapterMapProgress(rows) {
    const list = Array.isArray(rows) ? rows : [];
    let done = 0;
    let playable = 0;
    let locked = 0;
    for (const r of list) {
        if (r.status === 'done') done++;
        else if (r.status === 'locked') locked++;
        else playable++;
    }
    const total = list.length || 1;
    return {
        done,
        playable,
        locked,
        total: list.length,
        doneRatio: done / total,
        unlockedRatio: (done + playable) / total,
        label: '已完成 ' + done + ' · 可玩 ' + playable + ' · 未解锁 ' + locked
    };
}

/**
 * Prefer ending recap line for save list; fall back to heat/journal blurb.
 */
export function composeSaveBlurb(gameState, heatBlurbFn) {
    if (!gameState) return '残页模糊。';
    const pinned = gameState.endingSaveBlurb;
    if (pinned) return String(pinned);

    const recap = gameState.ui && gameState.ui.endingRecap;
    if (recap && Array.isArray(recap.lines) && recap.lines.length) {
        return buildEndingSaveBlurb(recap);
    }

    if (typeof heatBlurbFn === 'function') return heatBlurbFn(gameState);
    return '残页模糊。';
}

export function buildEndingSaveBlurb(recap) {
    if (!recap) return '';
    const lines = Array.isArray(recap.lines) ? recap.lines : [];
    const first = (lines[0] && lines[0].text) || ('终局：' + (recap.endingKey || '?'));
    const caps = Array.isArray(recap.capabilitiesUsed) ? recap.capabilitiesUsed : [];
    let line = String(first);
    const evidence = lines.find((l) => l && l.t === 'evidence');
    if (evidence && evidence.text) line += ' · ' + evidence.text;
    if (caps.length) line += ' · 用到：' + caps.join(' · ');
    return line.replace(/\s+/g, ' ').trim().slice(0, 180);
}

/** Q1: preview vs used capability diff. */
export function diffCapabilities(preview, used) {
    const p = Array.isArray(preview) ? preview : [];
    const u = Array.isArray(used) ? used : [];
    const predictedUnused = p.filter((x) => u.indexOf(x) < 0);
    const unexpected = u.filter((x) => p.indexOf(x) < 0);
    return {
        predictedUnused,
        unexpected,
        matched: p.filter((x) => u.indexOf(x) >= 0),
        line: formatCapabilityDiffLine(predictedUnused, unexpected)
    };
}

export function formatCapabilityDiffLine(predictedUnused, unexpected) {
    const parts = [];
    if (predictedUnused && predictedUnused.length) {
        parts.push('预告未触发：' + predictedUnused.join(' · '));
    }
    if (unexpected && unexpected.length) {
        parts.push('额外触发：' + unexpected.join(' · '));
    }
    return parts.length ? parts.join('；') : '能力对账：预告与本局一致';
}

/** Q2 helper meta for save slots. */
export function buildSaveCompareMeta(gameState) {
    if (!gameState) {
        return {
            endingKey: '',
            evidence: '',
            capabilitiesUsed: [],
            heat: 0,
            heatFloor: 0,
            capabilityIrVersion: Number(CAPABILITY_IR_VERSION) || 0
        };
    }
    const recap = (gameState.ui && gameState.ui.endingRecap) || {};
    const ledger = gameState.arcLedger || {};
    const inv = (ledger.investigators && ledger.investigators[0]) || {};
    const r = gameState.scenarioRunner || {};
    const caps = Array.isArray(recap.capabilitiesUsed)
        ? recap.capabilitiesUsed
        : (Array.isArray(r.capabilitiesUsed) ? r.capabilitiesUsed : []);
    let irVer = 0;
    if (recap.capabilityIrVersion != null) irVer = Number(recap.capabilityIrVersion) || 0;
    else irVer = Number(CAPABILITY_IR_VERSION) || 0;
    return {
        endingKey: recap.endingKey || gameState.endingKey || '',
        evidence: inv.topClueQuality || '',
        capabilitiesUsed: caps.slice(),
        heat: Number(gameState.mythosHeat) || 0,
        heatFloor: Number(ledger.mythosHeatFloor) || 0,
        capabilityDiff: recap.capabilityDiffLine || '',
        capabilityIrVersion: irVer
    };
}

export function formatSaveCompareDiff(metaA, metaB) {
    if (!metaA || !metaB) return '';
    const parts = [];
    const dHeat = (Number(metaA.heat) || 0) - (Number(metaB.heat) || 0);
    parts.push('热度 ' + (dHeat >= 0 ? '+' : '') + dHeat);
    if (metaA.endingKey || metaB.endingKey) {
        parts.push('终局 ' + (metaA.endingKey || '—') + ' vs ' + (metaB.endingKey || '—'));
    }
    if (metaA.evidence || metaB.evidence) {
        parts.push('证据 ' + (metaA.evidence || '—') + ' vs ' + (metaB.evidence || '—'));
    }
    const ca = (metaA.capabilitiesUsed || []).join('·') || '—';
    const cb = (metaB.capabilitiesUsed || []).join('·') || '—';
    if (ca !== '—' || cb !== '—') parts.push('能力 ' + ca + ' vs ' + cb);
    return '对比差：' + parts.join(' · ');
}

/** Q3: bucket audit errors for contract health board. */
export function bucketContractAudit(audit) {
    const errors = (audit && audit.errors) || [];
    const buckets = { prose: [], effects: [], checkpoints: [], other: [] };
    for (const err of errors) {
        const s = String(err || '');
        if (/narrative|groupOutcome|label|ending|dry|【结局|prose/i.test(s)) buckets.prose.push(s);
        else if (/effect|sanCheck|pendingRoll|unknown key|combat|chase/i.test(s)) buckets.effects.push(s);
        else if (/checkpoint/i.test(s)) buckets.checkpoints.push(s);
        else buckets.other.push(s);
    }
    const ok = !!(audit && audit.ok);
    const n = errors.length;
    return {
        ok,
        buckets,
        summary: ok
            ? '契约健康度：通过'
            : ('契约健康度：未通过 · 散文 ' + buckets.prose.length
                + ' / 效果 ' + buckets.effects.length
                + ' / 检查点 ' + buckets.checkpoints.length
                + ' / 其他 ' + buckets.other.length
                + '（共 ' + n + '）')
    };
}

/** Q4: scan builtins for capability coverage matrix. */
export function buildEffectsCoverageMatrix(scenarios) {
    const list = Array.isArray(scenarios) ? scenarios : [];
    return list.map((sc) => {
        const caps = previewScenarioCapabilities(sc);
        return {
            id: sc.id,
            title: sc.title || sc.id,
            caps,
            hasClocks: !!sc.clocks,
            hasChase: caps.includes('追逐'),
            hasFalseLead: caps.includes('假线索'),
            hasEvidence: caps.includes('证据分叉'),
            readsArc: !!(sc.readsArcLedger || sc.requiresChapterUnlock)
        };
    });
}

export const CoCCapabilitySystem = {
    CAPABILITY_IR_VERSION,
    CAPABILITY_GLOSSARY,
    CAPABILITY_FILTER_IDS,
    previewScenarioCapabilities,
    capabilityGloss,
    formatCapabilityPreview,
    chapterMapProgress,
    composeSaveBlurb,
    buildEndingSaveBlurb,
    diffCapabilities,
    formatCapabilityDiffLine,
    buildSaveCompareMeta,
    formatSaveCompareDiff,
    bucketContractAudit,
    buildEffectsCoverageMatrix
};
