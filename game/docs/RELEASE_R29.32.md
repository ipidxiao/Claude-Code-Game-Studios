# CoC Engine V18.6 R29.32 开发日志模块引用

发布日期：2026-10-04

## 本批范围

- 开发日志页改为 ESM 引用 `DevLogs`、`CoCDeskPref`、`CoCCapabilitySystem`、`CoCScenarioCatalog`、`CoCCreativeSmokeCatalog`。
- 移除 `window.CoCDeskPref`、`window.CoCCreativeSmokeCatalog`。大厅本已使用桌规的模块导出。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- `window.DevLogs` 仍被系统工具写入，与模块导出的是同一数组。
- `window.CoCCapabilitySystem` 仍被存档和剧本运行器读取。
- `window.CoCScenarioCatalog` 仍被剧本存储、运行器、开场和线索本读取。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `0c8a8ee`（R29.31）。
