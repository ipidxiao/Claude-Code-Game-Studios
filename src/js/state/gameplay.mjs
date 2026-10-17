// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { clampSelectedCharIndex } from './selection.mjs';
import { buildCombatEndAftermath } from './aftermath.mjs';
import { voidChaseRuleChecks, enqueueRuleCheck } from './rule_check.mjs';
import { CoCItemDB } from '../data/items.mjs';
import { textLooksFirearmReady } from '../rules/ruleset_profile.mjs';
import { CoCEngine } from '../coc.mjs';
import { fillCombatEnemyFromRoster, isActiveCombatEnemy } from '../engines/npc_behavior.mjs';
import { markExplored, presentInvIds } from './visibility.mjs';

/**
 * CoC State Gameplay — combat, dice, clues, map, growth, NPC.
 *
 * Factory receives the core state object and returns all gameplay mutation methods.
 */
export const CoCStateGameplay = (function() {
    const create = function(core) {
        const { gameState, addJournalEntry } = core;

        // ═══ Combat ═══
        const _rollD10 = () => Math.floor(Math.random() * 10) + 1;

        const startCombat = (enemies, location, notes) => {
            const nameCount = new Map();
            const normalized = (enemies || []).map((e) => {
                if (typeof e === 'string') {
                    const name = String(e).trim();
                    return name ? { name, hp: 10 } : null;
                }
                return e && typeof e === 'object' ? e : null;
            }).filter(Boolean);
            gameState.combat.enemies = normalized.map((raw) => {
                fillCombatEnemyFromRoster(raw, gameState.npcRegistry);
                const base = String(raw.name || '敌人');
                const n = nameCount.get(base) || 0;
                nameCount.set(base, n + 1);
                const name = n === 0 ? base : (base + '·' + (n + 1));
                const hp = (raw.hp != null && raw.hp !== '' && Number.isFinite(Number(raw.hp)))
                    ? Number(raw.hp)
                    : 10;
                const maxHp = Number(raw.maxHp) > 0 ? Number(raw.maxHp) : (hp > 0 ? hp : 10);
                const row = {
                    id: 'enemy_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    name,
                    _rosterName: base,
                    description: raw.description || '',
                    hp,
                    maxHp,
                    armor: raw.armor || 0,
                    isEnemy: true,
                    isDefeated: false
                };
                if (raw.relation) row.relation = raw.relation;
                if (raw.skills) row.skills = raw.skills;
                if (raw.rangedSkill) row.rangedSkill = raw.rangedSkill;
                if (raw.weapon) row.weapon = raw.weapon;
                if (raw.weapons) row.weapons = raw.weapons;
                if (raw.attacks) row.attacks = raw.attacks;
                if (raw.equipment) row.equipment = raw.equipment;
                if (raw.ranged != null) row.ranged = raw.ranged;
                return row;
            });
            gameState.combat.sanLostThisFight = 0;
            gameState._lastEnemyAttackKey = null;
            try {
                if (typeof window !== 'undefined' && window.CoCExtensions && window.CoCExtensions.emit) {
                    window.CoCExtensions.emit('combat:start', {
                        enemyCount: (gameState.combat.enemies || []).length,
                        location: location || gameState.currentLocation || null
                    });
                }
            } catch (_e) { /* ignore */ }
            const order = [];
            const Engine = (typeof window !== 'undefined' && CoCEngine) || null;
            const resolveInit = Engine && Engine.Ruleset && Engine.Ruleset.resolveInitiativeScore
                ? Engine.Ruleset.resolveInitiativeScore
                : null;
            const isFirearmReady = (c) => {
                const w = (CoCItemDB.equippedWeaponLabel && CoCItemDB.equippedWeaponLabel(c))
                    || (c.equipment && c.equipment.weapon)
                    || (Array.isArray(c.weapons) ? c.weapons.join(' ') : '');
                return textLooksFirearmReady(w);
            };
            gameState.roster.filter(c => c.isActive && c.attrs).forEach(c => {
                if (resolveInit) {
                    const scored = resolveInit(c, { firearmReady: isFirearmReady(c), rollD10: _rollD10 });
                    order.push({
                        id: c.name,
                        name: c.name,
                        initiative: scored.initiative,
                        sortKey: scored.sortKey,
                        firearmReady: !!scored.firearmReady,
                        isEnemy: false
                    });
                } else {
                    order.push({ id: c.name, name: c.name, initiative: ((c.attrs && c.attrs.DEX) || 50) + _rollD10(), isEnemy: false });
                }
            });
            gameState.combat.enemies.forEach((e) => {
                if (resolveInit) {
                    const scored = resolveInit(e, { firearmReady: isFirearmReady(e), rollD10: _rollD10 });
                    order.push({
                        id: e.id,
                        name: e.name,
                        initiative: scored.initiative,
                        sortKey: scored.sortKey,
                        firearmReady: !!scored.firearmReady,
                        isEnemy: true
                    });
                } else {
                    order.push({ id: e.id, name: e.name, initiative: 40 + _rollD10() * 2, isEnemy: true });
                }
            });
            order.sort((a, b) => {
                const ka = (a.sortKey != null) ? a.sortKey : a.initiative;
                const kb = (b.sortKey != null) ? b.sortKey : b.initiative;
                return kb - ka;
            });
            gameState.combat.initiativeOrder = order;
            gameState.combat.currentTurnIdx = 0;
            gameState.combat.round = 1;
            gameState.combat.location = location || gameState.currentLocation;
            gameState.combat.notes = notes || '';
            gameState.combat.active = true;
            addJournalEntry({ type: 'combat_start', summary: `战斗开始：${gameState.combat.enemies.map(e=>e.name).join('、')} @ ${gameState.combat.location}` });
        };

        const _isActiveCombatant = (turn) => {
            if (!turn) return false;
            if (turn.isEnemy) {
                const e = gameState.combat.enemies.find(en => en.id === turn.id || en.name === turn.name);
                return isActiveCombatEnemy(e);
            }
            return !!gameState.roster.find(c => {
                if (!c || c.name !== turn.name || !c.isActive) return false;
                const hp = (c.derived && typeof c.derived.hp === 'number') ? c.derived.hp
                    : (typeof c.hp === 'number' ? c.hp : null);
                return hp == null || hp > 0;
            });
        };

        const cleanupInitiativeOrder = () => {
            if (!gameState.combat || !Array.isArray(gameState.combat.initiativeOrder)) return 0;
            const before = gameState.combat.initiativeOrder.length;
            const idx = Number.isFinite(gameState.combat.currentTurnIdx) ? gameState.combat.currentTurnIdx : 0;
            const prev = gameState.combat.initiativeOrder[idx] || null;
            const activeOrder = gameState.combat.initiativeOrder.filter(_isActiveCombatant);
            gameState.combat.initiativeOrder.splice(0, gameState.combat.initiativeOrder.length, ...activeOrder);
            if (activeOrder.length === 0) {
                gameState.combat.currentTurnIdx = 0;
            } else if (prev) {
                // Re-anchor to the same combatant after removals (do not only clamp index).
                const at = activeOrder.findIndex((t) =>
                    (prev.id && t.id && t.id === prev.id)
                    || (t.name === prev.name && !!t.isEnemy === !!prev.isEnemy)
                );
                gameState.combat.currentTurnIdx = at >= 0
                    ? at
                    : Math.max(0, Math.min(idx, activeOrder.length - 1));
            } else {
                gameState.combat.currentTurnIdx = Math.max(0, Math.min(idx, activeOrder.length - 1));
            }
            return before - activeOrder.length;
        };

        const endCombat = (outcome, notes) => {
            gameState.combat.active = false;
            const outcomeLabels = { victory:'胜利', defeat:'败北', fled:'撤退', other:'结束' };
            addJournalEntry({ type: 'combat_end', summary: `战斗${outcomeLabels[outcome] || outcome}：${notes || ''}` });
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `⚔️ [战斗结束] ${outcomeLabels[outcome] || outcome}${notes ? '：' + notes : ''}` });
            const chase = gameState.chase;
            if (chase && chase.active) {
                if (chase.vehicle) {
                    gameState.chatHistory.push({
                        role: 'system', isLocalOnly: true,
                        content: '🏃 [追逐] 战斗结束，载具追逐仍在继续。'
                    });
                } else {
                    chase.active = false;
                    chase.outcome = chase.outcome || 'combat_ended';
                    const voided = voidChaseRuleChecks(gameState);
                    gameState.chatHistory.push({
                        role: 'system', isLocalOnly: true,
                        content: '🏃 [追逐] 战斗结束，同步结束徒步追逐。'
                            + (voided ? '（已作废 ' + voided + ' 个未掷的追逐检定）' : '')
                    });
                }
            }
            buildCombatEndAftermath(gameState);
        };

        const updateEnemy = (nameOrId, hpChange, note) => {
            const key = String(nameOrId || '');
            const list = gameState.combat.enemies || [];
            const matches = (en) => en && (en.id === key || en.name === key || en._rosterName === key);
            let e = list.find((en) => isActiveCombatEnemy(en) && matches(en))
                || list.find((en) => en && !en.isDefeated && matches(en))
                || list.find((en) => matches(en));
            if (!e) return false;
            const nextHp = Math.max(0, (Number(e.hp) || 0) + hpChange);
            if (typeof CoCEngine.mirrorCurrentHp === 'function') CoCEngine.mirrorCurrentHp(e, nextHp);
            else e.hp = nextHp;
            if (e.hp <= 0 && !e.physicalImmune) {
                e.isDefeated = true;
                addJournalEntry({ type: 'combat', summary: `${e.name} 被击败！` });
                cleanupInitiativeOrder();
            }
            if (note) {
                const maxLabel = (e.maxHp != null && e.maxHp !== '') ? String(e.maxHp) : '—';
                addJournalEntry({ type: 'combat', summary: `${e.name} ${note}（HP: ${e.hp}/${maxLabel}）` });
            }
            return true;
        };

        const advanceTurn = () => {
            if (!gameState.combat.active) return;
            const idxBefore = Number.isFinite(gameState.combat.currentTurnIdx) ? gameState.combat.currentTurnIdx : 0;
            const prevTurn = (gameState.combat.initiativeOrder || [])[idxBefore] || null;
            cleanupInitiativeOrder();
            const activeOrder = gameState.combat.initiativeOrder;
            const stillThere = !!(prevTurn && activeOrder.some((t) =>
                (prevTurn.id && t.id && t.id === prevTurn.id)
                || (t.name === prevTurn.name && !!t.isEnemy === !!prevTurn.isEnemy)
            ));
            if (activeOrder.length === 0) {
                gameState.combat.currentTurnIdx = 0;
                const pcsAlive = (gameState.roster || []).some((c) => {
                    if (!c || !c.isActive) return false;
                    const hp = (c.derived && typeof c.derived.hp === 'number') ? c.derived.hp
                        : (typeof c.hp === 'number' ? c.hp : null);
                    return hp == null || hp > 0;
                });
                const enemies = gameState.combat.enemies || [];
                const foesAlive = enemies.some((e) => isActiveCombatEnemy(e));
                const leftOnly = enemies.some((e) => e && (e._npcFled || e._npcStoodDown)) && !enemies.some((e) => e && e.isDefeated);
                if (!pcsAlive) endCombat('defeat', '先攻队列清空');
                else if (leftOnly) {
                    const left = enemies.filter((e) => e && (e._npcFled || e._npcStoodDown));
                    const stood = left.filter((e) => e._npcStoodDown);
                    const fledOnly = left.filter((e) => e._npcFled && !e._npcStoodDown);
                    let leaveNote = '对方停手或脱离';
                    if (stood.length && !fledOnly.length) leaveNote = '对方停手';
                    else if (!stood.length && fledOnly.length) leaveNote = '敌人脱离战场';
                    endCombat('other', leaveNote);
                }
                else if (!foesAlive) endCombat('victory', '先攻队列清空');
                else endCombat('other', '先攻队列清空');
                return;
            }
            if (prevTurn && !stillThere) {
                if (idxBefore >= activeOrder.length) {
                    gameState.combat.currentTurnIdx = activeOrder.length;
                } else {
                    return;
                }
            }
            gameState.combat.currentTurnIdx++;
            if (gameState.combat.currentTurnIdx >= activeOrder.length) {
                gameState.combat.currentTurnIdx = 0;
                gameState.combat.round++;
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `⚔️ ── 第 ${gameState.combat.round} 回合 ──` });
                const Engine = (typeof window !== 'undefined' && CoCEngine) || null;
                if (Engine && Engine.RoundTick && typeof Engine.RoundTick.process === 'function') {
                    const tick = Engine.RoundTick.process(gameState);
                    const enqueue = enqueueRuleCheck;
                    (tick.events || []).forEach((ev) => {
                        if (!ev) return;
                        if (ev.kind === 'dying_check_needed') {
                            if (enqueue) {
                                enqueue(gameState, {
                                    kind: 'dying',
                                    skill: '体质',
                                    roller: ev.name,
                                    target: ev.name,
                                    prompt: `【濒死·每轮】${ev.name} 请进行体质检定。失败则死亡。`
                                });
                            } else {
                                gameState.chatHistory.push({
                                    role: 'system', isLocalOnly: true, isAlert: true,
                                    content: `💀 [濒死] ${ev.name} 需要每轮 CON 检定（请进行体质检定）。`
                                });
                            }
                        } else if (ev.kind === 'drown_con_needed') {
                            if (enqueue) {
                                enqueue(gameState, {
                                    kind: 'drown_con',
                                    skill: '体质',
                                    roller: ev.name,
                                    target: ev.name,
                                    prompt: `【溺水】${ev.name} 屏息已尽，请进行体质检定。失败受到 1D6 伤害。`
                                });
                            }
                        } else if (ev.damage > 0) {
                            gameState.chatHistory.push({
                                role: 'system', isLocalOnly: true, isAlert: true,
                                content: `🩸 [回合效果·${ev.kind}] ${ev.name} 受到 ${ev.damage} 点伤害。`
                            });
                        }
                    });
                }
            }
        };

        // ═══ Dice ═══
        const _parseDice = (notation) => {
            const m = notation.trim().match(/^(\d+)d(\d+)(?:([kl])(\d+))?([+\-]\d+)?$/i);
            if (!m) return null;
            const [, n, sides, keepMode, keepN, modStr] = m;
            const count = Math.min(+n, 20), s = Math.min(+sides, 1000);
            const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * s) + 1);
            let kept = [...rolls];
            if (keepMode && keepMode.toLowerCase() === 'k') kept = [...rolls].sort((a,b)=>b-a).slice(0, Math.min(+(keepN||1), count));
            if (keepMode && keepMode.toLowerCase() === 'l') kept = [...rolls].sort((a,b)=>a-b).slice(0, Math.min(+(keepN||1), count));
            const mod = modStr ? +modStr : 0;
            const total = kept.reduce((s,r)=>s+r,0) + mod;
            return { rolls, kept, total, mod, count, sides: s, keepMode: keepMode||null, keepN: keepN?+keepN:null };
        };

        const rollCustomDice = (notation, label, rolledBy, context) => {
            const parsed = _parseDice(notation);
            if (!parsed) return null;
            const entry = { id: Date.now(), notation, label: label||notation, ...parsed, rolledBy: rolledBy||'守秘人', context: context||'', ts: Date.now() };
            gameState.diceHistory.unshift(entry);
            if (gameState.diceHistory.length > 30) gameState.diceHistory.pop();
            addJournalEntry({ type: 'dice', summary: `${entry.rolledBy} 掷 ${notation}：${parsed.total}${label?'（'+label+'）':''}` });
            return entry;
        };

        const _getCharacterSkillValue = (character, skillName, fallback = 50) => {
            const engine = CoCEngine;
            const raw = engine && typeof engine.getSkillValue === 'function'
                ? engine.getSkillValue(character, skillName)
                : (character.skills?.[skillName] ?? character.skillAllocations?.[skillName]);
            const numeric = Number(raw);
            return Number.isFinite(numeric) ? numeric : fallback;
        };

        const groupRoll = (charNames, skillName, context) => {
            const results = [];
            const targets = charNames.length ? gameState.roster.filter(c=>charNames.includes(c.name)&&c.isActive) : gameState.roster.filter(c=>c.isActive);
            const engine = CoCEngine;
            targets.forEach(c => {
                if (engine && typeof engine.checkSkill === 'function') {
                    const res = engine.checkSkill(skillName, c, 'normal');
                    results.push({
                        name: c.name,
                        roll: res.rolledValue,
                        skillVal: res.skillValue,
                        level: res.level,
                        success: res.success,
                        targetValue: res.targetValue
                    });
                    return;
                }
                const skillVal = _getCharacterSkillValue(c, skillName, 50);
                const roll = Math.floor(Math.random()*100)+1;
                const fumbleThreshold = engine && typeof engine.fumbleThreshold === 'function'
                    ? engine.fumbleThreshold(skillVal)
                    : (skillVal < 50 ? 100 : 96);
                const extreme = Math.floor(skillVal / 5);
                const hard = Math.floor(skillVal / 2);
                const level = roll === 1 ? '大成功'
                    : roll <= extreme ? '极难成功'
                    : roll <= hard ? '困难成功'
                    : roll <= skillVal ? '成功'
                    : roll >= fumbleThreshold ? '大失败' : '失败';
                results.push({ name: c.name, roll, skillVal, level });
            });
            const entry = { id: Date.now(), notation:'群体检定', label:skillName, rolls:results.map(r=>r.roll), kept:results.map(r=>r.roll), total:0, mod:0, count:results.length, sides:100, rolledBy:'守秘人', context, isGroup:true, groupResults:results, ts: Date.now() };
            gameState.diceHistory.unshift(entry);
            if (gameState.diceHistory.length > 30) gameState.diceHistory.pop();
            addJournalEntry({ type: 'dice', summary: `群体【${skillName}】检定：${results.map(r=>r.name+'→'+r.level).join('，')}` });
            return entry;
        };

        // ═══ Clue Board ═══
        const addClue = (id, title, content, type, relatedIds, location) => {
            const existing = gameState.clueBoard.clues.find(c => c.id === id);
            if (existing) {
                existing.content = content || existing.content;
                if (relatedIds) relatedIds.forEach(rid => { if (!existing.relatedIds.includes(rid)) existing.relatedIds.push(rid); });
                return existing;
            }
            const titleKey = title != null ? String(title).trim() : '';
            const sameTitle = titleKey
                ? gameState.clueBoard.clues.find((c) => c && String(c.title || '').trim() === titleKey)
                : null;
            if (sameTitle) {
                sameTitle.content = content || sameTitle.content;
                if (!Array.isArray(sameTitle.relatedIds)) sameTitle.relatedIds = [];
                if (relatedIds) relatedIds.forEach((rid) => { if (!sameTitle.relatedIds.includes(rid)) sameTitle.relatedIds.push(rid); });
                return sameTitle;
            }
            const clue = { id: id || 'clue_' + Date.now(), title, content: content || '', type: type || 'physical', status: 'new', relatedIds: relatedIds || [], note: '', location: location || gameState.currentLocation, discoveredAt: gameState.chatHistory.length };
            gameState.clueBoard.clues.push(clue);
            (relatedIds || []).forEach(rid => { linkClues(clue.id, rid, ''); });
            addJournalEntry({ type: 'clue', summary: `发现线索：【${title}】（${type || '物证'}）` });
            return clue;
        };

        const linkClues = (fromId, toId, note) => {
            const a = fromId == null ? '' : String(fromId);
            const b = toId == null ? '' : String(toId);
            if (!a || !b) return { ok: false, reason: '线索 ID 不能为空' };
            if (a === b) return { ok: false, reason: '不能将线索连接到自身' };
            const clues = (gameState.clueBoard && gameState.clueBoard.clues) || [];
            const hasFrom = clues.some((c) => c && c.id === a);
            const hasTo = clues.some((c) => c && c.id === b);
            if (!hasFrom || !hasTo) {
                const missing = [!hasFrom ? a : null, !hasTo ? b : null].filter(Boolean);
                return { ok: false, reason: '找不到线索：' + missing.join('、') };
            }
            if (!gameState.clueBoard.links) gameState.clueBoard.links = [];
            const exists = gameState.clueBoard.links.some(l => (l.from===a&&l.to===b)||(l.from===b&&l.to===a));
            if (!exists) gameState.clueBoard.links.push({ from: a, to: b, note: note || '' });
            return { ok: true };
        };

        const markClueStatus = (id, status, note) => {
            const c = gameState.clueBoard.clues.find(c => c.id === id);
            if (!c) return false;
            c.status = status || c.status;
            if (note) c.note = note;
            return true;
        };

        const clearClueBoard = () => {
            gameState.clueBoard.clues.splice(0);
            gameState.clueBoard.links.splice(0);
        };

        // ═══ Scene Map ═══
        const createMap = (title, rooms) => {
            gameState.sceneMap.title = title || gameState.currentLocation;
            let list;
            if (rooms == null) list = [];
            else if (Array.isArray(rooms)) list = rooms;
            else if (typeof rooms === 'object') {
                list = Object.keys(rooms).map((k) => {
                    const r = rooms[k];
                    if (r && typeof r === 'object') {
                        return Object.assign({ id: r.id || k }, r);
                    }
                    return { id: k, name: String(r) };
                });
            } else {
                list = [];
            }
            gameState.sceneMap.rooms = list.map(r => ({
                id: r.id || 'r' + Date.now() + Math.random(),
                name: r.name || '未知房间',
                status: r.status || 'unknown',
                x: r.x || 0, y: r.y || 0,
                connections: r.connections || [],
                note: r.note || ''
            }));
            gameState.sceneMap.currentRoomId = null;
            addJournalEntry({ type: 'map', summary: `场景地图已更新：${title}（${gameState.sceneMap.rooms.length} 个房间）` });
        };

        const updateRoom = (roomId, status, note) => {
            const r = gameState.sceneMap.rooms.find(rm => rm.id === roomId || rm.name === roomId);
            if (!r) return false;
            if (status) r.status = status;
            if (status === 'explored' || status === 'current') markExplored(gameState, r.id, presentInvIds(gameState));
            if (note) r.note = note;
            return true;
        };

        const setPosition = (roomId) => {
            const r = gameState.sceneMap.rooms.find(rm => rm.id === roomId || rm.name === roomId);
            if (!r) return false;
            const prev = gameState.sceneMap.rooms.find(rm => rm.status === 'current');
            if (prev && prev !== r) prev.status = 'explored';
            r.status = 'current';
            markExplored(gameState, r.id, presentInvIds(gameState));
            gameState.sceneMap.currentRoomId = r.id;
            gameState.currentLocation = r.name;
            if (!gameState.knownLocations.includes(r.name)) gameState.knownLocations.push(r.name);
            return true;
        };

        // ═══ Character Growth ═══
        const _d = (n) => Math.floor(Math.random() * n) + 1;

        const rollImprovement = (charName, skillName) => {
            const c = gameState.roster.find(r => r.name === charName);
            if (!c) return null;
            const entry = (c.skillsUsedThisSession || []).find(s => s.name === skillName);
            if (!entry) {
                return { roll: 0, gained: 0, oldVal: 0, newVal: 0, success: false, skipped: true };
            }
            // Prefer live skill value so stale session currentValue cannot lower a raised skill.
            const liveVal = _getCharacterSkillValue(c, skillName, 0);
            const stale = Number(entry.currentValue);
            const curVal = Number.isFinite(stale) ? Math.max(liveVal, stale) : liveVal;
            const engine = CoCEngine;
            const roll = engine && typeof engine._rollD100 === 'function' ? engine._rollD100() : _d(100);
            let gained = 0;
            let newVal = curVal;
            if (roll > curVal) {
                gained = engine && typeof engine.roll === 'function' ? engine.roll(1, 10) : _d(10);
                newVal = Math.min(99, curVal + gained);
                c.skills = c.skills || {};
                c.skills[skillName] = newVal;
                c.skillAllocations = c.skillAllocations || {};
                c.skillAllocations[skillName] = newVal;
                addJournalEntry({ type: 'growth', charName, summary: `技能成长：【${skillName}】${curVal} → ${newVal}（骰出${roll}，提升${gained}）` });
            } else {
                addJournalEntry({ type: 'growth', charName, summary: `技能检定失败：【${skillName}】无提升（骰出${roll}/${curVal}）` });
            }
            c.skillsUsedThisSession = (c.skillsUsedThisSession || []).filter(s => s.name !== skillName);
            return { roll, gained, oldVal: curVal, newVal, success: gained > 0 };
        };

        const rollEduImprovement = (charName) => {
            const c = gameState.roster.find(r => r.name === charName);
            if (!c || !c.attrs) return null;
            const edu = c.attrs.EDU || 0;
            const engine = CoCEngine;
            const roll = engine && typeof engine._rollD100 === 'function' ? engine._rollD100() : _d(100);
            let gained = 0;
            if (roll > edu) {
                gained = _d(10);
                c.attrs.EDU = Math.min(99, edu + gained);
                addJournalEntry({ type: 'growth', charName, summary: `教育成长：EDU ${edu} → ${c.attrs.EDU}（骰出${roll}）` });
            } else {
                addJournalEntry({ type: 'growth', charName, summary: `教育成长失败：EDU无变化（骰出${roll}/${edu}）` });
            }
            return { roll, gained, oldVal: edu, newVal: c.attrs.EDU, success: gained > 0 };
        };

        const applyAging = (charName) => {
            const c = gameState.roster.find(r => r.name === charName);
            if (!c || !c.attrs) return null;
            const oldAge = c.age || 25;
            c.age = oldAge + 1;
            const age = c.age;
            let effects = [];
            if ([40, 50, 60, 70, 80].includes(age)) {
                const strLoss = 2, conLoss = 2, dexLoss = 1;
                c.attrs.STR = Math.max(1, (c.attrs.STR || 50) - strLoss);
                c.attrs.CON = Math.max(1, (c.attrs.CON || 50) - conLoss);
                c.attrs.DEX = Math.max(1, (c.attrs.DEX || 50) - dexLoss);
                const eduGain = _d(10);
                c.attrs.EDU = Math.min(99, (c.attrs.EDU || 60) + eduGain);
                effects = [`STR-${strLoss}`, `CON-${conLoss}`, `DEX-${dexLoss}`, `EDU+${eduGain}`];
                addJournalEntry({ type: 'growth', charName, summary: `年龄效应（${age}岁）：${effects.join('、')}` });
                // Refresh HP cap after CON/SIZ-affecting age changes.
                const eng = CoCEngine;
                if (eng && typeof eng.syncHp === 'function') {
                    const cur = typeof eng.currentHp === 'function' ? eng.currentHp(c) : (c.derived && c.derived.hp);
                    const synced = eng.syncHp(c);
                    if (typeof cur === 'number' && synced && synced.maxHp != null) {
                        const clamped = Math.min(cur, synced.maxHp);
                        c.hp = clamped;
                        if (c.derived) c.derived.hp = clamped;
                    }
                } else if (c.attrs && c.derived) {
                    const maxHp = Math.floor(((c.attrs.CON || 50) + (c.attrs.SIZ || 50)) / 10);
                    c.derived.maxHp = maxHp;
                    if (typeof c.derived.hp === 'number') c.derived.hp = Math.min(c.derived.hp, maxHp);
                    if (typeof c.hp === 'number') c.hp = Math.min(c.hp, maxHp);
                }
            } else {
                addJournalEntry({ type: 'growth', charName, summary: `年龄增长：${oldAge}岁 → ${age}岁` });
            }
            return { oldAge, age, effects };
        };

        const clearSessionSkills = () => {
            gameState.roster.forEach(c => { c.skillsUsedThisSession = []; });
        };

        const removeCharacterAt = (index) => {
            const idx = Number(index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= gameState.roster.length) return false;
            const [removed] = gameState.roster.splice(idx, 1);
            clampSelectedCharIndex(gameState);
            cleanupInitiativeOrder();
            if (removed && removed.name) {
                addJournalEntry({ type: 'roster', summary: `调查员离队：${removed.name}` });
            }
            return true;
        };

        // ═══ NPC Registry ═══
        const addNpc = (npcData) => {
            const existing = gameState.npcRegistry.find(n => n.name === npcData.name);
            if (existing) {
                if (npcData.description) existing.description = npcData.description;
                if (npcData.relation) existing.relation = npcData.relation;
                if (npcData.status) existing.status = npcData.status;
                return existing;
            }
            const npc = {
                id: 'npc_' + Date.now() + Math.random(),
                name: npcData.name,
                description: npcData.description || '',
                relation: npcData.relation || '未知',
                status: npcData.status || 'alive',
                firstSeen: gameState.currentLocation,
                firstSeenAt: new Date().toISOString(),
                notes: []
            };
            gameState.npcRegistry.push(npc);
            return npc;
        };

        const updateNpcStatus = (name, status, note) => {
            const npc = gameState.npcRegistry.find(n => n.name === name);
            if (!npc) return false;
            npc.status = status;
            if (note) npc.notes.push({ text: note, at: new Date().toISOString() });
            return true;
        };

        const addNpcNote = (npcId, text) => {
            const npc = gameState.npcRegistry.find(n => n.id === npcId);
            if (!npc) return;
            npc.notes.push({ text, at: new Date().toISOString() });
        };

        return { startCombat, endCombat, updateEnemy, advanceTurn, cleanupInitiativeOrder,
                 rollCustomDice, groupRoll,
                 addClue, linkClues, markClueStatus, clearClueBoard,
                 createMap, updateRoom, setPosition,
                 rollImprovement, rollEduImprovement, applyAging, clearSessionSkills, removeCharacterAt,
                 addNpc, updateNpcStatus, addNpcNote };
    };
    return { create };
})();
