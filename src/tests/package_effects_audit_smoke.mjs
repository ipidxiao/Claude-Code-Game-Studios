/**
 * Spot-check packaged scenario JSON against effects schema (unknown keys fail).
 * All packs under js/data/scenarios/packages must carry sanCheck + combat.pendingRoll.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditScenarioEffects } from '../js/scenario/effects_apply.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = path.join(root, 'js', 'data', 'scenarios', 'packages');
const SAMPLE = fs.readdirSync(packDir).filter((n) => n.endsWith('.json')).sort();

assert.ok(SAMPLE.length >= 15, 'expected ≥15 packs, got ' + SAMPLE.length);

let checked = 0;
for (const name of SAMPLE) {
    const fp = path.join(packDir, name);
    const pack = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const r = auditScenarioEffects(pack);
    if (r.warnings.length) {
        console.error(name + ' warnings:\n  ' + r.warnings.join('\n  '));
    }
    assert.equal(r.ok, true, name + ' errors: ' + r.errors.join('; '));
    assert.equal(r.warnings.length, 0, name + ' has unknown effect keys');
    const blob = JSON.stringify(pack);
    assert.ok(blob.includes('sanCheck'), name + ' needs sanCheck');
    assert.ok(blob.includes('pendingRoll'), name + ' needs combat.pendingRoll');
    assert.ok(!/"san"\s*:\s*\d+/.test(blob), name + ' still has flat san');
    checked++;
}

assert.ok(checked === SAMPLE.length);
console.log('package_effects_audit_smoke: OK (' + checked + ' packs)');
