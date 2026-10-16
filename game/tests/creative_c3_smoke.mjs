/**
 * Creative C3: rain_dock_chase + keeper density gunfight filter.
 */
import { strict as assert } from 'node:assert';
import { CoCScenarioRainDockChase } from '../js/data/scenarios/rain_dock_chase.mjs';
import { filterGunfightBeats, getKeeperStyle } from '../js/data/keeper_style.mjs';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';

assert.ok(BUILTIN_BY_ID.rain_dock_chase);
assert.ok(CoCScenarioRainDockChase.nodes.boat_jump.effects.chase.vehicle);
assert.ok(CoCScenarioRainDockChase.nodes.boat_jump.effects.chase.gunfightBeats.length >= 3);

const beats = CoCScenarioRainDockChase.nodes.boat_jump.effects.chase.gunfightBeats;
assert.equal(filterGunfightBeats(beats, 'strict').length, 1);
assert.ok(filterGunfightBeats(beats, 'pulp_lite').length >= beats.length);
assert.equal(getKeeperStyle('cinematic').density.sanAftershockThreshold, 5);

console.log('creative_c3_smoke: OK');
