// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC Tool Handlers: Clue board domain (AUDITFIX8)
 */
import { getKpEngine } from '../../state/kp_config.mjs';
import { KpExecutionEngine } from '../../campaign/kp_execution_engine.mjs';
import { applyNpcBehavior } from '../../engines/npc_behavior.mjs';
export function clues(ctx) {
    const { gameState, addClue, linkClues, markClueStatus } = ctx;

    const getKpEng = () => getKpEngine() || KpExecutionEngine;

    return {
        add_clue: (args) => {
            const title = args && args.title != null ? String(args.title).trim() : '';
            if (!title) return '错误：add_clue 须提供 title';
            const kpEng = getKpEng();
            let pathMeta = null;
            if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState)) {
                const check = kpEng.canAddClue(args, { gameState });
                if (!check.allowed) {
                    return `错误：${check.reason}`;
                }
                pathMeta = check;
            }
            const rawType = args.type != null ? String(args.type).trim() : '';
            if (!rawType) return '错误：add_clue 须提供 type';
            const clue = addClue(args.id, title, args.content, rawType, args.related_ids);
            const npcId = args.npc_id || args.npcId;
            if (clue && npcId) clue.npcId = String(npcId);
            applyNpcBehavior(gameState);
            if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && pathMeta) {
                kpEng.registerPath(
                    gameState,
                    pathMeta.pathType,
                    args.id || ('clue_' + Date.now()),
                    !!pathMeta.isFalse
                );
            }
            const typeLabel = {
                physical: '物证', testimony: '证词', document: '文件', location: '地点',
                event: '事件', person: '人物', supernatural: '异常'
            }[rawType] || rawType;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🔍 [线索] 【${title}】（${typeLabel}）` });
            return `线索已记录：${title}`;
        },
        link_clues: (args) => {
            const result = linkClues(args.from_id, args.to_id, args.note);
            if (result && result.ok === false) {
                return `错误：${result.reason || '无法连接线索'}`;
            }
            return `线索已连接：${args.from_id} ↔ ${args.to_id}`;
        },
        mark_clue_status: (args) => {
            const kpEng = getKpEng();
            if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && args.status === 'key') {
                const evalResult = kpEng.evaluateKeyClueRequest
                    ? kpEng.evaluateKeyClueRequest(gameState)
                    : (kpEng.canTriggerKeyClue(gameState) ? { allowed: true } : { allowed: false });
                if (!evalResult.allowed) {
                    if (kpEng.recordKeyClueBlockedAttempt) kpEng.recordKeyClueBlockedAttempt(gameState);
                    const summary = kpEng.getScenePathSummary ? kpEng.getScenePathSummary(gameState) : { true: 0 };
                    const hint = evalResult.hint ? ` ${evalResult.hint}` : '';
                    const attempts = evalResult.attemptsLeft != null ? `（剩余 ${evalResult.attemptsLeft} 次后将降级放行）` : '';
                    return `错误：${evalResult.reason || `关键线索需要至少3条不同调查路径（当前真 ${summary.true}/3）`}${attempts}${hint}`;
                }
                if (evalResult.mode === 'degraded') {
                    gameState.chatHistory.push({
                        role: 'system',
                        isLocalOnly: true,
                        isAlert: true,
                        content: `⚠️ [KP引擎] ${evalResult.warning || '关键线索路径不足，已降级放行'}`
                    });
                    if (evalResult.hint) {
                        gameState.chatHistory.push({
                            role: 'system',
                            isLocalOnly: true,
                            content: `📋 [KP引擎] ${evalResult.hint}`
                        });
                    }
                }
                kpEng.updateAttention(gameState, 1, 'key_clue');
                if (kpEng.tickDoomClock) kpEng.tickDoomClock(gameState, 'key_clue');
            }
            const clueId = args.id || args.clue_id;
            if (!clueId) return '错误：缺少线索 id / clue_id';
            const hasStatus = args.status != null && String(args.status).trim() !== '';
            const hasNote = args.note != null;
            if (!hasStatus && !hasNote) return '错误：须提供 status 或 note';
            const ok = markClueStatus(clueId, hasStatus ? args.status : null, hasNote ? args.note : undefined);
            if (!ok) return `找不到线索：${clueId}`;
            if (hasStatus) return `线索状态已更新：${clueId} → ${args.status}`;
            return `线索备注已更新：${clueId}`;
        }
    };
};
