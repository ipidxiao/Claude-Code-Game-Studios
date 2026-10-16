/**
 * Wave B (PB0–PB4) — PressureBus orchestration.
 */
import { strict as assert } from 'node:assert';
import {
    PRESSURE_BUS_VERSION,
    listPressureChannels,
    busAddMythosHeat,
    setPressureFlag,
    getPressureSnapshot,
    dispatchPressure,
    pressureHudInputs
} from '../js/state/pressure_bus.mjs';
import { pressureHudLine } from '../js/data/arc_pressure_copy.mjs';
import { SCOPE_FREEZE_AF } from '../js/data/capability_risk.mjs';
import { clampMythosHeat } from '../js/state/mythos_heat.mjs';

assert.equal(PRESSURE_BUS_VERSION, 1);
assert.ok(['wave_b_done','wave_c_done','wave_d_done','wave_e_done','wave_f_done'].includes(SCOPE_FREEZE_AF.status));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
assert.ok(SCOPE_FREEZE_AF.frozenWaves.includes('EV') || SCOPE_FREEZE_AF.frozenWaves.includes('SM') || SCOPE_FREEZE_AF.frozenWaves.includes('DP') || SCOPE_FREEZE_AF.completedWaves.includes('EV'));
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('PB0-PB4'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));

const ch = listPressureChannels();
assert.ok(ch.some((c) => c.id === 'core.heat'));
assert.ok(ch.some((c) => c.id === 'core.flags'));

const gs = {
    mythosHeat: 0,
    flags: {},
    scenarioRunner: { flags: {} },
    arcLedger: { mythosHeatFloor: 1 },
    chatHistory: []
};

const heat = busAddMythosHeat(gs, 2, 'smoke');
assert.equal(heat, 2);
assert.equal(gs.mythosHeat, 2);

setPressureFlag(gs, 'police_interest', true);
assert.equal(gs.flags.police_interest, true);
assert.equal(gs.scenarioRunner.flags.police_interest, true);

const snap = getPressureSnapshot(gs);
assert.equal(snap.busVersion, 1);
assert.equal(snap.heat, 2);
assert.equal(snap.heatFloor, 1);
assert.equal(snap.flags.police_interest, true);

const inputs = pressureHudInputs(gs);
const line = pressureHudLine(inputs.flags, inputs.mythosHeat);
assert.ok(line.includes('警察') || line.includes('热度'));

// High heat still uses same clamp (no formula fork)
busAddMythosHeat(gs, 10, 'cap');
assert.equal(gs.mythosHeat, clampMythosHeat(12));
assert.equal(gs.mythosHeat, 5);
assert.equal(gs.flags.mythos_attention, true);

dispatchPressure(gs, { type: 'flag.clear', flag: 'police_interest' });
assert.ok(!gs.flags.police_interest);

console.log('pressure_bus_wave_b_smoke: OK', {
    bus: PRESSURE_BUS_VERSION,
    channels: ch.map((c) => c.id),
    freeze: SCOPE_FREEZE_AF.status
});
