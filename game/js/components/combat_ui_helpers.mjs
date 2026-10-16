// Pure combat UI helpers — shared by StoryCombat and Node/jsdom tests.
import { isActiveCombatEnemy } from '../engines/npc_behavior.mjs';

export const COMBAT_QUICK_ACTIONS = Object.freeze([
    { id: 'melee', label: '🗡️ 近战', text: '我向最近的敌人发起近战攻击！', tool: 'melee_attack', direct: true },
    { id: 'shoot', label: '🔫 射击', text: '我开枪射击！', tool: 'fire_weapon', direct: true },
    { id: 'counter', label: '⚔️ 反击', text: '我放弃闪避，对攻击者进行反击！', tool: 'fight_back', direct: true },
    { id: 'dodge', label: '🛡️ 生存', text: '我尝试闪避并寻找掩体。', tool: 'dodge', direct: true },
    { id: 'flee', label: '🏃 逃脱', text: '我们撤退！', tool: 'end_combat', direct: true },
    { id: 'grapple', label: '🤼 擒抱', text: '我尝试擒抱最近的敌人！', tool: null, direct: false },
    { id: 'skill', label: '💊 技能', buildText: (targetName) => `我对${targetName}进行急救。`, tool: null, direct: false },
    { id: 'intimidate', label: '🗣️ 交涉', text: '我尝试威吓敌人！', tool: null, direct: false },
    { id: 'environment', label: '🏚️ 环境', text: '我利用周围的环境（家具/障碍物）获取掩护！', tool: null, direct: false },
]);

const CAN_ACT_KIND = Object.freeze({
    melee: 'melee',
    shoot: 'firearm',
    counter: 'melee',
    dodge: 'dodge',
    flee: 'move',
    grapple: 'melee',
    skill: 'heal',
    intimidate: 'social',
    environment: 'move'
});

export function filterActiveInitiativeOrder(initiativeOrder, enemies, roster) {
    const order = Array.isArray(initiativeOrder) ? initiativeOrder : [];
    const enemyList = Array.isArray(enemies) ? enemies : [];
    const chars = Array.isArray(roster) ? roster : [];
    return order.filter((turn) => {
        if (!turn || typeof turn !== 'object') return false;
        if (turn.isEnemy) {
            const enemy = enemyList.find((en) => en && turn.id && en.id === turn.id)
                || enemyList.find((en) => en && en.name === turn.name);
            return isActiveCombatEnemy(enemy);
        }
        return chars.find((c) => c && c.name === turn.name && c.isActive && charHp(c) > 0);
    });
}

export function computeActiveTurnIdx(currentTurnIdx, activeOrderLength) {
    const len = Math.max(1, Number(activeOrderLength) || 0);
    const idx = Number(currentTurnIdx) || 0;
    return idx % len;
}

/** Current HP SoT: prefer derived.hp, then top-level hp. */
export function charHp(char) {
    if (!char) return 0;
    if (char.derived && typeof char.derived.hp === 'number') return char.derived.hp;
    if (typeof char.hp === 'number') return char.hp;
    return 0;
}

/** Maximum HP for UI. Prefer derived.maxHp; legacy derived.hp was the cap when higher than current. */
export function charMaxHp(char) {
    if (!char) return 0;
    const derived = char.derived || {};
    if (typeof derived.maxHp === 'number' && derived.maxHp > 0) return derived.maxHp;
    const dhp = derived.hp;
    const hp = char.hp;
    if (typeof dhp === 'number' && typeof hp === 'number' && dhp > hp) return dhp;
    if (typeof dhp === 'number' && dhp > 0) return dhp;
    if (typeof hp === 'number') return hp;
    return 0;
}

export function resolveFirstWoundedChar(roster, activeChars, preferred) {
    if (preferred && preferred.name) return preferred.name;
    const chars = Array.isArray(roster) ? roster : [];
    const active = Array.isArray(activeChars) ? activeChars : chars.filter((c) => c && c.isActive);
    const wounded = chars.find((r) => {
        if (!r || !r.isActive) return false;
        const hp = charHp(r);
        const max = charMaxHp(r) || 10;
        return hp < max;
    });
    if (wounded && wounded.name) return wounded.name;
    return active[0]?.name || '队友';
}

export function buildQuickActionText(actionId, woundedName = '队友') {
    const action = COMBAT_QUICK_ACTIONS.find((a) => a.id === actionId);
    if (!action) return '';
    if (typeof action.buildText === 'function') return action.buildText(woundedName);
    return action.text || '';
}

/** Pick enemy by id/name, else first living enemy. */
export function resolveAttackTarget(enemies, selectedId) {
    const list = Array.isArray(enemies) ? enemies : [];
    const living = list.filter((e) => isActiveCombatEnemy(e));
    if (!living.length) return null;
    if (selectedId != null && selectedId !== '') {
        const byId = living.find((e) => String(e.id) === String(selectedId)
            || e.name === selectedId || e._rosterName === selectedId);
        if (byId) return byId;
    }
    return living[0];
}

/**
 * Map quick-action id → { tool, args } for direct handler dispatch.
 * Returns null when action should stay text-fed to AI.
 */
export function quickActionToToolCall(actionId, actorName, enemy) {
    const action = COMBAT_QUICK_ACTIONS.find((a) => a.id === actionId);
    if (!action || !action.direct || !action.tool) return null;
    const actor = actorName || '调查员';
    if (action.tool === 'end_combat') {
        return { tool: 'end_combat', args: {} };
    }
    if (action.tool === 'dodge' || action.tool === 'fight_back') {
        return { tool: action.tool, args: { actor_name: actor, target_name: actor } };
    }
    const enemyName = enemy && enemy.name ? enemy.name : null;
    if (!enemyName && (action.tool === 'melee_attack' || action.tool === 'fire_weapon')) {
        return { error: '没有可选敌人。' };
    }
    const args = {
        actor_name: actor,
        target_name: actor,
        enemy_name: enemyName
    };
    if (action.tool === 'fire_weapon') args.shooter_name = actor;
    return { tool: action.tool, args };
}

/** Gate a combat UI action via Engine.canAct when available. */
export function actionGate(Engine, char, actionId) {
    if (!char) return { ok: false, desc: '无行动者' };
    if (!Engine || typeof Engine.canAct !== 'function') return { ok: true };
    const kind = CAN_ACT_KIND[actionId] || 'melee';
    try {
        const gate = Engine.canAct(char, kind);
        if (gate && gate.ok === false) {
            return { ok: false, desc: gate.desc || gate.reason || '无法行动' };
        }
        return { ok: true, desc: '' };
    } catch (_e) {
        return { ok: true };
    }
}

/** Stable key for one enemy initiative slot (auto-attack once per turn). */
export function enemyAttackTurnKey(round, turnIdx, enemyName) {
    return `${Number(round) || 0}:${Number(turnIdx) || 0}:${enemyName || ''}`;
}

/**
 * Whether the combat UI may fire enemy_attack (manual or auto).
 * Does not advance turn itself — enemy_attack handler owns miss→advanceTurn.
 */
export function canTriggerEnemyAttack(opts) {
    const o = opts || {};
    if (!o.combatActive) return { ok: false, desc: '战斗未激活' };
    if (!o.currentTurnIsEnemy) return { ok: false, desc: '非敌方回合' };
    if (o.pendingRuleCheck) return { ok: false, desc: '等待掷骰/反应' };
    if (!o.enemyName) return { ok: false, desc: '无行动敌人' };
    if (!o.targetName) return { ok: false, desc: '无攻击目标' };
    return { ok: true, desc: '' };
}

/** Build enemy_attack tool call. Prefer ranged when enemy looks armed for firearms. */
export function inferEnemyRanged(enemy) {
    if (!enemy || typeof enemy !== 'object') return false;
    if (enemy.ranged === true) return true;
    if (enemy.rangedSkill) return true;
    const skills = enemy.skills || {};
    if (Number(skills['射击']) > 0 || Number(skills.射击) > 0) return true;
    if (Number(skills['手枪']) > 0 || Number(skills['步枪']) > 0 || Number(skills['霰弹枪']) > 0) return true;
    const w = String([
        enemy.equipment && enemy.equipment.weapon,
        enemy.weapon,
        enemy.attacks,
        Array.isArray(enemy.weapons) ? enemy.weapons.join(' ') : enemy.weapons
    ].filter(Boolean).join(' '));
    return /枪|射击|开火|手枪|步枪|霰弹|弓/.test(w);
}

export function enemyAttackToolCall(enemyName, targetName, extras) {
    if (!enemyName) return { error: '无行动敌人。' };
    if (!targetName) return { error: '无攻击目标。' };
    const x = extras || {};
    const enemy = x.enemy || null;
    const ranged = x.ranged != null ? !!x.ranged : inferEnemyRanged(enemy);
    const args = {
        enemy_name: enemyName,
        target_name: targetName,
        description: x.description || (ranged ? '敌方回合开火' : '敌方回合近战出手')
    };
    if (ranged) args.ranged = true;
    const skill = x.weapon_skill
        || (enemy && enemy.rangedSkill)
        || (ranged ? '射击' : null);
    if (skill) args.weapon_skill = skill;
    if (x.damage != null) args.damage = x.damage;
    return { tool: 'enemy_attack', args };
}

export const CHASE_QUICK_ACTIONS = Object.freeze([
    { id: 'push', label: '加速/拉近', action: 'push' },
    { id: 'hazard', label: '险情', action: 'hazard' },
    { id: 'collide', label: '撞击', action: 'collide', vehicleOnly: true },
    { id: 'lose_control', label: '失控', action: 'lose_control', vehicleOnly: true },
    { id: 'shoot', label: '载具射击', tool: 'fire_weapon' },
    { id: 'tick', label: '下一轮', action: 'tick', chaseOnlyRound: true },
    { id: 'end', label: '结束追逐', action: 'end' }
]);

/**
 * Map chase UI action → tool call.
 * tick is omitted by UI when combat is also active (round bus already ticks chase).
 */
export function chaseActionToToolCall(actionId, actorName, opts) {
    const o = opts || {};
    const def = CHASE_QUICK_ACTIONS.find((a) => a.id === actionId);
    if (!def) return { error: '未知追逐动作。' };
    if (def.vehicleOnly && !o.vehicle) return { error: '当前不是载具追逐。' };
    if (def.tool === 'fire_weapon') {
        const shooter = actorName || o.shooterName;
        const enemyName = o.enemyName;
        if (!shooter) return { error: '无射击者。' };
        if (!enemyName) return { error: '无射击目标。' };
        return {
            tool: 'fire_weapon',
            args: { shooter_name: shooter, enemy_name: enemyName }
        };
    }
    const actor = actorName || o.actorName;
    if (def.action !== 'tick' && def.action !== 'end' && !actor) {
        return { error: '无追逐行动者。' };
    }
    const args = { action: def.action };
    if (actor) args.actor_name = actor;
    if (def.action === 'hazard' && o.hazardKind) args.hazard_kind = o.hazardKind;
    return { tool: 'chase_action', args };
}

/** Safe chase status line for UI. */
export function chaseStatusText(chase, Engine) {
    if (!chase || !chase.active) return '';
    try {
        if (Engine && Engine.ChaseEngine && typeof Engine.ChaseEngine.describe === 'function') {
            return Engine.ChaseEngine.describe(chase);
        }
    } catch (_e) { /* fall through */ }
    const round = chase.round != null ? chase.round : '?';
    const mode = chase.vehicle ? '载具' : '徒步';
    const bits = [`${mode}追逐`, `第${round}轮`, `猎物 ${chase.quarryName || '—'}`];
    if (chase.speedResolved === false) bits.push('速度检定中');
    if (chase.escapeStreak > 0) {
        bits.push(`逃脱进度${chase.escapeStreak}/${chase.escapeRounds || 2}`);
    }
    return bits.join(' · ');
}
