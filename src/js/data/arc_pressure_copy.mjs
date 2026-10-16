/**
 * Reputation / police pressure choice-label hints (display only).
 * Listed in PRESSURE_WRITE_INVENTORY — future PressureBus must NOT mutate heat/flags here.
 */

export const PRESSURE_HINTS = Object.freeze({
    police_interest: '〔警察盯梢〕',
    reputation_hit: '〔风声紧〕',
    arc_pressure: '〔遭遇加严〕'
});

/** Suffix for choice labels when carry pressure flags are set. */
export function pressureChoiceSuffix(flags) {
    const f = flags || {};
    const parts = [];
    if (f.police_interest) parts.push(PRESSURE_HINTS.police_interest);
    else if (f.reputation_hit) parts.push(PRESSURE_HINTS.reputation_hit);
    else if (f.arc_pressure) parts.push(PRESSURE_HINTS.arc_pressure);
    return parts.length ? ' ' + parts.join('') : '';
}

/** One-line HUD blurb for story toolbar. */
export function pressureHudLine(flags, mythosHeat) {
    const f = flags || {};
    const bits = [];
    if (f.police_interest) bits.push('警察盯梢·遭遇加严');
    else if (f.reputation_hit) bits.push('信誉受损·风声紧');
    else if (f.arc_pressure) bits.push('余波加压');
    const heat = Number(mythosHeat) || 0;
    if (heat > 0) bits.push('热度' + heat + '/5');
    return bits.length ? bits.join(' · ') : '';
}

export const CoCArcPressureCopy = { PRESSURE_HINTS, pressureChoiceSuffix, pressureHudLine };
