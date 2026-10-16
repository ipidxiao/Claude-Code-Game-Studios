// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC Tool Handlers: NPC registry domain (AUDITFIX8)
 */
import { requireField } from '../resolve.mjs';
import { getKpEngine } from '../../state/kp_config.mjs';
import { KpExecutionEngine } from '../../campaign/kp_execution_engine.mjs';
import { applyNpcBehavior } from '../../engines/npc_behavior.mjs';

export function npc(ctx) {
    const { gameState, addJournalEntry, addNpc, updateNpcStatus } = ctx;

    const getKpEng = () => getKpEngine() || KpExecutionEngine;

    return {
        register_npc: (args) => {
            const name = args && args.name != null ? String(args.name).trim() : '';
            if (!name || name === 'undefined' || name === 'null') {
                return '错误：NPC 名称不能为空';
            }
            const relation = (args.relation != null && String(args.relation).trim() !== '')
                ? String(args.relation).trim()
                : '未知';
            addNpc({ name, description: args.description, relation, status: args.status || 'alive' });
            addJournalEntry({ type: 'npc_met', charName: null, summary: `初遇 NPC：${name}（${relation}）` });
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🕵️ [NPC登录] ${name} — ${relation}` });
            const kpEng = getKpEng();
            if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && kpEng.applySocialInfiltration) {
                kpEng.applySocialInfiltration(gameState, { type: 'register', name });
            }
            applyNpcBehavior(gameState);
            return `已记录 ${name}`;
        },
        update_npc_status: (args) => {
            const statusLabels = { alive: '存活', dead: '死亡', missing: '失踪', insane: '疯狂', unknown: '未知' };
            const nameField = requireField(args, 'name', { label: 'NPC 名称' });
            if (!nameField.ok) return nameField.error;
            const npcName = nameField.value;
            const ok = updateNpcStatus(npcName, args.status, args.note);
            if (!ok) return `找不到NPC: ${npcName}`;
            addJournalEntry({ type: 'npc_status', summary: `${npcName} 状态变为：${statusLabels[args.status] || args.status}` });
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: args.status === 'dead', content: `${args.status === 'dead' ? '☠️' : '🔄'} [${statusLabels[args.status] || args.status}] ${npcName}${args.note ? '：' + args.note : ''}` });
            const kpEng = getKpEng();
            if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && kpEng.applySocialInfiltration) {
                kpEng.applySocialInfiltration(gameState, { type: 'update', name: npcName });
            }
            applyNpcBehavior(gameState);
            return `${npcName} 状态已更新`;
        }
    };
};
