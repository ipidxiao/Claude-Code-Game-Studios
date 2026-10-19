// ESM engine module — CoC 7e chase (locations, MOV, speed CON / Drive, hazards)
import { lookupVehicle, resolveVehicleOpts, DEFAULT_VEHICLE_ID, CoCVehicles } from '../data/vehicles.mjs';
import { CoCItemDB } from '../data/items.mjs';

export function attachChaseEngine(CoCEngine) {
  CoCEngine.Vehicles = CoCVehicles;
  CoCEngine.lookupVehicle = lookupVehicle;
  CoCEngine.resolveVehicleOpts = resolveVehicleOpts;

  CoCEngine.ChaseEngine = {
    movOf: function(ch) {
        if (!ch) return 8;
        var mode = ch.chaseMode || ch.locomotion;
        var m;
        if (mode === 'air' && ch.fly != null) m = ch.fly;
        else if (mode === 'water' && ch.swim != null) m = ch.swim;
        else m = (ch.derived && ch.derived.mov != null) ? ch.derived.mov : ch.mov;
        var n = Number(m);
        if (!Number.isFinite(n) || n <= 0) n = 8;
        var pen = 0;
        var eq = ch.equipment;
        if (eq && typeof eq === 'object' && CoCItemDB && typeof CoCItemDB.resolve === 'function') {
            [eq.armor, eq.helmet].forEach(function(piece) {
                if (!piece) return;
                var rec = (typeof piece === 'object' && piece.movPenalty != null)
                    ? piece
                    : CoCItemDB.resolve(typeof piece === 'string' ? piece : piece.name);
                pen += Math.max(0, Number(rec && rec.movPenalty) || 0);
            });
        }
        return Math.max(1, n - pen);
    },

    lookupVehicle: lookupVehicle,
    resolveVehicleOpts: resolveVehicleOpts,

    /** Relative MOV → actions per round (7e: vs slowest participant; no hard cap 3). */
    actionsFor: function(part, state) {
        if (!part) return 1;
        var peers = (state && state.participants) || [];
        var mine = part.effectiveMov != null ? part.effectiveMov : part.mov;
        var slowest = peers.reduce(function(m, p) {
            if (!p) return m;
            var pm = p.effectiveMov != null ? p.effectiveMov : p.mov;
            return Math.min(m, Number(pm) || m);
        }, mine);
        var extra = Math.max(0, Math.floor(mine - slowest));
        var actions = Math.max(1, 1 + extra);
        var cap = state && state.maxActions != null ? Number(state.maxActions) : 0;
        if (cap > 0) actions = Math.min(actions, cap);
        return actions;
    },

    makeParticipant: function(ch, isQuarry, location, speedMod, vehicleOpts) {
        var mov = this.movOf(ch);
        var vehicle = null;
        if (vehicleOpts) {
            var vMov = Number(vehicleOpts.mov);
            if (!Number.isFinite(vMov) || vMov < 1) vMov = mov;
            var vHp = Number(vehicleOpts.hp);
            if (!Number.isFinite(vHp) || vHp < 1) vHp = 20;
            var vMax = Number(vehicleOpts.maxHp);
            if (!Number.isFinite(vMax) || vMax < 1) vMax = vHp;
            var vArmor = Number(vehicleOpts.armor);
            if (!Number.isFinite(vArmor) || vArmor < 0) vArmor = 2;
            vehicle = {
                id: vehicleOpts.id || null,
                name: vehicleOpts.name || null,
                mov: vMov,
                hp: vHp,
                maxHp: vMax,
                armor: vArmor,
                seats: vehicleOpts.seats != null ? vehicleOpts.seats : null,
                skill: vehicleOpts.skill || null,
                wrecked: false,
                crew: Array.isArray(vehicleOpts.crew) ? vehicleOpts.crew.slice() : []
            };
        }
        // part.mov stays the character's own MOV so a wrecked vehicle falls back to it.
        var eff = (vehicle ? vehicle.mov : mov) + (Number(speedMod) || 0);
        if (eff < 1) eff = 1;
        var part = {
            name: ch.name,
            mov: mov,
            effectiveMov: eff,
            location: location || 0,
            isQuarry: !!isQuarry,
            isEnemy: !!ch.isEnemy,
            actionsLeft: 1
        };
        if (vehicle) part.vehicle = vehicle;
        return part;
    },

    applySpeedResult: function(part, preRolled) {
        if (!part) return { effectiveMov: 0, desc: '无参与者' };
        var baseMov = (part.vehicle && !part.vehicle.wrecked) ? part.vehicle.mov : part.mov;
        if (preRolled && preRolled.level === '大失败') {
            part.effectiveMov = Math.max(1, baseMov - 1);
            return { effectiveMov: part.effectiveMov, desc: part.name + ' 速度检定大失败，有效 MOV ' + part.effectiveMov };
        }
        if (preRolled && (preRolled.level === '大成功' || preRolled.level === '极难成功')) {
            part.effectiveMov = baseMov + 1;
            return { effectiveMov: part.effectiveMov, desc: part.name + ' 速度检定优异，有效 MOV ' + part.effectiveMov };
        }
        if (preRolled && !preRolled.success) {
            part.effectiveMov = Math.max(1, baseMov - 1);
            return { effectiveMov: part.effectiveMov, desc: part.name + ' 速度检定失败，有效 MOV ' + part.effectiveMov };
        }
        part.effectiveMov = baseMov;
        return { effectiveMov: part.effectiveMov, desc: part.name + ' 保持 MOV ' + part.effectiveMov };
    },

    start: function(quarry, pursuers, opts) {
        opts = opts || {};
        var lead = Number(opts.lead);
        if (!Number.isFinite(lead) || lead < 1) lead = 2;
        var escapeThreshold = Number(opts.escapeThreshold);
        if (!Number.isFinite(escapeThreshold) || escapeThreshold < 1) {
            escapeThreshold = Math.max(lead, 3);
        }
        var escapeRounds = Number(opts.escapeRounds);
        if (!Number.isFinite(escapeRounds) || escapeRounds < 1) escapeRounds = 2;
        var vehicleOn = !!opts.vehicle;
        var vOpts = null;
        var pursuerVOpts = null;
        if (vehicleOn) {
            var id = opts.vehicleId || opts.vehicle_id || opts.vehicleType || opts.vehicle_type || DEFAULT_VEHICLE_ID;
            var quarryId = opts.quarryVehicleId || opts.quarry_vehicle_id || id;
            var pursuerId = opts.pursuerVehicleId || opts.pursuer_vehicle_id || id;
            vOpts = resolveVehicleOpts(quarryId, opts);
            pursuerVOpts = resolveVehicleOpts(pursuerId, {
                mov: opts.pursuerVehicleMov != null ? opts.pursuerVehicleMov : opts.pursuer_vehicle_mov,
                hp: opts.pursuerVehicleHp != null ? opts.pursuerVehicleHp : opts.pursuer_vehicle_hp,
                armor: opts.pursuerVehicleArmor != null ? opts.pursuerVehicleArmor : opts.pursuer_vehicle_armor
            });
            if (!vOpts || !pursuerVOpts) {
                return { ok: false, desc: '未知载具类型：' + (quarryId || pursuerId || '') };
            }
        }
        var parts = [this.makeParticipant(quarry, true, lead, opts.quarrySpeedMod, vOpts)];
        (pursuers || []).forEach((p) => {
            parts.push(this.makeParticipant(p, false, 0, opts.pursuerSpeedMod, pursuerVOpts || vOpts));
        });
        var state = {
            active: true,
            round: 1,
            vehicle: vehicleOn,
            vehicleId: vehicleOn ? (vOpts && vOpts.id) : null,
            quarryName: quarry.name,
            participants: parts,
            outcome: null,
            hazardKind: opts.hazardKind || 'obstacle',
            speedResolved: !!opts.skipSpeedCheck,
            escapeThreshold: escapeThreshold,
            escapeRounds: escapeRounds,
            escapeStreak: 0,
            lead: lead
        };
        if (opts.maxActions != null) state.maxActions = Number(opts.maxActions);
        parts.forEach((p) => { p.actionsLeft = this.actionsFor(p, state); });
        return state;
    },

    tickRound: function(state) {
        if (!state || !state.active) return null;
        state.round = (Number(state.round) || 1) + 1;
        var self = this;
        (state.participants || []).forEach(function(p) {
            p.actionsLeft = self.actionsFor(p, state);
        });
        var ev = this.evaluate(state, { advanceStreak: true });
        if (ev.escaped) {
            state.outcome = 'escaped';
            state.active = false;
        } else if (ev.caught) {
            state.outcome = 'caught';
            state.active = false;
        }
        return { round: state.round, evaluate: ev };
    },

    spendAction: function(state, name) {
        var part = this.find(state, name);
        if (!part) return { ok: false, desc: '找不到追逐者。' };
        if (part.actionsLeft == null) part.actionsLeft = this.actionsFor(part, state);
        if ((part.actionsLeft || 0) <= 0) return { ok: false, desc: part.name + ' 本轮行动已用尽。' };
        part.actionsLeft -= 1;
        return { ok: true, actionsLeft: part.actionsLeft };
    },

    find: function(state, name) {
        if (!state || !state.participants) return null;
        return state.participants.find(function(p) { return p && p.name === name; }) || null;
    },

    pushSkill: function(state, part) {
        if (!state || !state.vehicle) return '体质';
        // A wrecked vehicle means running on foot, not driving.
        if (part && part.vehicle && part.vehicle.wrecked) return '体质';
        if (part && part.vehicle && part.vehicle.skill) return part.vehicle.skill;
        return '汽车驾驶';
    },

    CREW_ROLES: Object.freeze(['driver', 'passenger', 'gunner']),

    /**
     * Assign vehicle crew seats (driver / passenger / gunner). Enforces seats cap.
     */
    setCrew: function(part, crewList) {
        if (!part || !part.vehicle) return { ok: false, desc: '无载具可乘员。' };
        const seats = part.vehicle.seats != null ? Number(part.vehicle.seats) : 4;
        const list = Array.isArray(crewList) ? crewList : [];
        if (list.length > seats) {
            return { ok: false, desc: '乘员超过座位数（' + seats + '）。' };
        }
        const crew = [];
        let drivers = 0;
        for (let i = 0; i < list.length; i++) {
            const row = list[i] || {};
            const role = String(row.role || 'passenger').toLowerCase();
            if (this.CREW_ROLES.indexOf(role) < 0) {
                return { ok: false, desc: '未知乘员角色: ' + role };
            }
            if (role === 'driver') drivers += 1;
            crew.push({ name: row.name || ('seat' + (i + 1)), role: role });
        }
        if (drivers > 1) return { ok: false, desc: '同一载具只能有一名司机。' };
        part.vehicle.crew = crew;
        return { ok: true, crew: crew, seats: seats, desc: (part.name || '载具') + ' 乘员 ' + crew.length + '/' + seats + '。' };
    },

    driverOf: function(part) {
        if (!part || !part.vehicle || !Array.isArray(part.vehicle.crew)) return null;
        return part.vehicle.crew.find(function(c) { return c && c.role === 'driver'; }) || null;
    },

    /** Only the assigned driver (or sole occupant) may Drive Auto / push in vehicle chase. */
    canDrive: function(part, actorName) {
        if (!part || !part.vehicle) return true;
        // Once wrecked everyone is on foot, so seat roles no longer restrict anyone.
        if (part.vehicle.wrecked) return true;
        const crew = part.vehicle.crew || [];
        if (!crew.length) return true;
        const driver = this.driverOf(part);
        if (!driver) return true;
        return !actorName || driver.name === actorName;
    },

    applyPush: function(part, preRolled, state, opts) {
        opts = opts || {};
        if (!part) return { moved: 0, desc: '找不到追逐者。' };
        if (state && state.vehicle && !this.canDrive(part, opts.actorName || part.name)) {
            return { moved: 0, desc: (opts.actorName || part.name) + ' 不是司机，无法加速驾驶。' };
        }
        if (state) {
            var spend = this.spendAction(state, part.name);
            if (!spend.ok) return { moved: 0, desc: spend.desc };
        }
        if (preRolled && preRolled.level === '大失败') {
            part.location = Math.max(0, part.location - 1);
            return { moved: -1, desc: part.name + ' 加速大失败，落后 1 处（现位于 ' + part.location + '）。' };
        }
        if (!preRolled || !preRolled.success) {
            return { moved: 0, desc: part.name + ' 加速失败，位置仍为 ' + part.location + '。' };
        }
        part.location += 1;
        return { moved: 1, desc: part.name + ' 加速成功，前进 1 处（现位于 ' + part.location + '）。' };
    },

    /**
     * hazardKind: obstacle (fail = stay + lose actions) | barrier (fail = blocked; fumble may injure)
     */
    applyHazard: function(part, preRolled, opts) {
        opts = opts || {};
        var kind = opts.hazardKind || opts.kind || 'obstacle';
        if (!part) return { moved: 0, passed: false, desc: '找不到追逐者。' };
        if (opts.state) {
            var spend = this.spendAction(opts.state, part.name);
            if (!spend.ok) return { moved: 0, passed: false, desc: spend.desc };
        }
        if (preRolled && preRolled.success) {
            return { moved: 0, passed: true, stumble: false, kind: kind, desc: part.name + ' 通过了' + (kind === 'barrier' ? '屏障' : '障碍') + '。' };
        }
        var stumble = !!(preRolled && preRolled.level === '大失败');
        if (kind === 'barrier' && !stumble) {
            part.actionsLeft = 0;
            return {
                moved: 0,
                passed: false,
                stumble: false,
                kind: kind,
                blocked: true,
                damage: Number(opts.damage) || 0,
                desc: part.name + ' 被屏障挡住，未能前进，本轮无法再移动。'
            };
        }
        // Obstacle fail: stay put, lose remaining move actions (7e); fumble may injure.
        part.actionsLeft = 0;
        return {
            moved: 0,
            passed: false,
            stumble: stumble,
            kind: kind,
            damage: stumble ? (Number(opts.damage) || 1) : 0,
            desc: part.name + (stumble
                ? ' 在障碍上重摔，本轮无法再移动。'
                : ' 未能通过障碍，本轮无法再移动。')
        };
    },

    /**
     * Vehicle collide / lose control (simplified 7e Drive Auto).
     * fail → location -1 + damage; fumble → lose control (actionsLeft=0) + more damage.
     */
    applyVehicleMishap: function(part, preRolled, opts) {
        opts = opts || {};
        var state = opts.state;
        if (!part) return { moved: 0, desc: '找不到追逐者。' };
        if (part.vehicle && part.vehicle.wrecked) {
            return { moved: 0, desc: part.name + ' 的载具已报废，无法继续驾驶。', wrecked: true };
        }
        if (state) {
            var spend = this.spendAction(state, part.name);
            if (!spend.ok) return { moved: 0, desc: spend.desc };
        }
        if (preRolled && preRolled.success) {
            return {
                moved: 0,
                passed: true,
                kind: opts.kind || 'collide',
                damage: 0,
                desc: part.name + ' 稳住了载具。'
            };
        }
        var fumble = !!(preRolled && preRolled.level === '大失败');
        part.location = Math.max(0, part.location - 1);
        if (fumble) part.actionsLeft = 0;
        var dmg = fumble ? (Number(opts.damage) || 0) || 4 : (Number(opts.damage) || 0) || 2;
        var vehicleDamage = 0;
        var wrecked = false;
        if (part.vehicle) {
            var armor = Number(part.vehicle.armor) || 0;
            vehicleDamage = Math.max(0, dmg - armor);
            part.vehicle.hp = Math.max(0, (Number(part.vehicle.hp) || 0) - vehicleDamage);
            if (part.vehicle.hp <= 0) {
                part.vehicle.wrecked = true;
                part.actionsLeft = 0;
                // Back on foot: drop to the character's own MOV for the rest of the chase.
                part.effectiveMov = Math.max(1, Number(part.mov) || 1);
                wrecked = true;
            }
        }
        return {
            moved: -1,
            passed: false,
            fumble: fumble,
            lostControl: fumble,
            kind: opts.kind || 'collide',
            damage: part.vehicle ? 0 : dmg,
            vehicleDamage: vehicleDamage,
            vehicleHp: part.vehicle ? part.vehicle.hp : null,
            wrecked: wrecked,
            desc: part.name + (wrecked
                ? ' 载具报废！落后 1 处。'
                : (fumble
                    ? ' 载具失控！落后 1 处，本轮无法行动。'
                    : ' 发生碰撞，落后 1 处。'))
                + (part.vehicle ? '（载具 HP ' + part.vehicle.hp + '/' + part.vehicle.maxHp + '）' : '')
        };
    },

    quarryOf: function(state) {
        return ((state && state.participants) || []).find(function(p) { return p && p.isQuarry; }) || null;
    },

    bestPursuer: function(state) {
        var list = ((state && state.participants) || []).filter(function(p) { return p && !p.isQuarry; });
        if (!list.length) return null;
        return list.reduce(function(a, b) { return a.location >= b.location ? a : b; });
    },

    evaluate: function(state, opts) {
        opts = opts || {};
        var q = this.quarryOf(state);
        var p = this.bestPursuer(state);
        if (!q) return { caught: false, escaped: false, gap: 0 };
        var gap = q.location - (p ? p.location : 0);
        var caught = !!(p && p.location >= q.location);
        var threshold = Number(state && state.escapeThreshold);
        if (!Number.isFinite(threshold) || threshold < 1) threshold = 3;
        var need = Number(state && state.escapeRounds);
        if (!Number.isFinite(need) || need < 1) need = 2;
        var streak = Number(state && state.escapeStreak) || 0;
        if (opts.advanceStreak && state) {
            if (caught || gap < threshold) streak = 0;
            else streak += 1;
            state.escapeStreak = streak;
        }
        var escaped = !caught && streak >= need;
        return {
            caught: caught,
            escaped: escaped,
            gap: gap,
            quarry: q,
            pursuer: p,
            escapeStreak: streak,
            escapeNeed: need,
            escapeThreshold: threshold
        };
    },

    describe: function(state) {
        if (!state) return '没有进行中的追逐。';
        var ev = this.evaluate(state);
        var bits = ['追逐第' + (state.round || 1) + '轮'];
        if (state.vehicle) bits.push('载具');
        if (!state.speedResolved) bits.push('速度检定中');
        bits.push('领先差' + ev.gap);
        if (ev.escapeStreak > 0) {
            bits.push('逃脱进度' + ev.escapeStreak + '/' + (ev.escapeNeed || 2));
        }
        if (ev.caught) bits.push('已追上');
        if (ev.escaped) bits.push('已逃脱');
        (state.participants || []).forEach(function(p) {
            if (!p) return;
            var line = p.name + '(位' + p.location + ',MOV' + (p.effectiveMov != null ? p.effectiveMov : p.mov)
                + ',行' + (p.actionsLeft != null ? p.actionsLeft : '?') + ')';
            if (p.vehicle) {
                line += ' 载具HP' + p.vehicle.hp + '/' + p.vehicle.maxHp
                    + (p.vehicle.name || p.vehicle.id ? '（' + (p.vehicle.name || p.vehicle.id) + '）' : '')
                    + (p.vehicle.wrecked ? '报废' : '');
            }
            bits.push(line);
        });
        return bits.join(' · ');
    }
  };

  CoCEngine.resolveChaseAction = function(state, name, action, preRolled, opts) {
      var part = CoCEngine.ChaseEngine.find(state, name);
      if (action === 'push') return CoCEngine.ChaseEngine.applyPush(part, preRolled, state, Object.assign({ actorName: name }, opts || {}));
      if (action === 'hazard') return CoCEngine.ChaseEngine.applyHazard(part, preRolled, Object.assign({ state: state }, opts || {}));
      if (action === 'collide' || action === 'lose_control') {
          return CoCEngine.ChaseEngine.applyVehicleMishap(part, preRolled, Object.assign({ state: state, kind: action }, opts || {}));
      }
      if (action === 'set_crew') {
          return CoCEngine.ChaseEngine.setCrew(part, (opts && opts.crew) || []);
      }
      if (action === 'tick') return CoCEngine.ChaseEngine.tickRound(state);
      return { desc: '未知追逐行动' };
  };
}
