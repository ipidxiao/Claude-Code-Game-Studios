# CoC Engine V18.6 R29.40 远程剧本目录不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除远程剧本目录对 `window.CoCScenarioRemoteCatalog` 的自挂载。
- 剧本存储继续使用模块导出的 `CoCScenarioRemoteCatalog` 合并可下载剧本。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 剧本存储查找官方 PDF 导入时仍读取 `window.CoCScenarioPdfImport`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `b9d9a45`（R29.39）。
