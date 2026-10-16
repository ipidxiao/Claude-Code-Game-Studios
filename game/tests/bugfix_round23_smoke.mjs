/**
 * Round-23 bugfix smoke (real modules):
 * online pending exchange must write onWin/onLose after the dice panel;
 * burst fire must honor a harder range-band difficulty;
 * split-party choices must remap next via branchByClueQuality.
 */
import { strict as assert } from 'node:assert';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { system } from '../js/tools/handlers/system.mjs';
import { resolvePendingRuleCheck } from '../js/state/rule_check.mjs';
import { startChoiceSession, applyCharChoice } from '../js/campaign/group_check.mjs';

const Engine = buildCoCEngine();

function makeChar(name, over = {}) {
    return Object.assign({
        name,
        attrs: { STR: 50, CON: 50, SIZ: 50, DEX: 50, POW: 50, INT: 60, EDU: 60, LUCK: 50 },
        skills: { '斗殴': 70, '冲锋枪': 70, '闪避': 20 },
        derived: { hp: 12, maxHp: 12, sanity: 55, maxSan: 55, mp: 10, mov: 8, db: '0' },
        hp: 12, maxHp: 12, status: {}, equipment: {}, isActive: true
    }, over);
}

// --- 1. online pending exchange writes onWin after the player roll ---
{
    const gs = {
        roster: [makeChar('Bob')],
        inventory: [], chatHistory: [], journalLog: [],
        knownLocations: [], atmosphere: {},
        scenarioRunner: { active: false, flags: {} },
        combat: { active: false, enemies: [], initiativeOrder: [], currentTurnIdx: 0 },
        chase: { active: false, participants: [] },
        pendingRuleCheck: null, pendingRuleChecks: []
    };
    const sys = system({ gameState: gs, Engine, addJournalEntry: () => {} });
    const out = sys.apply_scenario_effects({
        combat: {
            creatureId: 'cultist', pendingRoll: true, attacker: 'pc',
            onWin: 'scene_win', onLose: 'scene_lose'
        },
        target_name: 'Bob'
    });
    assert.ok(out.forceCheck, 'pending exchange still opens a dice panel');
    assert.ok(gs.pendingRuleCheck.scenarioCombatCfg, 'spec must carry the scenario cfg');
    assert.equal(gs.scenarioRunner.flags.scene_win, undefined, 'flags stay unset until the roll');

    Engine._clearTestRolls && Engine._clearTestRolls();
    Engine._setTestRolls && Engine._setTestRolls([99]);
    resolvePendingRuleCheck(gs, {
        skill: gs.pendingRuleCheck.skill,
        charName: 'Bob',
        success: true,
        level: '成功',
        rolledValue: 10,
        targetValue: 70,
        kind: 'combat_attack'
    }, Engine);
    Engine._clearTestRolls && Engine._clearTestRolls();
    assert.equal(gs.scenarioRunner.flags.scene_win, true, 'a successful exchange must set onWin');
    assert.ok(!gs.scenarioRunner.flags.scene_lose, 'onLose stays unset on a win');
}

// --- 2. burst range-band difficulty is merged with the autofire table ---
{
    const shooter = makeChar('射手');
    const target = {
        name: '靶', isEnemy: true, hp: 20, maxHp: 20, armor: 0,
        skills: { '闪避': 5 }, status: {}
    };
    const weapon = { name: '汤姆逊', type: 'firearm', skill: '冲锋枪', damage: '1', malfunction: 100 };
    const res = Engine.CombatEngine.resolveBurstFire(shooter, target, weapon, 3, 'burst', {
        difficulty: 'extreme',
        preRolledAttack: { success: true, level: '极难成功', rolledValue: 5, targetValue: 70 },
        preRolledDefense: { success: false, level: '失败', rolledValue: 99, targetValue: 5 }
    });
    assert.equal(res.difficulty, 'extreme', 'long/extreme range must not be flattened by burst-hard');
}

// --- 3. split-party applyCharChoice remaps next from evidence quality ---
{
    const gs = {
        roster: [makeChar('甲'), makeChar('乙')],
        clueBoard: { clues: [{ id: 'c1', quality: 'decisive' }], links: [] },
        groupCheckSession: null, chatHistory: []
    };
    const choice = {
        id: 'caught', label: '被追上', next: 'melee_end',
        branchByClueQuality: {
            decisive: 'ending_win',
            weak: { next: 'melee_end', effects: { flags: { second_pursuer: true } } }
        }
    };
    const started = startChoiceSession(gs, { scenarioChoices: [choice], nodeId: 'caught' });
    assert.equal(started, true);
    const applied = applyCharChoice(gs, choice, { applyEffects: () => {} });
    assert.equal(applied, true);
    const pick = gs.groupCheckSession.picks[0];
    assert.equal(pick.option.next, 'ending_win', 'decisive evidence must reroute the split-party dest');
}

console.log('bugfix_round23_smoke: OK');
