// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { pauseForRuleCheck, damageFollowUpSpec } from '../../state/rule_check.mjs';
import { resolveActor, requireField } from '../resolve.mjs';
import { CoCEngine } from '../../coc.mjs';

/**
 * CoC Tool Handlers: Character domain (AUDITFIX8)
 *
 * Owns investigator HP/SAN mutations and major-wound side effects.
 * Healing / SAN loss go through dedicated tools; HP writes stay on applyDamage.
 */
export function character(ctx) {
    const { gameState, addJournalEntry } = ctx;

    const findChar = (name) => {
        const got = resolveActor(gameState, name, { required: true, roleLabel: '调查员' });
        return got.ok ? got.actor : null;
    };

    const resolveMedicalItem = (itemName, skillName) => {
        const raw = String(itemName || '').trim();
        const skill = skillName === '医学' ? '医学' : (skillName || '');
        const parse = (typeof window !== 'undefined' && window.parseItemData) ? window.parseItemData : null;
        if (raw && parse) {
            const parsed = parse(raw);
            if (parsed && parsed.heal && parsed.target) {
                return { ...parsed, type: parsed.type || 'consumable', skill: parsed.skill || skill || '急救' };
            }
        }
        if (/吗啡/.test(raw)) {
            return { type: 'consumable', name: raw, heal: '1D3', target: 'HP', sideEffect: 'con' };
        }
        if (/止痛|药剂|药水/.test(raw)) {
            return { type: 'consumable', name: raw || '止痛药', heal: '1', target: 'HP' };
        }
        if (/医药|医学/.test(raw) || skill === '医学') {
            return { type: 'consumable', name: raw || '医药箱', heal: '1D4', target: 'HP', skill: '医学' };
        }
        if (raw) {
            return { type: 'consumable', name: raw, heal: '1D3', target: 'HP', skill: skill || '急救' };
        }
        return { type: 'consumable', name: '徒手急救', heal: '1', target: 'HP', skill: skill || '急救' };
    };

    const consumeMedicalItem = (itemName) => {
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
    };

    const ownsFirstAidKit = (state, who) => {
        const hit = (item) => {
            const n = typeof item === 'string' ? item : (item && item.name);
            return n && String(n).includes('急救箱');
        };
        const eq = who && who.equipment;
        if (eq && typeof eq === 'object' && Object.values(eq).some(hit)) return true;
        return (state.inventory || []).some(hit);
    };

    return {
        update_character_status: (args) => {
            const statusGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '该角色' });
            if (!statusGot.ok) return statusGot.error;
            let c = statusGot.actor;
            const Engine = ctx.Engine || CoCEngine;
            const hasHp = args.hp_change != null && args.hp_change !== '' && Number(args.hp_change) !== 0;
            const hasSan = args.san_change != null && args.san_change !== '' && Number(args.san_change) !== 0;
            if (!hasHp && !hasSan) {
                return '错误：update_character_status 须提供非零 hp_change（仅负值伤害）或改用专用工具；禁止空更新。';
            }
            if (args.hp_change > 0) {
                return '错误：治疗必须调用 apply_healing（先急救/医学检定），不可用 update_character_status 直接加血。';
            }
            if (args.san_change && !args.hp_change) {
                if (args.san_change > 0) {
                    return '错误：恢复 SAN 必须调用 apply_therapy 或 apply_sanity_reward，不可用 update_character_status 直接加理智。';
                }
                return '错误：理智损失必须调用 reality_check（先 SAN 检定），不可用 update_character_status 直接填写 san_change。';
            }
            let resultMsg = `${c.name} 状态已更新：`;
            if (args.hp_change) {
                const dmg = -args.hp_change;
                if (!Engine || !Engine.MajorWoundEngine || typeof Engine.MajorWoundEngine.dealDamage !== 'function') {
                    return '错误：伤害引擎未加载。';
                }
                const applied = Engine.MajorWoundEngine.dealDamage(c, dmg);
                const maxHp = applied.maxHp;
                const statusAlert = { kind: 'hp_damage', name: c.name, dmg: applied.damage, hp: applied.hp, maxHp, lines: [] };
                if (applied.majorWound && applied.wound) {
                    const loc = applied.wound.location || {};
                    statusAlert.majorWound = applied.wound.generic
                        ? { generic: true }
                        : {
                            location: loc.location,
                            desc: loc.desc,
                            unconscious: !!applied.wound.unconscious,
                            droppedWeapon: applied.wound.droppedWeapon || null,
                            bleeding: !!applied.wound.bleeding
                        };
                    statusAlert.lines.push(applied.wound.generic
                        ? '⚠️ 【重伤】单次伤害过高，遭受致命打击！'
                        : `⚠️ 【重伤】部位：${loc.location} — ${loc.desc}`);
                }
                let forceCheck = null;
                if (applied.dying) {
                    statusAlert.dying = { description: '倒在血泊中。请立刻进行体质检定——失败则死亡。' };
                    statusAlert.lines.push('💀 【濒死】' + statusAlert.dying.description);
                    resultMsg += '玩家濒死，须进行体质检定。';
                } else if (applied.unconscious) {
                    statusAlert.unconscious = true;
                    statusAlert.lines.push('💤 【休克】玩家因剧痛失去了意识。');
                    resultMsg += '玩家昏迷。';
                } else if (applied.needsConsciousnessCheck) {
                    statusAlert.lines.push('⚠️ 请立刻进行体质检定以保持清醒！');
                    resultMsg += '玩家重伤，系统正强制其进行体质检定。';
                } else {
                    resultMsg += '玩家受到伤害。';
                }
                const follow = damageFollowUpSpec(c, applied);
                if (follow) forceCheck = pauseForRuleCheck(gameState, follow).forceCheck;

                const plainContent = `🩸 [受到伤害] ${c.name} 失去 ${applied.damage} 点生命（${applied.hp}/${maxHp}）`;
                gameState.chatHistory.push({
                    role: 'system',
                    isLocalOnly: true,
                    isAlert: true,
                    statusAlert,
                    content: plainContent
                });
                addJournalEntry({ type: 'hp_loss', charName: c.name, summary: `受到 ${applied.damage} 点伤害（HP: ${applied.hp}/${maxHp}）` });
                if (args.san_change) {
                    resultMsg += ' 理智变化须用 reality_check / apply_therapy / apply_sanity_reward，已忽略 san_change。';
                }
                if (forceCheck) return { msg: resultMsg + ' 绝对禁止反悔！', forceCheck };
                return resultMsg + ' 绝对禁止反悔！';
            }
            return resultMsg + ' 绝对禁止反悔！';
        },
        spend_luck: (args) => {
            const luckGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '调查员' });
            if (!luckGot.ok) return luckGot.error;
            const c = luckGot.actor;
            const Engine = ctx.Engine || CoCEngine;
            if (!Engine) return '错误：引擎未加载。';

            const bindLevel = args.target_level || args.bind_level || null;
            const last = gameState.lastSkillCheck;
            const hasExplicitRoll = args.rolled_value != null || args.skill_value != null;
            const useBind = !!(bindLevel || hasExplicitRoll || (last && last.charName === c.name && args.amount == null));

            if (useBind && Engine.spendLuckOnCheck) {
                const rollMeta = hasExplicitRoll
                    ? {
                        charName: c.name,
                        skill: args.skill_name || (last && last.skill) || '检定',
                        success: false,
                        level: args.old_level || (last && last.level) || '失败',
                        rolledValue: Number(args.rolled_value != null ? args.rolled_value : (last && last.rolledValue)),
                        skillValue: Number(args.skill_value != null ? args.skill_value : (last && (last.skillValue || last.targetValue))),
                        targetValue: Number(args.target_value != null ? args.target_value : (last && last.targetValue))
                    }
                    : (last && last.charName === c.name ? Object.assign({}, last) : null);
                if (!rollMeta || rollMeta.rolledValue == null) {
                    return '错误：无可用检定结果。请在检定后调用，或提供 rolled_value 与 skill_value。';
                }
                const result = Engine.spendLuckOnCheck(c, rollMeta, bindLevel || '成功');
                if (result.success && result.rollMeta) {
                    gameState.lastSkillCheck = Object.assign({}, result.rollMeta, { charName: c.name });
                }
                if (result.success) {
                    gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🍀 ' + result.message });
                    addJournalEntry({ type: 'luck_spend', charName: c.name, summary: result.message });
                }
                return result.message;
            }

            if (!Engine.spendLuck) return '错误：引擎未加载。';
            const result = Engine.spendLuck(c, Number(args.amount) || 0);
            if (result.success) {
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🍀 ' + result.message });
                addJournalEntry({ type: 'luck_spend', charName: c.name, summary: result.message });
            }
            return result.message;
        },
        apply_healing: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const targetGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '伤者' });
            if (!targetGot.ok) return targetGot.error;
            const target = targetGot.actor;
            // omit healer → patient self (intentional; not isActive)
            const healerGot = resolveActor(gameState, args.healer_name, {
                fallbackActor: target, roleLabel: '施治者'
            });
            if (!healerGot.ok) return healerGot.error;
            const healer = healerGot.actor;
            if (!Engine || !Engine.HealingEngine) return '错误：治疗引擎未加载。';
            const item = resolveMedicalItem(args.item_name, args.skill_name);
            const isPush = !!args.push;
            if (Engine.HealingEngine.canTreat) {
                const gate = Engine.HealingEngine.canTreat(target, item, { isPush });
                if (!gate.ok) return gate.message;
            }
            if (!item.skill) {
                const result = Engine.HealingEngine.applyHealing(target, item, healer);
                if (result.success) {
                    consumeMedicalItem(args.item_name);
                    gameState.chatHistory.push({
                        role: 'system', isLocalOnly: true,
                        content: `💖 [治疗] ${target.name} ${result.message}`
                    });
                    addJournalEntry({ type: 'heal', charName: target.name, summary: result.message });
                }
                return result.message;
            }
            const difficulty = item.skill === '医学' && Engine.HealingEngine.medicineDifficulty
                ? Engine.HealingEngine.medicineDifficulty(target, gameState.worldClock)
                : 'normal';
            const kitBonus = item.skill === '急救' && ownsFirstAidKit(gameState, healer) ? 1 : 0;
            return pauseForRuleCheck(gameState, {
                kind: 'heal',
                skill: item.skill,
                roller: healer.name,
                target: target.name,
                healer: healer.name,
                item,
                itemName: args.item_name,
                isPush,
                bonusDice: kitBonus,
                difficulty,
                prompt: `请进行【${item.skill}】检定（${healer.name} 救治 ${target.name}）`
                    + (difficulty === 'hard' ? '，伤后隔日需困难成功' : '')
                    + (isPush ? '，本次为推动（濒死者失败即死）' : '')
                    + (kitBonus ? '，急救箱提供1个奖励骰' : '')
                    + '。失败不加血。'
            });
        },
        reality_check: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const realityGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '调查员' });
            if (!realityGot.ok) return realityGot.error;
            const c = realityGot.actor;
            if (!Engine || !Engine.SanityEngine) return '错误：理智引擎未加载。';
            let notation = args.san_loss;
            if (!notation && args.mythos_name) {
                notation = args.mythos_name; // parseSanNotation resolves table / 不可名状之物
            }
            if (!notation) notation = '0/1D4';
            const capKey = args.mythos_name || args.cap_key || null;
            return pauseForRuleCheck(gameState, {
                kind: 'san',
                skill: 'SAN',
                roller: c.name,
                target: c.name,
                notation,
                cause: args.cause || args.mythos_name || '目睹',
                capKey,
                prompt: `请进行【SAN】检定（${c.name}）。失败按大档扣理智。`
            });
        },
        apply_therapy: (args) => {
            const patientGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '患者' });
            if (!patientGot.ok) return patientGot.error;
            const patient = patientGot.actor;
            if (!patient.derived) patient.derived = {};
            if (patient.derived.sanity == null) patient.derived.sanity = patient.sanity || 0;
            const Engine = ctx.Engine || CoCEngine;
            if (Engine && Engine.SanityEngine && Engine.SanityEngine.canTreat) {
                const gate = Engine.SanityEngine.canTreat(patient, args.therapist_name || null);
                if (!gate.ok) return gate.message;
            }
            if (args.therapist_name) {
                const therapistGot = resolveActor(gameState, args.therapist_name, { required: true, roleLabel: '施术者' });
                if (!therapistGot.ok) return therapistGot.error;
                const therapist = therapistGot.actor;
                const cureTarget = args.cure_target || null;
                // Reject an unknown affliction before the player rolls for nothing.
                if (cureTarget && Engine && Engine.SanityEngine && Engine.SanityEngine._findAffliction
                    && !Engine.SanityEngine._findAffliction(patient, cureTarget)) {
                    return `错误：${patient.name} 身上找不到对应「${cureTarget}」的恐惧症/狂躁症。`;
                }
                return pauseForRuleCheck(gameState, {
                    kind: 'therapy',
                    skill: '精神分析',
                    roller: therapist.name,
                    target: patient.name,
                    therapist: therapist.name,
                    cureTarget,
                    prompt: `请进行【精神分析】检定（${therapist.name} → ${patient.name}）。`
                        + (cureTarget ? `成功后由患者再做理智检定以治愈「${cureTarget}」（不恢复 SAN）。` : '失败不恢复 SAN。')
                });
            }
            // One table roll per month; cap a single call so a huge value cannot hang the tab.
            const MAX_ASYLUM_MONTHS = 24;
            const askedMonths = Math.max(1, Math.floor(Number(args.months) || 1));
            const months = Math.min(MAX_ASYLUM_MONTHS, askedMonths);
            const care = args.care || args.asylum_care || 'average';
            const lines = [];
            let totalRecovered = 0;
            let totalWorsened = 0;
            for (let m = 0; m < months; m++) {
                if (patient.status) patient.status.therapyMonthUsed = false;
                let res;
                if (Engine.SanityEngine.applyAsylumMonth) {
                    res = Engine.SanityEngine.applyAsylumMonth(patient, care);
                } else {
                    res = Engine.SanityEngine.applyTherapy(patient, { name: '精神病院医师', skills: { '精神分析': 75 } });
                    if (res && res.recovered == null && res.desc == null) {
                        res = { recovered: res.recovered || 0, worsened: 0, desc: `${patient.name} 接受治疗，恢复 ${res.recovered || 0} SAN。` };
                    }
                }
                totalRecovered += res.recovered || 0;
                totalWorsened += res.worsened || 0;
                if (res.desc) lines.push('第' + (m + 1) + '月：' + res.desc);
            }
            if (patient.status) patient.status.therapyMonthUsed = true;
            const msg = `${patient.name} 在精神病院（${care}）接受了 ${months} 个月治疗：恢复 ${totalRecovered} SAN` +
                (totalWorsened ? `，恶化 ${totalWorsened}` : '') + '。' +
                (askedMonths > months ? `（单次最多结算 ${MAX_ASYLUM_MONTHS} 个月，其余月份需再次调用）` : '');
            if (addJournalEntry) addJournalEntry({ type: 'san_recover', charName: patient.name, summary: msg });
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🧠 ${msg}` });
            if (lines.length) {
                lines.forEach((l) => gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🧠 ' + l }));
            }
            return msg;
        },
        apply_sanity_reward: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const rewardGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '调查员' });
            if (!rewardGot.ok) return rewardGot.error;
            const c = rewardGot.actor;
            if (!Engine || !Engine.SanityEngine) return '错误：理智引擎未加载。';
            if (!c.derived) c.derived = {};
            if (c.derived.sanity == null) c.derived.sanity = c.sanity || 0;
            const result = Engine.SanityEngine.applySanityReward(c, args.reward_dice || '1D6', args.reason || '解决威胁');
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🧠 [理智奖励] ${result.desc}` });
            addJournalEntry({ type: 'san_recover', charName: c.name, summary: result.desc });
            return result.desc;
        },
        connect_backstory: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const bsGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '调查员' });
            if (!bsGot.ok) return bsGot.error;
            const c = bsGot.actor;
            if (!Engine || !Engine.InvestigatorEngine) return '错误：调查员引擎未加载。';
            const bsField = requireField(args, 'backstory_key', { label: 'backstory_key', aliases: ['key'] });
            if (!bsField.ok) return bsField.error;
            const bsKey = bsField.value;
            if (!c.derived) c.derived = {};
            if (c.derived.sanity == null) c.derived.sanity = c.sanity || 0;
            const result = Engine.InvestigatorEngine.connectBackstory(c, bsKey, {
                rewardDice: args.reward_dice || '1D6',
                clearIndef: !!args.clear_indef
            });
            if (!result.ok) return '错误：' + result.desc;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🧠 [背景锚点] ' + result.desc });
            addJournalEntry && addJournalEntry({ type: 'san_recover', charName: c.name, summary: result.desc });
            return result.desc;
        },
        init_wealth: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const wealthGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '调查员' });
            if (!wealthGot.ok) return wealthGot.error;
            const c = wealthGot.actor;
            if (!Engine || !Engine.InvestigatorEngine) return '错误：调查员引擎未加载。';
            const wealth = Engine.InvestigatorEngine.ensureWealth(c, { reset: !!args.reset });
            const msg = Engine.InvestigatorEngine.describeCredit(c) +
                '；资产 $' + (wealth.assets != null ? wealth.assets : 0) + '。';
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '💰 ' + msg });
            return msg;
        },
        lifestyle_spend: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const lifeGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '调查员' });
            if (!lifeGot.ok) return lifeGot.error;
            const c = lifeGot.actor;
            if (!Engine || !Engine.InvestigatorEngine) return '错误：调查员引擎未加载。';
            const result = Engine.InvestigatorEngine.spendLifestyle(c, {
                days: args.days,
                dropCredit: args.drop_credit !== false
            });
            gameState.chatHistory.push({
                role: 'system',
                isLocalOnly: true,
                isAlert: !result.ok,
                content: '💰 ' + result.desc
            });
            addJournalEntry && addJournalEntry({ type: 'lifestyle', charName: c.name, summary: result.desc });
            return result.desc;
        }
    };
};
