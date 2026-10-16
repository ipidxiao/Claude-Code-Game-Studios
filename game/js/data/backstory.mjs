/**
 * CoC 7e investigator backstory — five personal connections (+ traits).
 * UI already stores these; engine uses them for SAN reconnection recovery.
 */
export const BACKSTORY_FIVE = Object.freeze([
    Object.freeze({ key: 'ideology', label: '思想与信念', aliases: ['beliefs', 'ideology', '信念'] }),
    Object.freeze({ key: 'significantPeople', label: '重要之人', aliases: ['people', 'significantPeople', '重要之人'] }),
    Object.freeze({ key: 'meaningfulLocations', label: '意义非凡之地', aliases: ['locations', 'meaningfulLocations', '地点'] }),
    Object.freeze({ key: 'treasuredPossessions', label: '宝贵之物', aliases: ['possessions', 'treasuredPossessions', '财物'] }),
    Object.freeze({ key: 'traits', label: '特质', aliases: ['traits', '特质'] })
]);

export const BACKSTORY_EXTRA = Object.freeze([
    Object.freeze({ key: 'description', label: '形象描述' }),
    Object.freeze({ key: 'injuries', label: '伤疤与疤痕' }),
    Object.freeze({ key: 'phobias', label: '恐惧症与狂躁症' }),
    Object.freeze({ key: 'encounters', label: '神话遭遇' })
]);

/** Default empty backstory object (five + extras). */
export function emptyBackstory() {
    const out = {
        description: '',
        ideology: '',
        significantPeople: '',
        meaningfulLocations: '',
        treasuredPossessions: '',
        traits: '',
        injuries: '',
        phobias: '',
        encounters: ''
    };
    return out;
}

/**
 * Merge partial into canonical backstory shape.
 * @param {object} [partial]
 */
export function normalizeBackstory(partial) {
    const base = emptyBackstory();
    if (!partial || typeof partial !== 'object') return base;
    Object.keys(base).forEach((k) => {
        if (partial[k] != null) base[k] = String(partial[k]);
    });
    return base;
}

/**
 * Resolve key or Chinese label / alias → canonical key.
 * @param {string} keyOrLabel
 * @returns {string|null}
 */
export function resolveBackstoryKey(keyOrLabel) {
    const raw = String(keyOrLabel || '').trim();
    if (!raw) return null;
    for (let i = 0; i < BACKSTORY_FIVE.length; i++) {
        const e = BACKSTORY_FIVE[i];
        if (e.key === raw || e.label === raw) return e.key;
        if (e.aliases && e.aliases.some((a) => a === raw || a.toLowerCase() === raw.toLowerCase())) return e.key;
    }
    for (let i = 0; i < BACKSTORY_EXTRA.length; i++) {
        const e = BACKSTORY_EXTRA[i];
        if (e.key === raw || e.label === raw) return e.key;
    }
    return null;
}

/**
 * Which of the five connections have non-empty text.
 * @param {object} backstory
 * @returns {string[]}
 */
export function filledBackstoryKeys(backstory) {
    const bs = normalizeBackstory(backstory);
    return BACKSTORY_FIVE.filter((e) => String(bs[e.key] || '').trim().length > 0).map((e) => e.key);
}

/**
 * Short summary for prompts / tools.
 * @param {object} backstory
 */
export function summarizeBackstory(backstory) {
    const bs = normalizeBackstory(backstory);
    const parts = [];
    BACKSTORY_FIVE.forEach((e) => {
        const v = String(bs[e.key] || '').trim();
        if (v) parts.push(e.label + '：' + v);
    });
    return parts.join('；') || '（背景五项未填写）';
}
