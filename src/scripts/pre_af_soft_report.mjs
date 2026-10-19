/**
 * Soft gap report for pre-A/F.
 * Usage: node scripts/pre_af_soft_report.mjs [--strict]
 *
 * --strict fails on: over-advertised hard caps, pack meta lag vs mjs,
 * catalog smoke missing from test:engine. Remote-only packages are OK.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    detectStructuralCapabilities,
    tagsAsCapabilities,
    CANONICAL_CAPABILITY_IDS
} from '../js/data/capability_risk.mjs';
import { BUILTIN_SCENARIOS, BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { ARC_CHAPTER_MAP } from '../js/data/arc_chapters.mjs';
import { CREATIVE_SMOKE_CATALOG } from '../js/data/creative_smoke_catalog.mjs';
import { CoCScenarioRemoteCatalog } from '../js/data/scenarios/remote_catalog.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const notes = [];
const softFails = [];

/** Soft-only ads (structure detect intentionally does not emit these). */
const SOFT_ONLY = new Set(['神话热度', '战后余波']);
const HARD_CAPS = CANONICAL_CAPABILITY_IDS.filter((id) => !SOFT_ONLY.has(id));

const packDir = path.join(root, 'js', 'data', 'scenarios', 'packages');
const packIds = new Set(
    fs.readdirSync(packDir).filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, ''))
);
const remoteIds = new Set((CoCScenarioRemoteCatalog.entries || []).map((e) => e.id));

for (const sc of BUILTIN_SCENARIOS) {
    const st = new Set(detectStructuralCapabilities(sc));
    const tg = tagsAsCapabilities(sc);
    const over = tg.filter((t) => HARD_CAPS.includes(t) && !st.has(t));
    if (over.length) softFails.push('over-advertise: ' + sc.id + ' → ' + over.join(','));
    const softOnly = tg.filter((t) => SOFT_ONLY.has(t) && !st.has(t));
    if (softOnly.length) notes.push('soft-tag: ' + sc.id + ' → ' + softOnly.join(','));
    if (!packIds.has(sc.id) && (st.size || tg.length)) {
        notes.push('no-package: ' + sc.id);
    }
}

const chapterIds = new Set(ARC_CHAPTER_MAP.map((n) => n.id));
for (const sc of BUILTIN_SCENARIOS) {
    if (sc.requiresChapterUnlock && !chapterIds.has(sc.id)) {
        softFails.push('chapter-unlock-not-in-map: ' + sc.id);
    }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const engine = pkg.scripts['test:engine'] || '';
for (const e of CREATIVE_SMOKE_CATALOG) {
    const file = e.file || ('tests/' + e.id + '.mjs');
    if (!engine.includes(path.basename(file))) {
        softFails.push('catalog-not-in-test-engine: ' + e.id);
    }
}

for (const id of packIds) {
    if (BUILTIN_BY_ID[id]) continue;
    if (remoteIds.has(id)) {
        notes.push('remote-only-package: ' + id);
        continue;
    }
    softFails.push('orphan-package: ' + id);
}

for (const id of packIds) {
    const sc = BUILTIN_BY_ID[id];
    if (!sc) continue;
    const pack = JSON.parse(fs.readFileSync(path.join(packDir, id + '.json'), 'utf8'));
    const mjsCaps = tagsAsCapabilities(sc);
    const packCaps = tagsAsCapabilities({ tags: pack.tags || [] });
    for (const t of mjsCaps) {
        if (!packCaps.includes(t)) softFails.push('pack-tag-lag: ' + id + ':' + t);
    }
    if (!!sc.readsArcLedger !== !!pack.readsArcLedger) {
        softFails.push('pack-readsArcLedger-lag: ' + id);
    }
    if (!!sc.requiresChapterUnlock !== !!pack.requiresChapterUnlock) {
        softFails.push('pack-requiresChapterUnlock-lag: ' + id);
    }
}

console.log('=== soft notes (' + notes.length + ') ===');
for (const n of notes) console.log(n);
console.log('=== soft fails (' + softFails.length + ') ===');
for (const n of softFails) console.log(n);

if (strict && softFails.length) {
    process.exit(1);
}
console.log(strict ? 'pre_af_soft_report: OK' : 'pre_af_soft_report: done (use --strict to fail on soft fails)');
