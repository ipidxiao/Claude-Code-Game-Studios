import { pauseForRuleCheck, voidChaseRuleChecks, applyChaseInjury } from '../../state/rule_check.mjs';
import { requireField, resolveEnemy } from '../resolve.mjs';

function emptyChase() {
    return { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null };
}

function ensureChase(gameState) {
    if (!gameState.chase) gameState.chase = emptyChase();
    return gameState.chase;
}

function findActor(gameState, name) {
    const roster = gameState.roster || [];
    let c = roster.find((r) => r && r.name === name);
    if (c) return c;
    const enemies = (gameState.combat && gameState.combat.enemies) || [];
    if (enemies.length) {
        const got = resolveEnemy(enemies, name, {
            required: false, preferLiving: true, allowFirstFallback: false, roleLabel: '敌人'
        });
        if (got.ok) return got.enemy;
        const fromCombat = enemies.find((e) => e && (e.name === name || e._rosterName === name));
        if (fromCombat) return fromCombat;
    }
    const reg = gameState.npcRegistry || [];
    const fromReg = reg.find((n) => n && n.name === name);
    if (fromReg) {
        return {
            name: fromReg.name,
            mov: Number(fromReg.mov) || 8,
            derived: { mov: Number(fromReg.mov) || 8 },
            attrs: fromReg.attrs || { CON: 50 },
            skills: fromReg.skills || {}
        };
    }
    const npcs = gameState.npcs || [];
    const fromNpc = npcs.find((n) => n && n.name === name);
    if (fromNpc) {
        return {
            name: fromNpc.name,
            mov: Number(fromNpc.mov) || 8,
            derived: { mov: Number(fromNpc.mov) || 8 },
            attrs: fromNpc.attrs || { CON: 50 },
            skills: fromNpc.skills || {}
        };
    }
    return null;
}

function findChasePart(Engine, state, name) {
    if (!Engine || !Engine.ChaseEngine || !state) return null;
    let part = Engine.ChaseEngine.find(state, name);
    if (part) return part;
    const parts = state.participants || [];
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const crew = (p && p.vehicle && p.vehicle.crew) || [];
        if (crew.some((c) => c && c.name === name)) return p;
    }
    return null;
}

export function chase(ctx) {
    const { gameState, Engine, addJournalEntry } = ctx;

    const denyAct = (ch, action) => {
        if (!Engine || typeof Engine.canAct !== 'function') return null;
        const gate = Engine.canAct(ch, action);
        if (gate && gate.ok === false) return gate.desc || '无法行动';
        return null;
    };

    const applyOutcome = (state) => {
        const ev = Engine.ChaseEngine.evaluate(state);
        if (ev.caught) {
            state.outcome = 'caught';
            return ' 已追上，可 melee_attack / fire_weapon。';
        }
        if (ev.escaped) {
            state.outcome = 'escaped';
            state.active = false;
            return ' 猎物逃脱，追逐结束。';
        }
        return '';
    };

    return {
        start_chase: (args) => {
            if (!Engine || !Engine.ChaseEngine) return '错误：追逐引擎未加载。';
            const existing = gameState.chase;
            if (existing && existing.active) {
                return '错误：已有进行中的追逐（猎物：'
                    + (existing.quarryName || '？')
                    + '）。请先 chase_action action=end 结束后再 start_chase，以免残留速度检定。';
            }
            if (gameState.combat && gameState.combat.active) {
                return '错误：战斗进行中，请先 end_combat 后再 start_chase。';
            }
            const quarryName = args.quarry_name;
            if (!quarryName) return '错误：须指定 quarry_name。';
            const quarry = findActor(gameState, quarryName);
            if (!quarry) {
                return '错误：找不到猎物「' + quarryName + '」。请先 register_npc / spawn_npc，或确保其在战斗敌人表 / 调查员名册中。';
            }
            let pursuerNames = Array.isArray(args.pursuer_names) ? args.pursuer_names : [];
            const explicitPursuers = pursuerNames.length > 0;
            if (!pursuerNames.length) {
                pursuerNames = (gameState.roster || [])
                    .filter((r) => r && r.isActive !== false && r.name)
                    .map((r) => r.name);
            }
            const pursuers = [];
            const missingPursuers = [];
            for (const n of pursuerNames) {
                const a = findActor(gameState, n);
                if (a) pursuers.push(a);
                else missingPursuers.push(n);
            }
            if (explicitPursuers && missingPursuers.length) {
                return '错误：找不到追赶者：' + missingPursuers.join('、');
            }
            if (!pursuers.length) return '错误：找不到追赶者。';
            const state = Engine.ChaseEngine.start(quarry, pursuers, {
                lead: args.lead,
                vehicle: !!args.vehicle,
                vehicleId: args.vehicle_id || args.vehicle_type,
                quarryVehicleId: args.quarry_vehicle_id,
                pursuerVehicleId: args.pursuer_vehicle_id,
                vehicleMov: args.vehicle_mov,
                vehicleHp: args.vehicle_hp,
                vehicleMaxHp: args.vehicle_max_hp,
                vehicleArmor: args.vehicle_armor,
                pursuerVehicleMov: args.pursuer_vehicle_mov,
                pursuerVehicleHp: args.pursuer_vehicle_hp,
                pursuerVehicleArmor: args.pursuer_vehicle_armor,
                skipSpeedCheck: !!args.skip_speed_check,
                escapeThreshold: args.escape_threshold,
                escapeRounds: args.escape_rounds,
                maxActions: args.max_actions
            });
            gameState.chase = state;
            const rosterNames = new Set((gameState.roster || []).map((r) => r && r.name).filter(Boolean));
            const skipSpeed = !!args.skip_speed_check;
            if (!skipSpeed) {
                (state.participants || []).forEach((p) => {
                    if (!p) return;
                    const skill = Engine.ChaseEngine.pushSkill(state, p);
                    if (!rosterNames.has(p.name)) {
                        const actor = findActor(gameState, p.name) || {
                            name: p.name,
                            attrs: { CON: 50 },
                            skills: { '汽车驾驶': 40, '体质': 50 }
                        };
                        const pre = Engine.checkSkill(skill, actor, 'normal');
                        Engine.ChaseEngine.applySpeedResult(p, pre);
                        return;
                    }
                    pauseForRuleCheck(gameState, {
                        kind: 'chase_speed',
                        skill,
                        roller: p.name,
                        target: p.name,
                        prompt: `【追逐·速度】${p.name} 请进行【${skill}】检定以确定有效 MOV。`
                    });
                });
                const hasSpeedPending = (s) => !!(s && s.kind === 'chase_speed');
                const pendingSpeed = hasSpeedPending(gameState.pendingRuleCheck)
                    || (gameState.pendingRuleChecks || []).some(hasSpeedPending);
                if (!pendingSpeed) {
                    state.speedResolved = true;
                    (state.participants || []).forEach((p) => {
                        if (p) p.actionsLeft = Engine.ChaseEngine.actionsFor(p, state);
                    });
                }
            } else {
                state.speedResolved = true;
            }
            const msg = Engine.ChaseEngine.describe(state);
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🏃 ' + msg });
            addJournalEntry && addJournalEntry({ type: 'chase', summary: msg });
            // Only emit forceCheck for the *active* pending speed check; queued ones promote later.
            if (gameState.pendingRuleCheck && gameState.pendingRuleCheck.kind === 'chase_speed') {
                return {
                    msg: msg + ' ' + (gameState.pendingRuleCheck.prompt || ''),
                    forceCheck: {
                        skill: gameState.pendingRuleCheck.skill,
                        target: gameState.pendingRuleCheck.roller
                    }
                };
            }
            return msg;
        },
        chase_action: (args) => {
            const state = ensureChase(gameState);
            if (!Engine || !Engine.ChaseEngine) return '错误：追逐引擎未加载。';
            const action = args.action || 'push';
            if (action !== 'end' && action !== 'set_crew' && state.active && state.speedResolved === false) {
                return '错误：请先完成开场速度检定。';
            }
            if (action === 'end') {
                if (!state.active) return '错误：当前没有进行中的追逐。';
                state.active = false;
                state.outcome = args.outcome || state.outcome || 'other';
                const voided = voidChaseRuleChecks(gameState);
                const msg = '追逐结束（' + state.outcome + '）。'
                    + (voided ? '已作废 ' + voided + ' 个未掷的追逐检定。' : '');
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🏃 ' + msg });
                return msg;
            }
            if (action === 'tick' || action === 'next_round') {
                if (!state.active) return '错误：当前没有进行中的追逐。请先 start_chase。';
                if (gameState.combat && gameState.combat.active) {
                    return '错误：战斗进行中时追逐轮次随战斗回合推进，请勿单独 tick。';
                }
                const tr = Engine.ChaseEngine.tickRound(state);
                if (!tr) return '错误：当前没有进行中的追逐。请先 start_chase。';
                let msg = '追逐进入第' + tr.round + '轮。' + Engine.ChaseEngine.describe(state);
                if (Array.isArray(state.gunfightBeats)) {
                    const beat = state.gunfightBeats.find((b) => b && Number(b.round) === Number(tr.round));
                    if (beat && beat.hint) {
                        msg += ' ' + beat.hint;
                        gameState.chatHistory.push({
                            role: 'system', isLocalOnly: true, isAlert: true,
                            content: '🔫 [载具枪战提示] ' + beat.hint
                        });
                    }
                }
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🏃 ' + msg });
                return msg;
            }
            if (action === 'set_crew') {
                const hostName = args.actor_name || args.vehicle_owner || state.quarryName;
                const part = Engine.ChaseEngine.find(state, hostName);
                if (!part || !part.vehicle) return '错误：找不到载具参与者 ' + hostName;
                const crew = Array.isArray(args.crew) ? args.crew : [];
                const result = Engine.ChaseEngine.setCrew(part, crew);
                if (!result.ok) return '错误：' + result.desc;
                const msg = result.desc + ' ' + Engine.ChaseEngine.describe(state);
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: '🏃 ' + msg });
                return msg;
            }
            if (!state.active) return '错误：当前没有进行中的追逐。请先 start_chase。';
            const actorField = requireField(args, 'actor_name', { label: 'actor_name' });
            if (!actorField.ok) return '错误：须指定 actor_name';
            const actorName = actorField.value;
            const part = findChasePart(Engine, state, actorName);
            if (!part) return '错误：找不到追逐参与者 ' + actorName;
            // Seat roles only gate driving maneuvers — passengers may still face hazards.
            const drivingAction = action === 'push' || action === 'collide' || action === 'lose_control';
            if (drivingAction && state.vehicle && Engine.ChaseEngine.canDrive
                && !Engine.ChaseEngine.canDrive(part, actorName)) {
                return '错误：' + actorName + ' 不是司机，无法驾驶载具（可改做 hazard 等非驾驶行动）。';
            }
            const actorChar = findActor(gameState, actorName);
            if (actorChar) {
                const blocked = denyAct(actorChar, 'chase');
                if (blocked) return '错误：' + blocked;
            }
            const onRoster = (gameState.roster || []).some((r) => r && r.name === actorName);
            const hazardKind = args.hazard_kind || args.kind || state.hazardKind || 'obstacle';
            const runNpc = (skill, kind) => {
                const actor = findActor(gameState, actorName) || {
                    name: actorName, attrs: { CON: 50 }, skills: { '汽车驾驶': 40, '跳跃': 40 }
                };
                const pre = Engine.checkSkill(skill, actor, 'normal');
                const result = kind === 'chase_hazard'
                    ? Engine.ChaseEngine.applyHazard(part, pre, { state, hazardKind, damage: args.damage })
                    : Engine.ChaseEngine.applyPush(part, pre, state, { actorName });
                if (result && result.damage > 0) applyChaseInjury(gameState, Engine, actorName, result.damage);
                const msg = result.desc + applyOutcome(state) + ' ' + Engine.ChaseEngine.describe(state);
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🏃 ' + msg });
                return msg;
            };
            if (action === 'collide' || action === 'lose_control') {
                if (!state.vehicle) return '错误：当前不是载具追逐。请 start_chase 时设 vehicle=true。';
                const skill = args.skill_name || (part.vehicle && part.vehicle.skill) || '汽车驾驶';
                if (!onRoster) {
                    const actor = findActor(gameState, actorName) || {
                        name: actorName, skills: { '汽车驾驶': 40 }
                    };
                    const pre = Engine.checkSkill(skill, actor, 'normal');
                    const result = Engine.ChaseEngine.applyVehicleMishap(part, pre, {
                        state, kind: action, damage: args.damage
                    });
                    if (result.damage > 0 && !part.vehicle) {
                        applyChaseInjury(gameState, Engine, actorName, result.damage);
                    }
                    const msg = result.desc + applyOutcome(state) + ' ' + Engine.ChaseEngine.describe(state);
                    gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: '🏃 ' + msg });
                    return msg;
                }
                return pauseForRuleCheck(gameState, {
                    kind: 'chase_vehicle',
                    skill,
                    roller: actorName,
                    target: actorName,
                    vehicleKind: action,
                    hazardDamage: args.damage,
                    prompt: `【追逐·${action === 'lose_control' ? '失控' : '碰撞'}】${actorName} 请进行【${skill}】检定。`
                });
            }
            if (action === 'hazard') {
                const skill = args.skill_name || '跳跃';
                if (!onRoster) return runNpc(skill, 'chase_hazard');
                return pauseForRuleCheck(gameState, {
                    kind: 'chase_hazard',
                    skill,
                    roller: actorName,
                    target: actorName,
                    hazardKind,
                    hazardDamage: args.damage,
                    prompt: `【追逐·${hazardKind === 'barrier' ? '屏障' : '障碍'}】${actorName} 请进行【${skill}】检定。`
                });
            }
            if (action === 'push') {
                const skill = args.skill_name || Engine.ChaseEngine.pushSkill(state, part);
                if (!onRoster) return runNpc(skill, 'chase_push');
                return pauseForRuleCheck(gameState, {
                    kind: 'chase_push',
                    skill,
                    roller: actorName,
                    target: part.name,
                    actorName,
                    prompt: `【追逐·加速】${actorName} 请进行【${skill}】检定。成功则前进 1 处。`
                });
            }
            return '错误：未知追逐行动：' + action + '（可用：push/hazard/tick/end/set_crew/collide/lose_control）';
        }
    };
}
