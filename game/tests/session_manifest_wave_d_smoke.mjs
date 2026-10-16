/**
 * Wave D (SM0–SM4) — Session Manifest read-mostly desk/session face.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    SESSION_MANIFEST_VERSION,
    extractScenarioPackageFace,
    assembleCarrySlice,
    assembleCarryBrief,
    assembleSessionManifest
} from '../js/data/session_manifest.mjs';
import { SCOPE_FREEZE_AF, PRESSURE_WRITE_INVENTORY, auditPressureWriteGuards } from '../js/data/capability_risk.mjs';
import { previewScenarioCapabilities, formatCapabilityPreview } from '../js/data/capability_system.mjs';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { busAddMythosHeat, setPressureFlag } from '../js/state/pressure_bus.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(SESSION_MANIFEST_VERSION, 1);
assert.ok(['wave_d_done', 'wave_e_done', 'wave_f_done'].includes(SCOPE_FREEZE_AF.status));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('SM'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
assert.ok(SCOPE_FREEZE_AF.frozenWaves.includes('EV') || SCOPE_FREEZE_AF.completedWaves.includes('EV'));
assert.ok(SCOPE_FREEZE_AF.frozenWaves.includes('TC') || SCOPE_FREEZE_AF.completedWaves.includes('TC'));
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('SM'));

const court = BUILTIN_BY_ID.court_recess;
assert.ok(court);

const face = extractScenarioPackageFace(court);
assert.equal(face.id, 'court_recess');
assert.ok(face.title);
assert.ok(Array.isArray(face.tags));
assert.equal(typeof face.hasClocks, 'boolean');
assert.equal(typeof face.readsArcLedger, 'boolean');

const gs = {
    mythosHeat: 0,
    flags: {},
    scenarioRunner: { flags: {} },
    arcLedger: {
        version: 2,
        mythosHeatFloor: 2,
        investigators: [{ name: '艾达', topClueQuality: 'solid' }],
        characterSnapshot: [{ name: '艾达' }],
        inventorySnapshot: [{ name: '笔记本', qty: 1 }],
        storageSnapshot: [],
        flagsCarry: { reputation_hit: true },
        chapters: { unlocked: [], completed: [] }
    },
    chatHistory: [],
    keeperStyle: 'cinematic'
};
busAddMythosHeat(gs, 2, 'sm-smoke');
setPressureFlag(gs, 'reputation_hit', true);

const carry = assembleCarrySlice(gs);
assert.ok(carry.carrySummary);
assert.equal(typeof carry.pressureLine, 'string');
assert.ok(carry.hasCarry);

const brief = assembleCarryBrief(gs);
assert.ok(brief);
assert.ok(brief.names);
assert.equal(brief.heat, carry.carrySummary.heat);
assert.equal(brief.pressureLine, carry.pressureLine);

const caps = previewScenarioCapabilities(court);
const man = assembleSessionManifest(gs, court, {
    keeperStyle: 'cinematic',
    preferredCarry: 'inherit',
    includeContractHealth: false,
    includeSaveCompare: true
});
assert.equal(man.manifestVersion, 1);
assert.equal(man.id, 'court_recess');
assert.equal(man.keeperStyle, 'cinematic');
assert.equal(man.preferredCarry, 'inherit');
assert.deepEqual(man.capabilityPreview, caps);
assert.equal(man.capabilityPreviewLine, formatCapabilityPreview(caps));
assert.ok(man.carrySummary);
assert.ok(man.saveCompareMeta);
assert.equal(man.saveCompareMeta.capabilityIrVersion, 1);
assert.ok(man.packageFace && man.packageFace.id === 'court_recess');

const inv = PRESSURE_WRITE_INVENTORY.find((e) => e.file.includes('session_manifest'));
assert.ok(inv && inv.mode === 'display');
const guards = auditPressureWriteGuards({
    readFile: (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
});
assert.equal(guards.ok, true, guards.errors.join('; '));

assert.equal(typeof previewScenarioCapabilities, 'function');

console.log('session_manifest_wave_d_smoke: OK', {
    sm: SESSION_MANIFEST_VERSION,
    freeze: SCOPE_FREEZE_AF.status,
    caps: man.capabilityPreview.length
});
