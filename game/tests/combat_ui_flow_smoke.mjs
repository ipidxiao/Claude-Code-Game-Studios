/**
 * Combat UI helpers + forceCheck bridge smoke (no DOM).
 */
import { strict as assert } from 'node:assert';
import {
    resolveAttackTarget,
    quickActionToToolCall,
    actionGate,
    buildQuickActionText,
    enemyAttackTurnKey,
    canTriggerEnemyAttack,
    enemyAttackToolCall,
    chaseActionToToolCall,
    chaseStatusText,
    CHASE_QUICK_ACTIONS,
    inferEnemyRanged
} from '../js/components/combat_ui_helpers.mjs';
import { emitForceCheckMessage, applyToolForceCheck, pauseForRuleCheck } from '../js/state/rule_check.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const enemies = [
    { id: 'e1', name: '邪教徒甲', hp: 10, isDefeated: false },
    { id: 'e2', name: '邪教徒乙', hp: 8, isDefeated: false },
    { id: 'e3', name: '倒下者', hp: 0, isDefeated: true }
];

assert.equal(resolveAttackTarget(enemies, 'e2').name, '邪教徒乙');
assert.equal(resolveAttackTarget(enemies, null).name, '邪教徒甲');
assert.equal(resolveAttackTarget(enemies.filter((e) => e.isDefeated), null), null);

const melee = quickActionToToolCall('melee', 'Alice', enemies[1]);
assert.equal(melee.tool, 'melee_attack');
assert.equal(melee.args.enemy_name, '邪教徒乙');
assert.equal(melee.args.actor_name, 'Alice');

const shoot = quickActionToToolCall('shoot', 'Alice', enemies[0]);
assert.equal(shoot.tool, 'fire_weapon');
assert.equal(shoot.args.shooter_name, 'Alice');

const flee = quickActionToToolCall('flee', 'Alice', enemies[0]);
assert.equal(flee.tool, 'end_combat');

const textOnly = quickActionToToolCall('grapple', 'Alice', enemies[0]);
assert.equal(textOnly, null);

const noEnemy = quickActionToToolCall('melee', 'Alice', null);
assert.ok(noEnemy.error);

assert.ok(buildQuickActionText('melee').includes('近战'));

const gateOk = actionGate(null, { name: 'Alice' }, 'melee');
assert.equal(gateOk.ok, true);
const gateBad = actionGate(null, null, 'melee');
assert.equal(gateBad.ok, false);

assert.equal(enemyAttackTurnKey(2, 1, '邪教徒甲'), '2:1:邪教徒甲');
assert.equal(canTriggerEnemyAttack({
    combatActive: true,
    currentTurnIsEnemy: true,
    pendingRuleCheck: null,
    enemyName: '邪教徒甲',
    targetName: 'Alice'
}).ok, true);
assert.equal(canTriggerEnemyAttack({
    combatActive: true,
    currentTurnIsEnemy: true,
    pendingRuleCheck: { kind: 'combat_react' },
    enemyName: '邪教徒甲',
    targetName: 'Alice'
}).ok, false);

const ea = enemyAttackToolCall('邪教徒甲', 'Alice');
assert.equal(ea.tool, 'enemy_attack');
assert.equal(ea.args.enemy_name, '邪教徒甲');
assert.equal(ea.args.target_name, 'Alice');

assert.equal(inferEnemyRanged({ rangedSkill: '射击' }), true);
assert.equal(inferEnemyRanged({ skills: { '射击': 40 } }), true);
assert.equal(inferEnemyRanged({ skills: { '手枪': 50 } }), true);
assert.equal(inferEnemyRanged({ weapons: ['左轮手枪 1D10'] }), true);
assert.equal(inferEnemyRanged({ attacks: '匕首 1D4' }), false);
assert.equal(resolveAttackTarget(
    [{ id: 'e1', name: '打手', hp: 2, _npcFled: true }, { id: 'e2', name: '打手·2', hp: 8, _rosterName: '打手' }],
    '打手'
).name, '打手·2');
const rangedAtk = enemyAttackToolCall('枪手', 'Alice', { enemy: { name: '枪手', rangedSkill: '射击' } });
assert.equal(rangedAtk.args.ranged, true);
assert.equal(rangedAtk.args.weapon_skill, '射击');
const meleeAtk = enemyAttackToolCall('暴徒', 'Alice', { enemy: { name: '暴徒', attacks: '拳头' } });
assert.ok(!meleeAtk.args.ranged);

assert.ok(CHASE_QUICK_ACTIONS.some((a) => a.id === 'shoot'));
const push = chaseActionToToolCall('push', 'Alice', { vehicle: true });
assert.equal(push.tool, 'chase_action');
assert.equal(push.args.action, 'push');
assert.equal(push.args.actor_name, 'Alice');

const collideFoot = chaseActionToToolCall('collide', 'Alice', { vehicle: false });
assert.ok(collideFoot.error);

const vShoot = chaseActionToToolCall('shoot', 'Alice', { vehicle: true, enemyName: '追车' });
assert.equal(vShoot.tool, 'fire_weapon');
assert.equal(vShoot.args.shooter_name, 'Alice');
assert.equal(vShoot.args.enemy_name, '追车');

const tick = chaseActionToToolCall('tick', null, {});
assert.equal(tick.tool, 'chase_action');
assert.equal(tick.args.action, 'tick');

assert.ok(chaseStatusText({ active: true, round: 3, vehicle: true, quarryName: '逃' }, null).includes('载具'));
assert.equal(chaseStatusText({ active: false }, null), '');

const gameState = {
    roster: [{ name: 'Alice', isActive: true }],
    chatHistory: [],
    pendingRuleCheck: null,
    pendingRuleChecks: []
};
const pause = pauseForRuleCheck(gameState, {
    kind: 'combat_attack',
    skill: '斗殴',
    roller: 'Alice',
    prompt: '请进行【斗殴】检定。'
});
assert.ok(pause.forceCheck);
assert.equal(gameState.pendingRuleCheck.kind, 'combat_attack');

const emitted = applyToolForceCheck(gameState, pause);
assert.ok(emitted);
assert.ok(gameState.chatHistory.some((m) => m.tool_calls && m.tool_calls[0].function.name === 'request_skill_check'));

const again = emitForceCheckMessage(gameState, { skill: '闪避', target: 'Alice' }, '闪避');
assert.ok(again);

const invSrc = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../js/components/story_inv.mjs'), 'utf8');
assert.ok(!/loadAmmo\s*\(/.test(invSrc), 'story_inv no forced loadAmmo');
assert.ok(!/>装填<\/button>/.test(invSrc), 'story_inv no 装填 button');
assert.ok(/无需装填/.test(invSrc), 'story_inv hints backpack ammo needs no load');

console.log('combat_ui_flow_smoke: OK');
