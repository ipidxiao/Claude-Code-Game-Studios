/**
 * Shell Phase 2 — LOBBY / pre-story side-effects (eager).
 * Scenario packs, store, PDF import, character creator IIFE.
 * Loaded before shared campaign tables in the barrel? No — barrel order:
 *   lobby scenarios → shared (tables/kp/ai) → story
 * Creator runs after store; needs Engine/State from app named imports (already evaluated).
 */

import '../data/scenarios/builtins.mjs';
import '../data/scenarios/remote_catalog.mjs';
import '../data/scenarios/catalog.mjs';
import '../scenario/pdf_import.mjs';
import '../scenario/store.mjs';
import '../components/char_creator.mjs';
