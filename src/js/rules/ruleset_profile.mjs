/**
 * Ruleset profiles — switch 7e-core / 7e-full / pulp without forking write paths.
 * Formula truth and optional flags live here; settlement still goes through Kernel only.
 */
export const RULESET_PROFILES = Object.freeze({
    '7e-core': Object.freeze({
        id: '7e-core',
        label: 'CoC 7e Core',
        /** Permanent POW spend on cast (7e); core keeps gate-only for legacy saves. */
        permanentPowCost: false,
        /** dex_plus_d10 = current house; dex_firearm_first = Keeper Rulebook-style. */
        initiative: 'dex_plus_d10',
        /** Indefinite insanity vs current SAN/5 (never POW/5). */
        indefInsanityBasis: 'current_san',
        permanentInsanityAtZero: true,
        optional: Object.freeze({})
    }),
    '7e-full': Object.freeze({
        id: '7e-full',
        label: 'CoC 7e Full',
        permanentPowCost: true,
        initiative: 'dex_firearm_first',
        indefInsanityBasis: 'current_san',
        permanentInsanityAtZero: true,
        optional: Object.freeze({})
    }),
    pulp: Object.freeze({
        id: 'pulp',
        label: 'Pulp Cthulhu',
        permanentPowCost: true,
        initiative: 'dex_plus_d10',
        indefInsanityBasis: 'current_san',
        /** Pulp heroes push further — SAN 0 is not instant permanent lock. */
        permanentInsanityAtZero: false,
        optional: Object.freeze({
            pulpHero: true,
            /** Added to floor((CON+SIZ)/10) when calculating HP. */
            hpBonus: 3,
            /** Extra luck recovered on recoverLuck when amount omitted. */
            luckRecoveryBonus: 2
        })
    })
});

export const DEFAULT_RULESET_ID = '7e-full';

let _activeId = DEFAULT_RULESET_ID;

export function getRulesetId() {
    return _activeId;
}

export function getRulesetProfile(id) {
    const key = id || _activeId;
    return RULESET_PROFILES[key] || RULESET_PROFILES[DEFAULT_RULESET_ID];
}

/**
 * @param {string} id
 * @returns {{ ok: boolean, profile?: object, desc: string }}
 */
export function setRulesetProfile(id) {
    if (!RULESET_PROFILES[id]) {
        return { ok: false, desc: '未知规则档: ' + id };
    }
    _activeId = id;
    return { ok: true, profile: RULESET_PROFILES[id], desc: '规则档切换为 ' + id };
}

/**
 * Build initiative sort key for one combatant.
 * @param {object} actor - roster char or enemy
 * @param {object} [opts]
 * @param {boolean} [opts.firearmReady]
 * @param {function} [opts.rollD10]
 */
/** Same firearm string the investigator initiative check uses. */
export function textLooksFirearmReady(text) {
    return /枪|步枪|手枪|霰弹|冲锋|自动|左轮|弩/.test(String(text || ''));
}

export function resolveInitiativeScore(actor, opts) {
    opts = opts || {};
    const profile = getRulesetProfile();
    const rollD10 = typeof opts.rollD10 === 'function'
        ? opts.rollD10
        : () => Math.floor(Math.random() * 10) + 1;
    const dex = (actor && actor.attrs && actor.attrs.DEX != null)
        ? Number(actor.attrs.DEX)
        : (actor && actor.isEnemy ? 40 : 50);
    const firearmReady = !!opts.firearmReady;
    if (profile.initiative === 'dex_firearm_first') {
        // Higher DEX first; readied firearms sort above equal DEX (secondary key).
        return {
            initiative: dex,
            firearmReady: firearmReady,
            sortKey: dex * 10 + (firearmReady ? 1 : 0)
        };
    }
    // House: DEX + d10
    const init = dex + rollD10();
    return { initiative: init, firearmReady: false, sortKey: init };
}
