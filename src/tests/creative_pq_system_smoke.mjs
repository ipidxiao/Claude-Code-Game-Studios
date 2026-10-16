/**
 * P0–P4 desk pref gate + Q1–Q6 system smokes.
 */
import { strict as assert } from 'node:assert';
import {
    isDeskPrefPromptEnabled,
    setDeskPrefPromptEnabled,
    loadDeskPref,
    saveDeskPref,
    formatDeskPrefPrompt,
    normalizeDeskPref,
    emptyDeskPref,
    resetDeskPrefStorageForTests
} from '../js/data/desk_pref.mjs';
import {
    diffCapabilities,
    formatSaveCompareDiff,
    buildSaveCompareMeta,
    bucketContractAudit,
    buildEffectsCoverageMatrix,
    previewScenarioCapabilities
} from '../js/data/capability_system.mjs';
import {
    ARC_CHAPTER_TRANSITIONS,
    ARC_CHAPTER_UNLOCKS,
    transitionsFrom,
    unlocksForScenario
} from '../js/data/arc_chapters.mjs';
import { CREATIVE_SMOKE_CATALOG } from '../js/data/creative_smoke_catalog.mjs';
import { BUILTIN_SCENARIOS, BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { CoCScenarioCatalog } from '../js/data/scenarios/catalog.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// P0: feature default off
resetDeskPrefStorageForTests();
setDeskPrefPromptEnabled(false);
assert.equal(isDeskPrefPromptEnabled(), false);
setDeskPrefPromptEnabled(true);
assert.equal(isDeskPrefPromptEnabled(), true);
setDeskPrefPromptEnabled(false);
assert.equal(isDeskPrefPromptEnabled(), false);

// P1/P3: pref round-trip
const pref = normalizeDeskPref({
    keeperStyle: 'strict',
    carryMode: 'reset',
    capabilityFilter: '假线索'
});
assert.equal(pref.keeperStyle, 'strict');
saveDeskPref('court_recess', pref);
const loaded = loadDeskPref('court_recess');
assert.equal(loaded.carryMode, 'reset');
assert.equal(loaded.capabilityFilter, '假线索');

// P2: prompt text
const body = formatDeskPrefPrompt(loaded);
assert.ok(body.includes('严苛'));
assert.ok(body.includes('重置'));
assert.ok(body.includes('假线索'));
assert.ok(formatDeskPrefPrompt(emptyDeskPref()).includes('电影'));

// Q1
const diff = diffCapabilities(['追逐', '双时钟'], ['双时钟', '假线索']);
assert.ok(diff.predictedUnused.includes('追逐'));
assert.ok(diff.unexpected.includes('假线索'));
assert.ok(diff.line.includes('预告未触发'));

// Q2
const metaA = buildSaveCompareMeta({
    mythosHeat: 3,
    arcLedger: { mythosHeatFloor: 2, investigators: [{ topClueQuality: 'solid' }] },
    ui: { endingRecap: { endingKey: 'ending_win', capabilitiesUsed: ['双时钟'] } },
    scenarioRunner: {}
});
const metaB = buildSaveCompareMeta({
    mythosHeat: 1,
    arcLedger: { investigators: [{ topClueQuality: 'weak' }] },
    ui: { endingRecap: { endingKey: 'ending_weak', capabilitiesUsed: [] } },
    scenarioRunner: {}
});
const cmp = formatSaveCompareDiff(metaA, metaB);
assert.ok(cmp.includes('终局'));
assert.ok(cmp.includes('证据'));

// Q3
const v = CoCScenarioCatalog.validate(BUILTIN_BY_ID.court_recess);
const health = bucketContractAudit(v);
assert.ok(health.ok);
assert.ok(health.summary.includes('通过'));
const bad = bucketContractAudit({ ok: false, errors: ['x: narrative too short', 'y: checkpoint missing', 'z: unknown effect key'] });
assert.ok(bad.buckets.prose.length >= 1);
assert.ok(bad.summary.includes('未通过'));

// Q4
const matrix = buildEffectsCoverageMatrix(BUILTIN_SCENARIOS);
assert.ok(matrix.length >= 10);
assert.ok(matrix.some((r) => r.id === 'cliff_mist_run' && r.hasChase));

// Q5
assert.ok(ARC_CHAPTER_TRANSITIONS.length >= 1);
const fromNews = transitionsFrom('newsroom_midnight');
assert.ok(fromNews.some((t) => t.to === 'court_recess' && t.on === 'complete'));
assert.deepEqual(
    unlocksForScenario('cliff_mist_run'),
    (ARC_CHAPTER_UNLOCKS.cliff_mist_run || []).slice()
);

// Q6
assert.ok(CREATIVE_SMOKE_CATALOG.some((e) => e.id === 'creative_pq_system_smoke'));
const testsDir = path.join(path.dirname(fileURLToPath(import.meta.url)));
for (const e of CREATIVE_SMOKE_CATALOG) {
    assert.ok(fs.existsSync(path.join(testsDir, e.id + '.mjs')), 'missing ' + e.id);
}
assert.ok(previewScenarioCapabilities(BUILTIN_BY_ID.lighthouse_night_watch).includes('假线索'));

console.log('creative_pq_system_smoke: OK');
