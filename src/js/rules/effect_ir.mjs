/**
 * Effect IR — intermediate ops between Intent and Kernel.
 * New rules should compile to these ops; do not add parallel HP/SAN writers.
 */

export const OPS = Object.freeze({
    GATE_CAN_ACT: 'gate_can_act',
    GATE_FIRE_RATE: 'gate_fire_rate',
    SPEND_FIRE_RATE: 'spend_fire_rate',
    CLEAR_JAM: 'clear_jam',
    APPLY_CONDITION: 'apply_condition',
    DIVE_FOR_COVER: 'dive_for_cover',
    STAND_UP: 'stand_up',
    MOD_DICE: 'mod_dice',
    NOTE: 'note'
});

/**
 * @typedef {object} Effect
 * @property {string} op
 * @property {'gate'|'commit'|'mod'} [phase]
 */

export function effect(op, fields, phase) {
    const e = Object.assign({ op: op }, fields || {});
    if (phase) e.phase = phase;
    return e;
}
