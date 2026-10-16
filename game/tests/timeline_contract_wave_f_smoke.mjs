/**
 * Wave F (TC0–TC4) — Timeline Contract for ending-recap rows.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    TIMELINE_CONTRACT_VERSION,
    TIMELINE_ROW_KINDS,
    TIMELINE_REQUIRED_KINDS,
    normalizeTimelineRow,
    auditTimelineContract,
    assembleTimelineContract
} from '../js/data/timeline_contract.mjs';
import { SCOPE_FREEZE_AF, PRESSURE_WRITE_INVENTORY, auditPressureWriteGuards, LOCKED_PUBLIC_APIS } from '../js/data/capability_risk.mjs';
import { previewScenarioCapabilities } from '../js/data/capability_system.mjs';
import { pressureHudLine } from '../js/data/arc_pressure_copy.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(TIMELINE_CONTRACT_VERSION, 1);
assert.deepEqual([...TIMELINE_ROW_KINDS], [
    'end', 'evidence', 'verdict', 'heat', 'flag', 'unlock', 'cap', 'capdiff', 'hint'
]);
assert.deepEqual([...TIMELINE_REQUIRED_KINDS], ['end', 'evidence', 'heat', 'flag', 'hint']);
assert.equal(SCOPE_FREEZE_AF.status, 'wave_f_done');
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('TC'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('EV'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('IR0-IR4'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('SM'));
assert.equal(SCOPE_FREEZE_AF.frozenWaves.length, 0);
assert.ok(!SCOPE_FREEZE_AF.frozenWaves.includes('TC'));
assert.ok(!SCOPE_FREEZE_AF.waves.includes('G'));

const bare = normalizeTimelineRow({ t: 'heat', text: '  热度事件：无  ', extra: 1 });
assert.equal(bare.ok, true);
assert.deepEqual(bare.row, { t: 'heat', text: '热度事件：无' });
assert.equal(normalizeTimelineRow({ t: 'trace', text: 'x' }).ok, false);
assert.equal(normalizeTimelineRow({ t: 'end', text: '   ' }).ok, false);
assert.equal(normalizeTimelineRow(null).ok, false);

const full = [
    { t: 'end', text: '终局节点：ending_win' },
    { t: 'evidence', text: '证据档：solid · 热度：1/5' },
    { t: 'verdict', text: '遭遇裁决：达标 · 要求solid · 达成solid' },
    { t: 'heat', text: '码头低语' },
    { t: 'heat', text: '第二夜' },
    { t: 'flag', text: '带走标记：无' },
    { t: 'unlock', text: '新解锁：court_recess' },
    { t: 'cap', text: '本局用到：双时钟' },
    { t: 'capdiff', text: '预告未用：追逐' },
    { t: 'hint', text: '下一剧本可在桌规卡选择「继承档案与收获」或「重置调查员」。' }
];
const fullBefore = JSON.stringify(full);
const assembled = assembleTimelineContract(full);
assert.equal(JSON.stringify(full), fullBefore);
assert.equal(assembled.ok, true, assembled.errors.join(';'));
assert.equal(assembled.contractVersion, 1);
assert.equal(assembled.rows.length, full.length);
assert.equal(assembled.missing.length, 0);
assert.notEqual(assembled.rows[0], full[0]);
assert.equal(auditTimelineContract(assembled.rows).ok, true);

const minimal = assembleTimelineContract([
    { t: 'end', text: '终局节点：ending_weak' },
    { t: 'evidence', text: '证据档：weak · 热度：0/5' },
    { t: 'heat', text: '热度事件：无' },
    { t: 'flag', text: '带走标记：无' },
    { t: 'hint', text: '下一剧本可在桌规卡选择「继承档案与收获」或「重置调查员」。' }
]);
assert.equal(minimal.ok, true, minimal.errors.join(';'));

const missingHint = assembleTimelineContract(full.slice(0, -1));
assert.equal(missingHint.ok, false);
assert.ok(missingHint.missing.includes('hint'));

const unknown = assembleTimelineContract(full.concat([{ t: 'trace', text: 'nope' }]));
assert.equal(unknown.ok, false);
assert.ok(unknown.errors.some((e) => e.includes('unknown-kind:trace')));

const badVerdict = assembleTimelineContract([
    { t: 'end', text: '终局节点：x' },
    { t: 'evidence', text: '证据档：weak' },
    { t: 'heat', text: '热度事件：无' },
    { t: 'verdict', text: '遭遇裁决：达标' },
    { t: 'flag', text: '带走标记：无' },
    { t: 'hint', text: '下一剧本。' }
]);
assert.equal(badVerdict.ok, false);
assert.ok(badVerdict.errors.includes('order:verdict'));

const splitHeat = assembleTimelineContract([
    { t: 'end', text: '终局节点：x' },
    { t: 'evidence', text: '证据档：weak' },
    { t: 'heat', text: 'a' },
    { t: 'flag', text: '带走标记：无' },
    { t: 'heat', text: 'b' },
    { t: 'hint', text: '下一剧本。' }
]);
assert.equal(splitHeat.ok, false);
assert.ok(splitHeat.errors.includes('heat-not-contiguous'));

const dup = assembleTimelineContract([
    { t: 'end', text: '终局节点：x' },
    { t: 'end', text: 'again' },
    { t: 'evidence', text: '证据档：weak' },
    { t: 'heat', text: '热度事件：无' },
    { t: 'flag', text: '带走标记：无' },
    { t: 'hint', text: '下一剧本。' }
]);
assert.equal(dup.ok, false);
assert.ok(dup.errors.includes('duplicate:end'));

const capdiffAlone = assembleTimelineContract([
    { t: 'end', text: '终局节点：x' },
    { t: 'evidence', text: '证据档：weak' },
    { t: 'heat', text: '热度事件：无' },
    { t: 'flag', text: '带走标记：无' },
    { t: 'capdiff', text: 'diff' },
    { t: 'hint', text: '下一剧本。' }
]);
assert.equal(capdiffAlone.ok, true, capdiffAlone.errors.join(';'));

const capdiffEarly = assembleTimelineContract([
    { t: 'end', text: '终局节点：x' },
    { t: 'evidence', text: '证据档：weak' },
    { t: 'capdiff', text: 'diff' },
    { t: 'heat', text: '热度事件：无' },
    { t: 'flag', text: '带走标记：无' },
    { t: 'hint', text: '下一剧本。' }
]);
assert.equal(capdiffEarly.ok, false);
assert.ok(capdiffEarly.errors.includes('order:capdiff'));

const inv = PRESSURE_WRITE_INVENTORY.find((e) => e.file.includes('timeline_contract'));
assert.ok(inv && inv.mode === 'display');
assert.ok(inv.symbols.includes('assembleTimelineContract'));
const guards = auditPressureWriteGuards({
    readFile: (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
});
assert.equal(guards.ok, true, guards.errors.join('; '));

assert.equal(typeof previewScenarioCapabilities, 'function');
assert.equal(typeof pressureHudLine, 'function');
assert.ok(LOCKED_PUBLIC_APIS.CoCCapabilitySystem.includes('previewScenarioCapabilities'));
assert.ok(LOCKED_PUBLIC_APIS.CoCArcPressureCopy.includes('pressureHudLine'));
assert.ok(LOCKED_PUBLIC_APIS.CoCMythosHeat.includes('addMythosHeat'));

const runnerSrc = fs.readFileSync(path.join(root, 'js', 'scenario', 'runner.mjs'), 'utf8');
assert.ok(runnerSrc.includes('assembleTimelineContract'));
assert.ok(runnerSrc.includes('timelineContractVersion'));
assert.ok(runnerSrc.includes("t: 'verdict'"));

const shared = fs.readFileSync(path.join(root, 'js', 'boot', 'shell_side_effects_shared.mjs'), 'utf8');
assert.ok(shared.includes("import '../data/timeline_contract.mjs'"));

console.log('timeline_contract_wave_f_smoke: OK', {
    tc: TIMELINE_CONTRACT_VERSION,
    freeze: SCOPE_FREEZE_AF.status,
    frozen: SCOPE_FREEZE_AF.frozenWaves.length
});
