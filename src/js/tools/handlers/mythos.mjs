// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { pauseForRuleCheck, applySpellCastResult } from '../../state/rule_check.mjs';
import { resolveActor, resolveEnemy, requireField } from '../resolve.mjs';
import { CoCEngine } from '../../coc.mjs';

/**
 * CoC Tool Handlers: Mythos domain — 典籍研读与法术施放
 */
export function mythos(ctx) {
    const gameState = ctx.gameState;
    const addJournalEntry = ctx.addJournalEntry;

    return {
        study_tome: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const targetField = requireField(args, 'target_name', { label: 'target_name' });
            if (!targetField.ok) return targetField.error;
            const tomeField = requireField(args, 'tome_name', { label: 'tome_name' });
            if (!tomeField.ok) return tomeField.error;
            const targetName = targetField.value;
            const tomeName = tomeField.value;
            const studyGot = resolveActor(gameState, targetName, { required: true, roleLabel: '调查员' });
            if (!studyGot.ok) return studyGot.error;
            const c = studyGot.actor;
            if (!Engine || !Engine.MythosEngine) return '错误：神话引擎未加载。';
            const tomes = (Engine.MythosEngine._tomes && Engine.MythosEngine._tomes())
                || (typeof window !== 'undefined' && window.CoCMythosTomes)
                || {};
            const tome = tomes[tomeName];
            if (!tome) return '错误：未知典籍 ' + tomeName;
            const inv = [...(gameState.inventory || []), ...(c.equipment ? Object.values(c.equipment).filter(Boolean) : [])];
            const hasTome = inv.some((item) => {
                const label = String(typeof item === 'object' && item ? (item.name || '') : (item || '')).trim().toLowerCase();
                if (label.length < 2) return false;
                const key = tomeName.toLowerCase();
                const title = String(tome.name || tomeName).toLowerCase();
                return label.includes(key) || label.includes(title) || title.includes(label);
            });
            if (!hasTome) return '错误：' + c.name + ' 背包/装备中未持有典籍「' + (tome.name || tomeName) + '」。';
            if (!(args.weeks && Number(args.weeks) > 0)) {
                const progress = (c.mythosStudy && c.mythosStudy.studiedTomes
                    && c.mythosStudy.studiedTomes[tomeName]) || { phase: '未阅读' };
                if (progress && progress.phase && progress.phase !== '未阅读') {
                    return c.name + ' 已经翻阅过「' + (tome.name || tomeName) + '」（' + progress.phase + '），无需再次浏览 SAN。';
                }
            }
            if (args.weeks && Number(args.weeks) > 0) {
                if (!Engine.MythosEngine.wouldCompleteStudy(c, tomeName, Number(args.weeks))) {
                    const result = Engine.MythosEngine.fullStudy(c, tomeName, Number(args.weeks));
                    if (result.success) {
                        addJournalEntry({ type: 'tome_study', charName: c.name, summary: result.description });
                    }
                    return result.description;
                }
                return pauseForRuleCheck(gameState, {
                    kind: 'tome_san',
                    skill: 'SAN',
                    roller: c.name,
                    target: c.name,
                    tomeKey: tomeName,
                    weeks: Number(args.weeks),
                    prompt: `请进行【SAN】检定（${c.name} 研读「${tome.name || tomeName}」）。失败按大档扣理智。`
                });
            }
            return pauseForRuleCheck(gameState, {
                kind: 'tome_san',
                skill: 'SAN',
                roller: c.name,
                target: c.name,
                tomeKey: tomeName,
                prompt: `请进行【SAN】检定（${c.name} 翻阅「${tome.name || tomeName}」）。失败按大档扣理智。`
            });
        },
        start_ritual: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const casterField = requireField(args, 'caster_name', { label: 'caster_name' });
            if (!casterField.ok) return '错误：须指定施法者 caster_name';
            const startGot = resolveActor(gameState, casterField.value, { required: true, roleLabel: '施法者' });
            if (!startGot.ok) return startGot.error;
            const c = startGot.actor;
            if (Engine && typeof Engine.canAct === 'function') {
                const gate = Engine.canAct(c, 'cast');
                if (gate && gate.ok === false) return '错误：' + (gate.desc || '无法施法');
            }
            if (!Engine || !Engine.MythosEngine || !Engine.MythosEngine.startRitual) return '错误：神话引擎未加载。';
            const spellField = requireField(args, 'spell_name', { label: 'spell_name 或 spell', aliases: ['spell'] });
            if (!spellField.ok) return spellField.error;
            const spellName = String(spellField.value);
            const result = Engine.MythosEngine.startRitual(c, spellName);
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: result.desc });
            if (result.ok) addJournalEntry({ type: 'ritual_start', charName: c.name, summary: result.desc });
            return result.desc;
        },
        continue_ritual: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const casterName = args.caster_name != null ? String(args.caster_name).trim() : '';
            let c = null;
            if (casterName) {
                const contGot = resolveActor(gameState, casterName, { required: true, roleLabel: '施法者' });
                if (!contGot.ok) return contGot.error;
                c = contGot.actor;
            } else {
                const holders = (gameState.roster || []).filter(function(r) {
                    return r && r.status && r.status.ritual;
                });
                if (holders.length === 1) c = holders[0];
                else if (holders.length === 0) return '错误：须指定 caster_name，或已有进行中的仪式';
                else return '错误：多名调查员同时举行仪式，须指定 caster_name';
            }
            if (Engine && typeof Engine.canAct === 'function') {
                const gate = Engine.canAct(c, 'cast');
                if (gate && gate.ok === false) return '错误：' + (gate.desc || '无法施法');
            }
            if (!Engine || !Engine.MythosEngine || !Engine.MythosEngine.continueRitual) return '错误：神话引擎未加载。';
            const result = Engine.MythosEngine.continueRitual(c);
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: result.desc });
            if (result.ok) addJournalEntry({ type: 'ritual_continue', charName: c.name, summary: result.desc });
            return result.desc;
        },
        cast_spell: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const castGot = resolveActor(gameState, args.caster_name, { required: true, roleLabel: '施法者' });
            if (!castGot.ok) return castGot.error;
            const c = castGot.actor;
            if (Engine && typeof Engine.canAct === 'function') {
                const gate = Engine.canAct(c, 'cast');
                if (gate && gate.ok === false) return '错误：' + (gate.desc || '无法施法');
            }
            const spellField = requireField(args, 'spell_name', { label: 'spell_name 或 spell', aliases: ['spell'] });
            if (!spellField.ok) return spellField.error;
            const spellName = String(spellField.value);
            let target = null;
            if (args.target_name) {
                const tgtGot = resolveActor(gameState, args.target_name, { required: false, roleLabel: '目标' });
                target = tgtGot.ok ? tgtGot.actor : null;
            }
            if (!target && args.target_name) {
                const enemies = (gameState.combat && gameState.combat.enemies) || [];
                const got = resolveEnemy(enemies, args.target_name, {
                    required: false, preferLiving: true, allowFirstFallback: false, roleLabel: '敌人'
                });
                target = got.ok
                    ? got.enemy
                    : (enemies.find((e) => e && (e.name === args.target_name || e._rosterName === args.target_name)) || null);
            }
            if (!Engine || !Engine.MythosEngine) return '错误：神话引擎未加载。';
            const ritualReady = !!(c.status && c.status.ritual
                && c.status.ritual.spellName === spellName
                && c.status.ritual.complete);
            let assistants = [];
            const names = Array.isArray(args.assistant_names) ? args.assistant_names
                : (args.assistant_name ? [args.assistant_name] : []);
            for (let i = 0; i < names.length; i++) {
                const assistGot = resolveActor(gameState, names[i], { required: true, roleLabel: '协作施法者' });
                if (!assistGot.ok) return assistGot.error;
                const a = assistGot.actor;
                if (a.name === c.name) continue;
                if (Engine && typeof Engine.canAct === 'function') {
                    const ag = Engine.canAct(a, 'cast');
                    if (ag && ag.ok === false) return '错误：' + a.name + ' ' + (ag.desc || '无法协助施法');
                }
                assistants.push(a);
            }
            if (target && Engine.MythosEngine.needsPowOppose
                && Engine.MythosEngine.needsPowOppose(spellName, target)) {
                return pauseForRuleCheck(gameState, {
                    kind: 'spell_pow',
                    skill: '意志',
                    roller: c.name,
                    target: c.name,
                    spellName: spellName,
                    spellTargetName: args.target_name,
                    assistantNames: names,
                    ritualComplete: ritualReady || !!args.ritual_complete,
                    formName: args.creature_name || args.form_name || '',
                    prompt: `【施法·POW对抗】${c.name} 请进行意志检定（对 ${args.target_name}）。`
                });
            }
            const result = Engine.MythosEngine.castSpell(c, spellName, target, {
                ritualComplete: ritualReady || !!args.ritual_complete,
                assistants: assistants,
                formName: args.creature_name || args.form_name || ''
            });
            if (result.needsRitual) {
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: result.description });
                return result.description;
            }
            if (result.success) {
                addJournalEntry({ type: 'spell_cast', charName: c.name, summary: '施放了' + spellName + '。' + result.description });
            }
            const fin = applySpellCastResult(gameState, Engine, result, target, c);
            if (fin.pause) return { msg: fin.desc, forceCheck: fin.pause.forceCheck };
            return fin.desc;
        },
        apply_enchantment: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const enchGot = resolveActor(gameState, args.target_name, { required: true, roleLabel: '目标' });
            if (!enchGot.ok) return enchGot.error;
            const c = enchGot.actor;
            if (!Engine || !Engine.MythosEngine || !Engine.MythosEngine.applyEnchantmentBuff) {
                return '错误：附魔引擎未加载。';
            }
            const enchField = requireField(args, 'enchantment_id', { label: 'enchantment_id', aliases: ['enchantmentId'] });
            if (!enchField.ok) return enchField.error;
            const result = Engine.MythosEngine.applyEnchantmentBuff(c, String(enchField.value).trim());
            if (!result.ok) return '错误：' + result.desc;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '✨ ' + result.desc });
            addJournalEntry && addJournalEntry({ type: 'enchantment', charName: c.name, summary: result.desc });
            return result.desc;
        },
        dispel_magic: (args) => {
            const Engine = ctx.Engine || CoCEngine;
            const casterKey = args.caster_name || args.target_name;
            const targetKey = args.target_name || args.caster_name;
            const dispCaster = resolveActor(gameState, casterKey, { required: true, roleLabel: '施法者' });
            if (!dispCaster.ok) return dispCaster.error;
            const dispTarget = resolveActor(gameState, targetKey, { required: true, roleLabel: '目标' });
            if (!dispTarget.ok) return dispTarget.error;
            const caster = dispCaster.actor;
            const target = dispTarget.actor;
            if (!Engine || !Engine.MythosEngine || !Engine.MythosEngine.dispel) {
                return '错误：驱散未加载。';
            }
            const result = Engine.MythosEngine.dispel(caster, target, {
                mpCost: args.mp_cost != null ? Number(args.mp_cost) : 1,
                clearAllMagic: !!args.clear_all
            });
            if (!result.ok) return '错误：' + result.desc;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🔮 ' + result.desc });
            addJournalEntry && addJournalEntry({ type: 'dispel', charName: caster.name, summary: result.desc });
            return result.desc;
        }
    };
};
