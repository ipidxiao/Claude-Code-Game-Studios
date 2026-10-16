import { CoCEngine } from '../coc.mjs';
/** Investigator HUD helpers — status flags, wound slots, mythos readout. */

const AREA_SLOT = Object.freeze({
    head: 'head',
    face: 'head',
    torso: 'torso',
    abdomen: 'torso',
    right_arm: 'rightArm',
    right_hand: 'rightArm',
    left_arm: 'leftArm',
    left_hand: 'leftArm',
    right_leg: 'rightLeg',
    right_foot: 'rightLeg',
    left_leg: 'leftLeg',
    left_foot: 'leftLeg'
});

/** Canonical: status.* and insanity.*. Top-level flags are old-save fallbacks only. */
export function charFlags(char) {
    const st = (char && char.status) || {};
    const insanity = (char && char.insanity) || {};
    return {
        isInsane: !!(insanity.tempInsane || insanity.indefInsane || (char && char.isInsane)),
        hasMajorWound: !!(st.hasMajorWound || (char && char.hasMajorWound)),
        isDying: !!(st.isDying || (char && char.isDying)),
        isUnconscious: !!(st.isUnconscious || (char && char.isUnconscious)),
        isDead: !!(st.isDead || (char && char.isDead))
    };
}

export function charWoundMarks(char) {
    const wounds = (char && char.status && Array.isArray(char.status.wounds)) ? char.status.wounds : [];
    const slots = [];
    const chips = [];
    const seen = new Set();
    for (let i = 0; i < wounds.length; i++) {
        const loc = (wounds[i] && wounds[i].location) || {};
        const slot = AREA_SLOT[loc.area] || (loc.location ? 'torso' : '');
        if (slot && !seen.has(slot)) {
            seen.add(slot);
            slots.push(slot);
        }
        const label = loc.location || '重伤';
        chips.push({
            id: label + '-' + i,
            label,
            area: slot || 'torso',
            bleeding: !!(wounds[i] && wounds[i].bleeding),
            desc: loc.desc || ''
        });
    }
    return { slots, chips, summary: chips.map((c) => c.label).join('、') };
}

export function charSanCurrent(char) {
    const n = Number(char && (char.derived?.sanity ?? char.sanity ?? char.derived?.san));
    return Number.isFinite(n) ? n : 0;
}

export function charSanMax(char) {
    const cap = Number(char && char.derived && char.derived.maxSan);
    if (Number.isFinite(cap) && cap >= 0) return cap;
    const mythos = Number((char && char.skills && char.skills['克苏鲁神话']) ?? (char && char.mythos) ?? 0) || 0;
    return Math.max(0, 99 - mythos);
}

export function charMythosHud(char) {
    const skill = Number((char && char.skills && char.skills['克苏鲁神话']) ?? (char && char.mythos) ?? 0) || 0;
    const engineSpells = (typeof window !== 'undefined' && CoCEngine?.MythosEngine?.getKnownSpells)
        ? CoCEngine.MythosEngine.getKnownSpells(char)
        : null;
    const spells = Array.isArray(engineSpells)
        ? engineSpells.filter(Boolean)
        : ((char && char.mythosStudy && Array.isArray(char.mythosStudy.knownSpells))
            ? char.mythosStudy.knownSpells.filter(Boolean)
            : []);
    const studied = (char && char.mythosStudy && char.mythosStudy.studiedTomes) || {};
    const tomes = [];
    for (const key of Object.keys(studied)) {
        const p = studied[key];
        if (!p || !p.phase || p.phase === '未阅读') continue;
        const weeks = Number(p.weeks) || 0;
        const total = Number(p.totalWeeks) || 0;
        tomes.push({
            key,
            name: key,
            phase: p.phase,
            weeks,
            totalWeeks: total,
            pct: total > 0 ? Math.max(0, Math.min(100, Math.round((weeks / total) * 100))) : (p.phase === '已完成' ? 100 : 0)
        });
    }
    return {
        skill,
        spells,
        tomes,
        visible: skill > 0 || spells.length > 0 || tomes.length > 0
    };
}
