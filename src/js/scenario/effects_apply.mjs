/**
 * Scenario effects apply + light schema validation.
 * Single choke point for node/choice effects → Kernel / tables / chase.
 * Does not mutate HP/SAN directly — delegates to Engine paths.
 */

import { resolveInvestigateOutcome } from '../data/investigate_outcomes.mjs';
import { busAddMythosHeat, setPressureFlag } from '../state/pressure_bus.mjs';
import { resolveSelectedActiveChar } from '../state/selection.mjs';
import { resolveClueQualityForNpc } from '../data/npc_credibility.mjs';
import { filterGunfightBeats } from '../data/keeper_style.mjs';
import { debunkFalseLeadClues } from '../state/false_lead.mjs';
import { exportArcLedger } from '../state/arc_ledger.mjs';
import { applyNpcBehavior } from '../engines/npc_behavior.mjs';

/** Known top-level effect keys (unknown → audit warning). */
export const KNOWN_EFFECT_KEYS = Object.freeze([
    'location', 'mapRoom', 'atmosphere', 'journal', 'clues', 'items', 'san', 'sanCheck',
    'npcs', 'map', 'flags', 'combat', 'chase', 'enchantmentId', 'dispel', 'dispelMp',
    'note', 'advanceClock', 'exportArcLedger', 'mythosHeat', 'debunkFalseLead'
]);

/** Narrow keys allowed for online apply_scenario_effects tool. */
export const ONLINE_EFFECT_KEYS = Object.freeze([
    'sanCheck', 'combat', 'chase', 'enchantmentId', 'dispel', 'flags', 'dispelMp'
]);

export function pickOnlineEffects(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const k of ONLINE_EFFECT_KEYS) {
        if (raw[k] != null) out[k] = raw[k];
    }
    return out;
}

/**
 * @param {object} effects
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateEffects(effects, nodeId = '?') {
    const errors = [];
    const warnings = [];
    if (effects == null) return { ok: true, errors, warnings };
    if (typeof effects !== 'object' || Array.isArray(effects)) {
        return { ok: false, errors: [nodeId + ': effects must be object'], warnings };
    }
    for (const k of Object.keys(effects)) {
        if (!KNOWN_EFFECT_KEYS.includes(k)) {
            warnings.push(nodeId + ': unknown effect key "' + k + '"');
        }
    }
    if (effects.combat) {
        const c = effects.combat;
        if (typeof c !== 'object') errors.push(nodeId + ': combat must be object');
        else if (!c.creatureId && !c.creature) {
            errors.push(nodeId + ': combat needs creatureId');
        }
        if (c && c.mode && c.mode !== 'exchange') {
            warnings.push(nodeId + ': combat.mode "' + c.mode + '" (only exchange supported)');
        }
    }
    if (effects.sanCheck != null) {
        const sc = effects.sanCheck;
        if (typeof sc !== 'string' && (typeof sc !== 'object' || sc == null)) {
            errors.push(nodeId + ': sanCheck must be "pass/fail" string or {pass,fail}');
        }
    }
    if (effects.chase != null && typeof effects.chase !== 'object') {
        errors.push(nodeId + ': chase must be object');
    }
    return { ok: errors.length === 0, errors, warnings };
}

export function resolveSanNotation(sanCheck) {
    if (typeof sanCheck === 'string') return sanCheck;
    if (sanCheck && typeof sanCheck === 'object') {
        const pass = sanCheck.pass != null ? sanCheck.pass : (sanCheck.success != null ? sanCheck.success : '0');
        const fail = sanCheck.fail != null ? sanCheck.fail : (sanCheck.failure != null ? sanCheck.failure : '1');
        return String(pass) + '/' + String(fail);
    }
    return '0/1';
}

/** Same normalisation as tools/resolve.mjs normalizeName ("undefined"/"null" strings count as omitted). */
function normalizeTargetName(name) {
    if (name == null) return '';
    const s = String(name).trim();
    return s === 'undefined' || s === 'null' ? '' : s;
}

/**
 * Who a scenario effect lands on.
 * A non-empty name that is not on the roster resolves to null — it must never be
 * silently redirected to another investigator (resolveActor contract).
 * Only an omitted/empty name falls back to the effect actor / selected / active / first.
 */
export function pickTarget(gameState, targetCharName) {
    const roster = gameState.roster || [];
    const key = normalizeTargetName(targetCharName);
    if (key) return roster.find((c) => c && c.name === key) || null;
    return (gameState._scenarioEffectActor && roster.find((c) => c && c.name === gameState._scenarioEffectActor))
        || resolveSelectedActiveChar(gameState)
        || roster.find((c) => c && c.isActive)
        || roster[0]
        || null;
}

function applyDamage(Engine, ch, amount) {
    const dmg = Math.max(0, Number(amount) || 0);
    if (!ch || dmg <= 0) return { damage: 0 };
    if (Engine.MajorWoundEngine && typeof Engine.MajorWoundEngine.dealDamage === 'function') {
        return Engine.MajorWoundEngine.dealDamage(ch, dmg) || { damage: dmg };
    }
    if (typeof Engine.applyDamage === 'function') {
        return Engine.applyDamage(ch, dmg, { type: 'scenario' }) || { damage: dmg };
    }
    return { damage: dmg };
}

/**
 * Apply scenario effects. Hooks provide State side-effects (map, journal, clues).
 */
export function applyScenarioEffects(ctx, effects, targetCharName) {
    const out = { messages: [], combat: null, chase: null, san: null };
    if (!effects || typeof effects !== 'object') return out;

    const gameState = ctx.gameState;
    const Engine = ctx.Engine;
    const pushSystem = ctx.pushSystem || function () {};
    const ensureFlags = ctx.ensureFlags || function () {
        if (!gameState.scenarioRunner) gameState.scenarioRunner = { flags: {} };
        if (!gameState.scenarioRunner.flags) gameState.scenarioRunner.flags = {};
        return gameState.scenarioRunner.flags;
    };

    const session = gameState.groupCheckSession;
    const splitLoc = !!(session && session.splitPaths && targetCharName);
    let locEffects = effects;

    if (splitLoc && (effects.location || effects.mapRoom)) {
        session.charLocations = session.charLocations || {};
        session.charLocations[targetCharName] = session.charLocations[targetCharName] || {};
        if (effects.location) session.charLocations[targetCharName].location = effects.location;
        if (effects.mapRoom) session.charLocations[targetCharName].mapRoom = effects.mapRoom;
        if (typeof ctx.syncSplitDisplayLocation === 'function') ctx.syncSplitDisplayLocation(gameState);
        locEffects = Object.assign({}, effects);
        delete locEffects.location;
        delete locEffects.mapRoom;
        if (Object.keys(locEffects).length === 0) return out;
    }

    if (locEffects.location) {
        gameState.currentLocation = locEffects.location;
        if (!Array.isArray(gameState.knownLocations)) gameState.knownLocations = [];
        if (!gameState.knownLocations.includes(locEffects.location)) {
            gameState.knownLocations.push(locEffects.location);
        }
        if (ctx.setPosition && gameState.sceneMap && Array.isArray(gameState.sceneMap.rooms)) {
            const room = gameState.sceneMap.rooms.find((rm) => rm
                && (rm.id === locEffects.location || rm.name === locEffects.location));
            if (room) ctx.setPosition(room.id);
        }
    }
    if (locEffects.mapRoom && gameState.sceneMap && gameState.sceneMap.rooms && gameState.sceneMap.rooms.length && ctx.setPosition) {
        const room = gameState.sceneMap.rooms.find((rm) => rm.id === locEffects.mapRoom);
        if (room) ctx.setPosition(room.id);
    }
    if (locEffects.atmosphere) {
        if (!gameState.atmosphere || typeof gameState.atmosphere !== 'object') {
            gameState.atmosphere = { level: 'calm', note: '' };
        }
        const atm = locEffects.atmosphere;
        if (typeof atm === 'string') {
            gameState.atmosphere.level = atm;
        } else if (atm && typeof atm === 'object') {
            if (atm.level != null) gameState.atmosphere.level = String(atm.level);
            if (atm.note != null) gameState.atmosphere.note = String(atm.note);
        }
        // ignore invalid non-object/non-string atmosphere payloads
    }
    if (locEffects.journal && ctx.addJournalEntry) {
        ctx.addJournalEntry({ type: 'scenario', summary: locEffects.journal });
    }

    const checkLevel = gameState._lastScenarioCheckLevel || null;
    const investigate = checkLevel && Engine && Engine.SocialEngine && Engine.SocialEngine.resolveInvestigate
        ? Engine.SocialEngine.resolveInvestigate(checkLevel)
        : (checkLevel ? resolveInvestigateOutcome(checkLevel) : null);

    (locEffects.clues || []).forEach((c) => {
        if (!ctx.addClue) return;
        const clue = ctx.addClue(c.id, c.title, c.content, c.type);
        if (!clue) return;
        if (c.npcId || c.credibility != null) {
            const q = c.quality
                || (c.npcId
                    ? resolveClueQualityForNpc(c.npcId, checkLevel || '成功')
                    : null);
            if (q) clue.quality = q;
            else if (investigate) clue.quality = investigate.clueQuality;
            clue.fromCheck = !!checkLevel;
            clue.checkLevel = checkLevel;
            clue.npcId = c.npcId || null;
        } else if (investigate) {
            clue.quality = c.quality || investigate.clueQuality;
            clue.fromCheck = true;
            clue.checkLevel = checkLevel;
        } else if (c.quality) {
            clue.quality = c.quality;
        }
    });

    (locEffects.items || []).forEach((it) => {
        const name = (it && typeof it === 'object') ? (it.name || '物品') : it;
        let qty;
        if (it && typeof it === 'object' && Object.prototype.hasOwnProperty.call(it, 'qty')) {
            qty = Number(it.qty);
            if (!Number.isFinite(qty)) qty = 1;
        } else {
            qty = 1;
        }
        if (qty <= 0) {
            // qty 0 / negative: do not coerce to 1 or announce a grant
            return;
        }
        if (typeof ctx.grantItem === 'function') {
            ctx.grantItem(it);
        } else {
            if (!gameState.inventory) gameState.inventory = [];
            for (let i = 0; i < qty; i++) {
                gameState.inventory.push(typeof it === 'string' ? { name: it, qty: 1 } : Object.assign({}, it, { name: name, qty: 1 }));
            }
        }
        pushSystem('🎒 [剧本] 获得物品：' + name + (qty > 1 ? ' ×' + qty : ''));
        out.messages.push('item:' + name);
    });

    const target = pickTarget(gameState, targetCharName);
    if (!target && normalizeTargetName(targetCharName)) {
        pushSystem('⚠️ [剧本] 找不到目标角色：' + normalizeTargetName(targetCharName) + '，需要目标的效果已跳过');
    }

    if (locEffects.san && target && (gameState.roster || []).length) {
        const loss = Number(locEffects.san) || 0;
        if (loss > 0) {
            if (Engine && Engine.applySanLoss) {
                Engine.applySanLoss(target, loss, '剧本事件');
            } else if (Engine && Engine.SanityEngine && Engine.SanityEngine.applySanLoss) {
                Engine.SanityEngine.applySanLoss(target, loss, '剧本事件');
            } else {
                pushSystem('⚠️ [SAN] 无法结算：SanityEngine 未加载（' + target.name + ' -' + loss + '）');
                return out;
            }
            pushSystem('🧠 [SAN] ' + target.name + ' 理智值 -' + loss);
            out.san = { flat: loss, target: target.name };
        }
    }

    if (locEffects.sanCheck && target && Engine && Engine.SanityEngine) {
        const notation = resolveSanNotation(locEffects.sanCheck);
        const cause = locEffects.sanCause || '剧本目击';
        // Local runner / dice-panel path: do not silent-roll; caller enqueues kind=san.
        if (ctx.deferSanCheck) {
            out.san = { pending: true, notation: notation, target: target.name, cause: cause };
        } else {
            let result = null;
            if (typeof Engine.SanityEngine.checkAndApplySanLoss === 'function') {
                result = Engine.SanityEngine.checkAndApplySanLoss(target, notation, cause);
            } else if (typeof Engine.SanityEngine.applySanCheckResult === 'function') {
                result = Engine.SanityEngine.applySanCheckResult(target, undefined, notation, cause);
            }
            if (result) {
                pushSystem('🧠 [SAN检定] ' + (result.description || (target.name + ' 损失 ' + (result.sanLoss || 0) + ' SAN')));
                out.san = result;
            }
        }
    }

    if (locEffects.enchantmentId && target && Engine && Engine.MythosEngine && Engine.MythosEngine.applyEnchantmentBuff) {
        const buff = Engine.MythosEngine.applyEnchantmentBuff(target, locEffects.enchantmentId);
        if (buff && buff.desc) {
            pushSystem('✨ [附魔] ' + buff.desc);
            out.messages.push('enchantment:' + locEffects.enchantmentId);
        }
    }

    if (locEffects.dispel && target && Engine && Engine.MythosEngine && Engine.MythosEngine.dispel) {
        if (!target.derived) target.derived = {};
        if (target.derived.mp == null) target.derived.mp = Number(target.mp) || 10;
        const d = Engine.MythosEngine.dispel(target, target, {
            mpCost: locEffects.dispelMp != null ? Number(locEffects.dispelMp) : 0
        });
        if (d && d.desc) {
            pushSystem('🔮 [驱散] ' + d.desc);
            out.messages.push('dispel');
        }
    }

    if (locEffects.combat && Engine && Engine.CombatEngine) {
        const cfg = locEffects.combat;
        const creatureId = cfg.creatureId || cfg.creature;
        let foe = null;
        if (cfg._foeRef && cfg._foeRef.isEnemy) {
            foe = cfg._foeRef;
        } else if (Engine.CombatEngine.spawnCreature) {
            foe = Engine.CombatEngine.spawnCreature(creatureId, { name: cfg.name });
        }
        if (!foe) {
            pushSystem('⚠️ [剧本战斗] 未知生物: ' + creatureId);
        } else if (target) {
            if (!gameState.combat) gameState.combat = { enemies: [] };
            if (!Array.isArray(gameState.combat.enemies)) gameState.combat.enemies = [];
            if (!foe.fromScenario) {
                foe.fromScenario = true;
                gameState.combat.enemies.push(foe);
            }

            const weapon = cfg.weaponId && Engine.lookupWeapon
                ? Engine.lookupWeapon(cfg.weaponId)
                : (cfg.weapon || { skill: '斗殴', damage: '1D3+DB', type: 'melee' });
            const attackerIsPc = (cfg.attacker || 'pc') !== 'creature';

            // Defer exchange until player dice panel resolves (KP does not silent-roll).
            if (cfg.pendingRoll && !cfg.preRolledAttack && !cfg._resolvePending) {
                const pendingCfg = Object.assign({}, cfg, {
                    pendingRoll: false,
                    _foeRef: foe,
                    weapon: weapon,
                    weaponSkill: (weapon && weapon.skill) || '斗殴'
                });
                delete pendingCfg.preRolledAttack;
                out.combat = { pending: true, foe: foe, cfg: pendingCfg };
                pushSystem('⚔️ [剧本交锋] 请进行【' + pendingCfg.weaponSkill + '】检定以结算交锋。');
            } else {
                const exchange = Engine.CombatEngine.resolveCombatExchange(
                    attackerIsPc ? target : foe,
                    attackerIsPc ? foe : target,
                    {
                        weapon: weapon,
                        preRolledAttack: cfg.preRolledAttack || null,
                        preRolledDefense: cfg.preRolledDefense || null
                    }
                );
                const pcWon = attackerIsPc
                    ? exchange.winner === 'attacker'
                    : exchange.winner === 'defender';
                if (exchange.damage > 0) {
                    const victim = exchange.winner === 'attacker'
                        ? (attackerIsPc ? foe : target)
                        : (attackerIsPc ? target : foe);
                    if (victim === target || (victim && !victim.isEnemy)) {
                        applyDamage(Engine, victim, exchange.damage);
                    } else if (victim) {
                        if (typeof ctx.hurtEnemy === 'function') {
                            ctx.hurtEnemy(victim, exchange.damage);
                        } else {
                            const nextHp = Math.max(0, (Number(victim.hp) || 0) - exchange.damage);
                            if (Engine && typeof Engine.mirrorCurrentHp === 'function') Engine.mirrorCurrentHp(victim, nextHp);
                            else victim.hp = nextHp;
                            if (nextHp <= 0 && !victim.physicalImmune) victim.isDefeated = true;
                        }
                    }
                }
                const flags = ensureFlags();
                if (pcWon && cfg.onWin) {
                    flags[cfg.onWin] = true;
                    setPressureFlag(gameState, cfg.onWin, true);
                }
                if (!pcWon && cfg.onLose) {
                    flags[cfg.onLose] = true;
                    setPressureFlag(gameState, cfg.onLose, true);
                }
                pushSystem('⚔️ [剧本交锋] ' + (exchange.msg || '') + (pcWon ? '（调查员占优）' : '（敌人占优）'));
                out.combat = { exchange: exchange, foe: foe, pcWon: pcWon };
            }
        }
    }

    if (locEffects.chase && Engine && Engine.ChaseEngine) {
        const cfg = locEffects.chase;
        const roster = gameState.roster || [];
        const selectedQuarry = resolveSelectedActiveChar(gameState);
        const quarryName = cfg.quarry === 'pc' || !cfg.quarry
            ? (target && target.name) || (selectedQuarry && selectedQuarry.name) || (roster[0] && roster[0].name)
            : cfg.quarry;
        let quarry = roster.find((c) => c && c.name === quarryName);
        if (!quarry) {
            const qMov = Number(cfg.quarryMov) || 8;
            quarry = { name: quarryName || '猎物', mov: qMov, derived: { mov: qMov }, isEnemy: false };
        }
        let pursuerNames = Array.isArray(cfg.pursuerNames) ? cfg.pursuerNames : [];
        if (!pursuerNames.length) {
            if (cfg.pursuer === 'pc' || cfg.pursuer === 'roster') {
                pursuerNames = roster.filter((c) => c && c.isActive && c.name).map((c) => c.name);
            } else {
                pursuerNames = [cfg.pursuer || '守卫'];
            }
        }
        if (!pursuerNames.length) pursuerNames = ['守卫'];
        const pursuers = pursuerNames.map((n) => {
            const found = roster.find((c) => c && c.name === n);
            return found || {
                name: n,
                mov: Number(cfg.pursuerMov) || 8,
                derived: { mov: Number(cfg.pursuerMov) || 8 },
                isEnemy: true
            };
        });
        // When PCs are quarry (fleeing), mark pursuers as enemies; when PCs pursue, quarry is NPC.
        if (cfg.quarry === 'pc' || cfg.quarry === 'roster') {
            pursuers.forEach((p) => { if (p) p.isEnemy = true; });
        }
        if (cfg.mode === 'air' || cfg.mode === 'water') {
            if (quarry) quarry.chaseMode = cfg.mode;
            pursuers.forEach((p) => { if (p) p.chaseMode = cfg.mode; });
        }
        const state = Engine.ChaseEngine.start(quarry, pursuers, {
            lead: cfg.lead != null ? cfg.lead : 2,
            vehicle: !!cfg.vehicle,
            vehicleId: cfg.vehicleId,
            skipSpeedCheck: !!cfg.skipSpeedCheck
        });
        if (Array.isArray(cfg.gunfightBeats) && cfg.gunfightBeats.length) {
            const filtered = filterGunfightBeats(cfg.gunfightBeats, gameState.keeperStyle);
            state.gunfightBeats = filtered.slice();
            const beat = filtered.find((b) => b && Number(b.round) === 1) || filtered[0];
            if (beat && beat.hint) {
                pushSystem('🔫 [载具枪战提示] ' + beat.hint);
            }
        }
        if (cfg.vehicle) {
            pushSystem('🚗 [乘员] 载具追逐可用 chase_action set_crew 指定司机与射手；仅司机可加速驾驶。');
        }
        gameState.chase = state;
        if (!cfg.skipSpeedCheck && !state.speedResolved && typeof Engine.ChaseEngine.pushSkill === 'function') {
            const rosterNames = new Set((roster || []).filter((c) => c && c.name).map((c) => c.name));
            (state.participants || []).forEach((p) => {
                if (!p) return;
                const skill = Engine.ChaseEngine.pushSkill(state, p);
                if (!rosterNames.has(p.name)) {
                    const actor = roster.find((c) => c && c.name === p.name) || {
                        name: p.name, attrs: { CON: 50 }, skills: { '汽车驾驶': 40 }
                    };
                    if (typeof Engine.checkSkill === 'function' && typeof Engine.ChaseEngine.applySpeedResult === 'function') {
                        Engine.ChaseEngine.applySpeedResult(p, Engine.checkSkill(skill, actor, 'normal'));
                    }
                    return;
                }
                const spec = {
                    kind: 'chase_speed',
                    skill,
                    roller: p.name,
                    target: p.name,
                    prompt: `【追逐·速度】${p.name} 请进行【${skill}】检定以确定有效 MOV。`
                };
                if (!gameState.pendingRuleChecks) gameState.pendingRuleChecks = [];
                if (gameState.pendingRuleCheck) gameState.pendingRuleChecks.push(spec);
                else gameState.pendingRuleCheck = spec;
            });
            const speedPending = (gameState.pendingRuleCheck && gameState.pendingRuleCheck.kind === 'chase_speed')
                || (gameState.pendingRuleChecks || []).some((s) => s && s.kind === 'chase_speed');
            if (!speedPending) {
                state.speedResolved = true;
                (state.participants || []).forEach((p) => {
                    if (p && typeof Engine.ChaseEngine.actionsFor === 'function') {
                        p.actionsLeft = Engine.ChaseEngine.actionsFor(p, state);
                    }
                });
            }
        } else if (!state.speedResolved) {
            (state.participants || []).forEach((p) => {
                if (!p) return;
                if (p.effectiveMov == null) p.effectiveMov = p.mov;
                if (typeof Engine.ChaseEngine.actionsFor === 'function') {
                    p.actionsLeft = Engine.ChaseEngine.actionsFor(p, state);
                }
            });
            state.speedResolved = true;
        }
        const desc = Engine.ChaseEngine.describe ? Engine.ChaseEngine.describe(state) : '追逐已开始';
        pushSystem('🏃 [剧本追逐] ' + desc + ' 可用 chase_action 继续。');
        out.chase = state;
    }

    (locEffects.npcs || []).forEach((n) => {
        if (ctx.addNpc) ctx.addNpc({ name: n.name, description: n.description || '', relation: n.attitude || '未知' });
    });
    if (locEffects.map && ctx.createMap) {
        ctx.createMap(locEffects.map.title || '场景地图', locEffects.map.rooms || []);
        if (locEffects.map.currentRoomId && ctx.setPosition) ctx.setPosition(locEffects.map.currentRoomId);
    }
    if (locEffects.flags) {
        const flags = ensureFlags();
        for (const [k, v] of Object.entries(locEffects.flags)) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            flags[k] = v;
            if (typeof v === 'boolean' || v === 1 || v === 0) setPressureFlag(gameState, k, !!v);
        }
        if (locEffects.flags.mythos_heat_delta != null) {
            busAddMythosHeat(gameState, locEffects.flags.mythos_heat_delta, '场景余波');
        }
    }

    if (locEffects.mythosHeat != null) {
        busAddMythosHeat(gameState, locEffects.mythosHeat, '场景热度');
    }
    applyNpcBehavior(gameState);

    if (locEffects.advanceClock) {
        const ac = locEffects.advanceClock;
        const r = gameState.scenarioRunner;
        if (r) {
            if (!r.clocks) {
                r.clocks = { investigation: 0, ritual: 0, maxInvestigation: 5, maxRitual: 5 };
            }
            const track = String(ac.track || 'investigation');
            const by = Number(ac.by) || 1;
            if (track === 'ritual') r.clocks.ritual = (Number(r.clocks.ritual) || 0) + by;
            else r.clocks.investigation = (Number(r.clocks.investigation) || 0) + by;
            out.clocks = Object.assign({}, r.clocks);
            pushSystem('⏱ [双时钟] ' + track + ' +' + by
                + '（调查 ' + r.clocks.investigation + '/' + (r.clocks.maxInvestigation || 5)
                + ' · 仪式 ' + r.clocks.ritual + '/' + (r.clocks.maxRitual || 5) + '）');
        }
    }

    if (locEffects.debunkFalseLead) {
        const raw = locEffects.debunkFalseLead;
        const opts = (raw && typeof raw === 'object') ? raw : {};
        const res = debunkFalseLeadClues(gameState, opts);
        out.debunkFalseLead = res;
        if (res.count) {
            pushSystem('📓 已揭穿可疑线索（' + res.count + ' 条），记录更正为已解释。', { isLocalOnly: true });
        }
    }

    if (locEffects.exportArcLedger) {
        const raw = locEffects.exportArcLedger;
        const opts = (raw && typeof raw === 'object') ? raw : {};
        out.arcLedger = exportArcLedger(gameState, opts);
        pushSystem('📒 [战役账本] 已导出当前进度', { isLocalOnly: true });
    }

    return out;
}

/** Walk scenario nodes/choices and validate effects objects. */
export function auditScenarioEffects(scenario) {
    const errors = [];
    const warnings = [];
    if (!scenario || !scenario.nodes) return { ok: true, errors: errors, warnings: warnings };
    for (const [nodeId, node] of Object.entries(scenario.nodes)) {
        if (node.effects) {
            const r = validateEffects(node.effects, nodeId);
            errors.push(...r.errors);
            warnings.push(...r.warnings);
        }
        for (const c of node.choices || []) {
            if (c.effects) {
                const r = validateEffects(c.effects, nodeId + '.choice.' + (c.id || '?'));
                errors.push(...r.errors);
                warnings.push(...r.warnings);
            }
        }
    }
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
}
