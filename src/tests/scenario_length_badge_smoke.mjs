/**
 * Scenario cover length badge: short / mid / full from estimated minutes.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CoCScenarioCatalog, scenarioLengthTier } from '../js/data/scenarios/catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(scenarioLengthTier(20), '简单');
assert.equal(scenarioLengthTier(25), '简单');
assert.equal(scenarioLengthTier(29), '简单');
assert.equal(scenarioLengthTier(30), '一般');
assert.equal(scenarioLengthTier(35), '一般');
assert.equal(scenarioLengthTier(60), '一般');
assert.equal(scenarioLengthTier(89), '一般');
assert.equal(scenarioLengthTier(90), '标准');
assert.equal(scenarioLengthTier(180), '标准');
assert.equal(scenarioLengthTier(null), '一般');

const byId = Object.fromEntries(CoCScenarioCatalog.list().map((s) => [s.id, s.lengthTier]));
assert.equal(byId.rain_dock_chase, '简单');
assert.equal(byId.lighthouse_night_watch, '简单');
assert.equal(byId.alley_to_asphalt, '简单');
assert.equal(byId.deep_one_shadow, '一般');
assert.equal(byId.midnight_museum, '一般');
assert.equal(byId.coastal_festival, '标准');
assert.equal(byId.abandoned_asylum, '标准');
assert.equal(byId.tutorial, '标准');

const lobby = fs.readFileSync(path.join(root, 'js/views/lobby_view.mjs'), 'utf8');
assert.ok(lobby.includes('apex-lobby-scenario-card__length'));
assert.ok(lobby.includes('sc.lengthTier'));
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
assert.ok(css.includes('.apex-lobby-scenario-card__length'));
assert.ok(css.includes('right: 8px'));

console.log('scenario_length_badge_smoke: OK');
