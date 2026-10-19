# CoC Engine V18.6 R29.35 非内置剧本查找

发布日期：2026-10-04

## 本批范围

- `CoCScenarioCatalog.get` 在内置表未命中时调用存储登记的查找函数。
- `store.mjs` 在导出存储之后调用 `bindDownloadedLookup`。
- 目录模块不静态导入存储，避免与存储对目录的引用形成环。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 线索本仍优先调用 `window.CoCScenarioStore.getScenario`。
- 运行器仍优先使用调用前放上的 `window.CoCScenarioStore` 作为测试替身。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `ab7e43a`（R29.34）。
