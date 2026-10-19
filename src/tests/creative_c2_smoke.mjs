/**
 * Creative C2: dual clocks + falseLead contract + unreliable clues.
 */
import { strict as assert } from 'node:assert';
import { distortClueDisplay } from '../js/state/unreliable_clues.mjs';
import { applyScenarioEffects } from '../js/scenario/effects_apply.mjs';
import { CoCScenarioDeepOneShadow } from '../js/data/scenarios/deep_one_shadow.mjs';

assert.ok(CoCScenarioDeepOneShadow.clocks);
assert.ok(CoCScenarioDeepOneShadow.onClockFull && CoCScenarioDeepOneShadow.onClockFull.ritual);
const rumor = CoCScenarioDeepOneShadow.nodes.inn_talk.choices.find((c) => c.id === 'rumor');
assert.ok(rumor && rumor.falseLead && rumor.falseNext === 'false_lead_dock');
assert.ok(CoCScenarioDeepOneShadow.nodes.false_lead_dock);

const clue = { id: 'x1', title: '码头工牌', content: '17号仓库夜班登记，持有人：E·马什。' };
const clear = distortClueDisplay(clue, { mythosHeat: 0, moduleSeed: 42 });
assert.equal(clear.title, clue.title);
assert.equal(clear.content, clue.content);
assert.equal(clear.distorted, false);

const hot = distortClueDisplay(clue, { mythosHeat: 4, moduleSeed: 42 });
assert.equal(hot.distorted, true);
assert.ok(hot.title !== clue.title || hot.content !== clue.content);
// Underlying id/quality untouched by display helper
assert.equal(clue.id, 'x1');

const gs = {
    scenarioRunner: { clocks: { investigation: 0, ritual: 0, maxInvestigation: 5, maxRitual: 4 }, flags: {} },
    chatHistory: [],
    roster: [{ name: 'A', isActive: true, derived: { hp: 10, sanity: 50 } }]
};
const out = applyScenarioEffects({
    gameState: gs,
    Engine: {},
    pushSystem: () => {},
    ensureFlags: () => gs.scenarioRunner.flags
}, { advanceClock: { track: 'ritual', by: 2 } });
assert.equal(gs.scenarioRunner.clocks.ritual, 2);
assert.ok(out.clocks);

console.log('creative_c2_smoke: OK');
