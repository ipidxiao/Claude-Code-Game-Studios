// ESM engine module — source for browser build
// Split from js/engines/dice.js
import { pickPushConsequence } from '../data/push_consequences.mjs';

/** Ceilings for dice expressions (same as the /roll slash command; game data peaks at 15D10). */
const MAX_DICE_COUNT = 100;
const MAX_DICE_SIDES = 1000;
/** CoC 7e: bonus and penalty dice cancel, and the net is never more than two. */
const MAX_NET_BONUS_PENALTY = 2;

export function attachDiceEngine(CoCEngine) {
  CoCEngine._pushPick = pickPushConsequence;
  Object.assign(CoCEngine, {
    _setTestRolls(rolls) {
      CoCEngine._d100TestQueue = Array.isArray(rolls) ? rolls.slice() : null;
    },
    _clearTestRolls() {
      CoCEngine._d100TestQueue = null;
    },
    _rollD100() {
      const q = CoCEngine._d100TestQueue;
      if (q && q.length) return q.shift();
      return Math.floor(Math.random() * 100) + 1;
    },
    /** CoC 7e fumble: skill ≥50 → 96–100; skill <50 → only 100. */
    fumbleThreshold(skillValue) {
      return skillValue < 50 ? 100 : 96;
    },
    /**
     * 基础掷骰函数
     * @param {number} count - 骰子数量
     * @param {number} sides - 骰子面数
     * @returns {number} 掷骰总和
     */
    roll: (count, sides) => {
        const n = Math.min(MAX_DICE_COUNT, Math.max(0, Math.floor(Number(count) || 0)));
        const s = Math.min(MAX_DICE_SIDES, Math.max(0, Math.floor(Number(sides) || 0)));
        if (!n || !s) return 0;
        let total = 0; for (let i = 0; i < n; i++) total += Math.floor(Math.random() * s) + 1; return total;
    },

    /**
     * Parse dice expressions including chained terms (e.g. "1D3+1D4", "2D6+1").
     * Leftover +DB / +DB/2 tokens are ignored (callers should expand via SituationalEngine).
     * @param {string} str
     * @returns {number}
     */
    parseDice: function(str) {
        if (!str || str === "0") return 0;
        const terms = CoCEngine._diceTerms(str);
        if (!terms) return parseInt(String(str), 10) || 0;
        let total = 0;
        for (let i = 0; i < terms.length; i++) {
            const t = terms[i];
            if (t.sides) total += t.sign * this.roll(t.n, t.sides);
            else total += t.sign * t.flat;
        }
        return total;
    },

    /** Maximum value of a dice expression (CoC 7e impale uses max weapon damage). */
    maxDice: function(str) {
        if (!str || str === "0") return 0;
        const terms = CoCEngine._diceTerms(str);
        if (!terms) return parseInt(String(str), 10) || 0;
        let total = 0;
        for (let i = 0; i < terms.length; i++) {
            const t = terms[i];
            if (t.sides) total += t.sign * (t.n * t.sides);
            else total += t.sign * t.flat;
        }
        return total;
    },

    /**
     * Tokenize a CoC damage expression into signed dice / flat terms.
     * @returns {Array<{sign:number,n?:number,sides?:number,flat?:number}>|null}
     */
    _diceTerms: function(str) {
        let s = String(str).toUpperCase().replace(/\s+/g, '');
        s = s.replace(/\+?DB\/2/g, '').replace(/\+?DB/g, '');
        s = s.replace(/\+\+/g, '+').replace(/^\+/, '');
        if (!s || s === '-' || s === '+') return null;
        if (/^[+-]?\d+$/.test(s)) {
            return [{ sign: 1, flat: parseInt(s, 10) || 0 }];
        }
        const terms = [];
        const re = /([+-]?)(?:(\d*)D(\d+)|(\d+))/g;
        let m;
        let consumed = 0;
        while ((m = re.exec(s)) !== null) {
            if (m.index !== consumed) return null;
            consumed = m.index + m[0].length;
            const sign = m[1] === '-' ? -1 : 1;
            if (m[3] != null) {
                // "D6" means one die; an explicit 0 ("0D6") means none. Ceilings keep AI-supplied
                // expressions from freezing the tab (game data peaks at 15D10 / D100).
                const n = m[2] === '' ? 1 : Math.min(MAX_DICE_COUNT, parseInt(m[2], 10) || 0);
                const sides = Math.min(MAX_DICE_SIDES, parseInt(m[3], 10) || 0);
                if (n <= 0 || sides <= 0) terms.push({ sign, flat: 0 }); // 1D0 / 0D6 contribute nothing, never NaN
                else terms.push({ sign, n, sides });
            } else {
                terms.push({ sign, flat: parseInt(m[4], 10) || 0 });
            }
        }
        if (!terms.length || consumed !== s.length) return null;
        return terms;
    },
    /**
     * 执行技能检定
     * @param {string} skillName - 技能名称
     * @param {Object} char - 角色对象
     * @param {string} difficulty - 难度等级 ('normal', 'hard', 'extreme')
     * @returns {Object} 检定结果 { success, level, rolledValue, skillValue, targetValue }
     */
    checkSkill: (skillName, char, difficulty = 'normal', options = {}) => {
        const skillValue = CoCEngine.getSkillValue(char, skillName);
        // CoC 7e bonus/penalty dice: aligned to the authoritative coc.mjs behaviour
        // so the browser no longer silently drops the options passed by system.js.
        let bonusDice = Number(options.bonusDice) || 0;
        let penaltyDice = Number(options.penaltyDice) || 0;
        if (!options.skipStatusMods && char && char.status && char.status.enchantmentBuff) {
            const buff = char.status.enchantmentBuff;
            const add = Number(buff.bonusDice) || 0;
            if (add > 0) {
                const vs = buff.bonusDiceVs;
                if (!Array.isArray(vs) || !vs.length) {
                    bonusDice += add;
                } else {
                    const hay = [
                        options.opponent,
                        options.mythosTarget,
                        options.vs,
                        options.situation,
                        skillName
                    ].filter(Boolean).join(' ');
                    if (vs.some((t) => hay.includes(String(t)))) bonusDice += add;
                }
            }
        }
        if (!options.skipStatusMods && char && CoCEngine.SituationalEngine
            && typeof CoCEngine.SituationalEngine.resolveCheckModifiers === 'function') {
            const sm = CoCEngine.SituationalEngine.resolveCheckModifiers(skillName, char);
            bonusDice += Number(sm.bonusDice) || 0;
            penaltyDice += Number(sm.penaltyDice) || 0;
            if (typeof CoCEngine.SituationalEngine.consumePendingPenalty === 'function') {
                CoCEngine.SituationalEngine.consumePendingPenalty(char);
            }
        }
        let roll;
        // Cancel first, then cap (7e: never more than two). Whole dice only.
        const rawNet = Math.trunc((Number(bonusDice) || 0) - (Number(penaltyDice) || 0));
        const net = Math.max(-MAX_NET_BONUS_PENALTY, Math.min(MAX_NET_BONUS_PENALTY, rawNet));
        if (net > 0) {
            roll = CoCEngine.rollBonusDice(net);
        } else if (net < 0) {
            roll = CoCEngine.rollPenaltyDice(-net);
        } else {
            roll = CoCEngine._rollD100();
        }
        let success = false;
        let level = '失败';
        let targetValue = skillValue;
        if (difficulty === 'hard') {
            targetValue = Math.floor(skillValue / 2);
        } else if (difficulty === 'extreme') {
            targetValue = Math.floor(skillValue / 5);
        }
        if (roll <= targetValue) {
            success = true;
            if (roll === 1) {
                level = '大成功';
            } else if (roll <= Math.floor(skillValue / 5)) {
                level = '极难成功';
            } else if (roll <= Math.floor(skillValue / 2)) {
                level = '困难成功';
            } else {
                level = '成功';
            }
        } else {
            // CoC 7e: skill >= 50 → 96–100 fumble; skill < 50 → only 100
            const fumbleThreshold = CoCEngine.fumbleThreshold(skillValue);
            if (roll >= fumbleThreshold) {
                level = '大失败';
            }
        }
        const canPush = typeof CoCEngine.isPushableSkill === 'function'
            ? CoCEngine.isPushableSkill(skillName)
            : (skillName !== '克苏鲁神话' && skillName !== '运气' && skillName !== '幸运'
                && skillName !== '灵感' && skillName !== '知识'
                && skillName !== 'Idea' && skillName !== 'Know' && skillName !== 'Luck');
        var pushable = !success && level !== '大失败' && canPush;
        return { success, level, rolledValue: roll, skillValue, targetValue, pushable };
    },

    /**
     * Combined rolls: multiple related checks; mode worst|best|all.
     * worst = all must succeed (fail if any fails); best = any success wins.
     */
    checkCombined: function(checks, char, options) {
        options = options || {};
        const mode = options.mode || 'worst';
        const list = Array.isArray(checks) ? checks : [];
        const results = [];
        for (let i = 0; i < list.length; i++) {
            const c = list[i] || {};
            const skill = c.skill || c.skill_name || c.name;
            const diff = c.difficulty || options.difficulty || 'normal';
            const res = CoCEngine.checkSkill(skill, char, diff, {
                bonusDice: c.bonusDice != null ? c.bonusDice : options.bonusDice,
                penaltyDice: c.penaltyDice != null ? c.penaltyDice : options.penaltyDice,
                skipStatusMods: options.skipStatusMods
            });
            results.push(Object.assign({ skill: skill }, res));
        }
        let success = false;
        if (mode === 'best') {
            success = results.some(function(r) { return r.success; });
        } else if (mode === 'all') {
            success = results.length > 0 && results.every(function(r) { return r.success; });
        } else {
            // worst: succeed only if every check succeeds
            success = results.length > 0 && results.every(function(r) { return r.success; });
        }
        const failed = results.filter(function(r) { return !r.success; });
        const level = success
            ? (results.reduce(function(best, r) {
                const rank = { '大成功': 4, '极难成功': 3, '困难成功': 2, '成功': 1 };
                return (rank[r.level] || 0) > (rank[best] || 0) ? r.level : best;
            }, '成功'))
            : (failed[0] && failed[0].level) || '失败';
        return {
            success: success,
            level: level,
            mode: mode,
            results: results,
            desc: (char && char.name ? char.name + ' ' : '') +
                '联合检定（' + mode + '）' + (success ? '通过' : '失败') +
                '：' + results.map(function(r) { return r.skill + '=' + r.level; }).join('，')
        };
    },

    roll3D6x5: function() { return this.roll(3, 6) * 5; },

    roll2D6plus6x5: function() { return (this.roll(2, 6) + 6) * 5; },

    rollBonusDice: function(count) {
        count = count || 1;
        var units = Math.floor(Math.random() * 10);
        var bestTens = Math.floor(Math.random() * 10);
        for (var i = 0; i < count; i++) {
            var t = Math.floor(Math.random() * 10);
            if (t < bestTens) bestTens = t;
        }
        var result = bestTens * 10 + units;
        return result === 0 ? 100 : result;
    },

    rollPenaltyDice: function(count) {
        count = count || 1;
        var units = Math.floor(Math.random() * 10);
        var worstTens = Math.floor(Math.random() * 10);
        for (var i = 0; i < count; i++) {
            var t = Math.floor(Math.random() * 10);
            if (t > worstTens) worstTens = t;
        }
        var result = worstTens * 10 + units;
        return result === 0 ? 100 : result;
    },

    /**
     * CoC 7e 推动检定 (pushed roll) — 以相同难度重新检定；失败附带结构化后果。
     */
    executePushedRoll: function(skillName, char, difficulty) {
        var result = this.checkSkill(skillName, char, difficulty || 'normal');
        result.pushed = true;
        if (!result.success && typeof this.resolvePushedFailure === 'function') {
            result.consequence = this.resolvePushedFailure(char, skillName, result);
        }
        return result;
    },

    resolvePushedFailure: function(char, skillName, rollResult) {
        var isFumble = !!(rollResult && rollResult.level === '大失败');
        var pick = CoCEngine._pushPick || pickPushConsequence;
        var cons = pick(skillName, isFumble);
        if (!char) return cons;
        if (!char.status) char.status = {};
        char.status.pushFail = {
            id: cons.id,
            skill: skillName,
            severity: cons.severity,
            summary: cons.summary,
            fumble: !!isFumble,
            at: Date.now()
        };
        if (cons.status) {
            Object.keys(cons.status).forEach(function(k) {
                char.status[k] = cons.status[k];
            });
        }
        if (cons.damage && CoCEngine.MajorWoundEngine && typeof CoCEngine.MajorWoundEngine.dealDamage === 'function') {
            var dmg = CoCEngine.parseDice(cons.damage);
            cons.appliedDamage = dmg;
            CoCEngine.MajorWoundEngine.dealDamage(char, dmg);
        }
        if (cons.sanLoss && CoCEngine.SanityEngine && typeof CoCEngine.SanityEngine.applySanCheckResult === 'function') {
            cons.sanResult = CoCEngine.SanityEngine.applySanCheckResult(char, false, cons.sanLoss, '推动失败', null);
        }
        cons.desc = (char.name || '调查员') + ' 推动【' + skillName + '】失败' + (isFumble ? '（大失败）' : '') + '：' + cons.summary
            + (cons.appliedDamage ? '（伤害 ' + cons.appliedDamage + '）' : '');
        return cons;
    },

    /** Keep derived.luck mirrored to attrs.LUCK (UI often reads derived). */
    _syncDerivedLuck: function(char) {
        if (!char) return;
        if (!char.attrs) char.attrs = {};
        if (!char.derived) char.derived = {};
        if (char.attrs.LUCK == null && char.derived.luck != null) {
            char.attrs.LUCK = Number(char.derived.luck) || 0;
        }
        var n = Number(char.attrs.LUCK);
        char.attrs.LUCK = Number.isFinite(n) ? n : 0;
        char.derived.luck = char.attrs.LUCK;
    },

    /**
     * CoC 7e 运气消费机制 — 玩家可用运气点数调整检定结果 (1:1 消费)
     * @param {Object} char - 角色对象
     * @param {number} amount - 希望消费的运气点数
     * @returns {Object} { success, spent, remainingLuck, message }
     */
    spendLuck: function(char, amount) {
        this._syncDerivedLuck(char);
        var luck = (char.attrs && char.attrs.LUCK != null) ? char.attrs.LUCK : 0;
        var spent = Math.max(0, Math.min(Number(amount) || 0, luck));
        if (spent <= 0) return { success: false, spent: 0, remainingLuck: luck, message: '运气不足或消费无效。' };
        char.attrs.LUCK = luck - spent;
        this._syncDerivedLuck(char);
        return { success: true, spent: spent, remainingLuck: char.attrs.LUCK,
            message: char.name + ' 消费了 ' + spent + ' 点运气！（剩余 ' + char.attrs.LUCK + '）' };
    },

    /**
     * Bind Luck to a finished d100 check: spend 1 Luck per 1 point to lower the roll
     * until it reaches a desired success band (or just enough to succeed).
     * targetLevel: '成功'|'困难成功'|'极难成功'|'大成功' (default 成功)
     */
    spendLuckOnCheck: function(char, rollMeta, targetLevel) {
        if (!char || !rollMeta) {
            return { success: false, spent: 0, message: '无检定可调整。' };
        }
        var skillValue = Number(rollMeta.skillValue != null ? rollMeta.skillValue : rollMeta.targetValue) || 0;
        if (rollMeta.difficulty === 'hard') {
            // targetValue already hard; skillValue should be full skill if provided
        }
        var fullSkill = Number(rollMeta.skillValue) || skillValue;
        if (rollMeta.difficulty === 'hard' && rollMeta.targetValue != null && fullSkill === rollMeta.targetValue) {
            fullSkill = rollMeta.targetValue * 2;
        }
        if (rollMeta.difficulty === 'extreme' && rollMeta.targetValue != null && fullSkill === rollMeta.targetValue) {
            fullSkill = rollMeta.targetValue * 5;
        }
        if (!Number.isFinite(fullSkill) || fullSkill <= 0) fullSkill = skillValue;

        var want = targetLevel || '成功';
        var wantKey = String(want).toLowerCase().replace(/\s+/g, '_');
        var wantMap = {
            success: '成功', '成功': '成功',
            hard: '困难成功', hard_success: '困难成功', '困难成功': '困难成功', '困难': '困难成功',
            extreme: '极难成功', extreme_success: '极难成功', '极难成功': '极难成功', '极难': '极难成功',
            critical: '大成功', crit: '大成功', '大成功': '大成功'
        };
        want = wantMap[wantKey] || wantMap[want] || want;
        var needRoll;
        if (want === '大成功') needRoll = 1;
        else if (want === '极难成功') needRoll = Math.max(1, Math.floor(fullSkill / 5));
        else if (want === '困难成功') needRoll = Math.max(1, Math.floor(fullSkill / 2));
        else needRoll = Math.max(1, fullSkill);

        var rolled = Number(rollMeta.rolledValue) || 100;
        if (rolled <= needRoll && rollMeta.success && want === '成功') {
            return { success: false, spent: 0, remainingLuck: (char.attrs && char.attrs.LUCK) || 0, message: '检定已成功，无需花费运气。' };
        }
        if (rolled <= needRoll) {
            // Already at or better than requested band numerically but maybe failed due to difficulty field
            if (rollMeta.success && this._levelRank(rollMeta.level) >= this._levelRank(want)) {
                return { success: false, spent: 0, remainingLuck: (char.attrs && char.attrs.LUCK) || 0, message: '检定等级已达到或超过目标。' };
            }
        }
        var cost = Math.max(0, rolled - needRoll);
        this._syncDerivedLuck(char);
        var luck = (char.attrs && char.attrs.LUCK != null) ? char.attrs.LUCK : 0;
        if (cost <= 0) {
            return { success: false, spent: 0, remainingLuck: luck, message: '无需花费运气即可达到目标。' };
        }
        if (cost > luck) {
            return {
                success: false, spent: 0, remainingLuck: luck, needed: cost,
                message: char.name + ' 运气不足：需要 ' + cost + ' 点才能将 ' + rolled + ' 调整为 ' + needRoll + '（当前 ' + luck + '）。'
            };
        }
        char.attrs.LUCK = luck - cost;
        this._syncDerivedLuck(char);
        var newRoll = needRoll;
        var newLevel = this._levelFromRoll(newRoll, fullSkill);
        var out = {
            success: true,
            spent: cost,
            remainingLuck: char.attrs.LUCK,
            oldRoll: rolled,
            newRoll: newRoll,
            oldLevel: rollMeta.level,
            newLevel: newLevel,
            rollMeta: {
                success: newLevel !== '失败' && newLevel !== '大失败',
                level: newLevel,
                rolledValue: newRoll,
                targetValue: rollMeta.targetValue != null ? rollMeta.targetValue : fullSkill,
                skillValue: fullSkill,
                skill: rollMeta.skill,
                charName: rollMeta.charName || char.name
            },
            message: char.name + ' 花费 ' + cost + ' 点运气，将骰值 ' + rolled + '→' + newRoll + '（' + rollMeta.level + '→' + newLevel + '）。'
        };
        return out;
    },

    _levelRank: function(level) {
        var rank = { '大成功': 4, '极难成功': 3, '困难成功': 2, '成功': 1, '失败': 0, '大失败': -1 };
        return rank[level] || 0;
    },

    _levelFromRoll: function(roll, skillValue) {
        var fumble = this.fumbleThreshold(skillValue);
        if (roll === 1) return '大成功';
        if (roll <= Math.floor(skillValue / 5)) return '极难成功';
        if (roll <= Math.floor(skillValue / 2)) return '困难成功';
        if (roll <= skillValue) return '成功';
        if (roll >= fumble) return '大失败';
        return '失败';
    },

    /**
     * 运气恢复（Keeper奖励或模组结束）
     */
    recoverLuck: function(char, amount) {
        if (!char || !char.attrs) return { recovered: 0 };
        this._syncDerivedLuck(char);
        var rec;
        if (amount != null && amount !== '') {
            rec = Math.max(0, Number(amount) || 0);
        } else {
            var profile = (typeof CoCEngine.getRulesetProfile === 'function')
                ? CoCEngine.getRulesetProfile()
                : null;
            var pulpBonus = (profile && profile.optional && profile.optional.pulpHero)
                ? (Number(profile.optional.luckRecoveryBonus) || 2)
                : 0;
            rec = (Math.floor(Math.random() * 10) + 1) + pulpBonus;
        }
        if (!char.attrs) char.attrs = {};
        var cur = Number(char.attrs.LUCK) || 0;
        var startCap = Number(char.attrs.startingLuck != null ? char.attrs.startingLuck
            : (char.derived && char.derived.startingLuck));
        var cap = Math.min(99, Number.isFinite(startCap) && startCap > 0 ? startCap : 99);
        var next = Math.min(cap, cur + rec);
        var actual = Math.max(0, next - cur);
        char.attrs.LUCK = next;
        this._syncDerivedLuck(char);
        return { recovered: actual, currentLuck: char.attrs.LUCK,
            message: char.name + ' 恢复了 ' + actual + ' 点运气。' };
    }
});
}
