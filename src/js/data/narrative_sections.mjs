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

/** Regex source matching the header of any section except the dice section. */
export const NON_DICE_SECTION_PATTERN = Object.keys(NARRATIVE_SECTIONS)
    .filter((phase) => phase !== 'dicePhase').map(sectionHeaderPattern).join('|');
