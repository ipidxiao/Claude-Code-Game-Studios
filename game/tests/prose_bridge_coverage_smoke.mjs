/**
 * Smoke: ProseBridge registers all immersive banks; enrichment beats a short stub.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { CoCScenarioUniversityOccult } from '../js/data/scenarios/university_occult.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CoCProseBridge } = await import(
    pathToFileURL(path.join(ROOT, 'js/scenario/prose_bridge.mjs')).href + `?t=${Date.now()}`
);

const REQUIRED = [
    'tutorial',
    'abandoned_asylum',
    'carnival_of_masks',
    'coastal_festival',
    'lighthouse_signal',
    'missing_child',
    'train_to_nowhere',
    'university_occult',
];

for (const id of REQUIRED) {
    assert.ok(CoCProseBridge.hasProseBank(id), `missing prose bank registration: ${id}`);
}

assert.strictEqual(CoCProseBridge.getScenarioIds().length, REQUIRED.length);

const uni = CoCScenarioUniversityOccult;
const start = uni.nodes[uni.startNode];
const opening = String(start.narrative || '');
const stub = '短桩';
await CoCProseBridge.loadProseBank('university_occult');
const enriched = CoCProseBridge.enrichNarrativeSync(stub, ['campus'], 'university_occult');
assert.ok(
    enriched.length > stub.length * 3,
    `university enrich too short: stub=${stub.length} enriched=${enriched.length}`
);
assert.ok(opening.length > stub.length * 3, 'university opening is the prose bank');
assert.ok(enriched.startsWith(opening.trim().slice(0, 80)), 'campus key matches the live opening');

// Built-in ESM tutorial (packages/tutorial.json was an older stub export, removed in R29.67).
const { BUILTIN_BY_ID } = await import(pathToFileURL(path.join(ROOT, 'js/data/scenarios/builtins.mjs')).href);
const tut = BUILTIN_BY_ID.tutorial;
const intro = tut.nodes[tut.startNode];
await CoCProseBridge.loadProseBank('tutorial');
const tKeys = intro._proseKeys || [intro.proseKey || tut.startNode];
const tStub = CoCProseBridge.enrichNarrativeSync(stub, tKeys, 'tutorial');
assert.ok(tStub.length > stub.length * 3, 'tutorial bank enriches a stub');
assert.ok(tStub.startsWith(String(intro.narrative).trim().slice(0, 80)), 'tutorial intro key matches the live opening');
// The node already inlines the bank prose: enrichment must not show it twice (R29.67).
const tFull = CoCProseBridge.enrichNarrativeSync(intro.narrative, tKeys, 'tutorial');
assert.equal(tFull.trim(), String(intro.narrative).trim(), 'inlined prose must not be prepended again');

// Every node of every built-in with a prose bank shows its prose exactly once.
let checkedNodes = 0;
for (const id of REQUIRED) {
    const sc = BUILTIN_BY_ID[id];
    assert.ok(sc, 'built-in scenario missing: ' + id);
    await CoCProseBridge.loadProseBank(sc.proseScenarioId || id);
    for (const [nodeId, n] of Object.entries(sc.nodes)) {
        const head = String(n.narrative || '').trim().slice(0, 30);
        if (head.length < 20) continue;
        const keys = n._proseKeys || (n.proseKey ? [n.proseKey] : [nodeId]);
        const g = CoCProseBridge.enrichNarrativeGatedSync(n.narrative, keys, sc.proseScenarioId || id, { awaitingSkillCheck: !!n.branch });
        const shown = String(g.visible || '') + String(g.deferred || '');
        assert.equal(shown.split(head).length - 1, 1, `${id}/${nodeId}: prose shown more than once`);
        checkedNodes++;
    }
}
assert.ok(checkedNodes > 300, 'expected to check all long-form nodes, got ' + checkedNodes);

console.log('prose_bridge_coverage_smoke: OK', {
    banks: REQUIRED.length,
    uniOpening: opening.length,
    uniEnriched: enriched.length,
});
