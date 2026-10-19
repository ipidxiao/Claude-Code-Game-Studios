/**
 * Shell Phase 2/4b/R29.11 — per-screen side-effect barrel.
 *
 * Order:
 *   1) lobby  — scenario packs / store / PDF / char_creator
 *   2) shared — tables / KP / AI / toast (story_opening via state/core)
 *   3) story  — marker only; runner deferred (ensure_runner); UI via ViewStory
 */
import './shell_side_effects_lobby.mjs';
import './shell_side_effects_shared.mjs';
import './shell_side_effects_story.mjs';
