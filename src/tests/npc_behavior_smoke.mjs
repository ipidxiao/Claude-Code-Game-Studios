/**
 * NPC intent scores are deterministic. Heat and compromise change the roster.
 */
import assert from 'assert';
import { decideNpcIntent, decideCombatReaction, applyNpcBehavior, formatNpcBehaviorRules, buildNpcRosterPrompt, NPC_BEHAVIOR_RULES, buildNegotiateCheck, settleNegotiateFromSocial, canSocialInfiltrate, fillCombatEnemyFromRoster, runEnemyCombatTurn, applyCombatReaction, isActiveCombatEnemy } from '../js/engines/npc_behavior.mjs';
import { combat } from '../js/tools/handlers/combat.mjs';
import { chase } from '../js/tools/handlers/chase.mjs';
import { resolveEnemy } from '../js/tools/resolve.mjs';
import { addMythosHeat } from '../js/state/mythos_heat.mjs';
import { buildCoCEngine } from '../js/engines/index.mjs';
import { filterActiveInitiativeOrder, inferEnemyRanged, resolveAttackTarget } from '../js/components/combat_ui_helpers.mjs';
import { CoCAIPromptConfig } from '../js/data/ai_prompt_config.mjs';
import { CoCEngine } from '../js/coc.mjs';
import { enqueueRuleCheck, resolvePendingRuleCheck } from '../js/state/rule_check.mjs';
import { CoCStateGameplay } from '../js/state/gameplay.mjs';

const contact = { name: '老渔夫', relation: '线索来源', status: 'alive', notes: [] };
const quiet = decideNpcIntent(contact, { heat: 1, heatMissing: false });
assert.equal(quiet.intent, 'confide');

const leaving = decideNpcIntent(contact, { heat: 4, heatMissing: true });
assert.equal(leaving.intent, 'withdraw');

const hostile = decideNpcIntent({ name: '祭司', relation: '敌对', status: 'alive' }, { heat: 5, heatMissing: true });
assert.equal(hostile.intent, 'hold');

const allyQuiet = decideNpcIntent(
    { name: '玛莎', relation: '盟友', status: 'alive' },
    { heat: 1, heatMissing: false, socialWeight: 0.2 }
);
assert.equal(allyQuiet.intent, 'confide');

const allyPressed = decideNpcIntent(
    { name: '玛莎', relation: '盟友', status: 'alive' },
    { heat: 1, heatMissing: false, socialWeight: 0.7 }
);
assert.equal(allyPressed.intent, 'confide');

const allyHot = decideNpcIntent(
    { name: '玛莎', relation: '盟友', status: 'alive' },
    { heat: 4, heatMissing: false, socialWeight: 0.2 }
);
assert.equal(allyHot.intent, 'confide');

const suspect = decideNpcIntent(
    { name: '店员', relation: '可疑', status: 'alive' },
    { heat: 4, heatMissing: false, socialWeight: 0 }
);
assert.equal(suspect.intent, 'inform');

assert.equal(decideNpcIntent({ name: '甲', relation: '中立', status: 'dead' }, {}).intent, 'dead');
assert.equal(decideNpcIntent({ name: '乙', relation: '盟友', status: 'insane' }, {}).intent, 'rave');
assert.equal(decideNpcIntent({ name: '丙', relation: '线索来源', status: 'missing' }, {}).intent, 'absent');

assert.equal(decideCombatReaction({ name: '打手', hp: 10, maxHp: 10 }, { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }).reaction, 'attack');
assert.equal(decideCombatReaction({ name: '打手', hp: 5, maxHp: 10 }, { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }).reaction, 'flee');
assert.equal(decideCombatReaction({ name: '打手', hp: 2, maxHp: 10 }, { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }).reaction, 'flee');
assert.notEqual(decideCombatReaction(
    { name: '打手', hp: 6, maxHp: 10 },
    { currentTarget: '甲', otherEnemiesAlive: 0, investigators: [{ name: '甲', hp: 8 }] }
).reaction, 'help');
assert.equal(decideCombatReaction(
    { name: '打手', hp: 6, maxHp: 10, relation: '敌对' },
    { currentTarget: '甲', otherEnemiesAlive: 1, investigators: [{ name: '甲', hp: 8 }] }
).reaction, 'attack');
assert.equal(decideCombatReaction(
    { name: '店员', hp: 10, maxHp: 10, relation: '可疑' },
    { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }
).reaction, 'attack');
assert.equal(decideCombatReaction(
    { name: '店员', hp: 6, maxHp: 10, relation: '可疑' },
    { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }
).reaction, 'negotiate');
assert.equal(decideCombatReaction(
    { name: '店员', hp: 4, maxHp: 10, relation: '可疑' },
    { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }
).reaction, 'flee');
assert.equal(decideCombatReaction(
    { name: '店员', hp: 6, maxHp: 10, relation: '可疑', _npcNegotiated: true },
    { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }
).reaction, 'attack');
const switched = decideCombatReaction(
    { name: '打手', hp: 6, maxHp: 10 },
    { currentTarget: '甲', otherEnemiesAlive: 1, investigators: [{ name: '甲', hp: 9 }, { name: '乙', hp: 2 }] }
);
assert.equal(switched.reaction, 'switch');
assert.equal(switched.targetName, '乙');
assert.equal(decideCombatReaction(
    { name: '打手', hp: 6, maxHp: 10, relation: '敌对' },
    { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }, { name: '乙', hp: 8 }] }
).reaction, 'attack');
assert.equal(decideNpcIntent({ name: '路人', relation: '未知', status: 'alive' }, { heat: 5 }).intent, 'hold');
assert.equal(decideNpcIntent(
    { name: '线人', relation: '线索来源', status: 'alive', _kpCompromised: true },
    { heat: 4, heatMissing: true }
).intent, 'turn');

const turned = decideNpcIntent(
    { name: '玛莎', relation: '盟友', status: 'alive', _kpCompromised: true },
    { heat: 4, heatMissing: true }
);
assert.equal(turned.intent, 'turn');

const gs = {
    mythosHeat: 2,
    flags: {},
    chatHistory: [],
    scenarioRunner: { flags: {} },
    npcRegistry: [
        { id: 'a', name: '老渔夫', relation: '线索来源', status: 'alive', notes: [] },
        { id: 'b', name: '店主', relation: '中立', status: 'alive', notes: [] },
        { id: 'c', name: '打手', relation: '敌对', status: 'alive', notes: [] }
    ]
};
addMythosHeat(gs, 2, 'test');
assert.equal(gs.mythosHeat, 4);
assert.equal(gs.npcRegistry[0].status, 'missing');
assert.equal(gs.npcRegistry[0]._behaviorWithdrew, true);
assert.equal(gs.npcRegistry[1].status, 'alive');
assert.equal(gs.npcRegistry[1].behavior.intent, 'inform');
assert.equal(gs.npcRegistry[2].behavior.intent, 'hold');

applyNpcBehavior(gs);
assert.equal(gs.npcRegistry.filter((n) => n.status === 'missing').length, 1);
assert.equal(gs.npcRegistry[1]._behaviorInformed, true);

const exposed = {
    mythosHeat: 4,
    flags: { heat_missing_contact: true },
    chatHistory: [],
    npcRegistry: [
        { id: 'a', name: '老渔夫', relation: '线索来源', status: 'alive', notes: [] },
        { id: 'b', name: '记者', relation: '线索来源', status: 'alive', notes: [{ text: '夜访' }, { text: '名册' }] }
    ]
};
applyNpcBehavior(exposed);
assert.equal(exposed.npcRegistry[0].status, 'alive');
assert.equal(exposed.npcRegistry[0].behavior.intent, 'confide');
assert.equal(exposed.npcRegistry[1].status, 'missing');

const tied = {
    mythosHeat: 4,
    flags: { heat_missing_contact: true },
    chatHistory: [],
    npcRegistry: [
        { name: '阿明', relation: '线索来源', status: 'alive', notes: [{ text: 'a' }], firstSeenAt: '2026-10-11T18:00:00.000Z' },
        { name: '赵六', relation: '线索来源', status: 'alive', notes: [{ text: 'b' }], firstSeenAt: '2026-10-11T08:00:00.000Z' }
    ]
};
applyNpcBehavior(tied);
assert.equal(tied.npcRegistry[0].status, 'alive');
assert.equal(tied.npcRegistry[1].status, 'missing');

const pressed = {
    mythosHeat: 1,
    flags: {},
    chatHistory: [],
    kpEngine: { enabled: true, global: { knowledgeLevel: 6 } },
    npcRegistry: [{ name: '玛莎', relation: '盟友', status: 'alive', notes: [] }]
};
applyNpcBehavior(pressed);
assert.equal(pressed.npcRegistry[0].behavior.intent, 'confide');
assert.equal(!!pressed.npcRegistry[0]._kpCompromised, false);

const stayAndTurn = {
    mythosHeat: 4,
    flags: { heat_missing_contact: true },
    chatHistory: [],
    kpEngine: { enabled: true, global: { knowledgeLevel: 6 } },
    npcRegistry: [{ name: '老渔夫', relation: '线索来源', status: 'alive', notes: [{ text: '码头' }] }]
};
applyNpcBehavior(stayAndTurn);
assert.equal(stayAndTurn.npcRegistry[0].status, 'missing');
assert.equal(stayAndTurn.npcRegistry[0].behavior.intent, 'withdraw');

assert.equal(canSocialInfiltrate({ name: '玛莎', relation: '盟友', status: 'alive' }), true);
assert.equal(canSocialInfiltrate({ name: '老渔夫', relation: '线索来源', status: 'alive' }), true);
assert.equal(canSocialInfiltrate({ name: '线人', relation: '联络', status: 'alive' }), false);
assert.equal(canSocialInfiltrate({ name: '密探', relation: 'informant', status: 'alive' }), false);
assert.equal(canSocialInfiltrate({ name: '店员', relation: '中立', status: 'alive' }), false);
assert.equal(canSocialInfiltrate({ name: '玛莎', relation: '盟友', status: 'alive', _kpCompromised: true }), false);

const filled = fillCombatEnemyFromRoster({ name: '店员', hp: 10 }, [{ name: '店员', relation: '可疑' }]);
assert.equal(filled.maxHp, 10);
assert.equal(filled.relation, '可疑');
const kept = fillCombatEnemyFromRoster({ name: '店员', hp: 5, maxHp: 10, relation: '中立' }, [{ name: '店员', relation: '可疑' }]);
assert.equal(kept.maxHp, 10);
assert.equal(kept.relation, '中立');
assert.equal(decideCombatReaction(fillCombatEnemyFromRoster({ name: '打手', hp: 5 }, []), { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }).reaction, 'attack');
const hurt = fillCombatEnemyFromRoster({ name: '店员', hp: 5, maxHp: 10 }, [{ name: '店员', relation: '可疑' }]);
assert.equal(decideCombatReaction(hurt, { currentTarget: '甲', investigators: [{ name: '甲', hp: 8 }] }).reaction, 'flee');

const order = filterActiveInitiativeOrder(
    [{ id: 'e1', name: '打手', isEnemy: true }, { id: 'e2', name: '祭司', isEnemy: true }, { id: 'e3', name: '尸体', isEnemy: true }],
    [{ id: 'e1', name: '打手', hp: 2, _npcFled: true }, { id: 'e2', name: '祭司', hp: 8 }, { id: 'e3', name: '尸体', hp: 0, isDefeated: false }],
    []
);
assert.equal(order.length, 1);
assert.equal(order[0].name, '祭司');

const engine = buildCoCEngine();
assert.equal(typeof engine.NpcBehavior.decideCombatReaction, 'function');
assert.equal(engine.NpcBehavior.RULES.infiltrationWeight, 0.6);
assert.match(formatNpcBehaviorRules(), /social_opposed/);
assert.match(formatNpcBehaviorRules(), /npcId/);
assert.match(formatNpcBehaviorRules(), /满血先打/);

const fledNamed = resolveEnemy(
    [{ name: '打手', hp: 2, maxHp: 10, _npcFled: true }],
    '打手',
    { required: true, preferLiving: true }
);
assert.equal(fledNamed.ok, false);

const fleeGs = {
    roster: [{ name: '甲', isActive: true, hp: 10, derived: { hp: 10 } }],
    npcRegistry: [{ name: '打手', relation: '敌对', status: 'alive' }],
    combat: { active: true, round: 1, currentTurnIdx: 0, enemies: [{ name: '打手', hp: 2, maxHp: 10, relation: '敌对' }] },
    chatHistory: []
};
const fleeTurn = runEnemyCombatTurn(fleeGs, fleeGs.combat.enemies[0], '甲');
assert.equal(fleeTurn.outcome, 'flee');
assert.equal(fleeGs.npcRegistry[0].status, 'missing');
assert.equal(fleeGs.npcRegistry[0].behavior.intent, 'absent');

applyCombatReaction(fleeGs, fleeGs.combat.enemies[0], { reaction: 'flee', already: true, line: '' });

const talkTurnGs = {
    roster: [{ name: '甲', isActive: true, hp: 10, derived: { hp: 10 } }],
    npcRegistry: [{ name: '店员', relation: '可疑', status: 'alive' }],
    combat: { active: true, round: 1, currentTurnIdx: 0, enemies: [{ name: '店员', hp: 6, maxHp: 10, relation: '可疑' }] },
    chatHistory: []
};
assert.equal(runEnemyCombatTurn(talkTurnGs, talkTurnGs.combat.enemies[0], '甲').outcome, 'negotiate');

const h = combat({
    gameState: {
        roster: [{ name: '甲', isActive: true, hp: 10, derived: { hp: 10 } }],
        combat: { active: true, enemies: [{ name: '打手', hp: 2, maxHp: 10, isDefeated: false, _npcFled: true }] },
        chatHistory: [],
        pendingRuleCheck: null,
        pendingRuleChecks: []
    },
    Engine: CoCEngine,
    addJournalEntry() {},
    advanceTurn() {}
});
assert.match(String(h.enemy_attack({ target_name: '甲', enemy_name: '打手' })), /离开|无法再战/);

const told = {
    mythosHeat: 1,
    flags: {},
    chatHistory: [],
    npcRegistry: [{ id: 'dos_fisher', name: '老渔夫', relation: '线索来源', status: 'alive', notes: [] }],
    clueBoard: {
        clues: [
            { id: 'dos_badge', title: '码头工牌', content: '17号仓库', npcId: 'dos_fisher', note: '' },
            { id: 'cf_square', title: '广场传闻', content: '庆典广场', note: '' }
        ]
    }
};
applyNpcBehavior(told);
assert.equal(told.clueBoard.clues[0].toldBy, '老渔夫');
assert.equal(told.clueBoard.clues[1].toldBy, undefined);
applyNpcBehavior(told);
assert.equal(told.clueBoard.clues[0].note.split('由老渔夫告知').length, 2);
assert.match(buildNpcRosterPrompt(told), /老渔夫/);
assert.match(buildNpcRosterPrompt(told), /confide/);

const inj = CoCAIPromptConfig.buildSystemInjection('【Bob】(HP:10/10)', 'standard', told);
assert.match(inj, /当前名册/);
assert.match(inj, /npcId/);
assert.doesNotMatch(inj, /呼救不加单位/);
assert.equal(NPC_BEHAVIOR_RULES.heatInform, 3);

const check = buildNegotiateCheck({ name: '店员' }, '甲');
assert.equal(check.kind, 'social_opposed');
assert.equal(check.fromNegotiate, true);
assert.equal(check.skill, '说服');

const talkGs = {
    combat: { enemies: [{ name: '店员', relation: '可疑', hp: 6, maxHp: 10 }] },
    npcRegistry: [{ name: '店员', relation: '可疑', status: 'alive' }]
};
assert.equal(settleNegotiateFromSocial(talkGs, check, { winner: 'actor' }).outcome, 'talk');
assert.equal(talkGs.npcRegistry[0].relation, '中立');
assert.equal(talkGs.combat.enemies[0]._npcStoodDown, true);
assert.equal(talkGs.combat.enemies[0]._npcNegotiated, true);

const failGs = {
    combat: { enemies: [{ name: '店员', relation: '可疑', hp: 6, maxHp: 10 }] },
    npcRegistry: [{ name: '店员', relation: '可疑', status: 'alive' }]
};
assert.equal(settleNegotiateFromSocial(failGs, check, { winner: 'npc' }).outcome, 'attack');
assert.equal(failGs.npcRegistry[0].relation, '敌对');

const tieGs = {
    combat: { enemies: [{ name: '店员', relation: '中立', hp: 6, maxHp: 10 }] },
    npcRegistry: [{ name: '店员', relation: '中立', status: 'alive' }]
};
assert.equal(settleNegotiateFromSocial(tieGs, check, { winner: 'tie' }).outcome, 'hold');
assert.equal(tieGs.npcRegistry[0].relation, '中立');

const live = {
    roster: [{ name: '甲', isActive: true, skills: { '说服': 80 } }],
    npcRegistry: [{ name: '店员', relation: '可疑', status: 'alive', skills: { '心理学': 20 } }],
    combat: { active: true, enemies: [{ name: '店员', relation: '可疑', hp: 6, maxHp: 10 }], initiativeOrder: [], currentTurnIdx: 0 },
    chatHistory: [],
    pendingRuleChecks: []
};
enqueueRuleCheck(live, buildNegotiateCheck({ name: '店员' }, '甲'));
CoCEngine._setTestRolls([90]);
resolvePendingRuleCheck(live, {
    skill: '说服',
    charName: '甲',
    kind: 'social_opposed',
    success: true,
    level: '成功',
    rolledValue: 10,
    targetValue: 80
}, CoCEngine);
CoCEngine._clearTestRolls();
assert.equal(live.npcRegistry[0].relation, '中立');
assert.equal(live.combat.enemies[0]._npcStoodDown, true);

function makeCombatHarness() {
    const gameState = {
        combat: { active: true, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' },
        roster: [
            { name: '甲', isActive: true, hp: 10, derived: { hp: 10 } },
            { name: '乙', isActive: true, hp: 10, derived: { hp: 10 } }
        ],
        chatHistory: [],
        journalLog: [],
        sceneMap: { rooms: [], currentRoomId: null },
        knownLocations: [],
        currentLocation: '',
        chase: null
    };
    const gp = CoCStateGameplay.create({
        gameState,
        addJournalEntry: (e) => { gameState.journalLog.push(e); }
    });
    return { gameState, gp };
}

{
    const { gameState, gp } = makeCombatHarness();
    gameState.combat.enemies = [{ id: 'e', name: '敌人', hp: 2, maxHp: 10, isEnemy: true, isDefeated: false, _npcFled: true }];
    gameState.combat.initiativeOrder = [
        { name: '甲', isEnemy: false },
        { name: '乙', isEnemy: false },
        { id: 'e', name: '敌人', isEnemy: true }
    ];
    gameState.combat.currentTurnIdx = 2;
    gp.advanceTurn();
    assert.equal(gameState.combat.active, true);
    assert.equal(gameState.combat.initiativeOrder[gameState.combat.currentTurnIdx].name, '甲');
    assert.equal(gameState.combat.round, 2);
}

{
    const { gameState, gp } = makeCombatHarness();
    gameState.combat.enemies = [{ id: 'e', name: '敌人', hp: 2, maxHp: 10, isEnemy: true, isDefeated: false, _npcFled: true }];
    gameState.combat.initiativeOrder = [
        { name: '甲', isEnemy: false },
        { id: 'e', name: '敌人', isEnemy: true },
        { name: '乙', isEnemy: false }
    ];
    gameState.combat.currentTurnIdx = 1;
    gp.advanceTurn();
    assert.equal(gameState.combat.initiativeOrder[gameState.combat.currentTurnIdx].name, '乙');
    assert.equal(gameState.combat.round, 1);
}

{
    const { gameState, gp } = makeCombatHarness();
    gameState.combat.enemies = [{ id: 'e', name: '店员', hp: 6, maxHp: 10, isEnemy: true, isDefeated: false, _npcStoodDown: true }];
    gameState.combat.initiativeOrder = [{ id: 'e', name: '店员', isEnemy: true }];
    gameState.combat.currentTurnIdx = 0;
    gp.advanceTurn();
    assert.equal(gameState.combat.active, false);
    assert.ok(gameState.journalLog.some((e) => e && String(e.summary || '').includes('对方停手')));
}

{
    const { gameState, gp } = makeCombatHarness();
    gameState.combat.enemies = [{ id: 'e', name: '敌人', hp: 2, maxHp: 10, isEnemy: true, isDefeated: false, _npcFled: true }];
    gameState.combat.initiativeOrder = [{ id: 'e', name: '敌人', isEnemy: true }];
    gameState.combat.currentTurnIdx = 0;
    gp.advanceTurn();
    assert.equal(gameState.combat.active, false);
    assert.ok(gameState.journalLog.some((e) => e && String(e.summary || '').includes('敌人脱离战场')));
}

{
    const { gameState, gp } = makeCombatHarness();
    gameState.combat.enemies = [
        { id: 'e1', name: '店员', hp: 6, maxHp: 10, isEnemy: true, isDefeated: false, _npcStoodDown: true },
        { id: 'e2', name: '打手', hp: 2, maxHp: 10, isEnemy: true, isDefeated: false, _npcFled: true }
    ];
    gameState.combat.initiativeOrder = [
        { id: 'e1', name: '店员', isEnemy: true },
        { id: 'e2', name: '打手', isEnemy: true }
    ];
    gameState.combat.currentTurnIdx = 0;
    gp.advanceTurn();
    assert.equal(gameState.combat.active, false);
    assert.ok(gameState.journalLog.some((e) => e && String(e.summary || '').includes('对方停手或脱离')));
}

{
    const { gameState, gp } = makeCombatHarness();
    gameState.npcRegistry = [{ name: '店员', relation: '可疑', status: 'alive' }];
    gp.startCombat([{ name: '店员', hp: 5, maxHp: 10, relation: '可疑' }], '巷口', '');
    assert.equal(gameState.combat.enemies[0].hp, 5);
    assert.equal(gameState.combat.enemies[0].maxHp, 10);
    assert.equal(gameState.combat.enemies[0].relation, '可疑');
    assert.equal(gameState.combat.enemies[0]._rosterName, '店员');
}

{
    const { gameState, gp } = makeCombatHarness();
    gp.startCombat(['路人'], '巷口', '');
    assert.equal(gameState.combat.enemies[0].hp, 10);
    assert.equal(gameState.combat.enemies[0].maxHp, 10);
}

{
    const { gameState, gp } = makeCombatHarness();
    gameState.npcRegistry = [{ name: '打手', relation: '敌对', status: 'alive' }];
    gp.startCombat(
        [{ name: '打手', hp: 2, maxHp: 10 }, { name: '打手', hp: 8, maxHp: 10 }],
        '巷口',
        ''
    );
    assert.equal(gameState.combat.enemies[0].name, '打手');
    assert.equal(gameState.combat.enemies[1].name, '打手·2');
    assert.equal(gameState.combat.enemies[1]._rosterName, '打手');
    assert.equal(gameState.combat.enemies[1].relation, '敌对');
    const dupFlee = runEnemyCombatTurn(gameState, gameState.combat.enemies[0], '甲');
    assert.equal(dupFlee.outcome, 'flee');
    assert.equal(gameState.npcRegistry[0].status, 'missing');
    const next = resolveEnemy(gameState.combat.enemies, '打手', { required: true, preferLiving: true });
    assert.equal(next.ok, true);
    assert.equal(next.enemy.name, '打手·2');
    const before = gameState.combat.enemies[1].hp;
    assert.equal(gp.updateEnemy('打手', -1), true);
    assert.equal(gameState.combat.enemies[0].hp, 2);
    assert.equal(gameState.combat.enemies[1].hp, before - 1);
    const pick = resolveAttackTarget(gameState.combat.enemies, '打手');
    assert.equal(pick.name, '打手·2');
    const burstSettle = gameState.combat.enemies.filter((e) => isActiveCombatEnemy(e));
    assert.equal(burstSettle.length, 1);
    assert.equal(burstSettle[0].name, '打手·2');
    gameState.combat.active = false;
    const ch = chase({ gameState, Engine: CoCEngine, addJournalEntry() {} });
    const chaseOut = ch.start_chase({ quarry_name: '打手', skip_speed_check: true });
    assert.ok(!String(chaseOut).includes('找不到猎物'), String(chaseOut));
    assert.equal(gameState.chase.quarryName, '打手·2');
}

{
    const { gameState, gp } = makeCombatHarness();
    gp.startCombat([{ name: '枪手', hp: 10, weapon: '手枪' }], '巷口', '');
    assert.equal(gameState.combat.enemies[0].weapon, '手枪');
    assert.equal(inferEnemyRanged(gameState.combat.enemies[0]), true);
    gp.startCombat([{ name: '警察', hp: 13, weapons: ['左轮手枪 1D10'], skills: { '手枪': 50 } }], '巷口', '');
    assert.deepEqual(gameState.combat.enemies[0].weapons, ['左轮手枪 1D10']);
    assert.equal(inferEnemyRanged(gameState.combat.enemies[0]), true);
    gp.startCombat([{ name: '打手', hp: 10 }], '巷口', '');
    assert.equal(inferEnemyRanged(gameState.combat.enemies[0]), false);
}

{
    const namedOnly = filterActiveInitiativeOrder(
        [{ name: '祭司', isEnemy: true }],
        [{ name: '祭司', hp: 8 }],
        []
    );
    assert.equal(namedOnly.length, 1);
    assert.equal(namedOnly[0].name, '祭司');
}

{
    const { gameState } = makeCombatHarness();
    gameState.npcRegistry = [{ name: '店员', relation: '可疑', status: 'alive' }];
    const before = gameState.combat.enemies.slice();
    const h = combat({
        gameState,
        Engine: CoCEngine,
        addJournalEntry() {},
        advanceTurn() {}
    });
    assert.match(String(h.spawn_npc({ template: '邪教徒', name: '店员' })), /已生成/);
    assert.equal(gameState.combat.enemies.length, before.length + 1);
    const spawned = gameState.combat.enemies[gameState.combat.enemies.length - 1];
    assert.equal(spawned._rosterName, '店员');
    assert.equal(spawned.relation, '可疑');
    assert.equal(gameState.combat.active, true);
}

console.log('npc_behavior_smoke: OK');
