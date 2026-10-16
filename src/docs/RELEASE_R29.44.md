# CoC Engine V18.6 R29.44 运行器不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除运行器对 `window.CoCScenarioRunner` 的自挂载。
- 大厅和创建页继续动态导入运行器模块。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 扩展收集线索时仍读取 `window.CoCLorebook`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `dd2e26c`（R29.43）。
