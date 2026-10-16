// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC Tool Handlers: Inventory domain (AUDITFIX8)
 */
import { pauseForRuleCheck } from '../../state/rule_check.mjs';
import { resolveActorFromArgs, normalizeName } from '../resolve.mjs';
import { CoCItemDB } from '../../data/items.mjs';
import { KpExecutionEngine } from '../../campaign/kp_execution_engine.mjs';
import { getKpEngine } from '../../state/kp_config.mjs';

const MYTHOS_CONTACT_KEYS = ['target_name', 'character_name', 'actor_name', 'char_name'];

/**
 * Resolve who contacts a mythos item for SAN.
 * Named target → resolveActor (never silent isActive).
 * Else clearly selected UI PC (roster[selectedCharIndex] if isActive).
 * Else reject — no roster.find(isActive) / roster[0] fallback.
 */
function resolveMythosContact(gameState, args) {
    let provided = '';
    for (let i = 0; i < MYTHOS_CONTACT_KEYS.length; i++) {
        const k = MYTHOS_CONTACT_KEYS[i];
        if (args && normalizeName(args[k])) {
            provided = args[k];
            break;
        }
    }
    if (provided) {
        return resolveActorFromArgs(gameState, args, MYTHOS_CONTACT_KEYS, {
            required: true,
            roleLabel: '接触者'
        });
    }
    const roster = (gameState && gameState.roster) || [];
    if (Number.isFinite(gameState && gameState.selectedCharIndex)) {
        const at = roster[gameState.selectedCharIndex];
        if (at && at.isActive) {
            return { ok: true, actor: at, key: 'selectedCharIndex' };
        }
    }
    return {
        ok: false,
        error: '错误：神话物品须指定 target_name（谁接触该物品），或先在界面选中活跃调查员'
    };
}

export function inventory(ctx) {
    const { gameState, addJournalEntry, Engine } = ctx;

    const _kp = () => getKpEngine() || KpExecutionEngine;

    return {
        update_inventory: (args) => {
            const kp = _kp();
            const kpOn = kp && kp.isEnabled && kp.isEnabled(gameState);
            const source = args.source || args.acquisition_source || null;
            if (kpOn && !source) {
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🚫 [KP引擎] 物品须有明确获取来源（source），不可默认叙事授予。' });
                return '物品未添加：KP 开启时须指定 source';
            }
            const effectiveSource = source || 'narrative_grant';
            let added = [];
            let pause = null;
            let mythosContactCache = null;
            (Array.isArray(args.items) ? args.items : [args.items]).forEach(i => {
                // Support structured items: {name, damage, skill, type, qty}
                const isObj = typeof i === 'object' && i !== null;
                if (isObj && Object.prototype.hasOwnProperty.call(i, 'qty')) {
                    const q = Number(i.qty);
                    if (!Number.isFinite(q) || q <= 0) {
                        gameState.chatHistory.push({
                            role: 'system', isLocalOnly: true, isAlert: true,
                            content: '🚫 物品数量须为正数，已跳过：' + String(i.name || i.id || '物品')
                        });
                        return;
                    }
                }
                const raw = isObj ? (i.name || '') : String(i || '');
                let ci = String(raw).trim();
                if (!ci) return;
                if (kpOn) {
                    const v = kp.validateItemAcquisition(ci, effectiveSource);
                    if (!v.ok) {
                        gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `🚫 [KP引擎] 物品拒绝：${v.reason}` });
                        return;
                    }
                    const myth = kp.checkMythosItem(ci);
                    if (myth.isMythos && myth.requiresSanCheck) {
                        if (!mythosContactCache) {
                            mythosContactCache = resolveMythosContact(gameState, args || {});
                        }
                        if (!mythosContactCache.ok) {
                            gameState.chatHistory.push({
                                role: 'system', isLocalOnly: true, isAlert: true,
                                content: '🚫 ' + mythosContactCache.error + '（物品「' + ci + '」未添加）'
                            });
                            return;
                        }
                        const contact = mythosContactCache.actor;
                        const sanPause = pauseForRuleCheck(gameState, {
                            kind: 'san',
                            skill: 'SAN',
                            roller: contact.name,
                            target: contact.name,
                            notation: myth.sanLoss || '1/1D6',
                            cause: myth.cause,
                            capKey: 'mythos_item:' + ci,
                            prompt: `请进行【SAN】检定（${contact.name}）。接触神话物品「${ci}」。失败按大档扣理智。`
                        });
                        if (!pause) pause = sanPause;
                    }
                }
                gameState.inventory.push(ci);
                // Register custom weapon stats if AI provided them
                if (isObj && (i.damage || i.skill)) {
                    if (!gameState._customWeapons) gameState._customWeapons = {};
                    gameState._customWeapons[ci] = {
                        name: ci, damage: i.damage || '1D6',
                        skill: i.skill || '斗殴', type: i.type || 'weapon'
                    };
                    // Register with CoCItemDB for combat/equip lookup (ESM single source)
                    if (CoCItemDB && !CoCItemDB[ci]) {
                        CoCItemDB[ci] = gameState._customWeapons[ci];
                    }
                }
                added.push(ci);
            });
            if (added.length > 0) {
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🎒 [获得物品] ${added.join(', ')}` });
                addJournalEntry({ type: 'item_found', summary: `获得：${added.join('、')}（来源：${effectiveSource}）` });
            }
            const summary = added.length ? `已添加: ${added.join('、')}` : (kpOn ? '物品未添加（KP规则校验失败）' : '无物品添加');
            if (pause) return { msg: summary + ' ' + pause.msg, forceCheck: pause.forceCheck };
            if (mythosContactCache && !mythosContactCache.ok && !added.length) {
                return mythosContactCache.error;
            }
            return summary;
        },
        consume_inventory_items: (args) => {
            const labelOf = (invItem) => (typeof invItem === 'string' ? invItem : (invItem && invItem.name) || '');
            const findIndex = (list, want) => {
                // Exact match only — avoid 刀 matching 手术刀 via includes().
                return list.findIndex((invItem) => labelOf(invItem) === want);
            };
            const wants = (Array.isArray(args.items) ? args.items : [args.items])
                .map((i) => String(i || '').trim())
                .filter(Boolean);
            if (!wants.length) return '错误：未指定要消耗的物品';

            // Transactional: resolve all indices on a working copy first; abort if any missing.
            const working = gameState.inventory.slice();
            const plan = [];
            const missing = [];
            for (const want of wants) {
                const idx = findIndex(working, want);
                if (idx === -1) {
                    missing.push(want);
                } else {
                    plan.push({ want, idx, item: working[idx] });
                    working.splice(idx, 1);
                }
            }
            if (missing.length) {
                return `错误：缺少物品，未消耗任何物品：${missing.join('、')}`;
            }
            // Apply removals to live inventory in reverse original-index order using fresh finds.
            const removed = [];
            for (const want of wants) {
                const idx = findIndex(gameState.inventory, want);
                if (idx === -1) {
                    // Should not happen after plan; restore already-removed if somehow race.
                    return `错误：消耗中断，物品状态不一致：${want}`;
                }
                removed.push(gameState.inventory[idx]);
                gameState.inventory.splice(idx, 1);
            }
            const labels = removed.map((r) => (typeof r === 'string' ? r : r.name));
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🔽 [消耗/失去] ${labels.join(', ')}` });
            addJournalEntry({ type: 'item_lost', summary: `失去/消耗：${labels.join('、')}` });
            return `已消耗: ${labels.join('、')}`;
        }
    };
};
