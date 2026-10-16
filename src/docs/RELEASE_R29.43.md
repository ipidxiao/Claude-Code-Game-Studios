# CoC Engine V18.6 R29.43 运行器加载改为动态导入

发布日期：2026-10-04

## 本批范围

- 运行器加载器改为只动态导入 `runner.mjs`。
- 移除加载器对 `window.CoCScenarioRunner` 的读取。
- 启动时仍不静态加载运行器。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 运行器模块仍把自己挂到 `window.CoCScenarioRunner`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `dc3a36c`（R29.42）。
