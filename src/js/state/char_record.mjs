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

/**
 * Stable investigator id (ADR-0003 §1). Never derived from the name, never changed.
 * @returns {string}
 */
export function newInvId() {
    const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
    if (c && typeof c.randomUUID === 'function') return 'inv_' + c.randomUUID().replace(/-/g, '').slice(0, 16);
    return 'inv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Give every record in a roster an invId, keeping existing ones. Idempotent; mutates in place.
 * All roster entry points (create, addToRoster, load, arc-ledger restore) go through this.
 * @param {Array<Object>} roster
 * @returns {Array<Object>} the same roster
 */
export function ensureInvIds(roster) {
    if (!Array.isArray(roster)) return roster;
    const seen = new Set();
    for (const c of roster) {
        if (!c || typeof c !== 'object') continue;
        if (typeof c.invId !== 'string' || !c.invId || seen.has(c.invId)) c.invId = newInvId();
        seen.add(c.invId);
    }
    return roster;
}

/**
 * Resolve a name or invId to an invId. Returns null when nothing matches or a name is ambiguous;
 * callers must then fall back to the strictest visibility ({ to: 'keeper' }), never to "everyone".
 * @param {string} nameOrId
 * @param {Array<Object>} roster
 * @returns {string|null}
 */
export function resolveInvId(nameOrId, roster) {
    if (nameOrId == null || !Array.isArray(roster)) return null;
    const key = String(nameOrId).trim();
    if (!key) return null;
    const byId = roster.find((c) => c && c.invId === key);
    if (byId) return byId.invId;
    const byName = roster.filter((c) => c && c.name === key);
    return byName.length === 1 && byName[0].invId ? byName[0].invId : null;
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
        invId: (typeof partial.invId === 'string' && partial.invId) ? partial.invId : newInvId(),
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
    window.CoCCharRecord = { createInvestigatorRecord, emptyStatus, emptyInsanity, emptyMythosStudy, ensureInvIds, resolveInvId };
}
