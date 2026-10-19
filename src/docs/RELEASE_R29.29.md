# CoC Engine V18.6 R29.29 立绘与图标全局收缩

发布日期：2026-10-04

## 本批范围

- 移除 `window.CharPortrait`、`window.ActionWheel`、`window.SanityEffects`。
- 移除 `window.CocIcon`、`window.CoCIconSprite`。
- 立绘和行动轮继续由剧情组件通过 ESM 引用；图标和理智特效继续由 `app.mjs` 注册。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- `window.CharHudHelpers`、`window.ChatFormatHelpers`、`window.CombatUiHelpers` 仍自挂载。
- `window.CoCCreator` 仍被创建页读取。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `803835f`（R29.28）。
