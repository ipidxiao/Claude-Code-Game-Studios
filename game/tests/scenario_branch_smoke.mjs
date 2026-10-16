/**
 * R29.58: side rooms have entrances, seal ending is reachable,
 * rain-dock prose meets the floor, and the stamped closer is gone.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditScenario } from '../js/scenario/scenario_audit.mjs';
import { CoCScenarioCoastalFestival } from '../js/data/scenarios/coastal_festival.mjs';
import { CoCScenarioAbandonedAsylum } from '../js/data/scenarios/abandoned_asylum.mjs';
import { CoCScenarioRainDockChase } from '../js/data/scenarios/rain_dock_chase.mjs';
import { CoCScenarioHearingRoom } from '../js/data/scenarios/hearing_room.mjs';
import { CoCScenarioNewsroomMidnight } from '../js/data/scenarios/newsroom_midnight.mjs';
import { CoCScenarioCourtRecess } from '../js/data/scenarios/court_recess.mjs';
import { CoCScenarioFogLighthouseChase } from '../js/data/scenarios/fog_lighthouse_chase.mjs';
import { CoCScenarioCliffMistRun } from '../js/data/scenarios/cliff_mist_run.mjs';
import { CoCScenarioLighthouseNightWatch } from '../js/data/scenarios/lighthouse_night_watch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SIDE_ROOMS = [
    'pier_salt_wind', 'pier_night_watch', 'tavern_song', 'tavern_dice_game',
    'square_coin_throw', 'harvest_banner', 'fish_market', 'shell_gallery',
    'mist_choir', 'shrine_mirror', 'shrine_priest_chant', 'seaweed_gate',
    'rescue_whisper', 'cave_black_pool', 'cave_approach_tide', 'offering_table'
];

function inbound(scenario, id) {
    let count = 0;
    for (const node of Object.values(scenario.nodes || {})) {
        for (const choice of node.choices || []) {
            if (choice && (choice.next === id || choice.falseNext === id)) count += 1;
        }
    }
    return count;
}

for (const room of SIDE_ROOMS) {
    assert.ok(inbound(CoCScenarioCoastalFestival, room) >= 1, room + ' has no entrance');
}

assert.ok(inbound(CoCScenarioAbandonedAsylum, 'ending_seal') >= 1, 'ending_seal has no entrance');
assert.equal(
    CoCScenarioAbandonedAsylum.nodes.ending_seal.narrative.includes('ending seal并非空景'),
    false
);
assert.match(CoCScenarioAbandonedAsylum.nodes.ending_seal.narrative, /【结局/);

const stamped = [
    'js/data/scenarios/hearing_room.mjs',
    'js/data/scenarios/newsroom_midnight.mjs',
    'js/data/scenarios/court_recess.mjs',
    'js/data/scenarios/fog_lighthouse_chase.mjs',
    'js/data/scenarios/cliff_mist_run.mjs',
    'js/data/scenarios/lighthouse_night_watch.mjs'
];
for (const rel of stamped) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.equal(text.includes('此刻雨声与钟声同时逼近，调查仍未结束'), false, rel);
    assert.equal(text.includes('潮声与雾笛同时逼近，调查仍未结束备查'), false, rel);
}

const runner = fs.readFileSync(path.join(root, 'js/scenario/runner.mjs'), 'utf8');
assert.ok(runner.includes('这一项需要警察盯梢'));
assert.ok(runner.includes('这一项需要风声已紧'));
assert.ok(runner.includes('还需要更多线索才能选择这一项'));

for (const scenario of [
    CoCScenarioCoastalFestival,
    CoCScenarioAbandonedAsylum,
    CoCScenarioRainDockChase,
    CoCScenarioHearingRoom,
    CoCScenarioNewsroomMidnight,
    CoCScenarioCourtRecess,
    CoCScenarioFogLighthouseChase,
    CoCScenarioCliffMistRun,
    CoCScenarioLighthouseNightWatch
]) {
    const report = auditScenario(scenario);
    assert.equal(report.ok, true, scenario.id + ': ' + report.errors.join('; '));
}

console.log('scenario_branch_smoke: OK');
