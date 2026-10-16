# CoC Engine V18.6 R29.28 剧情子组件全局收缩

发布日期：2026-10-04

## 本批范围

- 人物页诊断改为检查 ESM 导入的 `ApexEquipHud`。
- 移除 `window.ApexEquipHud`、`window.StoryChat`、`window.StoryChar`、`window.StoryInv`、`window.StoryStore`、`window.StoryJournal`、`window.StoryNpc`、`window.StoryCombat`、`window.StoryGrowth`、`window.StoryMap`、`window.StoryClues`、`window.StoryEquip`、`window.StoryDice`。
- 这些组件继续由 `story_view.mjs` 通过 ESM 注册。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- `window.CharPortrait`、`window.ActionWheel`、`window.SanityEffects`、`window.CocIcon` 仍自挂载。
- `window.CoCCreator` 仍被创建页读取。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `bf26081`（R29.27）。
