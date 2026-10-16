/**
 * Creative D1: arcLedger v2 inherit/reset + chapter unlocks.
 */
import { strict as assert } from 'node:assert';
import {
    exportArcLedger,
    restoreCarrySnapshot,
    resetInvestigatorCarry,
    hasCarrySnapshot,
    importArcLedger,
    applyReputationPressure
} from '../js/state/arc_ledger.mjs';
import { isChapterGatedAllowed, mergeChapterUnlocks } from '../js/data/arc_chapters.mjs';

const gs = {
    mythosHeat: 2,
    roster: [{
        name: '马克',
        isActive: true,
        derived: { hp: 7, maxHp: 12, sanity: 40, maxSan: 60, mp: 5, maxMp: 10 },
        status: { majorWound: true }
    }],
    inventory: [{ name: '潮汐表', qty: 1 }],
    storage: [],
    flags: { reputation_hit: true, police_interest: true },
    scenarioRunner: { scenarioId: 'deep_one_shadow', currentNodeId: 'ending_win', flags: { police_interest: true } },
    clueBoard: { clues: [{ id: 'c1', quality: 'solid' }], links: [] },
    chatHistory: []
};

const ledger = exportArcLedger(gs, { scenarioId: 'deep_one_shadow', endingKey: 'ending_win' });
assert.equal(ledger.version, 2);
assert.ok(hasCarrySnapshot(ledger));
assert.equal(ledger.inventorySnapshot.length, 1);
assert.ok(ledger.chapters.unlocked.includes('rain_dock_chase'));

const gs2 = {
    mythosHeat: 0,
    roster: [],
    inventory: [],
    storage: [],
    flags: {},
    scenarioRunner: { flags: {} },
    clueBoard: { clues: [{ id: 'old', quality: 'partial' }], links: [] },
    arcLedger: ledger
};
restoreCarrySnapshot(gs2);
assert.equal(gs2.roster.length, 1);
assert.equal(gs2.roster[0].name, '马克');
assert.equal(gs2.inventory.length, 1);
assert.equal(gs2.clueBoard.clues.length, 0);
importArcLedger(gs2);
assert.ok(gs2.flags.police_interest);
assert.ok(gs2.mythosHeat >= 2);

const gs3 = {
    mythosHeat: 4,
    roster: [{
        name: '马克',
        derived: { hp: 3, maxHp: 12, sanity: 10, maxSan: 60, mp: 1, maxMp: 10 },
        status: { majorWound: true }
    }],
    inventory: [{ name: '账本' }],
    storage: [{ name: '箱子' }],
    flags: { reputation_hit: true },
    scenarioRunner: { flags: { reputation_hit: true } },
    clueBoard: { clues: [{ id: 'x' }], links: [] },
    arcLedger: ledger
};
resetInvestigatorCarry(gs3);
assert.equal(gs3.inventory.length, 0);
assert.equal(gs3.storage.length, 0);
assert.equal(gs3.mythosHeat, 0);
assert.equal(gs3.roster[0].derived.hp, 12);
assert.ok(gs3.arcLedger.chapters.unlocked.includes('rain_dock_chase'));

const locked = { id: 'rain_dock_chase', requiresChapterUnlock: true, title: '雨夜' };
assert.equal(isChapterGatedAllowed(locked, null), false);
assert.equal(isChapterGatedAllowed(locked, ledger), true);

const r = { flags: { seedRequiresClueQuality: 'partial', police_interest: true } };
applyReputationPressure(r, r.flags);
assert.equal(r.flags.seedRequiresClueQuality, 'solid');

console.log('creative_d1_carry_smoke: OK');
