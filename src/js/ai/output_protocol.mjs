// AI narrative output protocol — the keeper's reply is 【叙事】 story, then 【行动】 a list of actions.
// The prompt states the same contract (narrative_sections.buildOutputContractPrompt). Replies may
// still carry 【骰子】/【旁白】/【交互】 or a header's English alias ("ACTION_ORDER："); all are read
// the same way, so no header ever reaches the player as text (phone test 2026-10-19).

import { KP_PROTOCOL } from '../data/kp_protocol.mjs';
import { isDryNarrative } from '../data/narrative_prose.mjs';
import { NARRATIVE_SECTIONS, sectionHeaderPattern } from '../data/narrative_sections.mjs';

const PHASES = Object.keys(NARRATIVE_SECTIONS);
// A header starts a line: one of the phase's titles or aliases, optionally "_PHASE", then an optional colon.
const HEADER_RE = new RegExp(
    '^[ \\t]*(?:' + PHASES.map((p) => '(' + sectionHeaderPattern(p) + ')').join('|') + ')(?:_PHASE)?[ \\t]*[:：]?[ \\t]*',
    'gim'
);

// One list item: "1. …", "- …", "（A）…", "A1 …".
const LIST_ITEM_RE = /^\s*(?:[-*•]\s*|\d+\s*[.)、．]\s*|[（(][A-Za-z\d][)）]\s*|[A-Z]\d*\s*[.)、．:：]\s*|[A-Z]\d+\s+)(.+)$/;

const REPHRASE_HINT = '\n\n【系统】回复未按格式：请先写【叙事】小说正文，再写【行动】列表（每行"1. 具体行动"）。';

/** The trailing run of list lines of a block of text, and what comes before it. */
function splitTrailingList(text) {
    const lines = String(text || '').split('\n');
    let i = lines.length;
    while (i > 0 && !lines[i - 1].trim()) i--;
    const end = i;
    while (i > 0 && LIST_ITEM_RE.test(lines[i - 1])) i--;
    if (i === end) return { body: String(text || '').trim(), list: '' };
    return { body: lines.slice(0, i).join('\n').trim(), list: lines.slice(i, end).join('\n').trim() };
}

/**
 * @param {string} text
 * @returns {{ dicePhase: string, storyPhase: string, narrationPhase: string, interactionPhase: string, actionOrderPhase: string, raw: string, tagged: boolean }}
 */
export function parseAIResponse(text) {
    const raw = String(text || '');
    const sections = {
        dicePhase: '',
        storyPhase: '',
        narrationPhase: '',
        interactionPhase: '',
        actionOrderPhase: '',
        raw,
        tagged: false
    };
    if (!raw.trim()) return sections;

    const heads = [...raw.matchAll(HEADER_RE)];
    if (!heads.length) {
        const { body, list } = splitTrailingList(raw);
        sections.storyPhase = body;
        sections.actionOrderPhase = list;
        return sections;
    }
    sections.tagged = true;
    // Prose before the first header is story.
    const lead = raw.slice(0, heads[0].index).trim();
    const story = lead ? [lead] : [];
    heads.forEach((m, k) => {
        const phase = PHASES[m.slice(1).findIndex((g) => g !== undefined)];
        const body = raw.slice(m.index + m[0].length, k + 1 < heads.length ? heads[k + 1].index : raw.length).trim();
        if (phase === 'storyPhase') story.push(body);
        else sections[phase] = [sections[phase], body].filter(Boolean).join('\n');
    });
    sections.storyPhase = story.filter(Boolean).join('\n\n');
    return sections;
}

/**
 * @param {ReturnType<typeof parseAIResponse>} parsed
 * @param {{ strict?: boolean }} [opts] strict: the action list is required too
 */
export function validateOutputStructure(parsed, opts = {}) {
    const order = (KP_PROTOCOL.OUTPUT_PROTOCOL && KP_PROTOCOL.OUTPUT_PROTOCOL.STEP_ORDER) || [];
    const strict = opts.strict !== false;
    const missing = [];
    if (!parsed.storyPhase) missing.push('STORY_PHASE');
    else if (isDryNarrative(parsed.storyPhase)) missing.push('STORY_PROSE_QUALITY');
    if (strict && !parsed.actionOrderPhase) missing.push('ACTION_ORDER_PHASE');
    if (!parsed.tagged && !missing.length) missing.push('SECTION_HEADERS');
    return { ok: missing.length === 0, missing, stepOrder: order };
}

/** The reply rewritten under the two headers, nothing invented. */
function autoRestructure(raw) {
    const parsed = parseAIResponse(raw);
    const parts = [];
    if (parsed.dicePhase) parts.push('【骰子】\n' + parsed.dicePhase);
    if (parsed.storyPhase) parts.push('【叙事】\n' + parsed.storyPhase);
    if (parsed.narrationPhase) parts.push('【旁白】\n' + parsed.narrationPhase);
    if (parsed.interactionPhase) parts.push('【交互】\n' + parsed.interactionPhase);
    if (parsed.actionOrderPhase) parts.push('【行动】\n' + parsed.actionOrderPhase);
    return parts.join('\n\n') || String(raw || '');
}

/**
 * @param {string} raw
 * @param {{ autoFix?: boolean, strict?: boolean }} [opts]
 */
export function restructureOrReject(raw, opts = {}) {
    const parsed = parseAIResponse(raw);
    const validation = validateOutputStructure(parsed, opts);
    if (validation.ok) {
        return { ok: true, text: raw, parsed, validation, restructured: false };
    }
    if (opts.autoFix !== false && parsed.storyPhase) {
        const fixed = autoRestructure(raw);
        const reparsed = parseAIResponse(fixed);
        return {
            ok: true,
            text: fixed,
            parsed: reparsed,
            validation: validateOutputStructure(reparsed, { strict: false }),
            restructured: true,
            hint: REPHRASE_HINT
        };
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
