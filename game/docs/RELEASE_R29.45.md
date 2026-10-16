# CoC Engine V18.6 R29.45 扩展读取线索本模块

发布日期：2026-10-04

## 本批范围

- 扩展的 `getGameContext` 改为使用 `CoCLorebook`。
- 移除扩展对 `window.CoCLorebook` 的读取。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 线索本模块仍把自己挂到 `window.CoCLorebook`。
- 线索本注入后仍通过 `window.CoCExtensions` 发出事件。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `11a09a0`（R29.44）。
