# CoC Engine V18.6 R29.27 界面全局收缩

发布日期：2026-10-04

## 本批范围

- 移除 `window.ViewLobby`、`window.ViewStory`、`window.ViewCreator`、`window.ViewDevLog`。
- 移除 `window.CocConfirmDialog`、`window.CocSaveLoadingOverlay`。
- 这些组件继续由 `app.mjs` 通过 ESM 注册。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- `window.CoCCreator` 仍被创建页读取。
- 剧情子组件仍有 `window.ApexEquipHud` 等自挂载和读取。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `890b7be`（R29.26）。
