/**
 * Immersive narrative prose standards — shared by online AI KP and offline scenario authoring.
 *
 * Role division (local + online):
 * - 旁白 Narration: scene / story / 灌水 (original paragraph breaks preserved)
 * - 引擎 Engine: check prompts + numeric results
 * - KP: announces AFTER engine results; deferred plot after 判定 is gated until then
 */

export const IMMERSIVE_PROSE_MIN_CHARS = 100;

export const DRY_NARRATIVE_PATTERNS = [
    /受到惊吓/,
    /然后(?:就)?(?:没了|结束|离开|消失了?)/,
    /^(?:某|该)[\u4e00-\u9fff]{1,4}(?:受到|开始|停止|离开)/,
    /^(?:锁芯|门|窗|抽屉)[^。！？]{0,24}[。！？]?$/,
    /^你从[^。]{0,12}(?:窥视|观察|查看)[。！？]?$/,
    /^[^。！？]{1,14}已经(?:生锈|锁着|关闭)[。！？]?$/
];

/** Paragraph / sentence contains a judgment / skill-check statement (gate point). */
export const JUDGMENT_PARAGRAPH_RE = /若.{0,24}检定|检定成功|检定失败|进行.{0,8}检定|请.{0,6}检定|请进行【|掷骰|掷出|力量检定|侦查检定|聆听检定|心理学检定|灵感检定|潜行检定|无论分支|同时结算|失败分支|成功分支|若成功|若失败|成功则|失败则|检定.{0,8}(?:成功|失败)/;

/** Softer spoilers used when the node awaits a skillCheck / branch but keywords are weak. */
export const SKILL_OUTCOME_SPOILER_RE = /检定成功|检定失败|若成功|若失败|成功则|失败则|失败时|成功时|大成功|大失败|无论分支|同时结算/;

export const DEFERRED_NARRATIVE_HINT = '⏳ 后续剧情待检定完成后解锁。';

export const ROLE_DIVISION_RULES = `
【职能分工 — 旁白 / 引擎 / KP（强制）】
1. 旁白：描写场景与故事；保留原文换行与灌水；不改写段落排版。
2. 含判定语句的段落须标记；判定段及之后的剧情截断，待引擎检定完成后再由 KP 放出。
3. 引擎：掷骰与数值；出示「请进行【××】检定」及结果数据。
4. KP：引擎出结果后宣布后果，并释放被截断的后续旁白。`;

export const IMMERSIVE_PROSE_PROMPT = `
【叙事铁律 — 小说级沉浸（强制）】
1. 每一段剧情必须是完成度极高的恐怖小说正文。
2. 每段正文不少于一百字；须含场景锚点、动作/声音、人物反应、悬念余韵。
3. 第二人称或限知视角；禁止电报体/Wiki摘要。
4. 对话嵌入动作神态。
5. 旁白不得预写检定双边结果；检定提示属引擎，宣布属 KP。
6. 成败后果写清感官余波。
${ROLE_DIVISION_RULES}`;

export const NARRATIVE_REPROMPT_BLOCK = `
【系统·叙事质量】请按小说正文重写旁白；禁止预写检定双边结果；检定提示属引擎，宣布属 KP。`;

/**
 * Split text into paragraphs, preserving original breaks.
 * Prefers blank-line separated blocks; falls back to single newlines for long slabs.
 * @param {string} text
 * @returns {string[]}
 */
export function splitNarrationParagraphs(text) {
    const raw = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!raw) return [];
    let parts = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1 && raw.length > 400) {
        parts = raw.split(/\n/).map((p) => p.trim()).filter(Boolean);
    }
    return parts;
}

export function isJudgmentParagraph(para) {
    const s = String(para || '').trim();
    if (!s) return false;
    return JUDGMENT_PARAGRAPH_RE.test(s);
}

export function isSkillOutcomeSpoiler(text) {
    return SKILL_OUTCOME_SPOILER_RE.test(String(text || ''));
}

/** Split a paragraph into sentences (keeps trailing punctuation on each piece). */
export function splitIntoSentences(para) {
    const s = String(para || '').trim();
    if (!s) return [];
    const parts = s.split(/(?<=[。！？])/);
    return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * If a judgment keyword sits mid-paragraph, cut before that sentence.
 * Soft spoilers (成败分支字样) only apply when awaitingSkillCheck.
 * @returns {{ before: string, judgment: string, after: string }|null}
 */
export function cutMidParagraphJudgment(para, options = {}) {
    const awaiting = !!options.awaitingSkillCheck;
    const sentences = splitIntoSentences(para);
    const isGateSentence = (sent) =>
        isJudgmentParagraph(sent) || (awaiting && isSkillOutcomeSpoiler(sent));

    if (sentences.length <= 1) {
        if (isGateSentence(para) || isJudgmentParagraph(para)) {
            return { before: '', judgment: String(para || '').trim(), after: '' };
        }
        return null;
    }
    const before = [];
    for (let i = 0; i < sentences.length; i++) {
        const sent = sentences[i];
        if (isGateSentence(sent)) {
            return {
                before: before.join(''),
                judgment: sent,
                after: sentences.slice(i + 1).join('')
            };
        }
        before.push(sent);
    }
    if (isJudgmentParagraph(para)) {
        return { before: '', judgment: para, after: '' };
    }
    return null;
}

/**
 * Mark judgment paragraphs and gate everything after the first cut.
 * before = playable旁白 now; after = deferred until check completes.
 * Judgment sentences themselves are not shown as旁白 (引擎负责提示).
 *
 * @param {string} text original prose (formatting preserved in before/after via \\n\\n)
 * @param {{ awaitingSkillCheck?: boolean }} [options]
 * @returns {{ before: string, after: string, judgmentParas: { index: number, text: string }[], hasJudgment: boolean }}
 */
export function partitionNarrationByJudgment(text, options = {}) {
    const paras = splitNarrationParagraphs(text);
    if (!paras.length) {
        return { before: '', after: '', judgmentParas: [], hasJudgment: false };
    }

    const awaiting = !!options.awaitingSkillCheck;
    const judgmentParas = [];
    const beforeParts = [];
    let deferredParts = [];
    let gated = false;

    for (let i = 0; i < paras.length; i++) {
        const para = paras[i];
        if (gated) {
            deferredParts.push(para);
            continue;
        }

        const cut = cutMidParagraphJudgment(para, options);
        const wholeIsJudgment = isJudgmentParagraph(para);
        const softSpoiler = awaiting && isSkillOutcomeSpoiler(para) && !cut;

        if (cut) {
            if (cut.before) beforeParts.push(cut.before);
            judgmentParas.push({ index: i, text: cut.judgment || para });
            if (cut.after) deferredParts.push(cut.after);
            deferredParts = deferredParts.concat(paras.slice(i + 1));
            gated = true;
            break;
        }

        if (wholeIsJudgment || softSpoiler) {
            judgmentParas.push({ index: i, text: para });
            deferredParts = paras.slice(i + 1);
            gated = true;
            break;
        }

        beforeParts.push(para);
    }

    if (!gated) {
        return {
            before: paras.join('\n\n'),
            after: '',
            judgmentParas: [],
            hasJudgment: false
        };
    }

    return {
        before: beforeParts.join('\n\n'),
        after: deferredParts.join('\n\n'),
        judgmentParas,
        hasJudgment: true
    };
}

/** @deprecated Use partitionNarrationByJudgment — kept for callers expecting a string filter. */
export function sanitizeNarrationForPlayer(text) {
    const { before } = partitionNarrationByJudgment(text);
    return before || String(text || '').trim();
}

/**
 * @param {string} text
 * @param {{minChars?:number}} [opts] minChars: shorter bodies count as dry (default IMMERSIVE_PROSE_MIN_CHARS,
 *   for AI narration). Built-in scenario nodes are audited with a lower floor: a terse hand-written scene
 *   beats padding to a length (narrative_immersion_smoke).
 */
export function isDryNarrative(text, opts = {}) {
    const minChars = Number.isFinite(opts.minChars) ? opts.minChars : IMMERSIVE_PROSE_MIN_CHARS;
    const raw = String(text || '').trim();
    if (!raw) return true;

    const body = raw
        .replace(/【结局[^】]*】[\s\S]*/g, '')
        .replace(/【教程[^】]*】[\s\S]*/g, '')
        .trim();
    if (!body) return false;
    if (body.length < minChars) return true;
    if (DRY_NARRATIVE_PATTERNS.some((re) => re.test(body))) return true;

    const sentences = body.split(/[。！？…]+/).map((s) => s.trim()).filter((s) => s.length > 1);
    if (sentences.length === 1 && body.length < 52) return true;

    if (body.length < 64) {
        const sensory = /(?:看见|听见|闻到|触|感到|雾|光|声|冷|湿|咸|腥|暗|风|滴|影|呼吸|心跳|颤抖|低语|潮湿|霉|盐|烛|雨|夜)/;
        if (!sensory.test(body)) return true;
    }
    return false;
}

export function validateStoryProse(text) {
    if (isDryNarrative(text)) {
        return { ok: false, reason: 'narrative_too_dry_or_short' };
    }
    return { ok: true };
}

export function buildImmersiveProsePromptBlock() {
    return IMMERSIVE_PROSE_PROMPT;
}

export function buildNarrativeRepromptBlock() {
    return NARRATIVE_REPROMPT_BLOCK;
}

export function buildRoleDivisionPromptBlock() {
    return ROLE_DIVISION_RULES;
}

export const CoCNarrativeProse = {
    IMMERSIVE_PROSE_MIN_CHARS,
    DRY_NARRATIVE_PATTERNS,
    JUDGMENT_PARAGRAPH_RE,
    SKILL_OUTCOME_SPOILER_RE,
    DEFERRED_NARRATIVE_HINT,
    ROLE_DIVISION_RULES,
    IMMERSIVE_PROSE_PROMPT,
    NARRATIVE_REPROMPT_BLOCK,
    splitNarrationParagraphs,
    splitIntoSentences,
    cutMidParagraphJudgment,
    isJudgmentParagraph,
    isSkillOutcomeSpoiler,
    partitionNarrationByJudgment,
    sanitizeNarrationForPlayer,
    isDryNarrative,
    validateStoryProse,
    buildImmersiveProsePromptBlock,
    buildNarrativeRepromptBlock,
    buildRoleDivisionPromptBlock
};

if (typeof window !== 'undefined') {
    window.CoCNarrativeProse = CoCNarrativeProse;
}
