/**
 * The five-section narration protocol's section titles, including the aliases the protocol
 * accepts. The single definition: ai/output_protocol.mjs detects sections with it and
 * state/visibility.mjs uses it to find where the 【骰子】 section ends (audit 2026-10-18 N3).
 */
export const NARRATIVE_SECTIONS = Object.freeze({
    dicePhase: Object.freeze(['骰子', '判定']),
    storyPhase: Object.freeze(['叙事', '故事']),
    narrationPhase: Object.freeze(['旁白', '描述']),
    interactionPhase: Object.freeze(['交互', '线索']),
    actionOrderPhase: Object.freeze(['行动'])
});

/** `【a】|【b】` for the titles of one section. */
export const sectionHeaderPattern = (phase) => NARRATIVE_SECTIONS[phase].map((t) => '【' + t + '】').join('|');

/** Every section title except the dice section's. */
export const NON_DICE_SECTION_TITLES = Object.freeze(Object.entries(NARRATIVE_SECTIONS)
    .filter(([phase]) => phase !== 'dicePhase').flatMap(([, titles]) => titles));
