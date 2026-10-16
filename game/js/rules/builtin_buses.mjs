/**
 * Register core 7e contributors/plugins onto the buses.
 * Called after SituationalEngine / ConditionsEngine attach.
 */
import { registerModifierContributor } from './modifier_bus.mjs';
import { registerTickPlugin } from './tick_bus.mjs';

/**
 * @param {object} CoCEngine
 * @param {object} helpers
 * @param {function} helpers.rangeBandFor
 * @param {function} helpers.resolveWeaponDamage
 * @param {function} helpers.resolveCheckModifiers  bound SituationalEngine method
 */
export function registerCoreModifierContributors(CoCEngine, helpers) {
    const rangeBandFor = helpers.rangeBandFor;
    const resolveWeaponDamage = helpers.resolveWeaponDamage;
    const resolveCheckModifiers = helpers.resolveCheckModifiers;

    registerModifierContributor('core.situation', function(ctx) {
        ctx = ctx || {};
        const sit = Object.assign({}, (ctx.situation || {}), ctx);
        const parts = [];
        const weapon = ctx.weapon || null;
        const ranged = !!(ctx.ranged || (weapon && (weapon.type === 'firearm' || weapon.type === 'ranged')));
        const distance = sit.distance != null ? Number(sit.distance) : (sit.pointBlank ? 0 : null);
        const rangeRaw = weapon && (weapon.range != null ? weapon.range : weapon.rangeYards);
        let band = sit.rangeBand || null;
        if (band == null && ranged && distance != null && Number.isFinite(distance)) {
            band = rangeBandFor(distance, rangeRaw);
        }
        if (sit.pointBlank || band === 'point_blank') {
            parts.push({ bonusDice: 1, notes: ['抵近'] });
            band = band || 'point_blank';
        }
        if (band === 'long') parts.push({ difficulty: 'hard', notes: ['远距→困难'] });
        if (band === 'extreme') parts.push({ difficulty: 'extreme', notes: ['极远→极难'] });
        if (band === 'out_of_range') parts.push({ penaltyDice: 2, difficulty: 'extreme', notes: ['超射程'] });

        if (sit.surprise || sit.surprised) parts.push({ bonusDice: 1, notes: ['突袭'] });
        if (sit.outnumbered) parts.push({ bonusDice: 1, notes: ['人数优势'] });
        if (sit.darkness === 'partial' || sit.darkness === true) parts.push({ penaltyDice: 1, notes: ['黑暗'] });
        if (sit.darkness === 'total') parts.push({ penaltyDice: 2, notes: ['伸手不见五指'] });
        if (sit.cover === 'soft' || sit.cover === true) parts.push({ penaltyDice: 1, notes: ['掩体'] });
        if (sit.cover === 'hard') parts.push({ penaltyDice: 2, notes: ['硬掩体'] });
        if (sit.cover && typeof sit.cover === 'object' && sit.cover.kind) {
            if (sit.cover.kind === 'hard') parts.push({ penaltyDice: 2, notes: ['硬掩体'] });
            else parts.push({ penaltyDice: 1, notes: ['掩体'] });
        }
        if (sit.movingTarget) parts.push({ penaltyDice: 1, notes: ['移动目标'] });

        if (ctx.defender && ctx.defender.status && ctx.defender.status.prone && ranged) {
            parts.push({ bonusDice: 1, notes: ['目标倒地'] });
        }
        if (ctx.attacker && ctx.attacker.status) {
            const aim = Math.max(0, Number(ctx.attacker.status.aimBonus) || 0);
            if (aim) parts.push({ bonusDice: aim, notes: ['瞄准×' + aim] });
            if (ctx.attacker.status.stunned) parts.push({ penaltyDice: 1, notes: ['眩晕'] });
            if (ctx.attacker.status.prone && !ranged) {
                parts.push({ penaltyDice: 1, notes: ['倒地近战'] });
            }
            if (ctx.attacker.status.prone && ranged) {
                parts.push({ penaltyDice: 1, notes: ['倒地射击'] });
            }
            if (ctx.attacker.status.grappled && !ranged) {
                parts.push({ penaltyDice: 1, notes: ['被擒近战'] });
            }
            const sense = ctx.attacker.status.boutSense;
            if (sense === 'blind') parts.push({ penaltyDice: 2, notes: ['失明'] });
            else if (sense === 'deaf' && !ranged) parts.push({ penaltyDice: 1, notes: ['失聪'] });
            if (ctx.attacker.status.pendingPenalty) {
                const pp = Number(ctx.attacker.status.pendingPenalty.penaltyDice) || 1;
                parts.push({ penaltyDice: pp, notes: ['恐惧症/狂躁触发'] });
            }
            // Attack rolls skip checkSkill's status mods, so deprivation must land here.
            const hungerPen = Number(ctx.attacker.status.hunger && ctx.attacker.status.hunger.penaltyDice) || 0;
            const thirstPen = Number(ctx.attacker.status.thirst && ctx.attacker.status.thirst.penaltyDice) || 0;
            const deprivePen = Math.max(hungerPen, thirstPen);
            if (deprivePen > 0) {
                parts.push({ penaltyDice: deprivePen, notes: [hungerPen >= thirstPen ? '饥饿' : '脱水'] });
            }
        }

        if (ctx.skillName && ctx.actor && typeof resolveCheckModifiers === 'function') {
            const skMod = resolveCheckModifiers(ctx.skillName, ctx.actor);
            if (skMod && (skMod.bonusDice || skMod.penaltyDice || (skMod.notes && skMod.notes.length))) {
                parts.push(skMod);
            }
        }

        let damageExpr = weapon && weapon.damage ? weapon.damage : null;
        if (damageExpr) {
            const resolved = resolveWeaponDamage(damageExpr, {
                rangeBand: band || 'close',
                db: ranged ? 0 : (ctx.attacker && ctx.attacker.derived && ctx.attacker.derived.db)
            });
            damageExpr = resolved.expr;
            parts.push({ damageExpr: damageExpr, notes: band ? ['射程档:' + band] : [] });
        }

        if (ranged) {
            // CoC 7e: worn armor still applies to firearms unless AP (handled elsewhere).
        }

        return { parts: parts, band: band, damageExpr: damageExpr, ranged: ranged };
    }, { priority: 0 });
}

export function registerCoreTickPlugins(CoCEngine) {
    registerTickPlugin('core.firearm_rate', {
        scope: 'actor',
        when: 'round',
        priority: 10,
        fn: function(ctx) {
            const ch = ctx.actor;
            if (!ch || !ch.status) return;
            delete ch.status.firearmShotsUsed;
            if (ch.status.altFireCooldown > 0) {
                ch.status.altFireBlocked = true;
                ch.status.altFireCooldown -= 1;
                if (ch.status.altFireCooldown <= 0) delete ch.status.altFireCooldown;
            } else if (ch.status.altFireBlocked) {
                delete ch.status.altFireBlocked;
            } else if (ch.status.altFirePendingBlock) {
                ch.status.altFireBlocked = true;
                delete ch.status.altFirePendingBlock;
            }
        }
    });

    registerTickPlugin('core.poison', {
        scope: 'actor',
        when: 'round',
        priority: 20,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            const ch = ctx.actor;
            if (!Engine.PoisonEngine || !Array.isArray(ch.poison) || !ch.poison.some((p) => p && p.active)) return;
            const pr = Engine.PoisonEngine.processPoisonTick(ch, ctx.round);
            if (pr && pr.damage > 0) return [{ name: ch.name, kind: 'poison', damage: pr.damage }];
        }
    });

    registerTickPlugin('core.bleeding', {
        scope: 'actor', when: 'round', priority: 30,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            const bleed = Engine.ConditionsEngine.tickBleeding(ctx.actor);
            if (bleed && bleed.damage > 0) return [{ name: ctx.actor.name, kind: 'bleeding', damage: bleed.damage }];
        }
    });

    registerTickPlugin('core.burning', {
        scope: 'actor', when: 'round', priority: 40,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            const burn = Engine.ConditionsEngine.tickBurning(ctx.actor);
            if (burn && burn.damage > 0) return [{ name: ctx.actor.name, kind: 'burning', damage: burn.damage }];
        }
    });

    registerTickPlugin('core.drowning', {
        scope: 'actor', when: 'round', priority: 50,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            const drown = Engine.ConditionsEngine.tickDrowning(ctx.actor);
            if (drown && drown.needsConCheck) {
                return [{ name: ctx.actor.name, kind: 'drown_con_needed' }];
            }
            if (drown && drown.damage > 0) return [{ name: ctx.actor.name, kind: 'drowning', damage: drown.damage }];
        }
    });

    registerTickPlugin('core.stun_cold_heat', {
        scope: 'actor', when: 'round', priority: 60,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            Engine.ConditionsEngine.tickStun(ctx.actor);
            Engine.ConditionsEngine.tickColdHeat(ctx.actor);
        }
    });

    registerTickPlugin('core.dying_check', {
        scope: 'actor', when: 'round', priority: 70,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            if (Engine.ConditionsEngine.dyingNeedsCheck(ctx.actor)) {
                return [{ name: ctx.actor.name, kind: 'dying_check_needed' }];
            }
        }
    });

    registerTickPlugin('core.madness', {
        scope: 'actor', when: 'round', priority: 80,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            if (!Engine.SanityEngine || typeof Engine.SanityEngine.tickMadness !== 'function') return;
            const md = Engine.SanityEngine.tickMadness(ctx.actor, { rounds: 1 });
            if (md && (md.boutEnded || md.tempEnded) && md.desc) {
                return [{ name: ctx.actor.name, kind: 'bout_tick', detail: md }];
            }
        }
    });

    registerTickPlugin('core.sync_grapples', {
        scope: 'state', when: 'round', priority: 200,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            const actors = ctx.actors || [];
            return Engine.ConditionsEngine.syncGrapples(actors) || [];
        }
    });

    registerTickPlugin('core.chase_round', {
        scope: 'state', when: 'round', priority: 210,
        fn: function(ctx) {
            const Engine = ctx.Engine || CoCEngine;
            const gameState = ctx.gameState;
            if (gameState.chase && gameState.chase.active && !(gameState.combat && gameState.combat.active)
                && Engine.ChaseEngine && typeof Engine.ChaseEngine.tickRound === 'function') {
                const cr = Engine.ChaseEngine.tickRound(gameState.chase);
                if (cr) return [{ kind: 'chase', detail: cr }];
            }
        }
    });
}
