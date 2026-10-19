/**
 * Creative C5: capability tags present on catalog entries.
 */
import { strict as assert } from 'node:assert';
import { CoCScenarioCatalog } from '../js/data/scenarios/catalog.mjs';

const CAPS = ['证据分叉', '追逐', '神话热度', '战后余波', '战役账本', '双时钟'];
const list = CoCScenarioCatalog.list();
assert.ok(list.length >= 10);
const tagged = list.filter((s) => (s.tags || []).some((t) => CAPS.includes(t)));
assert.ok(tagged.length >= 3, 'expected capability tags on several builtins');
const chase = list.filter((s) => (s.tags || []).includes('追逐'));
assert.ok(chase.some((s) => s.id === 'alley_to_asphalt' || s.id === 'rain_dock_chase'));

console.log('creative_c5_smoke: OK');
