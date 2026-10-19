# Scenario package checklist

After scaffolding or hand-authoring a pack:

1. Register in `js/data/scenarios/builtins.mjs` (import + BUILTIN_SCENARIOS).
2. Effects only via known keys (`sanCheck`, `combat`+pendingRoll, `chase`, `enchantmentId`, `dispel`, `flags`, clues, `advanceClock`…).
3. No flat `san` number; use `sanCheck`.
4. Combat exchanges use `pendingRoll: true` for player dice.
5. Theme chase when fitting (`effects.chase`); chase showcase twins: `alley_to_asphalt`, `rain_dock_chase`, `fog_lighthouse_chase`, `cliff_mist_run` (no gunfight).
6. Social arc pilots: `hearing_room`, `newsroom_midnight` (falseLead + clocks + endingsByClueQuality).
7. Run `npm run audit:pack-parity` if mjs+json twins share nodes.
8. Run `npm run test:engine` (`package_effects_audit` covers packages/).
9. Optional: `branchByClueQuality` / `endingsByClueQuality` for evidence endings (scaffold defaults to triple endings).
10. Capability tags (pick as needed): `证据分叉` / `追逐` / `神话热度` / `战后余波` / `战役账本` / `双时钟`.
11. Optional: `readsArcLedger`, `requiresChapterUnlock`, `clocks` + `onClockFull`, `falseLead`, `debunkFalseLead`, clue `npcId`.
12. Campaign inherit: desk card **继承/重置** with side-by-side preview; chapter map in lobby.
13. Never add a second HP/SAN write path in the scenario file.

Scaffold: `npm run scaffold:scenario -- --id=foo_bar --title=标题`
