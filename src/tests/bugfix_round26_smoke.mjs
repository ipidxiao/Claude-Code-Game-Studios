/**
 * Round-26 leftover smoke:
 * burst/sweep opens a dice panel; mythos sightings use applyCappedSanLoss;
 * Medicine same-day follows worldClock; chapter unlock no longer returns true
 * for gated ids; asylum institution/private aliases stay on the 7e two-tier table.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { CoCToolHandlers } from '../js/tools/handlers/index.mjs';
import { character } from '../js/tools/handlers/character.mjs';
import { resolvePendingRuleCheck } from '../js/state/rule_check.mjs';
import { isScenarioUnlocked, isChapterGatedAllowed } from '../js/data/arc_chapters.mjs';
import { ASYLUM_CARE } from '../js/data/asylum_care.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const Engine = buildCoCEngine();

function makeChar(over = {}) {
    return Object.assign({
        name: '甲',
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 60, INT: 60, LUCK: 50 },
        skills: { '冲锋枪': 70, '医学': 60, 'SAN': 55 },
        derived: { hp: 10, maxHp: 10, sanity: 55, maxSan: 99, mp: 12, db: '0' },
        hp: 10,
        sanity: 55,
        status: {},
        equipment: { weapon: '汤姆逊冲锋枪 [弹药:30]', ammo: { count: 30, type: '冲锋枪' } },
        isActive: true
    }, over);
}

function emptyHandlers(gameState) {
    return CoCToolHandlers.create({
        gameState,
        addJournalEntry() {}, addNpc() {}, updateNpcStatus() {}, startCombat() {}, endCombat() {},
        updateEnemy() {}, advanceTurn() {}, createMap() {}, updateRoom() {}, setPosition() {},
        addClue() {}, linkClues() {}, markClueStatus() {}, rollCustomDice() {}, groupRoll() {}
    }, Engine);
}

// --- 1. source contracts ---
{
    const burstSrc = readFileSync(join(root, 'js/tools/handlers/combat.mjs'), 'utf8');
    assert.ok(burstSrc.includes("burst: true"), 'burst_fire must pause a dice panel');
    assert.equal(burstSrc.includes('resolveBurstFire(c, enemy'), false,
        'burst_fire must not silent-resolve the attack roll');
    const persist = readFileSync(join(root, 'js/state/persistence.mjs'), 'utf8');
    assert.ok(persist.includes('worldClock:'), 'saves must persist the world clock');
    const chapters = readFileSync(join(root, 'js/data/arc_chapters.mjs'), 'utf8');
    assert.equal(chapters.includes('// Scenarios that do not opt into gating stay open.\n    return true;'), false,
        'isScenarioUnlocked must not unconditionally return true');
}

// --- 2. burst dice panel then settle ---
{
    const foe = {
        name: '枪手', isEnemy: true, hp: 40, maxHp: 40, armor: 0,
        skills: { '闪避': 5 }, status: {}
    };
    const gs = {
        roster: [makeChar()],
        inventory: [{ name: '冲锋枪弹药', qty: 30, ammoType: '冲锋枪' }],
        chatHistory: [],
        combat: { active: true, enemies: [foe] },
        chase: { active: false },
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const handlers = emptyHandlers(gs);
    const out = handlers.burst_fire({
        shooter_name: '甲',
        enemy_name: '枪手',
        rounds: 3,
        mode: 'burst'
    });
    assert.equal(typeof out, 'object', 'burst must return a pause result');
    assert.equal(gs.pendingRuleCheck.burst, true);
    assert.equal(gs.pendingRuleCheck.rounds, 3);
    assert.equal(foe.hp, 40, 'no damage before the player rolls');

    // Dodge stays a live d100. Pin a fumble so a successful dodge cannot hide the hits.
    Engine._setTestRolls([100]);
    let settled;
    try {
        settled = resolvePendingRuleCheck(gs, {
            charName: '甲',
            skill: gs.pendingRuleCheck.skill,
            success: true,
            level: '极难成功',
            rolledValue: 5,
            targetValue: 14,
            skillValue: 70,
            ruleKind: 'combat_attack'
        }, Engine);
    } finally {
        Engine._clearTestRolls();
    }
    assert.ok(settled, 'burst settle must consume the pending spec');
    assert.ok(foe.hp < 40, 'hits apply after the dice panel');
}

// --- 3. reality_check wires applyCappedSanLoss via capKey ---
{
    const gs = {
        roster: [makeChar({ name: '目击者' })],
        chatHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: [],
        sanCaps: {}
    };
    const h = character({ gameState: gs, Engine, addJournalEntry() {} });
    const pause = h.reality_check({ target_name: '目击者', mythos_name: '深潜者' });
    assert.equal(typeof pause, 'object');
    assert.equal(gs.pendingRuleCheck.capKey, '深潜者');
    const before = gs.roster[0].derived.sanity;
    resolvePendingRuleCheck(gs, {
        charName: '目击者', skill: 'SAN', success: false, level: '失败',
        rolledValue: 90, targetValue: 55, skillValue: 55, ruleKind: 'san'
    }, Engine);
    const afterFirst = gs.roster[0].derived.sanity;
    assert.ok(afterFirst < before, 'first sighting applies fail loss');
    gs.pendingRuleCheck = {
        kind: 'san', skill: 'SAN', roller: '目击者', target: '目击者',
        notation: '深潜者', cause: '深潜者', capKey: '深潜者'
    };
    resolvePendingRuleCheck(gs, {
        charName: '目击者', skill: 'SAN', success: false, level: '失败',
        rolledValue: 90, targetValue: 55, skillValue: 55, ruleKind: 'san'
    }, Engine);
    const totalLost = before - gs.roster[0].derived.sanity;
    assert.ok(totalLost <= 6, 'same-entity rematch is capped to the 1D6 fail maximum, lost=' + totalLost);
    assert.ok(Object.prototype.hasOwnProperty.call(gs.sanCaps, '深潜者'));
}

// --- 4. world clock: hours stay same-day; 24h flips Medicine to Hard ---
{
    const c = makeChar({ name: '伤员', hp: 8, maxHp: 12, derived: { hp: 8, maxHp: 12 } });
    const gs = { roster: [c], chatHistory: [], worldClock: { day: 1, hour: 0 }, inventory: [] };
    Engine.HealingEngine.recordInjury(c, { clock: gs.worldClock });
    assert.equal(c.status.woundDay, 1);
    assert.equal(Engine.HealingEngine.medicineDifficulty(c, gs.worldClock), 'normal');
    const handlers = emptyHandlers(gs);
    handlers.advance_time({ hours: 8 });
    assert.equal(gs.worldClock.day, 1);
    assert.equal(gs.worldClock.hour, 8);
    assert.equal(Engine.HealingEngine.medicineDifficulty(c, gs.worldClock), 'normal',
        'an 8-hour wait is still the day of the wound');
    handlers.advance_time({ hours: 16 });
    assert.equal(gs.worldClock.day, 2);
    assert.equal(Engine.HealingEngine.medicineDifficulty(c, gs.worldClock), 'hard',
        'crossing midnight makes Medicine Hard');
}

// --- 5. chapter unlock no longer rubber-stamps gated ids ---
{
    assert.equal(isScenarioUnlocked('tutorial', null), true);
    assert.equal(isScenarioUnlocked('hearing_room', null), false);
    assert.equal(isScenarioUnlocked('hearing_room', { chapters: { unlocked: ['hearing_room'] } }), true);
    assert.equal(isScenarioUnlocked('some_community_mod', null), true);
    assert.equal(isChapterGatedAllowed({ id: 'rain_dock_chase', requiresChapterUnlock: true }, null), false);
}

// --- 6. asylum two-tier table + official aliases ---
{
    assert.equal(ASYLUM_CARE.poor.successRange, 50);
    assert.equal(ASYLUM_CARE.average.successRange, 50);
    assert.equal(ASYLUM_CARE.good.successRange, 95);
    const inst = {
        name: '院友', derived: { sanity: 40, maxSan: 80 }, status: {},
        insanity: { tempInsane: false, indefInsane: true, phobias: [], manias: [], dailyLoss: 0, history: [] }
    };
    const viaAlias = Engine.SanityEngine.applyAsylumMonth(inst, 'institution', { rolledValue: 60 });
    assert.ok(viaAlias.recovered > 0, 'institution alias uses the attending skill 65');
    const privateCare = Engine.SanityEngine.applyAsylumMonth({
        name: '私护', derived: { sanity: 40, maxSan: 80 }, status: {},
        insanity: { tempInsane: false, indefInsane: true, phobias: [], manias: [], dailyLoss: 0, history: [] }
    }, 'private', { rolledValue: 80 });
    assert.ok(privateCare.recovered > 0, 'private alias succeeds on 01-95');
}

console.log('bugfix_round26_smoke: ok');
