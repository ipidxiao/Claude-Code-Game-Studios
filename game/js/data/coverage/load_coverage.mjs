/**
 * Load merged rules coverage (schema v2): meta + core_index + keeper_toc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVERAGE_DIR = __dirname;
const ROOT = path.join(__dirname, '..', '..', '..');

const IMPLEMENTED = new Set(['kernel', 'table', 'mapped']);
const CORE_BLOCKED = new Set(['missing', 'stub', 'partial']);
const FILL_KINDS = new Set(['settle', 'table']);
const REQUIRED_TOC = ['id', 'book', 'path', 'chapter', 'kind', 'status', 'priority'];

function readJson(relOrAbs) {
    const full = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(COVERAGE_DIR, relOrAbs);
    return JSON.parse(fs.readFileSync(full, 'utf8'));
}

export function loadCoverage(root = ROOT) {
    const dir = path.join(root, 'js', 'data', 'coverage');
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const core = JSON.parse(fs.readFileSync(path.join(dir, 'core_index.json'), 'utf8'));
    const toc = JSON.parse(fs.readFileSync(path.join(dir, 'keeper_toc.json'), 'utf8'));
    return {
        schemaVersion: meta.schemaVersion,
        book: meta.book,
        rulesetDefault: meta.rulesetDefault,
        statusLegend: meta.statusLegend,
        kindLegend: meta.kindLegend,
        gates: meta.gates,
        core,
        toc,
        /** Back-compat: coarse entries == core */
        entries: core
    };
}

export function validateCoverage(cov) {
    const errors = [];
    if (!cov || cov.schemaVersion !== 2) errors.push('schemaVersion must be 2');
    if (!Array.isArray(cov.core)) errors.push('core must be array');
    if (!Array.isArray(cov.toc)) errors.push('toc must be array');

    const coreIds = new Set();
    for (const e of cov.core || []) {
        if (!e.id) errors.push('core entry missing id');
        else if (coreIds.has(e.id)) errors.push('duplicate core id: ' + e.id);
        else coreIds.add(e.id);
        if (CORE_BLOCKED.has(e.status)) {
            errors.push('core gate fail: ' + e.id + ' status=' + e.status);
        }
    }

    const tocIds = new Set();
    for (const e of cov.toc || []) {
        for (const k of REQUIRED_TOC) {
            if (e[k] == null || e[k] === '') errors.push('toc ' + (e.id || '?') + ' missing ' + k);
        }
        if (e.id) {
            if (tocIds.has(e.id)) errors.push('duplicate toc id: ' + e.id);
            else tocIds.add(e.id);
        }
        if (e.status === 'mapped') {
            const maps = e.mapsTo || [];
            if (!maps.length) errors.push('mapped toc ' + e.id + ' needs mapsTo');
            for (const m of maps) {
                if (!coreIds.has(m)) errors.push('toc ' + e.id + ' mapsTo unknown core ' + m);
            }
        }
        if (e.status === 'table' && !e.table && !(e.mapsTo && e.mapsTo.length)) {
            errors.push('table toc ' + e.id + ' needs table path or mapsTo');
        }
    }

    const gates = cov.gates || {};
    if ((cov.toc || []).length < (gates.catalogMinLeaves || 0)) {
        errors.push('catalogMinLeaves not met: ' + cov.toc.length + ' < ' + gates.catalogMinLeaves);
    }
    if (gates.catalogComplete && (cov.toc || []).length < 1) {
        errors.push('catalogComplete requires non-empty toc');
    }

    const fill = computeFillRate(cov);
    const target = Number(gates.fillTarget) || 0;
    if (fill.rate + 1e-9 < target) {
        errors.push('fillTarget not met: ' + (fill.rate * 100).toFixed(1) + '% < ' + (target * 100).toFixed(1) + '%');
    }

    return { ok: errors.length === 0, errors, fill, coreIds, tocIds };
}

export function computeFillRate(cov) {
    const settleTable = (cov.toc || []).filter((e) => FILL_KINDS.has(e.kind));
    const done = settleTable.filter((e) => IMPLEMENTED.has(e.status));
    const total = settleTable.length;
    return {
        total,
        done: done.length,
        rate: total === 0 ? 1 : done.length / total,
        byChapter: summarizeByChapter(settleTable)
    };
}

function summarizeByChapter(list) {
    const out = {};
    for (const e of list) {
        const ch = e.chapter || 'Other';
        if (!out[ch]) out[ch] = { total: 0, done: 0 };
        out[ch].total += 1;
        if (IMPLEMENTED.has(e.status)) out[ch].done += 1;
    }
    return out;
}

export function coverageStats(cov) {
    const byStatus = {};
    const byKind = {};
    const byChapter = {};
    for (const e of cov.toc || []) {
        byStatus[e.status] = (byStatus[e.status] || 0) + 1;
        byKind[e.kind] = (byKind[e.kind] || 0) + 1;
        byChapter[e.chapter] = (byChapter[e.chapter] || 0) + 1;
    }
    return {
        tocLeaves: (cov.toc || []).length,
        coreEntries: (cov.core || []).length,
        byStatus,
        byKind,
        byChapter,
        fill: computeFillRate(cov),
        gates: cov.gates
    };
}

export { IMPLEMENTED, CORE_BLOCKED, FILL_KINDS, ROOT, COVERAGE_DIR, readJson };
