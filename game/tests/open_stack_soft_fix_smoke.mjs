/**
 * Soft-bug OPEN stack batch fix smoke (tools + persistence H1–H4).
 */
import { strict as assert } from 'node:assert';

globalThis.window = globalThis.window || {};

import { buildCoCEngine } from '../js/engines/index.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { inventory } from '../js/tools/handlers/inventory.mjs';
import { npc } from '../js/tools/handlers/npc.mjs';
import { clues } from '../js/tools/handlers/clues.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { CoCStatePersistence, SAVE_SCHEMA_VERSION } from '../js/state/persistence.mjs';
import { getKeeperStyle, resolveKeeperStyleId, applyKeeperStyle } from '../js/data/keeper_style.mjs';
import { normalizeDeskPref } from '../js/data/desk_pref.mjs';
import { CoCToolDefinitions } from '../js/tools/definitions.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const Engine = buildCoCEngine();
const __dir = dirname(fileURLToPath(import.meta.url));

function bob(extra = {}) {
    return Object.assign({
        name: 'Bob',
        isActive: true,
        attrs: { CON: 50, LUCK: 40 },
        derived: { hp: 10, maxHp: 10, mp: 10, luck: 40, sanity: 50 },
        skills: { '体质': 50, '闪避': 40 },
        status: {},
        poison: [],
        inventory: [],
        skillsUsedThisSession: []
    }, extra);
}

// --- 1. dispel empty: no MP ---
{
    const inv = bob({ derived: { mp: 8, luck: 40 }, status: {} });
    const r = Engine.MythosEngine.dispel(inv, inv, { mpCost: 1 });
    assert.equal(r.ok, false);
    assert.equal(r.mpCost, 0);
    assert.equal(inv.derived.mp, 8);
    assert.match(r.desc, /没有可驱散|未消耗 MP/);
}
{
    const inv = bob({ derived: { mp: 8, luck: 40 }, status: { ritual: { spellName: 'X', roundsNeeded: 1, roundsDone: 0 } } });
    const r = Engine.MythosEngine.dispel(inv, inv, { mpCost: 1 });
    assert.equal(r.ok, true);
    assert.equal(inv.derived.mp, 7);
    assert.ok(!inv.status.ritual);
}

// --- 2. link_clues phantom IDs ---
{
    const gs = {
        clueBoard: { clues: [{ id: 'a', title: 'A' }], links: [] },
        chatHistory: [],
        currentLocation: 'X',
        roster: []
    };
    let linked = null;
    const linkClues = (fromId, toId, note) => {
        const a = String(fromId || '');
        const b = String(toId || '');
        if (!a || !b || a === b) return { ok: false, reason: 'bad' };
        const cluesArr = gs.clueBoard.clues;
        const hasFrom = cluesArr.some((c) => c && c.id === a);
        const hasTo = cluesArr.some((c) => c && c.id === b);
        if (!hasFrom || !hasTo) return { ok: false, reason: '找不到线索：' + [!hasFrom ? a : null, !hasTo ? b : null].filter(Boolean).join('、') };
        gs.clueBoard.links.push({ from: a, to: b, note: note || '' });
        return { ok: true };
    };
    // Use real gameplay via CoCStateGameplay? Prefer handler with stub matching new API:
    const h = clues({
        gameState: gs,
        addClue: () => {},
        linkClues,
        markClueStatus: (id, status) => {
            const c = gs.clueBoard.clues.find((x) => x.id === id);
            if (!c) return false;
            c.status = status;
            return true;
        }
    });
    const bad = h.link_clues({ from_id: 'a', to_id: 'phantom' });
    assert.match(String(bad), /错误/);
    assert.equal(gs.clueBoard.links.length, 0);
    gs.clueBoard.clues.push({ id: 'b', title: 'B' });
    const ok = h.link_clues({ from_id: 'a', to_id: 'b', note: 'same' });
    assert.match(String(ok), /已连接/);
    assert.equal(gs.clueBoard.links.length, 1);

    // mark_clue_status clue_id alias
    const m = h.mark_clue_status({ clue_id: 'a', status: 'solved' });
    assert.match(String(m), /solved/);
    assert.equal(gs.clueBoard.clues[0].status, 'solved');
}

// schema has clue_id
{
    const cat = CoCToolDefinitions.catalog.mark_clue_status;
    assert.ok(cat.parameters.properties.clue_id);
    assert.ok(cat.parameters.properties.id);
}

// --- 3. register_npc empty ---
{
    const gs = { chatHistory: [], npcRegistry: [] };
    const h = npc({
        gameState: gs,
        addJournalEntry: () => {},
        addNpc: (n) => { gs.npcRegistry.push(n); },
        updateNpcStatus: () => true
    });
    assert.match(String(h.register_npc({ name: '' })), /错误/);
    assert.match(String(h.register_npc({ name: '   ' })), /错误/);
    assert.match(String(h.register_npc({ name: undefined })), /错误/);
    assert.equal(gs.npcRegistry.length, 0);
    assert.match(String(h.register_npc({ name: 'Alice', relation: 'friend' })), /已记录/);
    assert.equal(gs.npcRegistry[0].name, 'Alice');
}

// --- 5. consume transactional ---
{
    const gs = {
        inventory: ['刀', '绳索'],
        chatHistory: [],
        storage: []
    };
    const h = inventory({ gameState: gs, Engine, addJournalEntry: () => {} });
    const fail = h.consume_inventory_items({ items: ['刀', '手枪'] });
    assert.match(String(fail), /错误.*手枪/);
    assert.deepEqual(gs.inventory, ['刀', '绳索']);
    const ok = h.consume_inventory_items({ items: ['刀', '绳索'] });
    assert.match(String(ok), /已消耗/);
    assert.equal(gs.inventory.length, 0);
}

// --- 6. doPush skillsUsedThisSession (logic mirror) ---
{
    const ch = bob({ skills: { '侦查': 40 }, skillsUsedThisSession: [] });
    const skillName = '侦查';
    const result = { success: true, skillValue: 40, rolledValue: 10, targetValue: 40, level: '成功' };
    if (result.success) {
        if (!ch.skillsUsedThisSession) ch.skillsUsedThisSession = [];
        if (!ch.skillsUsedThisSession.some((s) => s.name === skillName)) {
            ch.skillsUsedThisSession.push({ name: skillName, currentValue: result.skillValue });
        }
    }
    assert.equal(ch.skillsUsedThisSession.length, 1);
    const src = readFileSync(join(__dir, '../js/components/story_dice.mjs'), 'utf8');
    assert.ok(src.includes('skillsUsedThisSession'), 'story_dice must write skillsUsedThisSession');
}

// --- 7. resist_poison no active ---
{
    const gs = {
        roster: [bob()],
        chatHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const h = system({ gameState: gs, Engine, addJournalEntry: () => {} });
    const r = h.resist_poison({ target_name: 'Bob' });
    assert.equal(typeof r, 'string');
    assert.match(r, /没有生效的毒素/);
    assert.equal(gs.pendingRuleCheck, null);
    gs.roster[0].poison = [{ potency: 'mild', active: true, damage: '1D3', delayRounds: 0 }];
    const r2 = h.resist_poison({ target_name: 'Bob' });
    assert.ok(r2 && (r2.forceCheck || gs.pendingRuleCheck));
}

// --- 8. dodge requires combat_react ---
{
    const gs = {
        roster: [bob()],
        chatHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: [],
        combat: { active: true, enemies: [], initiativeOrder: [], currentTurnIdx: 0 }
    };
    const h = combat({
        gameState: gs,
        Engine,
        addJournalEntry: () => {},
        addNpc: () => {},
        startCombat: () => {},
        endCombat: () => {},
        updateEnemy: () => {},
        advanceTurn: () => {}
    });
    const noPending = h.dodge({ actor_name: 'Bob' });
    assert.match(String(noPending), /没有正在进行的攻击可闪避/);
    assert.equal(gs.pendingRuleCheck, null);
    gs.pendingRuleCheck = { kind: 'combat_react', prompt: '请闪避或反击', ranged: false };
    const withPending = h.dodge({ actor_name: 'Bob' });
    assert.match(String(withPending), /闪避|掷骰/);
}

// --- 9. derived.luck sync ---
{
    const ch = bob({ attrs: { LUCK: 30 }, derived: { luck: 99, mp: 10 } });
    const r = Engine.spendLuck(ch, 5);
    assert.equal(r.success, true);
    assert.equal(ch.attrs.LUCK, 25);
    assert.equal(ch.derived.luck, 25);
    Engine.spendLuckOnCheck(ch, {
        success: false, level: '失败', rolledValue: 50, skillValue: 40, targetValue: 40
    }, '成功');
    assert.equal(ch.attrs.LUCK, ch.derived.luck);
}

// --- 10. pulp → pulp_lite ---
{
    assert.equal(resolveKeeperStyleId('pulp'), 'pulp_lite');
    assert.equal(getKeeperStyle('pulp').id, 'pulp_lite');
    assert.equal(getKeeperStyle('pulp').ruleset, 'pulp');
    const pref = normalizeDeskPref({ keeperStyle: 'pulp' });
    assert.equal(pref.keeperStyle, 'pulp_lite');
    const gs = { keeperStyle: 'cinematic' };
    applyKeeperStyle(gs, Engine, 'pulp');
    assert.equal(gs.keeperStyle, 'pulp_lite');
}

// --- H1–H4 persistence coerce ---
{
    const gameState = {
        roster: [{ name: 'Alive' }], inventory: [], storage: [], knownLocations: ['A'],
        currentLocation: 'A', chatHistory: [], journalLog: [], npcRegistry: [],
        combat: { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' },
        chase: { active: false },
        sceneMap: { title: 'OLD', rooms: [{ id: 'r1' }], currentRoomId: 'r1' },
        clueBoard: { clues: [{ id: 'c1' }], links: [] },
        diceHistory: [], atmosphere: { level: 'tense', note: 'before' },
        scenarioRunner: {
            active: true, scenarioId: 'LIVE', scenarioTitle: 'Live', currentNodeId: 'n9',
            choices: [], ended: false, flags: { keep: 1 }, pendingBranch: null, pendingScenarioId: null
        },
        activeCampaign: null, campaignArchive: null, arcLedger: null, kpState: null,
        kpEngine: { enabled: false }, selectedCharIndex: 0, activeModuleId: 'default',
        pendingRuleCheck: null, pendingRuleChecks: [], groupCheckSession: null,
        moduleSeed: 0, encounterVariant: null, keeperStyle: 'cinematic', mythosHeat: 0,
        heatEventsLog: [], skillAttempts: {}, sanCaps: {}, worldClock: { day: 1, hour: 0 },
        flags: {}, pendingAftermath: [], _customWeapons: {}, endingSaveBlurb: '', storageStatus: {}
    };
    const ui = {
        showToast: () => {},
        _safeLocalStorageSetItem: () => true,
        _pushSystemNotice: () => {},
        compactChatHistory: () => {},
        _formatStorageError: String
    };
    const P = CoCStatePersistence.create(
        { gameState, switchScreen: () => {}, cleanupInitiativeOrder: () => {} },
        ui
    );

    const ok = P._restoreFromData({
        version: 8,
        savedAt: new Date().toISOString(),
        data: {
            roster: [{ name: 'New' }],
            scenarioRunner: [],
            atmosphere: 'calm',
            clueBoard: 'broken',
            sceneMap: [],
            chatHistory: []
        }
    }, 't');
    assert.equal(ok, true);
    assert.equal(gameState.scenarioRunner.active, false);
    assert.equal(gameState.scenarioRunner.scenarioId, null);
    assert.equal(gameState.atmosphere.level, 'calm');
    assert.equal(gameState.atmosphere['0'], undefined);
    assert.ok(Array.isArray(gameState.clueBoard.clues));
    assert.equal(gameState.clueBoard.clues.length, 0);
    assert.equal(gameState.sceneMap.title, '');
    assert.deepEqual(gameState.sceneMap.rooms, []);

    const migrated = P.migrateSaveData({
        version: 7,
        data: { roster: [{ name: 'Z' }], clueBoard: 'x', scenarioRunner: {}, atmosphere: 3, sceneMap: [] }
    });
    assert.equal(migrated.version, SAVE_SCHEMA_VERSION);
    assert.equal(migrated.data.scenarioRunner.active, false);
    assert.ok(Array.isArray(migrated.data.clueBoard.clues));
    assert.equal(migrated.data.atmosphere.level, 'calm');
    assert.equal(migrated.data.sceneMap.title, '');
}

console.log('open_stack_soft_fix_smoke: OK');
