/**
 * Wave E (EV0–EV4) — Encounter Verdict read-only seed-gate score.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    ENCOUNTER_VERDICT_VERSION,
    ENCOUNTER_VERDICT_CLASSES,
    clueTierRank,
    readEncounterGate,
    scoreEncounterVerdict,
    assembleEncounterVerdict,
    formatEncounterVerdictLine
} from '../js/data/encounter_verdict.mjs';
import { CLUE_QUALITY_RANK } from '../js/data/investigate_outcomes.mjs';
import { SCOPE_FREEZE_AF, PRESSURE_WRITE_INVENTORY, auditPressureWriteGuards, LOCKED_PUBLIC_APIS } from '../js/data/capability_risk.mjs';
import { previewScenarioCapabilities } from '../js/data/capability_system.mjs';
import { pressureHudLine } from '../js/data/arc_pressure_copy.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(ENCOUNTER_VERDICT_VERSION, 1);
assert.deepEqual([...ENCOUNTER_VERDICT_CLASSES], ['unscored', 'short', 'met', 'over']);
assert.ok(['wave_e_done', 'wave_f_done'].includes(SCOPE_FREEZE_AF.status));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('EV'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('SM'));
assert.ok(SCOPE_FREEZE_AF.frozenWaves.includes('TC') || SCOPE_FREEZE_AF.completedWaves.includes('TC'));
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('EV'));
assert.equal(clueTierRank('weak'), CLUE_QUALITY_RANK.partial);
assert.equal(clueTierRank('solid'), CLUE_QUALITY_RANK.solid);
assert.equal(clueTierRank('decisive'), CLUE_QUALITY_RANK.decisive);

const base = {
    encounterVariant: 'B',
    clueBoard: { clues: [{ quality: 'partial' }] },
    scenarioRunner: { flags: { seedRequiresClueQuality: 'solid', encounterVariant: 'B' } },
    mythosHeat: 1,
    flags: {}
};

const shortGate = readEncounterGate(base);
assert.equal(shortGate.variant, 'B');
assert.equal(shortGate.requiredQuality, 'solid');
assert.equal(shortGate.achievedKey, 'weak');
assert.equal(scoreEncounterVerdict(shortGate).klass, 'short');
const shortV = assembleEncounterVerdict(base);
assert.equal(shortV.verdictVersion, 1);
assert.equal(shortV.klass, 'short');
assert.ok(shortV.delta < 0);
assert.equal(shortV.line, formatEncounterVerdictLine(shortV));
assert.ok(shortV.line.includes('未达标'));
assert.ok(shortV.line.includes('变体B'));

const met = assembleEncounterVerdict({
    clueBoard: { clues: [{ quality: 'solid' }] },
    scenarioRunner: { flags: { seedRequiresClueQuality: 'solid' } }
});
assert.equal(met.klass, 'met');
assert.equal(met.delta, 0);

const over = assembleEncounterVerdict({
    clueBoard: { clues: [{ quality: 'decisive' }, { quality: 'partial' }] },
    scenarioRunner: { flags: { seedRequiresClueQuality: 'partial' } }
});
assert.equal(over.klass, 'over');
assert.ok(over.delta > 0);

const open = assembleEncounterVerdict({
    clueBoard: { clues: [] },
    scenarioRunner: { flags: {} }
});
assert.equal(open.klass, 'unscored');
assert.equal(open.delta, null);
assert.equal(open.requiredQuality, null);
assert.equal(open.achievedRank, 0);

const invalidGate = assembleEncounterVerdict({
    clueBoard: { clues: [{ quality: 'decisive' }] },
    scenarioRunner: { flags: { seedRequiresClueQuality: 'decisve' } }
});
assert.equal(invalidGate.klass, 'unscored');
assert.equal(invalidGate.requiredQuality, null);
assert.equal(invalidGate.invalidRequiredQuality, 'decisve');
assert.ok(invalidGate.line.includes('门槛无效'));

const emptyVsPartial = assembleEncounterVerdict({
    clueBoard: { clues: [] },
    scenarioRunner: { flags: { seedRequiresClueQuality: 'partial' } }
});
assert.equal(emptyVsPartial.achievedKey, 'weak');
assert.equal(emptyVsPartial.achievedRank, 0);
assert.equal(emptyVsPartial.klass, 'short');

const heatBefore = base.mythosHeat;
const flagsBefore = JSON.stringify(base.flags);
const runnerFlagsBefore = JSON.stringify(base.scenarioRunner.flags);
assembleEncounterVerdict(base);
assert.equal(base.mythosHeat, heatBefore);
assert.equal(JSON.stringify(base.flags), flagsBefore);
assert.equal(JSON.stringify(base.scenarioRunner.flags), runnerFlagsBefore);

const inv = PRESSURE_WRITE_INVENTORY.find((e) => e.file.includes('encounter_verdict'));
assert.ok(inv && inv.mode === 'display');
const guards = auditPressureWriteGuards({
    readFile: (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
});
assert.equal(guards.ok, true, guards.errors.join('; '));

assert.equal(typeof previewScenarioCapabilities, 'function');
assert.equal(typeof pressureHudLine, 'function');
assert.ok(LOCKED_PUBLIC_APIS.CoCCapabilitySystem.includes('previewScenarioCapabilities'));
assert.ok(LOCKED_PUBLIC_APIS.CoCArcPressureCopy.includes('pressureHudLine'));

const runnerSrc = fs.readFileSync(path.join(root, 'js', 'scenario', 'runner.mjs'), 'utf8');
assert.ok(runnerSrc.includes('assembleEncounterVerdict'));
assert.ok(runnerSrc.includes("t: 'verdict'"));

console.log('encounter_verdict_wave_e_smoke: OK', {
    ev: ENCOUNTER_VERDICT_VERSION,
    freeze: SCOPE_FREEZE_AF.status,
    sample: shortV.klass
});
