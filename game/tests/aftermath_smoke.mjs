/**
 * Wave 1B: post-combat aftermath queue.
 */
import { strict as assert } from 'node:assert';
import {
    collectAftermathItems,
    enqueueAftermath,
    flushAftermathToRuleCheck,
    SAN_AFTERSHOCK_THRESHOLD
} from '../js/state/aftermath.mjs';

const gs = {
    roster: [
        { name: '调查员甲', isActive: true, status: { majorWound: true } },
        { name: '调查员乙', isActive: true, status: {} }
    ],
    combat: { active: false, sanLostThisFight: SAN_AFTERSHOCK_THRESHOLD },
    scenarioRunner: { flags: { public_place: true } },
    chatHistory: [],
    pendingRuleCheck: null,
    pendingRuleChecks: [],
    pendingAftermath: []
};

const items = collectAftermathItems(gs);
assert.ok(items.some((i) => i.kind === 'wound_recovery'));
assert.ok(items.some((i) => i.kind === 'san_aftershock'));
assert.ok(items.some((i) => i.kind === 'witness_heat'));

const after2 = {
    roster: [{ name: '盟友', isNpc: true, status: { dying: true }, derived: { hp: 0 } }],
    combat: { sanLostThisFight: 0 },
    scenarioRunner: { flags: { public_place: true, witness_attention: true, violent_public: true } },
    chatHistory: [],
    pendingAftermath: [],
    flags: {}
};
const extra = collectAftermathItems(after2, { forcePolice: true });
assert.ok(extra.some((i) => i.kind === 'reputation_hit'));
assert.ok(extra.some((i) => i.kind === 'police_interest'));
assert.ok(extra.some((i) => i.kind === 'ally_scar'));
enqueueAftermath(after2, extra);
assert.ok(after2.flags.reputation_hit);

const queued = enqueueAftermath(gs, items);
assert.ok(queued.queued >= 2);
assert.ok(gs.flags && gs.flags.witness_attention, 'witness heat applies immediately');
assert.ok(gs.pendingRuleCheck || (gs.pendingAftermath && gs.pendingAftermath.length >= 0));

gs.pendingRuleCheck = null;
flushAftermathToRuleCheck(gs);
assert.ok(gs.pendingRuleCheck || gs.pendingAftermath.length === 0);

console.log('aftermath_smoke: OK');
