// Language self-correction — forbidden Chinese narrative patterns (direct prohibition)

export const LANGUAGE_SELF_CORRECTION = {
    SYSTEM_NAME: 'LANGUAGE_SELF_CORRECTION_ENGINE',
    MODULE_TYPE: 'OUTPUT_FILTER_AND_REWRITE',
    GLOBAL_SETTINGS: {
        detection_mode: 'regex',
        auto_rewrite: true,
        preserve_meaning: true,
        keep_chat_style: true
    }
};

/**
 * Literary contrast patterns only — require explicit connective (而是/更像是/这是…)
 * to avoid false positives like「他不是坏人」.
 * @type {{ pattern: RegExp, rewrite: string }[]}
 */
export const FORBIDDEN_PATTERNS = [
    { pattern: /不是([^，。！？\s]{2,30}?)而是/g, rewrite: '与其说$1，更接近' },
    { pattern: /不仅仅是([^，。！？\s]{2,30}?)而是/g, rewrite: '除了$1，还包括' },
    { pattern: /这不再是([^，。！？\s]{2,30}?)这是/g, rewrite: '从$1转变为' },
    { pattern: /不再是([^，。！？\s]{2,30}?)而是/g, rewrite: '从$1转为' },
    { pattern: /并非([^，。！？\s]{2,30}?)而是/g, rewrite: '不完全属于$1，更接近' },
    { pattern: /不像是([^，。！？\s]{2,30}?)更像是/g, rewrite: '与$1相比，更接近' },
    { pattern: /那不是([^，。！？\s]{2,30}?)那是/g, rewrite: '与$1不同，更接近' },
    { pattern: /不仅仅是([^，。！？\s]{2,30}?)是/g, rewrite: '不止包含$1，还涉及' },
    { pattern: /并不只是([^，。！？\s]{2,30}?)而是/g, rewrite: '除了$1，还体现为' }
];

/** Phrases that must never be rewritten — regression guard for smoke tests. */
export const SHOULD_NOT_REWRITE_SAMPLES = [
    '他不是坏人。',
    '她不是说谎的人。',
    '调查员并非孤身一人。',
    '这不仅仅是麻烦。'
];

/**
 * Detect forbidden pattern violations in narrative text.
 * @param {string} rawText
 * @returns {{ ok: boolean, violations: { pattern: string, rewrite: string }[] }}
 */
export function detectViolations(rawText) {
    if (!rawText || typeof rawText !== 'string') return { ok: true, violations: [] };
    const violations = [];
    for (const rule of FORBIDDEN_PATTERNS) {
        const re = new RegExp(rule.pattern.source, rule.pattern.flags);
        if (re.test(rawText)) {
            violations.push({ pattern: rule.pattern.source, rewrite: rule.rewrite });
        }
    }
    return { ok: violations.length === 0, violations };
}

/**
 * Rewrite forbidden patterns in narrative text.
 * @param {string} rawText
 * @returns {string}
 */
export function processText(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText || '';
    let clean = rawText;
    for (const rule of FORBIDDEN_PATTERNS) {
        const re = new RegExp(rule.pattern.source, rule.pattern.flags);
        let guard = 0;
        while (re.test(clean) && guard < 50) {
            clean = clean.replace(re, rule.rewrite);
            guard++;
        }
    }
    return clean;
}

/**
 * Last-resort sanitizer when auto-rewrite still leaves violations.
 * Masks remaining forbidden spans instead of showing raw banned phrasing.
 * @param {string} rawText
 * @returns {string}
 */
export function safeFallback(rawText) {
    const processed = processText(rawText || '');
    if (detectViolations(processed).ok) return processed;
    let safe = processed;
    for (const rule of FORBIDDEN_PATTERNS) {
        const re = new RegExp(rule.pattern.source, rule.pattern.flags);
        safe = safe.replace(re, '……');
    }
    const trimmed = safe.replace(/\s{2,}/g, ' ').trim();
    return trimmed || '（叙事含禁用句式，已替换为安全表述。）';
}

/**
 * Full pipeline: detect → rewrite or reject (no score).
 * @param {string} rawText
 * @param {{ autoRewrite?: boolean }} [opts]
 * @returns {{ ok: boolean, text: string, violations: object[], rejected: boolean, rewritten?: boolean }}
 */
export function run(rawText, opts) {
    const autoRewrite = opts && opts.autoRewrite !== undefined
        ? opts.autoRewrite
        : LANGUAGE_SELF_CORRECTION.GLOBAL_SETTINGS.auto_rewrite;
    const initial = detectViolations(rawText);
    if (initial.ok) {
        return { ok: true, text: rawText || '', violations: [], rejected: false };
    }
    if (!autoRewrite) {
        return { ok: false, text: rawText || '', violations: initial.violations, rejected: true };
    }
    const text = processText(rawText);
    const after = detectViolations(text);
    if (!after.ok) {
        return { ok: false, text, violations: after.violations, rejected: true };
    }
    return { ok: true, text, violations: [], rejected: false, rewritten: true };
}

if (typeof window !== 'undefined') {
    window.CoCLanguageSelfCorrection = { FORBIDDEN_PATTERNS, SHOULD_NOT_REWRITE_SAMPLES, processText, detectViolations, safeFallback, run };
}
