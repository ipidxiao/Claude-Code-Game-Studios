// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * Debug slash commands (Phase 3). Only known command tokens are handled;
 * other lines starting with `/` pass through to normal chat.
 */

import { getGameContext } from '../core/extensions.mjs';
import { resolveSelectedActiveChar } from '../state/selection.mjs';

/** Canonical command → aliases (lowercase). First token must match. */
const COMMAND_ALIASES = {
    help: ['help', '?', '帮助'],
    state: ['state', '状态'],
    roll: ['roll', '骰', 'dice'],
    lore: ['lore', '设定'],
    give: ['give', '给']
};

const KNOWN = new Set();
Object.keys(COMMAND_ALIASES).forEach((canon) => {
    COMMAND_ALIASES[canon].forEach((a) => KNOWN.add(String(a).toLowerCase()));
});

function resolveCanon(cmd) {
    const key = String(cmd || '').toLowerCase();
    for (const canon of Object.keys(COMMAND_ALIASES)) {
        if (COMMAND_ALIASES[canon].includes(key)) return canon;
    }
    return null;
}

/**
 * Parse `/cmd args`. Returns null if not a known slash command (pass-through).
 * @returns {{ cmd: string, args: string } | null}
 */
export function parseSlash(line) {
    const raw = String(line || '').trim();
    if (!raw.startsWith('/')) return null;
    const body = raw.slice(1).trim();
    if (!body) return null;
    // First token: Latin word, `?`, or CJK run — not digits-first narrative like /1920年…
    const m = body.match(/^([A-Za-z?][\w]*|[?]|[\u4e00-\u9fff]+)(?:\s+(.*))?$/u);
    if (!m) return null;
    const token = m[1];
    const canon = resolveCanon(token);
    if (!canon) return null;
    return { cmd: canon, args: (m[2] || '').trim() };
}

function helpText() {
    return [
        '可用斜杠命令（调试）：',
        '/help — 本帮助',
        '/state — 简要状态（剧本/地点/角色/战斗·追逐）',
        '/roll <notation> — 掷骰，如 /roll 1D100 或 /roll 2D6+1',
        '/lore — 上次 lorebook 注入摘要',
        '/give <物品名> — 向背包添加物品（调试）'
    ].join('\n');
}

function fmtHp(active) {
    if (!active) return '—';
    const hasDerived = active.derived && typeof active.derived.hp === 'number';
    const cur = hasDerived
        ? active.derived.hp
        : (typeof active.hp === 'number' ? active.hp : null);
    const max = active.maxHp != null
        ? active.maxHp
        : (active.derived && active.derived.maxHp != null ? active.derived.maxHp : null);
    const a = cur != null && Number.isFinite(Number(cur)) ? String(cur) : '—';
    const b = max != null && Number.isFinite(Number(max)) ? String(max) : '—';
    return a + '/' + b;
}

function cmdState(ctx) {
    const gs = ctx.gameState;
    if (!gs) return '错误：无 gameState';
    const r = gs.scenarioRunner || {};
    const active = resolveSelectedActiveChar(gs) || (gs.roster || []).find((c) => c && c.isActive) || (gs.roster || [])[0];
    const combatOn = !!(gs.combat && gs.combat.active);
    const chaseOn = !!(gs.chase && gs.chase.active);
    const lines = [
        '【状态】',
        '剧本: ' + (r.scenarioId || '(无)') + (r.scenarioTitle ? '「' + r.scenarioTitle + '」' : ''),
        '节点: ' + (r.currentNodeId || '(无)'),
        '地点: ' + (gs.currentLocation || '(未设)'),
        '角色: ' + (active ? active.name : '(无)'),
        '战斗: ' + (combatOn ? '进行中' : '否') + ' / 追逐: ' + (chaseOn ? '进行中' : '否'),
        'HP: ' + fmtHp(active)
    ];
    return lines.join('\n');
}

function cmdRoll(args, ctx) {
    const notation = String(args || '').trim();
    if (!notation) return '用法：/roll <notation> 例如 /roll 1D100';
    const Engine = ctx.Engine;
    if (Engine && typeof Engine.roll === 'function') {
        try {
            const res = Engine.roll(notation);
            if (res && (res.total != null || res.result != null)) {
                return '🎲 ' + notation + ' → **' + (res.total != null ? res.total : res.result) + '**'
                    + (res.detail ? '（' + res.detail + '）' : '');
            }
        } catch (_e) { /* fall through */ }
    }
    const m = notation.replace(/\s+/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!m) return '错误：无法解析骰式「' + notation + '」';
    const n = Math.max(1, Math.min(100, Number(m[1] || 1)));
    const sides = Math.max(2, Math.min(1000, Number(m[2])));
    const mod = m[3] ? Number(m[3]) : 0;
    const kept = [];
    for (let i = 0; i < n; i++) kept.push(1 + Math.floor(Math.random() * sides));
    const total = kept.reduce((a, b) => a + b, 0) + mod;
    return '🎲 ' + notation + ' → **' + total + '**（' + kept.join('+') + (mod ? (mod > 0 ? '+' : '') + mod : '') + '）';
}

function cmdLore(ctx) {
    const gs = ctx.gameState;
    if (!gs) return '错误：无 gameState';
    const last = gs.__loreLastInjected;
    if (!last) return '尚无 lore 注入记录（先进行一次 AI 回合或手动 buildLorePromptInjection）。';
    return [
        '【Lore 上次注入】',
        '条目: ' + ((last.ids && last.ids.length) ? last.ids.join(', ') : '(空)'),
        '字符: ' + (last.chars != null ? last.chars : '?') + ' / 预算 ' + (last.budget != null ? last.budget : '?'),
        '剩余: ' + (last.leftover != null ? last.leftover : '?'),
        '时间: ' + (last.at ? new Date(last.at).toISOString() : '?')
    ].join('\n');
}

function cmdGive(args, ctx) {
    const name = String(args || '').trim();
    if (!name) return '用法：/give <物品名>';
    const gs = ctx.gameState;
    if (!gs) return '错误：无 gameState';
    if (!Array.isArray(gs.inventory)) gs.inventory = [];
    gs.inventory.push(name);
    if (Array.isArray(gs.chatHistory)) {
        gs.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🎒 [调试] 已添加物品：' + name });
    }
    return '已添加：' + name + '（背包 ' + gs.inventory.length + ' 件）';
}

/**
 * @returns {{ handled: boolean, result?: string }}
 */
export function trySlash(line, ctx) {
    const parsed = parseSlash(line);
    if (!parsed) return { handled: false };
    return { handled: true, result: dispatchSlash(parsed.cmd, parsed.args, ctx) };
}

function dispatchSlash(cmd, args, ctxIn) {
    const ctx = ctxIn || getGameContext();
    switch (cmd) {
        case 'help': return helpText();
        case 'state': return cmdState(ctx);
        case 'roll': return cmdRoll(args, ctx);
        case 'lore': return cmdLore(ctx);
        case 'give': return cmdGive(args, ctx);
        default: return '未知命令：/' + cmd + '。输入 /help 查看列表。';
    }
}

/**
 * Execute a known slash line. Unknown / narrative `/…` returns null (caller should pass through).
 * For console: unknown still returns a string hint if forced via execute with known-only check.
 */
export function executeSlash(line, ctxIn) {
    const parsed = parseSlash(line);
    if (!parsed) {
        const raw = String(line || '').trim();
        if (raw.startsWith('/')) return null; // pass-through signal
        return '错误：斜杠命令须以 / 开头';
    }
    return dispatchSlash(parsed.cmd, parsed.args, ctxIn);
}

export const CoCSlash = {
    execute: executeSlash,
    trySlash,
    parseSlash,
    helpText,
    isKnownCommand: (line) => !!parseSlash(line)
};
