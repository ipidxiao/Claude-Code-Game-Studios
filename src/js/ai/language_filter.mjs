// AI narrative language filter — wraps LANGUAGE_SELF_CORRECTION for chat display

import { run, processText, detectViolations, safeFallback } from '../data/campaigns/language_self_correction.mjs';

export const CoCLanguageFilter = {
    processText,
    detectViolations,
    safeFallback,
    evaluate(text) {
        return detectViolations(text).ok ? 1 : 0;
    },
    run(text, opts) {
        const result = run(text, opts);
        return result.text;
    },
    runDetailed(text, opts) {
        return run(text, opts);
    }
};

if (typeof window !== 'undefined') {
    window.CoCLanguageFilter = CoCLanguageFilter;
}
