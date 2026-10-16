/**
 * Choice field whitelist guard (R22 failure mode): a key that exists in scenario data but is
 * missing from a choice-mapping whitelist is silently dropped, and the feature behind it dies.
 *
 * - every key used on any choice in any built-in / packaged scenario must survive mapScenarioChoice
 * - runner.mapNodeChoices must carry the same keys as mapScenarioChoice (two parallel maps)
 */
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mapScenarioChoice } from '../js/scenario/choice_menu.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'js/data/scenarios');
const NOT_SCENARIOS = new Set(['builtins.mjs', 'catalog.mjs', 'remote_catalog.mjs']);

// Collect every key used on a choice, across ESM scenarios and JSON packages.
const used = new Map(); // key -> source (first seen)
const collect = (src, sc) => {
    const nodes = Array.isArray(sc.nodes) ? sc.nodes : Object.values(sc.nodes || {});
    for (const n of nodes) {
        for (const c of (n.choices || [])) {
            for (const k of Object.keys(c)) if (!used.has(k)) used.set(k, src);
        }
    }
};
for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mjs') || NOT_SCENARIOS.has(f)) continue;
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const v of Object.values(mod)) if (v && typeof v === 'object' && v.nodes) collect(f, v);
}
for (const f of readdirSync(join(dir, 'packages'))) {
    if (!f.endsWith('.json')) continue;
    const sc = JSON.parse(readFileSync(join(dir, 'packages', f), 'utf8'));
    if (sc && sc.nodes) collect('packages/' + f, sc);
}
assert.ok(used.size >= 8, 'scenario data scan found too few choice keys: ' + [...used.keys()].join(','));

// 1) mapScenarioChoice keeps every key that scenario data uses.
const SENTINEL = { sentinel: true };
for (const [key, src] of used) {
    const out = mapScenarioChoice({ id: 'x', label: 'x', next: 'y', [key]: SENTINEL });
    assert.ok(
        Object.prototype.hasOwnProperty.call(out, key) && out[key],
        `mapScenarioChoice drops choice key "${key}" (used in ${src}); add it to the whitelist`
    );
}

// 2) runner.mapNodeChoices carries the same keys as mapScenarioChoice.
const mapped = Object.keys(mapScenarioChoice({ id: 'x', label: 'x', next: 'y' })).filter((k) => k !== 'kind');
const runnerSrc = readFileSync(join(root, 'js/scenario/runner.mjs'), 'utf8');
const start = runnerSrc.indexOf('const mapNodeChoices');
const end = runnerSrc.indexOf('.filter(choiceSkillStillOpen)', start);
assert.ok(start > 0 && end > start, 'could not locate mapNodeChoices in runner.mjs');
const block = runnerSrc.slice(start, end);
for (const key of mapped) {
    assert.ok(new RegExp('\\b' + key + '\\s*:').test(block), `runner.mapNodeChoices is missing "${key}" that mapScenarioChoice carries`);
}

console.log('choice_field_whitelist_smoke: OK', { keys: [...used.keys()].length });
