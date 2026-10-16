/**
 * Wave C (DP0–DP4) — Display Pipeline read-only assemble.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    DISPLAY_PIPELINE_VERSION,
    listDisplayChannels,
    assemblePressureHudLine,
    assemblePressureChoiceSuffix,
    assembleDeskPressureSlice,
    runDisplayChannel
} from '../js/data/display_pipeline.mjs';
import { pressureHudLine, pressureChoiceSuffix } from '../js/data/arc_pressure_copy.mjs';
import { setPressureFlag, busAddMythosHeat } from '../js/state/pressure_bus.mjs';
import { SCOPE_FREEZE_AF, PRESSURE_WRITE_INVENTORY, auditPressureWriteGuards } from '../js/data/capability_risk.mjs';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(DISPLAY_PIPELINE_VERSION, 1);
assert.ok(['wave_c_done', 'wave_d_done', 'wave_e_done', 'wave_f_done'].includes(SCOPE_FREEZE_AF.status));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
assert.ok(SCOPE_FREEZE_AF.frozenWaves.includes('EV') || SCOPE_FREEZE_AF.frozenWaves.includes('SM') || SCOPE_FREEZE_AF.completedWaves.includes('EV'));
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('DP'));

const ch = listDisplayChannels();
assert.ok(ch.some((c) => c.id === 'core.hud'));
assert.ok(ch.some((c) => c.id === 'core.choice'));
assert.ok(ch.some((c) => c.id === 'core.desk'));

const gs = {
    mythosHeat: 0,
    flags: {},
    scenarioRunner: { flags: {} },
    arcLedger: { mythosHeatFloor: 2 },
    chatHistory: []
};
busAddMythosHeat(gs, 3, 'dp-smoke');
setPressureFlag(gs, 'reputation_hit', true);

const hud = assemblePressureHudLine(gs);
const expectedHud = pressureHudLine({ reputation_hit: true }, 3);
assert.equal(hud, expectedHud);
assert.ok(hud.includes('热度') || hud.includes('风声') || hud.includes('信誉'));

const suffix = assemblePressureChoiceSuffix(gs);
assert.equal(suffix, pressureChoiceSuffix({ reputation_hit: true }));

const court = BUILTIN_BY_ID.court_recess;
const desk = assembleDeskPressureSlice(gs, court);
assert.equal(desk.pipelineVersion, 1);
assert.equal(desk.heat, 3);
assert.equal(desk.heatFloor, 2);
assert.equal(desk.flags.reputation_hit, true);
assert.equal(desk.hudLine, hud);
assert.ok(Array.isArray(desk.capabilities));
assert.ok(desk.saveCompareMeta && desk.saveCompareMeta.capabilityIrVersion === 1);

assert.equal(runDisplayChannel('core.hud', gs), hud);

const inv = PRESSURE_WRITE_INVENTORY.find((e) => e.file.includes('display_pipeline'));
assert.ok(inv && inv.mode === 'display');
const guards = auditPressureWriteGuards({
    readFile: (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
});
assert.equal(guards.ok, true, guards.errors.join('; '));

// Pure locked APIs still exist with same arity
assert.equal(typeof pressureHudLine, 'function');
assert.equal(typeof pressureChoiceSuffix, 'function');

console.log('display_pipeline_wave_c_smoke: OK', {
    dp: DISPLAY_PIPELINE_VERSION,
    channels: ch.map((c) => c.id),
    freeze: SCOPE_FREEZE_AF.status
});
