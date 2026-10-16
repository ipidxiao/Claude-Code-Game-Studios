# CoC Engine V18.6 R29.47 进故事页调用开场模块

发布日期：2026-10-04

## 本批范围

- 进入故事页且没有进行中的剧本时改为直接调用 `pushStoryOpening`。
- 移除状态核心对 `window.CoCStoryOpening` 的读取。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 开场模块仍把自己挂到 `window.CoCStoryOpening`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `0484ec8`（R29.46）。
