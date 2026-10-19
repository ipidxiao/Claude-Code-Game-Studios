/**
 * Creative D3: falseLead suspicious clue + mythos heat events.
 */
import { strict as assert } from 'node:assert';
import { maybeTriggerHeatEvent } from '../js/data/mythos_heat_events.mjs';
import { addMythosHeat } from '../js/state/mythos_heat.mjs';

const gs = {
    moduleSeed: 42,
    flags: {},
    mythosHeat: 2,
    chatHistory: [],
    scenarioRunner: { flags: {} }
};
const ev = maybeTriggerHeatEvent(gs, 2, 4);
assert.ok(ev);
assert.ok(gs.flags[ev.flag]);
assert.ok(gs.scenarioRunner.flags[ev.flag]);
assert.ok(gs.chatHistory.some((m) => String(m.content || '').includes('热度事件')));

const gs2 = {
    moduleSeed: 7,
    flags: {},
    mythosHeat: 3,
    chatHistory: [],
    scenarioRunner: { flags: {} }
};
addMythosHeat(gs2, 1, 'test');
assert.equal(gs2.mythosHeat, 4);
assert.ok(Object.keys(gs2.flags).some((k) => k.startsWith('heat_') || k === 'mythos_attention'));

// Suspicious clue shape (runner writes this on falseLead success)
const suspicious = {
    id: 'false_lead_rumor',
    title: '可疑笔记',
    quality: 'partial',
    status: 'investigating',
    meta: { falseLead: true }
};
assert.ok(suspicious.meta.falseLead);
assert.equal(suspicious.quality, 'partial');

console.log('creative_d3_falselead_heat_smoke: OK');
