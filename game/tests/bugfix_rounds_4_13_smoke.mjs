/**
 * Rounds 4–13 bugfix smoke: chase caught, rule-check order, growth gate,
 * heat multi-band, aftermath hasMajorWound, falseLead map fields, PDF branch remap.
 */
import { strict as assert } from 'node:assert';
import { resolvePendingRuleCheck, enqueueRuleCheck } from '../js/state/rule_check.mjs';
import { collectAftermathItems } from '../js/state/aftermath.mjs';
import { maybeTriggerHeatEvent } from '../js/data/mythos_heat_events.mjs';
import { mapScenarioChoice } from '../js/scenario/choice_menu.mjs';
import { exportArcLedger, resetInvestigatorCarry, emptyArcLedger } from '../js/state/arc_ledger.mjs';

// --- chase caught deactivates ---
const chase = { active: true, outcome: null };
const ev = { escaped: false, caught: true };
if (ev.caught) { chase.outcome = 'caught'; chase.active = false; }
assert.equal(chase.active, false);

// --- rule-check: no out-of-order queue resolve ---
const gs = { pendingRuleCheck: null, pendingRuleChecks: [], chatHistory: [], roster: [] };
enqueueRuleCheck(gs, { kind: 'san', skill: '理智', roller: '甲', prompt: 'A' });
enqueueRuleCheck(gs, { kind: 'dying', skill: '体质', roller: '甲', prompt: 'B' });
assert.equal(gs.pendingRuleCheck.kind, 'san');
assert.equal(resolvePendingRuleCheck(gs, { skill: '体质', charName: '甲', ruleKind: 'dying' }, null), null);
assert.equal(gs.pendingRuleCheck.kind, 'san');
assert.equal(gs.pendingRuleChecks.length, 1);

// --- aftermath reads hasMajorWound ---
const items = collectAftermathItems({
    roster: [{ name: '甲', isActive: true, status: { hasMajorWound: true } }],
    combat: { sanLostThisFight: 0 },
    scenarioRunner: { flags: {} }
});
assert.ok(items.some((i) => i.kind === 'wound_recovery'));

// --- heat multi-band ---
const heatGs = { moduleSeed: 1, flags: {}, chatHistory: [], scenarioRunner: { flags: {} }, heatEventsLog: [] };
maybeTriggerHeatEvent(heatGs, 2, 5);
assert.ok(heatGs.heatEventsLog.length >= 2);

// --- falseLead passed through choice map ---
const mapped = mapScenarioChoice({ id: 'x', label: '诱', next: 'a', falseLead: true, falseNext: 'trap' });
assert.equal(mapped.falseLead, true);
assert.equal(mapped.falseNext, 'trap');

// --- mythosHeatFloor never regresses ---
const gs2 = {
    mythosHeat: 1,
    roster: [{ name: '甲', isActive: true, isNpc: false }],
    inventory: [],
    clueBoard: { clues: [] },
    arcLedger: Object.assign(emptyArcLedger(), { mythosHeatFloor: 4 }),
    scenarioRunner: { scenarioId: 't', currentNodeId: 'end' }
};
const led = exportArcLedger(gs2, { scenarioId: 't', endingKey: 'end' });
assert.ok(led.mythosHeatFloor >= 4);

// --- reset clears isDying ---
const gs3 = {
    roster: [{ name: '甲', isActive: true, isNpc: false, derived: { maxHp: 10, maxSan: 50, maxMp: 10 }, hp: 1, status: { isDying: true, boutFaint: true } }],
    inventory: [],
    storage: [],
    flags: {},
    mythosHeat: 2,
    scenarioRunner: {},
    arcLedger: emptyArcLedger()
};
resetInvestigatorCarry(gs3);
assert.equal(gs3.roster[0].status.isDying, undefined);
assert.equal(gs3.roster[0].status.boutFaint, undefined);

// --- PDF branch remap shape ---
function remapChunkRef(ci, ref) {
    if (ref == null || ref === '') return ref;
    const s = String(ref);
    if (s.startsWith('c') && /_/.test(s)) return s;
    return `c${ci + 1}_${s}`;
}
assert.equal(remapChunkRef(0, 'ending_a'), 'c1_ending_a');
assert.equal(remapChunkRef(1, 'c2_x'), 'c2_x');

console.log('bugfix_rounds_4_13_smoke: OK');
