/**
 * Shell Phase 4b/R29.11 — story side-effects marker (no eager imports).
 *
 * - runner / group_check: lazy via js/scenario/ensure_runner.mjs (lobby/creator await)
 * - story_opening: loaded with state/core for freeplay switchScreen
 * - story_* UI: ViewStory async import graph
 */
export const STORY_SIDE_EFFECTS = {
    runnerEager: false,
    runnerDeferred: true,
    storyUiDeferred: true,
    storyOpeningViaShared: true,
    note: 'runner+group_check via ensureScenarioRunner; story_opening via state/core; story_* via ViewStory'
};
