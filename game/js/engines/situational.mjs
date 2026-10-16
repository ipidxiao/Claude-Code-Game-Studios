/**
 * CoC 7e situational modifiers + weapon damage resolution.
 * Output shape shared by combat / social / chase checks.
 */
import { registerCoreModifierContributors } from '../rules/builtin_buses.mjs';
import { collectModifiers } from '../rules/modifier_bus.mjs';

export function emptyModifier() {
    return {
        bonusDice: 0,
        penaltyDice: 0,
        difficulty: 'normal',
        armorOverride: null,
        damageExpr: null,
        notes: []
    };
}

function clampDice(n) {
    const x = Math.max(0, Number(n) || 0);
    return x > 2 ? 2 : x;
}

function parseRangeBands(rangeRaw) {
    if (rangeRaw == null || rangeRaw === '') return null;
    const nums = String(rangeRaw).match(/\d+/g);
    if (!nums || !nums.length) return null;
    return nums.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Map distance (yards/feet treated as same yard-ish table units) to band vs weapon range.
 * Single-number range: base = base, long = 2x, extreme = 4x (7e firearm bands).
 * Multi-number (shotgun 10/20/50): close/medium/long segments.
 */
export function rangeBandFor(distance, rangeRaw) {
    const dist = Math.max(0, Number(distance) || 0);
    const bands = parseRangeBands(rangeRaw);
    if (!bands) {
        if (dist <= 0) return 'point_blank';
        return 'close';
    }
    if (bands.length >= 3) {
        if (dist <= 0) return 'point_blank';
        if (dist <= bands[0]) return 'close';
        if (dist <= bands[1]) return 'medium';
        if (dist <= bands[2]) return 'long';
        return 'extreme';
    }
    const base = bands[0];
    if (dist <= 0 || dist <= Math.max(3, Math.floor(base * 0.1))) return 'point_blank';
    if (dist <= base) return 'close';
    if (dist <= base * 2) return 'long';
    if (dist <= base * 4) return 'extreme';
    return 'out_of_range';
}

function pickShotgunSegment(damageExpr, band) {
    const parts = String(damageExpr || '').split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) return parts[0] || damageExpr;
    if (band === 'point_blank' || band === 'close') return parts[0];
    if (band === 'medium') return parts[Math.min(1, parts.length - 1)];
    return parts[parts.length - 1];
}

function dbDiceString(db) {
    if (db == null || db === '' || db === 0 || db === '0') return '0';
    return String(db).replace(/\s/g, '');
}

/**
 * Resolve weapon damage expression with DB / half-DB and shotgun range segments.
 */
export function resolveWeaponDamage(damageExpr, opts) {
    opts = opts || {};
    const band = opts.rangeBand || 'close';
    let expr = String(damageExpr || '1D3');
    if (expr.includes('/')) expr = pickShotgunSegment(expr, band);
    expr = expr.replace(/半DB/gi, 'DB/2');
    const db = dbDiceString(opts.db);
    const halfDb = (() => {
        const m = String(db).toUpperCase().match(/^([+-]?)(\d*)D(\d+)([+-]\d+)?$/);
        if (m) {
            const n = Math.max(1, Math.floor((parseInt(m[2], 10) || 1) / 2));
            return `${m[1] || ''}${n}D${m[3]}${m[4] || ''}`;
        }
        const num = Number(db);
        if (Number.isFinite(num)) return String(Math.floor(num / 2));
        return '0';
    })();
    expr = expr.replace(/\+?DB\/2/gi, halfDb === '0' ? '' : (halfDb.startsWith('+') || halfDb.startsWith('-') ? halfDb : `+${halfDb}`));
    expr = expr.replace(/\+?DB/gi, db === '0' ? '' : (String(db).startsWith('+') || String(db).startsWith('-') ? String(db) : `+${db}`));
    expr = expr.replace(/\+燃烧|\+眩晕|\/轮/g, '');
    expr = expr.replace(/\+\+/g, '+').replace(/^\+/, '').replace(/\+$/, '');
    if (!expr) expr = '1D3';
    return { expr, rangeBand: band };
}

const VISUAL_SKILLS = new Set([
    '侦查', '瞄准', '锁匠', '机械维修', '电器维修', '驾驶', '汽车驾驶',
    '手枪', '步枪', '霰弹枪', '冲锋枪', '机枪', '投掷', '炮术'
]);
const AUDITORY_SKILLS = new Set(['聆听']);

/**
 * Unified action gate — status.* / bout* must block illegal actions.
 * @returns {{ ok: boolean, reason?: string, desc?: string, forced?: string }}
 */
export function canAct(ch, action) {
    const act = String(action || 'act');
    if (!ch) return { ok: false, reason: 'no_actor', desc: '找不到行动者。' };
    const st = ch.status || {};
    const hp = (ch.derived && ch.derived.hp != null) ? ch.derived.hp : ch.hp;
    if (st.isDead || hp === 0) {
        return { ok: false, reason: 'dead', desc: (ch.name || '目标') + ' 已死亡，无法行动。' };
    }
    if (ch.insanity && ch.insanity.permanentInsane) {
        return {
            ok: false,
            reason: 'permanent_insane',
            desc: (ch.name || '目标') + ' 已永久疯狂，无法作为调查员行动。'
        };
    }
    if (st.isUnconscious || st.boutFaint) {
        return { ok: false, reason: 'unconscious', desc: (ch.name || '目标') + ' 昏迷/昏厥，无法行动。' };
    }
    if (st.isDying && act !== 'first_aid' && act !== 'rescue') {
        return { ok: false, reason: 'dying', desc: (ch.name || '目标') + ' 濒死，无法主动行动。' };
    }
    if (st.stunned && (st.stunned.roundsLeft == null || st.stunned.roundsLeft > 0)) {
        if (act !== 'stand' && act !== 'break_free') {
            return { ok: false, reason: 'stunned', desc: (ch.name || '目标') + ' 眩晕中，无法行动。' };
        }
    }
    if (st.boutSense === 'paralyzed') {
        return { ok: false, reason: 'paralyzed', desc: (ch.name || '目标') + ' 麻痹，无法行动。' };
    }
    if (st.boutFlee) {
        if (act === 'melee' || act === 'fire' || act === 'cast' || act === 'aim') {
            return {
                ok: false,
                reason: 'bout_flee',
                forced: 'flee',
                desc: (ch.name || '目标') + ' 处于逃跑发作，只能逃离，不能攻击或施法。'
            };
        }
    }
    if (st.boutViolence) {
        if (act === 'cast' || act === 'social' || act === 'aim') {
            return {
                ok: false,
                reason: 'bout_violence',
                forced: 'violence',
                desc: (ch.name || '目标') + ' 处于暴力发作，无法冷静施法或社交。'
            };
        }
    }
    if (st.grappled) {
        if (act === 'move' || act === 'chase' || act === 'fire' || act === 'cast' || act === 'aim' || act === 'dive') {
            return {
                ok: false,
                reason: 'grappled',
                desc: (ch.name || '目标') + ' 被擒抱，无法移动/射击/施法（可尝试挣脱或受限近战）。'
            };
        }
    }
    if (st.weaponJammed && (act === 'fire' || act === 'aim')) {
        return {
            ok: false,
            reason: 'jammed',
            desc: (ch.name || '目标') + ' 的武器卡壳，须先排除故障（reload_weapon）。'
        };
    }
    return { ok: true };
}

export function attachSituationalEngine(CoCEngine) {
    CoCEngine.emptyModifier = emptyModifier;
    CoCEngine.rangeBandFor = rangeBandFor;
    CoCEngine.resolveWeaponDamage = resolveWeaponDamage;
    CoCEngine.canAct = function(ch, action) { return canAct(ch, action); };

    CoCEngine.SituationalEngine = {
        empty: emptyModifier,
        canAct: canAct,

        merge: function(parts) {
            const out = emptyModifier();
            const list = Array.isArray(parts) ? parts : [];
            const rank = { normal: 0, hard: 1, extreme: 2 };
            let diff = 'normal';
            for (let i = 0; i < list.length; i++) {
                const p = list[i] || {};
                out.bonusDice += Number(p.bonusDice) || 0;
                out.penaltyDice += Number(p.penaltyDice) || 0;
                if (p.difficulty && (rank[p.difficulty] || 0) > (rank[diff] || 0)) diff = p.difficulty;
                if (p.armorOverride != null) out.armorOverride = p.armorOverride;
                if (p.damageExpr) out.damageExpr = p.damageExpr;
                if (Array.isArray(p.notes)) out.notes = out.notes.concat(p.notes);
            }
            const net = out.bonusDice - out.penaltyDice;
            out.bonusDice = net > 0 ? clampDice(net) : 0;
            out.penaltyDice = net < 0 ? clampDice(-net) : 0;
            out.difficulty = diff;
            return out;
        },

        /**
         * @param {object} ctx
         * @param {object} [ctx.attacker]
         * @param {object} [ctx.defender]
         * @param {object} [ctx.weapon]
         * @param {number} [ctx.distance]
         * @param {object} [ctx.situation] combat.situation or inline flags
         * @param {boolean} [ctx.pointBlank]
         * @param {boolean} [ctx.ranged]
         */
        resolve: function(ctx) {
            ctx = ctx || {};
            const collected = collectModifiers(ctx);
            const merged = this.merge(collected.parts || []);
            if (collected.damageExpr) merged.damageExpr = collected.damageExpr;
            merged.rangeBand = collected.band;
            return merged;
        },

        /**
         * Skill-check modifiers from sensory afflictions + pending phobia penalty.
         * Does not consume pendingPenalty (checkSkill / resolveSituation consumers do).
         */
        resolveCheckModifiers: function(skillName, ch) {
            const out = emptyModifier();
            if (!ch || !ch.status) return out;
            const st = ch.status;
            const skill = String(skillName || '');
            if (st.boutSense === 'blind' && (VISUAL_SKILLS.has(skill) || /侦查|瞄准|射击|驾驶/.test(skill))) {
                out.penaltyDice += 2;
                out.notes.push('失明');
            }
            if (st.boutSense === 'deaf' && (AUDITORY_SKILLS.has(skill) || skill === '聆听')) {
                out.penaltyDice += 2;
                out.notes.push('失聪');
            }
            if (st.pendingPenalty) {
                out.penaltyDice += Number(st.pendingPenalty.penaltyDice) || 1;
                out.notes.push('恐惧症/狂躁触发');
            }
            // Deprivation stages record penaltyDice — apply the worse of hunger / thirst.
            const hungerPen = Number(st.hunger && st.hunger.penaltyDice) || 0;
            const thirstPen = Number(st.thirst && st.thirst.penaltyDice) || 0;
            const deprivePen = Math.max(hungerPen, thirstPen);
            if (deprivePen > 0) {
                out.penaltyDice += deprivePen;
                out.notes.push(hungerPen >= thirstPen ? '饥饿' : '脱水');
            }
            return out;
        },

        /** Consume one-shot pendingPenalty after it has been applied to a roll. */
        consumePendingPenalty: function(ch) {
            if (ch && ch.status && ch.status.pendingPenalty) {
                delete ch.status.pendingPenalty;
                return true;
            }
            return false;
        },

        /** Build difference helpers for fighting maneuvers (7e). */
        buildOf: function(ch) {
            if (!ch) return 0;
            const raw = (ch.derived && ch.derived.build != null) ? ch.derived.build : ch.build;
            const n = Number(raw);
            return Number.isFinite(n) ? n : 0;
        },

        maneuverBuildMods: function(attacker, defender) {
            const a = this.buildOf(attacker);
            const d = this.buildOf(defender);
            const diff = a - d;
            if (diff >= 3) return { auto: 'success', bonusDice: 0, penaltyDice: 0, diff, notes: [`体格差+${diff}自动成功`] };
            if (diff <= -3) return { auto: 'fail', bonusDice: 0, penaltyDice: 0, diff, notes: [`体格差${diff}自动失败`] };
            if (diff === 2) return { auto: null, bonusDice: 1, penaltyDice: 0, diff, notes: ['体格+2奖励骰'] };
            if (diff === 1) return { auto: null, bonusDice: 0, penaltyDice: 0, diff, notes: ['体格+1'] };
            if (diff === -1) return { auto: null, bonusDice: 0, penaltyDice: 1, diff, notes: ['体格-1惩罚骰'] };
            if (diff === -2) return { auto: null, bonusDice: 0, penaltyDice: 2, diff, notes: ['体格-2惩罚骰'] };
            return { auto: null, bonusDice: 0, penaltyDice: 0, diff, notes: [] };
        }
    };

    /** Facade */
    CoCEngine.resolveSituation = function(ctx) {
        return CoCEngine.SituationalEngine.resolve(ctx);
    };

    registerCoreModifierContributors(CoCEngine, {
        rangeBandFor: rangeBandFor,
        resolveWeaponDamage: resolveWeaponDamage,
        resolveCheckModifiers: function(skillName, ch) {
            return CoCEngine.SituationalEngine.resolveCheckModifiers(skillName, ch);
        }
    });
}
