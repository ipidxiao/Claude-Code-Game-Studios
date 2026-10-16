/**
 * Round-28: investigator-facing silent rolls open a dice panel.
 * KP tables / NPC dice stay on the engine.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { dice } from '../js/tools/handlers/dice.mjs';
import { mythos } from '../js/tools/handlers/mythos.mjs';
import { resolvePendingRuleCheck } from '../js/state/rule_check.mjs';
import { CoCStudyState } from '../js/data/mythos_tomes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const Engine = buildCoCEngine();

function makeChar(over = {}) {
    return Object.assign({
        name: '甲',
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 70, INT: 60, EDU: 60, LUCK: 40 },
        skills: { '聆听': 60, '侦查': 50, '斗殴': 55, '意志': 70, '运气': 40 },
        derived: { hp: 10, maxHp: 10, sanity: 55, maxSan: 99, mp: 20 },
        hp: 10,
        sanity: 55,
        status: {},
        isActive: true
    }, over);
}

function emptyGs(over = {}) {
    return Object.assign({
        roster: [makeChar()],
        chatHistory: [],
        combat: { active: false, enemies: [] },
        pendingRuleCheck: null,
        pendingRuleChecks: []
    }, over);
}

// --- 1. source contracts ---
{
    const sys = readFileSync(join(root, 'js/tools/handlers/system.mjs'), 'utf8');
    assert.ok(sys.includes("kind: 'bonus_penalty'"), 'bonus_penalty_roll must open a dice panel');
    assert.ok(sys.includes("kind: 'luck_recover'"), 'recover_luck without amount must open a Luck panel');
    assert.equal(/checkSkill\(skillName,\s*c/.test(sys), false, 'bonus_penalty_roll must not silent-check');

    const diceSrc = readFileSync(join(root, 'js/tools/handlers/dice.mjs'), 'utf8');
    assert.ok(diceSrc.includes("kind: 'opposed_roll'"));
    assert.ok(diceSrc.includes("kind: 'group_skill'"));

    const myth = readFileSync(join(root, 'js/tools/handlers/mythos.mjs'), 'utf8');
    assert.ok(myth.includes("kind: 'spell_pow'"), 'damage/curse/summon POW oppose must pause');

    const therapy = readFileSync(join(root, 'js/tools/handlers/character.mjs'), 'utf8');
    assert.ok(therapy.includes('applyAsylumMonth'), 'asylum monthly table stays engine-side');
}

// --- 2. bonus_penalty_roll pauses with bonus/penalty on the spec ---
{
    const gs = emptyGs();
    const h = system({ gameState: gs, Engine, addJournalEntry() {} });
    const pause = h.bonus_penalty_roll({
        target_name: '甲', skill_name: '聆听', bonus_dice: 1, penalty_dice: 0
    });
    assert.equal(typeof pause, 'object');
    assert.equal(gs.pendingRuleCheck.kind, 'bonus_penalty');
    assert.equal(pause.forceCheck.skill, '聆听');
    assert.equal(pause.forceCheck.bonusDice, 1);
    const settled = resolvePendingRuleCheck(gs, {
        charName: '甲', skill: '聆听', success: true, level: '成功',
        rolledValue: 20, targetValue: 60, skillValue: 60, ruleKind: 'bonus_penalty'
    }, Engine);
    assert.ok(/聆听/.test(settled), settled);
}

// --- 3. recover_luck: amount stays a grant; omit amount → Luck panel ---
{
    const gs = emptyGs();
    const h = system({ gameState: gs, Engine, addJournalEntry() {} });
    const grant = h.recover_luck({ target_name: '甲', amount: 2 });
    assert.equal(typeof grant, 'string');
    assert.ok(/运气/.test(grant));

    const pause = h.recover_luck({ target_name: '甲' });
    assert.equal(gs.pendingRuleCheck.kind, 'luck_recover');
    const before = gs.roster[0].attrs.LUCK;
    const noGain = resolvePendingRuleCheck(gs, {
        charName: '甲', skill: '运气', success: true, level: '成功',
        rolledValue: 10, targetValue: 40, skillValue: 40, ruleKind: 'luck_recover'
    }, Engine);
    assert.equal(gs.roster[0].attrs.LUCK, before, 'a successful Luck roll does not recover');
    assert.ok(/不恢复/.test(noGain), noGain);

    gs.pendingRuleCheck = null;
    h.recover_luck({ target_name: '甲' });
    resolvePendingRuleCheck(gs, {
        charName: '甲', skill: '运气', success: false, level: '失败',
        rolledValue: 90, targetValue: 40, skillValue: 40, ruleKind: 'luck_recover'
    }, Engine);
    assert.ok(gs.roster[0].attrs.LUCK > before, 'a failed Luck roll recovers 1D10');
}

// --- 4. group_roll queues each investigator ---
{
    const gs = emptyGs({
        roster: [makeChar({ name: '甲' }), makeChar({ name: '乙', isActive: true })]
    });
    const h = dice({ gameState: gs, Engine, rollCustomDice() { return {}; } });
    const pause = h.group_roll({ char_names: ['甲', '乙'], skill_name: '侦查' });
    assert.equal(gs.pendingRuleCheck.kind, 'group_skill');
    assert.equal(pause.forceCheck.skill, '侦查');
    assert.deepEqual(gs.pendingRuleCheck.groupQueue, ['乙']);
    resolvePendingRuleCheck(gs, {
        charName: '甲', skill: '侦查', success: true, level: '成功',
        rolledValue: 20, targetValue: 50, skillValue: 50, ruleKind: 'group_skill'
    }, Engine);
    assert.equal(gs.pendingRuleCheck.kind, 'group_skill');
    assert.equal(gs.pendingRuleCheck.roller, '乙');
    const last = resolvePendingRuleCheck(gs, {
        charName: '乙', skill: '侦查', success: false, level: '失败',
        rolledValue: 80, targetValue: 50, skillValue: 50, ruleKind: 'group_skill'
    }, Engine);
    assert.ok(/甲:成功/.test(last) && /乙:失败/.test(last), last);
}

// --- 5. cast_spell POW: caster panel, target stays engine-rolled ---
{
    const caster = makeChar({ name: '术士', skills: { '意志': 70, '克苏鲁神话': 15 } });
    CoCStudyState.initForChar(caster);
    CoCStudyState.learnSpell(caster, '枯萎术');
    const foe = { name: '敌', attrs: { POW: 40 }, derived: { hp: 12, maxHp: 12 }, isEnemy: true, hp: 12 };
    const gs = emptyGs({
        roster: [caster],
        combat: { active: true, enemies: [foe] }
    });
    const h = mythos({
        gameState: gs, Engine, addJournalEntry() {},
        updateEnemy(name, delta) { foe.hp += delta; }
    });
    const pause = h.cast_spell({ caster_name: '术士', spell_name: '枯萎术', target_name: '敌' });
    assert.equal(typeof pause, 'object');
    assert.equal(gs.pendingRuleCheck.kind, 'spell_pow');
    assert.equal(pause.forceCheck.skill, '意志');
    Engine._setTestRolls([90]);
    const settled = resolvePendingRuleCheck(gs, {
        charName: '术士', skill: '意志', success: true, level: '成功',
        rolledValue: 20, targetValue: 70, skillValue: 70, ruleKind: 'spell_pow'
    }, Engine);
    Engine._clearTestRolls();
    assert.ok(settled, settled);
}

console.log('bugfix_round28_smoke: ok');
