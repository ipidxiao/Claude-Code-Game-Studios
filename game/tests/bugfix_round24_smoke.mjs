/**
 * Round-24 bugfix smoke:
 * AI push_skill_check must not default difficulty to hard;
 * dice-panel rolls must honor pending skipStatusMods;
 * custom weapons survive save/load payload.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { recordSkillAttempt, canAttemptSkill } from '../js/engines/skill_attempt.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const Engine = buildCoCEngine();

// --- 1. processTools no longer hard-codes pushed difficulty ---
{
    const src = readFileSync(join(root, 'js/ai_logic.mjs'), 'utf8');
    assert.equal(src.includes("args.difficulty || 'hard'"), false,
        'push_skill_check must not default the original roll to hard');
    assert.ok(/if \(args\.difficulty\) tool\.difficulty = args\.difficulty/.test(src),
        'an explicit difficulty override is still accepted');
    assert.ok(/pendingRule\.skipStatusMods/.test(src),
        'executeSkillCheck must forward skipStatusMods onto the live roll');
    assert.ok(/typeof res\.success === 'boolean' \? res\.success/.test(src),
        'success must come from checkSkill, not raw roll vs full skill');
}

// --- 2. a recorded Regular failure stays Regular when pushed ---
{
    const gs = { skillAttempts: {}, currentLocation: '巷口', chatHistory: [] };
    recordSkillAttempt(gs, { charName: '甲', skill: '侦查', difficulty: 'normal' }, {
        success: false, level: '失败', rolledValue: 80
    });
    const gate = canAttemptSkill(gs, { charName: '甲', skill: '侦查', isPush: true });
    assert.equal(gate.ok, true);
    assert.equal(gate.difficulty, 'normal', 'the push repeats the original difficulty');
}

// --- 3. skipStatusMods: caller penalty is not stacked with hunger ---
{
    const starving = {
        name: '饿汉', skills: { '手枪': 60 },
        status: { hunger: { stage: 2, penaltyDice: 1 } }
    };
    let nets = [];
    const origPenalty = Engine.rollPenaltyDice;
    const origBonus = Engine.rollBonusDice;
    Engine.rollPenaltyDice = (n) => {
        nets.push(n);
        return 50;
    };
    Engine.rollBonusDice = (n) => {
        nets.push(-n);
        return 50;
    };
    Engine._setTestRolls([50, 50, 50, 50, 50, 50]);
    try {
        nets = [];
        Engine.checkSkill('手枪', starving, 'normal', { penaltyDice: 1, skipStatusMods: true });
        assert.deepEqual(nets, [1], 'status mods must not stack on a skipStatusMods attack roll');

        nets = [];
        Engine.checkSkill('手枪', Object.assign({}, starving, { status: { hunger: { penaltyDice: 1 } } }), 'normal', {
            penaltyDice: 1, skipStatusMods: false
        });
        assert.ok(nets[0] >= 2, 'without skipStatusMods hunger still adds a penalty die');
    } finally {
        Engine.rollPenaltyDice = origPenalty;
        Engine.rollBonusDice = origBonus;
        Engine._clearTestRolls();
    }
}

// --- 4. custom weapon payload is cloned into the save contract ---
{
    const persist = readFileSync(join(root, 'js/state/persistence.mjs'), 'utf8');
    assert.ok(persist.includes('customWeapons: safeJsonClone(gameState._customWeapons'),
        'save payload must include AI-registered custom weapons');
    assert.ok(persist.includes('gameState._customWeapons = (d.customWeapons'),
        'load must restore custom weapons');
}

console.log('bugfix_round24_smoke: OK');
