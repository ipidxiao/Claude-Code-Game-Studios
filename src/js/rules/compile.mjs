/**
 * compileIntent — Intent + ruleset profile → Effect[].
 * Keep handlers thin: they build intent, then compile/execute.
 */
import { OPS, effect } from './effect_ir.mjs';
import { getRulesetProfile } from './ruleset_profile.mjs';

/**
 * @param {object} intent
 * @param {object} [profile]
 * @returns {object[]}
 */
export function compileIntent(intent, profile) {
    profile = profile || getRulesetProfile();
    const kind = intent && intent.kind;
    if (!kind) return [];

    if (kind === 'fire_weapon') {
        const weapon = intent.weapon || null;
        const shots = Math.max(1, Number(intent.shots) || 1);
        return [
            effect(OPS.GATE_CAN_ACT, { action: 'fire' }, 'gate'),
            effect(OPS.GATE_FIRE_RATE, { weapon: weapon }, 'gate'),
            effect(OPS.SPEND_FIRE_RATE, { weapon: weapon, shots: shots }, 'commit')
        ];
    }

    if (kind === 'burst_fire') {
        const weapon = intent.weapon || null;
        return [
            effect(OPS.GATE_CAN_ACT, { action: 'fire' }, 'gate'),
            effect(OPS.GATE_FIRE_RATE, { weapon: weapon }, 'gate'),
            effect(OPS.SPEND_FIRE_RATE, { weapon: weapon, shots: 1 }, 'commit')
        ];
    }

    if (kind === 'dive_for_cover') {
        const cover = intent.cover === 'hard' ? 'hard' : 'soft';
        return [
            effect(OPS.GATE_CAN_ACT, { action: 'dive' }, 'gate'),
            effect(OPS.DIVE_FOR_COVER, { cover: cover }, 'commit')
        ];
    }

    if (kind === 'reload_weapon') {
        const clearJam = intent.clearJam !== false;
        const list = [
            effect(OPS.GATE_CAN_ACT, { action: 'reload' }, 'gate')
        ];
        if (clearJam) list.push(effect(OPS.CLEAR_JAM, {}, 'commit'));
        return list;
    }

    if (kind === 'stand_up') {
        return [
            effect(OPS.GATE_CAN_ACT, { action: 'stand' }, 'gate'),
            effect(OPS.STAND_UP, {}, 'commit')
        ];
    }

    // Unknown intents compile to empty — caller keeps legacy path.
    return [
        effect(OPS.NOTE, { text: 'uncompiled:' + kind + ':' + (profile && profile.id) }, 'gate')
    ];
}
