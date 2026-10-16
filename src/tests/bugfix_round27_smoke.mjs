/**
 * Round-27 bugfix smoke:
 * social opposed uses a dice panel and floor bands for the NPC;
 * drowning after CON/2 is a CON check for 1D6;
 * EDU improvement rolls against EDU (not EDU×5);
 * mythos-item pickup must request a SAN check, not silent 1D3.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { resolvePendingRuleCheck } from '../js/state/rule_check.mjs';
import { KpExecutionEngine } from '../js/campaign/kp_execution_engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const Engine = buildCoCEngine();

function makeChar(over = {}) {
    return Object.assign({
        name: '甲',
        attrs: { STR: 50, CON: 40, SIZ: 50, DEX: 50, POW: 60, INT: 60, EDU: 60, LUCK: 50 },
        skills: { '说服': 70, '体质': 40 },
        derived: { hp: 10, maxHp: 10, sanity: 55, maxSan: 99 },
        hp: 10,
        sanity: 55,
        status: {},
        isActive: true
    }, over);
}

// --- 1. source contracts ---
{
    const social = readFileSync(join(root, 'js/engines/social.mjs'), 'utf8');
    assert.ok(social.includes('Math.floor(skillValue / 5)'), 'NPC social bands must floor like checkSkill');
    assert.equal(social.includes('skillValue * 0.2'), false);

    const sys = readFileSync(join(root, 'js/tools/handlers/system.mjs'), 'utf8');
    assert.ok(sys.includes("kind: 'social_opposed'"), 'social_opposed must open a dice panel');
    assert.ok(sys.includes("kind: 'drown_con'"), 'past-hold drowning must open a CON panel');

    const inv = readFileSync(join(root, 'js/tools/handlers/inventory.mjs'), 'utf8');
    assert.ok(inv.includes("kind: 'san'"), 'mythos items must request a SAN check');
    assert.equal(inv.includes("parseDice('1D3')"), false, 'must not silently apply 1D3');

    const grow = readFileSync(join(root, 'js/state/gameplay.mjs'), 'utf8');
    assert.equal(grow.includes('edu * 5'), false, '7e EDU is already a percentile');
    assert.ok(grow.includes('if (roll > edu)'), 'EDU improvement is roll-over-EDU');
}

// --- 2. NPC social: skill 49 / roll 10 is Hard, not Extreme ---
{
    const actor = makeChar({ name: '说客', skills: { '说服': 70 } });
    const npc = { name: '警官', skills: { '心理学': 49 }, social: {} };
    Engine._setTestRolls([10]);
    const res = Engine.resolveSocial(actor, npc, 'persuade', {
        preRolledActor: { success: true, level: '成功', rolledValue: 40, targetValue: 70 }
    });
    Engine._clearTestRolls();
    assert.equal(res.npcLevel, '困难成功', '49×0.2=9.8 must not promote 10 to extreme');
}

// --- 3. social_opposed handler pauses; settle uses the player roll ---
{
    const gs = {
        roster: [makeChar()],
        npcRegistry: [{ name: '乙', skills: { '心理学': 20 } }],
        chatHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const h = system({ gameState: gs, Engine, addJournalEntry() {} });
    const pause = h.social_opposed({ actor_name: '甲', npc_name: '乙', kind: 'persuade' });
    assert.equal(typeof pause, 'object');
    assert.equal(gs.pendingRuleCheck.kind, 'social_opposed');
    assert.equal(pause.forceCheck.skill, '说服');
    Engine._setTestRolls([90]);
    const settled = resolvePendingRuleCheck(gs, {
        charName: '甲', skill: '说服', success: true, level: '成功',
        rolledValue: 20, targetValue: 70, skillValue: 70, ruleKind: 'social_opposed'
    }, Engine);
    Engine._clearTestRolls();
    assert.ok(settled, settled);
}

// --- 4. drowning: hold then CON; fail is 1D6 ---
{
    const ch = makeChar({ name: '溺者', hp: 12, derived: { hp: 12, maxHp: 12 } });
    Engine.applyCondition(ch, 'drowning', { roundsHeld: 0 });
    let last = null;
    for (let i = 0; i < 20; i++) last = Engine.ConditionsEngine.tickDrowning(ch);
    assert.equal(last.note, '闭气中');
    const need = Engine.ConditionsEngine.tickDrowning(ch);
    assert.equal(need.needsConCheck, true);
    assert.equal(need.damage, 0, 'the CON check must happen before damage');

    const gs = {
        roster: [makeChar({ name: '溺者', hp: 12, derived: { hp: 12, maxHp: 12 }, attrs: { CON: 40 } })],
        chatHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const h = system({ gameState: gs, Engine, addJournalEntry() {}, dispatch() { return 'ok'; } });
    const hold = h.apply_environmental_damage({ target_name: '溺者', type: 'drowning', value: 10 });
    assert.equal(typeof hold, 'string');
    assert.ok(/屏息/.test(hold));
    const drownPause = h.apply_environmental_damage({ target_name: '溺者', type: 'drowning', value: 25 });
    assert.equal(typeof drownPause, 'object');
    assert.equal(gs.pendingRuleCheck.kind, 'drown_con');

    Engine._setTestRolls([1]);
    const before = gs.roster[0].hp;
    resolvePendingRuleCheck(gs, {
        charName: '溺者', skill: '体质', success: false, level: '失败',
        rolledValue: 90, targetValue: 40, skillValue: 40, ruleKind: 'drown_con'
    }, Engine);
    Engine._clearTestRolls();
    assert.ok(gs.roster[0].hp < before, 'a failed drowning CON check deals 1D6');
}

// --- 5. mythos item contract: SAN check notation, not flat 1D3 ---
{
    const myth = KpExecutionEngine.checkMythosItem('死灵之书残页');
    assert.equal(myth.isMythos, true);
    assert.equal(myth.requiresSanCheck, true);
    assert.equal(myth.sanLoss, '1/1D6');
}

console.log('bugfix_round27_smoke: ok');
