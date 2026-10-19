/**
 * Creative Phase 5 (E1–E5 + X1–X3) smokes.
 */
import { strict as assert } from 'node:assert';
import {
    recommendNextChapter,
    unlockPrerequisites,
    unlocksForScenario,
    chapterMapStatus
} from '../js/data/arc_chapters.mjs';
import { arcLedgerMeta, carrySummary, emptyArcLedger } from '../js/state/arc_ledger.mjs';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { CoCScenarioCatalog } from '../js/data/scenarios/catalog.mjs';
import { auditScenarioEffects } from '../js/scenario/effects_apply.mjs';

assert.ok(unlockPrerequisites('court_recess').includes('newsroom_midnight'));
assert.ok(unlockPrerequisites('lighthouse_night_watch').includes('cliff_mist_run'));
assert.ok(unlocksForScenario('newsroom_midnight').includes('court_recess'));
assert.ok(unlocksForScenario('cliff_mist_run').includes('lighthouse_night_watch'));

const ledger = emptyArcLedger();
ledger.chapters = {
    unlocked: ['newsroom_midnight', 'court_recess'],
    completed: [{ id: 'newsroom_midnight' }]
};
ledger.version = 2;
ledger.mythosHeatFloor = 2;
ledger.characterSnapshot = [{ name: '测试员' }];
ledger.inventorySnapshot = [{ id: 'note' }];
ledger.flagsCarry = { reputation_hit: true };

const meta = arcLedgerMeta(ledger);
assert.ok(meta.blurb.includes('热度2'));
assert.ok(meta.hasSnapshot === false || typeof meta.hasSnapshot === 'boolean');
assert.equal(meta.unlockCount, 2);

const summary = carrySummary(ledger);
assert.ok(summary.names.includes('测试员'));
assert.equal(summary.flagCount, 1);

const get = (id) => BUILTIN_BY_ID[id];
const map = chapterMapStatus(ledger, get);
assert.ok(map.some((n) => n.id === 'court_recess'));

const rec = recommendNextChapter(ledger, get);
assert.ok(rec && rec.id === 'court_recess', 'recommend court_recess after newsroom');

assert.ok(BUILTIN_BY_ID.court_recess);
assert.ok(BUILTIN_BY_ID.lighthouse_night_watch);
assert.ok(!BUILTIN_BY_ID.lighthouse_night_watch.nodes.lamp_room.effects.chase);
assert.ok(BUILTIN_BY_ID.court_recess.nodes.ending_by_evidence.endingsByClueQuality);
assert.ok(BUILTIN_BY_ID.lighthouse_night_watch.nodes.debunk_note.effects.debunkFalseLead);

for (const id of ['court_recess', 'lighthouse_night_watch']) {
    const v = CoCScenarioCatalog.validate(BUILTIN_BY_ID[id]);
    assert.ok(v.ok, id + ': ' + (v.errors || []).join('; '));
    const ea = auditScenarioEffects(BUILTIN_BY_ID[id]);
    assert.equal(ea.errors.length, 0, id + ' effects: ' + ea.errors.join('; '));
}

const clues = [
    { id: 'a', meta: { falseLead: true }, status: 'investigating' },
    { id: 'b', meta: {}, status: 'investigating' }
];
const suspicious = clues.filter((c) => c.meta && c.meta.falseLead);
assert.equal(suspicious.length, 1);

console.log('creative_phase5_smoke: OK');
