# CoC Engine V18.6 R29.38 剧本存储不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除剧本存储对 `window.CoCScenarioStore` 的自挂载。
- 大厅、线索本、开场和运行器继续使用模块导出的 `CoCScenarioStore`。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 剧本存储查找远程目录时仍读取 `window.CoCScenarioRemoteCatalog`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `db76c52`（R29.37）。
