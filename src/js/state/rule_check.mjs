/**
 * Pause-for-dice rule checks: heal / SAN / tome / fall / INT / poison / therapy / dying / major-wound CON.
 * Handlers enqueue a spec and return forceCheck; the dice panel rolls first.
 * Results apply only after executeSkillCheck → resolvePendingRuleCheck.
 */

import { applyScenarioEffects } from '../scenario/effects_apply.mjs';
import { CoCStateAccessor } from './accessor.mjs';
import { settleNegotiateFromSocial, isActiveCombatEnemy } from '../engines/npc_behavior.mjs';
import { resolveEnemy } from '../tools/resolve.mjs';
import { resolveSelectedActiveChar } from './selection.mjs';
import { flushAftermathToRuleCheck } from './aftermath.mjs';
import { CoCEngine } from '../coc.mjs';
import { generateNpcFromTemplate } from '../data/npc_templates.mjs';

/** Investigators via dealDamage; combat enemies via top-level hp. */
export function applyChaseInjury(gameState, Engine, name, damage) {
    const dmg = Number(damage) || 0;
    if (!(dmg > 0) || !gameState) return null;
    const c = findChar(gameState, name);
    if (c && Engine && Engine.MajorWoundEngine && typeof Engine.MajorWoundEngine.dealDamage === 'function') {
        const applied = Engine.MajorWoundEngine.dealDamage(c, dmg);
        return { who: c, applied, hp: c.hp, investigator: true };
    }
    const enemies = (gameState.combat && gameState.combat.enemies) || [];
    const got = resolveEnemy(enemies, name, {
        required: false, preferLiving: true, allowFirstFallback: false, roleLabel: '敌人'
    });
    const enemy = got.ok ? got.enemy : null;
    const current = enemy && typeof enemy.hp === 'number'
        ? enemy.hp
        : (enemy && enemy.derived && typeof enemy.derived.hp === 'number' ? enemy.derived.hp : null);
    if (enemy && current != null) {
        const next = Math.max(0, current - dmg);
        const writer = (Engine && Engine.mirrorCurrentHp) || CoCEngine.mirrorCurrentHp;
        if (typeof writer === 'function') writer(enemy, next);
        else enemy.hp = next;
        if (next <= 0 && !enemy.physicalImmune) enemy.isDefeated = true;
        return { who: enemy, hp: enemy.hp, investigator: false };
    }
    return null;
}

function findChar(gameState, name) {
    const roster = gameState.roster || [];
    const matches = roster.filter((r) => r && r.name === name);
    if (!matches.length) return null;
    return matches.find((r) => r.isActive) || matches[0];
}

function selectedActiveNameFallback(gameState) {
    const selected = resolveSelectedActiveChar(gameState);
    if (selected && selected.name) return selected.name;
    return (gameState.roster || []).find((r) => r && r.isActive)?.name || null;
}

function findEnemy(gameState, name) {
    const list = (gameState.combat && gameState.combat.enemies) || [];
    if (!name) return null;
    const got = resolveEnemy(list, name, {
        required: false, preferLiving: true, allowFirstFallback: false, roleLabel: '敌人'
    });
    if (got.ok) return got.enemy;
    return list.find((e) => e && (e.name === name || e._rosterName === name)) || null;
}

/** Roster mates, living foes, and registered NPCs other than the roller. */
export function listOtherParticipants(gameState, rollerName) {
    const roller = String(rollerName || '').trim();
    const seen = new Set();
    const names = [];
    const add = (name) => {
        const n = String(name || '').trim();
        if (!n || n === roller || seen.has(n)) return;
        seen.add(n);
        names.push(n);
    };
    ((gameState && gameState.roster) || []).forEach((c) => add(c && c.name));
    const enemies = (gameState && gameState.combat && gameState.combat.enemies) || [];
    enemies.forEach((e) => {
        if (isActiveCombatEnemy(e)) add(e && e.name);
    });
    ((gameState && gameState.npcRegistry) || []).forEach((n) => add(n && n.name));
    return names;
}

function tryAdvanceTurn() {
    try {
        if (typeof CoCStateAccessor.advanceTurn === 'function') {
            CoCStateAccessor.advanceTurn();
        }
    } catch (_e) {
        /* headless smokes without Vue CoCState — no-op */
    }
}

function burnIntensityFor(text) {
    const raw = String(text || '');
    if (/火焰喷射器|莫洛托夫|燃烧瓶/.test(raw)) return 'severe';
    if (/火把/.test(raw)) return 'minor';
    return 'moderate';
}

function applyHitRiders(Engine, defender, sourceText, result) {
    if (!defender || defender.physicalImmune || !result) return;
    if (result.winner && result.winner !== 'attacker') return;
    if (!(Number(result.damage) > 0) && !(Number(result.totalDamage) > 0)) return;
    const raw = String(sourceText || '');
    const apply = Engine && Engine.ConditionsEngine && Engine.ConditionsEngine.apply;
    if (/眩晕/.test(raw)) {
        if (typeof apply === 'function') apply(defender, 'stunned', { roundsLeft: 1 });
        else {
            if (!defender.status) defender.status = {};
            defender.status.stunned = { roundsLeft: 1 };
        }
        if (result.msg && result.msg.indexOf('眩晕') < 0) result.msg += ' 目标眩晕。';
        if (result.description && result.description.indexOf('眩晕') < 0) result.description += ' 目标眩晕。';
    }
    if (/燃烧/.test(raw)) {
        const intensity = burnIntensityFor(raw);
        if (typeof apply === 'function') apply(defender, 'burning', { intensity });
        else {
            if (!defender.status) defender.status = {};
            defender.status.burning = { intensity, roundsLeft: 3 };
        }
        if (result.msg && result.msg.indexOf('着火') < 0) result.msg += ' 目标着火。';
        if (result.description && result.description.indexOf('着火') < 0) result.description += ' 目标着火。';
    }
}

function clockAbs(clock) {
    return ((Number(clock && clock.day) || 1) - 1) * 24 + (Number(clock && clock.hour) || 0);
}

function clonePlain(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
}

function beginTransformation(gameState, Engine, caster, form) {
    if (!caster.status) caster.status = {};
    if (!caster.status.transformation || !caster.status.transformation.saved) {
        caster.status.transformation = {
            saved: {
                attrs: clonePlain(caster.attrs) || {},
                skills: clonePlain(caster.skills) || {},
                db: caster.db,
                build: caster.build,
                mov: caster.mov,
                armor: caster.armor,
                derived: clonePlain(caster.derived) || {},
                hp: caster.hp,
                maxHp: caster.maxHp,
                name: caster.name
            }
        };
    }
    const hours = Math.max(1, Engine && Engine.parseDice ? (Engine.parseDice('1D6') || 1) : 1);
    const clock = (gameState && gameState.worldClock) || { day: 1, hour: 0 };
    caster.status.transformation.untilAbs = clockAbs(clock) + hours;
    caster.attrs = clonePlain(form.attrs) || caster.attrs;
    caster.skills = clonePlain(form.skills) || {};
    caster.db = form.db;
    caster.build = form.build;
    caster.mov = form.mov;
    caster.armor = form.armor;
    const hp = Number(form.hp);
    const maxHp = Number(form.maxHp != null ? form.maxHp : form.hp);
    if (typeof Engine.mirrorCurrentHp === 'function' && Number.isFinite(hp)) {
        Engine.mirrorCurrentHp(caster, hp, Number.isFinite(maxHp) ? maxHp : hp);
    }
    if (form.derived) {
        caster.derived = Object.assign({}, caster.derived, {
            db: form.derived.db,
            build: form.derived.build,
            mov: form.derived.mov
        });
    }
    caster.name = caster.status.transformation.saved.name;
}

function applySavedForm(Engine, ch, saved) {
    ch.attrs = clonePlain(saved.attrs) || {};
    ch.skills = clonePlain(saved.skills) || {};
    ch.db = saved.db;
    ch.build = saved.build;
    ch.mov = saved.mov;
    ch.armor = saved.armor;
    ch.name = saved.name || ch.name;
    const hp = saved.hp != null ? saved.hp : (saved.derived && saved.derived.hp);
    const maxHp = saved.maxHp != null ? saved.maxHp : (saved.derived && saved.derived.maxHp);
    if (Engine && typeof Engine.mirrorCurrentHp === 'function') Engine.mirrorCurrentHp(ch, hp, maxHp);
    if (saved.derived) {
        const keepHp = ch.derived && ch.derived.hp;
        const keepMax = ch.derived && ch.derived.maxHp;
        ch.derived = Object.assign({}, clonePlain(saved.derived), { hp: keepHp, maxHp: keepMax });
    }
}

export function restoreExpiredForms(gameState, Engine) {
    if (!gameState) return;
    const now = clockAbs(gameState.worldClock);
    const people = [].concat(gameState.roster || [], (gameState.combat && gameState.combat.enemies) || []);
    people.forEach((ch) => {
        const tr = ch && ch.status && ch.status.transformation;
        if (!tr || tr.untilAbs == null || now < tr.untilAbs) return;
        if (tr.saved) applySavedForm(Engine, ch, tr.saved);
        delete ch.status.transformation;
    });
}

function raiseCorpse(Engine, enemy, caster, zombie) {
    const max = Number(enemy.maxHp) > 0
        ? Number(enemy.maxHp)
        : (Number(enemy.derived && enemy.derived.maxHp) > 0 ? Number(enemy.derived.maxHp) : 1);
    enemy.isDefeated = false;
    enemy._npcFled = false;
    enemy._npcStoodDown = false;
    if (typeof Engine.mirrorCurrentHp === 'function') Engine.mirrorCurrentHp(enemy, max, max);
    else {
        enemy.hp = max;
        enemy.maxHp = max;
    }
    if (!enemy.status) enemy.status = {};
    enemy.status.controlled = { by: caster && caster.name, permanent: true };
    if (zombie) {
        const sheet = generateNpcFromTemplate('丧尸');
        enemy.mov = 7;
        if (!enemy.derived) enemy.derived = {};
        enemy.derived.mov = 7;
        const fight = sheet && sheet.skills && sheet.skills['斗殴'];
        const kept = enemy.skills && enemy.skills['斗殴'];
        enemy.skills = { '斗殴': kept != null ? kept : (fight != null ? fight : 40) };
        enemy.type = 'undead';
    }
}

function applyEnemyHp(enemy, dmg) {
    const damage = Math.max(0, Number(dmg) || 0);
    if (!enemy || damage <= 0) return 0;
    if (enemy._kpImmunity) return 0;
    const before = Number(enemy.hp) || 0;
    // Prefer gameplay.updateEnemy so journal / initiative / victory hooks stay single-path.
    try {
        const state = typeof CoCStateAccessor.getState === 'function' ? CoCStateAccessor.getState() : null;
        if (state && typeof state.updateEnemy === 'function' && (enemy.id || enemy.name)) {
            state.updateEnemy(enemy.id || enemy.name, -damage);
            return Math.max(0, before - (Number(enemy.hp) || 0));
        }
    } catch (_e) { /* fall through */ }
    const next = Math.max(0, before - damage);
    if (typeof CoCEngine.mirrorCurrentHp === 'function') CoCEngine.mirrorCurrentHp(enemy, next);
    else enemy.hp = next;
    if (enemy.hp <= 0 && !enemy.physicalImmune) enemy.isDefeated = true;
    return damage;
}

function patchPendingSkillCheck(gameState, spec) {
    const history = gameState.chatHistory || [];
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        const calls = msg && msg.tool_calls;
        if (!Array.isArray(calls)) continue;
        const tc = calls.find((t) => t && t.function && t.function.name === 'request_skill_check' && !t.isResolved);
        if (!tc) continue;
        tc.skill_name = spec.skill;
        tc.target_name = spec.roller;
        tc.function.arguments = JSON.stringify({ skill_name: spec.skill, target_name: spec.roller });
        if (spec.prompt) msg.content = spec.prompt;
        return;
    }
}

/**
 * CoC 7e: defender picks dodge OR fight back, never both.
 * Updates the pending combat_react spec and the open dice-panel skill.
 */
export function setCombatReactAction(gameState, action, opts = {}) {
    const spec = gameState && gameState.pendingRuleCheck;
    if (!spec || spec.kind !== 'combat_react') return null;
    if (action === 'counter') {
        if (spec.ranged) return spec;
        spec.action = 'counter';
        spec.skill = opts.skill || '斗殴';
        spec.prompt = `【反击】${spec.roller} 放弃闪避，请进行【${spec.skill}】检定。成功等级必须高于攻击才能打中。`;
    } else {
        spec.action = 'dodge';
        spec.skill = '闪避';
        spec.prompt = `【闪避】${spec.roller} 请进行闪避检定。成功等级不低于攻击则避开。`;
    }
    patchPendingSkillCheck(gameState, spec);
    return spec;
}

function toPreRolled(rollMeta) {
    return {
        success: !!rollMeta.success,
        level: rollMeta.level,
        rolledValue: rollMeta.rolledValue,
        targetValue: rollMeta.targetValue,
        skillValue: rollMeta.targetValue
    };
}

function pushAlert(gameState, content) {
    gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content });
}

function consumeNamedItem(gameState, itemName) {
    const raw = String(itemName || '').trim();
    if (!raw || /急救箱/.test(raw)) return false;
    if (!/急救包|绷带|吗啡|止痛|医药/.test(raw)) return false;
    const labelOf = (invItem) => (typeof invItem === 'string' ? invItem : (invItem && invItem.name) || '');
    // Prefer exact match so "绷带" does not consume a longer compound name first.
    let idx = (gameState.inventory || []).findIndex((invItem) => labelOf(invItem) === raw);
    if (idx === -1) {
        idx = (gameState.inventory || []).findIndex((invItem) => {
            const label = labelOf(invItem);
            return label.includes(raw) || raw.includes(String(label).trim());
        });
    }
    if (idx === -1) return false;
    gameState.inventory.splice(idx, 1);
    return true;
}

function applyPendingSpec(gameState, spec, rollMeta, Engine) {
    const pre = toPreRolled(rollMeta);
    if (spec.kind === 'heal') {
        const target = findChar(gameState, spec.target);
        const healer = findChar(gameState, spec.healer) || target;
        if (!target || !Engine?.HealingEngine) return '治疗无法结算。';
        const result = Engine.HealingEngine.applyHealing(target, spec.item, healer, pre, { isPush: !!spec.isPush });
        if (result.success) {
            consumeNamedItem(gameState, spec.itemName);
            pushAlert(gameState, `💖 [治疗] ${target.name} ${result.message}` + (result.majorWoundRemoved ? ' 重伤已稳定。' : ''));
        } else {
            pushAlert(gameState, `💊 [治疗失败] ${result.message}`);
        }
        return result.message;
    }
    if (spec.kind === 'san') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.SanityEngine?.applySanCheckResult) return 'SAN 无法结算。';
        const capKey = spec.capKey || null;
        const result = (capKey && typeof Engine.SanityEngine.applyCappedSanLoss === 'function')
            ? Engine.SanityEngine.applyCappedSanLoss(gameState, c, capKey, spec.notation, !!rollMeta.success, { ...pre, deferInt: true })
            : Engine.SanityEngine.applySanCheckResult(c, !!rollMeta.success, spec.notation, spec.cause || '目睹', { ...pre, deferInt: true });
        if (gameState.combat && gameState.combat.active && result.sanLoss > 0) {
            gameState.combat.sanLostThisFight = (Number(gameState.combat.sanLostThisFight) || 0) + result.sanLoss;
        }
        const flavor = Engine.SanityEngine.getSanNarrative?.(result.sanLoss);
        pushAlert(gameState, `🧠 [SAN检定] ${result.description}` + (flavor?.text ? ` ${flavor.text}` : ''));
        if (result.needsIntCheck) {
            pauseForRuleCheck(gameState, {
                kind: 'int_temp',
                skill: '智力',
                roller: c.name,
                target: c.name,
                prompt: `【理智冲击】${c.name} 请进行智力检定。失败则陷入临时疯狂。`
            });
        }
        return result.description;
    }
    if (spec.kind === 'tome_san') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.MythosEngine) return '典籍研读无法结算。';
        const result = spec.weeks
            ? Engine.MythosEngine.fullStudy(c, spec.tomeKey, spec.weeks, pre)
            : Engine.MythosEngine.initialBrowse(c, spec.tomeKey, pre);
        const tome = Engine.MythosEngine._tomes?.()?.[spec.tomeKey];
        const stage = spec.weeks ? (result.completed ? 'complete' : 'reading') : 'initial';
        const ritual = (tome && Engine.SanityEngine?.getTomeNarrative) ? Engine.SanityEngine.getTomeNarrative(tome, stage) : '';
        pushAlert(gameState, `📖 [典籍] ${result.description}` + (ritual ? ` ${ritual}` : ''));
        if (result.needsIntCheck) {
            pauseForRuleCheck(gameState, {
                kind: 'int_temp',
                skill: '智力',
                roller: c.name,
                target: c.name,
                prompt: `【理智冲击】${c.name} 请进行智力检定。失败则陷入临时疯狂。`
            });
        }
        return result.description;
    }
    if (spec.kind === 'social_opposed') {
        const actor = findChar(gameState, spec.roller || spec.target);
        if (!actor || !Engine?.resolveSocial) return '社交对抗无法结算。';
        const socialEnemies = (gameState.combat && gameState.combat.enemies) || [];
        const socialEnemy = resolveEnemy(socialEnemies, spec.npcName, {
            required: false, preferLiving: true, allowFirstFallback: false, roleLabel: 'NPC'
        });
        let npc = (socialEnemy.ok && socialEnemy.enemy && socialEnemy.enemy.attrs) ? socialEnemy.enemy : null;
        if (!npc) {
            npc = socialEnemies.find((e) => e && e.attrs && (e.name === spec.npcName || e._rosterName === spec.npcName));
        }
        if (!npc) npc = (gameState.npcRegistry || []).find((n) => n && n.name === spec.npcName);
        if (!npc) return '错误：找不到 NPC「' + (spec.npcName || '') + '」，无法社交对抗。';
        const result = Engine.resolveSocial(actor, npc, spec.socialKind || spec.skill || 'persuade', {
            preRolledActor: pre,
            opponent_value: spec.opponentValue,
            resistSkill: spec.resistSkill,
            pushed: !!spec.pushed,
            pushed_reason: spec.pushedReason
        });
        pushAlert(gameState, `🗣️ [${result.actorSkill || spec.skill}] ${result.desc}`
            + (result.actorRes && result.npcLevel ? `（${result.actorRes.level} vs ${result.npcLevel}）` : ''));
        if (spec.fromNegotiate) {
            const settle = settleNegotiateFromSocial(gameState, spec, result);
            if (settle.outcome === 'talk' || settle.outcome === 'hold') tryAdvanceTurn();
        }
        return result.desc;
    }
    if (spec.kind === 'bonus_penalty') {
        const extras = [];
        if (spec.bonusDice) extras.push(`${spec.bonusDice}奖励骰`);
        if (spec.penaltyDice) extras.push(`${spec.penaltyDice}惩罚骰`);
        const tail = extras.length ? `（${extras.join('、')}）` : '';
        const msg = `${spec.roller} 的【${spec.skill}】检定${tail}：${pre.level}（${pre.rolledValue}/${pre.targetValue}）。`;
        pushAlert(gameState, `🎲 ${msg}`);
        return msg;
    }
    if (spec.kind === 'luck_recover') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.recoverLuck) return '运气恢复无法结算。';
        if (pre.success) {
            const msg = `${c.name} 运气检定成功（${pre.rolledValue}/${pre.targetValue}），本场不恢复运气。`;
            pushAlert(gameState, `🍀 ${msg}`);
            return msg;
        }
        const result = Engine.recoverLuck(c);
        pushAlert(gameState, `🍀 ${result.message || (c.name + ' 恢复了运气。')}`);
        return result.message || `${c.name} 恢复了运气。`;
    }
    if (spec.kind === 'opposed_roll') {
        const actor = findChar(gameState, spec.roller);
        if (!actor || !Engine?.checkSkill) return '对抗无法结算。';
        const explicitOpp = spec.opponentValue != null && spec.opponentValue !== '' && Number.isFinite(Number(spec.opponentValue));
        const difficulty = spec.difficulty || 'normal';
        let opponentName = spec.opponentName ? String(spec.opponentName).trim() : '';
        if (!explicitOpp && !opponentName) {
            const others = listOtherParticipants(gameState, spec.roller);
            if (others.length !== 1) return '须指定对手';
            opponentName = others[0];
        }
        let oppTarget = null;
        if (explicitOpp) {
            oppTarget = { name: opponentName || '对手', skills: { [spec.skill]: Number(spec.opponentValue) } };
        } else if (opponentName) {
            oppTarget = findChar(gameState, opponentName);
            if (!oppTarget) {
                const oppEnemies = (gameState.combat && gameState.combat.enemies) || [];
                const oppEnemy = resolveEnemy(oppEnemies, opponentName, {
                    required: false, preferLiving: true, allowFirstFallback: false, roleLabel: '对手'
                });
                if (oppEnemy.ok) oppTarget = oppEnemy.enemy;
            }
            if (!oppTarget) {
                oppTarget = (gameState.npcRegistry || []).find((n) => n && n.name === opponentName) || null;
            }
        }
        if (!oppTarget) return '找不到对手：' + (opponentName || '未指定');
        const opp = Engine.checkSkill(spec.skill, oppTarget, difficulty, { skipStatusMods: true });
        let winner = '平局';
        if (pre.success && !opp.success) winner = spec.roller;
        else if (!pre.success && opp.success) winner = opponentName;
        else if (pre.success && opp.success) {
            const cmp = Engine.CombatEngine && typeof Engine.CombatEngine.compareSuccess === 'function'
                ? Engine.CombatEngine.compareSuccess(pre.level, opp.level)
                : 0;
            if (cmp > 0) winner = spec.roller;
            else if (cmp < 0) winner = opponentName;
            else winner = (pre.skillValue || pre.targetValue || 0) >= (opp.skillValue || opp.targetValue || 0) ? spec.roller : opponentName;
        }
        const label = spec.opposedLabel || spec.skill;
        const msg = `对抗·${label}：${spec.roller} ${pre.level}（${pre.rolledValue}/${pre.targetValue}）vs ${opponentName || '对手'} ${opp.level}（${opp.rolledValue}/${opp.skillValue}）→ ${winner}`;
        pushAlert(gameState, `⚔️ ${msg}`);
        return `对抗结果：${winner} 胜出`;
    }
    if (spec.kind === 'group_skill') {
        const results = (spec.groupResults || []).concat([{
            name: spec.roller,
            roll: pre.rolledValue,
            skillVal: pre.skillValue || pre.targetValue,
            level: pre.level,
            success: !!pre.success
        }]);
        if (spec.groupQueue && spec.groupQueue.length) {
            const next = spec.groupQueue[0];
            pauseForRuleCheck(gameState, {
                kind: 'group_skill',
                skill: spec.skill,
                roller: next,
                target: next,
                groupQueue: spec.groupQueue.slice(1),
                groupResults: results,
                groupContext: spec.groupContext || '',
                prompt: `【群体检定】${next} 请进行【${spec.skill}】检定。`
            });
            return `${spec.roller}：${pre.level}`;
        }
        const summary = results.map((r) => `${r.name}:${r.level}`).join('，');
        pushAlert(gameState, `🎲 【群体·${spec.skill}】${summary}`);
        return summary;
    }
    if (spec.kind === 'spell_pow') {
        const caster = findChar(gameState, spec.roller);
        if (!caster || !Engine?.MythosEngine?.castSpell) return '施法无法结算。';
        const target = findChar(gameState, spec.spellTargetName)
            || findEnemy(gameState, spec.spellTargetName);
        const assistants = (spec.assistantNames || []).map((n) => findChar(gameState, n)).filter((a) => a && a.name !== caster.name);
        const result = Engine.MythosEngine.castSpell(caster, spec.spellName, target, {
            ritualComplete: spec.ritualComplete,
            assistants,
            preCasterPow: pre,
            formName: spec.formName || ''
        });
        const fin = applySpellCastResult(gameState, Engine, result, target, caster);
        return fin.desc;
    }
    if (spec.kind === 'drown_con') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.ConditionsEngine?.applyDrowningCon) return '溺水无法结算。';
        const result = Engine.ConditionsEngine.applyDrowningCon(c, pre);
        if (result.passed) {
            pushAlert(gameState, `🌊 [溺水] ${c.name} 体质检定成功，这一轮撑住了。`);
            return `${c.name} 溺水体质检定成功。`;
        }
        pushAlert(gameState, `🌊 [溺水] ${c.name} 呛水，受到 ${result.damage || 0} 点伤害（HP: ${c.hp}）。`);
        const follow = damageFollowUpSpec(c, result);
        if (follow) pauseForRuleCheck(gameState, follow);
        return `${c.name} 溺水受伤 ${result.damage || 0} 点。`;
    }
    if (spec.kind === 'fall_jump') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.EnvironmentalEngine) return '坠落无法结算。';
        const result = Engine.EnvironmentalEngine.fallDamage(spec.feet, c, pre);
        if (result.damage > 0 && Engine.MajorWoundEngine && Engine.MajorWoundEngine.dealDamage) {
            const applied = Engine.MajorWoundEngine.dealDamage(c, result.damage);
            pushAlert(gameState, `🪨 [坠落] ${result.desc}（HP: ${c.hp}）`);
            const follow = damageFollowUpSpec(c, applied);
            if (follow) pauseForRuleCheck(gameState, follow);
        } else {
            pushAlert(gameState, `🪨 [坠落] ${result.desc}`);
        }
        return result.desc;
    }
    if (spec.kind === 'int_temp') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.SanityEngine?.resolveTempInsanityCheck) return '智力检定无法结算。';
        const result = Engine.SanityEngine.resolveTempInsanityCheck(c, pre);
        pushAlert(gameState, result.description || `🧠 [智力] ${c.name} 完成了理智冲击检定。`);
        return result.description;
    }
    if (spec.kind === 'poison_resist') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.PoisonEngine) return '抗毒无法结算。';
        const resist = Engine.PoisonEngine.resistCheck(c, spec.potency || 'moderate', pre);
        if (resist.success) {
            pushAlert(gameState, `☠️ [抗毒] ${c.name} 体质检定成功，毒素被压下。`);
            return resist;
        }
        const round = gameState.combat?.round || 1;
        const tick = Engine.PoisonEngine.processPoisonTick(c, round);
        pushAlert(gameState, `☠️ [抗毒失败] ${c.name} 未能抵抗毒素。` + (tick.damage > 0 ? ` 受到 ${tick.damage} 点伤害（HP: ${c.hp}）。` : ''));
        const follow = damageFollowUpSpec(c, tick);
        if (follow) pauseForRuleCheck(gameState, follow);
        return resist;
    }
    if (spec.kind === 'therapy') {
        const patient = findChar(gameState, spec.target);
        const therapist = findChar(gameState, spec.therapist) || patient;
        if (!patient || !Engine?.SanityEngine) return '精神分析无法结算。';
        const result = Engine.SanityEngine.applyTherapy(patient, therapist, pre, { cureTarget: spec.cureTarget });
        if (result.needsSanRoll) {
            pushAlert(gameState, `🛋️ [精神分析] ${result.desc}`);
            pauseForRuleCheck(gameState, {
                kind: 'therapy_cure',
                skill: 'SAN',
                roller: patient.name,
                target: patient.name,
                cureTarget: spec.cureTarget,
                prompt: `请进行【SAN】检定（${patient.name}）。成功即摆脱「${spec.cureTarget}」，大失败再失 1D6 SAN。`
            });
            return result.desc;
        }
        if (!result.recovered) {
            pushAlert(gameState, `🛋️ [治疗失败] ${result.desc || '精神分析失败，未恢复 SAN。'}`);
        } else {
            pushAlert(gameState, `🧠 [精神分析] ${result.desc}`);
        }
        return result.desc;
    }
    if (spec.kind === 'therapy_cure') {
        const patient = findChar(gameState, spec.target);
        if (!patient || !Engine?.SanityEngine?.resolveTherapyCure) return '治疗检定无法结算。';
        const result = Engine.SanityEngine.resolveTherapyCure(patient, spec.cureTarget, pre);
        pushAlert(gameState, `${result.cured ? '🧠 [治愈]' : '🛋️ [治疗未果]'} ${result.desc}`);
        return result.desc;
    }
    if (spec.kind === 'wound_recovery') {
        const c = findChar(gameState, spec.target);
        if (!c) return '战后重伤检定无法结算。';
        if (!c.status) c.status = {};
        if (rollMeta.success) {
            pushAlert(gameState, `🩹 [战后] ${c.name} 体质检定成功，伤势暂时稳住。`);
        } else {
            pushAlert(gameState, `🩹 [战后] ${c.name} 体质检定失败，伤势仍需处置。`);
        }
        flushAftermathToRuleCheck(gameState, Engine);
        return `${c.name} 战后重伤检定（${rollMeta.level || (rollMeta.success ? '成功' : '失败')}）。`;
    }
    if (spec.kind === 'san_aftershock') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.SanityEngine?.applySanCheckResult) return '战后余震无法结算。';
        const notation = spec.sanCheck || '0/1';
        const result = Engine.SanityEngine.applySanCheckResult(c, !!rollMeta.success, notation, '战后余震', { ...pre, deferInt: true });
        pushAlert(gameState, `🧠 [战后余震] ${result.description}`);
        flushAftermathToRuleCheck(gameState, Engine);
        return result.description;
    }
    if (spec.kind === 'dying') {
        const c = findChar(gameState, spec.target);
        if (!c) return '濒死检定无法结算。';
        if (!c.status) c.status = {};
        const result = Engine?.MajorWoundEngine?.dyingCheck
            ? Engine.MajorWoundEngine.dyingCheck(c, pre)
            : { passed: !!rollMeta.success };
        if (result.passed) {
            c.status.isDying = true;
            pushAlert(gameState, `💀 [濒死] ${result.description || (c.name + ' 体质检定成功，暂时撑住了。')}`);
            return `${c.name} 濒死但未死亡。`;
        }
        c.status.isDead = true;
        c.isActive = false;
        pushAlert(gameState, `💀 [死亡] ${result.description || (c.name + ' 体质检定失败，生命之火熄灭了。')}`);
        return `${c.name} 死亡。`;
    }
    if (spec.kind === 'major_wound_con') {
        const c = findChar(gameState, spec.target);
        if (!c) return '重伤清醒检定无法结算。';
        if (!c.status) c.status = {};
        if (rollMeta.success) {
            pushAlert(gameState, `⚠️ [重伤] ${c.name} 体质检定成功，勉强保持清醒。`);
            return `${c.name} 重伤但保持清醒。`;
        }
        c.status.isUnconscious = true;
        pushAlert(gameState, `💤 [昏迷] ${c.name} 体质检定失败，因剧痛失去意识。`);
        return `${c.name} 昏迷。`;
    }
    if (spec.kind === 'combat_react') {
        const defender = findChar(gameState, spec.target);
        if (!defender || !Engine?.CombatEngine) return '战斗反应无法结算。';
        const enemy = findEnemy(gameState, spec.attackerName) || {
            name: spec.attackerName || '敌人', isEnemy: true, skills: {}, armor: 0
        };
        if (!enemy.isEnemy) enemy.isEnemy = true;
        const weapon = {
            skill: spec.attackSkill || '斗殴',
            damage: spec.damageDice || '1D3',
            type: spec.ranged ? 'firearm' : 'melee',
            impale: spec.ranged ? true : undefined
        };
        let preDefense = pre;
        const reactAct = spec.action === 'counter' ? 'melee' : 'dodge';
        if (Engine.canAct) {
            const gate = Engine.canAct(defender, reactAct);
            if (gate && gate.ok === false) {
                preDefense = {
                    success: false,
                    level: '失败',
                    rolledValue: 100,
                    targetValue: 1,
                    skillValue: 0
                };
                pushAlert(gameState, `⚠️ [无法反应] ${gate.desc || (defender.name + ' 无法闪避/反击，攻击直中。')}`);
            }
        }
        const coverSit = (defender.status && defender.status.cover)
            ? { cover: defender.status.cover, targetCover: defender.status.cover, coverDetail: defender.status.cover }
            : {};
        const result = Engine.CombatEngine.autoResolveExchange(enemy, defender, weapon, {
            updateEnemy: (name, hp) => {
                if (hp < 0) applyEnemyHp(findEnemy(gameState, name) || enemy, -hp);
            },
            update_character_status: (handlerArgs) => {
                const t = findChar(gameState, handlerArgs.target_name);
                if (!t || !handlerArgs.hp_change || handlerArgs.hp_change >= 0) return;
                if (!Engine.MajorWoundEngine) return;
                const applied = Engine.MajorWoundEngine.dealDamage(t, -handlerArgs.hp_change);
                const follow = damageFollowUpSpec(t, applied);
                if (follow) pauseForRuleCheck(gameState, follow);
            }
        }, {
            action: spec.action === 'counter' ? 'counter' : undefined,
            preRolledAttack: spec.attackRes,
            preRolledDefense: preDefense,
            counterSkill: spec.skill || '斗殴',
            counterDamage: spec.counterDamage || '1D3',
            flatDamage: spec.flatDamage,
            situation: coverSit,
            onCoverUpdate: (nextCover) => {
                if (!defender.status) defender.status = {};
                defender.status.cover = nextCover || null;
            }
        });
        applyHitRiders(Engine, defender, spec.riderText || spec.damageDice, result);
        pushAlert(gameState, `⚔️ ${result.msg}`);
        tryAdvanceTurn();
        return result.msg;
    }
    if (spec.kind === 'combat_attack') {
        if (spec.scenarioCombatCfg) {
            const cfg = spec.scenarioCombatCfg;
            applyScenarioEffects({
                gameState,
                Engine,
                pushSystem: (t) => pushAlert(gameState, t),
                hurtEnemy: (foe, dmg) => applyEnemyHp(foe, dmg),
                ensureFlags: () => {
                    if (!gameState.scenarioRunner) gameState.scenarioRunner = { flags: {} };
                    if (!gameState.scenarioRunner.flags) gameState.scenarioRunner.flags = {};
                    return gameState.scenarioRunner.flags;
                }
            }, {
                combat: Object.assign({}, cfg, {
                    pendingRoll: false,
                    _resolvePending: true,
                    preRolledAttack: pre
                })
            }, spec.shooterName || spec.target);
            return '剧本交锋已结算。';
        }
        const shooter = findChar(gameState, spec.shooterName || spec.target);
        const enemy = findEnemy(gameState, spec.enemyName) || {
            name: spec.enemyName || '未知敌人', hp: 10, maxHp: 10, isEnemy: true
        };
        if (!shooter || !Engine?.CombatEngine) return '开火无法结算。';
        if (spec.burst) {
            const names = (Array.isArray(spec.enemyNames) && spec.enemyNames.length)
                ? spec.enemyNames
                : [spec.enemyName];
            const targets = names.map((n) => findEnemy(gameState, n)).filter((e) => isActiveCombatEnemy(e));
            if (!targets.length) return '连射无法结算。';
            const fireOpts = {
                preRolledAttack: pre,
                bonusDice: spec.bonusDice || 0,
                penaltyDice: spec.penaltyDice || 0,
                difficulty: spec.difficulty || 'normal',
                skipStatusMods: true,
                situation: spec.situation || {},
                onCoverUpdate: (nextCover, _soak, who) => {
                    const holder = who || targets[0];
                    if (!holder.status) holder.status = {};
                    holder.status.cover = nextCover || null;
                }
            };
            let burstResult;
            if (spec.sweep && targets.length > 1 && Engine.CombatEngine.resolveSweepFire) {
                burstResult = Engine.CombatEngine.resolveSweepFire(
                    shooter, targets, spec.weapon, spec.rounds, spec.mode, fireOpts
                );
                (burstResult.perTarget || []).forEach((pt) => {
                    if (!pt || pt.blocked || !(pt.damage > 0)) return;
                    applyEnemyHp(pt.target || findEnemy(gameState, pt.name), pt.damage);
                });
            } else {
                burstResult = Engine.CombatEngine.resolveBurstFire(
                    shooter, targets[0], spec.weapon, spec.rounds, spec.mode, fireOpts
                );
                if (burstResult.totalDamage > 0) applyEnemyHp(targets[0], burstResult.totalDamage);
            }
            if (spec.riderText) {
                const holder = (burstResult.perTarget && burstResult.perTarget[0] && burstResult.perTarget[0].target) || targets[0];
                applyHitRiders(Engine, holder, spec.riderText, {
                    winner: 'attacker',
                    damage: burstResult.totalDamage,
                    description: burstResult.description
                });
            }
            pushAlert(gameState, `🔫 ${burstResult.description}`);
            tryAdvanceTurn();
            return burstResult.description;
        }
        const result = Engine.CombatEngine.autoResolveExchange(shooter, enemy, spec.weapon, {
            updateEnemy: (name, hp) => {
                if (hp < 0) applyEnemyHp(findEnemy(gameState, name) || enemy, -hp);
            },
            update_character_status: (handlerArgs) => {
                const t = findChar(gameState, handlerArgs.target_name);
                if (!t || !handlerArgs.hp_change || handlerArgs.hp_change >= 0) return;
                if (!Engine.MajorWoundEngine) return;
                const applied = Engine.MajorWoundEngine.dealDamage(t, -handlerArgs.hp_change);
                const follow = damageFollowUpSpec(t, applied);
                if (follow) pauseForRuleCheck(gameState, follow);
            }
        }, {
            preRolledAttack: pre,
            bonusDice: spec.bonusDice || 0,
            penaltyDice: spec.penaltyDice || 0,
            difficulty: spec.difficulty || 'normal',
            distance: spec.distance,
            pointBlank: !!spec.pointBlank,
            situation: (function() {
                const sit = Object.assign({}, spec.situation || {});
                const targetCover = (enemy.status && enemy.status.cover) || sit.targetCover || sit.cover || null;
                if (targetCover) {
                    sit.cover = targetCover;
                    sit.targetCover = targetCover;
                }
                if (sit.cover && typeof sit.cover === 'object') sit.coverDetail = sit.cover;
                else if (sit.cover && Engine.CombatEngine.normalizeCover) {
                    sit.coverDetail = Engine.CombatEngine.normalizeCover(sit.cover);
                }
                return sit;
            })(),
            onCoverUpdate: (nextCover) => {
                if (!enemy.status) enemy.status = {};
                enemy.status.cover = nextCover || null;
            }
        });
        applyHitRiders(Engine, enemy, spec.riderText || (spec.weapon && spec.weapon.damage), result);
        pushAlert(gameState, `⚔️ ${result.msg}`);
        tryAdvanceTurn();
        return result.msg;
    }
    if (spec.kind === 'dodge_maneuver') {
        const c = findChar(gameState, spec.target);
        if (!c) return '闪避无法结算。';
        const ok = !!rollMeta.success;
        pushAlert(gameState, ok
            ? `🛡️ [闪避] ${c.name} 闪避成功（${rollMeta.level}）。`
            : `🛡️ [闪避] ${c.name} 闪避失败（${rollMeta.level}）。`);
        tryAdvanceTurn();
        return ok ? `${c.name} 闪避成功。` : `${c.name} 闪避失败。`;
    }
    if (spec.kind === 'maneuver') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.resolveManeuver) return '机动无法结算。';
        const enemy = findEnemy(gameState, spec.enemyName) || {
            name: spec.enemyName || '敌人', isEnemy: true, skills: { '斗殴': 40 }
        };
        const result = Engine.resolveManeuver(c, enemy, spec.maneuverKind || 'grapple', {
            skill: spec.skill || '斗殴',
            difficulty: spec.difficulty || 'normal',
            preRolledAttack: pre
        });
        pushAlert(gameState, `⚔️ [${spec.maneuverKind || 'maneuver'}] ${result.msg}`);
        tryAdvanceTurn();
        return result.msg;
    }
    if (spec.kind === 'chase_speed') {
        const state = gameState.chase;
        if (!state || !Engine?.ChaseEngine) return '追逐速度检定无法结算。';
        if (!state.active) return '追逐已结束，本次速度检定作废。';
        const part = Engine.ChaseEngine.find(state, spec.target);
        if (!part) return '找不到追逐参与者。';
        const applied = Engine.ChaseEngine.applySpeedResult(part, pre);
        pushAlert(gameState, `🏃 [速度] ${applied.desc}`);
        const queue = gameState.pendingRuleChecks || [];
        const moreSpeed = (gameState.pendingRuleCheck && gameState.pendingRuleCheck.kind === 'chase_speed')
            || queue.some((q) => q && q.kind === 'chase_speed');
        if (!moreSpeed) {
            state.speedResolved = true;
            (state.participants || []).forEach((p) => {
                if (p) p.actionsLeft = Engine.ChaseEngine.actionsFor(p, state);
            });
            pushAlert(gameState, '🏃 ' + Engine.ChaseEngine.describe(state));
        }
        return applied.desc;
    }
    if (spec.kind === 'chase_push' || spec.kind === 'chase_hazard' || spec.kind === 'chase_vehicle') {
        const state = gameState.chase;
        if (!state || !Engine?.ChaseEngine) return '追逐无法结算。';
        if (!state.active) return '追逐已结束，本次追逐检定作废。';
        const part = Engine.ChaseEngine.find(state, spec.target);
        if (!part) return '找不到追逐参与者。';
        let result;
        if (spec.kind === 'chase_vehicle') {
            result = Engine.ChaseEngine.applyVehicleMishap(part, pre, {
                state, kind: spec.vehicleKind || 'collide', damage: spec.hazardDamage
            });
        } else if (spec.kind === 'chase_hazard') {
            result = Engine.ChaseEngine.applyHazard(part, pre, {
                state, hazardKind: spec.hazardKind || state.hazardKind, damage: spec.hazardDamage
            });
        } else {
            result = Engine.ChaseEngine.applyPush(part, pre, state, {
                actorName: spec.actorName || spec.roller || spec.target
            });
        }
        const vehicleAbsorbed = !!(spec.kind === 'chase_vehicle' && part.vehicle);
        if (!vehicleAbsorbed && (result.stumble || result.damage > 0) && Engine.MajorWoundEngine) {
            const c = findChar(gameState, spec.target);
            if (c) {
                const dmg = result.damage > 0
                    ? result.damage
                    : (Engine.parseDice ? Engine.parseDice('1D3') : 2);
                const applied = Engine.MajorWoundEngine.dealDamage(c, dmg);
                pushAlert(gameState, `🏃 ${result.desc} 受到 ${dmg} 点伤害（HP: ${c.hp}）。`);
                const follow = damageFollowUpSpec(c, applied);
                if (follow) pauseForRuleCheck(gameState, follow);
            } else if (result.damage > 0) {
                const hit = applyChaseInjury(gameState, Engine, spec.target, result.damage);
                if (hit) pushAlert(gameState, `🏃 ${result.desc} 受到 ${result.damage} 点伤害（HP: ${hit.hp}）。`);
                else pushAlert(gameState, `🏃 ${result.desc}`);
            } else {
                pushAlert(gameState, `🏃 ${result.desc}`);
            }
        } else {
            pushAlert(gameState, `🏃 ${result.desc}`);
        }
        const ev = Engine.ChaseEngine.evaluate(state);
        if (ev.caught) {
            state.outcome = 'caught';
            pushAlert(gameState, '🏃 已追上，可 melee_attack / fire_weapon。');
        } else if (ev.escaped) {
            state.outcome = 'escaped';
            state.active = false;
            const voided = voidChaseRuleChecks(gameState);
            pushAlert(gameState, '🏃 猎物逃脱，追逐结束。'
                + (voided ? '（已作废 ' + voided + ' 个未掷的追逐检定）' : ''));
        }
        return result.desc;
    }
    if (spec.kind === 'extinguish') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.ConditionsEngine) return '灭火无法结算。';
        const result = Engine.ConditionsEngine.extinguish(c, pre);
        pushAlert(gameState, `🔥 ${result.desc}`);
        return result.desc;
    }
    if (spec.kind === 'treat_disease') {
        const c = findChar(gameState, spec.target);
        const healer = findChar(gameState, spec.roller) || c;
        if (!c || !Engine?.ConditionsEngine?.treatDisease) return '治病无法结算。';
        const result = Engine.ConditionsEngine.treatDisease(c, pre, {
            skill: spec.skill || '医学',
            healer
        });
        pushAlert(gameState, `🤒 ${result.desc}`);
        return result.desc;
    }
    if (spec.kind === 'major_wound_recover') {
        const c = findChar(gameState, spec.target);
        if (!c || !Engine?.HealingEngine) return '重伤恢复无法结算。';
        const result = Engine.HealingEngine.recoverMajorWoundWeek(c, pre);
        pushAlert(gameState, `🩹 ${result.desc}`);
        return result.desc;
    }
    return null;
}

export function damageFollowUpSpec(c, dmgResult) {
    if (!c || !dmgResult) return null;
    if (dmgResult.dying) {
        return {
            kind: 'dying',
            skill: '体质',
            roller: c.name,
            target: c.name,
            prompt: `【濒死】${c.name} 请进行体质检定。失败则死亡。`
        };
    }
    if (dmgResult.needsConsciousnessCheck) {
        return {
            kind: 'major_wound_con',
            skill: '体质',
            roller: c.name,
            target: c.name,
            prompt: `【重伤】${c.name} 请进行体质检定以保持清醒。失败则昏迷。`
        };
    }
    return null;
}

export function applySpellCastResult(gameState, Engine, result, target, caster) {
    if (!result) return { desc: '施法无法结算。', pause: null };
    let desc = result.description || '施法已结算。';
    let pause = null;
    if (result.success && !result.needsRitual && result.spellType === 'damage' && target) {
        let dmg = 0;
        const written = result.damage ? String(result.damage) : '';
        if (result.powOpposed === 'caster') dmg = Engine.parseDice ? Engine.parseDice(written || '2D6') : 7;
        else if (result.powOpposed === 'target') dmg = 0;
        else dmg = Engine.parseDice ? Engine.parseDice(written || '1D3') : 2;
        if (dmg > 0) {
            if (target.isEnemy) {
                applyEnemyHp(target, dmg);
                desc += ' 造成 ' + dmg + ' 点伤害。';
            } else if (Engine.MajorWoundEngine && Engine.MajorWoundEngine.dealDamage) {
                const applied = Engine.MajorWoundEngine.dealDamage(target, dmg);
                desc += ' 造成 ' + dmg + ' 点伤害。';
                const follow = damageFollowUpSpec(target, applied);
                if (follow) pause = pauseForRuleCheck(gameState, follow);
            } else if (target.derived && typeof Engine.currentHp === 'function') {
                if (typeof Engine.syncHp === 'function') Engine.syncHp(target);
                target.hp = Math.max(0, Engine.currentHp(target) - dmg);
                if (typeof Engine.syncHp === 'function') Engine.syncHp(target);
                desc += ' 造成 ' + dmg + ' 点伤害。';
            }
        } else if (result.powOpposed === 'target') {
            desc += ' 目标抵抗成功，未受法术伤害。';
        }
    }
    if (result.success && !result.needsRitual && result.powOpposed !== 'target') {
        const effect = result.effect || '';
        if (target && (effect === 'petrify' || effect === 'eye_of_zombie')) {
            const rounds = Engine.parseDice ? Engine.parseDice(effect === 'eye_of_zombie' ? '1D3' : '1D6') : 1;
            if (!target.status) target.status = {};
            target.status.stunned = { roundsLeft: Math.max(1, rounds || 1) };
            desc += ' 目标无法行动 ' + target.status.stunned.roundsLeft + ' 轮。';
        } else if (target && effect === 'mind_control') {
            const rounds = Engine.parseDice ? Engine.parseDice('1D6') : 1;
            if (!target.status) target.status = {};
            target.status.controlled = { roundsLeft: Math.max(1, rounds || 1), by: caster && caster.name };
            desc += ' 目标被控制 ' + target.status.controlled.roundsLeft + ' 轮。';
        } else if (target && (effect === 'resurrection' || effect === 'create_zombie')) {
            if (!target.isDefeated) {
                desc += ' 法术失败：目标尚未倒下。';
            } else {
                raiseCorpse(Engine, target, caster, effect === 'create_zombie');
                desc += effect === 'create_zombie' ? ' 尸体成为僵尸仆从。' : ' 死者作为仆从站起。';
            }
        } else if (effect === 'yellow_sign' && caster) {
            if (!caster.status) caster.status = {};
            caster.status.yellowSign = true;
            const expr = result.sightSan || '0/1D6';
            const watchers = ((gameState.combat && gameState.combat.enemies) || [])
                .filter((e) => isActiveCombatEnemy(e));
            watchers.forEach((e) => {
                if (Engine.SanityEngine && Engine.SanityEngine.applySanCheckResult) {
                    const san = Engine.SanityEngine.applySanCheckResult(e, null, expr, '黄印');
                    if (san && san.description) desc += ' ' + san.description;
                }
            });
        } else if (effect === 'transformation' && caster) {
            const formName = result.formName;
            if (!formName) {
                desc += ' 未指定生物外形，未变形。';
            } else {
                const form = generateNpcFromTemplate(formName);
                if (!form) desc += ' 没有可用的生物卡。';
                else {
                    beginTransformation(gameState, Engine, caster, form);
                    desc += ' 变为' + (form.name || formName) + '。';
                }
            }
        } else if (effect === 'summon_byakhee' || effect === 'summon_ghoul' || effect === 'summon_star_spawn'
            || effect === 'summon_dark_young' || effect === 'summon_glaaki_servant' || effect === 'summon_hastur_avatar') {
            const key = {
                summon_byakhee: '拜亚基',
                summon_ghoul: '食尸鬼',
                summon_star_spawn: '克苏鲁的星之眷族',
                summon_dark_young: '黑山羊幼崽',
                summon_glaaki_servant: '格拉基仆从',
                summon_hastur_avatar: '哈斯塔化身'
            }[effect];
            const spawned = generateNpcFromTemplate(key);
            if (!spawned) {
                desc += ' 没有可用的生物卡。';
            } else if (gameState.combat && gameState.combat.active) {
                if (!Array.isArray(gameState.combat.enemies)) gameState.combat.enemies = [];
                gameState.combat.enemies.push(spawned);
                desc += ' ' + (spawned.name || key) + ' 出现在战场上。';
            } else {
                desc += ' ' + (spawned.name || key) + ' 被召来。';
            }
        }
    }
    pushAlert(gameState, `✨ [法术] ${desc}`);
    if (result.success && !result.needsRitual && result.needsIntCheck && caster) {
        const intPause = pauseForRuleCheck(gameState, {
            kind: 'int_temp',
            skill: '智力',
            roller: caster.name,
            target: caster.name,
            prompt: `【理智冲击】${caster.name} 施法损失理智过多，请进行智力检定。失败则陷入临时疯狂。`
        });
        pause = pause || intPause;
    }
    return { desc, pause };
}

export function pauseForRuleCheck(gameState, spec) {
    if (!gameState.pendingRuleChecks) gameState.pendingRuleChecks = [];
    const queuedBehind = !!gameState.pendingRuleCheck;
    if (queuedBehind) {
        gameState.pendingRuleChecks.push(spec);
        // Do not return forceCheck — caller must not emit a second dice panel for queued specs.
        return {
            msg: (spec.prompt || `请进行【${spec.skill}】检定（${spec.roller}）。失败不产生效果。`)
                + '（已排队，待前序检定完成后提示）',
            forceCheck: null,
            queued: true
        };
    }
    gameState.pendingRuleCheck = spec;
    return {
        msg: spec.prompt || `请进行【${spec.skill}】检定（${spec.roller}）。失败不产生效果。`,
        forceCheck: {
            skill: spec.skill,
            target: spec.roller,
            bonusDice: spec.bonusDice || 0,
            penaltyDice: spec.penaltyDice || 0,
            difficulty: spec.difficulty || 'normal'
        }
    };
}

/** Enqueue a rule check and push the dice-panel chat message (for RoundTick etc.). */
export function enqueueRuleCheck(gameState, spec) {
    const pause = pauseForRuleCheck(gameState, spec);
    if (gameState.pendingRuleCheck === spec || !gameState.pendingRuleChecks?.length) {
        emitCheckMessage(gameState, spec);
    } else {
        // Queued behind an existing check — message will emit when prior resolves
    }
    return pause;
}

function emitCheckMessage(gameState, spec) {
    if (!spec || spec._emitted) return spec && (spec.prompt || '');
    spec._emitted = true;
    const skill = spec.skill;
    const target = spec.roller;
    const msg = spec.prompt || `请进行【${skill}】检定（${target}）。失败不产生效果。`;
    gameState.chatHistory.push({
        role: 'assistant',
        content: msg,
        tool_calls: [{
            id: 'rule_check_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'function',
            function: {
                name: 'request_skill_check',
                arguments: JSON.stringify({ skill_name: skill, target_name: target })
            },
            isResolved: false,
            target_name: target,
            skill_name: skill
        }],
        isResolved: false,
        _ruleCheck: true
    });
    return msg;
}

/**
 * Push a dice-panel request_skill_check from a tool handler forceCheck result
 * (same shape as ai_logic processTools forceCheck branch).
 */
export function emitForceCheckMessage(gameState, forceCheck, content) {
    if (!gameState || forceCheck == null) return null;
    const skill = typeof forceCheck === 'object' ? forceCheck.skill : forceCheck;
    const target = (typeof forceCheck === 'object' ? forceCheck.target : null)
        || selectedActiveNameFallback(gameState)
        || '调查员';
    if (!skill) return null;
    const msg = content || `请进行【${skill}】检定（${target}）。`;
    if (!Array.isArray(gameState.chatHistory)) gameState.chatHistory = [];
    gameState.chatHistory.push({
        role: 'assistant',
        content: msg,
        tool_calls: [{
            id: 'sys_force_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'function',
            function: {
                name: 'request_skill_check',
                arguments: JSON.stringify({ skill_name: skill, target_name: target })
            },
            isResolved: false,
            target_name: target,
            skill_name: skill
        }],
        isResolved: false,
        _ruleCheck: true
    });
    return { skill, target, msg };
}

/** Apply tool handler return value: push alert text + emit dice panel if forceCheck. */
export function applyToolForceCheck(gameState, result) {
    if (!result || typeof result !== 'object') {
        if (typeof result === 'string' && result) {
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: result });
        }
        return null;
    }
    if (result.msg) {
        gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: String(result.msg) });
    }
    if (result.forceCheck) {
        return emitForceCheckMessage(gameState, result.forceCheck, result.msg);
    }
    return null;
}

function specMatchesRoll(spec, rollMeta) {
    if (!spec || !rollMeta) return false;
    const skillOk = spec.skill === rollMeta.skill
        || (spec.skill === 'SAN' && (rollMeta.skill === 'SAN' || rollMeta.skill === '理智'));
    const rollerOk = !spec.roller || spec.roller === rollMeta.charName;
    if (!skillOk || !rollerOk) return false;
    // When both sides declare kind, refuse cross-apply (e.g. poison vs major_wound_con).
    const rollKind = rollMeta.ruleKind || rollMeta.kind || null;
    if (spec.kind && rollKind && spec.kind !== rollKind) return false;
    return true;
}

export function resolvePendingRuleCheck(gameState, rollMeta, Engine) {
    if (specMatchesRoll(gameState.pendingRuleCheck, rollMeta)) {
        const spec = gameState.pendingRuleCheck;
        gameState.pendingRuleCheck = (gameState.pendingRuleChecks || []).shift() || null;
        const result = applyPendingSpec(gameState, spec, rollMeta, Engine);
        if (gameState.pendingRuleCheck) emitCheckMessage(gameState, gameState.pendingRuleCheck);
        return result;
    }
    // Never resolve a queued spec while a different head is still pending.
    return null;
}

/** Chase is over: drop queued chase specs and close their dice panels. */
export function voidChaseRuleChecks(gameState) {
    if (!gameState) return 0;
    const isChase = (s) => !!(s && typeof s.kind === 'string' && s.kind.indexOf('chase_') === 0);
    const dropped = [];
    if (isChase(gameState.pendingRuleCheck)) {
        dropped.push(gameState.pendingRuleCheck);
        gameState.pendingRuleCheck = null;
    }
    gameState.pendingRuleChecks = (gameState.pendingRuleChecks || []).filter((s) => {
        if (!isChase(s)) return true;
        dropped.push(s);
        return false;
    });
    if (!dropped.length) return 0;
    if (!gameState.pendingRuleCheck) {
        gameState.pendingRuleCheck = gameState.pendingRuleChecks.shift() || null;
        if (gameState.pendingRuleCheck) emitCheckMessage(gameState, gameState.pendingRuleCheck);
    }
    (gameState.chatHistory || []).forEach((msg) => {
        if (!msg || !msg._ruleCheck || !Array.isArray(msg.tool_calls)) return;
        msg.tool_calls.forEach((t) => {
            if (!t || t.isResolved) return;
            const stale = dropped.some((s) => s.skill === t.skill_name && s.roller === t.target_name);
            if (stale) {
                t.isResolved = true;
                msg.isResolved = true;
            }
        });
    });
    return dropped.length;
}

export const CoCRuleCheck = {
    pauseForRuleCheck,
    applySpellCastResult,
    voidChaseRuleChecks,
    enqueueRuleCheck,
    resolvePendingRuleCheck,
    damageFollowUpSpec,
    setCombatReactAction,
    emitForceCheckMessage,
    applyToolForceCheck
};

if (typeof window !== 'undefined') {
    window.CoCRuleCheck = CoCRuleCheck;
}
