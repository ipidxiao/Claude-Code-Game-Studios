// ESM engine module — source for browser build
// Split from js/engines/wound.js
import { CoCInjuryTables } from '../data/injury_tables.mjs';

export function attachMajorWoundEngine(CoCEngine) {
  CoCEngine.MajorWoundEngine = {
    _table: function() { return (CoCInjuryTables || {}).HIT_LOCATION || {}; },

    /**
     * 检查是否触发重伤: 单次伤害 >= maxHP/2
     */
    checkMajorWound: function(ch, damage) {
        if (!ch || !ch.derived) return null;
        var maxHp = typeof CoCEngine.maxHp === 'function' ? CoCEngine.maxHp(ch) : (ch.derived.maxHp || ch.derived.hp);
        if (!maxHp || damage < maxHp / 2) return null;
        var roll = Math.floor(Math.random() * 20) + 1;
        var loc = this._table()[roll] || { location: '躯干', area: 'torso', consequences: [], conCheck: false, desc: '受到严重伤害。' };
        return { isMajor: true, location: loc, roll: roll, damage: damage, description: loc.desc };
    },

    /**
     * 应用重伤后果
     */
    applyMajorWound: function(ch, wound) {
        if (!ch || !wound) return wound;
        if (!ch.status) ch.status = {};
        ch.status.hasMajorWound = true;
        if (!ch.status.wounds) ch.status.wounds = [];
        ch.status.wounds.push(wound);
        // Consciousness is a percentile CON check on the dice panel, not a silent CON×5 roll.
        wound.needsConsciousnessCheck = true;
        var cqs = (wound.location && wound.location.consequences) || [];
        if (cqs.includes('武器掉落')) {
            var dropped = '';
            if (typeof CoCEngine.equippedWeaponLabel === 'function') {
                dropped = CoCEngine.equippedWeaponLabel(ch) || '';
            }
            if (!dropped && ch.equipment) {
                var eq = ch.equipment;
                var labelOf = function(v) {
                    if (!v) return '';
                    return typeof v === 'string' ? v : (v.name || v.label || '');
                };
                dropped = labelOf(eq.primary) || labelOf(eq.secondary) || labelOf(eq.melee) || labelOf(eq.weapon) || '';
            }
            if (dropped && ch.equipment) {
                wound.droppedWeapon = dropped;
                ch.equipment.weapon = null;
                ch.equipment.primary = null;
                ch.equipment.secondary = null;
                ch.equipment.melee = null;
            }
        }
        // status.prone is the key read by situational / shot bonus dice and standUp.
        if (cqs.includes('倒地')) { wound.prone = true; ch.status.prone = true; }
        if (cqs.some(function(c) { return c.includes('内出血'); })) {
            wound.bleeding = true;
            if (CoCEngine.applyCondition) {
                CoCEngine.applyCondition(ch, 'bleeding', { perRound: 1, source: 'major_wound' });
            } else {
                if (!ch.status.bleeding) ch.status.bleeding = { perRound: 1, source: 'major_wound' };
            }
        }
        // Halving is a one-time location effect — a second wound must not quarter the attribute.
        if (!ch.status.attrHalved) ch.status.attrHalved = {};
        var halved = ch.status.attrHalved;
        if (cqs.some(function(c) { return c.includes('力量减半'); }) && !halved.STR) {
            if (ch.attrs && ch.attrs.STR) { ch.attrs.STR = Math.floor(ch.attrs.STR / 2); halved.STR = true; }
        }
        if (cqs.some(function(c) { return c.includes('敏捷减半'); }) && !halved.DEX) {
            if (ch.attrs && ch.attrs.DEX) { ch.attrs.DEX = Math.floor(ch.attrs.DEX / 2); halved.DEX = true; }
        }
        if (cqs.some(function(c) { return c.includes('体质减半'); }) && !halved.CON) {
            if (ch.attrs && ch.attrs.CON) { ch.attrs.CON = Math.floor(ch.attrs.CON / 2); halved.CON = true; }
        }
        if (cqs.some(function(c) { return c.includes('APP归零'); })) {
            if (ch.attrs && ch.attrs.APP != null) ch.attrs.APP = 0;
        }
        return wound;
    },

    /**
     * Deal HP damage via applyDamage (single HP write) and return CoC 7e follow-up flags.
     */
    dealDamage: function(ch, amount) {
        var damage = Math.max(0, Math.floor(Number(amount) || 0));
        if (!ch) return { damage: 0, hp: 0, maxHp: 0, majorWound: false, dying: false, unconscious: false, needsConsciousnessCheck: false };
        if (typeof CoCEngine.syncHp === 'function') CoCEngine.syncHp(ch);
        if (CoCEngine.HealingEngine && typeof CoCEngine.HealingEngine.recordInjury === 'function') {
            CoCEngine.HealingEngine.recordInjury(ch, { damage: damage });
        }
        var r = CoCEngine.applyDamage
            ? CoCEngine.applyDamage(ch, damage, { type: 'combat' })
            : { newHp: 0, damageDealt: damage, majorWound: null, dying: null, unconscious: false };
        if (typeof CoCEngine.syncHp === 'function') CoCEngine.syncHp(ch);
        var maxHp = typeof CoCEngine.maxHp === 'function' ? CoCEngine.maxHp(ch) : ((ch.derived && ch.derived.maxHp) || 0);
        var hp = r.newHp;
        var majorWound = !!r.majorWound;
        var dying = !!r.dying || !!(ch.status && ch.status.isDying);
        var unconscious = !!r.unconscious;
        return {
            damage: r.damageDealt,
            hp: hp,
            maxHp: maxHp,
            majorWound: majorWound,
            dying: dying,
            unconscious: unconscious,
            needsConsciousnessCheck: majorWound && hp > 0,
            wound: r.majorWound
        };
    },

    /**
     * 濒死检定: HP <= 0 时对 CON（已是百分数）掷骰，不再 ×5。
     */
    dyingCheck: function(ch, preRolled) {
        if (!ch || !ch.attrs) return { passed: true, roll: 0, target: 0 };
        var con = ch.attrs.CON || 50;
        var target = con;
        var roll, passed, level;
        if (preRolled && typeof preRolled.success === 'boolean') {
            roll = preRolled.rolledValue;
            passed = !!preRolled.success;
            level = preRolled.level;
        } else {
            var res = CoCEngine.checkSkill('体质', ch, 'normal');
            roll = res.rolledValue;
            target = res.targetValue ?? con;
            passed = !!res.success;
            level = res.level;
        }
        return {
            passed: passed, roll: roll, target: target, level: level,
            description: passed ? ch.name + ' 勉强撑住了 (CON检定 ' + roll + '/' + target + ')。'
                : ch.name + ' 的生命之火熄灭了… (CON检定 ' + roll + '/' + target + ' 失败) 💀'
        };
    },

    /**
     * 获得所有活跃重伤列表
     */
    getActiveWounds: function(ch) {
        if (!ch || !ch.status || !ch.status.wounds) return [];
        return ch.status.wounds;
    },

    /**
     * 重伤摘要
     */
    getWoundSummary: function(ch) {
        if (!ch || !ch.status || !ch.status.wounds || !ch.status.wounds.length) return '';
        return ch.status.wounds.map(function(w) { return w.location.location; }).join('、');
    }
};
}
