/**
 * Canonical investigator record.
 * Engine writes: derived.hp / derived.sanity, status.*, insanity.*.
 * UI reads those via char_hud_helpers (top-level hp/sanity are mirrors).
 */

export function emptyStatus() {
    return { hasMajorWound: false, isDying: false, isUnconscious: false, isDead: false, wounds: [] };
}

export function emptyInsanity() {
    return { tempInsane: false, indefInsane: false, phobias: [], manias: [], dailyLoss: 0, history: [] };
}

export function emptyMythosStudy() {
    return { studiedTomes: {}, knownSpells: [] };
}

export function createInvestigatorRecord(partial = {}) {
    const derivedIn = (partial.derived && typeof partial.derived === 'object') ? { ...partial.derived } : {};
    const maxHp = Number(derivedIn.maxHp) || Number(partial.hp) || 10;
    const hp = Number(partial.hp ?? derivedIn.hp ?? maxHp) || maxHp;
    const san = Number(partial.sanity ?? derivedIn.sanity ?? derivedIn.san ?? 50) || 50;
    derivedIn.hp = hp;
    derivedIn.maxHp = Number(derivedIn.maxHp) || maxHp;
    derivedIn.sanity = san;
    if (derivedIn.san == null) derivedIn.san = san;
    if (derivedIn.maxSan == null) derivedIn.maxSan = Math.max(0, 99 - (Number(partial.skills && partial.skills['克苏鲁神话']) || 0));

    const status = { ...emptyStatus(), ...(partial.status || {}) };
    if (partial.hasMajorWound) status.hasMajorWound = true;
    if (partial.isDying) status.isDying = true;
    if (partial.isUnconscious) status.isUnconscious = true;
    if (partial.isDead) status.isDead = true;

    const insanity = { ...emptyInsanity(), ...(partial.insanity || {}) };
    if (partial.isInsane) insanity.tempInsane = true;

    return {
        name: partial.name || '调查员',
        jobName: partial.jobName || (partial.job && partial.job.name) || '无业',
        player: partial.player || '',
        hp,
        sanity: san,
        attrs: partial.attrs || {},
        derived: derivedIn,
        skills: partial.skills || {},
        backstory: (partial.backstory && typeof partial.backstory === 'object')
            ? { ...partial.backstory }
            : {},
        wealth: (partial.wealth && typeof partial.wealth === 'object')
            ? { ...partial.wealth }
            : undefined,
        expName: partial.expName || '无',
        isActive: !!partial.isActive,
        equipment: partial.equipment || { head: null, acc1: null, acc2: null, hands: null, feet: null, weapon: null },
        status,
        insanity,
        mythosStudy: partial.mythosStudy || emptyMythosStudy(),
        campaignKey: partial.campaignKey,
        campaignCondition: partial.campaignCondition
    };
}

if (typeof window !== 'undefined') {
    window.CoCCharRecord = { createInvestigatorRecord, emptyStatus, emptyInsanity, emptyMythosStudy };
}
