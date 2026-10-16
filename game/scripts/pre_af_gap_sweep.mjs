/**
 * Pre-A/F hole sweep — fail on any remaining risk gap.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    auditScenarioCapabilityParity,
    assertMarkCapabilitySourceCanonical,
    extractMarkCapabilityLiterals,
    CANONICAL_CAPABILITY_IDS,
    PRESSURE_WRITE_INVENTORY,
    CAPABILITY_IR_VERSION,
    auditPressureWriteGuards,
    LOCKED_PUBLIC_APIS,
    SCOPE_FREEZE_AF,
    detectStructuralCapabilities,
    tagsAsCapabilities
} from '../js/data/capability_risk.mjs';

/** Soft-only ads may exist without structural detect; hard caps must not. */
const SOFT_ONLY_CAPS = new Set(['神话热度', '战后余波']);
const HARD_CAPS = CANONICAL_CAPABILITY_IDS.filter((id) => !SOFT_ONLY_CAPS.has(id));
import { CAPABILITY_FILTER_IDS, buildSaveCompareMeta } from '../js/data/capability_system.mjs';
import { ARC_CHAPTER_MAP } from '../js/data/arc_chapters.mjs';
import { BUILTIN_SCENARIOS, BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { CREATIVE_SMOKE_CATALOG } from '../js/data/creative_smoke_catalog.mjs';
import * as CapSys from '../js/data/capability_system.mjs';
import * as DeskPref from '../js/data/desk_pref.mjs';
import * as PressureCopy from '../js/data/arc_pressure_copy.mjs';
import * as MythosHeat from '../js/state/mythos_heat.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const gaps = [];

assert.deepEqual([...CAPABILITY_FILTER_IDS].sort(), [...CANONICAL_CAPABILITY_IDS].sort());
assert.ok(['wave_a_done', 'wave_b_done', 'wave_c_done', 'wave_d_done', 'wave_e_done', 'wave_f_done'].includes(SCOPE_FREEZE_AF.status));
assert.ok((SCOPE_FREEZE_AF.completedWaves || []).includes('IR0-IR4'));
if (SCOPE_FREEZE_AF.status === 'wave_f_done') {
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('SM'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('EV'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('TC'));
    assert.equal((SCOPE_FREEZE_AF.frozenWaves || []).length, 0);
    assert.ok(!(SCOPE_FREEZE_AF.frozenWaves || []).includes('TC'));
} else if (SCOPE_FREEZE_AF.status === 'wave_e_done') {
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('SM'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('EV'));
    assert.ok(!(SCOPE_FREEZE_AF.frozenWaves || []).includes('EV'));
    assert.ok((SCOPE_FREEZE_AF.frozenWaves || []).includes('TC'));
} else if (SCOPE_FREEZE_AF.status === 'wave_d_done') {
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('SM'));
    assert.ok((SCOPE_FREEZE_AF.frozenWaves || []).includes('EV'));
    assert.ok((SCOPE_FREEZE_AF.frozenWaves || []).includes('TC'));
} else if (SCOPE_FREEZE_AF.status === 'wave_c_done') {
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('DP'));
    assert.ok((SCOPE_FREEZE_AF.frozenWaves || []).includes('SM'));
} else if (SCOPE_FREEZE_AF.status === 'wave_b_done') {
    assert.ok(SCOPE_FREEZE_AF.completedWaves.includes('PB0-PB4'));
    assert.ok((SCOPE_FREEZE_AF.frozenWaves || []).includes('DP'));
} else {
    assert.ok((SCOPE_FREEZE_AF.frozenWaves || []).includes('PB0-PB4'));
}

for (const sc of BUILTIN_SCENARIOS) {
    const r = auditScenarioCapabilityParity(sc, { strict: true });
    if (!r.ok) gaps.push('PARITY:' + sc.id + ':' + r.errors.join(';'));
    const st = new Set(detectStructuralCapabilities(sc));
    for (const t of tagsAsCapabilities(sc)) {
        if (HARD_CAPS.includes(t) && !st.has(t)) {
            gaps.push('OVER_ADVERTISE:' + sc.id + ':' + t);
        }
    }
}

for (const n of ARC_CHAPTER_MAP) {
    if (!BUILTIN_BY_ID[n.id]) gaps.push('CHAPTER_MAP_MISSING:' + n.id);
}

function walk(dir, acc = []) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) walk(p, acc);
        else if (name.endsWith('.mjs')) acc.push(p);
    }
    return acc;
}

for (const f of walk(path.join(root, 'js'))) {
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes('markCapability')) continue;
    const r = assertMarkCapabilitySourceCanonical(src);
    if (!r.ok) gaps.push('MARK:' + path.relative(root, f) + ':' + r.bad.join(','));
}

// No dynamic markCapability(expr) — only string literals (aliases resolved at runtime).
const runnerSrc = fs.readFileSync(path.join(root, 'js', 'scenario', 'runner.mjs'), 'utf8');
const dynMarks = [...runnerSrc.matchAll(/markCapability\s*\(\s*([^)\n]+)\s*\)/g)]
    .map((m) => m[1].trim())
    .filter((arg) => !/^['"]/.test(arg));
if (dynMarks.length) gaps.push('MARK_DYNAMIC:' + dynMarks.join('|'));

const runnerLits = extractMarkCapabilityLiterals(runnerSrc);
if (runnerLits.length < 5) gaps.push('MARK_TOO_FEW:' + runnerLits.length);

for (const e of PRESSURE_WRITE_INVENTORY) {
    if (!fs.existsSync(path.join(root, e.file))) gaps.push('INV_MISSING:' + e.file);
    if (!e.mode) gaps.push('INV_NO_MODE:' + e.file);
}

const pressure = auditPressureWriteGuards({
    readFile: (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
});
if (!pressure.ok) gaps.push(...pressure.errors.map((e) => 'PRESSURE:' + e));

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!(pkg.scripts['ci:smoke'] || '').includes('audit:capability-parity')) gaps.push('CI_NO_CAP');
if (!(pkg.scripts['ci:smoke'] || '').includes('audit:pressure-writes')) gaps.push('CI_NO_PRESSURE');
if (!(pkg.scripts['audit:capability-parity'] || '').includes('--strict-all')) gaps.push('CAP_NOT_STRICT_ALL');
if (!(pkg.scripts['ci:smoke'] || '').includes('audit:pre-af-gaps')) gaps.push('CI_NO_PRE_AF');
if (!(pkg.scripts['audit:pre-af-gaps'] || '').includes('pre_af_gap_sweep')) gaps.push('NO_PRE_AF_SCRIPT');

const meta = buildSaveCompareMeta({
    mythosHeat: 0,
    arcLedger: {},
    ui: { endingRecap: { endingKey: 'x', capabilitiesUsed: [] } },
    scenarioRunner: {}
});
if (meta.capabilityIrVersion !== CAPABILITY_IR_VERSION) {
    gaps.push('META_IR_VER:' + meta.capabilityIrVersion);
}

const packDir = path.join(root, 'js', 'data', 'scenarios', 'packages');
for (const name of fs.readdirSync(packDir).filter((n) => n.endsWith('.json'))) {
    const id = name.replace(/\.json$/, '');
    const sc = BUILTIN_BY_ID[id];
    if (!sc) continue;
    const pack = JSON.parse(fs.readFileSync(path.join(packDir, name), 'utf8'));
    const st = detectStructuralCapabilities(sc).filter((x) => x !== '神话热度');
    const ptags = pack.tags || [];
    for (const t of st) {
        if (!ptags.includes(t)) gaps.push('PACK_TAG_MISS:' + id + ':' + t);
    }
    // Soft advertising on mjs should also appear on package when present.
    for (const t of tagsAsCapabilities(sc)) {
        if ((t === '战后余波' || t === '神话热度') && !ptags.includes(t)) {
            gaps.push('PACK_SOFT_TAG_MISS:' + id + ':' + t);
        }
    }
    if (!!sc.readsArcLedger !== !!pack.readsArcLedger) {
        gaps.push('PACK_READS_ARC_LAG:' + id);
    }
    if (!!sc.requiresChapterUnlock !== !!pack.requiresChapterUnlock) {
        gaps.push('PACK_CHAPTER_UNLOCK_LAG:' + id);
    }
}

if (!CREATIVE_SMOKE_CATALOG.some((e) => e.id === 'creative_risk_gate_smoke')) {
    gaps.push('CATALOG_NO_RISK');
}
if (!fs.existsSync(path.join(root, 'tests', 'creative_risk_gate_smoke.mjs'))) {
    gaps.push('NO_RISK_SMOKE');
}

if (!/import\s*\{[^}]*resolveMarkCapabilityId/.test(runnerSrc)) {
    gaps.push('RUNNER_NO_IMPORT_RESOLVE');
}
if (!/CAPABILITY_IR_VERSION/.test(runnerSrc)) gaps.push('RUNNER_NO_IR_VERSION');

const modules = {
    CoCCapabilitySystem: CapSys.CoCCapabilitySystem || CapSys,
    CoCArcPressureCopy: PressureCopy.CoCArcPressureCopy || PressureCopy,
    CoCDeskPref: DeskPref.CoCDeskPref || DeskPref,
    CoCMythosHeat: MythosHeat.CoCMythosHeat || MythosHeat
};
for (const [name, keys] of Object.entries(LOCKED_PUBLIC_APIS)) {
    const api = modules[name];
    if (!api) {
        gaps.push('LOCKED_MISSING_MOD:' + name);
        continue;
    }
    for (const k of keys) {
        if (!Object.prototype.hasOwnProperty.call(api, k)) {
            gaps.push('LOCKED_MISSING_KEY:' + name + '.' + k);
        }
    }
}

if (gaps.length) {
    console.error('pre_af_gap_sweep FAIL:\n' + gaps.join('\n'));
    process.exit(1);
}
console.log('pre_af_gap_sweep: OK (no gaps)');
