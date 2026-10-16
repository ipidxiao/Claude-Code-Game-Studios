# CoC Engine V18.6 R29.42 PDF 导入不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除 PDF 导入模块对 `window.CoCScenarioPdfImport` 的自挂载。
- 剧本存储继续使用模块导出的 `CoCScenarioPdfImport` 做官方 PDF 一键导入。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 运行器加载器仍优先读取 `window.CoCScenarioRunner`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `4bd7c17`（R29.41）。
