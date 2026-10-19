/**
 * A3: dive_for_cover stores cover on actor; soak/penalty apply to the defender only.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';

const alice = {
    name: 'Alice',
    isActive: true,
    hp: 12,
    maxHp: 12,
    derived: { db: '0', hp: 12, maxHp: 12 },
    skills: { '手枪': 60, '闪避': 40 },
    status: {},
    equipment: { weapon: '左轮手枪' },
    inventory: []
};
const enemy = {
    name: '枪手',
    isEnemy: true,
    hp: 10,
    maxHp: 10,
    armor: 0,
    skills: { '射击': 50, '闪避': 0 },
    status: {}
};

const gameState = {
    roster: [alice],
    chatHistory: [],
    combat: { active: true, enemies: [enemy], situation: {} },
    pendingRuleCheck: null,
    pendingRuleChecks: []
};

// Simulate dive: cover on actor status (as handler now does)
alice.status.cover = CoCEngine.CombatEngine.normalizeCover('soft');
assert.ok(alice.status.cover && alice.status.cover.kind === 'soft');
assert.ok(!gameState.combat.situation.cover);

// Player shoots: attacker cover must NOT soak damage to enemy
const shot = CoCEngine.CombatEngine.autoResolveExchange(
    alice,
    enemy,
    { skill: '手枪', damage: '1D10', type: 'firearm' },
    {},
    {
        preRolledAttack: { success: true, level: '成功', rolledValue: 20, targetValue: 60 },
        preRolledDefense: { success: false, level: '失败', rolledValue: 90, targetValue: 30 },
        situation: {} // no target cover
    }
);
assert.ok(shot.damage > 0, 'shot without target cover should deal damage');
assert.ok(!shot.coverSoak, 'own dive cover must not soak outgoing fire');

// Enemy hits player behind cover: soak applies
enemy.status = {};
const raw = 9;
const soak = CoCEngine.CombatEngine.applyCoverSoak(raw, alice.status.cover);
assert.ok(soak.soaked > 0, 'defender cover should soak incoming fire');
assert.ok(soak.damageToTarget < raw);

// Target-in-cover penalties for attacker
const sit = CoCEngine.SituationalEngine.resolve({
    attacker: enemy,
    defender: alice,
    ranged: true,
    situation: { cover: alice.status.cover }
});
assert.ok((sit.penaltyDice || 0) >= 1, 'shooting target in cover adds penalty');

console.log('combat_cover_soak_smoke: OK', { outDmg: shot.damage, soaked: soak.soaked, pen: sit.penaltyDice });
