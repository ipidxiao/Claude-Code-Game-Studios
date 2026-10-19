/**
 * Round-25 bugfix smoke:
 * group/opposed rolls must use checkSkill (7e fumble + floor bands);
 * luck _levelFromRoll matches checkSkill floors;
 * local scenario sanCheck defers to the dice panel.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { applyScenarioEffects } from '../js/scenario/effects_apply.mjs';
import { enqueueRuleCheck, resolvePendingRuleCheck } from '../js/state/rule_check.mjs';
import { dice } from '../js/tools/handlers/dice.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const Engine = buildCoCEngine();

function makeChar(over = {}) {
    return Object.assign({
        name: '甲',
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 60, INT: 60, LUCK: 50 },
        skills: { '斗殴': 60, '侦查': 40 },
        derived: { hp: 10, maxHp: 10, sanity: 60, maxSan: 99, mp: 12 },
        sanity: 60,
        status: {},
        isActive: true
    }, over);
}

// --- 1. source contracts ---
{
    const gameplay = readFileSync(join(root, 'js/state/gameplay.mjs'), 'utf8');
    assert.ok(gameplay.includes('engine.checkSkill(skillName, c, \'normal\')'),
        'groupRoll must settle through checkSkill');
    assert.equal(gameplay.includes('skillVal < 50 ? 96 : 100'), false,
        'groupRoll must not invert the 7e fumble threshold');

    const diceHandler = readFileSync(join(root, 'js/tools/handlers/dice.mjs'), 'utf8');
    assert.ok(diceHandler.includes("kind: 'opposed_roll'"),
        'opposed_roll must open a dice panel for the investigator');
    assert.equal(diceHandler.includes('Math.random() * 100'), false,
        'opposed_roll must not roll a raw d100 outside checkSkill');
    const ruleCheck = readFileSync(join(root, 'js/state/rule_check.mjs'), 'utf8');
    assert.ok(ruleCheck.includes('skipStatusMods: true'),
        'opposed_roll opponent dummy must skip investigator status mods');

    const runner = readFileSync(join(root, 'js/scenario/runner.mjs'), 'utf8');
    assert.ok(runner.includes('deferSanCheck: true'),
        'local runner must not silent-roll node sanCheck');
    assert.ok(runner.includes('enqueueRuleCheck'),
        'local runner must enqueue a SAN dice panel');

    const diceEngine = readFileSync(join(root, 'js/engines/dice.mjs'), 'utf8');
    assert.ok(diceEngine.includes('roll <= Math.floor(skillValue / 5)'),
        'luck _levelFromRoll must use floor(skill/5) like checkSkill');
}

// --- 2. 7e fumble: skill <50 only 100; skill >=50 is 96–100 ---
{
    Engine._setTestRolls([97]);
    const low = Engine.checkSkill('侦查', makeChar({ skills: { '侦查': 40 } }), 'normal', { skipStatusMods: true });
    assert.equal(low.level, '失败', 'skill 40 / roll 97 is a regular failure, not a fumble');

    Engine._setTestRolls([97]);
    const high = Engine.checkSkill('斗殴', makeChar({ skills: { '斗殴': 60 } }), 'normal', { skipStatusMods: true });
    assert.equal(high.level, '大失败', 'skill 60 / roll 97 is a fumble');

    Engine._setTestRolls([100]);
    const lowFumble = Engine.checkSkill('侦查', makeChar({ skills: { '侦查': 40 } }), 'normal', { skipStatusMods: true });
    assert.equal(lowFumble.level, '大失败', 'skill 40 still fumbles on 100');
    Engine._clearTestRolls();
}

// --- 3. _levelFromRoll bands match checkSkill floors ---
{
    assert.equal(Engine._levelFromRoll(10, 49), '困难成功', '49×0.2=9.8 must not promote roll 10 to extreme');
    assert.equal(Engine._levelFromRoll(9, 49), '极难成功');
    assert.equal(Engine._levelFromRoll(97, 40), '失败');
    assert.equal(Engine._levelFromRoll(100, 40), '大失败');
    assert.equal(Engine._levelFromRoll(96, 50), '大失败');
}

// --- 4. opposed_roll consumes the test queue via checkSkill ---
{
    const gs = {
        roster: [makeChar()],
        chatHistory: [],
        diceHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const h = dice({
        gameState: gs,
        Engine,
        rollCustomDice: () => ({})
    });
    const out = h.opposed_roll({
        char_name: '甲',
        char_skill: '斗殴',
        opponent_name: '乙',
        opponent_value: 50,
        label: '扭打'
    });
    assert.equal(typeof out, 'object');
    assert.equal(gs.pendingRuleCheck.kind, 'opposed_roll');
    Engine._setTestRolls([90]);
    const settled = resolvePendingRuleCheck(gs, {
        charName: '甲', skill: '斗殴', success: true, level: '成功',
        rolledValue: 10, targetValue: 60, skillValue: 60, ruleKind: 'opposed_roll'
    }, Engine);
    Engine._clearTestRolls();
    assert.ok(String(settled).includes('甲'), settled);
    assert.ok(gs.chatHistory.some((m) => /对抗/.test(m.content) && /甲/.test(m.content)));
}

// --- 5. local sanCheck defers; dice panel then applies fail loss ---
{
    const gs = {
        roster: [makeChar({ name: 'Alice' })],
        inventory: [],
        chatHistory: [],
        scenarioRunner: { flags: {} },
        clueBoard: { clues: [] },
        combat: { enemies: [] },
        pendingRuleCheck: null,
        pendingRuleChecks: []
    };
    const before = gs.roster[0].derived.sanity;
    const ctx = {
        gameState: gs,
        Engine,
        deferSanCheck: true,
        pushSystem: () => {},
        addJournalEntry: () => {},
        ensureFlags: () => gs.scenarioRunner.flags
    };
    const pending = applyScenarioEffects(ctx, { sanCheck: '0/1D6' }, 'Alice');
    assert.equal(pending.san.pending, true);
    assert.equal(pending.san.notation, '0/1D6');
    assert.equal(gs.roster[0].derived.sanity, before, 'deferred SAN must not drop before the roll');

    enqueueRuleCheck(gs, {
        kind: 'san',
        skill: 'SAN',
        roller: pending.san.target,
        target: pending.san.target,
        notation: pending.san.notation,
        cause: pending.san.cause
    });
    assert.equal(gs.pendingRuleCheck.kind, 'san');

    Engine._setTestRolls([6]);
    resolvePendingRuleCheck(gs, {
        charName: 'Alice',
        skill: 'SAN',
        success: false,
        level: '失败',
        rolledValue: 99,
        targetValue: 60,
        skillValue: 60,
        ruleKind: 'san'
    }, Engine);
    Engine._clearTestRolls();
    assert.ok(gs.roster[0].derived.sanity < before, 'failed SAN check must apply the fail die');
}

console.log('bugfix_round25_smoke: ok');
