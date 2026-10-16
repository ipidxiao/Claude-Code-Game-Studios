/**
 * Round-21 bugfix smoke (real modules):
 * burst and sweep fire must respect the target's cover the same way single
 * shots do — cover armor stops each round, its durability wears down, and a
 * destroyed cover stops protecting mid-volley.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { CoCToolHandlers } from '../js/tools/handlers/index.mjs';

const Engine = buildCoCEngine();

const shooter = { name: '射手', skills: { '冲锋枪': 70 }, derived: { db: '0' }, status: {} };
// Fixed 8-point rounds keep the soak arithmetic deterministic.
const weapon = { name: '汤姆逊', type: 'firearm', skill: '冲锋枪', damage: '8', malfunction: 100 };
const hitAll = { success: true, level: '极难成功', rolledValue: 5, targetValue: 70 };
const dodgeFail = { success: false, level: '失败', rolledValue: 95, targetValue: 30 };

function foe(over = {}) {
    return Object.assign({
        name: '枪手', isEnemy: true, hp: 40, maxHp: 40, armor: 0,
        skills: { '闪避': 30 }, status: {}
    }, over);
}

// --- 1. burst fire: hard cover soaks every round and loses durability ---
{
    const target = foe();
    target.status.cover = Engine.CombatEngine.normalizeCover('hard'); // armor 5, hp 15
    let lastCover = target.status.cover;

    const res = Engine.CombatEngine.resolveBurstFire(shooter, target, weapon, 3, 'burst', {
        preRolledAttack: hitAll,
        preRolledDefense: dodgeFail,
        onCoverUpdate: (next) => { lastCover = next; }
    });
    assert.equal(res.hits, 3, 'an extreme success lands every round');
    assert.equal(res.coverSoaked, 9, 'each 8-point round loses 5 to cover armor and 3 to durability');
    assert.equal(res.totalDamage, 0, 'nothing gets through intact hard cover');
    assert.equal(lastCover.hp, 6, 'cover durability drops by what it absorbed');
}

// --- 2. an uncovered target still eats the whole volley (no phantom soak) ---
{
    const bare = foe({ name: '无掩体' });
    const res = Engine.CombatEngine.resolveBurstFire(shooter, bare, weapon, 3, 'burst', {
        preRolledAttack: hitAll, preRolledDefense: dodgeFail
    });
    assert.equal(res.coverSoaked, 0);
    assert.equal(res.totalDamage, 24);
}

// --- 3. sweep fire: per-target cover, and a shot-out cover stops helping ---
{
    const covered = foe({ name: '躲柜后' });
    covered.status.cover = Engine.CombatEngine.normalizeCover('soft'); // armor 2, hp 8
    const exposed = foe({ name: '站在路中' });
    const written = {};

    const res = Engine.CombatEngine.resolveSweepFire(shooter, [covered, exposed], weapon, 4, 'auto', {
        preRolledAttack: hitAll,
        preRolledDodges: { '躲柜后': dodgeFail, '站在路中': dodgeFail },
        onCoverUpdate: (next, soak, who) => { written[who.name] = next; }
    });
    const c = res.perTarget.find((p) => p.name === '躲柜后');
    const e = res.perTarget.find((p) => p.name === '站在路中');
    assert.equal(c.hits, 2);
    assert.equal(e.hits, 2);
    assert.equal(c.coverSoaked, 8, 'soft cover absorbs 6 then its last 2 points');
    assert.equal(c.damage, 4, 'the round that broke the cover partly gets through');
    assert.equal(e.coverSoaked, 0);
    assert.equal(e.damage, 16, 'the exposed target takes full rounds');
    assert.equal(written['躲柜后'], null, 'a destroyed cover is reported as gone');
}

// --- 4. deprivation must reach attack rolls (they skip checkSkill status mods) ---
{
    const starving = {
        name: '饿汉', skills: { '手枪': 60 }, derived: { db: '0' },
        status: { hunger: { stage: 2, penaltyDice: 1 } }
    };
    const sit = Engine.SituationalEngine.resolve({
        attacker: starving,
        defender: foe({ name: '靶' }),
        weapon: { type: 'firearm', damage: '1D10', skill: '手枪' },
        ranged: true
    });
    assert.ok((sit.penaltyDice || 0) >= 1, 'a starving shooter takes a penalty die');
    assert.ok(sit.notes.some((n) => n.includes('饥饿')), 'and the reason is reported');
}

// --- 5. burst passes skipStatusMods through, so mods are not counted twice ---
{
    const target = foe({ name: '靶' });
    const realCheck = Engine.checkSkill;
    let seen = null;
    Engine.checkSkill = (skill, char, diff, opts) => {
        if (seen === null) seen = opts || {};
        return { success: false, level: '失败', rolledValue: 99, targetValue: 50 };
    };
    try {
        Engine.CombatEngine.resolveBurstFire(shooter, target, weapon, 3, 'burst', {
            penaltyDice: 2, skipStatusMods: true, preRolledDefense: dodgeFail
        });
    } finally {
        Engine.checkSkill = realCheck;
    }
    assert.equal(seen.skipStatusMods, true, 'caller-supplied status mods must not be re-applied');
    assert.equal(seen.penaltyDice, 2, 'caller penalty dice reach the attack roll');
}

// --- 6. advance_time: weeks/months must also reset the daily SAN budget and tick hours ---
{
    const c = {
        name: '守夜人', hp: 10, maxHp: 10, sanity: 40,
        derived: { hp: 10, maxHp: 10, sanity: 40, maxSan: 60 },
        attrs: { CON: 60, POW: 60, INT: 60 }, skills: {}, status: {},
        insanity: {
            tempInsane: true, tempHoursLeft: 6, indefInsane: false,
            phobias: [], manias: [], dailyLoss: 9, history: []
        }
    };
    const gameState = { roster: [c], chatHistory: [], inventory: [] };
    const handlers = CoCToolHandlers.create({
        gameState,
        addJournalEntry() {}, addNpc() {}, updateNpcStatus() {}, startCombat() {}, endCombat() {},
        updateEnemy() {}, advanceTurn() {}, createMap() {}, updateRoom() {}, setPosition() {},
        addClue() {}, linkClues() {}, markClueStatus() {}, rollCustomDice() {}, groupRoll() {}
    }, Engine);

    handlers.advance_time({ months: 1 });
    assert.equal(c.insanity.dailyLoss, 0, 'downtime measured in months clears the daily SAN-loss budget');
    assert.equal(c.insanity.tempInsane, false, 'and a 6-hour temporary insanity has long expired');
}

console.log('bugfix_round21_smoke: OK');
