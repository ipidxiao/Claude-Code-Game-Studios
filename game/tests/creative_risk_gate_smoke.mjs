/**
 * Hard risk gates before A–F — must stay green.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    canonicalizeCapabilityId,
    normalizeCapabilityList,
    detectStructuralCapabilities,
    auditScenarioCapabilityParity,
    auditPressureWriteGuards,
    assertMarkCapabilitySourceCanonical,
    resolveMarkCapabilityId,
    LOCKED_PUBLIC_APIS,
    PRESSURE_WRITE_INVENTORY,
    SCOPE_FREEZE_AF,
    CANONICAL_CAPABILITY_IDS,
    CAPABILITY_IR_VERSION,
    assertCapabilityDeclTable,
    CAPABILITY_DECL_SCHEMA
} from '../js/data/capability_risk.mjs';
import {
    CAPABILITY_FILTER_IDS,
    previewScenarioCapabilities,
    buildSaveCompareMeta
} from '../js/data/capability_system.mjs';
import { BUILTIN_SCENARIOS, BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import * as CapSys from '../js/data/capability_system.mjs';
import * as DeskPref from '../js/data/desk_pref.mjs';
import * as PressureCopy from '../js/data/arc_pressure_copy.mjs';
import * as MythosHeat from '../js/state/mythos_heat.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(CAPABILITY_IR_VERSION, 1);
assert.equal(CAPABILITY_DECL_SCHEMA, 1);
const declAudit = assertCapabilityDeclTable(CANONICAL_CAPABILITY_IDS);
assert.ok(declAudit.ok, declAudit.errors.join("; "));
assert.deepEqual([...CAPABILITY_FILTER_IDS].sort(), [...CANONICAL_CAPABILITY_IDS].sort());

assert.equal(canonicalizeCapabilityId('falseLead'), '假线索');
assert.equal(resolveMarkCapabilityId('chase'), '追逐');
assert.throws(() => resolveMarkCapabilityId('not_a_cap'));
assert.deepEqual(normalizeCapabilityList(['chase', '追逐', 'unknown']), ['追逐']);

const modules = {
    CoCCapabilitySystem: CapSys.CoCCapabilitySystem || CapSys,
    CoCArcPressureCopy: PressureCopy.CoCArcPressureCopy || PressureCopy,
    CoCDeskPref: DeskPref.CoCDeskPref || DeskPref,
    CoCMythosHeat: MythosHeat.CoCMythosHeat || MythosHeat
};
for (const [name, keys] of Object.entries(LOCKED_PUBLIC_APIS)) {
    const api = modules[name];
    assert.ok(api, 'missing module export bag ' + name);
    for (const k of keys) {
        assert.ok(Object.prototype.hasOwnProperty.call(api, k), name + '.' + k + ' locked');
    }
}

for (const entry of PRESSURE_WRITE_INVENTORY) {
    assert.ok(fs.existsSync(path.join(root, entry.file)), 'missing inventory file ' + entry.file);
    assert.ok(entry.mode, entry.file + ' needs mode');
}

const pressure = auditPressureWriteGuards({
    readFile: (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
});
assert.equal(pressure.ok, true, pressure.errors.join('; '));

const runnerSrc = fs.readFileSync(path.join(root, 'js', 'scenario', 'runner.mjs'), 'utf8');
const marks = assertMarkCapabilitySourceCanonical(runnerSrc);
assert.ok(marks.ok, 'non-canonical markCapability: ' + marks.bad.join(','));
assert.ok(marks.literals.length >= 5, 'expected markCapability call sites');

assert.equal(SCOPE_FREEZE_AF.status, 'wave_f_done');
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('IR0-IR4'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('SM'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('EV'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('TC'));
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('EV'));
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('TC'));
assert.equal(SCOPE_FREEZE_AF.frozenWaves.length, 0);
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('SM'));
assert.ok(SCOPE_FREEZE_AF.forbid.includes('markCapability non-canonical ids'));

let strictFails = 0;
for (const sc of BUILTIN_SCENARIOS) {
    const report = auditScenarioCapabilityParity(sc, { strict: true });
    if (!report.ok) {
        console.error(sc.id, report.errors);
        strictFails++;
    }
    const preview = previewScenarioCapabilities(sc);
    for (const id of report.structural) {
        assert.ok(preview.includes(id), sc.id + ' preview missing structural ' + id);
    }
}
assert.equal(strictFails, 0, 'builtin capability parity failed');

const court = BUILTIN_BY_ID.court_recess;
assert.ok(detectStructuralCapabilities(court).includes('假线索'));
assert.ok((court.tags || []).includes('假线索'));

const meta = buildSaveCompareMeta({
    mythosHeat: 1,
    arcLedger: {},
    ui: { endingRecap: { endingKey: 'e', capabilitiesUsed: [], capabilityIrVersion: CAPABILITY_IR_VERSION } },
    scenarioRunner: {}
});
assert.equal(meta.capabilityIrVersion, 1);

console.log('creative_risk_gate_smoke: OK');
