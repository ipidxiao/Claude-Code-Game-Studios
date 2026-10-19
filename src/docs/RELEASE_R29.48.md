# CoC Engine V18.6 R29.48 开场模块不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除开场模块对 `window.CoCStoryOpening` 的自挂载。
- 进入故事页继续直接调用 `pushStoryOpening`。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- AI 逻辑仍读取 `window.CoCSlash`。
- AI 逻辑仍读取 `window.CoCGroupCheck`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `163580e`（R29.47）。
