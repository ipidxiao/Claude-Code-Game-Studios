// AI narrative output protocol — DICE → STORY → NARRATION → INTERACTION → ACTION_ORDER

import { KP_PROTOCOL } from '../data/kp_protocol.mjs';
import { isDryNarrative } from '../data/narrative_prose.mjs';
import { sectionHeaderPattern } from '../data/narrative_sections.mjs';

const header = (phase, extra) => new RegExp(sectionHeaderPattern(phase) + '|' + extra, 'i');
const PHASE_MARKERS = {
    dicePhase: [header('dicePhase', 'DICE_PHASE|\\[骰子\\]'), /\d+D\d+/i, /检定.*\d+\/\d+/],
    storyPhase: [header('storyPhase', 'STORY_PHASE|\\[叙事\\]')],
    narrationPhase: [header('narrationPhase', 'NARRATION_PHASE|\\[旁白\\]')],
    interactionPhase: [header('interactionPhase', 'INTERACTION_PHASE|\\[交互\\]'), /可见线索|可互动|interactive/i],
    actionOrderPhase: [header('actionOrderPhase', 'ACTION_ORDER|\\[行动\\]'), /[A-Z]\d+(-[A-Z]\d+)+/]
};

const REPHRASE_HINT = '\n\n【系统】输出未符合 KP 五段协议。请按顺序重写：【骰子】→【叙事】→【旁白】→【交互】→【行动】（如 A1-B2）。';

function detectPhase(text, patterns) {
    if (!text) return false;
    return patterns.some((p) => p.test(text));
}

/**
 * @param {string} text
 * @returns {{ dicePhase: string, storyPhase: string, narrationPhase: string, interactionPhase: string, actionOrderPhase: string, raw: string }}
 */
export function parseAIResponse(text) {
    const raw = String(text || '');
    const sections = {
        dicePhase: '',
        storyPhase: '',
        narrationPhase: '',
        interactionPhase: '',
        actionOrderPhase: '',
        raw
    };
    if (!raw.trim()) return sections;

    const tagged = raw.split(/(?=【(?:骰子|叙事|旁白|交互|行动)】)/);
    if (tagged.length > 1) {
        tagged.forEach((chunk) => {
            if (/^【骰子】/.test(chunk)) sections.dicePhase = chunk.replace(/^【骰子】\s*/, '').trim();
            else if (/^【叙事】/.test(chunk)) sections.storyPhase = chunk.replace(/^【叙事】\s*/, '').trim();
            else if (/^【旁白】/.test(chunk)) sections.narrationPhase = chunk.replace(/^【旁白】\s*/, '').trim();
            else if (/^【交互】/.test(chunk)) sections.interactionPhase = chunk.replace(/^【交互】\s*/, '').trim();
            else if (/^【行动】/.test(chunk)) sections.actionOrderPhase = chunk.replace(/^【行动】\s*/, '').trim();
        });
        return sections;
    }

    // Heuristic split: paragraphs
    const paras = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (paras.length >= 1) sections.storyPhase = paras[0];
    if (paras.length >= 2) sections.narrationPhase = paras[1];
    if (paras.length >= 3) sections.interactionPhase = paras[2];
    if (paras.length >= 4) sections.actionOrderPhase = paras[3];
    if (detectPhase(raw, PHASE_MARKERS.dicePhase)) {
        const diceMatch = raw.match(/(.{0,120}\d+D\d+.{0,120})/);
        if (diceMatch) sections.dicePhase = diceMatch[1].trim();
    }
    return sections;
}

/**
 * @param {ReturnType<typeof parseAIResponse>} parsed
 * @param {{ strict?: boolean }} [opts]
 */
export function validateOutputStructure(parsed, opts = {}) {
    const order = (KP_PROTOCOL.OUTPUT_PROTOCOL && KP_PROTOCOL.OUTPUT_PROTOCOL.STEP_ORDER) || [];
    const strict = opts.strict !== false;
    const missing = [];
    const hasTagged = /【骰子】|【叙事】|【旁白】|【交互】|【行动】/.test(parsed.raw || '');

    if (hasTagged) {
        if (!parsed.dicePhase && strict) missing.push('DICE_PHASE');
        if (!parsed.storyPhase) missing.push('STORY_PHASE');
        if (!parsed.narrationPhase && strict) missing.push('NARRATION_PHASE');
        if (!parsed.interactionPhase && strict) missing.push('INTERACTION_PHASE');
        if (!parsed.actionOrderPhase && strict) missing.push('ACTION_ORDER_PHASE');
        if (parsed.storyPhase && isDryNarrative(parsed.storyPhase)) missing.push('STORY_PROSE_QUALITY');
    } else {
        if (!parsed.storyPhase) missing.push('STORY_PHASE');
        if (parsed.storyPhase && isDryNarrative(parsed.storyPhase)) missing.push('STORY_PROSE_QUALITY');
        if (strict && !parsed.actionOrderPhase && !detectPhase(parsed.raw, PHASE_MARKERS.actionOrderPhase)) {
            missing.push('ACTION_ORDER_PHASE');
        }
    }

    return {
        ok: missing.length === 0,
        missing,
        stepOrder: order
    };
}

function autoRestructure(raw) {
    const text = String(raw || '').trim();
    if (!text) return text;

    const hasTagged = /【(?:骰子|叙事|旁白|交互|行动)】/.test(text);
    if (hasTagged) {
        const parsed = parseAIResponse(text);
        const parts = [];
        if (parsed.dicePhase || /\d+D\d+|\d+\/\d+/.test(text)) {
            parts.push('【骰子】\n' + (parsed.dicePhase || '（本回合无检定）'));
        } else {
            parts.push('【骰子】\n（本回合无检定）');
        }
        parts.push('【叙事】\n' + (parsed.storyPhase || text.replace(/【[^】]+】/g, '').trim().slice(0, 200) || '（叙事段落）'));
        if (parsed.narrationPhase) parts.push('【旁白】\n' + parsed.narrationPhase);
        parts.push('【交互】\n' + (parsed.interactionPhase || '（场景中的可调查对象与可见异常）'));
        parts.push('【行动】\n' + (parsed.actionOrderPhase || (text.match(/[A-Z]\d+(-[A-Z]\d+)+/) || ['A1'])[0]));
        return parts.join('\n\n');
    }

    const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const dice = paras.find((p) => /\d+D\d+|\d+\/\d+/.test(p)) || '';
    const action = paras.find((p) => /[A-Z]\d+(-[A-Z]\d+)+/.test(p)) || 'A1';
    const rest = paras.filter((p) => p !== dice && p !== action);
    const story = rest[0] || text.slice(0, 200);
    const narration = rest[1] || '';
    const interaction = rest[2] || '（场景中的可调查对象与可见异常）';
    const parts = [];
    if (dice) parts.push('【骰子】\n' + dice);
    parts.push('【叙事】\n' + story);
    if (narration) parts.push('【旁白】\n' + narration);
    parts.push('【交互】\n' + interaction);
    parts.push('【行动】\n' + action);
    return parts.join('\n\n');
}

/**
 * @param {string} raw
 * @param {{ autoFix?: boolean }} [opts]
 */
export function restructureOrReject(raw, opts = {}) {
    const parsed = parseAIResponse(raw);
    const validation = validateOutputStructure(parsed, opts);
    if (validation.ok) {
        return { ok: true, text: raw, parsed, validation, restructured: false };
    }
    if (opts.autoFix !== false) {
        const fixed = autoRestructure(raw);
        const reparsed = parseAIResponse(fixed);
        const revalidation = validateOutputStructure(reparsed, { strict: false });
        if (revalidation.ok || reparsed.storyPhase) {
            return {
                ok: true,
                text: fixed,
                parsed: reparsed,
                validation: revalidation,
                restructured: true,
                hint: REPHRASE_HINT
            };
        }
    }
    return {
        ok: false,
        text: raw,
        parsed,
        validation,
        restructured: false,
        repromptMessage: REPHRASE_HINT + '\n缺失段落：' + validation.missing.join('、')
    };
}

export const CoCOutputProtocol = {
    parseAIResponse,
    validateOutputStructure,
    restructureOrReject,
    REPHRASE_HINT
};

if (typeof window !== 'undefined') {
    window.CoCOutputProtocol = CoCOutputProtocol;
}
