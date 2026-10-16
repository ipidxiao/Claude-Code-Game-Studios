# CoC Engine V18.6 R29.41 官方 PDF 导入模块引用

发布日期：2026-10-04

## 本批范围

- 剧本存储一键导入官方 PDF 时改为使用 `CoCScenarioPdfImport`。
- 移除剧本存储对 `window.CoCScenarioPdfImport` 的读取。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- PDF 导入模块仍把自己挂到 `window.CoCScenarioPdfImport`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `30c8097`（R29.40）。
