// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC Tool Handlers: Combat domain (AUDITFIX8)
 */
import { pauseForRuleCheck, setCombatReactAction, enqueueRuleCheck } from '../../state/rule_check.mjs';
import { resolveActor, resolveActorFromArgs, resolveEnemy, requireField, normalizeName } from '../resolve.mjs';
import { CoCItemDB } from '../../data/items.mjs';
import { CoCNpcTemplates, generateNpcFromTemplate, listSpawnableTemplateLabels } from '../../data/npc_templates.mjs';
import { KpExecutionEngine } from '../../campaign/kp_execution_engine.mjs';
import { getKpEngine } from '../../state/kp_config.mjs';
import { runEnemyCombatTurn, isActiveCombatEnemy, fillCombatEnemyFromRoster } from '../../engines/npc_behavior.mjs';
import { resolveInitiativeScore, textLooksFirearmReady } from '../../rules/ruleset_profile.mjs';

function cleanWeaponName(weaponStr) {
    return String(weaponStr || '').replace(/\[弹药:\d+\]/g, '').trim();
}

function equippedWeaponStr(c) {
    if (CoCItemDB && typeof CoCItemDB.equippedWeaponLabel === 'function') {
        const label = CoCItemDB.equippedWeaponLabel(c);
        if (label) return label;
    }
    return (c && c.equipment && c.equipment.weapon) || '';
}

function lookupWeaponCatalog(weaponStr) {
    const raw = cleanWeaponName(weaponStr);
    if (!raw) return null;
    if (CoCItemDB && typeof CoCItemDB.resolve === 'function') {
        const resolved = CoCItemDB.resolve(raw);
        if (resolved && (resolved.damage || resolved.type === 'firearm' || resolved.type === 'melee' || resolved.type === 'ranged')) {
            return resolved;
        }
    }
    if (CoCItemDB && CoCItemDB[raw] && typeof CoCItemDB[raw] === 'object' && CoCItemDB[raw].damage) {
        return CoCItemDB[raw];
    }
    return null;
}

function inferFirearmSkill(weaponStr) {
    const s = String(weaponStr || '');
    if (s.includes('步枪')) return '步枪';
    if (s.includes('霰弹')) return '霰弹枪';
    if (s.includes('冲锋')) return '冲锋枪';
    if (s.includes('机枪')) return '射击：机枪';
    if (/弓/.test(s)) return '射击：弓箭';
    if (/弩/.test(s)) return '射击：弩';
    if (/投掷|投矛|投石/.test(s)) return '投掷';
    return '手枪';
}

export function toCombatWeapon(weaponStr, kind, damageOverride) {
    const raw = cleanWeaponName(weaponStr);
    const cat = lookupWeaponCatalog(raw) || {};
    const isGun = kind === 'firearm' || cat.type === 'firearm' || cat.type === 'ranged';
    const skill = cat.skill
        || (cat.category === '手枪' ? '手枪'
            : cat.category === '霰弹枪' ? '霰弹枪'
            : cat.category === '弓' ? '射击：弓箭'
            : cat.category === '弩' ? '射击：弩'
            : cat.category === '投掷' ? '投掷'
            : (cat.category === '步枪' || (cat.category && String(cat.category).includes('步枪'))) ? '步枪'
            : cat.category === '冲锋枪' ? '射击：冲锋枪'
            : isGun ? inferFirearmSkill(raw)
            : '斗殴');
    let impale = cat.impale;
    const shotgun = /霰弹/.test(String(cat.category || '') + String(cat.name || '') + raw);
    if (impale == null && shotgun) impale = false;
    else if (impale == null && isGun) impale = true;
    const malfunction = cat.malfunction != null ? cat.malfunction
        : (cat.malf != null ? cat.malf : (isGun ? 100 : '—'));
    const capacity = cat.capacity != null ? cat.capacity
        : (cat.ammo != null ? cat.ammo : null);
    return {
        name: cat.name || raw || (isGun ? '武器' : '徒手'),
        type: isGun ? 'firearm' : 'melee',
        skill,
        damage: cat.damage || damageOverride || (isGun ? '1D6' : '1D3+DB'),
        impale,
        category: cat.category,
        malfunction,
        attacks: cat.attacks != null ? cat.attacks : 1,
        capacity,
        range: cat.range != null ? cat.range : undefined
    };
}

export function ammoTypeForWeapon(weaponStr) {
    const cat = lookupWeaponCatalog(cleanWeaponName(weaponStr)) || {};
    const nameBlob = String(cat.name || '') + String(cat.category || '');
    const skill = String(cat.skill || '');
    if (/弩/.test(nameBlob + skill) && !/枪/.test(nameBlob)) return '弩箭';
    if (/弓/.test(nameBlob + skill) && !/枪/.test(nameBlob)) return '箭';
    if (/投掷|投矛|投石/.test(nameBlob)) return null;
    if (/霰弹/.test(nameBlob)) return '霰弹';
    if (/冲锋/.test(nameBlob) || /冲锋枪/.test(skill)) return '9mm';
    if (/步枪|来复/.test(nameBlob)) return '步枪';
    if (/左轮/.test(nameBlob)) return '左轮';
    if (/手枪|pistol/i.test(nameBlob) || cat.category === '手枪') return '手枪';
    return (KpExecutionEngine && KpExecutionEngine.inferAmmoType)
        ? KpExecutionEngine.inferAmmoType(weaponStr)
        : null;
}

function autoVolleyRounds(Engine, attacker, weapon, ammo) {
    const skillName = (weapon && weapon.skill) || '射击';
    const skill = Engine && typeof Engine.getSkillValue === 'function'
        ? Number(Engine.getSkillValue(attacker, skillName)) || 0
        : 0;
    const tens = Math.max(1, Math.floor(skill / 10) || 1);
    const cap = ammo > 0 ? ammo : 30;
    return Math.max(1, Math.min(30, tens, cap));
}

function hasturServant(enemy) {
    const blob = [enemy && enemy.name, enemy && enemy.creatureId, enemy && enemy.description].filter(Boolean).join(' ');
    return /哈斯塔|拜亚基/.test(blob);
}

function enemyWeaponExpr(enemy, ranged) {
    const list = Array.isArray(enemy && enemy.weapons) ? enemy.weapons : [];
    const dice = /(\d+\s*[dD]\s*\d+(?:\s*\+\s*\d+\s*[dD]\s*\d+)*(?:\s*\+\s*\d+)*(?:\s*\+\s*(?:半)?DB(?:\s*\/\s*2)?)?)/;
    const gun = /枪|步枪|手枪|霰弹|冲锋|左轮|弩|弓/;
    let fallback = null;
    let fallbackRaw = '';
    for (let i = 0; i < list.length; i++) {
        const raw = String(list[i] || '');
        const m = raw.match(dice);
        if (!m) continue;
        const expr = m[1].replace(/\s+/g, '');
        const isGun = gun.test(raw);
        if (ranged && isGun) return { expr, raw };
        if (!ranged && !isGun) return { expr, raw };
        if (!fallback) {
            fallback = expr;
            fallbackRaw = raw;
        }
    }
    return fallback ? { expr: fallback, raw: fallbackRaw } : null;
}

function rejectDefeatedEnemy(enemy) {
    if (!enemy) return '错误：没有可攻击的敌人';
    const hpRaw = enemy.hp != null ? enemy.hp : (enemy.derived && enemy.derived.hp);
    const hp = Number(hpRaw);
    if (enemy.physicalImmune && !enemy.isDefeated) return null;
    if (enemy.isDefeated || (Number.isFinite(hp) && hp <= 0)) {
        const label = enemy.name ? '「' + enemy.name + '」' : '';
        return '错误：目标' + label + '已倒下，无法再攻击。';
    }
    return null;
}

export function combat(ctx) {
    const { gameState, Engine, addJournalEntry, startCombat, endCombat, updateEnemy, advanceTurn } = ctx;

    const denyAct = (ch, action) => {
        if (!Engine || typeof Engine.canAct !== 'function') return null;
        const gate = Engine.canAct(ch, action);
        if (gate && gate.ok === false) return gate.desc || '无法行动';
        return null;
    };

        const getKpEng = () => getKpEngine() || KpExecutionEngine;

    const applyFirearmRealityBlock = (firearmCheck, shooter, enemyName) => {
        if (!firearmCheck || !firearmCheck.blocked) return null;
        gameState.chatHistory.push({
            role: 'system',
            isLocalOnly: true,
            isAlert: true,
            content: '现实扭曲：弹道未生效（引擎判定）'
        });
        const reasonLabel = firearmCheck.reason === 'spatial_error' ? '空间错位' : '弹道失效';
        addJournalEntry({
            type: 'combat',
            charName: shooter.name,
            summary: `现实扭曲：${reasonLabel} — 对 ${enemyName || '目标'} 开火无效`,
            _realityDistortion: true
        });
        return `开火失败：现实扭曲（${reasonLabel}）`;
    };

    const pushEnemyDamageNotice = (enemy, actualDmg) => {
        if (!enemy) return '';
        const damage = Math.max(0, Number(actualDmg) || 0);
        const msg = enemy.isDefeated ? `${enemy.name} 已被击败！` : `${enemy.name} 受到 ${damage} 伤害（HP: ${enemy.hp}/${enemy.maxHp}）`;
        gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: enemy.isDefeated, content: `${enemy.isDefeated ? '💀' : '🩸'} ${msg}` });
        return msg;
    };

    // ── Ammo: structured c.equipment.ammo = { count, type } with [弹药:N] backward-compat ──
    const parseAmmoTag = (weaponStr) => {
        const m = (weaponStr || '').match(/\[弹药:(\d+)\]/);
        return m ? parseInt(m[1], 10) : null;
    };
    const readAmmo = (c) => {
        const eq = c.equipment || {};
        const tagged = parseAmmoTag(eq.weapon);
        if (tagged !== null) {
            // Inline tag stays authoritative for legacy saves / manual reloads; mirror it into the structured field.
            eq.ammo = { count: tagged, type: (eq.ammo && eq.ammo.type) || null };
            return tagged;
        }
        if (eq.ammo && typeof eq.ammo === 'object' && Number.isFinite(eq.ammo.count)) return eq.ammo.count;
        if (typeof eq.ammo === 'number') return eq.ammo;
        return 0;
    };
    const writeAmmo = (c, count, type) => {
        const eq = c.equipment || (c.equipment = {});
        const safe = Math.max(0, Number(count) | 0);
        eq.ammo = { count: safe, type: type || (eq.ammo && eq.ammo.type) || null };
        // Keep the inline [弹药:N] tag in sync for display, persistence and legacy readers.
        if (typeof eq.weapon === 'string' && eq.weapon) {
            const clean = eq.weapon.replace(/\[弹药:\d+\]/g, '').trim();
            eq.weapon = `${clean} [弹药:${safe}]`;
        }
    };

    const readBackpackAmmo = (weaponStr) => {
        const kpEng = getKpEng();
        if (!kpEng || !kpEng.inferAmmoType || !kpEng.countBackpackAmmo) return null;
        const ammoType = ammoTypeForWeapon(weaponStr);
        if (!ammoType) return null;
        return { ammoType, count: kpEng.countBackpackAmmo(gameState, ammoType) };
    };
    const spendAmmo = (weaponStr, amount, ammoType) => {
        const kpEng = getKpEng();
        if (kpEng && kpEng.consumeBackpackAmmo && ammoType) {
            kpEng.consumeBackpackAmmo(gameState, ammoType, amount);
            return kpEng.countBackpackAmmo(gameState, ammoType);
        }
        return null;
    };

    /**
     * Resolve rounds available for fire/burst.
     * When KP backpack helpers exist: backpack is SoT; count<=0 means empty (do NOT fall back to magazine).
     * When helpers unavailable: legacy readAmmo (magazine tag) only.
     */
    const resolveFireAmmoPool = (weaponStr, c, inferredAmmoType) => {
        const backpackAmmo = readBackpackAmmo(weaponStr);
        if (backpackAmmo) {
            const count = Math.max(0, Number(backpackAmmo.count) || 0);
            return {
                ammo: count,
                ammoType: backpackAmmo.ammoType || inferredAmmoType,
                fromBackpack: true
            };
        }
        return {
            ammo: readAmmo(c),
            ammoType: inferredAmmoType,
            fromBackpack: false
        };
    };

    const recordKpCombatAction = (label) => {
        const kpEng = getKpEng();
        if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && kpEng.recordCombatAction) {
            return kpEng.recordCombatAction(gameState, label);
        }
        return null;
    };

    const initCombatPowerTrack = () => {
        const active = (gameState.roster || []).filter((c) => c && c.isActive);
        gameState.combat._powerTrack = {
            startHp: active.map((c) => ({
                name: c.name,
                hp: (c.derived && typeof c.derived.hp === 'number') ? c.derived.hp : c.hp
            })),
            damageDealt: 0,
            hitCount: 0,
            ammoSpent: 0,
            startRound: gameState.combat.round || 1
        };
        gameState.combat._powerFinalized = false;
    };

    const mergeStoredSituation = (argsSituation) => {
        const stored = Object.assign({}, (gameState.combat && gameState.combat.situation) || {});
        // Attack snapshot ignores cover. The live situation.cover stays put.
        delete stored.cover;
        return Object.assign({}, stored, argsSituation || {});
    };

    const trackCombatDamage = (actualDmg) => {
        const track = gameState.combat?._powerTrack;
        if (!track) return;
        const dmg = Math.max(0, Number(actualDmg) || 0);
        if (dmg > 0) {
            track.damageDealt += dmg;
            track.hitCount += 1;
        }
    };

    const allEnemiesDefeated = () => {
        const enemies = gameState.combat?.enemies;
        return Array.isArray(enemies) && enemies.length > 0 && enemies.every((e) => e.isDefeated || (!e.physicalImmune && e.hp <= 0));
    };

    const maybeFinalizeCombatVictory = () => {
        const kpEng = getKpEng();
        if (!kpEng || !kpEng.finalizeCombatPower || !allEnemiesDefeated()) return;
        kpEng.finalizeCombatPower(gameState, 'victory');
    };

    const applyEnemyDamageWithKp = (enemyName, hpChange, note, actionLabel, options = {}) => {
        const list = (gameState.combat && gameState.combat.enemies) || [];
        const named = resolveEnemy(list, enemyName, {
            required: false, preferLiving: true, allowFirstFallback: false, roleLabel: '敌人'
        });
        const e = options.enemy
            || (options.enemyId && list.find((en) => en && en.id === options.enemyId))
            || (named.ok ? named.enemy : null)
            || list.find((en) => en && (en.name === enemyName || en._rosterName === enemyName));
        if (!e) return null;
        const rawChange = Number(hpChange) || 0;
        const skipArmor = !!options.skipArmor;
        const actualDmg = rawChange < 0
            ? (skipArmor ? Math.max(0, -rawChange) : Math.max(0, (-rawChange) - (e.armor || 0)))
            : 0;
        const kpEng = getKpEng();
        if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && actionLabel) {
            recordKpCombatAction(actionLabel);
        }
        if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && e._kpImmunity && rawChange < 0) {
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🛡️ [KP引擎] 纯伤害策略触发敌人免疫，本次伤害无效化。' });
            return { blocked: true, enemy: e };
        }
        updateEnemy(e.id || enemyName, rawChange < 0 ? -actualDmg : rawChange, note);
        if (rawChange < 0) trackCombatDamage(actualDmg);
        if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && e.hp <= 0) {
            kpEng.checkAntiOneShot(gameState, e);
        }
        if (e.hp <= 0 || e.isDefeated) maybeFinalizeCombatVictory();
        return { blocked: false, enemy: e, actualDmg };
    };

    const runManeuverCheck = (actionId, tagLabel, actorName, skillName, difficulty, enemyName) => {
        // omit actor → active (intentional); unknown name never falls through
        const actorGot = resolveActor(gameState, actorName, { allowActiveFallback: true, roleLabel: '该角色' });
        if (!actorGot.ok) return actorGot.error;
        const c = actorGot.actor;
        const gateAction = actionId === 'break_free' ? 'break_free' : 'melee';
        const blocked = denyAct(c, gateAction);
        if (blocked) return '错误：' + blocked;
        recordKpCombatAction(tagLabel);
        const enemies = (gameState.combat && gameState.combat.enemies) || [];
        const enemyGot = resolveEnemy(enemies, enemyName, {
            required: !!enemyName,
            preferLiving: true,
            allowFirstFallback: !enemyName,
            roleLabel: '敌人'
        });
        const enemy = enemyGot.ok ? enemyGot.enemy : null;
        if (enemyName && !enemyGot.ok) return enemyGot.error;
        if (enemy && actionId !== 'break_free') {
            const deadMan = rejectDefeatedEnemy(enemy);
            if (deadMan) return deadMan;
        }
        if (actionId === 'break_free') {
            if (!(c.status && c.status.grappled)) {
                return '错误：当前没有擒抱需要挣脱。';
            }
            if (!enemy) {
                delete c.status.grappled;
                const msg = `${c.name} 挣脱了擒抱（无对位敌人）。`;
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '⚔️ ' + msg });
                return msg;
            }
        }
        if (!enemy && actionId !== 'break_free') return '错误：找不到敌人';
        const kind = actionId === 'knockdown' ? 'knockdown' : actionId;
        const skill = skillName || '斗殴';
        return pauseForRuleCheck(gameState, {
            kind: 'maneuver',
            skill,
            roller: c.name,
            target: c.name,
            maneuverKind: kind,
            enemyName: enemy ? enemy.name : null,
            difficulty: difficulty || 'normal',
            prompt: `请进行【${skill}】检定（${c.name} · ${kind}）。`
        });
    };

    return {
        start_combat: (args) => {
            if (gameState.chase && gameState.chase.active) {
                return '错误：追逐进行中，请先 chase_action action=end 后再 start_combat。';
            }
            let enemies = args.enemies || [];
            if (!Array.isArray(enemies) || enemies.length === 0) {
                return '错误：start_combat 需要至少一名敌人（enemies 不能为空）';
            }
            enemies = enemies.map((e) => {
                if (typeof e === 'string') {
                    const name = String(e).trim();
                    if (!name) return null;
                    return { name, hp: 10 };
                }
                if (e && typeof e === 'object') return e;
                return null;
            }).filter(Boolean);
            if (!enemies.length) {
                return '错误：start_combat 需要至少一名敌人（enemies 不能为空）';
            }
            const kp = getKpEng();
            if (kp && kp.isEnabled && kp.isEnabled(gameState)) {
                enemies = kp.onCombatStart(gameState, enemies);
            }
            if (!Array.isArray(enemies) || enemies.length === 0) {
                return '错误：start_combat 需要至少一名敌人（enemies 不能为空）';
            }
            // Re-normalize after KP in case it returned strings
            enemies = enemies.map((e) => {
                if (typeof e === 'string') {
                    const name = String(e).trim();
                    return name ? { name, hp: 10 } : null;
                }
                return e && typeof e === 'object' ? e : null;
            }).filter(Boolean);
            if (!enemies.length) {
                return '错误：start_combat 需要至少一名敌人（enemies 不能为空）';
            }
            startCombat(enemies, args.location, args.notes);
            initCombatPowerTrack();
            const names = enemies.map(e => (e && e.name) || '敌人').join('、');
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `⚔️ [战斗开始] 敌人：${names}。战斗界面已激活，请查看战斗面板！` });
            return `战斗已开始，敌人：${names}`;
        },
        end_combat: (args) => {
            if (!gameState.combat || !gameState.combat.active) {
                return '错误：当前没有进行中的战斗。';
            }
            const kpEng = getKpEng();
            if (args.outcome === 'victory' && kpEng && kpEng.finalizeCombatPower) {
                kpEng.finalizeCombatPower(gameState, 'victory');
            } else if (gameState.combat) {
                delete gameState.combat._powerTrack;
                gameState.combat._powerFinalized = false;
            }
            endCombat(args.outcome, args.notes);
            return '战斗已结束';
        },
        update_enemy: (args) => {
            const list = (gameState.combat && gameState.combat.enemies) || [];
            const nameField = requireField(args, 'name', { label: 'name 或 enemy_name', aliases: ['enemy_name'] });
            if (!nameField.ok) return nameField.error;
            const enemyName = String(nameField.value);
            const enemyGot = resolveEnemy(list, enemyName, { required: true, preferLiving: true, roleLabel: '敌人' });
            if (!enemyGot.ok) return enemyGot.error;
            const e = enemyGot.enemy;
            const hasAbs = args.hp != null && args.hp !== '';
            const hasChange = args.hp_change != null && args.hp_change !== '';
            if (!hasAbs && !hasChange) {
                return '错误：须提供 hp（绝对值）或 hp_change';
            }
            const prevHp = Number(e.hp);
            const curHp = Number.isFinite(prevHp) ? prevHp : 0;
            const maxLabel = (e.maxHp != null && e.maxHp !== '') ? String(e.maxHp) : '—';
            if (hasAbs) {
                const abs = Number(args.hp);
                if (!Number.isFinite(abs)) return '错误：hp 须为数字';
                if (abs < 0) return '错误：hp 不能为负';
                const nextHp = Math.max(0, abs);
                if (nextHp === curHp) return '错误：无实际 HP 变化';
                if (Engine && typeof Engine.mirrorCurrentHp === 'function') Engine.mirrorCurrentHp(e, nextHp);
                else e.hp = nextHp;
                if (nextHp <= 0 && !e.physicalImmune) e.isDefeated = true;
                if (args.note) {
                    addJournalEntry && addJournalEntry({
                        type: 'combat',
                        summary: `${e.name} ${args.note}（HP: ${e.hp}/${maxLabel}）`
                    });
                }
                if (e.hp <= 0 || e.isDefeated) maybeFinalizeCombatVictory();
                return `${enemyName} HP 已更新（HP: ${e.hp}/${maxLabel}）`;
            }
            const rawChange = Number(args.hp_change);
            if (!Number.isFinite(rawChange)) return '错误：hp_change 须为数字';
            if (rawChange < 0) {
                return '错误：调查员伤害必须调用 fire_weapon 或 melee_attack（先掷命中，再结算贯穿/故障），不可用 update_enemy 直接填伤害。';
            }
            if (rawChange === 0) {
                return '错误：无实际 HP 变化（hp_change 为 0）';
            }
            const outcome = applyEnemyDamageWithKp(enemyName, rawChange, args.note, null, {
                enemy: e, enemyId: e.id
            });
            if (!outcome) return `找不到敌人: ${enemyName}`;
            const outMax = (outcome.enemy.maxHp != null && outcome.enemy.maxHp !== '')
                ? String(outcome.enemy.maxHp)
                : '—';
            return `${enemyName} HP 已更新（HP: ${outcome.enemy.hp}/${outMax}）`;
        },
        enemy_attack: (args) => {
            const targetField = requireField(args, 'target_name', { label: 'target_name' });
            if (!targetField.ok) return targetField.error;
            const targetGot = resolveActor(gameState, targetField.value, { required: true, roleLabel: '目标' });
            if (!targetGot.ok) return '找不到目标: ' + targetField.value;
            const c = targetGot.actor;
            const enemyGot = resolveEnemy((gameState.combat && gameState.combat.enemies) || [], args.enemy_name, {
                required: true, preferLiving: true, roleLabel: '敌人'
            });
            if (!enemyGot.ok) return enemyGot.error.replace(/^错误：须指定敌人$/, '找不到敌人: (未指定)');
            const enemy = enemyGot.enemy;
            if (!enemy.isEnemy) enemy.isEnemy = true;
            const turn = runEnemyCombatTurn(gameState, enemy, c.name);
            if (turn.outcome === 'held') {
                if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                    advanceTurn();
                }
                return turn.reaction.line || (enemy.name + ' 本轮无法攻击。');
            }
            if (turn.outcome === 'already' || turn.outcome === 'flee') {
                if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                    advanceTurn();
                }
                return turn.reaction.line || (enemy.name + (turn.outcome === 'already' ? '已离开战场。' : '脱离了战斗。'));
            }
            if (turn.outcome === 'negotiate') {
                enqueueRuleCheck(gameState, turn.check);
                return turn.reaction.line || (enemy.name + '停手，要求谈条件。');
            }
            if (turn.targetName && turn.targetName !== c.name) {
                const switched = resolveActor(gameState, turn.targetName, { required: true, roleLabel: '目标' });
                if (switched.ok) c = switched.actor;
            }
            const desc = String(args.description || '');
            const pointBlank = !!args.point_blank || /抵近|贴身|贴脸|近距离/.test(desc);
            const looksFirearm = !!(args.ranged || args.weapon_skill
                || /枪|射击|开火|开枪|弓|步枪|手枪|霰弹/.test(desc));
            // Point-blank firearms stay melee-range for fight-back, but still use firearm skill to hit.
            const ranged = !!(looksFirearm && !pointBlank && !/徒手|拳|踢|棍|刀|斧/.test(desc));
            const attackSkill = args.weapon_skill
                || args.skill_name
                || ((looksFirearm || ranged) ? (enemy.rangedSkill || '射击') : '斗殴');
            const attackOpts = {};
            if (pointBlank) attackOpts.bonusDice = 1;
            if (c.status && c.status.yellowSign && hasturServant(enemy)) {
                attackOpts.penaltyDice = (attackOpts.penaltyDice || 0) + 1;
            }
            const defenderCover = (c.status && c.status.cover) || (args.situation && args.situation.cover) || null;
            if ((defenderCover || args.situation) && Engine.SituationalEngine) {
                const sit = Engine.SituationalEngine.resolve({
                    attacker: enemy,
                    defender: c,
                    pointBlank,
                    ranged,
                    distance: args.distance,
                    situation: Object.assign({}, args.situation || {}, defenderCover ? { cover: defenderCover } : {})
                });
                attackOpts.bonusDice = (attackOpts.bonusDice || 0) + (sit.bonusDice || 0);
                attackOpts.penaltyDice = (attackOpts.penaltyDice || 0) + (sit.penaltyDice || 0);
            }
            const attackRes = Engine.checkSkill
                ? Engine.checkSkill(attackSkill, enemy, args.difficulty || 'normal', attackOpts)
                : { success: true, level: '成功', rolledValue: 50, targetValue: 50, skillValue: 50 };
            const penNote = attackOpts.penaltyDice ? `（惩罚骰${attackOpts.penaltyDice}）` : '';
            if (!attackRes.success) {
                gameState.chatHistory.push({
                    role: 'system', isLocalOnly: true, isAlert: true,
                    content: `⚔️ [${enemy.name}] 攻击落空（${attackSkill} ${attackRes.level} ${attackRes.rolledValue}/${attackRes.targetValue}）${penNote}。`
                });
                if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                    advanceTurn();
                }
                return `${enemy.name} 的攻击落空${penNote}。`;
            }
            const numeric = Number(args.damage);
            const flatDamage = Number.isFinite(numeric) ? Math.max(0, numeric) : null;
            const listed = (!Number.isFinite(numeric) && !args.damage) ? enemyWeaponExpr(enemy, ranged) : null;
            const damageDice = (!Number.isFinite(numeric) && args.damage)
                ? String(args.damage)
                : (listed ? listed.expr : (ranged ? '1D6' : '1D3'));
            const riderText = String((listed && listed.raw) || args.damage || damageDice || '');
            const stunOnHit = /眩晕/.test(riderText);
            return pauseForRuleCheck(gameState, {
                kind: 'combat_react',
                skill: '闪避',
                action: 'dodge',
                roller: c.name,
                target: c.name,
                attackerName: enemy.name,
                attackRes,
                attackSkill,
                flatDamage,
                damageDice,
                stunOnHit,
                riderText,
                attackPenaltyDice: attackOpts.penaltyDice || 0,
                ranged,
                prompt: `【被攻击】${enemy.name} 以${attackSkill}命中判定为${attackRes.level}${pointBlank ? '（抵近）' : ''}${penNote}。${c.name} 请选择闪避或反击（二选一），然后掷骰。${ranged ? '远程只能闪避。' : '默认闪避。'}`
            });
        },
        fire_weapon: (args) => {
            // omit shooter → active (intentional)
            // Legacy: when enemy_name is present, target_name was sometimes used as shooter
            // (never treat target_name as shooter if it is the only name and means the enemy).
            const shooterKeys = ['shooter_name', 'actor_name'];
            const enemyNameHint = args.enemy_name != null ? String(args.enemy_name).trim() : '';
            if (enemyNameHint && enemyNameHint !== 'undefined' && enemyNameHint !== 'null') {
                shooterKeys.push('target_name');
            }
            const shooterGot = resolveActorFromArgs(gameState, args, shooterKeys, {
                allowActiveFallback: true, roleLabel: '该角色'
            });
            if (!shooterGot.ok) return shooterGot.error;
            const c = shooterGot.actor;
            const enemies = (gameState.combat && gameState.combat.enemies) || [];
            const enemyGot = resolveEnemy(enemies, args.enemy_name, {
                required: !!args.enemy_name, preferLiving: true, allowFirstFallback: true, roleLabel: '敌人'
            });
            if (!enemyGot.ok) return enemyGot.error;
            const enemy = enemyGot.enemy;
            const deadFire = rejectDefeatedEnemy(enemy);
            if (deadFire) return deadFire;
            const kpEng = getKpEng();
            // Ammo: backpack inventory match by gun type (no chambered-state requirement)
            let weaponStr = equippedWeaponStr(c);
            const peekedMelee = lookupWeaponCatalog(cleanWeaponName(weaponStr));
            if (peekedMelee && peekedMelee.type === 'melee') {
                return '装备的是近战武器，请调用 melee_attack。';
            }
            const inferredAmmoType = ammoTypeForWeapon(weaponStr);
            const weaponBase = weaponStr.split('[')[0].trim() || '武器';
            const pool = resolveFireAmmoPool(weaponStr, c, inferredAmmoType);
            let ammo = pool.ammo;
            const ammoType = pool.ammoType;
            const isFirearm = !!inferredAmmoType;
            if (isFirearm && ammo <= 0) {
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `⚠️ ${c.name} 背包中没有匹配「${ammoType || '该枪型'}」的弹药！` });
                return '开火失败：背包无匹配弹药。';
            }
            const weaponObjEarly = toCombatWeapon(weaponBase, 'firearm', args.damage);
            const riderText = String(args.damage || weaponObjEarly.damage || weaponStr || '');
            const rateEarly = Engine.CombatEngine && Engine.CombatEngine.parseAttacksRate
                ? Engine.CombatEngine.parseAttacksRate(weaponObjEarly.attacks)
                : null;
            const explicitRounds = Number(args.rounds);
            const useVolley = !!(rateEarly && rateEarly.volley && !(Number.isFinite(explicitRounds) && explicitRounds > 0));
            const volleyShots = useVolley ? autoVolleyRounds(Engine, c, weaponObjEarly, ammo) : 1;
            if (useVolley && isFirearm && ammo < volleyShots) {
                return '开火失败：弹药不足。';
            }
            const fireEffects = Engine.Rules && Engine.Rules.compile
                ? Engine.Rules.compile({ kind: 'fire_weapon', weapon: weaponObjEarly, shots: 1 })
                : null;
            if (fireEffects && Engine.Rules.execute) {
                const gated = Engine.Rules.execute(fireEffects, { Engine, actor: c }, { phase: 'gate' });
                if (!gated.ok) return '开火失败：' + (gated.desc || '无法开火');
            } else {
                const blocked = denyAct(c, 'fire');
                if (blocked) return '错误：' + blocked;
                if (Engine.CombatEngine && Engine.CombatEngine.checkFireRate) {
                    const rateGate = Engine.CombatEngine.checkFireRate(c, weaponObjEarly);
                    if (!rateGate.ok) return '开火失败：' + rateGate.desc;
                }
            }
            if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && kpEng.handleFirearmAttempt) {
                const firearmCheck = kpEng.handleFirearmAttempt({ gameState });
                const blockedMsg = applyFirearmRealityBlock(firearmCheck, c, enemy.name);
                if (blockedMsg) return blockedMsg;
            }
            // Spend chase action only after gates pass (match melee_attack ordering).
            if (gameState.chase && gameState.chase.active && Engine.ChaseEngine && Engine.ChaseEngine.spendAction) {
                if (Engine.ChaseEngine.find(gameState.chase, c.name)) {
                    const chaseSpend = Engine.ChaseEngine.spendAction(gameState.chase, c.name);
                    if (!chaseSpend.ok) return '开火失败：' + (chaseSpend.desc || '追逐行动已用尽');
                }
            }
            const shotsSpent = useVolley ? volleyShots : 1;
            if (ammo > 0) {
                const remaining = spendAmmo(weaponStr, shotsSpent, ammoType);
                if (remaining != null) {
                    ammo = remaining;
                } else {
                    ammo = Math.max(0, ammo - shotsSpent);
                    writeAmmo(c, ammo, weaponBase);
                }
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `⚠️ 砰！${c.name} 开火 [消耗 ${shotsSpent} 发子弹，背包剩余 ${ammo} 发]` });
            }
            const weaponObj = weaponObjEarly;
            if (fireEffects && Engine.Rules.execute) {
                Engine.Rules.execute(fireEffects, { Engine, actor: c }, { phase: 'commit' });
            } else if (Engine.CombatEngine && Engine.CombatEngine.spendFireRate) {
                Engine.CombatEngine.spendFireRate(c, weaponObj, 1);
            }
            recordKpCombatAction('attack:fire_weapon:tactical');
            // Do not clear prone on attack — stand_up spends an action.
            const pointBlank = !!args.point_blank;
            const situation = mergeStoredSituation(args.situation);
            // Soak and cover dice use only the defender's own cover.
            const targetCover = (enemy.status && enemy.status.cover) || null;
            if (targetCover) {
                situation.cover = targetCover;
                situation.targetCover = targetCover;
            } else {
                delete situation.cover;
                delete situation.targetCover;
            }
            if (args.distance != null) situation.distance = Number(args.distance);
            if (pointBlank) situation.pointBlank = true;
            if (situation.cover && typeof situation.cover === 'object') {
                situation.coverDetail = situation.cover;
            } else if (Engine.CombatEngine && Engine.CombatEngine.normalizeCover && situation.cover) {
                situation.coverDetail = Engine.CombatEngine.normalizeCover(situation.cover);
            }
            let bonusDice = 0;
            let penaltyDice = 0;
            let difficulty = 'normal';
            if (Engine.SituationalEngine) {
                const sit = Engine.SituationalEngine.resolve({
                    attacker: c, defender: enemy, weapon: weaponObj,
                    distance: situation.distance, pointBlank, situation, ranged: true
                });
                bonusDice = sit.bonusDice || 0;
                penaltyDice = sit.penaltyDice || 0;
                difficulty = sit.difficulty || 'normal';
                if (sit.damageExpr) weaponObj.damage = sit.damageExpr;
                if (Engine.SituationalEngine.consumePendingPenalty) {
                    Engine.SituationalEngine.consumePendingPenalty(c);
                }
            } else if (Engine.CombatEngine && Engine.CombatEngine.shotBonusDice) {
                bonusDice = Engine.CombatEngine.shotBonusDice(c, enemy, { pointBlank });
            }
            if (Engine.CombatEngine && Engine.CombatEngine.consumeAim) Engine.CombatEngine.consumeAim(c);
            if (gameState.chase && gameState.chase.active && gameState.chase.vehicle) penaltyDice += 1;
            const dieNote = [
                bonusDice ? `${bonusDice}颗奖励骰` : '',
                penaltyDice ? `${penaltyDice}颗惩罚骰` : '',
                difficulty !== 'normal' ? `难度${difficulty}` : '',
                pointBlank ? '抵近' : ''
            ].filter(Boolean).join('；');
            const noteWrap = dieNote ? `（${dieNote}）` : '';
            const firePrompt = useVolley
                ? `请进行【${weaponObj.skill}】检定（${c.name} 全自动 ${volleyShots} 发，对 ${enemy.name}）${noteWrap}。引擎再结算命中档、闪避、故障与掩体。`
                : `请进行【${weaponObj.skill}】检定（${c.name} 对 ${enemy.name} 开火）${noteWrap}。引擎再结算闪避、故障与贯穿。`;
            return pauseForRuleCheck(gameState, {
                kind: 'combat_attack',
                burst: useVolley,
                mode: useVolley ? 'auto' : undefined,
                rounds: useVolley ? volleyShots : undefined,
                skill: weaponObj.skill,
                roller: c.name,
                target: c.name,
                shooterName: c.name,
                enemyName: enemy.name,
                weapon: weaponObj,
                riderText,
                bonusDice,
                penaltyDice,
                difficulty,
                distance: situation.distance,
                pointBlank,
                situation,
                skipStatusMods: true,
                prompt: firePrompt
            });
        },
        aim_weapon: (args) => {
            // omit shooter → active (intentional)
            const aimGot = resolveActorFromArgs(gameState, args, ['shooter_name'], {
                allowActiveFallback: true, roleLabel: '该角色'
            });
            if (!aimGot.ok) return aimGot.error;
            const c = aimGot.actor;
            const blockedAim = denyAct(c, 'aim');
            if (blockedAim) return '错误：' + blockedAim;
            const chasePartAim = (gameState.chase && gameState.chase.active && Engine.ChaseEngine && Engine.ChaseEngine.find)
                ? Engine.ChaseEngine.find(gameState.chase, c.name)
                : null;
            if (chasePartAim && (Number(chasePartAim.actionsLeft) || 0) <= 0) {
                return '瞄准失败：追逐行动已用尽';
            }
            const aimed = Engine.CombatEngine && Engine.CombatEngine.aimShot
                ? Engine.CombatEngine.aimShot(c)
                : { bonus: 1 };
            if (chasePartAim && Engine.ChaseEngine.spendAction) {
                Engine.ChaseEngine.spendAction(gameState.chase, c.name);
            }
            const targetNote = args.enemy_name ? ` 瞄准 ${args.enemy_name}` : '';
            const msg = `${c.name}${targetNote} 花费一轮瞄准（下次攻击 ${aimed.bonus} 颗奖励骰，最多 2）。受伤会打断。`;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `🎯 ${msg}` });
            addJournalEntry && addJournalEntry({ type: 'combat', charName: c.name, summary: msg });
            if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                advanceTurn();
            }
            return msg;
        },
        melee_attack: (args) => {
            // omit actor → active (intentional)
            const meleeGot = resolveActorFromArgs(gameState, args, ['actor_name'], {
                allowActiveFallback: true, roleLabel: '该角色'
            });
            if (!meleeGot.ok) return meleeGot.error;
            const c = meleeGot.actor;
            const blockedMelee = denyAct(c, 'melee');
            if (blockedMelee) return '错误：' + blockedMelee;
            const enemies = (gameState.combat && gameState.combat.enemies) || [];
            const enemyGot = resolveEnemy(enemies, args.enemy_name, {
                required: !!args.enemy_name, preferLiving: true, allowFirstFallback: true, roleLabel: '敌人'
            });
            if (!enemyGot.ok) return enemyGot.error;
            const enemy = enemyGot.enemy;
            const deadMelee = rejectDefeatedEnemy(enemy);
            if (deadMelee) return deadMelee;
            const weaponStr = equippedWeaponStr(c);
            const peeked = lookupWeaponCatalog(cleanWeaponName(weaponStr));
            if (peeked && (peeked.type === 'firearm' || peeked.type === 'ranged')) {
                return '装备的是火器，请调用 fire_weapon。';
            }
            const weaponObj = toCombatWeapon(weaponStr || '徒手', 'melee', args.damage);
            const riderText = String(args.damage || weaponObj.damage || weaponStr || '');
            if (gameState.chase && gameState.chase.active && Engine.ChaseEngine && Engine.ChaseEngine.spendAction) {
                if (Engine.ChaseEngine.find(gameState.chase, c.name)) {
                    const chaseSpend = Engine.ChaseEngine.spendAction(gameState.chase, c.name);
                    if (!chaseSpend.ok) return '近战失败：' + (chaseSpend.desc || '追逐行动已用尽');
                }
            }
            recordKpCombatAction('attack:melee');
            // Do not clear prone on attack — stand_up spends an action.
            let bonusDice = 0;
            let penaltyDice = 0;
            if (Engine.SituationalEngine) {
                const situation = mergeStoredSituation(args.situation);
                const sit = Engine.SituationalEngine.resolve({
                    attacker: c, defender: enemy, weapon: weaponObj, ranged: false,
                    situation, distance: situation.distance
                });
                bonusDice = sit.bonusDice || 0;
                penaltyDice = sit.penaltyDice || 0;
                if (Engine.SituationalEngine.consumePendingPenalty) {
                    Engine.SituationalEngine.consumePendingPenalty(c);
                }
            } else if (Engine.CombatEngine && Engine.CombatEngine.shotBonusDice) {
                bonusDice = Engine.CombatEngine.shotBonusDice(c, enemy, {});
            }
            if (Engine.CombatEngine && Engine.CombatEngine.consumeAim) Engine.CombatEngine.consumeAim(c);
            const dieNote = [
                bonusDice ? `${bonusDice}颗奖励骰` : '',
                penaltyDice ? `${penaltyDice}颗惩罚骰` : ''
            ].filter(Boolean).join('；');
            const noteWrap = dieNote ? `（${dieNote}）` : '';
            return pauseForRuleCheck(gameState, {
                kind: 'combat_attack',
                skill: weaponObj.skill,
                roller: c.name,
                target: c.name,
                shooterName: c.name,
                enemyName: enemy.name,
                weapon: weaponObj,
                riderText,
                bonusDice,
                penaltyDice,
                skipStatusMods: true,
                prompt: `请进行【${weaponObj.skill}】检定（${c.name} 近战攻击 ${enemy.name}）${noteWrap}。引擎再结算闪避与贯穿。`
            });
        },
        stand_up: (args) => {
            // omit actor → active (intentional)
            const standGot = resolveActorFromArgs(gameState, args, ['actor_name'], {
                allowActiveFallback: true, roleLabel: '该角色'
            });
            if (!standGot.ok) return standGot.error;
            const c = standGot.actor;
            const chasePart = (gameState.chase && gameState.chase.active && Engine.ChaseEngine && Engine.ChaseEngine.find)
                ? Engine.ChaseEngine.find(gameState.chase, c.name)
                : null;
            if (chasePart && (Number(chasePart.actionsLeft) || 0) <= 0) {
                return '起身失败：追逐行动已用尽';
            }
            let result;
            if (Engine.Rules && Engine.Rules.compile && Engine.Rules.execute) {
                const fx = Engine.Rules.compile({ kind: 'stand_up' });
                const ran = Engine.Rules.execute(fx, { Engine, actor: c });
                if (!ran.ok) return ran.desc || '起身失败';
                result = { ok: true, desc: (ran.notes && ran.notes[0]) || (c.name + ' 起身站稳。') };
            } else {
                const blocked = denyAct(c, 'stand');
                if (blocked) return '错误：' + blocked;
                result = Engine.standUp ? Engine.standUp(c) : (Engine.ConditionsEngine && Engine.ConditionsEngine.standUp(c));
                if (!result || !result.ok) return (result && result.desc) || '起身失败';
            }
            if (chasePart && Engine.ChaseEngine.spendAction) {
                Engine.ChaseEngine.spendAction(gameState.chase, c.name);
            }
            if (!c.status) c.status = {};
            c.status.aimBonus = 0;
            if (c.status.aiming) delete c.status.aiming;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🧍 ' + result.desc });
            addJournalEntry && addJournalEntry({ type: 'combat', charName: c.name, summary: result.desc });
            if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                advanceTurn();
            }
            return result.desc;
        },
        dive_for_cover: (args) => {
            // omit actor → active (intentional)
            const diveGot = resolveActorFromArgs(gameState, args, ['actor_name'], {
                allowActiveFallback: true, roleLabel: '该角色'
            });
            if (!diveGot.ok) return diveGot.error;
            const c = diveGot.actor;
            const chasePart = (gameState.chase && gameState.chase.active && Engine.ChaseEngine && Engine.ChaseEngine.find)
                ? Engine.ChaseEngine.find(gameState.chase, c.name)
                : null;
            if (chasePart && (Number(chasePart.actionsLeft) || 0) <= 0) {
                return '扑掩失败：追逐行动已用尽';
            }
            const kind = args.cover === 'hard' ? 'hard' : 'soft';
            let result;
            if (Engine.Rules && Engine.Rules.compile && Engine.Rules.execute) {
                const fx = Engine.Rules.compile({ kind: 'dive_for_cover', cover: kind });
                const ran = Engine.Rules.execute(fx, { Engine, actor: c });
                if (!ran.ok) return ran.desc || '扑掩失败';
                const diveDetail = (ran.results || []).find((r) => r.op === 'dive_for_cover');
                result = (diveDetail && diveDetail.detail) || { ok: true, cover: kind, desc: ran.notes[0] };
            } else {
                const blocked = denyAct(c, 'dive');
                if (blocked) return '错误：' + blocked;
                result = Engine.diveForCover
                    ? Engine.diveForCover(c, kind)
                    : (Engine.ConditionsEngine && Engine.ConditionsEngine.diveForCover(c, kind));
                if (!result || !result.ok) return (result && result.desc) || '扑掩失败';
            }
            if (chasePart && Engine.ChaseEngine.spendAction) {
                Engine.ChaseEngine.spendAction(gameState.chase, c.name);
            }
            if (!c.status) c.status = {};
            // Cover belongs to the diver (defender when shot) — never global combat.situation.cover.
            const coverState = (Engine.CombatEngine && Engine.CombatEngine.normalizeCover)
                ? Engine.CombatEngine.normalizeCover(result.cover || kind)
                : { kind: result.cover || kind };
            c.status.cover = coverState;
            c.status.aimBonus = 0;
            if (c.status.aiming) delete c.status.aiming;
            if (gameState.combat && gameState.combat.situation && gameState.combat.situation.cover) {
                // Drop legacy global cover left by older dive_for_cover writes.
                delete gameState.combat.situation.cover;
            }
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🛡️ ' + result.desc });
            addJournalEntry && addJournalEntry({ type: 'combat', charName: c.name, summary: result.desc });
            if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                advanceTurn();
            }
            return result.desc;
        },
        reload_weapon: (args) => {
            // omit actor/shooter → active (intentional)
            const reloadGot = resolveActorFromArgs(gameState, args, ['actor_name', 'shooter_name'], {
                allowActiveFallback: true, roleLabel: '该角色'
            });
            if (!reloadGot.ok) return reloadGot.error;
            const c = reloadGot.actor;
            const clearJam = args.clear_jam !== false;
            const parts = [];
            if (Engine.Rules && Engine.Rules.compile && Engine.Rules.execute) {
                const fx = Engine.Rules.compile({ kind: 'reload_weapon', clearJam: clearJam });
                const ran = Engine.Rules.execute(fx, { Engine, actor: c });
                if (!ran.ok) return '错误：' + (ran.desc || '无法换弹');
                if (ran.notes && ran.notes.length) parts.push(...ran.notes);
            } else {
                const blocked = denyAct(c, 'reload');
                if (blocked) return '错误：' + blocked;
                const wasJammed = !!(c.status && c.status.weaponJammed);
                if (wasJammed && clearJam && Engine.CombatEngine && Engine.CombatEngine.clearWeaponJam) {
                    const cleared = Engine.CombatEngine.clearWeaponJam(c);
                    if (cleared.ok) parts.push(cleared.desc);
                } else if (wasJammed && !clearJam) {
                    return '错误：武器仍卡壳，须先排除故障。';
                }
            }
            if (c.status && c.status.weaponJammed && !clearJam) {
                return '错误：武器仍卡壳，须先排除故障。';
            }
            const weaponStr = equippedWeaponStr(c);
            const weaponBase = weaponStr.split('[')[0].trim() || '武器';
            const weaponObj = toCombatWeapon(weaponBase, 'firearm', null);
            let cap = weaponObj.capacity;
            if (typeof cap === 'string') {
                const m = cap.match(/(\d+)/);
                cap = m ? parseInt(m[1], 10) : null;
            }
            cap = Number(cap);
            if (!Number.isFinite(cap) || cap < 1) cap = 6;
            const backpackAmmo = readBackpackAmmo(weaponStr);
            const chambered = readAmmo(c);
            const need = Math.max(0, cap - chambered);
            let loaded = 0;
            const chasePartReload = (gameState.chase && gameState.chase.active && Engine.ChaseEngine && Engine.ChaseEngine.find)
                ? Engine.ChaseEngine.find(gameState.chase, c.name)
                : null;
            if (chasePartReload && (Number(chasePartReload.actionsLeft) || 0) <= 0) {
                return '换弹失败：追逐行动已用尽';
            }
            if (need > 0 && backpackAmmo && backpackAmmo.count > 0) {
                loaded = Math.min(need, backpackAmmo.count);
                spendAmmo(weaponStr, loaded, backpackAmmo.ammoType);
                writeAmmo(c, chambered + loaded, weaponBase);
                parts.push(c.name + ' 装填 ' + loaded + ' 发（弹匣容量 ' + cap + '，现有 ' + (chambered + loaded) + '）。');
            } else if (need <= 0) {
                parts.push(c.name + ' 弹匣已满（' + chambered + '/' + cap + '）。');
            } else {
                // Never invent a free magazine when backpack ammo path is missing/empty.
                parts.push(c.name + ' 背包无匹配弹药可装填。');
            }
            // A no-op reload (full magazine / no ammo) must not burn a chase action.
            if (chasePartReload && Engine.ChaseEngine.spendAction && loaded > 0) {
                Engine.ChaseEngine.spendAction(gameState.chase, c.name);
            }
            const msg = parts.join(' ') || (c.name + ' 完成换弹。');
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🔄 ' + msg });
            addJournalEntry && addJournalEntry({ type: 'combat', charName: c.name, summary: msg });
            if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                advanceTurn();
            }
            return msg;
        },
        spawn_npc: (args) => {
            const tmpl = args.template || '邪教徒';
            const overrides = {};
            if (args.name) overrides.name = args.name;
            if (args.hp) overrides.hp = args.hp;
            if (args.armor != null) overrides.armor = args.armor;
            if (args.description) overrides.description = args.description;
            const npc = generateNpcFromTemplate(tmpl, overrides);
            if (!npc) return '错误：未找到模板 ' + tmpl + '。可用：' + (listSpawnableTemplateLabels ? listSpawnableTemplateLabels() : Object.keys(CoCNpcTemplates || {})).slice(0, 40).join('、') + '…';
            if (!gameState.combat) return '错误：战斗状态未初始化';
            gameState.combat.enemies = gameState.combat.enemies || [];
            fillCombatEnemyFromRoster(npc, gameState.npcRegistry);
            npc._rosterName = npc._rosterName || npc.name;
            npc.id = 'npc_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            gameState.combat.enemies.push(npc);
            if (gameState.combat.active) {
                const order = gameState.combat.initiativeOrder || (gameState.combat.initiativeOrder = []);
                const anchor = order[gameState.combat.currentTurnIdx] || null;
                const firearmReady = textLooksFirearmReady((npc.weapons || []).join(' '));
                const scored = resolveInitiativeScore(npc, { firearmReady });
                order.push({
                    id: npc.id,
                    name: npc.name,
                    initiative: scored.initiative,
                    sortKey: scored.sortKey,
                    firearmReady: !!scored.firearmReady,
                    isEnemy: true
                });
                order.sort((a, b) => {
                    const bk = (b.sortKey != null ? b.sortKey : b.initiative);
                    const ak = (a.sortKey != null ? a.sortKey : a.initiative);
                    return bk - ak;
                });
                if (anchor) {
                    const at = order.findIndex((t) => t === anchor
                        || (anchor.id && t.id && t.id === anchor.id)
                        || (t.name === anchor.name && !!t.isEnemy === !!anchor.isEnemy));
                    if (at >= 0) gameState.combat.currentTurnIdx = at;
                }
            }
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true,
                content: '👤 ' + npc.name + ' 登场！(' + npc.description + ')' });
            addJournalEntry({ type: 'npc_spawn', charName: npc.name, summary: '模板:' + tmpl + ' HP:' + npc.hp + ' 护甲:' + npc.armor });
            return npc.name + ' 已生成（模板:' + tmpl + ' HP:' + npc.hp + ' 护甲:' + npc.armor + '）。';
        },
        burst_fire: (args) => {
            // omit shooter → selected/active. target_name is shooter only when an enemy is also named.
            const burstShooterKeys = ['shooter_name'];
            const burstEnemyHint = (args.enemy_name != null && normalizeName(args.enemy_name))
                || (Array.isArray(args.enemy_names) && args.enemy_names.some((n) => normalizeName(n)));
            if (burstEnemyHint) burstShooterKeys.push('target_name');
            const burstGot = resolveActorFromArgs(gameState, args, burstShooterKeys, {
                allowActiveFallback: true, roleLabel: '该角色'
            });
            if (!burstGot.ok) return burstGot.error;
            const c = burstGot.actor;
            const enemies = (gameState.combat && gameState.combat.enemies) || [];
            const nameList = Array.isArray(args.enemy_names)
                ? args.enemy_names.map(function(n) { return String(n || '').trim(); }).filter(Boolean)
                : [];

            let sweepTargets = [];
            if (nameList.length) {
                for (let i = 0; i < nameList.length; i++) {
                    const found = resolveEnemy(enemies, nameList[i], {
                        required: true, preferLiving: true, roleLabel: '敌人'
                    });
                    if (!found.ok) return found.error;
                    sweepTargets.push(found.enemy);
                }
            }

            const namedEnemy = args.enemy_name
                ? resolveEnemy(enemies, args.enemy_name, { required: true, preferLiving: true, roleLabel: '敌人' })
                : { ok: false };
            if (args.enemy_name && !namedEnemy.ok && !sweepTargets.length) return namedEnemy.error;
            if (!sweepTargets.length && namedEnemy.ok) sweepTargets = [namedEnemy.enemy];
            if (!sweepTargets.length) {
                const unnamed = resolveEnemy(enemies, '', {
                    required: false, preferLiving: true, allowFirstFallback: true, roleLabel: '敌人'
                });
                if (!unnamed.ok) return unnamed.error;
                sweepTargets = [unnamed.enemy];
            }
            const enemy = sweepTargets[0];
            if (!enemy) return '错误：没有可攻击的敌人';

            const weaponStr = equippedWeaponStr(c);
            const weaponBase = weaponStr.split('[')[0].trim();
            const kpEngAmmo = getKpEng();
            const inferredAmmoType = ammoTypeForWeapon(weaponStr);
            const pool = resolveFireAmmoPool(weaponStr, c, inferredAmmoType);
            let ammo = pool.ammo;
            const ammoType = pool.ammoType;
            const isFirearm = !!inferredAmmoType;

            if (isFirearm && ammo <= 0) {
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '⚠️ 背包中没有匹配「' + (ammoType || '该枪型') + '」的弹药！' });
                return '开火失败：背包无匹配弹药。';
            }

            const weaponObj = toCombatWeapon(weaponBase || weaponStr, 'firearm', args.damage);
            const burstRider = String(args.damage || weaponObj.damage || '');
            const rate = Engine.CombatEngine && Engine.CombatEngine.parseAttacksRate
                ? Engine.CombatEngine.parseAttacksRate(weaponObj.attacks)
                : null;
            const mode = args.mode || (rate && rate.volley ? 'auto' : 'burst');
            let rounds;
            if (Number.isFinite(Number(args.rounds)) && Number(args.rounds) > 0) {
                rounds = Math.max(1, Math.min(Number(args.rounds), ammo > 0 ? ammo : 30, 30));
            } else if (mode === 'auto') {
                rounds = autoVolleyRounds(Engine, c, weaponObj, ammo);
            } else {
                rounds = Math.max(1, Math.min(3, ammo > 0 ? ammo : 3, 30));
            }
            if (ammo < rounds) {
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '⚠️ 弹药不足！需要 ' + rounds + ' 发，背包仅剩 ' + ammo + ' 发。' });
                return '开火失败：弹药不足。';
            }
            const burstFx = Engine.Rules && Engine.Rules.compile
                ? Engine.Rules.compile({ kind: 'burst_fire', weapon: weaponObj })
                : null;
            if (burstFx && Engine.Rules.execute) {
                const gated = Engine.Rules.execute(burstFx, { Engine, actor: c }, { phase: 'gate' });
                if (!gated.ok) return '开火失败：' + (gated.desc || '无法开火');
            } else {
                const blockedBurst = denyAct(c, 'fire');
                if (blockedBurst) return '错误：' + blockedBurst;
                if (Engine.CombatEngine && Engine.CombatEngine.checkFireRate) {
                    const rateGate = Engine.CombatEngine.checkFireRate(c, weaponObj);
                    if (!rateGate.ok) return '开火失败：' + rateGate.desc;
                }
            }

            const kpEng = getKpEng();
            if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && kpEng.handleFirearmAttempt) {
                const firearmCheck = kpEng.handleFirearmAttempt({ gameState });
                const blockedMsg = applyFirearmRealityBlock(firearmCheck, c, enemy.name);
                if (blockedMsg) {
                    if (typeof advanceTurn === 'function' && gameState.combat && gameState.combat.active) {
                        advanceTurn();
                    }
                    return blockedMsg;
                }
            }
            // Spend chase action only after gates pass (match fire_weapon).
            if (gameState.chase && gameState.chase.active && Engine.ChaseEngine && Engine.ChaseEngine.spendAction) {
                if (Engine.ChaseEngine.find(gameState.chase, c.name)) {
                    const chaseSpend = Engine.ChaseEngine.spendAction(gameState.chase, c.name);
                    if (!chaseSpend.ok) return '开火失败：' + (chaseSpend.desc || '追逐行动已用尽');
                }
            }
            const remaining = spendAmmo(weaponStr, rounds, ammoType);
            if (remaining != null) ammo = remaining;
            else {
                ammo -= rounds;
                writeAmmo(c, ammo, weaponBase);
            }
            if (burstFx && Engine.Rules.execute) {
                Engine.Rules.execute(burstFx, { Engine, actor: c }, { phase: 'commit' });
            } else if (Engine.CombatEngine && Engine.CombatEngine.spendFireRate) {
                Engine.CombatEngine.spendFireRate(c, weaponObj, 1);
            }
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🔫 ' + c.name + ' 连射 [' + rounds + ' 发] [背包剩余弹药:' + ammo + ']' });

            const useSweep = sweepTargets.length > 1 && Engine.CombatEngine.resolveSweepFire;
            const burstSitFor = (target) => {
                const sit = {};
                const cover = (target && target.status && target.status.cover) || null;
                if (cover) {
                    sit.cover = cover;
                    sit.targetCover = cover;
                    sit.coverDetail = cover;
                }
                if (args.distance != null) sit.distance = Number(args.distance);
                if (args.point_blank) sit.pointBlank = true;
                return sit;
            };
            const harder = (a, b) => {
                const order = { normal: 0, regular: 0, hard: 1, extreme: 2 };
                const ra = order[a] != null ? order[a] : 0;
                const rb = order[b] != null ? order[b] : 0;
                return ra >= rb ? (a || 'normal') : (b || 'normal');
            };
            let burstBonus = 0;
            let burstPenalty = 0;
            let burstDiff = 'normal';
            if (Engine.SituationalEngine) {
                for (let i = 0; i < sweepTargets.length; i++) {
                    const t = sweepTargets[i];
                    const localSit = burstSitFor(t);
                    const sit = Engine.SituationalEngine.resolve({
                        attacker: c, defender: t, weapon: weaponObj,
                        distance: localSit.distance, pointBlank: !!localSit.pointBlank,
                        situation: localSit, ranged: true
                    });
                    burstBonus = Math.max(burstBonus, sit.bonusDice || 0);
                    burstPenalty = Math.max(burstPenalty, sit.penaltyDice || 0);
                    burstDiff = harder(burstDiff, sit.difficulty || 'normal');
                    if (sit.damageExpr) weaponObj.damage = sit.damageExpr;
                }
                if (Engine.SituationalEngine.consumePendingPenalty) {
                    Engine.SituationalEngine.consumePendingPenalty(c);
                }
            }
            if (Engine.CombatEngine.consumeAim) Engine.CombatEngine.consumeAim(c);
            if (gameState.chase && gameState.chase.active && gameState.chase.vehicle) burstPenalty += 1;
            recordKpCombatAction('attack:fire_weapon:tactical');
            const dieNote = [
                burstBonus ? burstBonus + '颗奖励骰' : '',
                burstPenalty ? burstPenalty + '颗惩罚骰' : '',
                burstDiff !== 'normal' ? '难度' + burstDiff : '',
                useSweep ? ('扫射 ' + sweepTargets.length + ' 目标') : (mode === 'auto' ? '全自动' : '点射')
            ].filter(Boolean).join('；');
            const noteWrap = dieNote ? '（' + dieNote + '）' : '';
            return pauseForRuleCheck(gameState, {
                kind: 'combat_attack',
                burst: true,
                sweep: useSweep,
                skill: weaponObj.skill,
                roller: c.name,
                target: c.name,
                shooterName: c.name,
                enemyName: enemy.name,
                enemyNames: sweepTargets.map(function (t) { return t.name; }),
                weapon: weaponObj,
                riderText: burstRider,
                rounds: rounds,
                mode: mode,
                bonusDice: burstBonus,
                penaltyDice: burstPenalty,
                difficulty: burstDiff,
                distance: args.distance,
                pointBlank: !!args.point_blank,
                situation: burstSitFor(enemy),
                skipStatusMods: true,
                prompt: '请进行【' + weaponObj.skill + '】检定（' + c.name + ' 连射 ' + rounds + ' 发）' + noteWrap + '。引擎再结算命中档、闪避、故障与掩体。'
            });
        },
        dodge: (args) => {
            const pending = gameState.pendingRuleCheck;
            if (pending && pending.kind === 'combat_react') {
                const actorName = normalizeName(args && (args.actor_name || args.target_name));
                const pendingWho = pending.roller || pending.target;
                if (actorName && pendingWho && actorName !== pendingWho) {
                    return '错误：当前待反应的是' + pendingWho + '，不是' + actorName;
                }
                setCombatReactAction(gameState, 'dodge');
                recordKpCombatAction('survive:dodge');
                // Do not return forceCheck — dice prompt already exists; only patch skill/action.
                return pending.prompt || '已选择闪避，请掷骰。';
            }
            return '当前没有正在进行的攻击可闪避。等待敌人攻击后，闪避与反击只能二选一。';
        },
        fight_back: (args) => {
            const pending = gameState.pendingRuleCheck;
            if (pending && pending.kind === 'combat_react') {
                const actorName = normalizeName(args && (args.actor_name || args.target_name));
                const pendingWho = pending.roller || pending.target;
                if (actorName && pendingWho && actorName !== pendingWho) {
                    return '错误：当前待反应的是' + pendingWho + '，不是' + actorName;
                }
                if (pending.ranged) return '远程攻击只能闪避，不能反击。';
                recordKpCombatAction('fight_back:counter');
                pending.counterDamage = args.damage || pending.counterDamage || '1D3';
                setCombatReactAction(gameState, 'counter', { skill: args.skill_name || '斗殴' });
                return pending.prompt || '已选择反击，请掷骰。';
            }
            return '当前没有正在进行的近战攻击可反击。等待敌人攻击后，闪避与反击只能二选一。';
        },
        disarm: (args) => {
            return runManeuverCheck('disarm', 'disarm:缴械', args.actor_name, args.skill_name, args.difficulty, args.enemy_name);
        },
        grapple: (args) => {
            return runManeuverCheck('grapple', 'grapple:擒抱', args.actor_name, args.skill_name, args.difficulty, args.enemy_name);
        },
        shove: (args) => {
            return runManeuverCheck('shove', 'shove:推搡', args.actor_name, args.skill_name, args.difficulty, args.enemy_name);
        },
        knockdown: (args) => {
            return runManeuverCheck('knockdown', 'knockdown:击倒', args.actor_name, args.skill_name, args.difficulty, args.enemy_name);
        },
        break_free: (args) => {
            return runManeuverCheck('break_free', 'break_free:挣脱', args.actor_name, args.skill_name, args.difficulty, args.enemy_name);
        },
        set_combat_situation: (args) => {
            if (!gameState.combat) gameState.combat = {};
            const prev = gameState.combat.situation || {};
            if (args.distance != null && args.distance !== '') {
                const dist = Number(args.distance);
                if (!Number.isFinite(dist)) {
                    return '错误：distance 须为数字';
                }
            }
            let cover = args.cover !== undefined ? args.cover : prev.cover;
            if (cover && Engine.CombatEngine && Engine.CombatEngine.normalizeCover) {
                cover = Engine.CombatEngine.normalizeCover(cover) || cover;
            }
            if (args.cover_armor != null || args.cover_hp != null) {
                const base = (cover && typeof cover === 'object')
                    ? cover
                    : (Engine.CombatEngine && Engine.CombatEngine.normalizeCover
                        ? Engine.CombatEngine.normalizeCover(args.cover || 'soft')
                        : { kind: 'soft', armor: 2, hp: 8, maxHp: 8 });
                if (args.cover_armor != null) base.armor = Number(args.cover_armor);
                if (args.cover_hp != null) {
                    base.hp = Number(args.cover_hp);
                    base.maxHp = Number(args.cover_hp);
                }
                cover = base;
            }
            const next = Object.assign({}, prev);
            if (args.outnumbered !== undefined) next.outnumbered = !!args.outnumbered;
            if (args.surprise !== undefined) next.surprise = !!args.surprise;
            if (args.darkness !== undefined) next.darkness = args.darkness || false;
            if (args.cover !== undefined || args.cover_armor != null || args.cover_hp != null) next.cover = cover;
            if (args.distance != null && args.distance !== '') next.distance = Number(args.distance);
            gameState.combat.situation = next;
            const s = gameState.combat.situation;
            const coverLabel = s.cover && typeof s.cover === 'object'
                ? (s.cover.kind + ' 装甲' + s.cover.armor + ' 耐久' + s.cover.hp)
                : (s.cover || '无');
            const msg = `战斗情境：人数优势=${!!s.outnumbered} 突袭=${!!s.surprise} 黑暗=${s.darkness || '无'} 掩体=${coverLabel} 距离=${s.distance != null ? s.distance : '未设'}`;
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `⚔️ [情境] ${msg}` });
            return msg;
        }
    };
};
