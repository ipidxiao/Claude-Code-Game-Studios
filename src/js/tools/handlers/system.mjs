// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { pauseForRuleCheck, damageFollowUpSpec, restoreExpiredForms } from '../../state/rule_check.mjs';
import { syncKpTimeFromWorldClock } from '../../campaign/kp_execution_engine.mjs';
import { applyScenarioEffects, validateEffects, pickOnlineEffects, pickTarget, resolveSanNotation } from '../../scenario/effects_apply.mjs';
import { resolveActor, resolveActorFromArgs, requireField, normalizeName } from '../resolve.mjs';
import { CoCEngine } from '../../coc.mjs';
import { DevLogs } from '../../data/dev_logs.mjs';

/**
 * CoC Tool Handlers: System / engine metadata domain (AUDITFIX8)
 */
export function system(ctx) {
    const { gameState, Engine, addJournalEntry, addClue, updateEnemy } = ctx;

    return {
        system_alert: (args) => {
            if (!args || typeof args.message !== 'string') {
                return '错误：警告内容须为非空字符串';
            }
            const msg = args.message.trim();
            if (!msg) return '错误：警告内容不能为空';
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `⚠️ ${msg}` });
            return '已警告';
        },

        apply_scenario_effects: (args) => {
            const Eng = Engine || CoCEngine;
            if (!Eng) return '错误：引擎未加载。';
            const raw = {
                sanCheck: args.sanCheck || args.san_check,
                combat: args.combat,
                chase: args.chase,
                enchantmentId: args.enchantmentId || args.enchantment_id,
                dispel: args.dispel,
                dispelMp: args.dispelMp != null ? args.dispelMp : args.dispel_mp,
                flags: args.flags
            };
            const effects = pickOnlineEffects(raw);
            if (!Object.keys(effects).length) {
                return '错误：须提供 sanCheck / combat / chase / enchantmentId / dispel / flags 之一。';
            }
            const v = validateEffects(effects, 'apply_scenario_effects');
            if (!v.ok) return '错误：' + v.errors.join('；');
            // A named target must exist: never redirect SAN / combat to someone else (resolveActor contract).
            // Omitted name keeps the documented default (selected / active investigator).
            if (normalizeName(args.target_name)) {
                const named = resolveActor(gameState, args.target_name, { roleLabel: '目标角色' });
                if (!named.ok) return named.error;
            }
            // Online KP never silent-rolls SAN — hand it to the dice panel instead.
            const sanCheckEffect = effects.sanCheck;
            delete effects.sanCheck;
            const msgs = [];
            const hooks = {
                gameState,
                Engine: Eng,
                pushSystem: (t) => {
                    msgs.push(String(t));
                    gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: t });
                },
                addJournalEntry,
                addClue,
                hurtEnemy: (foe, dmg) => {
                    const n = Number(dmg);
                    const delta = Number.isFinite(n) ? -Math.abs(n) : 0;
                    if (typeof updateEnemy === 'function') {
                        // updateEnemy(name, hpChange) — numeric delta, not an object patch
                        updateEnemy(foe.name, delta);
                    } else {
                        const nextHp = Math.max(0, (Number(foe.hp) || 0) + delta);
                        if (Eng && typeof Eng.mirrorCurrentHp === 'function') Eng.mirrorCurrentHp(foe, nextHp);
                        else foe.hp = nextHp;
                    }
                },
                grantItem: (it) => {
                    if (!gameState.inventory) gameState.inventory = [];
                    const name = it.name || it;
                    const qty = it.qty || 1;
                    for (let i = 0; i < qty; i++) {
                        gameState.inventory.push(typeof it === 'string' ? { name: it, qty: 1 } : Object.assign({}, it, { name, qty: 1 }));
                    }
                },
                ensureFlags: () => {
                    if (!gameState.scenarioRunner) gameState.scenarioRunner = { flags: {} };
                    if (!gameState.scenarioRunner.flags) gameState.scenarioRunner.flags = {};
                    return gameState.scenarioRunner.flags;
                }
            };
            const result = Object.keys(effects).length
                ? applyScenarioEffects(hooks, effects, args.target_name)
                : { messages: [], combat: null, chase: null, san: null };
            let pause = null;
            // Online mode has no scenario runner to consume out.combat.pending — settle it here.
            if (result.combat && result.combat.pending && result.combat.cfg) {
                const cfg = result.combat.cfg;
                const roller = pickTarget(gameState, args.target_name);
                if (roller && (cfg.attacker || 'pc') !== 'creature') {
                    const skill = cfg.weaponSkill || '斗殴';
                    pause = pauseForRuleCheck(gameState, {
                        kind: 'combat_attack',
                        skill,
                        roller: roller.name,
                        target: roller.name,
                        shooterName: roller.name,
                        enemyName: result.combat.foe.name,
                        weapon: cfg.weapon,
                        scenarioCombatCfg: cfg,
                        prompt: `【剧本交锋】请进行【${skill}】检定（${roller.name} → ${result.combat.foe.name}）。`
                    });
                } else {
                    // Creature swings: no player attack roll to wait for.
                    applyScenarioEffects(hooks, {
                        combat: Object.assign({}, cfg, { _resolvePending: true })
                    }, args.target_name);
                }
            }
            if (sanCheckEffect != null) {
                const target = pickTarget(gameState, args.target_name);
                if (target) {
                    const sanPause = pauseForRuleCheck(gameState, {
                        kind: 'san',
                        skill: 'SAN',
                        roller: target.name,
                        target: target.name,
                        notation: resolveSanNotation(sanCheckEffect),
                        cause: args.cause || '剧本目击',
                        prompt: `请进行【SAN】检定（${target.name}）。失败按大档扣理智。`
                    });
                    if (!pause) pause = sanPause;
                }
            }
            const summary = msgs.join(' ') || '剧本效果已结算。';
            addJournalEntry && addJournalEntry({ type: 'scenario_effects', summary });
            const tail = (result.combat && !result.combat.pending ? ' [交锋已结算]' : '') + (result.chase ? ' [追逐已启动]' : '');
            if (pause) return { msg: summary + tail + ' ' + pause.msg, forceCheck: pause.forceCheck };
            return summary + tail;
        },

        apply_environmental_damage: (args) => {
            const envGot = resolveActorFromArgs(gameState, args, ['target_name', 'character_name'], { required: true, roleLabel: '目标' });
            if (!envGot.ok) return envGot.error;
            const c = envGot.actor;
            const env = Engine.EnvironmentalEngine;
            const envType = args.type || args.kind;
            if (!envType || !String(envType).trim()) {
                return '错误：须提供 type 或 kind（环境伤害类型）';
            }
            let result;
            switch (envType) {
                case 'fall':
                    return pauseForRuleCheck(gameState, {
                        kind: 'fall_jump',
                        skill: '跳跃',
                        roller: c.name,
                        target: c.name,
                        feet: Number(args.value) || 0,
                        prompt: `【坠落】${c.name} 请进行跳跃检定。成功则伤害减半。`
                    });
                case 'fire': {
                    result = env.fireDamage(args.intensity || 'moderate');
                    if (args.ongoing !== false && Engine.applyCondition) {
                        Engine.applyCondition(c, 'burning', { intensity: args.intensity || 'moderate', roundsLeft: Number(args.rounds) || 3 });
                    }
                    break;
                }
                case 'drowning': {
                    const round = Math.max(1, Number(args.value) || 1);
                    if (Engine.applyCondition) {
                        Engine.applyCondition(c, 'drowning', { roundsHeld: round });
                    }
                    const half = Math.floor(((c.attrs && c.attrs.CON) || 50) / 2);
                    if (round <= half) {
                        return `${c.name} 仍在屏息（第 ${round} 轮 / ${half}）。`;
                    }
                    return pauseForRuleCheck(gameState, {
                        kind: 'drown_con',
                        skill: '体质',
                        roller: c.name,
                        target: c.name,
                        prompt: `【溺水】${c.name} 屏息已尽，请进行体质检定。失败受到 1D6 伤害。`
                    });
                }
                case 'electric': {
                    result = env.electricDamage(args.intensity || args.voltage || 'household');
                    if (result.stun && Engine.applyCondition) {
                        Engine.applyCondition(c, 'stunned', { roundsLeft: 1 });
                    }
                    break;
                }
                case 'explosion': {
                    const dice = args.dice || `${args.power || args.value || 2}D6`;
                    const dist = args.distance != null ? Number(args.distance) : (Number(args.value) || 0);
                    result = env.explosionDamage(dice, dist);
                    break;
                }
                case 'cold':
                    if (Engine.applyCondition) Engine.applyCondition(c, 'cold', { stage: Number(args.value) || 1 });
                    result = { damage: 0, desc: `${c.name} 进入寒冷阶段。` };
                    break;
                case 'heat':
                    if (Engine.applyCondition) Engine.applyCondition(c, 'heat', { stage: Number(args.value) || 1 });
                    result = { damage: 0, desc: `${c.name} 进入酷热阶段。` };
                    break;
                default: return '未知环境伤害类型: ' + envType;
            }
            if (result.damage > 0) {
                const statusResult = ctx.dispatch('update_character_status', {
                    target_name: c.name,
                    hp_change: -result.damage,
                    note: result.desc || envType
                });
                addJournalEntry && addJournalEntry({ type: 'combat', charName: c.name, summary: `${c.name} 受到环境伤害: ${result.desc}` });
                const base = `${c.name} 受到${envType}伤害${result.damage || 0}点（HP:${c.hp || (c.derived && c.derived.hp)}）。${result.desc || result.effect || ''}`;
                if (statusResult && typeof statusResult === 'object' && statusResult.forceCheck) {
                    return { msg: base + ' ' + (statusResult.msg || ''), forceCheck: statusResult.forceCheck };
                }
                return base;
            }
            return `${c.name} 受到${envType}伤害${result.damage || 0}点（HP:${c.hp || (c.derived && c.derived.hp)}）。${result.desc || result.effect || ''}`;
        },

        social_opposed: (args) => {
            // omit actor → active (intentional)
            const socialGot = resolveActorFromArgs(gameState, args, ['actor_name', 'character_name'], {
                allowActiveFallback: true, roleLabel: '调查员'
            });
            if (!socialGot.ok) return socialGot.error;
            const c = socialGot.actor;
            const npcField = requireField(args, 'npc_name', { label: 'npc_name 或 opponent_name', aliases: ['opponent_name'] });
            if (!npcField.ok) return npcField.error;
            const npcName = String(npcField.value);
            const kind = args.kind || args.skill_name || 'persuade';
            const meta = Engine.SocialEngine && Engine.SocialEngine.map
                ? (Engine.SocialEngine.map[kind] || Engine.SocialEngine.map[String(kind).toLowerCase()])
                : null;
            if (!meta || !meta.skill) {
                return '错误：未知社交类型「' + kind + '」。可用：charm/fast_talk/intimidate/persuade（或取悦/话术/恐吓/说服）';
            }
            const skill = meta.skill;
            return pauseForRuleCheck(gameState, {
                kind: 'social_opposed',
                skill,
                roller: c.name,
                target: c.name,
                npcName,
                socialKind: kind,
                opponentValue: args.opponent_value,
                resistSkill: args.resist_skill,
                pushed: !!args.pushed,
                pushedReason: args.pushed_reason,
                prompt: `【社交对抗】${c.name} 请进行【${skill}】检定（对 ${npcName}）。`
                    + (args.pushed ? ' 本次为推动。' : '')
            });
        },
        apply_poison: (args) => {
            const poisonGot = resolveActorFromArgs(gameState, args, ['target_name', 'character_name'], { required: true, roleLabel: '目标' });
            if (!poisonGot.ok) return poisonGot.error;
            const c = poisonGot.actor;
            const potField = requireField(args, 'potency', { label: 'potency' });
            if (!potField.ok) return potField.error;
            const potency = String(potField.value).trim().toLowerCase();
            if (!{ mild: 1, moderate: 1, lethal: 1 }[potency]) {
                return '错误：未知 potency「' + potField.value + '」。可用：mild / moderate / lethal';
            }
            const r = Engine.PoisonEngine.applyPoison(c, potency, args.delay_rounds || 0);
            addJournalEntry && addJournalEntry({ type: 'combat', charName: c.name, summary: `${c.name}: ${r.desc}` });
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `☠️ [中毒] ${r.desc} 须通过体质检定抵抗，不可直接宣布伤害。` });
            const pause = pauseForRuleCheck(gameState, {
                kind: 'poison_resist',
                skill: '体质',
                roller: c.name,
                target: c.name,
                potency,
                penaltyDice: { mild: 0, moderate: 1, lethal: 2 }[potency] || 0,
                prompt: `【中毒】${c.name} 请进行体质检定。失败才受到毒素伤害。`
            });
            return { msg: `${r.desc} ${pause.msg}`, forceCheck: pause.forceCheck };
        },
        resist_poison: (args) => {
            const resistGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '目标' });
            if (!resistGot.ok) return '找不到目标: ' + (String(args.target_name || '').trim() || '(空)');
            const c = resistGot.actor;
            if (!Engine?.PoisonEngine) return '错误：毒素引擎未加载。';
            const active = (c.poison || []).find((p) => p && p.active);
            if (!active) return `${c.name} 当前没有生效的毒素，无需抗毒检定。`;
            const potency = args.potency || active.potency || 'moderate';
            return pauseForRuleCheck(gameState, {
                kind: 'poison_resist',
                skill: '体质',
                roller: c.name,
                target: c.name,
                potency,
                penaltyDice: { mild: 0, moderate: 1, lethal: 2 }[potency] || 0,
                prompt: `【抗毒】${c.name} 请进行体质检定。失败才受到毒素伤害。`
            });
        },
        apply_disease: (args) => {
            const diseaseGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '目标' });
            if (!diseaseGot.ok) return '找不到目标: ' + (String(args.target_name || '').trim() || '(空)');
            const c = diseaseGot.actor;
            if (!Engine || !Engine.ConditionsEngine) return '错误：状态引擎未加载。';
            const result = Engine.applyCondition(c, 'disease', {
                diseaseId: args.disease_id || args.disease || args.disease_name,
                days: args.days,
                damagePerDay: args.damage_per_day
            });
            if (!result.ok) return '错误：' + result.desc;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🤒 ' + result.desc });
            addJournalEntry && addJournalEntry({ type: 'disease', charName: c.name, summary: result.desc });
            return result.desc;
        },
        apply_deprivation: (args) => {
            const depGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '目标' });
            if (!depGot.ok) return '找不到目标: ' + (String(args.target_name || '').trim() || '(空)');
            const c = depGot.actor;
            if (!Engine || !Engine.applyCondition) return '错误：状态引擎未加载。';
            // ConditionsEngine only tracks hunger/thirst — never silently fold sleep→hunger.
            const rawKind = String(args.kind || args.type || 'hunger').toLowerCase().trim();
            const allowed = { hunger: 'hunger', thirst: 'thirst' };
            if (rawKind === 'sleep' || rawKind === 'fatigue' || rawKind === 'exhausted') {
                return '错误：暂不支持睡眠/疲劳剥夺（kind=sleep）。可用：hunger、thirst。';
            }
            if (!allowed[rawKind]) {
                return '错误：未知剥夺类型「' + rawKind + '」。可用：hunger、thirst。';
            }
            const kind = allowed[rawKind];
            const result = Engine.applyCondition(c, kind, {
                daysWithout: args.days_without != null ? args.days_without : args.days
            });
            if (!result.ok) return '错误：' + result.desc;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🍽️ ' + result.desc });
            addJournalEntry && addJournalEntry({ type: 'deprivation', charName: c.name, summary: result.desc });
            return result.desc;
        },
        treat_disease: (args) => {
            const treatGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '目标' });
            if (!treatGot.ok) return '找不到目标: ' + (String(args.target_name || '').trim() || '(空)');
            const c = treatGot.actor;
            if (!Engine || !Engine.ConditionsEngine || !Engine.ConditionsEngine.treatDisease) {
                return '错误：疾病治疗未加载。';
            }
            if (!c.status || !c.status.disease) {
                return '错误：' + c.name + ' 当前未染病，无需治病。';
            }
            // omit healer → patient self (intentional)
            const healerGot = resolveActor(gameState, args.healer_name, {
                fallbackActor: c, roleLabel: '施治者'
            });
            if (!healerGot.ok) return healerGot.error;
            const healer = healerGot.actor;
            const skill = args.skill_name
                || (c.status.disease.treatSkill)
                || '医学';
            return pauseForRuleCheck(gameState, {
                kind: 'treat_disease',
                skill,
                roller: healer.name,
                target: c.name,
                prompt: `【治病】${healer.name} 请对 ${c.name} 进行【${skill}】检定。`
            });
        },
        process_poison_tick: (args) => {
            const tickGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '目标' });
            if (!tickGot.ok) return '找不到目标: ' + (String(args.target_name || '').trim() || '(空)');
            const c = tickGot.actor;
            if (!Engine?.PoisonEngine) return '错误：毒素引擎未加载。';
            const stillActive = (c.poison || []).some((p) => p && p.active);
            if (!stillActive) return `${c.name} 当前没有生效中的毒素（须先抵抗失败）。`;
            const round = Number(args.current_round) || gameState.combat?.round || 1;
            const r = Engine.PoisonEngine.processPoisonTick(c, round);
            if (r.damage > 0) {
                gameState.chatHistory.push({
                    role: 'system', isLocalOnly: true, isAlert: true,
                    content: `☠️ [毒素] ${c.name} 受到 ${r.damage} 点毒素伤害（HP: ${c.hp}）`
                });
                addJournalEntry && addJournalEntry({ type: 'hp_loss', charName: c.name, summary: `毒素伤害 ${r.damage}` });
            }
            const follow = damageFollowUpSpec(c, r);
            if (follow) {
                const pause = pauseForRuleCheck(gameState, follow);
                return { ...r, msg: pause.msg, forceCheck: pause.forceCheck };
            }
            return `${c.name} 毒素发作伤害 ${r.damage || 0} 点（HP: ${c.hp}）。`;
        },
        bonus_penalty_roll: (args) => {
            const skillName = args.skill_name || args.skill;
            if (!skillName || !String(skillName).trim()) {
                return '错误：bonus_penalty_roll 须提供 skill_name';
            }
            const bpGot = resolveActorFromArgs(gameState, args, ['target_name', 'character_name', 'actor_name'], { required: true, roleLabel: '目标' });
            if (!bpGot.ok) return bpGot.error;
            const c = bpGot.actor;
            if (Engine && typeof Engine.canAttemptSkill === 'function') {
                const gate = Engine.canAttemptSkill(gameState, {
                    charName: c.name,
                    skill: skillName,
                    situation: args.situation || null
                });
                if (gate && gate.ok === false) {
                    return `检定被拒绝：${gate.desc || '同一情境不可重复尝试'}`;
                }
            }
            const bonusRaw = args.bonus_dice != null ? args.bonus_dice : args.bonus;
            const penaltyRaw = args.penalty_dice != null ? args.penalty_dice : args.penalty;
            // 7e: bonus and penalty dice cancel, and the net is never more than two.
            const net = Math.max(-2, Math.min(2,
                Math.trunc(Math.max(0, Number(bonusRaw) || 0) - Math.max(0, Number(penaltyRaw) || 0))));
            const bonusDice = net > 0 ? net : 0;
            const penaltyDice = net < 0 ? -net : 0;
            const difficulty = args.difficulty || 'normal';
            const extras = [];
            if (bonusDice) extras.push(`${bonusDice}奖励骰`);
            if (penaltyDice) extras.push(`${penaltyDice}惩罚骰`);
            return pauseForRuleCheck(gameState, {
                kind: 'bonus_penalty',
                skill: skillName,
                roller: c.name,
                target: c.name,
                bonusDice,
                penaltyDice,
                difficulty,
                situation: args.situation || null,
                prompt: `请进行【${skillName}】检定（${c.name}）`
                    + (extras.length ? `（${extras.join('、')}）` : '')
                    + '。'
            });
        },
        recover_luck: (args) => {
            const luckGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '目标' });
            if (!luckGot.ok) return '找不到: ' + (String(args.target_name || '').trim() || '(空)');
            const c = luckGot.actor;
            if (args.amount == null || args.amount === '') {
                return pauseForRuleCheck(gameState, {
                    kind: 'luck_recover',
                    skill: '运气',
                    roller: c.name,
                    target: c.name,
                    prompt: `【运气恢复】${c.name} 请进行运气检定。失败（掷过当前运气）才恢复 1D10。`
                });
            }
            const result = Engine.recoverLuck(c, args.amount);
            if (addJournalEntry) addJournalEntry({ type: 'system', summary: `${c.name}: ${result.message}` });
            return result.message || `${c.name} 恢复了 ${result.recovered || 0} 点运气。`;
        },
        record_engine_log: (args) => {
            if (!Array.isArray(DevLogs)) {
                return '错误：DevLogs 未定义';
            }
            const version = String(args && args.version != null ? args.version : '').trim().slice(0, 32);
            const title = String(args && args.title != null ? args.title : '').trim().slice(0, 120);
            const changes = Array.isArray(args && args.changes)
                ? args.changes.map((c) => String(c || '').trim().slice(0, 240)).filter(Boolean).slice(0, 12)
                : [];
            if (!version || !title || !changes.length) {
                return '错误：version / title / changes 无效';
            }
            // Quarantine AI-injected rows so they never masquerade as ship DevLogs.
            const aiVersion = version.startsWith('AI:') ? version : ('AI:' + version);
            const exists = DevLogs.some((log) => log && (log.version === aiVersion || log.version === version));
            if (exists) return '日志已存在（跳过重复）';
            const aiCount = DevLogs.filter((log) => log && log.source === 'ai').length;
            if (aiCount >= 5) return 'AI 开发者日志已达上限（5），已忽略';
            DevLogs.unshift({
                version: aiVersion,
                date: new Date().toISOString().split('T')[0],
                title: '[AI] ' + title,
                changes,
                source: 'ai'
            });
            gameState.chatHistory.push({
                role: 'system',
                isLocalOnly: true,
                content: `🛠️ [开发者日志·会话] AI 记录 ${aiVersion}：${title}`
            });
            return '日志已记录（会话内·已标记 AI）';
        },
        advance_time: (args) => {
            const days = Math.max(0, Math.floor(Number(args.days) || 0));
            const weeks = Math.max(0, Math.floor(Number(args.weeks) || 0));
            const months = Math.max(0, Math.floor(Number(args.months) || 0));
            const hours = Math.max(0, Math.floor(Number(args.hours) || 0));
            if (!days && !weeks && !months && !hours) return '错误：须指定 hours、days、weeks 或 months。';
            if (!gameState.worldClock || typeof gameState.worldClock !== 'object') {
                gameState.worldClock = { day: 1, hour: 0 };
            }
            const hourNow = Number(gameState.worldClock.hour) || 0;
            const calendarDaysFromHours = Math.floor((hourNow + hours) / 24);
            gameState.worldClock.hour = (hourNow + hours) % 24;
            const roster = gameState.roster || [];
            const extraMonths = months + Math.floor(days / 30) + Math.floor(weeks / 4);
            // Day pipeline (heal/disease/sanCaps) only for intentional day/week/month advances —
            // short overnight hour jumps only move the calendar clock.
            const totalDays = days + weeks * 7 + months * 30;
            gameState.worldClock.day = (Number(gameState.worldClock.day) || 1) + totalDays + calendarDaysFromHours;
            syncKpTimeFromWorldClock(gameState);
            restoreExpiredForms(gameState, Engine);
            if (totalDays > 0) gameState.sanCaps = {};
            const totalHours = hours + totalDays * 24;
            const recovered = [];
            const healNotes = [];
            const pendingRecoverList = [];
            roster.forEach((c) => {
                // Any span of downtime clears the daily SAN budget — weeks/months did not.
                if (totalDays > 0 && Engine.SanityEngine && typeof Engine.SanityEngine.resetDailyLoss === 'function') {
                    Engine.SanityEngine.resetDailyLoss(c);
                }
                if ((weeks > 0 || days >= 7 || months > 0) && Engine.HealingEngine && typeof Engine.HealingEngine.endWeek === 'function') {
                    Engine.HealingEngine.endWeek(c);
                }
                if (extraMonths > 0 && Engine.SanityEngine && typeof Engine.SanityEngine.endMonth === 'function') {
                    Engine.SanityEngine.endMonth(c);
                }
                if (totalDays > 0 && Engine.HealingEngine && typeof Engine.HealingEngine.endDay === 'function') {
                    Engine.HealingEngine.endDay(c, gameState.worldClock);
                }
                if (totalDays > 0 && Engine.HealingEngine && typeof Engine.HealingEngine.recoverNatural === 'function') {
                    const nat = Engine.HealingEngine.recoverNatural(c, totalDays);
                    if (nat.healed > 0 || nat.blocked) healNotes.push(nat.desc);
                }
                if (totalDays > 0 && Engine.ConditionsEngine && typeof Engine.ConditionsEngine.tickDisease === 'function') {
                    const dis = Engine.ConditionsEngine.tickDisease(c, totalDays);
                    if (dis && dis.desc) healNotes.push(dis.desc);
                }
                if (totalDays > 0 && Engine.ConditionsEngine && typeof Engine.ConditionsEngine.tickDeprivation === 'function') {
                    const dep = Engine.ConditionsEngine.tickDeprivation(c, totalDays);
                    if (dep && dep.desc) healNotes.push(dep.desc);
                }
                if ((weeks > 0 || days >= 7 || months > 0) && c.status && c.status.hasMajorWound
                    && Engine.HealingEngine && typeof Engine.HealingEngine.recoverMajorWoundWeek === 'function') {
                    pendingRecoverList.push({ name: c.name });
                }
                if (Engine.SanityEngine && typeof Engine.SanityEngine.tickMadness === 'function' && (totalHours || extraMonths)) {
                    const tick = Engine.SanityEngine.tickMadness(c, { hours: totalHours, months: extraMonths });
                    if (tick && tick.desc) recovered.push(tick.desc);
                }
            });
            const parts = [];
            if (hours) parts.push(hours + ' 小时');
            if (days) parts.push(days + ' 天');
            if (weeks) parts.push(weeks + ' 周');
            if (months) parts.push(months + ' 月');
            const note = args.note ? '（' + args.note + '）' : '';
            let msg = '时间推进 ' + parts.join('、') + note + '。';
            if (totalDays > 0) msg += '每日 SAN 累计已重置' + (extraMonths ? '；本月精神分析已刷新。' : '。');
            else if (extraMonths) msg += '本月精神分析已刷新。';
            if (healNotes.length) msg += ' ' + healNotes.join(' ');
            if (recovered.length) msg += ' ' + recovered.join(' ');
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '⏳ ' + msg });
            addJournalEntry && addJournalEntry({ type: 'time', summary: msg });
            if (pendingRecoverList.length) {
                let firstPause = null;
                pendingRecoverList.forEach((pendingRecover, i) => {
                    const pause = pauseForRuleCheck(gameState, {
                        kind: 'major_wound_recover',
                        skill: '体质',
                        roller: pendingRecover.name,
                        target: pendingRecover.name,
                        prompt: `【重伤恢复】时间已过一周。${pendingRecover.name} 请进行体质检定以开始从重伤中恢复。`
                    });
                    if (i === 0) firstPause = pause;
                });
                if (firstPause && firstPause.forceCheck) {
                    return { msg: msg + ' ' + firstPause.msg, forceCheck: firstPause.forceCheck };
                }
            }
            return msg;
        },

        extinguish_fire: (args) => {
            // omit target → active (intentional)
            const extGot = resolveActorFromArgs(gameState, args, ['target_name'], {
                allowActiveFallback: true, roleLabel: '目标'
            });
            if (!extGot.ok) return extGot.error;
            const c = extGot.actor;
            if (!c.status || !c.status.burning) return `${c.name} 并未着火。`;
            // omit actor → victim self; unknown actor → error
            const actorGot = resolveActor(gameState, args.actor_name, {
                fallbackActor: c, roleLabel: '施救者'
            });
            if (!actorGot.ok) return actorGot.error;
            const actor = actorGot.actor;
            return pauseForRuleCheck(gameState, {
                kind: 'extinguish',
                skill: args.skill_name || '急救',
                roller: actor.name,
                target: c.name,
                prompt: `【灭火】${actor.name} 请对 ${c.name} 进行【${args.skill_name || '急救'}】检定以扑灭火焰。`
            });
        },

        trigger_affliction: (args) => {
            // omit target → active (intentional)
            const affGot = resolveActorFromArgs(gameState, args, ['target_name'], {
                allowActiveFallback: true, roleLabel: '目标'
            });
            if (!affGot.ok) return affGot.error;
            const c = affGot.actor;
            if (!Engine?.SanityEngine?.applyAfflictionTrigger && !Engine?.SanityEngine?.triggerPhobiaMania) {
                return '错误：理智引擎未加载。';
            }
            const stimulus = args.stimulus || args.trigger || '';
            const result = Engine.SanityEngine.applyAfflictionTrigger
                ? Engine.SanityEngine.applyAfflictionTrigger(c, stimulus)
                : Engine.SanityEngine.triggerPhobiaMania(c, stimulus);
            if (!result.triggered) {
                return `${c.name} 的恐惧症/狂躁症未被「${stimulus || '该刺激'}」触发。`;
            }
            gameState.chatHistory.push({
                role: 'system', isLocalOnly: true, isAlert: true,
                content: '😨 ' + result.desc
            });
            addJournalEntry && addJournalEntry({ type: 'insanity', charName: c.name, summary: result.desc });
            return result.desc;
        }
    };
};
