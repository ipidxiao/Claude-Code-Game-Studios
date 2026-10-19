/**
 * Short-module campaign arc ledger v2 — flags + character/loot snapshots.
 * Decoupled from Masks campaignArchive.
 */
import { bestClueQualityBranchKey, CLUE_QUALITY_RANK } from '../data/investigate_outcomes.mjs';
import { hashSeed } from '../data/encounter_seed.mjs';
import { mergeChapterUnlocks } from '../data/arc_chapters.mjs';
import { setPressureFlag } from './pressure_bus.mjs';
import { ensureInvIds } from './char_record.mjs';

const CARRY_FLAGS = [
    'witness_attention',
    'police_interest',
    'reputation_hit',
    'ally_scar',
    'deep_one_decisive_win',
    'mythos_attention'
];

function safeClone(v, fallback) {
    try {
        return JSON.parse(JSON.stringify(v));
    } catch (_e) {
        return fallback;
    }
}

export function emptyArcLedger() {
    return {
        version: 2,
        investigators: [],
        characterSnapshot: [],
        inventorySnapshot: [],
        storageSnapshot: [],
        flagsCarry: {},
        lastScenarioId: null,
        lastEndingKey: null,
        mythosHeatFloor: 0,
        chapters: { unlocked: [], completed: [] },
        updatedAt: null
    };
}

function topClueQuality(clues) {
    return bestClueQualityBranchKey(clues || []);
}

function collectFlags(gameState) {
    const out = {};
    const a = (gameState && gameState.flags) || {};
    const b = (gameState && gameState.scenarioRunner && gameState.scenarioRunner.flags) || {};
    CARRY_FLAGS.forEach((k) => {
        if (a[k] || b[k]) out[k] = true;
    });
    return out;
}

function pcRoster(gameState) {
    return ((gameState && gameState.roster) || []).filter((c) => c && c.name && !c.isNpc);
}

export function hasCarrySnapshot(ledger) {
    if (!ledger || typeof ledger !== 'object') return false;
    return Array.isArray(ledger.characterSnapshot) && ledger.characterSnapshot.length > 0;
}

/** Snapshot after a short-module ending (v2). */
export function exportArcLedger(gameState, opts) {
    const o = opts || {};
    if (!gameState) return null;
    const r = gameState.scenarioRunner || {};
    const pcs = pcRoster(gameState);
    const prev = (gameState.arcLedger && typeof gameState.arcLedger === 'object')
        ? gameState.arcLedger
        : emptyArcLedger();

    const investigators = pcs.map((c) => ({
        name: c.name,
        mythosHeat: Number(gameState.mythosHeat) || 0,
        topClueQuality: topClueQuality(gameState.clueBoard && gameState.clueBoard.clues)
    }));

    const scenarioId = o.scenarioId || r.scenarioId || null;
    const endingKey = o.endingKey || r.currentNodeId || null;

    let ledger = {
        version: 2,
        investigators: investigators.length
            ? investigators
            : [{ name: '调查员', mythosHeat: Number(gameState.mythosHeat) || 0, topClueQuality: topClueQuality(gameState.clueBoard && gameState.clueBoard.clues) }],
        characterSnapshot: safeClone(pcs, []),
        inventorySnapshot: safeClone(gameState.inventory || [], []),
        storageSnapshot: safeClone(gameState.storage || [], []),
        flagsCarry: collectFlags(gameState),
        lastScenarioId: scenarioId,
        lastEndingKey: endingKey,
        mythosHeatFloor: Math.max(Number(prev.mythosHeatFloor) || 0, Number(gameState.mythosHeat) || 0),
        chapters: safeClone(prev.chapters || { unlocked: [], completed: [] }, { unlocked: [], completed: [] }),
        updatedAt: Date.now()
    };

    if (!Array.isArray(ledger.chapters.completed)) ledger.chapters.completed = [];
    if (!Array.isArray(ledger.chapters.unlocked)) ledger.chapters.unlocked = [];
    if (scenarioId) {
        const existingIdx = ledger.chapters.completed.findIndex((c) => c && c.id === scenarioId);
        const entry = { id: scenarioId, endingKey: endingKey, at: ledger.updatedAt };
        if (existingIdx >= 0) ledger.chapters.completed[existingIdx] = entry;
        else ledger.chapters.completed.push(entry);
        ledger = mergeChapterUnlocks(ledger, scenarioId);
    }

    gameState.arcLedger = ledger;
    return ledger;
}

/**
 * Apply flags + heat floor + seed bias (not roster/loot — use restoreCarrySnapshot).
 */
export function importArcLedger(gameState, opts) {
    const o = opts || {};
    if (!gameState) return { applied: false };
    const ledger = o.ledger || gameState.arcLedger;
    if (!ledger || typeof ledger !== 'object') return { applied: false };

    if (o.skipFlags) {
        // Still allow seed bias from ledger identity.
    } else {
        const flags = ledger.flagsCarry || {};
        if (!gameState.flags) gameState.flags = {};
        Object.keys(flags).forEach((k) => {
            if (flags[k]) gameState.flags[k] = true;
        });
        const r = gameState.scenarioRunner;
        if (r) {
            if (!r.flags) r.flags = {};
            Object.keys(flags).forEach((k) => {
                if (flags[k]) r.flags[k] = true;
            });
            r.flags.arcLedgerImported = true;
            applyReputationPressure(r, flags);
        }
    }

    if (!o.skipHeat) {
        const floor = Number(ledger.mythosHeatFloor) || 0;
        const cur = Number(gameState.mythosHeat) || 0;
        if (floor > cur) gameState.mythosHeat = floor;
    }

    const biasInput = String(ledger.lastScenarioId || '') + '|' + String(ledger.lastEndingKey || '') + '|' + String(ledger.updatedAt || 0);
    const seedBias = hashSeed(biasInput);
    if (o.applySeedBias !== false) {
        gameState._arcLedgerSeedBias = seedBias;
    }
    return { applied: true, seedBias };
}

/** Tighten seed clue gate when police/reputation carry over. */
export function applyReputationPressure(runner, flags) {
    if (!runner) return;
    if (!runner.flags) runner.flags = {};
    const f = flags || runner.flags;
    if (!(f.police_interest || f.reputation_hit)) return;
    const rank = { none: 0, partial: 1, solid: 2, decisive: 3 };
    const inv = { 0: 'none', 1: 'partial', 2: 'solid', 3: 'decisive' };
    const cur = String(runner.flags.seedRequiresClueQuality || 'partial').toLowerCase();
    let n = rank[cur] != null ? rank[cur] : 1;
    if (f.police_interest) n = Math.min(3, n + 1);
    else if (f.reputation_hit) n = Math.min(3, Math.max(n, 2));
    runner.flags.seedRequiresClueQuality = inv[n] || 'solid';
    setPressureFlag({ flags: runner.flags, scenarioRunner: runner }, 'arc_pressure', true);
}

/** Restore roster + inventory/storage from v2 snapshot. Does not touch clueBoard. */
export function restoreCarrySnapshot(gameState, opts) {
    const o = opts || {};
    const ledger = o.ledger || (gameState && gameState.arcLedger);
    if (!gameState || !hasCarrySnapshot(ledger)) return { restored: false };

    const chars = safeClone(ledger.characterSnapshot, []);
    ensureInvIds(chars, { donors: gameState.roster });
    if (Array.isArray(gameState.roster)) {
        gameState.roster.splice(0, gameState.roster.length, ...chars);
    } else {
        gameState.roster = chars;
    }
    const inv = safeClone(ledger.inventorySnapshot || [], []);
    const stor = safeClone(ledger.storageSnapshot || [], []);
    if (Array.isArray(gameState.inventory)) {
        gameState.inventory.splice(0, gameState.inventory.length, ...inv);
    } else {
        gameState.inventory = inv;
    }
    if (Array.isArray(gameState.storage)) {
        gameState.storage.splice(0, gameState.storage.length, ...stor);
    } else {
        gameState.storage = stor;
    }
    if (gameState.clueBoard && Array.isArray(gameState.clueBoard.clues)) {
        gameState.clueBoard.clues.splice(0);
        if (Array.isArray(gameState.clueBoard.links)) gameState.clueBoard.links.splice(0);
    }
    return { restored: true, count: chars.length, items: inv.length };
}

/**
 * Reset investigator loot/heat; heal existing roster to max; keep chapter unlocks.
 */
export function resetInvestigatorCarry(gameState) {
    if (!gameState) return { reset: false };
    const roster = gameState.roster || [];
    roster.forEach((c) => {
        if (!c || c.isNpc) return;
        if (!c.derived) c.derived = {};
        const maxHp = Number(c.derived.maxHp != null ? c.derived.maxHp : c.maxHp) || Number(c.derived.hp) || 10;
        const maxSan = Number(c.derived.maxSan != null ? c.derived.maxSan : c.maxSan) || Number(c.derived.sanity) || 50;
        const maxMp = Number(c.derived.maxMp != null ? c.derived.maxMp : c.maxMp) || Number(c.derived.mp) || 10;
        c.derived.hp = maxHp;
        c.derived.sanity = maxSan;
        c.derived.mp = maxMp;
        c.hp = maxHp;
        if (c.status) {
            delete c.status.majorWound;
            delete c.status.major_wound;
            delete c.status.hasMajorWound;
            delete c.status.dying;
            delete c.status.unconscious;
            delete c.status.isDying;
            delete c.status.isUnconscious;
            delete c.status.isDead;
            delete c.status.boutFaint;
            delete c.status.prone;
            delete c.status.cover;
            delete c.status.inCover;
        }
    });
    if (Array.isArray(gameState.inventory)) gameState.inventory.splice(0);
    if (Array.isArray(gameState.storage)) gameState.storage.splice(0);
    gameState.mythosHeat = 0;
    if (gameState.flags) {
        CARRY_FLAGS.forEach((k) => { delete gameState.flags[k]; });
    }
    const r = gameState.scenarioRunner;
    if (r && r.flags) {
        CARRY_FLAGS.forEach((k) => { delete r.flags[k]; });
        setPressureFlag({ flags: r.flags || (r.flags = {}), scenarioRunner: r }, 'arc_pressure', false);
    }
    if (gameState.clueBoard && Array.isArray(gameState.clueBoard.clues)) {
        gameState.clueBoard.clues.splice(0);
        if (Array.isArray(gameState.clueBoard.links)) gameState.clueBoard.links.splice(0);
    }
    // Preserve arcLedger.chapters only (even when chapters key was missing).
    const chapters = safeClone(gameState.arcLedger && gameState.arcLedger.chapters, { unlocked: [], completed: [] });
    gameState.arcLedger = Object.assign(emptyArcLedger(), {
        chapters,
        updatedAt: Date.now()
    });
    return { reset: true };
}

export function seedWithArcBias(baseSeed, bias) {
    const a = Number(baseSeed) || 0;
    const b = Number(bias) || 0;
    return ((a ^ b) >>> 0) || 1;
}

export function qualityRankName(key) {
    const k = String(key || 'weak');
    if (k === 'decisive') return CLUE_QUALITY_RANK.decisive;
    if (k === 'solid') return CLUE_QUALITY_RANK.solid;
    return CLUE_QUALITY_RANK.partial;
}

export function carrySummary(ledger) {
    if (!ledger) return null;
    const names = (ledger.characterSnapshot || []).map((c) => c && c.name).filter(Boolean);
    const flags = Object.keys(ledger.flagsCarry || {}).filter((k) => ledger.flagsCarry[k]);
    return {
        names: names.join('、') || ((ledger.investigators || [])[0] && ledger.investigators[0].name) || '—',
        itemCount: (ledger.inventorySnapshot || []).length + (ledger.storageSnapshot || []).length,
        heat: Number(ledger.mythosHeatFloor) || 0,
        flagCount: flags.length,
        flags,
        hasSnapshot: hasCarrySnapshot(ledger),
        version: ledger.version || 1,
        unlockCount: ((ledger.chapters && ledger.chapters.unlocked) || []).length
    };
}

export function arcLedgerMeta(ledger) {
    const s = carrySummary(ledger);
    if (!s) {
        return { version: null, heat: 0, hasSnapshot: false, unlockCount: 0, blurb: '' };
    }
    return {
        version: s.version,
        heat: s.heat,
        hasSnapshot: s.hasSnapshot,
        unlockCount: s.unlockCount,
        blurb: 'v' + s.version + ' · 热度' + s.heat + '/5' + (s.hasSnapshot ? ' · 可继承快照' : ' · 无快照')
            + ' · 解锁' + s.unlockCount
    };
}

export const CoCArcLedger = {
    emptyArcLedger,
    exportArcLedger,
    importArcLedger,
    restoreCarrySnapshot,
    resetInvestigatorCarry,
    hasCarrySnapshot,
    carrySummary,
    arcLedgerMeta,
    applyReputationPressure,
    seedWithArcBias,
    CARRY_FLAGS
};

if (typeof window !== 'undefined') window.CoCArcLedger = CoCArcLedger;
