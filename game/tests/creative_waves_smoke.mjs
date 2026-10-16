/**
 * Wave 3–5: encounter seed, keeper style, mythos heat, save blurb.
 */
import { strict as assert } from 'node:assert';
import { applyModuleSeed, resolveEncounterVariant, hashSeed } from '../js/data/encounter_seed.mjs';
import { applyKeeperStyle, getKeeperStyle, keeperStylePromptFragment } from '../js/data/keeper_style.mjs';
import { addMythosHeat, buildUnreliableSaveBlurb } from '../js/state/mythos_heat.mjs';
import { CoCEngine } from '../js/coc.mjs';

assert.equal(resolveEncounterVariant(0).id, 'A');
assert.equal(resolveEncounterVariant(1).id, 'B');
assert.equal(resolveEncounterVariant(2).id, 'C');
assert.ok(hashSeed('x') > 0);

const gs = { scenarioRunner: { flags: {} } };
const applied = applyModuleSeed(gs, { seed: 1 });
assert.equal(applied.variant.id, 'B');
assert.equal(gs.encounterVariant, 'B');
assert.equal(gs.scenarioRunner.flags.encounterVariant, 'B');

const style = applyKeeperStyle(gs, CoCEngine, 'strict');
assert.equal(style.ruleset, '7e-full');
assert.equal(gs.keeperStyle, 'strict');
assert.ok(keeperStylePromptFragment(gs).includes('严苛'));
assert.equal(getKeeperStyle('pulp_lite').ruleset, 'pulp');

gs.mythosHeat = 0;
gs.chatHistory = [];
addMythosHeat(gs, 4, '测试');
assert.equal(gs.mythosHeat, 4);
assert.equal(gs.flags.mythos_attention, true);

const blurb = buildUnreliableSaveBlurb({
    currentLocation: '码头',
    journalLog: [{ summary: '马克逃入巷口' }],
    mythosHeat: 4
});
assert.ok(blurb.includes('码头'));
assert.ok(blurb.includes('马克'));

// UI contract: blurb is read-only string suitable for lobby list
assert.equal(typeof blurb, 'string');
assert.ok(blurb.length > 8);

console.log('creative_waves_smoke: OK');
