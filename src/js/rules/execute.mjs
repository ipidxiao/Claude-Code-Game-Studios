/**
 * executeEffects — run Effect IR against Kernel only.
 */
import { OPS } from './effect_ir.mjs';

/**
 * @param {object[]} effects
 * @param {object} ctx
 * @param {object} ctx.Engine
 * @param {object} ctx.actor
 * @param {object} [opts]
 * @param {'all'|'gate'|'commit'} [opts.phase]
 * @returns {{ ok: boolean, desc?: string, notes: string[], mods: object, results: object[] }}
 */
export function executeEffects(effects, ctx, opts) {
    opts = opts || {};
    const phase = opts.phase || 'all';
    const Engine = ctx && ctx.Engine;
    const actor = ctx && ctx.actor;
    const notes = [];
    const results = [];
    const mods = { bonusDice: 0, penaltyDice: 0, difficulty: null };

    const list = Array.isArray(effects) ? effects : [];
    for (let i = 0; i < list.length; i++) {
        const e = list[i] || {};
        if (phase !== 'all' && e.phase && e.phase !== phase) continue;

        if (e.op === OPS.NOTE) {
            if (e.text) notes.push(String(e.text));
            continue;
        }

        if (e.op === OPS.GATE_CAN_ACT) {
            if (!Engine || typeof Engine.canAct !== 'function') continue;
            const gate = Engine.canAct(actor, e.action || 'act');
            if (gate && gate.ok === false) {
                return { ok: false, desc: gate.desc || '无法行动', notes: notes, mods: mods, results: results };
            }
            results.push({ op: e.op, ok: true });
            continue;
        }

        if (e.op === OPS.GATE_FIRE_RATE) {
            const CE = Engine && Engine.CombatEngine;
            if (CE && typeof CE.checkFireRate === 'function') {
                const rate = CE.checkFireRate(actor, e.weapon);
                if (!rate.ok) {
                    return { ok: false, desc: rate.desc || '射速不足', notes: notes, mods: mods, results: results };
                }
                results.push({ op: e.op, ok: true, remaining: rate.remaining });
            }
            continue;
        }

        if (e.op === OPS.SPEND_FIRE_RATE) {
            const CE = Engine && Engine.CombatEngine;
            if (CE && typeof CE.spendFireRate === 'function') {
                results.push({ op: e.op, detail: CE.spendFireRate(actor, e.weapon, e.shots || 1) });
            }
            continue;
        }

        if (e.op === OPS.CLEAR_JAM) {
            const CE = Engine && Engine.CombatEngine;
            if (CE && typeof CE.clearWeaponJam === 'function') {
                const cleared = CE.clearWeaponJam(actor);
                if (cleared && cleared.ok) notes.push(cleared.desc);
                results.push({ op: e.op, detail: cleared });
            }
            continue;
        }

        if (e.op === OPS.DIVE_FOR_COVER) {
            const fn = Engine && (Engine.diveForCover || (Engine.ConditionsEngine && Engine.ConditionsEngine.diveForCover));
            if (typeof fn === 'function') {
                const dive = fn.call(Engine.ConditionsEngine || Engine, actor, e.cover || 'soft');
                if (!dive || !dive.ok) {
                    return { ok: false, desc: (dive && dive.desc) || '扑掩失败', notes: notes, mods: mods, results: results };
                }
                notes.push(dive.desc);
                results.push({ op: e.op, detail: dive });
            }
            continue;
        }

        if (e.op === OPS.STAND_UP) {
            const fn = Engine && (Engine.standUp || (Engine.ConditionsEngine && Engine.ConditionsEngine.standUp));
            if (typeof fn === 'function') {
                const up = fn.call(Engine.ConditionsEngine || Engine, actor);
                if (!up || !up.ok) {
                    return { ok: false, desc: (up && up.desc) || '起身失败', notes: notes, mods: mods, results: results };
                }
                notes.push(up.desc);
                results.push({ op: e.op, detail: up });
            }
            continue;
        }

        if (e.op === OPS.APPLY_CONDITION) {
            if (Engine && typeof Engine.applyCondition === 'function') {
                const applied = Engine.applyCondition(actor, e.kind, e.opts || {});
                results.push({ op: e.op, detail: applied });
                if (applied && applied.desc) notes.push(applied.desc);
            }
            continue;
        }

        if (e.op === OPS.MOD_DICE) {
            mods.bonusDice += Number(e.bonusDice) || 0;
            mods.penaltyDice += Number(e.penaltyDice) || 0;
            if (e.difficulty) mods.difficulty = e.difficulty;
            continue;
        }

        return {
            ok: false,
            desc: '未知 Effect op: ' + e.op,
            notes: notes,
            mods: mods,
            results: results
        };
    }

    return { ok: true, notes: notes, mods: mods, results: results };
}
