/**
 * Chase hang smoke: deep_one + train + community packs expose effects.chase.
 */
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CoCScenarioAlleyToAsphalt } from '../js/data/scenarios/alley_to_asphalt.mjs';
import { CoCScenarioRainDockChase } from '../js/data/scenarios/rain_dock_chase.mjs';
import { CoCScenarioFogLighthouseChase } from '../js/data/scenarios/fog_lighthouse_chase.mjs';
import { CoCScenarioCliffMistRun } from '../js/data/scenarios/cliff_mist_run.mjs';
import { CoCScenarioDeepOneShadow } from '../js/data/scenarios/deep_one_shadow.mjs';
import { CoCScenarioTrainToNowhere } from '../js/data/scenarios/train_to_nowhere.mjs';
import { CoCScenarioCarnivalOfMasks } from '../js/data/scenarios/carnival_of_masks.mjs';
import { applyScenarioEffects } from '../js/scenario/effects_apply.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';

function hasChase(scen) {
    return JSON.stringify(scen).includes('"chase"') || JSON.stringify(scen).includes('chase:');
}

assert.ok(hasChase(CoCScenarioDeepOneShadow), 'deep_one needs chase');
assert.ok(hasChase(CoCScenarioTrainToNowhere), 'train needs chase');
assert.ok(hasChase(CoCScenarioCarnivalOfMasks), 'carnival needs chase');
assert.ok(hasChase(CoCScenarioAlleyToAsphalt), 'alley_to_asphalt needs chase');
assert.ok(CoCScenarioAlleyToAsphalt.nodes.car_jump.effects.chase.gunfightBeats);
assert.ok(hasChase(CoCScenarioRainDockChase), 'rain_dock_chase needs chase');
assert.ok(CoCScenarioRainDockChase.nodes.boat_jump.effects.chase.gunfightBeats);
assert.ok(hasChase(CoCScenarioFogLighthouseChase), 'fog_lighthouse_chase needs chase');
assert.ok(CoCScenarioFogLighthouseChase.nodes.cliff_hazard.effects.chase.gunfightBeats);
assert.ok(hasChase(CoCScenarioCliffMistRun), 'cliff_mist_run needs chase');
assert.ok(!CoCScenarioCliffMistRun.nodes.ledge_gap.effects.chase.gunfightBeats);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = path.join(root, 'js', 'data', 'scenarios', 'packages');
// Built-in train / carnival chase is asserted on the ESM scenarios above (their old JSON packs were removed).
for (const name of ['cc_mayvale_blizzard.json', 'cc_white_widow_reef.json']) {
    const fp = path.join(packDir, name);
    assert.ok(fs.existsSync(fp), 'downloadable package missing: ' + name);
    const pack = JSON.parse(fs.readFileSync(fp, 'utf8'));
    assert.ok(JSON.stringify(pack).includes('"chase"'), name + ' needs chase');
}

const Engine = buildCoCEngine();
const gameState = {
    roster: [{
        name: 'Bob', attrs: { CON: 50 }, skills: {},
        derived: { hp: 10, maxHp: 10, sanity: 50, mov: 8 },
        hp: 10, isActive: true
    }],
    chase: { active: false },
    combat: { enemies: [] },
    scenarioRunner: { flags: {} },
    chatHistory: []
};
const out = applyScenarioEffects({
    gameState,
    Engine,
    pushSystem: () => {},
    ensureFlags: () => gameState.scenarioRunner.flags
}, { chase: { quarry: 'pc', lead: 2, pursuer: '守卫', pursuerMov: 8 } }, 'Bob');
assert.ok(out.chase);
assert.equal(gameState.chase.active, true);

console.log('chase_module_hang_smoke: OK');
