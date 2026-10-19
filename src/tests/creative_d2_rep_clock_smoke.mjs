/**
 * Creative D2: reputation/police pressure + dual clocks shape.
 */
import { strict as assert } from 'node:assert';
import { applyReputationPressure, importArcLedger } from '../js/state/arc_ledger.mjs';
import { CoCScenarioMidnightMuseum } from '../js/data/scenarios/midnight_museum.mjs';
import { CoCScenarioAlleyToAsphalt } from '../js/data/scenarios/alley_to_asphalt.mjs';
import { CoCScenarioHearingRoom } from '../js/data/scenarios/hearing_room.mjs';

const r = { flags: { seedRequiresClueQuality: 'partial', police_interest: true } };
applyReputationPressure(r, r.flags);
assert.equal(r.flags.seedRequiresClueQuality, 'solid');
assert.ok(r.flags.arc_pressure);

const gs = {
    flags: {},
    mythosHeat: 0,
    scenarioRunner: { flags: {} },
    arcLedger: {
        version: 2,
        flagsCarry: { police_interest: true },
        mythosHeatFloor: 0,
        lastScenarioId: 'deep_one_shadow',
        lastEndingKey: 'ending_win',
        updatedAt: 1
    }
};
importArcLedger(gs);
assert.ok(gs.flags.police_interest);
assert.equal(gs.scenarioRunner.flags.seedRequiresClueQuality, 'solid');

const vault = CoCScenarioMidnightMuseum.nodes.vault.choices.find((c) => c.id === 'buy_cover');
assert.ok(vault);
assert.equal(vault.requiresFlag, 'reputation_hit');

const quiet = CoCScenarioAlleyToAsphalt.nodes.flee_foot.choices.find((c) => c.id === 'quiet_push');
assert.ok(quiet);
assert.equal(quiet.requiresFlag, 'police_interest');

assert.ok(CoCScenarioHearingRoom.clocks);
assert.equal(CoCScenarioHearingRoom.clocks.maxInvestigation, 5);

console.log('creative_d2_rep_clock_smoke: OK');
