// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * Service Worker — offline caching for CoC Engine.
 *
 * Caches all static assets on first load, serves from cache thereafter.
 * AI API calls (DeepSeek/OpenAI) are not intercepted — they require network.
 */

const CACHE_NAME = 'coc-engine-v18.8.0-1fc93402';

const ASSETS = [
    'index.html',
    'manifest.json',
    'favicon.svg',
    'css/icons.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-512-maskable.png',
    'sw.js',
    'css/style.css',
    'vendor/vue.global.prod.js',
    'vendor/bootstrap.min.css',
    'vendor/chart.min.js',
    'vendor/pdf.min.js',
    'vendor/pdf.worker.min.js',
    'vendor/anime.umd.min.js',
    'js/data/scenarios/packages/isolated_lab.json',
    'js/data/scenarios/packages/haunted_inheritance.json',
    'js/data/scenarios/packages/cc_asylum_whispers.json',
    'js/data/scenarios/packages/cc_lighthouse_log.json',
    'js/data/scenarios/packages/cc_museum_night.json',
    'js/data/scenarios/packages/cc_green_vicar.json',
    'js/data/scenarios/packages/cc_white_widow_reef.json',
    'js/data/scenarios/packages/cc_mayvale_blizzard.json',
    'js/audio/sfx.js',
    'js/app.mjs',
    'js/ai/coc_ai_bridge.mjs',
    'js/ai/language_filter.mjs',
    'js/ai/lorebook.mjs',
    'js/ai/narrative_settle_reconcile.mjs',
    'js/ai/network.mjs',
    'js/ai/output_protocol.mjs',
    'js/ai/team_snapshot.mjs',
    'js/ai/tool_dispatch.mjs',
    'js/ai/tool_result_normalize.mjs',
    'js/ai/tool_snapshot.mjs',
    'js/ai_logic.mjs',
    'js/boot/async_views.mjs',
    'js/boot/mount_shell_globals.mjs',
    'js/boot/register_shell_components.mjs',
    'js/boot/shell_side_effects.mjs',
    'js/boot/shell_side_effects_lobby.mjs',
    'js/boot/shell_side_effects_shared.mjs',
    'js/boot/shell_side_effects_story.mjs',
    'js/campaign/group_check.mjs',
    'js/campaign/kp_execution_engine.mjs',
    'js/campaign/kp_game_loop.mjs',
    'js/chat_export.mjs',
    'js/coc.mjs',
    'js/components/action_wheel.mjs',
    'js/components/apex_equip_hud.mjs',
    'js/components/char_creator.mjs',
    'js/components/char_hud_helpers.mjs',
    'js/components/char_portrait.mjs',
    'js/components/chat_format_helpers.mjs',
    'js/components/combat_ui_helpers.mjs',
    'js/components/icon_sprite.mjs',
    'js/components/sanity_effects.mjs',
    'js/components/story_char.mjs',
    'js/components/story_chat.mjs',
    'js/components/story_clues.mjs',
    'js/components/story_combat.mjs',
    'js/components/story_dice.mjs',
    'js/components/story_equip.mjs',
    'js/components/story_growth.mjs',
    'js/components/story_inv.mjs',
    'js/components/story_journal.mjs',
    'js/components/story_map.mjs',
    'js/components/story_npc.mjs',
    'js/components/story_store.mjs',
    'js/components/ui_feedback.mjs',
    'js/core/context_manager.mjs',
    'js/core/extensions.mjs',
    'js/core/globals_registry.mjs',
    'js/data/ai_prompt_config.mjs',
    'js/data/antagonist_rules.mjs',
    'js/data/arc_chapters.mjs',
    'js/data/arc_pressure_copy.mjs',
    'js/data/asylum_care.mjs',
    'js/data/backstory.mjs',
    'js/data/campaigns/language_self_correction.mjs',
    'js/data/capability_decl.mjs',
    'js/data/capability_risk.mjs',
    'js/data/capability_system.mjs',
    'js/data/coverage/load_coverage.mjs',
    'js/data/creative_smoke_catalog.mjs',
    'js/data/creatures_summary.mjs',
    'js/data/credit_lifestyle.mjs',
    'js/data/deprivation.mjs',
    'js/data/desk_pref.mjs',
    'js/data/dev_logs.mjs',
    'js/data/diseases.mjs',
    'js/data/display_pipeline.mjs',
    'js/data/enchantments.mjs',
    'js/data/encounter_seed.mjs',
    'js/data/encounter_verdict.mjs',
    'js/data/experiences.mjs',
    'js/data/injury_tables.mjs',
    'js/data/insanity_tables.mjs',
    'js/data/investigate_outcomes.mjs',
    'js/data/items.mjs',
    'js/data/jobs.mjs',
    'js/data/keeper_style.mjs',
    'js/data/kp_protocol.mjs',
    'js/data/logger.mjs',
    'js/data/mythos_heat_events.mjs',
    'js/data/mythos_tomes.mjs',
    'js/data/narrative_prose.mjs',
    'js/data/narrative_sections.mjs',
    'js/data/npc_credibility.mjs',
    'js/data/npc_templates.mjs',
    'js/data/push_consequences.mjs',
    'js/data/scenarios/abandoned_asylum.mjs',
    'js/data/scenarios/abandoned_asylum/index_prose.mjs',
    'js/data/scenarios/abandoned_asylum/prose_01.mjs',
    'js/data/scenarios/abandoned_asylum/prose_02.mjs',
    'js/data/scenarios/abandoned_asylum/prose_03.mjs',
    'js/data/scenarios/abandoned_asylum/prose_04.mjs',
    'js/data/scenarios/abandoned_asylum/prose_05.mjs',
    'js/data/scenarios/abandoned_asylum/prose_06.mjs',
    'js/data/scenarios/action_checks.mjs',
    'js/data/scenarios/action_checks/abandoned_asylum.mjs',
    'js/data/scenarios/action_checks/alley_to_asphalt.mjs',
    'js/data/scenarios/action_checks/carnival_of_masks.mjs',
    'js/data/scenarios/action_checks/cliff_mist_run.mjs',
    'js/data/scenarios/action_checks/coastal_festival.mjs',
    'js/data/scenarios/action_checks/court_recess.mjs',
    'js/data/scenarios/action_checks/deep_one_shadow.mjs',
    'js/data/scenarios/action_checks/fog_lighthouse_chase.mjs',
    'js/data/scenarios/action_checks/hearing_room.mjs',
    'js/data/scenarios/action_checks/index.mjs',
    'js/data/scenarios/action_checks/lighthouse_night_watch.mjs',
    'js/data/scenarios/action_checks/lighthouse_signal.mjs',
    'js/data/scenarios/action_checks/midnight_museum.mjs',
    'js/data/scenarios/action_checks/missing_child.mjs',
    'js/data/scenarios/action_checks/newsroom_midnight.mjs',
    'js/data/scenarios/action_checks/rain_dock_chase.mjs',
    'js/data/scenarios/action_checks/train_to_nowhere.mjs',
    'js/data/scenarios/action_checks/tutorial.mjs',
    'js/data/scenarios/action_checks/university_occult.mjs',
    'js/data/scenarios/alley_to_asphalt.mjs',
    'js/data/scenarios/builtins.mjs',
    'js/data/scenarios/carnival_of_masks.mjs',
    'js/data/scenarios/carnival_of_masks/index_prose.mjs',
    'js/data/scenarios/carnival_of_masks/prose_01.mjs',
    'js/data/scenarios/carnival_of_masks/prose_02.mjs',
    'js/data/scenarios/carnival_of_masks/prose_03.mjs',
    'js/data/scenarios/carnival_of_masks/prose_04.mjs',
    'js/data/scenarios/carnival_of_masks/prose_05.mjs',
    'js/data/scenarios/carnival_of_masks/prose_06.mjs',
    'js/data/scenarios/carnival_of_masks/prose_07.mjs',
    'js/data/scenarios/carnival_of_masks/prose_08.mjs',
    'js/data/scenarios/catalog.mjs',
    'js/data/scenarios/cliff_mist_run.mjs',
    'js/data/scenarios/coastal_festival.mjs',
    'js/data/scenarios/coastal_festival/index_prose.mjs',
    'js/data/scenarios/coastal_festival/prose_01.mjs',
    'js/data/scenarios/coastal_festival/prose_02.mjs',
    'js/data/scenarios/coastal_festival/prose_03.mjs',
    'js/data/scenarios/coastal_festival/prose_04.mjs',
    'js/data/scenarios/coastal_festival/prose_05.mjs',
    'js/data/scenarios/coastal_festival/prose_06.mjs',
    'js/data/scenarios/coastal_festival/prose_07.mjs',
    'js/data/scenarios/coastal_festival/prose_08.mjs',
    'js/data/scenarios/coastal_festival/prose_09.mjs',
    'js/data/scenarios/coastal_festival/prose_10.mjs',
    'js/data/scenarios/court_recess.mjs',
    'js/data/scenarios/deep_one_shadow.mjs',
    'js/data/scenarios/fog_lighthouse_chase.mjs',
    'js/data/scenarios/hearing_room.mjs',
    'js/data/scenarios/lighthouse_night_watch.mjs',
    'js/data/scenarios/lighthouse_signal.mjs',
    'js/data/scenarios/lighthouse_signal/index_prose.mjs',
    'js/data/scenarios/lighthouse_signal/prose_01.mjs',
    'js/data/scenarios/lighthouse_signal/prose_02.mjs',
    'js/data/scenarios/lighthouse_signal/prose_03.mjs',
    'js/data/scenarios/lighthouse_signal/prose_04.mjs',
    'js/data/scenarios/lighthouse_signal/prose_05.mjs',
    'js/data/scenarios/lighthouse_signal/prose_06.mjs',
    'js/data/scenarios/lighthouse_signal/prose_07.mjs',
    'js/data/scenarios/midnight_museum.mjs',
    'js/data/scenarios/missing_child.mjs',
    'js/data/scenarios/missing_child/index_prose.mjs',
    'js/data/scenarios/missing_child/prose_01.mjs',
    'js/data/scenarios/missing_child/prose_02.mjs',
    'js/data/scenarios/missing_child/prose_03.mjs',
    'js/data/scenarios/missing_child/prose_04.mjs',
    'js/data/scenarios/missing_child/prose_05.mjs',
    'js/data/scenarios/missing_child/prose_06.mjs',
    'js/data/scenarios/missing_child/prose_07.mjs',
    'js/data/scenarios/newsroom_midnight.mjs',
    'js/data/scenarios/rain_dock_chase.mjs',
    'js/data/scenarios/remote_catalog.mjs',
    'js/data/scenarios/train_to_nowhere.mjs',
    'js/data/scenarios/train_to_nowhere/index_prose.mjs',
    'js/data/scenarios/train_to_nowhere/prose_01.mjs',
    'js/data/scenarios/train_to_nowhere/prose_02.mjs',
    'js/data/scenarios/train_to_nowhere/prose_03.mjs',
    'js/data/scenarios/train_to_nowhere/prose_04.mjs',
    'js/data/scenarios/train_to_nowhere/prose_05.mjs',
    'js/data/scenarios/train_to_nowhere/prose_06.mjs',
    'js/data/scenarios/train_to_nowhere/prose_07.mjs',
    'js/data/scenarios/tutorial.mjs',
    'js/data/scenarios/tutorial/index_prose.mjs',
    'js/data/scenarios/tutorial/prose_01.mjs',
    'js/data/scenarios/tutorial/prose_02.mjs',
    'js/data/scenarios/tutorial/prose_03.mjs',
    'js/data/scenarios/tutorial/prose_04.mjs',
    'js/data/scenarios/tutorial/prose_05.mjs',
    'js/data/scenarios/tutorial/prose_06.mjs',
    'js/data/scenarios/tutorial/prose_07.mjs',
    'js/data/scenarios/university_occult.mjs',
    'js/data/scenarios/university_occult/index_prose.mjs',
    'js/data/scenarios/university_occult/prose_01.mjs',
    'js/data/scenarios/university_occult/prose_02.mjs',
    'js/data/scenarios/university_occult/prose_03.mjs',
    'js/data/scenarios/university_occult/prose_04.mjs',
    'js/data/scenarios/university_occult/prose_05.mjs',
    'js/data/scenarios/university_occult/prose_06.mjs',
    'js/data/scenarios/university_occult/prose_07.mjs',
    'js/data/session_manifest.mjs',
    'js/data/skills.mjs',
    'js/data/spells.mjs',
    'js/data/timeline_contract.mjs',
    'js/data/utils.mjs',
    'js/data/vehicles.mjs',
    'js/data/weapons_armor.mjs',
    'js/engines/attributes.mjs',
    'js/engines/chase.mjs',
    'js/engines/combat.mjs',
    'js/engines/conditions.mjs',
    'js/engines/damage.mjs',
    'js/engines/dice.mjs',
    'js/engines/environmental.mjs',
    'js/engines/healing.mjs',
    'js/engines/index.mjs',
    'js/engines/investigator.mjs',
    'js/engines/mythos.mjs',
    'js/engines/npc_behavior.mjs',
    'js/engines/poison.mjs',
    'js/engines/sanity.mjs',
    'js/engines/situational.mjs',
    'js/engines/skill_attempt.mjs',
    'js/engines/skills.mjs',
    'js/engines/social.mjs',
    'js/engines/wound.mjs',
    'js/rules/attach.mjs',
    'js/rules/builtin_buses.mjs',
    'js/rules/compile.mjs',
    'js/rules/effect_ir.mjs',
    'js/rules/execute.mjs',
    'js/rules/modifier_bus.mjs',
    'js/rules/ruleset_profile.mjs',
    'js/rules/tick_bus.mjs',
    'js/scenario/choice_menu.mjs',
    'js/scenario/effects_apply.mjs',
    'js/scenario/ensure_runner.mjs',
    'js/scenario/group_outcome.mjs',
    'js/scenario/pdf_import.mjs',
    'js/scenario/prose_bridge.mjs',
    'js/scenario/runner.mjs',
    'js/scenario/scenario_audit.mjs',
    'js/scenario/scenario_cjk_volume.mjs',
    'js/scenario/scenario_depth_audit.mjs',
    'js/scenario/scenario_path_audit.mjs',
    'js/scenario/store.mjs',
    'js/state/accessor.mjs',
    'js/state/aftermath.mjs',
    'js/state/arc_ledger.mjs',
    'js/state/char_record.mjs',
    'js/state/core.mjs',
    'js/state/false_lead.mjs',
    'js/state/gameplay.mjs',
    'js/state/identity_registry.mjs',
    'js/state/kp_config.mjs',
    'js/state/live_game_state.mjs',
    'js/state/mythos_heat.mjs',
    'js/state/persistence.mjs',
    'js/state/pressure_bus.mjs',
    'js/state/rule_check.mjs',
    'js/state/selection.mjs',
    'js/state/state.mjs',
    'js/state/state_contract.mjs',
    'js/state/ui.mjs',
    'js/state/unreliable_clues.mjs',
    'js/state/visibility.mjs',
    'js/story_opening.mjs',
    'js/tools/definitions.mjs',
    'js/tools/handlers/character.mjs',
    'js/tools/handlers/chase.mjs',
    'js/tools/handlers/clues.mjs',
    'js/tools/handlers/combat.mjs',
    'js/tools/handlers/dice.mjs',
    'js/tools/handlers/index.mjs',
    'js/tools/handlers/inventory.mjs',
    'js/tools/handlers/map.mjs',
    'js/tools/handlers/mythos.mjs',
    'js/tools/handlers/npc.mjs',
    'js/tools/handlers/system.mjs',
    'js/tools/resolve.mjs',
    'js/tools/slash.mjs',
    'js/views/creator_view.mjs',
    'js/views/dev_log_view.mjs',
    'js/views/lobby_view.mjs',
    'js/views/story_view.mjs',
];

const SKIP_HOSTS = ['api.deepseek.com', 'openai.com', 'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com'];

const isSkippableRequest = (url) =>
    SKIP_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith('.' + host));

/** .js / .css — stale-while-revalidate; HTML/navigate — network-first with cache fallback. */
const isStaleWhileRevalidateAsset = (url) => {
    const p = url.pathname;
    return p.endsWith('.js') || p.endsWith('.css');
};

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.allSettled(ASSETS.map((url) => cache.add(url).catch(() => {})))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (isSkippableRequest(url)) return;
    if (url.origin !== self.location.origin) return;

    if (isStaleWhileRevalidateAsset(url)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) =>
                cache.match(event.request).then((cached) => {
                    const networkFetch = fetch(event.request)
                        .then((response) => {
                            if (response && response.status === 200 && response.type === 'basic') {
                                cache.put(event.request, response.clone());
                            }
                            return response;
                        })
                        .catch(() => cached);
                    return cached || networkFetch;
                })
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    if (event.request.mode === 'navigate') {
                        const indexUrl = new URL('index.html', self.location).href;
                        return caches.match(indexUrl);
                    }
                    return caches.match(event.request);
                });
        })
    );
});
