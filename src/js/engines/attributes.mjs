// ESM engine module — source for browser build
// Split from js/engines/attributes.js

/** DB / build / MOV from STR+SIZ and DEX. Same bands as calculateDerived; no HP. */
export function bodyStatsFromAttrs(attrs) {
    const str = Number(attrs && attrs.STR) || 0;
    const siz = Number(attrs && attrs.SIZ) || 0;
    const dex = Number(attrs && attrs.DEX) || 0;
    const strSiz = str + siz;
    let db = '0';
    let build = 0;
    if (strSiz <= 64) { db = '-2'; build = -2; }
    else if (strSiz <= 84) { db = '-1'; build = -1; }
    else if (strSiz <= 124) { db = '0'; build = 0; }
    else if (strSiz <= 164) { db = '1D4'; build = 1; }
    else if (strSiz <= 204) { db = '1D6'; build = 2; }
    else if (strSiz <= 284) { db = '2D6'; build = 3; }
    else if (strSiz <= 364) { db = '3D6'; build = 4; }
    else { build = Math.floor((strSiz - 365) / 80) + 5; db = `${build - 1}D6`; }
    let mov = 8;
    if (dex < siz && str < siz) mov = 7;
    else if (dex > siz && str > siz) mov = 9;
    return { db, build, mov };
}

export function attachAttributesEngine(CoCEngine) {
  Object.assign(CoCEngine, {
    /**
     * 应用年龄修正
     * @param {Object} attrs - 原始属性
     * @param {number} age - 年龄
     * @returns {Object} 修正后的属性
     */
    applyAgeModifiers: function(attrs, age) {
        let newAttrs = JSON.parse(JSON.stringify(attrs));
        if (!age || age < 15) return newAttrs;
        // CoC 7e official age modifier table
        if (age >= 15 && age <= 19) {
            newAttrs.STR -= 5; newAttrs.EDU -= 5;
            // LUCK is rolled independently in CoC 7e (3D6×5), not age-modified
        } else if (age >= 20 && age <= 39) {
            // No modifiers — EDU improvement only via skill points
        } else if (age >= 40 && age <= 49) {
            newAttrs.STR -= 5; newAttrs.CON -= 5; newAttrs.DEX -= 5;
            newAttrs.APP -= 5; newAttrs.EDU = Math.min(99, newAttrs.EDU + 5);
        } else if (age >= 50 && age <= 59) {
            newAttrs.STR -= 10; newAttrs.CON -= 10; newAttrs.DEX -= 10;
            newAttrs.APP -= 10; newAttrs.EDU = Math.min(99, newAttrs.EDU + 10);
        } else if (age >= 60 && age <= 69) {
            newAttrs.STR -= 20; newAttrs.CON -= 20; newAttrs.DEX -= 20;
            newAttrs.APP -= 15; newAttrs.EDU = Math.min(99, newAttrs.EDU + 15);
        } else if (age >= 70 && age <= 79) {
            newAttrs.STR -= 40; newAttrs.CON -= 40; newAttrs.DEX -= 40;
            newAttrs.APP -= 20; newAttrs.EDU = Math.min(99, newAttrs.EDU + 20);
        } else if (age >= 80) {
            newAttrs.STR -= 80; newAttrs.CON -= 80; newAttrs.DEX -= 80;
            newAttrs.APP -= 25; newAttrs.EDU = Math.min(99, newAttrs.EDU + 25);
        }
        // Clamp to minimum 15 (except LUCK)
        for (let key in newAttrs) {
            if (newAttrs[key] < 15 && key !== 'LUCK' && newAttrs[key] !== 0) newAttrs[key] = 15;
        }
        return newAttrs;
    },

    /**
     * 计算衍生属性 (HP, MP, SAN, DB, Build, MOV)
     * @param {Object} attrs - 基础属性
     * @returns {Object} 衍生属性
     */
    calculateDerived: function(attrs, age) {
        const body = bodyStatsFromAttrs(attrs);
        let hp = Math.floor((attrs.CON + attrs.SIZ) / 10);
        const profile = (typeof CoCEngine.getRulesetProfile === 'function')
            ? CoCEngine.getRulesetProfile()
            : null;
        if (profile && profile.optional && profile.optional.pulpHero) {
            hp += Number(profile.optional.hpBonus) || 3;
        }
        let mp = Math.floor(attrs.POW / 5);
        let san = attrs.POW;
        let db = body.db;
        let build = body.build;
        let mov = body.mov;
        // Age-based MOV penalty (CoC 7e)
        if (age >= 40 && age <= 49) mov = Math.max(1, mov - 1);
        else if (age >= 50 && age <= 59) mov = Math.max(1, mov - 2);
        else if (age >= 60 && age <= 69) mov = Math.max(1, mov - 3);
        else if (age >= 70 && age <= 79) mov = Math.max(1, mov - 4);
        else if (age >= 80) mov = Math.max(1, mov - 5);
        return { hp, mp, san, db, build, mov, maxHp: hp, maxSan: san };
    },

    /**
     * Current HP. Prefer character.hp; derived.hp is current only after syncHp.
     */
    currentHp: function(ch) {
        if (!ch) return 0;
        if (typeof ch.hp === 'number') return ch.hp;
        var d = ch.derived || {};
        if (typeof d.maxHp === 'number' && typeof d.hp === 'number') return d.hp;
        if (typeof d.hp === 'number') return d.hp;
        return 0;
    },

    /**
     * Maximum HP. Never treat derived.hp as max when maxHp is already set.
     * Legacy: derived.hp > character.hp meant derived.hp was the cap.
     */
    maxHp: function(ch) {
        if (!ch) return 0;
        var d = ch.derived || {};
        if (typeof d.maxHp === 'number' && d.maxHp > 0) return d.maxHp;
        var derivedHp = d.hp;
        var hp = typeof ch.hp === 'number' ? ch.hp : null;
        if (typeof derivedHp === 'number' && hp != null && derivedHp > hp) return derivedHp;
        var attrs = ch.attrs;
        if (attrs && attrs.CON != null && attrs.SIZ != null) {
            return Math.floor((attrs.CON + attrs.SIZ) / 10);
        }
        if (typeof derivedHp === 'number' && derivedHp > 0) return derivedHp;
        if (hp != null) return hp;
        return 0;
    },

    /**
     * Write the canonical pair: character.hp = current, derived.maxHp = max,
     * derived.hp = current (same as character.hp).
     */
    syncHp: function(ch) {
        if (!ch) return { hp: 0, maxHp: 0 };
        if (!ch.derived) ch.derived = {};
        var maxHp = CoCEngine.maxHp(ch);
        var hp = CoCEngine.currentHp(ch);
        if (maxHp < hp) maxHp = hp;
        hp = Math.max(0, hp);
        ch.derived.maxHp = maxHp;
        ch.hp = hp;
        ch.derived.hp = hp;
        return { hp: hp, maxHp: maxHp };
    },

    /**
     * 属性评语生成器 (Vue 渲染依赖)
     */
    getAttrEvaluation: function(val) {
        if (val === 0) return "未知";
        if (val <= 15) return "孱弱";
        if (val <= 39) return "较差";
        if (val <= 59) return "普通";
        if (val <= 79) return "良好";
        if (val <= 89) return "极佳";
        return "人类顶尖";
    }
});
}
