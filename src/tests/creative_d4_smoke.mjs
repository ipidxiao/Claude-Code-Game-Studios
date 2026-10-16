/**
 * Creative D4: hearing_room + fog_lighthouse_chase registration.
 */
import { strict as assert } from 'node:assert';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { CoCScenarioHearingRoom } from '../js/data/scenarios/hearing_room.mjs';
import { CoCScenarioFogLighthouseChase } from '../js/data/scenarios/fog_lighthouse_chase.mjs';
import { CoCScenarioCatalog } from '../js/data/scenarios/catalog.mjs';

assert.ok(BUILTIN_BY_ID.hearing_room);
assert.ok(BUILTIN_BY_ID.fog_lighthouse_chase);
assert.equal(CoCScenarioHearingRoom.requiresChapterUnlock, true);
assert.ok(CoCScenarioHearingRoom.tags.includes('证据分叉'));
assert.ok(CoCScenarioHearingRoom.tags.includes('战役账本'));
assert.ok(CoCScenarioHearingRoom.nodes.antechamber.choices.some((c) => c.falseLead));
assert.ok(CoCScenarioHearingRoom.endingsByClueQuality || CoCScenarioHearingRoom.nodes.ending_by_evidence.endingsByClueQuality);

assert.ok(CoCScenarioFogLighthouseChase.nodes.cliff_run.effects.chase);
assert.ok(!CoCScenarioFogLighthouseChase.nodes.cliff_hazard.effects.chase.vehicle);
assert.ok(CoCScenarioFogLighthouseChase.nodes.cliff_hazard.effects.chase.gunfightBeats.length >= 3);
assert.ok(CoCScenarioFogLighthouseChase.nodes.tower_stairs.effects.chase);

const v1 = CoCScenarioCatalog.validate(CoCScenarioHearingRoom);
assert.ok(v1.ok, 'hearing_room audit: ' + (v1.errors || []).join('; '));
const v2 = CoCScenarioCatalog.validate(CoCScenarioFogLighthouseChase);
assert.ok(v2.ok, 'fog_lighthouse audit: ' + (v2.errors || []).join('; '));

console.log('creative_d4_smoke: OK');
