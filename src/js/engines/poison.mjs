// ESM engine module — source for browser build
// Split from js/engines/poison.js

export function attachPoisonEngine(CoCEngine) {
  CoCEngine.PoisonEngine = {
    applyPoison: function(victim, potency, delayRounds) {
        potency = potency || 'moderate';
        delayRounds = delayRounds || 0;
        var potencies = { mild:{conPenalty:0,damage:'1D3'}, moderate:{conPenalty:-1,damage:'1D6'}, lethal:{conPenalty:-2,damage:'2D6'} };
        var p = potencies[potency] || potencies.moderate;
        if (!victim.poison) victim.poison = [];
        victim.poison.push({
            potency: potency,
            damage: p.damage,
            conPenalty: p.conPenalty,
            delayRounds: delayRounds,
            active: true,
            lastTickRound: -1
        });
        return { applied:true, potency:potency, desc:victim.name + '中毒！' };
    },
    processPoisonTick: function(victim, currentRound) {
        if (!victim.poison) return { damage:0 };
        var round = Number(currentRound);
        if (!Number.isFinite(round)) round = 1;
        var total = 0;
        for (var i = 0; i < victim.poison.length; i++) {
            var p = victim.poison[i];
            if (!p.active || round < p.delayRounds) continue;
            // Same round must not double-proc if AI/combat calls tick twice.
            if (p.lastTickRound != null && round <= p.lastTickRound) continue;
            p.lastTickRound = round;
            total += CoCEngine.parseDice(p.damage);
        }
        if (total > 0) {
            if (CoCEngine.MajorWoundEngine && typeof CoCEngine.MajorWoundEngine.dealDamage === 'function') {
                return CoCEngine.MajorWoundEngine.dealDamage(victim, total);
            }
            CoCEngine.syncHp(victim);
            victim.hp = Math.max(0, CoCEngine.currentHp(victim) - total);
            CoCEngine.syncHp(victim);
        }
        return { damage: total, hpRemaining: victim.hp };
    },
    resistCheck: function(victim, potency, preRolled) {
        potency = potency || 'moderate';
        var out;
        if (preRolled && typeof preRolled.success === 'boolean') {
            out = {
                success: !!preRolled.success,
                rolled: preRolled.rolledValue,
                target: preRolled.targetValue ?? preRolled.skillValue,
                level: preRolled.level,
                potency: potency
            };
        } else {
            var penDice = { mild:0, moderate:1, lethal:2 }[potency] || 0;
            var options = penDice ? { penaltyDice: penDice } : {};
            var res = CoCEngine.checkSkill('体质', victim, 'normal', options);
            out = {
                success: !!res.success,
                rolled: res.rolledValue,
                target: res.targetValue ?? res.skillValue,
                level: res.level,
                potency: potency
            };
        }
        if (out.success && victim.poison) {
            for (var i = 0; i < victim.poison.length; i++) victim.poison[i].active = false;
        }
        return out;
    }
};
}
