// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC Tool Handlers: Dice domain (AUDITFIX8)
 */
import { pauseForRuleCheck, listOtherParticipants } from '../../state/rule_check.mjs';
import { resolveActor, requireField } from '../resolve.mjs';

export function dice(ctx) {
    const { gameState, rollCustomDice } = ctx;

    return {
        roll_dice: (args) => {
            const notation = args && args.notation != null ? String(args.notation).trim() : '';
            if (!notation) return '无效的骰子表示法：缺少 notation';
            const entry = rollCustomDice(notation, args.label, '守秘人', args.context);
            if (!entry) return `无效的骰子表示法：${notation}`;
            const dieEmoji = entry.sides === 6 && entry.count === 1 ? ['⚀','⚁','⚂','⚃','⚄','⚅'][entry.kept[0] - 1] : null;
            const rollStr = entry.kept.join('+') + (entry.mod ? (entry.mod > 0 ? '+' : '') + entry.mod : '');
            const msg = `🎲 【${args.label}】${notation} → ${dieEmoji || ''}  **${entry.total}** （${rollStr}）`;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isDiceRoll: true, content: msg });
            return `骰出 ${entry.total}（${notation}）`;
        },
        group_roll: (args) => {
            const skillName = args.skill_name || args.skill;
            if (!skillName || !String(skillName).trim()) {
                return '错误：group_roll 须提供 skill_name';
            }
            // Prefer any non-empty alias list; do not silent-ignore names/character_names/targets
            const nameKeys = ['char_names', 'names', 'character_names', 'targets', 'investigators'];
            let names = [];
            for (let i = 0; i < nameKeys.length; i++) {
                const k = nameKeys[i];
                if (!args || args[k] == null) continue;
                const arr = Array.isArray(args[k]) ? args[k] : [args[k]];
                const cleaned = arr.map((n) => String(n || '').trim()).filter(Boolean);
                if (cleaned.length) { names = cleaned; break; }
            }
            const roster = gameState.roster || [];
            let targets;
            if (names.length) {
                const unknown = names.filter((n) => !roster.some((c) => c && c.name === n));
                if (unknown.length) return '错误：找不到调查员：' + unknown.join('、');
                targets = roster.filter((c) => c && names.includes(c.name) && c.isActive);
                if (!targets.length) return '错误：指定调查员均未激活，无法群体检定';
            } else {
                targets = roster.filter((c) => c && c.isActive);
                if (!targets.length) return '错误：没有可检定的调查员';
            }
            const first = targets[0];
            const rest = targets.slice(1).map((c) => c.name);
            return pauseForRuleCheck(gameState, {
                kind: 'group_skill',
                skill: skillName,
                roller: first.name,
                target: first.name,
                groupQueue: rest,
                groupResults: [],
                groupContext: args.context || '',
                prompt: `【群体检定】${first.name} 请进行【${skillName}】检定。`
            });
        },
        opposed_roll: (args) => {
            const charField = requireField(args, 'char_name', { label: 'char_name', aliases: ['character_name', 'name'] });
            if (!charField.ok) return charField.error;
            const oppGot = resolveActor(gameState, charField.value, { required: true, roleLabel: '调查员' });
            if (!oppGot.ok) return '找不到调查员：' + charField.value;
            const c = oppGot.actor;
            const charSkill = args.char_skill || args.skill_name || args.skill;
            if (!charSkill || !String(charSkill).trim()) {
                return '错误：opposed_roll 须提供 char_skill';
            }
            const oppRaw = args.opponent_value;
            const opponentValue = (oppRaw == null || oppRaw === '')
                ? null
                : (Number.isFinite(Number(oppRaw)) ? Number(oppRaw) : null);
            let opponentName = args.opponent_name ? String(args.opponent_name).trim() : '';
            if (opponentValue == null && !opponentName) {
                const others = listOtherParticipants(gameState, c.name);
                if (others.length !== 1) return '须指定对手';
                opponentName = others[0];
            }
            return pauseForRuleCheck(gameState, {
                kind: 'opposed_roll',
                skill: charSkill,
                roller: c.name,
                target: c.name,
                opponentName,
                opponentValue,
                opposedLabel: args.label || charSkill,
                difficulty: args.difficulty || 'normal',
                prompt: `【对抗·${args.label || charSkill}】${c.name} 请进行【${charSkill}】检定（对 ${opponentName || '对手'}）。`
            });
        }
    };
};
