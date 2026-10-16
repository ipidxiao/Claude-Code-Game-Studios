# CoC Engine V18.6 R29.34 剧本目录模块引用

发布日期：2026-10-04

## 本批范围

- `store.mjs` 的列表和校验改为使用 ESM 导出的 `CoCScenarioCatalog`。
- 开场叙事改为调用 `CoCScenarioStore.getScenario`。
- 会话清单改为调用 `CoCScenarioCatalog.validate`。
- 移除 `window.CoCScenarioCatalog`。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- `CoCScenarioCatalog.get` 在内置表找不到剧本时仍读取 `window.CoCScenarioStore`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `aee7748`（R29.33）。
