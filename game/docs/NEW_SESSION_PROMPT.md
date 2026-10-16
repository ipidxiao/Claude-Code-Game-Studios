# New Cursor window — paste this as the first user message

```text
You are working on CoC Engine V18.7 (Call of Cthulhu 7e front-end).

## Absolute product root (ONLY edit here)
D:\CoC_Engine_Releases\CoC_Engine_V18.7_ParadoxFree_R30_20261016\CoC_Engine_V18.7_ParadoxFree_R30_20261016
(unzip CoC_Engine_V18.7_ParadoxFree_R30_20261016.zip there; older release folders are history only)

Do NOT edit or treat as product:
c:\Users\x1767\OneDrive\Desktop\CoC_Engine_V17.2_CCGS

If Cursor workspace root is not this tree, call move_agent_to_root to that path first (or ask me to open that folder).

## Runtime / constraints
- Browser: native ESM only (index.html → js/app.mjs). `npm run build:js` syncs SW ASSETS + CACHE_NAME only — no mjs→js transpile.
- In-game LLM: DeepSeek only (js/ai/network.mjs). Do not change unless asked.
- Keep narrative gate: prose_bridge / partitionNarrationByJudgment / deferredNarrative.
- Thin modules midnight_museum + deep_one_shadow: NO fake 100k prose banks.
- Chinese explanations; English code comments. No git commit unless I ask.
- Copyright: coverage stores ids/paths/status only — never paste Keeper Rulebook prose.

## Verify after .mjs changes
npm run build:assets
npm run ci:smoke
npm run ci  # required for save/AI/prose/browser-path changes

## Already done through V18.7 (includes V18.5 R1–R28, V18.6 R29–R29.69)
Rules Framework W0–W6; Rules B6–B9; Branch 7; P0–P7; book-level Keeper coverage M0–M5
(core_index + keeper_toc, catalog/core/fill gates, settle/table ≥95%).
Module effects contract v1: sanCheck / combat.exchange / chase / enchantmentId / dispel
(shared applyScenarioEffects; tutorial/asylum/lighthouse + thin pilots).
Online sync N0–N5 done. Combat UI loop: select enemy → dispatch tools → inline dice CTA.
Enemy-turn auto enemy_attack + vehicle/chase gunfight section on combat panel.
requiresClueQuality; creatures_summary humans/hybrids; coastal/missing_child/train effects.
All scenario packages audited (sanCheck + pendingRoll; no flat san).
Pack parity: npm run audit:pack-parity / export:scenario-pack (mjs → json contract merge).
Chase: deep_one + train + mayvale + reef + carnival; enemy ranged infer; category settle reconcile.
Accessor + scenario runner use getState(); window.CoCState remains reactive core in app.mjs.
Playwright critical paths: npm run test:playwright (enemy attack / chase / save-load / AI HP / prose races); included by npm run ci.
Save schema v8 persists chase (incl. vehicle participants).
Review fixes A–C/E: dice parse, melee DB, cover ownership, module/load transients, armor on firearms, chase crew drive.
Review fixes F–G: react single prompt; endCombat/chase; no chase tick in combat; maneuvers on dice tray; shotgun impale; chase speed check; actions vs slowest; hazard stay; escape streak; fire/melee spend chase actions.
Creative roadmap W1–W6: evidence endings; aftermath queue; alley_to_asphalt; moduleSeed; keeperStyle; mythosHeat; save blurb; scaffold:scenario (see docs/SCENARIO_PACKAGE_CHECKLIST.md).
Creative phase-2 C1–C5: arcLedger; NPC credibility→clue quality; aftermath reputation/police/ally; dual clocks + falseLead; unreliable clue display; rain_dock_chase; keeper density; desk card + save compare; capability tags.
Creative phase-3 D1–D5: arcLedger v2 inherit/reset + chapters; reputation/police next-module pressure; dual-clock HUD; falseLead suspicious clues + heat events; hearing_room + fog_lighthouse_chase; desk memory / ending recap / continue badge / scaffold.
Creative phase-4 UX+content: desk inherit/reset preview; chapter map; pressure HUD + choice hints; debunkFalseLead; heat event recap; save arcLedger blurb; newsroom_midnight + cliff_mist_run; scaffold endingsByClueQuality triple.
Creative phase-5 E1–E5+X1–X3: reset confirm + carryBrief; recommendNextChapter + lobby badge; suspicious clue filter; ending recap timeline/copy; save arcMeta diff + capabilitiesUsed; court_recess + lighthouse_night_watch; lobby audit button; creative_phase5_smoke.
Creative phase-6 S1–S4 (system polish): capability_system desk preview; chapter progress bar + focus next; endingSaveBlurb in saves; capability glossary; creative_phase6_system_smoke.
System P0–P4 + Q1–Q6: DevLog desk-pref prompt gate (default OFF); capability diff; saveCompareMeta; contract health buckets; coverage matrix; ARC_CHAPTER_TRANSITIONS; creative smoke catalog + npm run list:creative-smokes; creative_pq_system_smoke.
Risk gate R (before A–F): FULL close-out — all-builtin strict tag parity; resolveMarkCapabilityId; pressure display/aftermath machine guards; CAPABILITY_IR_VERSION=0 on endingRecap/saveCompareMeta; ci:smoke runs audit:capability-parity + audit:pressure-writes; creative_risk_gate_smoke. A–F only after this stays green.
Pre-A/F gap sweep R+: npm run audit:pre-af-gaps + audit:pre-af-soft (over-advertise hard caps forbidden; pack readsArcLedger/chapter unlock lag; markCapability comment strip). Still green before「做 A」.
Robustness follow-ups: API key remember cleanup; pack fetch timeout/dedupe; PDF AI retry policy; record_engine_log AI quarantine; public catalog https-only; KP inject skips AI busy; builtin pack twins for deep_one/asylum/museum.
R29.18 bug close-out: browser boot import fix; AI current/max HP; IndexedDB fallback visibility/load/delete; prose generation token; clue quality fail-closed; Playwright release gate.

V18.7 R30 (bug hunt by class, R29.65–R29.69 rolled up): no CDN code anywhere in js/**; AI endpoint https-only (http only localhost);
unknown target names never fall back to another investigator; choice whitelist keeps every data key; module switch clears KP gate state;
pack twins must match ESM routing (pack_graph_smoke) and the parity fixer no longer stamps gates onto other choices; load keeps aftermath dice panel;
tool rollback lives in js/ai/tool_snapshot.mjs and covers all handler-written state; every handler-read tool arg is declared (tool_schema_contract_smoke);
old divergent JSON twins (tutorial/coastal/carnival/missing_child/train) deleted; prose bridge no longer prepends inlined prose (each node shown once);
dice 1D0/0D6 never NaN, ≤100 dice/≤1000 sides, net bonus/penalty dice capped ±2, asylum months ≤24 per call;
landing on a check node emits its dice panel (no replay of narrative/effects); every all-gated node has a way out (scenario_exit_guard_smoke);
night watch log tier follows a Library Use roll (all 3 endings reachable).
Bug-hunt tooling worth reusing: tool fuzzer (schema-valid args + dice-panel resolution) and real-runner random walk over every built-in.

## Open backlog (pick explicitly)
1. ~~creative W…S + P/Q + risk gate R (full) + R+ gap sweep + robustness gaps~~ (done)
2. A–F system waves — ~~A IR~~ ~~B PB~~ ~~C DP (R29.14)~~ ~~D SM (R29.15)~~ ~~E EV (R29.16)~~ ~~F TC Timeline Contract (R29.17)~~ — complete; do not invent a G wave
3. Deep a11y / boot code-split — skip unless asked
4. Investigator Handbook / Pulp full TOC — skip unless asked (Keeper-only locked)

New packages checklist: sanCheck + combat.pendingRoll; no flat "san"; theme chase when fitting; capability tags; run audit:pack-parity if twin mjs exists.

DevLog: js/data/dev_logs.mjs → entry "V18.7 R30" (changes + method + remaining).
Coverage: js/data/coverage/* + npm run coverage:report
Combat UI: story_combat.mjs + combat_ui_flow_smoke in test:engine

Start by confirming root path + package.json version is 18.7.0, then wait for my task.
```

After opening the zip, prefer: **File → Open Folder** → extract path of this tree (folder `CoC_Engine_V18.7_ParadoxFree_R30_20261016`), then paste the prompt above.
