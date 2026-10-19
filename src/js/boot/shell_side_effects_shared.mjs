/**
 * Shell Phase 2 — SHARED side-effects (eager).
 * Data tables, KP engines, AI protocol helpers, chrome.
 * Used by lobby + story + tools; not screen-specific UI.
 */

import '../data/mythos_tomes.mjs';
import '../data/spells.mjs';
import '../data/injury_tables.mjs';
import '../data/npc_templates.mjs';
import '../data/insanity_tables.mjs';
import '../data/kp_protocol.mjs';
import '../data/antagonist_rules.mjs';
import '../data/campaigns/language_self_correction.mjs';
import '../state/kp_config.mjs';
import '../campaign/kp_execution_engine.mjs';
import '../campaign/kp_game_loop.mjs';
import '../state/pressure_bus.mjs';
import '../data/display_pipeline.mjs';
import '../data/session_manifest.mjs';
import '../data/encounter_verdict.mjs';
import '../data/timeline_contract.mjs';
import '../data/logger.mjs';
import '../data/utils.mjs';
import '../state/selection.mjs';
import '../ai/network.mjs';
import '../ai/tool_dispatch.mjs';
import '../ai/language_filter.mjs';
import '../ai/output_protocol.mjs';
import '../data/ai_prompt_config.mjs';
import '../components/ui_feedback.mjs';
