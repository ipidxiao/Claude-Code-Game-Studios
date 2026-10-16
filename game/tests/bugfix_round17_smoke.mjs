/**
 * Round-17 bugfix smoke (real modules):
 * major wound sets status.prone, attribute halving is one-time,
 * deprivation penalty dice reach checkSkill, burst/sweep respect armor,
 * capped SAN refund also rolls back dailyLoss.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';

const Engine = buildCoCEngine();

function makeChar(over = {}) {
    return Object.assign({
        name: 'Bob',
        attrs: { STR: 60, CON: 60, SIZ: 50, DEX: 60, POW: 50, INT: 60, EDU: 60, APP: 50, LUCK: 50 },
        skills: { '侦查': 80, '斗殴': 50, '闪避': 30 },
        derived: { hp: 12, maxHp: 12, sanity: 55, maxSan: 55, mp: 10, mov: 8, db: '0' },
        hp: 12,
        maxHp: 12,
        status: {},
        insanity: { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] }
    }, over);
}

// --- 1. major-wound knockdown must set the status flag combat actually reads ---
{
    const c = makeChar();
    Engine.MajorWoundEngine.applyMajorWound(c, { location: { consequences: ['倒地'] } });
    assert.equal(c.status.prone, true, 'knockdown must set status.prone');
    const stood = Engine.ConditionsEngine.standUp(c);
    assert.equal(stood.ok, true, 'standUp must see the prone flag');
}

// --- 2. attribute halving is a one-time location effect ---
{
    const c = makeChar();
    const wound = { location: { consequences: ['武器掉落', '力量减半'] } };
    Engine.MajorWoundEngine.applyMajorWound(c, wound);
    assert.equal(c.attrs.STR, 30);
    Engine.MajorWoundEngine.applyMajorWound(c, { location: { consequences: ['力量减半'] } });
    assert.equal(c.attrs.STR, 30, 'a second wound must not quarter STR');
}

// --- 3. hunger / thirst penalty dice must actually reach a skill check ---
{
    const c = makeChar();
    const before = Engine.SituationalEngine.resolveCheckModifiers('侦查', c);
    assert.equal(before.penaltyDice, 0);
    const applied = Engine.ConditionsEngine.apply(c, 'hunger', { daysWithout: 5 });
    assert.equal(applied.ok, true);
    const pen = Number(c.status.hunger.penaltyDice) || 0;
    assert.ok(pen > 0, 'test needs a hunger stage that carries a penalty');
    const after = Engine.SituationalEngine.resolveCheckModifiers('侦查', c);
    assert.equal(after.penaltyDice, pen, 'deprivation penalty must be reported');
    assert.ok(after.notes.includes('饥饿'));
}

// --- 4. burst / sweep must not ignore worn armor ---
{
    const shooter = makeChar({ skills: { '手枪': 90, '冲锋枪': 90, '闪避': 0 } });
    const weapon = { name: '冲锋枪', type: 'firearm', skill: '冲锋枪', damage: '1D10', capacity: 30 };
    const mkFoe = (armor) => ({
        name: '装甲怪', isEnemy: true, hp: 60, maxHp: 60, armor,
        attrs: { STR: 60, CON: 60, SIZ: 60, DEX: 10 },
        derived: { mov: 8, db: '0' }, skills: { '闪避': 0 }, status: {}
    });
    const pre = { success: true, level: '极难成功', rolledValue: 1, targetValue: 90, skillValue: 90 };
    const dodgeFail = { success: false, level: '失败', rolledValue: 99, targetValue: 0, skillValue: 0 };
    const bare = Engine.CombatEngine.resolveBurstFire(shooter, mkFoe(0), weapon, 3, 'burst', {
        preRolledAttack: pre, preRolledDefense: dodgeFail
    });
    const armored = Engine.CombatEngine.resolveBurstFire(shooter, mkFoe(20), weapon, 3, 'burst', {
        preRolledAttack: pre, preRolledDefense: dodgeFail
    });
    assert.equal(bare.hits, 3);
    assert.equal(armored.hits, 3);
    assert.ok(armored.totalDamage < bare.totalDamage, 'armor must reduce burst damage');
    assert.equal(armored.totalDamage, 0, '20 armor must fully soak 1D10 rounds');

    const sweepArmored = Engine.CombatEngine.resolveSweepFire(
        shooter, [mkFoe(20)], weapon, 4, 'auto',
        { preRolledAttack: pre, preRolledDodges: { '装甲怪': dodgeFail } }
    );
    assert.equal(sweepArmored.totalDamage, 0, 'sweep must respect armor too');
}

// --- 5. capped SAN refund must also roll back dailyLoss ---
{
    const gs = { sanCaps: {} };
    const c = makeChar();
    // Budget for this entity is the max of the fail dice (flat 6 -> 6), so the
    // second failure is fully refunded.
    Engine.SanityEngine.applyCappedSanLoss(gs, c, '深潜者', '0/6', false, { rolledValue: 80, targetValue: 50 });
    Engine.SanityEngine.applyCappedSanLoss(gs, c, '深潜者', '0/6', false, { rolledValue: 80, targetValue: 50 });
    const actualLost = 55 - c.derived.sanity;
    assert.equal(gs.sanCaps['深潜者'], 0, 'cap budget must be spent');
    assert.equal(c.insanity.dailyLoss, actualLost, 'dailyLoss must match the SAN actually lost');
    const histSum = c.insanity.history.reduce((n, h) => n + (Number(h.loss) || 0), 0);
    assert.equal(histSum, actualLost, 'history must match the SAN actually lost');
}

// --- 6/7. scenario runner: ambiguous text input + manual replay voids an open check ---
{
    const scenario = {
        id: 't', title: 'T',
        nodes: { n1: { narrative: '房间里有两处可查。', choices: [{ id: 'a', label: '查看笔记' }, { id: 'b', label: '查看抽屉' }] } }
    };
    const gameState = {
        chatHistory: [],
        roster: [makeChar({ isActive: true })],
        inventory: [],
        clueBoard: { clues: [], links: [] },
        scenarioRunner: null
    };
    const State = {
        gameState,
        scrollToBottom: () => {},
        addJournalEntry: () => {},
        addClue: () => null,
        createMap: () => {},
        setPosition: () => {},
        addNpc: () => {},
        playerInput: { value: '' }
    };
    const scenarioStore = {
        getScenario: () => scenario,
        isAvailable: () => true,
        validate: () => ({ ok: true, errors: [] })
    };
    const prevWindow = globalThis.window;
    globalThis.window = {
        CoCStateAccessor: { getState: () => State },
        CoCEngine: Engine
    };
    let CoCScenarioRunner = null;
    try {
        ({ CoCScenarioRunner } = await import('../js/scenario/runner.mjs'));
        CoCScenarioRunner.bindScenarioStore(scenarioStore);
        const r = CoCScenarioRunner.ensureRunner();
        r.active = true;
        r.scenarioId = 't';
        r.currentNodeId = 'n1';
        r.choices = [{ id: 'a', label: '查看笔记' }, { id: 'b', label: '查看抽屉' }];

        // Ambiguous "查" matches both labels — must not silently pick one.
        CoCScenarioRunner.handleInput('查');
        assert.equal(r.choices.length, 2, 'ambiguous input must leave choices untouched');
        const last = gameState.chatHistory[gameState.chatHistory.length - 1];
        assert.ok(String(last.content).includes('请从下方选项中选择行动'), 'ambiguous input must ask again');

        // An exact label still resolves.
        CoCScenarioRunner.handleInput('查看抽屉');
        assert.equal(r.choices.length, 0, 'exact label must select the choice');

        // A manual replay while a dice panel is open voids that panel instead of stacking branches.
        const openMsg = {
            role: 'assistant',
            content: '请进行【侦查】检定。',
            _scenarioCheck: true,
            isResolved: false,
            tool_calls: [{
                id: 'scenario_check_test',
                type: 'function',
                function: { name: 'request_skill_check', arguments: '{}' },
                isResolved: false
            }]
        };
        gameState.chatHistory.push(openMsg);
        r.pendingBranch = { nextNode: 'n1', skill: '侦查' };
        CoCScenarioRunner.replayCurrentChoices();
        assert.equal(openMsg.tool_calls[0].isResolved, true, 'stale panel must be voided');
        assert.equal(r.pendingBranch, null, 'stale pendingBranch must be cleared');
        assert.ok(r.choices.length >= 1, 'choices must be restored');
    } finally {
        if (CoCScenarioRunner) CoCScenarioRunner.bindScenarioStore(null);
        if (prevWindow === undefined) delete globalThis.window;
        else globalThis.window = prevWindow;
    }
}

console.log('bugfix_round17_smoke: OK');
