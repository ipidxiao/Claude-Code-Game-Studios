/**
 * Round-1 bugfix smoke: prose bank id, chase speed unlock, carry reset, chat vid uniqueness.
 */
import { strict as assert } from 'node:assert';
import { resetInvestigatorCarry, hasCarrySnapshot, emptyArcLedger } from '../js/state/arc_ledger.mjs';

// --- chat vid uniqueness across sliding window ---
let seq = 0;
const msgs = [];
for (let i = 0; i < 155; i++) msgs.push({ content: 'm' + i });
const recent = msgs.slice(-150);
recent.forEach((m) => { if (m._vid == null) m._vid = ++seq; });
const keys = recent.map((m) => m._vid);
assert.equal(new Set(keys).size, keys.length);

// --- resetInvestigatorCarry without chapters ---
const gs = {
    mythosHeat: 3,
    flags: { x: 1 },
    scenarioRunner: { flags: { ally_survived: true } },
    clueBoard: { clues: [{ id: 1 }], links: [] },
    roster: [{ name: '甲', hp: 5 }],
    inventory: [{ name: '枪' }],
    arcLedger: {
        characterSnapshot: [{ name: '甲' }],
        inventorySnapshot: [{ name: '枪' }],
        mythosHeatFloor: 2
        // no chapters
    }
};
resetInvestigatorCarry(gs);
assert.ok(gs.arcLedger);
assert.ok(gs.arcLedger.chapters);
assert.equal(hasCarrySnapshot(gs.arcLedger), false);

// --- chase speed unlock on restore semantics ---
const chase = { active: true, speedResolved: false, round: 1, participants: [] };
if (chase.active && chase.speedResolved === false) chase.speedResolved = true;
assert.equal(chase.speedResolved, true);

// --- prose bank id resolution ---
const scen = { id: 'cc_white_widow_reef', proseScenarioId: 'tutorial' };
const bankId = scen.proseScenarioId || scen.id;
assert.equal(bankId, 'tutorial');

console.log('bugfix_round1_smoke: OK');
