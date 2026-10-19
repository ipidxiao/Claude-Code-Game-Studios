// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * Unified actor / field resolution for tool handlers (Phase 1).
 *
 * Rules:
 * - Non-empty unknown name → error (never silent isActive fallback).
 * - Omit/empty + allowActiveFallback → active investigator (documented call sites only).
 * - Omit/empty + fallbackActor → that actor (e.g. heal omit healer → patient).
 * - Omit/empty + required → clear error without `undefined` in the string.
 */

import { isActiveCombatEnemy } from '../engines/npc_behavior.mjs';
import { resolveSelectedActiveChar } from '../state/selection.mjs';

export function normalizeName(name) {
    if (name == null) return '';
    const s = String(name).trim();
    if (s === 'undefined' || s === 'null') return '';
    return s;
}

export function getRoster(rosterOrState) {
    if (!rosterOrState) return [];
    if (Array.isArray(rosterOrState)) return rosterOrState;
    return rosterOrState.roster || [];
}

/**
 * @param {object|array} rosterOrState
 * @param {string|null|undefined} name
 * @param {{ required?: boolean, allowActiveFallback?: boolean, fallbackActor?: object, roleLabel?: string }} [opts]
 * @returns {{ ok: true, actor: object } | { ok: false, error: string }}
 */
export function resolveActor(rosterOrState, name, opts = {}) {
    const required = !!opts.required;
    const allowActiveFallback = !!opts.allowActiveFallback;
    const fallbackActor = opts.fallbackActor || null;
    const roleLabel = opts.roleLabel || '角色';
    const roster = getRoster(rosterOrState);
    const key = normalizeName(name);

    if (key) {
        const actor = roster.find((r) => r && r.name === key) || null;
        if (!actor) {
            return { ok: false, error: '错误：找不到' + roleLabel + '：' + key };
        }
        return { ok: true, actor };
    }

    // Name omitted / empty
    if (fallbackActor) {
        return { ok: true, actor: fallbackActor };
    }
    if (allowActiveFallback) {
        const fromSelected = (!Array.isArray(rosterOrState) && rosterOrState)
            ? resolveSelectedActiveChar(rosterOrState)
            : null;
        const actor = fromSelected || roster.find((r) => r && r.isActive) || null;
        if (!actor) {
            return { ok: false, error: '错误：找不到' + roleLabel };
        }
        return { ok: true, actor };
    }
    if (required) {
        return { ok: false, error: '错误：须指定' + roleLabel };
    }
    return { ok: false, error: '错误：找不到' + roleLabel };
}

/**
 * Pick first non-empty among arg keys, then resolveActor.
 * @param {object|array} rosterOrState
 * @param {object} args
 * @param {string|string[]} keys
 * @param {object} [opts] — same as resolveActor
 */
export function resolveActorFromArgs(rosterOrState, args, keys, opts = {}) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    let name = '';
    let usedKey = null;
    for (let i = 0; i < keyList.length; i++) {
        const k = keyList[i];
        if (args && args[k] != null && normalizeName(args[k])) {
            name = args[k];
            usedKey = k;
            break;
        }
    }
    const result = resolveActor(rosterOrState, name, opts);
    if (result.ok) result.key = usedKey;
    return result;
}

/**
 * @param {array} enemies
 * @param {string|null|undefined} name
 * @param {{ required?: boolean, preferLiving?: boolean, roleLabel?: string, allowFirstFallback?: boolean }} [opts]
 * @returns {{ ok: true, enemy: object } | { ok: false, error: string }}
 */
export function resolveEnemy(enemies, name, opts = {}) {
    const list = Array.isArray(enemies) ? enemies : [];
    const preferLiving = opts.preferLiving !== false;
    const roleLabel = opts.roleLabel || '敌人';
    const required = !!opts.required;
    const allowFirstFallback = opts.allowFirstFallback !== false;
    const key = normalizeName(name);

    if (key) {
        const matches = (e) => e && (e.name === key || e._rosterName === key);
        let enemy = preferLiving
            ? (list.find((e) => matches(e) && isActiveCombatEnemy(e)) || null)
            : null;
        if (!enemy) enemy = list.find((e) => matches(e)) || null;
        if (!enemy) {
            return { ok: false, error: '找不到' + roleLabel + ': ' + key };
        }
        if (preferLiving && !isActiveCombatEnemy(enemy)) {
            if (enemy._npcFled || enemy._npcStoodDown) {
                return { ok: false, error: roleLabel + '已离开或无法再战: ' + key };
            }
            return { ok: false, error: '错误：目标「' + key + '」已倒下，无法再攻击。' };
        }
        return { ok: true, enemy };
    }

    if (required) {
        return { ok: false, error: '错误：须指定' + roleLabel };
    }
    const pool = preferLiving
        ? list.filter((e) => isActiveCombatEnemy(e))
        : list.filter((e) => e);
    if (!allowFirstFallback) {
        return { ok: false, error: '错误：须指定' + roleLabel };
    }
    if (pool.length === 1) return { ok: true, enemy: pool[0] };
    if (pool.length === 0) {
        return { ok: false, error: '错误：没有可攻击的敌人' };
    }
    return { ok: false, error: '错误：须指定' + roleLabel };
}

/**
 * @param {object} args
 * @param {string} key
 * @param {{ label?: string, aliases?: string[] }} [opts]
 * @returns {{ ok: true, value: *, key: string } | { ok: false, error: string }}
 */
export function requireField(args, key, opts = {}) {
    const label = opts.label || key;
    const aliases = Array.isArray(opts.aliases) ? opts.aliases : [];
    const keys = [key].concat(aliases);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (args && args[k] != null) {
            const raw = args[k];
            if (typeof raw === 'string') {
                const trimmed = normalizeName(raw);
                if (!trimmed) continue;
                return { ok: true, value: trimmed, key: k };
            }
            // numbers / bools / objects — accept as-is if not nullish string-empty
            return { ok: true, value: raw, key: k };
        }
    }
    return { ok: false, error: '错误：须提供 ' + label };
}
