/**
 * The five-section narration protocol's section headers: the 【…】 titles and the ASCII / English
 * aliases the protocol also accepts. The single definition: ai/output_protocol.mjs detects
 * sections with it and state/visibility.mjs uses it to find where the 【骰子】 section ends
 * (audit 2026-10-18 N3; aliases A5).
 */
export const NARRATIVE_SECTIONS = Object.freeze({
    dicePhase: Object.freeze(['骰子', '判定']),
    storyPhase: Object.freeze(['叙事', '故事']),
    narrationPhase: Object.freeze(['旁白', '描述']),
    interactionPhase: Object.freeze(['交互', '线索']),
    actionOrderPhase: Object.freeze(['行动'])
});

/** Other spellings of each section's header, written literally. */
export const NARRATIVE_SECTION_ALIASES = Object.freeze({
    dicePhase: Object.freeze(['DICE_PHASE', '[骰子]']),
    storyPhase: Object.freeze(['STORY_PHASE', '[叙事]']),
    narrationPhase: Object.freeze(['NARRATION_PHASE', '[旁白]']),
    interactionPhase: Object.freeze(['INTERACTION_PHASE', '[交互]']),
    actionOrderPhase: Object.freeze(['ACTION_ORDER', '[行动]'])
});

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex source matching any header of one section: its 【titles】 and its aliases. */
export const sectionHeaderPattern = (phase) => [
    ...NARRATIVE_SECTIONS[phase].map((t) => '【' + t + '】'),
    ...NARRATIVE_SECTION_ALIASES[phase]
].map(escape).join('|');

/**
 * What the keeper's reply looks like, told to the model in the same words the display reads
 * (phone test 2026-10-19: the prompt said "ACTION_ORDER（格式如 A2-B1-C1）", the model wrote that
 * label and code list, and the player saw both). The story, then a list of actions in plain words.
 */
export function buildOutputContractPrompt() {
    const story = '【' + NARRATIVE_SECTIONS.storyPhase[0] + '】';
    const action = '【' + NARRATIVE_SECTIONS.actionOrderPhase[0] + '】';
    return `
【回复格式（强制）】
${story}
小说正文。一段写一个画面或一个动作；人物说的话单独成段，带上说话时的动作或神情；长的话拆成几段，中间穿插动作与环境。段落长短随内容，不凑字数。
正文里不写技能名、检定、骰子、选项、编号，也不写"你可以选择……"——那些由引擎和下方的行动列表呈现。
${action}
每行一个调查员此刻能做的具体行动，2 到 5 行，以"1. "开头，用动作写（如"1. 掀开客厅的湿窗帘"），不写字母或代码。
全部用简体中文书写，不出现英文单词；人物与地点用名册和剧本里已有的名字。`;
}

/** Regex source matching the header of any section except the dice section. */
export const NON_DICE_SECTION_PATTERN = Object.keys(NARRATIVE_SECTIONS)
    .filter((phase) => phase !== 'dicePhase').map(sectionHeaderPattern).join('|');
