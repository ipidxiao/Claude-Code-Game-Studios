# CoC Engine V18.6 R29.33 日志与能力系统模块引用

发布日期：2026-10-04

## 本批范围

- 系统工具 `record_engine_log` 改为写入 ESM 导出的 `DevLogs`。
- 移除 `window.DevLogs`、`window.CoCCapabilitySystem`。
- 存档摘要改为调用 `CoCCapabilitySystem`。热度短句仍读取 `window.CoCMythosHeat`。
- 剧本运行器改为使用 `CoCCapabilitySystem`。剧本存储优先沿用调用前已放上的 `window.CoCScenarioStore`（测试替身），否则使用模块导出。模块加载时不再覆盖已有替身。
- 线索本按剧本编号改为调用 `CoCScenarioCatalog.get`。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- `window.CoCScenarioCatalog` 仍被 `store.mjs`、`story_opening.mjs`、`session_manifest.mjs` 读取。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `f31dd3f`（R29.32）。
