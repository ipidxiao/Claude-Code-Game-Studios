/**
 * Wave A (IR0–IR4) — CapabilityDecl table + IR stamp = 1.
 */
import { strict as assert } from 'node:assert';
import {
    CAPABILITY_IR_VERSION,
    CANONICAL_CAPABILITY_IDS,
    SCOPE_FREEZE_AF,
    assertCapabilityDeclTable,
    CAPABILITY_DECL_SCHEMA,
    CAPABILITY_DECL_TABLE,
    getCapabilityDecl,
    softCapabilityIds,
    hardCapabilityIds
} from '../js/data/capability_risk.mjs';
import {
    CAPABILITY_GLOSSARY,
    CAPABILITY_FILTER_IDS,
    previewScenarioCapabilities,
    buildSaveCompareMeta,
    capabilityGloss
} from '../js/data/capability_system.mjs';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';

assert.equal(CAPABILITY_DECL_SCHEMA, 1);
assert.equal(CAPABILITY_IR_VERSION, 1);
assert.ok(['wave_a_done','wave_b_done','wave_c_done','wave_d_done','wave_e_done','wave_f_done'].includes(SCOPE_FREEZE_AF.status));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('IR0-IR4'));
assert.ok(SCOPE_FREEZE_AF.frozenWaves.includes('TC') || SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));

const audit = assertCapabilityDeclTable(CANONICAL_CAPABILITY_IDS);
assert.ok(audit.ok, audit.errors.join('; '));
assert.equal(CAPABILITY_DECL_TABLE.length, CANONICAL_CAPABILITY_IDS.length);

assert.deepEqual(
    [...CAPABILITY_FILTER_IDS].sort(),
    [...CANONICAL_CAPABILITY_IDS].sort()
);
assert.equal(CAPABILITY_GLOSSARY.length, CANONICAL_CAPABILITY_IDS.length);
for (const id of CANONICAL_CAPABILITY_IDS) {
    const d = getCapabilityDecl(id);
    assert.ok(d, 'decl ' + id);
    assert.equal(capabilityGloss(id), d.gloss);
}

assert.deepEqual(softCapabilityIds().sort(), ['战后余波', '神话热度'].sort());
assert.ok(hardCapabilityIds().includes('追逐'));

const metaEmpty = buildSaveCompareMeta(null);
assert.equal(metaEmpty.capabilityIrVersion, 1);

const court = BUILTIN_BY_ID.court_recess;
const preview = previewScenarioCapabilities(court);
assert.ok(preview.includes('假线索'));

console.log('capability_ir_wave_a_smoke: OK', {
    ir: CAPABILITY_IR_VERSION,
    decls: CAPABILITY_DECL_TABLE.length,
    freeze: SCOPE_FREEZE_AF.status
});
