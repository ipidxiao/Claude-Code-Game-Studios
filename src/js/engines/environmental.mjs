// ESM engine module — source for browser build
// Split from js/engines/environmental.js

export function attachEnvironmentalEngine(CoCEngine) {
  CoCEngine.EnvironmentalEngine = {
    fallDamage: function(feet, jumper, preRolled) {
        var dice = Math.floor(feet / 10);
        if (dice <= 0) return { damage: 0, desc: '安全落地。' };
        var dmg = CoCEngine.parseDice(dice + 'D6');
        var jumpRes = (preRolled && typeof preRolled.success === 'boolean')
            ? preRolled
            : (jumper ? CoCEngine.checkSkill('跳跃', jumper, 'normal') : { success: false });
        var reduced = jumpRes.success ? Math.floor(dmg / 2) : dmg;
        return {
            damage: reduced, rawDamage: dmg, reduced: reduced < dmg,
            jumpSuccess: !!jumpRes.success,
            desc: '从' + feet + '英尺坠落！造成' + reduced + '点伤害。' + (jumpRes.success ? '（跳跃减伤）' : '')
        };
    },
    fireDamage: function(intensity) {
        intensity = intensity || 'moderate';
        var tiers = { minor:'1D3', moderate:'1D6', severe:'2D6', inferno:'3D6' };
        return { damage: CoCEngine.parseDice(tiers[intensity]||'1D6'), intensity: intensity };
    },
    drowning: function(victim, round, preRolled) {
        var con = (victim && victim.attrs && victim.attrs.CON) || 50;
        var conRounds = Math.floor(con / 2);
        if (round <= conRounds) return { damage: 0, held: true };
        var sk = (preRolled && typeof preRolled.success === 'boolean')
            ? preRolled
            : (victim ? CoCEngine.checkSkill('体质', victim, 'normal') : { success: false });
        if (sk.success) return { damage: 0, passed: true };
        return { damage: CoCEngine.parseDice('1D6'), passed: false };
    },
    electricDamage: function(voltage) {
        voltage = voltage || 'household';
        var tiers = { household:'1D3', industrial:'2D6', powerline:'4D6', lightning:'6D6' };
        var dmg = CoCEngine.parseDice(tiers[voltage]||'1D6');
        return { damage: dmg, voltage: voltage, stun: dmg>=6 };
    },
    explosionDamage: function(dice, distanceFeet) {
        var base = CoCEngine.parseDice(dice);
        var falloff = Math.max(1, Math.floor(distanceFeet / 5));
        return { damage: Math.max(1, Math.floor(base/falloff)), baseDamage: base, distance: distanceFeet };
    }
};
}
