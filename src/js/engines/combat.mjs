// ESM engine module — source for browser build
// Split from js/engines/combat.js
import { CoCWeaponsAppendix, CoCArmorAppendix, lookupWeapon, lookupArmor } from '../data/weapons_armor.mjs';
import { CoCCreatures, lookupCreature } from '../data/creatures_summary.mjs';
import { CoCItemDB } from '../data/items.mjs';

function armorRecord(piece) {
    if (!piece) return null;
    if (typeof piece === 'object' && piece.armor != null) return piece;
    var name = typeof piece === 'string' ? piece : (piece.name || '');
    if (!name || !CoCItemDB || typeof CoCItemDB.resolve !== 'function') return null;
    var rec = CoCItemDB.resolve(name);
    return rec && rec.armor != null ? rec : null;
}

/** Body armor from char.armor plus worn equipment. Bullet-only and head-only notes are honored. */
function armorRating(defender, opts) {
    opts = opts || {};
    var n = Math.max(0, Number(defender && defender.armor) || 0);
    var eq = defender && defender.equipment;
    if (!eq || typeof eq !== 'object') return n;
    [eq.armor, eq.helmet].forEach(function(piece) {
        var rec = armorRecord(piece);
        if (!rec) return;
        var notes = String(rec.notes || '') + String(rec.coverage || '');
        if (/仅对枪弹/.test(notes) && !opts.ranged) return;
        if (/仅头部|头部/.test(notes) && !opts.head) return;
        if (/可格挡近战/.test(notes) && opts.ranged) return;
        n += Math.max(0, Number(rec.armor) || 0);
    });
    return n;
}

function harderDifficulty(a, b) {
    var order = { normal: 0, regular: 0, hard: 1, extreme: 2 };
    var ra = order[a] != null ? order[a] : 0;
    var rb = order[b] != null ? order[b] : 0;
    return ra >= rb ? (a || 'normal') : (b || 'normal');
}

export function attachCombatEngine(CoCEngine) {
  CoCEngine.WeaponsAppendix = CoCWeaponsAppendix;
  CoCEngine.ArmorAppendix = CoCArmorAppendix;
  CoCEngine.Creatures = CoCCreatures;
  CoCEngine.lookupWeapon = lookupWeapon;
  CoCEngine.lookupArmor = lookupArmor;
  CoCEngine.lookupCreature = lookupCreature;

  CoCEngine.CombatEngine = {
    lookupWeapon: lookupWeapon,
    lookupArmor: lookupArmor,
    lookupCreature: lookupCreature,

    /**
     * 计算伤害. rawDamage is pre-armor (needed for impale: max + raw, armor once).
     */
    calculateDamage: function(damageStr, attackerDB, targetArmor = 0) {
        let totalDamage = CoCEngine.parseDice(damageStr);
        if (attackerDB) totalDamage += CoCEngine.parseDice(attackerDB);
        const rawDamage = totalDamage;
        return { rawDamage, finalDamage: Math.max(0, totalDamage - targetArmor) };
    },

    /**
     * 核心对立判定：攻击 vs 闪避/反击
     * preRolledAttack / preRolledDefense skip checkSkill (player dice panel).
     * action: 'counter' = fight back (must beat attack); otherwise dodge (tie or better).
     */
    resolveCombatExchange: function(attacker, defender, options = {}) {
        const { weapon, difficulty = 'normal' } = options;
        const attackSkill = weapon?.skill || '斗殴';
        const usePre = (pre, roll) => (pre && typeof pre.success === 'boolean') ? pre : roll();
        const attackRes = usePre(options.preRolledAttack, () => CoCEngine.checkSkill(attackSkill, attacker, difficulty, {
            bonusDice: options.bonusDice || 0,
            penaltyDice: options.penaltyDice || 0
        }));
        if (attackRes.level === '大失败') {
            return { winner: 'defender', damage: 0, msg: `${attacker.name} 遭遇了大失败！攻击不仅落空，还露出了巨大破绽。`, res: attackRes };
        }
        if (!attackRes.success) {
            return { winner: 'defender', damage: 0, msg: `${attacker.name} 的攻击 (${attackRes.rolledValue}/${attackRes.targetValue}) 挥空了。`, res: attackRes };
        }
        if (options.action === 'counter') {
            const counterRes = usePre(options.preRolledDefense, () => CoCEngine.checkSkill(options.counterSkill || '斗殴', defender));
            if (counterRes.success && this.compareSuccess(counterRes.level, attackRes.level) > 0) {
                const dmgResult = this.calculateDamage(options.counterDamage || "1D3", defender.derived?.db, armorRating(attacker, { ranged: false }));
                return this._withKnockback({
                    winner: 'defender',
                    damage: dmgResult.finalDamage,
                    rawDamage: dmgResult.rawDamage,
                    msg: `${defender.name} 完美反击了 ${attacker.name}，造成 ${dmgResult.finalDamage} 点伤害！`,
                    res: counterRes
                }, attacker, dmgResult.finalDamage);
            }
        } else {
            const dodgeRes = usePre(options.preRolledDefense, () => CoCEngine.checkSkill('闪避', defender));
            if (dodgeRes.success && this.compareSuccess(dodgeRes.level, attackRes.level) >= 0) {
                return { winner: 'defender', damage: 0, msg: `${defender.name} 灵巧地闪避了攻击 (${dodgeRes.rolledValue}/${dodgeRes.targetValue})。`, res: dodgeRes };
            }
        }
        const rangedHit = weapon && (weapon.type === 'firearm' || weapon.type === 'ranged');
        let dmgResult;
        if (options.flatDamage != null && Number.isFinite(Number(options.flatDamage))) {
            const n = Math.max(0, Number(options.flatDamage));
            const armor = armorRating(defender, { ranged: rangedHit, head: !!(options.situation && options.situation.head) });
            dmgResult = { rawDamage: n, finalDamage: Math.max(0, n - armor) };
        } else {
            const ballistic = rangedHit;
            // When SituationalEngine already expanded +DB into the damage string, do not add DB again.
            const db = (ballistic || options.damageIncludesDb)
                ? 0
                : (attacker.derived?.db || 0);
            const armorIgnore = options.armorOverride === 'ignore'
                || (options.situation && options.situation.armorOverride === 'ignore');
            const armor = armorIgnore ? 0 : armorRating(defender, { ranged: ballistic, head: !!(options.situation && options.situation.head) });
            dmgResult = this.calculateDamage(
                weapon?.damage || (ballistic ? '1D6' : '1D3'),
                db,
                armor
            );
        }
        if (defender && defender.physicalImmune && !options.magical) {
            dmgResult.finalDamage = 0;
        }
        let msg = `${attacker.name} 击中了 ${defender.name}，造成 ${dmgResult.finalDamage} 点伤害！`;
        if (defender && defender.physicalImmune && !options.magical) msg += ' 物理攻击无效。';
        if (attackRes.level === '大成功' || attackRes.level === '极难成功') msg = `【${attackRes.level}】` + msg;
        return this._withKnockback({
            winner: 'attacker',
            damage: dmgResult.finalDamage,
            rawDamage: dmgResult.rawDamage,
            msg,
            res: attackRes
        }, defender, dmgResult.finalDamage);
    },

    compareSuccess: function(levelA, levelB) {
        const rank = { '大成功': 4, '极难成功': 3, '困难成功': 2, '成功': 1, '失败': 0, '大失败': -1 };
        return (rank[levelA] || 0) - (rank[levelB] || 0);
    },

    /**
     * Thrown weapons: Throw skill vs dodge; damage from appendix or options.weapon.
     */
    resolveThrownAttack: function(attacker, defender, options) {
        options = options || {};
        let weapon = options.weapon;
        if (!weapon && options.weaponId) weapon = lookupWeapon(options.weaponId);
        if (!weapon) {
            weapon = { id: 'thrown', name: options.weaponName || '投掷物', skill: '投掷', damage: options.damage || '1D4+DB', type: 'thrown' };
        } else {
            weapon = Object.assign({}, weapon, { type: 'thrown', skill: weapon.skill || '投掷' });
        }
        return this.resolveCombatExchange(attacker, defender, Object.assign({}, options, {
            weapon: weapon,
            action: options.action || 'dodge'
        }));
    },

    /**
     * Build a combatant stub from creatures_summary table.
     */
    spawnCreature: function(idOrName, overrides) {
        const row = lookupCreature(idOrName);
        if (!row) return null;
        const o = overrides || {};
        return {
            name: o.name || row.name,
            isEnemy: true,
            creatureId: row.id,
            attrs: {
                STR: o.str != null ? o.str : row.str,
                CON: o.con != null ? o.con : row.con,
                SIZ: o.siz != null ? o.siz : row.siz,
                DEX: o.dex != null ? o.dex : row.dex
            },
            hp: o.hp != null ? o.hp : row.hp,
            maxHp: o.maxHp != null ? o.maxHp : (o.hp != null ? o.hp : row.hp),
            armor: o.armor != null ? o.armor : row.armor,
            mov: o.mov != null ? o.mov : row.mov,
            db: o.db != null ? o.db : (row.db != null ? row.db : ''),
            build: o.build != null ? o.build : (row.build != null ? row.build : 0),
            derived: {
                hp: o.hp != null ? o.hp : row.hp,
                maxHp: o.maxHp != null ? o.maxHp : (o.hp != null ? o.hp : row.hp),
                mov: o.mov != null ? o.mov : row.mov,
                db: o.db != null ? o.db : (row.db != null ? row.db : ''),
                build: o.build != null ? o.build : (row.build != null ? row.build : 0)
            },
            attacks: row.attacks,
            sanLoss: row.san
        };
    },

    _targetBuild: function(target) {
        if (!target) return null;
        var raw = (target.derived && target.derived.build != null) ? target.derived.build : target.build;
        if (raw == null || raw === '') return null;
        var n = Number(raw);
        return Number.isFinite(n) ? n : null;
    },

    checkKnockback: function(target, damage) {
        var dmg = Number(damage) || 0;
        var build = this._targetBuild(target);
        if (!target || dmg <= 0 || build == null || dmg < build) {
            return { knocked: false, build: build };
        }
        if (!target.status) target.status = {};
        target.status.prone = true;
        return {
            knocked: true,
            build: build,
            desc: (target.name || '目标') + ' 被击退倒地（伤害 ' + dmg + ' ≥ 体格 ' + build + '）。'
        };
    },

    _withKnockback: function(result, target, damage) {
        var kb = this.checkKnockback(target, damage);
        if (kb.knocked) {
            result.msg += ' ' + kb.desc;
            result.knockback = true;
        }
        return result;
    },

    /** CoC 7e: aim 1–2 bonus dice, point-blank +1, attack a prone target +1; cap 2. */
    shotBonusDice: function(attacker, defender, opts) {
        opts = opts || {};
        var n = 0;
        if (attacker && attacker.status) n += Math.max(0, Number(attacker.status.aimBonus) || 0);
        if (opts.pointBlank) n += 1;
        if (defender && defender.status && defender.status.prone) n += 1;
        if (n > 2) n = 2;
        return n;
    },

    aimShot: function(ch) {
        if (!ch) return { bonus: 0 };
        if (!ch.status) ch.status = {};
        var cur = Math.max(0, Number(ch.status.aimBonus) || 0);
        ch.status.aimBonus = Math.min(2, cur + 1);
        return { bonus: ch.status.aimBonus };
    },

    consumeAim: function(ch) {
        if (!ch || !ch.status) return 0;
        var n = Math.max(0, Number(ch.status.aimBonus) || 0);
        ch.status.aimBonus = 0;
        return n;
    },

    /**
     * CoC 7e burst / full-auto: one attack roll + one dodge; hits by success level.
     * Regular → 1 hit (auto) or up to 3 (burst); Hard → half rounds (ceil); Extreme/Crit → all.
     * options.preRolledAttack / preRolledDefense skip silent rolls (dice panel).
     */
    resolveBurstFire: function(attacker, defender, weapon, rounds, mode, options) {
        options = options || {};
        var actualRounds = Math.max(1, Math.min(Number(rounds) || 1, 30));
        mode = mode || 'burst';
        var difficulty = 'normal';
        if (mode === 'burst' && actualRounds > 1) difficulty = 'hard';
        if (mode === 'auto') {
            if (actualRounds >= 10) difficulty = 'extreme';
            else if (actualRounds >= 3) difficulty = 'hard';
        }
        if (options.difficulty) difficulty = harderDifficulty(difficulty, options.difficulty);
        var usePre = function(pre, rollFn) {
            return (pre && typeof pre.success === 'boolean') ? pre : rollFn();
        };
        var ar = usePre(options.preRolledAttack, function() {
            return CoCEngine.checkSkill(weapon.skill || '手枪', attacker, difficulty, {
                bonusDice: options.bonusDice || 0,
                penaltyDice: options.penaltyDice || 0,
                skipStatusMods: !!options.skipStatusMods
            });
        });
        if (weapon.type === 'firearm') {
            var malResult = this.checkMalfunction(weapon, ar);
            if (malResult.jammed) {
                this.markWeaponJammed(attacker, weapon);
                return {
                    totalDamage: 0, hits: 0, rounds: actualRounds, mode: mode,
                    results: [{ round: 1, hit: false, damage: 0, attackRoll: ar.rolledValue, dodgeRoll: 0, malfunction: true }],
                    description: attacker.name + ' ' + (mode === 'burst' ? '三发点射' : '全自动扫射') + ' 卡壳！' + malResult.desc,
                    malfunction: true, jammed: true, attackRes: ar
                };
            }
        }
        var dr = usePre(options.preRolledDefense, function() {
            return CoCEngine.checkSkill('闪避', defender, 'normal');
        });
        var attackWins = false;
        if (ar.success && dr.success) {
            attackWins = this.compareSuccess(ar.level, dr.level) > 0;
        } else if (ar.success && !dr.success) {
            attackWins = true;
        }
        var hits = 0;
        if (attackWins) {
            if (ar.level === '大成功' || ar.level === '极难成功') hits = actualRounds;
            else if (ar.level === '困难成功') hits = Math.max(1, Math.ceil(actualRounds / 2));
            else hits = Math.max(1, Math.min(actualRounds, mode === 'burst' ? Math.min(3, actualRounds) : 1));
        }
        var ballistic = weapon && (weapon.type === 'firearm' || weapon.type === 'ranged');
        var sit = options.situation || {};
        var cover = ballistic
            ? (sit.targetCover || sit.coverDetail || sit.cover || (defender.status && defender.status.cover) || null)
            : null;
        var wornArmor = armorRating(defender, { ranged: !!ballistic });
        var coverSoaked = 0;
        var perShot = 0;
        var totalDamage = 0;
        var results = [];
        for (var i = 0; i < actualRounds; i++) {
            var hit = i < hits;
            var dmg = 0;
            if (hit) {
                // Worn armor applies to firearms too (only DB is dropped for ballistic).
                dmg = this.calculateDamage(
                    weapon.damage || '1D6',
                    ballistic ? 0 : attacker.derived?.db,
                    armorRating(defender, { ranged: !!ballistic })
                ).finalDamage;
                if (cover) {
                    // Each round strikes the cover first, wearing it down (7e p.113).
                    var soak = this.applyCoverSoak(dmg + wornArmor, cover);
                    dmg = Math.max(0, soak.damageToTarget - wornArmor);
                    coverSoaked += soak.soaked;
                    cover = soak.cover;
                    if (typeof options.onCoverUpdate === 'function') options.onCoverUpdate(soak.cover, soak);
                }
                totalDamage += dmg;
                perShot = dmg;
            }
            results.push({
                round: i + 1, hit: hit, damage: dmg,
                attackRoll: ar.rolledValue, dodgeRoll: dr.rolledValue
            });
        }
        var desc = attacker.name + ' ' + (mode === 'burst' ? '点射' : '全自动') + ' ' + actualRounds + '发（' + difficulty + '）'
            + '！攻击' + ar.level + ' / 闪避' + dr.level + ' → ' + hits + '中，' + totalDamage + '伤。'
            + (coverSoaked > 0 ? ' 掩体吸收 ' + coverSoaked + ' 点' + (cover ? '。' : '后被打穿！') : '');
        return {
            totalDamage: totalDamage, hits: hits, rounds: actualRounds, mode: mode,
            results: results, description: desc, attackRes: ar, dodgeRes: dr,
            difficulty: difficulty, perShot: perShot, coverSoaked: coverSoaked
        };
    },

    /**
     * Multi-target autofire/sweep: one attack roll, hits distributed across targets.
     * Each target may dodge; leftover hits cascade to next living target.
     */
    resolveSweepFire: function(attacker, targets, weapon, rounds, mode, options) {
        options = options || {};
        var list = (targets || []).filter(function(t) {
            return t && !t.isDefeated && !t._npcFled && !t._npcStoodDown;
        });
        if (!list.length) {
            return { totalDamage: 0, hits: 0, rounds: 0, mode: mode || 'auto', perTarget: [], description: '没有可扫射的目标。' };
        }
        var actualRounds = Math.max(1, Math.min(Number(rounds) || 1, 30));
        mode = mode || 'auto';
        var difficulty = 'normal';
        if (mode === 'burst' && actualRounds > 1) difficulty = 'hard';
        if (mode === 'auto') {
            if (actualRounds >= 10) difficulty = 'extreme';
            else if (actualRounds >= 3) difficulty = 'hard';
        }
        if (options.difficulty) difficulty = harderDifficulty(difficulty, options.difficulty);
        var usePre = function(pre, rollFn) {
            return (pre && typeof pre.success === 'boolean') ? pre : rollFn();
        };
        var ar = usePre(options.preRolledAttack, function() {
            return CoCEngine.checkSkill(weapon.skill || '冲锋枪', attacker, difficulty, {
                bonusDice: options.bonusDice || 0,
                penaltyDice: options.penaltyDice || 0,
                skipStatusMods: !!options.skipStatusMods
            });
        });
        if (weapon.type === 'firearm') {
            var mal = this.checkMalfunction(weapon, ar);
            if (mal.jammed) {
                this.markWeaponJammed(attacker, weapon);
                return {
                    totalDamage: 0, hits: 0, rounds: actualRounds, mode: mode,
                    perTarget: [], attackRes: ar, malfunction: true, jammed: true,
                    description: attacker.name + ' 扫射卡壳！' + mal.desc
                };
            }
        }
        var pool = 0;
        if (ar.success) {
            if (ar.level === '大成功' || ar.level === '极难成功') pool = actualRounds;
            else if (ar.level === '困难成功') pool = Math.max(1, Math.ceil(actualRounds / 2));
            else pool = Math.max(1, Math.min(actualRounds, mode === 'burst' ? Math.min(3, actualRounds) : 1));
        }
        var ballistic = weapon && (weapon.type === 'firearm' || weapon.type === 'ranged');
        var perTarget = [];
        var totalDamage = 0;
        var hitsLeft = pool;
        var idx = 0;
        while (hitsLeft > 0 && list.length) {
            var t = list[idx % list.length];
            idx++;
            var entry = perTarget.find(function(p) { return p.target === t; });
            if (!entry) {
                var dodgePre = (options.preRolledDodges && options.preRolledDodges[t.name]) || null;
                var dr = usePre(dodgePre, function() {
                    return CoCEngine.checkSkill('闪避', t, 'normal');
                });
                var canHit = true;
                if (dr.success && this.compareSuccess(dr.level, ar.level) >= 0) canHit = false;
                entry = {
                    target: t, name: t.name, hits: 0, damage: 0, dodgeRes: dr, blocked: !canHit,
                    cover: ballistic ? ((t.status && t.status.cover) || null) : null,
                    coverSoaked: 0
                };
                perTarget.push(entry);
                if (!canHit) {
                    // skip this target for remaining allocation once fully blocked this volley
                    list = list.filter(function(x) { return x !== t; });
                    continue;
                }
            }
            if (entry.blocked) continue;
            var dmg = this.calculateDamage(
                weapon.damage || '1D10',
                ballistic ? 0 : attacker.derived?.db,
                armorRating(t, { ranged: !!ballistic })
            ).finalDamage;
            if (entry.cover) {
                // Each round strikes that target's cover first (7e p.113).
                var tArmor = armorRating(t, { ranged: !!ballistic });
                var tSoak = this.applyCoverSoak(dmg + tArmor, entry.cover);
                dmg = Math.max(0, tSoak.damageToTarget - tArmor);
                entry.coverSoaked += tSoak.soaked;
                entry.cover = tSoak.cover;
                if (typeof options.onCoverUpdate === 'function') options.onCoverUpdate(tSoak.cover, tSoak, t);
            }
            entry.hits += 1;
            entry.damage += dmg;
            totalDamage += dmg;
            hitsLeft -= 1;
            // Safety: avoid infinite loop
            if (idx > actualRounds * list.length + 5) break;
        }
        var bits = perTarget.map(function(p) {
            return p.name + (p.blocked
                ? '（闪避）'
                : (' ' + p.hits + '中/' + p.damage + '伤' + (p.coverSoaked > 0 ? '（掩体吸收 ' + p.coverSoaked + '）' : '')));
        });
        var desc = attacker.name + ' 扫射 ' + actualRounds + ' 发（' + difficulty + '，攻击' + ar.level + '）→ '
            + (pool - hitsLeft) + ' 有效命中。' + bits.join('；');
        return {
            totalDamage: totalDamage,
            hits: pool - hitsLeft,
            rounds: actualRounds,
            mode: mode,
            attackRes: ar,
            difficulty: difficulty,
            perTarget: perTarget,
            description: desc
        };
    },

    /**
     * CoC 7e 贯穿规则 — max weapon damage, not a second random roll.
     */
    checkImpale: function(weapon, attackResult) {
        if (!weapon || !attackResult) return { impaled: false };
        if (weapon.impale === false) return { impaled: false };
        var canImpale = weapon.impale === true
            || weapon.type === 'firearm'
            || ['剑', '斧', '矛', '长柄', '刀具'].indexOf(weapon.category) >= 0;
        if (!canImpale) return { impaled: false };
        if (attackResult.level === '极难成功' || attackResult.level === '大成功') {
            var d = (typeof CoCEngine.maxDice === 'function')
                ? CoCEngine.maxDice(weapon.damage || '1D6')
                : CoCEngine.parseDice(weapon.damage || '1D6');
            return { impaled: true, impaleDamage: d, desc: '武器贯穿！造成额外伤害。' };
        }
        return { impaled: false };
    },

    /**
     * CoC 7e: jam if the attack d100 >= malfunction number. 00 means 100.
     */
    malfunctionThreshold: function(weapon) {
        if (!weapon) return 0;
        var raw = weapon.malfunction;
        if (raw == null || raw === '' || raw === '—' || raw === '——') return 0;
        if (raw === '00' || raw === 0 || raw === '0') return 100;
        var n = parseInt(raw, 10);
        if (!Number.isFinite(n) || n <= 0) return 0;
        return n;
    },

    checkMalfunction: function(weapon, attackResult) {
        if (!weapon || weapon.type !== 'firearm' || !attackResult) return { jammed: false };
        var mal = this.malfunctionThreshold(weapon);
        if (!mal) return { jammed: false };
        var roll = Number(attackResult.rolledValue);
        if (!Number.isFinite(roll) || roll <= 0) {
            roll = attackResult.level === '大失败' ? 100 : 0;
        }
        if (roll >= mal) {
            return { jammed: true, desc: '火器故障！' + (weapon.name || '武器') + '卡壳了！' };
        }
        return { jammed: false };
    },

    /**
     * Parse CoC 7e attacks field: 1, "2", "1/N" (one shot every N rounds),
     * "1(3)" / "1 or 2" (that many shots), "全自动" (volley flag; burst_fire fires it).
     */
    parseAttacksRate: function(raw) {
        if (raw == null || raw === '' || raw === '—' || raw === '——') {
            return { shotsPerRound: 1, alternateRound: false, period: 1, volley: false };
        }
        var s = String(raw).trim();
        var every = s.match(/^1\s*\/\s*(\d+)$/);
        if (every) {
            var period = parseInt(every[1], 10);
            if (period > 1) {
                return { shotsPerRound: 1, alternateRound: true, period: period, volley: false };
            }
        }
        var paren = s.match(/\(\s*(\d+)\s*\)/);
        if (paren) {
            var parenShots = parseInt(paren[1], 10);
            if (parenShots > 0) {
                return { shotsPerRound: Math.min(30, parenShots), alternateRound: false, period: 1, volley: false };
            }
        }
        var orN = s.match(/(?:or|或)\s*(\d+)/i);
        if (orN) {
            var orShots = parseInt(orN[1], 10);
            if (orShots > 0) {
                return { shotsPerRound: Math.min(30, orShots), alternateRound: false, period: 1, volley: /全自动/.test(s) };
            }
        }
        if (/全自动/.test(s)) {
            return { shotsPerRound: 1, alternateRound: false, period: 1, volley: true };
        }
        var n = parseInt(s, 10);
        if (!Number.isFinite(n) || n < 1) n = 1;
        return { shotsPerRound: Math.min(30, n), alternateRound: false, period: 1, volley: false };
    },

    /** Gate fire rate / alternate-round cooldown before spending ammo. */
    checkFireRate: function(ch, weapon) {
        if (!ch) return { ok: false, desc: '找不到射击者。' };
        var st = ch.status || (ch.status = {});
        if (st.weaponJammed) {
            return { ok: false, reason: 'jammed', desc: (ch.name || '目标') + ' 的武器卡壳，须先排除故障。' };
        }
        if (st.altFireBlocked) {
            var period = st.altFirePeriod || 2;
            return { ok: false, reason: 'alt_rate', desc: (ch.name || '目标') + ' 的武器射速为 1/' + period + '，本轮无法开火。' };
        }
        var rate = this.parseAttacksRate(weapon && weapon.attacks);
        var used = Math.max(0, Number(st.firearmShotsUsed) || 0);
        if (used >= rate.shotsPerRound) {
            return { ok: false, reason: 'rate', desc: (ch.name || '目标') + ' 本轮射击次数已用尽（射速 ' + rate.shotsPerRound + '）。' };
        }
        return { ok: true, rate: rate, remaining: rate.shotsPerRound - used };
    },

    spendFireRate: function(ch, weapon, shots) {
        if (!ch) return { ok: false };
        var st = ch.status || (ch.status = {});
        var rate = this.parseAttacksRate(weapon && weapon.attacks);
        var n = Math.max(1, Number(shots) || 1);
        st.firearmShotsUsed = Math.max(0, Number(st.firearmShotsUsed) || 0) + n;
        if (rate.alternateRound) {
            st.altFirePeriod = rate.period || 2;
            if (st.altFirePeriod <= 2) st.altFirePendingBlock = true;
            else st.altFireCooldown = st.altFirePeriod - 1;
        }
        return { ok: true, used: st.firearmShotsUsed, rate: rate };
    },

    markWeaponJammed: function(ch, weapon) {
        if (!ch) return { ok: false };
        var st = ch.status || (ch.status = {});
        st.weaponJammed = true;
        if (weapon && weapon.name) st.jammedWeapon = weapon.name;
        return { ok: true, desc: '火器故障！' + ((weapon && weapon.name) || '武器') + '卡壳了！' };
    },

    clearWeaponJam: function(ch) {
        if (!ch) return { ok: false, desc: '无目标' };
        var st = ch.status || (ch.status = {});
        if (!st.weaponJammed) return { ok: false, desc: (ch.name || '目标') + ' 的武器并未卡壳。' };
        delete st.weaponJammed;
        delete st.jammedWeapon;
        return { ok: true, desc: (ch.name || '目标') + ' 排除了武器故障。' };
    },

    /**
     * Cover soak channel (separate from personal armor; ballistics ignore worn armor).
     * cover may be 'soft'|'hard'|true|{ kind, armor, hp }.
     */
    normalizeCover: function(cover) {
        if (!cover) return null;
        if (typeof cover === 'object' && cover.kind) {
            var kind = cover.kind === 'hard' ? 'hard' : 'soft';
            var defaults = kind === 'hard' ? { armor: 5, hp: 15 } : { armor: 2, hp: 8 };
            return {
                kind: kind,
                armor: cover.armor != null ? Number(cover.armor) : defaults.armor,
                hp: cover.hp != null ? Number(cover.hp) : defaults.hp,
                maxHp: cover.maxHp != null ? Number(cover.maxHp) : (cover.hp != null ? Number(cover.hp) : defaults.hp)
            };
        }
        if (cover === 'hard') return { kind: 'hard', armor: 5, hp: 15, maxHp: 15 };
        if (cover === 'soft' || cover === true) return { kind: 'soft', armor: 2, hp: 8, maxHp: 8 };
        return null;
    },

    applyCoverSoak: function(rawDamage, cover) {
        var state = this.normalizeCover(cover);
        var dmg = Math.max(0, Number(rawDamage) || 0);
        if (!state || dmg <= 0) {
            return { damageToTarget: dmg, cover: state, soaked: 0, destroyed: false };
        }
        var afterArmor = Math.max(0, dmg - (Number(state.armor) || 0));
        var absorbed = Math.min(afterArmor, Math.max(0, Number(state.hp) || 0));
        state.hp = Math.max(0, (Number(state.hp) || 0) - absorbed);
        var toTarget = afterArmor - absorbed;
        var destroyed = state.hp <= 0;
        return {
            damageToTarget: toTarget,
            cover: destroyed ? null : state,
            soaked: absorbed,
            destroyed: destroyed,
            desc: destroyed
                ? '掩体被打穿！'
                : ('掩体吸收 ' + absorbed + ' 点伤害（剩余耐久 ' + state.hp + '）。')
        };
    },

    /**
     * Fighting maneuvers: disarm | grapple | shove | knockdown | break_free
     * Opposed Fighting (斗殴) with Build difference (7e).
     */
    resolveManeuver: function(attacker, defender, kind, options) {
        options = options || {};
        const Sit = CoCEngine.SituationalEngine;
        const buildMods = Sit ? Sit.maneuverBuildMods(attacker, defender) : { auto: null, bonusDice: 0, penaltyDice: 0, diff: 0, notes: [] };
        if (buildMods.auto === 'fail') {
            return { success: false, auto: true, kind, msg: `${attacker.name} 的战技失败：体格差距过大（${buildMods.diff}）。`, buildMods };
        }
        if (buildMods.auto === 'success') {
            return this._applyManeuverEffect(attacker, defender, kind, {
                success: true, auto: true, level: '成功', buildMods,
                msg: `${attacker.name} 以体格优势完成战技「${kind}」。`
            });
        }
        const usePre = (pre, roll) => (pre && typeof pre.success === 'boolean') ? pre : roll();
        const atkOpts = {
            bonusDice: (options.bonusDice || 0) + (buildMods.bonusDice || 0),
            penaltyDice: (options.penaltyDice || 0) + (buildMods.penaltyDice || 0)
        };
        const attackRes = usePre(options.preRolledAttack, () => CoCEngine.checkSkill(options.skill || '斗殴', attacker, options.difficulty || 'normal', atkOpts));
        const defenseRes = usePre(options.preRolledDefense, () => CoCEngine.checkSkill(options.defendSkill || '斗殴', defender, 'normal'));
        let success = false;
        if (buildMods.auto === 'success') success = true;
        else if (attackRes.success && (!defenseRes.success || this.compareSuccess(attackRes.level, defenseRes.level) > 0)) {
            success = true;
        } else if (attackRes.success && defenseRes.success && this.compareSuccess(attackRes.level, defenseRes.level) === 0) {
            const aBuild = Sit ? Sit.buildOf(attacker) : 0;
            const dBuild = Sit ? Sit.buildOf(defender) : 0;
            success = aBuild >= dBuild;
        }
        const base = {
            success, kind, attackRes, defenseRes, buildMods,
            msg: success
                ? `${attacker.name} 战技「${kind}」成功。`
                : `${attacker.name} 战技「${kind}」被化解。`
        };
        return success ? this._applyManeuverEffect(attacker, defender, kind, base) : base;
    },

    _applyManeuverEffect: function(attacker, defender, kind, result) {
        if (!defender.status) defender.status = {};
        if (!attacker.status) attacker.status = {};
        if (kind === 'disarm') {
            defender.status.disarmed = true;
            if (defender.equippedWeapon) {
                defender.status.droppedWeapon = defender.equippedWeapon;
                defender.equippedWeapon = null;
            }
            result.msg += ` ${defender.name} 被缴械。`;
        } else if (kind === 'grapple') {
            defender.status.grappled = { by: attacker.name, build: (CoCEngine.SituationalEngine && CoCEngine.SituationalEngine.buildOf(attacker)) || 0 };
            attacker.status.grappling = { target: defender.name, build: (CoCEngine.SituationalEngine && CoCEngine.SituationalEngine.buildOf(defender)) || 0 };
            result.msg += ` ${defender.name} 被擒抱。`;
        } else if (kind === 'break_free') {
            delete attacker.status.grappled;
            if (defender.status.grappling && defender.status.grappling.target === attacker.name) delete defender.status.grappling;
            result.msg += ` ${attacker.name} 挣脱擒抱。`;
        } else if (kind === 'shove' || kind === 'knockdown') {
            defender.status.prone = true;
            result.msg += ` ${defender.name} 被推倒。`;
        }
        return result;
    },

    autoResolveExchange: function(attacker, defender, weapon, callbacks, options) {
        options = options || {};
        callbacks = callbacks || {};
        if (!options.skipSituation && CoCEngine.SituationalEngine && weapon) {
            const sit = CoCEngine.SituationalEngine.resolve({
                attacker, defender, weapon,
                distance: options.distance,
                pointBlank: options.pointBlank,
                situation: options.situation,
                ranged: weapon.type === 'firearm' || weapon.type === 'ranged'
            });
            if (sit.damageExpr) {
                weapon = Object.assign({}, weapon, { damage: sit.damageExpr });
                options = Object.assign({}, options, { damageIncludesDb: true });
            }
            options = Object.assign({}, options, {
                bonusDice: (options.bonusDice || 0) + (sit.bonusDice || 0),
                penaltyDice: (options.penaltyDice || 0) + (sit.penaltyDice || 0),
                difficulty: options.difficulty || sit.difficulty || 'normal',
                situationNotes: sit.notes
            });
        }
        if (options.preRolledAttack) {
            var earlyMal = this.checkMalfunction(weapon, options.preRolledAttack);
            if (earlyMal.jammed) {
                this.markWeaponJammed(attacker, weapon);
                return { winner: 'defender', damage: 0, msg: earlyMal.desc, res: options.preRolledAttack, jammed: true };
            }
        }
        const result = this.resolveCombatExchange(attacker, defender, Object.assign({ weapon: weapon }, options));
        if (!options.preRolledAttack) {
            var mal = this.checkMalfunction(weapon, result.res);
            if (mal.jammed) {
                this.markWeaponJammed(attacker, weapon);
                result.msg = mal.desc;
                result.damage = 0;
                result.winner = 'defender';
                result.jammed = true;
                return result;
            }
        }
        let damage = result.damage;
        const armorIgnore = options.armorOverride === 'ignore'
            || (options.situation && options.situation.armorOverride === 'ignore');
        const wornArmor = armorIgnore ? 0 : armorRating(defender, {
            ranged: weapon && (weapon.type === 'firearm' || weapon.type === 'ranged'),
            head: !!(options.situation && options.situation.head)
        });
        if (result.winner === 'attacker' && damage > 0 && result.res) {
            const impale = this.checkImpale(weapon, result.res);
            if (impale.impaled) {
                const rawBase = result.rawDamage || damage;
                const ballistic = weapon && (weapon.type === 'firearm' || weapon.type === 'ranged');
                damage = Math.max(0, rawBase + (impale.impaleDamage || 0) - wornArmor);
                result.msg += ` ${impale.desc}（额外 ${impale.impaleDamage} 伤）`;
                result.damage = damage;
                if (!result.knockback) this._withKnockback(result, defender, damage);
            }
        }
        const ballisticHit = weapon && (weapon.type === 'firearm' || weapon.type === 'ranged');
        if (result.winner === 'attacker' && damage > 0 && ballisticHit) {
            const sit = options.situation || {};
            // Soak applies to the defender's cover only (targetCover / coverDetail / cover).
            const coverSrc = sit.targetCover || sit.coverDetail || sit.cover;
            if (coverSrc) {
                // 7e p.113: the shot strikes the cover first; worn armor only stops what gets through.
                const soak = this.applyCoverSoak(damage + wornArmor, coverSrc);
                damage = Math.max(0, soak.damageToTarget - wornArmor);
                result.damage = damage;
                result.coverSoak = soak;
                if (soak.soaked > 0 || soak.destroyed) result.msg += ' ' + soak.desc;
                if (options.onCoverUpdate && typeof options.onCoverUpdate === 'function') {
                    options.onCoverUpdate(soak.cover, soak);
                }
            }
        }
        if (defender && defender.physicalImmune && !options.magical && result.winner === 'attacker') {
            damage = 0;
            result.damage = 0;
            if (result.msg && result.msg.indexOf('物理攻击无效') < 0) result.msg += ' 物理攻击无效。';
        }
        if (result.winner === 'attacker' && damage > 0) {
            if (defender.isEnemy && callbacks.updateEnemy) {
                callbacks.updateEnemy(defender.name, -damage, result.msg);
            } else if (callbacks.update_character_status) {
                callbacks.update_character_status({ target_name: defender.name, hp_change: -damage });
            }
        } else if (result.winner === 'defender' && damage > 0) {
            if (attacker.isEnemy && callbacks.updateEnemy) {
                callbacks.updateEnemy(attacker.name, -damage, result.msg);
            } else if (callbacks.update_character_status) {
                callbacks.update_character_status({ target_name: attacker.name, hp_change: -damage });
            }
        }
        return result;
    }
};
  CoCEngine.resolveManeuver = function(attacker, defender, kind, options) {
      return CoCEngine.CombatEngine.resolveManeuver(attacker, defender, kind, options);
  };
}
