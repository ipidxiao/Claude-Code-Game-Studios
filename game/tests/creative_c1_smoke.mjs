/**
 * Creative C1: arcLedger + credibility + aftermath expand.
 */
import { strict as assert } from 'node:assert';
import { exportArcLedger, importArcLedger, seedWithArcBias } from '../js/state/arc_ledger.mjs';
import { resolveClueQualityFromCredibility, resolveClueQualityForNpc } from '../js/data/npc_credibility.mjs';
import { collectAftermathItems, enqueueAftermath, sanAftershockThreshold } from '../js/state/aftermath.mjs';
import { getKeeperStyle } from '../js/data/keeper_style.mjs';

const gs = {
    mythosHeat: 3,
    roster: [{ name: '调查员甲', isActive: true }],
    clueBoard: { clues: [{ id: 'c1', quality: 'solid' }] },
    flags: { witness_attention: true },
    scenarioRunner: { scenarioId: 'deep_one_shadow', currentNodeId: 'ending_win', flags: { police_interest: false } },
    chatHistory: []
};
const ledger = exportArcLedger(gs, { endingKey: 'ending_win' });
assert.equal(ledger.version, 2);
assert.ok(ledger.flagsCarry.witness_attention);
assert.equal(ledger.mythosHeatFloor, 3);

const gs2 = {
    mythosHeat: 0,
    flags: {},
    scenarioRunner: { flags: {} },
    moduleSeed: 0
};
const imp = importArcLedger(gs2, { ledger });
assert.equal(imp.applied, true);
assert.equal(gs2.mythosHeat, 3);
assert.ok(gs2.flags.witness_attention);
assert.ok(seedWithArcBias(1, imp.seedBias) > 0);

assert.equal(resolveClueQualityFromCredibility(1, '成功'), 'partial');
assert.equal(resolveClueQualityFromCredibility(1, '困难成功'), 'solid');
assert.equal(resolveClueQualityFromCredibility(2, '成功'), 'solid');
assert.equal(resolveClueQualityFromCredibility(3, '极难成功'), 'decisive');
assert.equal(resolveClueQualityForNpc('dos_fisher', '成功'), 'partial');
assert.equal(resolveClueQualityForNpc('dos_martha', '成功'), 'solid');

const afterGs = {
    roster: [
        { name: '甲', isActive: true, status: {} },
        { name: '盟友', isNpc: true, status: { dying: true }, derived: { hp: 0 } }
    ],
    combat: { sanLostThisFight: 0 },
    scenarioRunner: { flags: { public_place: true, witness_attention: true, violent_public: true } },
    chatHistory: [],
    pendingAftermath: [],
    keeperStyle: 'cinematic'
};
const items = collectAftermathItems(afterGs, { forcePolice: true });
assert.ok(items.some((i) => i.kind === 'reputation_hit'));
assert.ok(items.some((i) => i.kind === 'police_interest'));
assert.ok(items.some((i) => i.kind === 'ally_scar'));
enqueueAftermath(afterGs, items);
assert.ok(afterGs.flags.reputation_hit);
assert.ok(afterGs.flags.ally_scar);

assert.equal(sanAftershockThreshold({ keeperStyle: 'strict' }), 3);
assert.equal(sanAftershockThreshold({ keeperStyle: 'pulp_lite' }), 8);
assert.equal(getKeeperStyle('strict').density.gunfightHints, 'sparse');

console.log('creative_c1_smoke: OK');
