/**
 * Prose Bridge — loads immersive prose banks and exposes
 * proseKey → text lookup for scenario nodes.
 *
 * Gate: original formatting preserved; judgment paragraphs mark a cut —
 * only `before` is shown now; `after` waits until skill check completes.
 */
import {
    partitionNarrationByJudgment,
    sanitizeNarrationForPlayer
} from '../data/narrative_prose.mjs';

const _proseImports = {
    tutorial: () => Promise.all([
        import('../data/scenarios/tutorial/prose_01.mjs'),
        import('../data/scenarios/tutorial/prose_02.mjs'),
        import('../data/scenarios/tutorial/prose_03.mjs'),
        import('../data/scenarios/tutorial/prose_04.mjs'),
        import('../data/scenarios/tutorial/prose_05.mjs'),
        import('../data/scenarios/tutorial/prose_06.mjs'),
        import('../data/scenarios/tutorial/prose_07.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.TUTORIAL_PROSE_PART_1 || p.TUTORIAL_PROSE_PART_2 || p.TUTORIAL_PROSE_PART_3 ||
        p.TUTORIAL_PROSE_PART_4 || p.TUTORIAL_PROSE_PART_5 || p.TUTORIAL_PROSE_PART_6 ||
        p.TUTORIAL_PROSE_PART_7 || {}))),

    abandoned_asylum: () => Promise.all([
        import('../data/scenarios/abandoned_asylum/prose_01.mjs'),
        import('../data/scenarios/abandoned_asylum/prose_02.mjs'),
        import('../data/scenarios/abandoned_asylum/prose_03.mjs'),
        import('../data/scenarios/abandoned_asylum/prose_04.mjs'),
        import('../data/scenarios/abandoned_asylum/prose_05.mjs'),
        import('../data/scenarios/abandoned_asylum/prose_06.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.ASYLUM_PROSE_PART_1 || p.ASYLUM_PROSE_PART_2 || p.ASYLUM_PROSE_PART_3 ||
        p.ASYLUM_PROSE_PART_4 || p.ASYLUM_PROSE_PART_5 || p.ASYLUM_PROSE_PART_6 || {}))),

    carnival_of_masks: () => Promise.all([
        import('../data/scenarios/carnival_of_masks/prose_01.mjs'),
        import('../data/scenarios/carnival_of_masks/prose_02.mjs'),
        import('../data/scenarios/carnival_of_masks/prose_03.mjs'),
        import('../data/scenarios/carnival_of_masks/prose_04.mjs'),
        import('../data/scenarios/carnival_of_masks/prose_05.mjs'),
        import('../data/scenarios/carnival_of_masks/prose_06.mjs'),
        import('../data/scenarios/carnival_of_masks/prose_07.mjs'),
        import('../data/scenarios/carnival_of_masks/prose_08.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.CARNIVAL_PROSE_PART_1 || p.CARNIVAL_PROSE_PART_2 || p.CARNIVAL_PROSE_PART_3 ||
        p.CARNIVAL_PROSE_PART_4 || p.CARNIVAL_PROSE_PART_5 || p.CARNIVAL_PROSE_PART_6 ||
        p.CARNIVAL_PROSE_PART_7 || p.CARNIVAL_PROSE_PART_8 || {}))),

    coastal_festival: () => Promise.all([
        import('../data/scenarios/coastal_festival/prose_01.mjs'),
        import('../data/scenarios/coastal_festival/prose_02.mjs'),
        import('../data/scenarios/coastal_festival/prose_03.mjs'),
        import('../data/scenarios/coastal_festival/prose_04.mjs'),
        import('../data/scenarios/coastal_festival/prose_05.mjs'),
        import('../data/scenarios/coastal_festival/prose_06.mjs'),
        import('../data/scenarios/coastal_festival/prose_07.mjs'),
        import('../data/scenarios/coastal_festival/prose_08.mjs'),
        import('../data/scenarios/coastal_festival/prose_09.mjs'),
        import('../data/scenarios/coastal_festival/prose_10.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.COASTAL_PROSE_PART_1 || p.COASTAL_PROSE_PART_2 || p.COASTAL_PROSE_PART_3 ||
        p.COASTAL_PROSE_PART_4 || p.COASTAL_PROSE_PART_5 || p.COASTAL_PROSE_PART_6 ||
        p.COASTAL_PROSE_PART_7 || p.COASTAL_PROSE_PART_8 || p.COASTAL_PROSE_PART_9 ||
        p.COASTAL_PROSE_PART_10 || {}))),

    lighthouse_signal: () => Promise.all([
        import('../data/scenarios/lighthouse_signal/prose_01.mjs'),
        import('../data/scenarios/lighthouse_signal/prose_02.mjs'),
        import('../data/scenarios/lighthouse_signal/prose_03.mjs'),
        import('../data/scenarios/lighthouse_signal/prose_04.mjs'),
        import('../data/scenarios/lighthouse_signal/prose_05.mjs'),
        import('../data/scenarios/lighthouse_signal/prose_06.mjs'),
        import('../data/scenarios/lighthouse_signal/prose_07.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.LIGHTHOUSE_PROSE_PART_1 || p.LIGHTHOUSE_PROSE_PART_2 || p.LIGHTHOUSE_PROSE_PART_3 ||
        p.LIGHTHOUSE_PROSE_PART_4 || p.LIGHTHOUSE_PROSE_PART_5 || p.LIGHTHOUSE_PROSE_PART_6 ||
        p.LIGHTHOUSE_PROSE_PART_7 || {}))),

    missing_child: () => Promise.all([
        import('../data/scenarios/missing_child/prose_01.mjs'),
        import('../data/scenarios/missing_child/prose_02.mjs'),
        import('../data/scenarios/missing_child/prose_03.mjs'),
        import('../data/scenarios/missing_child/prose_04.mjs'),
        import('../data/scenarios/missing_child/prose_05.mjs'),
        import('../data/scenarios/missing_child/prose_06.mjs'),
        import('../data/scenarios/missing_child/prose_07.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.MISSING_CHILD_PROSE_PART_1 || p.MISSING_CHILD_PROSE_PART_2 || p.MISSING_CHILD_PROSE_PART_3 ||
        p.MISSING_CHILD_PROSE_PART_4 || p.MISSING_CHILD_PROSE_PART_5 || p.MISSING_CHILD_PROSE_PART_6 ||
        p.MISSING_CHILD_PROSE_PART_7 || {}))),

    train_to_nowhere: () => Promise.all([
        import('../data/scenarios/train_to_nowhere/prose_01.mjs'),
        import('../data/scenarios/train_to_nowhere/prose_02.mjs'),
        import('../data/scenarios/train_to_nowhere/prose_03.mjs'),
        import('../data/scenarios/train_to_nowhere/prose_04.mjs'),
        import('../data/scenarios/train_to_nowhere/prose_05.mjs'),
        import('../data/scenarios/train_to_nowhere/prose_06.mjs'),
        import('../data/scenarios/train_to_nowhere/prose_07.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.TRAIN_PROSE_PART_1 || p.TRAIN_PROSE_PART_2 || p.TRAIN_PROSE_PART_3 ||
        p.TRAIN_PROSE_PART_4 || p.TRAIN_PROSE_PART_5 || p.TRAIN_PROSE_PART_6 ||
        p.TRAIN_PROSE_PART_7 || {}))),

    university_occult: () => Promise.all([
        import('../data/scenarios/university_occult/prose_01.mjs'),
        import('../data/scenarios/university_occult/prose_02.mjs'),
        import('../data/scenarios/university_occult/prose_03.mjs'),
        import('../data/scenarios/university_occult/prose_04.mjs'),
        import('../data/scenarios/university_occult/prose_05.mjs'),
        import('../data/scenarios/university_occult/prose_06.mjs'),
        import('../data/scenarios/university_occult/prose_07.mjs'),
    ]).then(parts => Object.assign({}, ...parts.map(p =>
        p.UNIVERSITY_PROSE_PART_1 || p.UNIVERSITY_PROSE_PART_2 || p.UNIVERSITY_PROSE_PART_3 ||
        p.UNIVERSITY_PROSE_PART_4 || p.UNIVERSITY_PROSE_PART_5 || p.UNIVERSITY_PROSE_PART_6 ||
        p.UNIVERSITY_PROSE_PART_7 || {}))),
};

const _proseCache = {};

async function loadProseBank(scenarioId) {
    if (_proseCache[scenarioId]) return _proseCache[scenarioId];
    const loader = _proseImports[scenarioId];
    if (!loader) return null;
    try {
        const bank = await loader();
        _proseCache[scenarioId] = bank;
        return bank;
    } catch (e) {
        console.warn('[prose_bridge] Failed to load prose bank for', scenarioId, e);
        return null;
    }
}

/**
 * @param {string} narrative
 * @param {string[]} proseKeys
 * @param {object} proseBank
 * @param {{ awaitingSkillCheck?: boolean }} [gateOpts]
 * @returns {{ visible: string, deferred: string, judgmentParas: { index: number, text: string }[], hasJudgment: boolean }}
 */
export function enrichNarrativeGated(narrative, proseKeys, proseBank, gateOpts = {}) {
    const base = String(narrative || '');
    let full = base;
    if (proseBank && proseKeys && proseKeys.length) {
        for (const key of proseKeys) {
            const text = proseBank[key];
            if (text && typeof text === 'string' && text.length > 50) {
                const bankText = String(text).trim();
                const baseText = base.trim();
                if (baseText && baseText.includes(bankText)) {
                    // Node already inlines the bank prose (all built-in ESM scenarios): prepending
                    // it again showed every node twice.
                    full = base;
                } else if (baseText && bankText.includes(baseText)) {
                    // Node text is a fragment of the bank prose: show the bank prose once.
                    full = bankText;
                } else {
                    // Short stub narrative: original bank text + stub; keep blank-line paragraph breaks.
                    full = `${bankText}\n\n${base}`.trim();
                }
                break;
            }
        }
    }
    const part = partitionNarrationByJudgment(full, gateOpts);
    const visible = part.before || (part.hasJudgment ? '' : full);
    return {
        visible: visible || base,
        deferred: part.after || '',
        judgmentParas: part.judgmentParas,
        hasJudgment: part.hasJudgment
    };
}

/** @deprecated Prefer enrichNarrativeGated */
export function sanitizePlayerFacingProse(text) {
    return sanitizeNarrationForPlayer(text);
}

function enrichNarrative(narrative, proseKeys, proseBank, gateOpts = {}) {
    return enrichNarrativeGated(narrative, proseKeys, proseBank, gateOpts).visible;
}

function enrichNarrativeSync(narrative, proseKeys, scenarioId, gateOpts = {}) {
    const bank = _proseCache[scenarioId];
    if (!bank) {
        const part = partitionNarrationByJudgment(String(narrative || ''), gateOpts);
        return part.before || String(narrative || '');
    }
    return enrichNarrative(narrative, proseKeys, bank, gateOpts);
}

function enrichNarrativeGatedSync(narrative, proseKeys, scenarioId, gateOpts = {}) {
    const bank = _proseCache[scenarioId];
    if (!bank) {
        const part = partitionNarrationByJudgment(String(narrative || ''), gateOpts);
        return {
            visible: part.before || String(narrative || ''),
            deferred: part.after || '',
            judgmentParas: part.judgmentParas,
            hasJudgment: part.hasJudgment
        };
    }
    return enrichNarrativeGated(narrative, proseKeys, bank, gateOpts);
}

export const CoCProseBridge = {
    loadProseBank,
    enrichNarrative,
    enrichNarrativeSync,
    enrichNarrativeGated,
    enrichNarrativeGatedSync,
    sanitizePlayerFacingProse,
    partitionNarrationByJudgment,
    hasProseBank(scenarioId) {
        return !!_proseImports[scenarioId];
    },
    getScenarioIds() {
        return Object.keys(_proseImports);
    }
};
