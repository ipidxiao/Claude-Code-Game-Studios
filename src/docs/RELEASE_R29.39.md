# CoC Engine V18.6 R29.39 远程剧本目录模块引用

发布日期：2026-10-04

## 本批范围

- 剧本存储查找可下载剧本时改为使用 `CoCScenarioRemoteCatalog`。
- 移除剧本存储对 `window.CoCScenarioRemoteCatalog` 的读取。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 远程目录模块仍把自己挂到 `window.CoCScenarioRemoteCatalog`。
- 剧本存储查找官方 PDF 导入时仍读取 `window.CoCScenarioPdfImport`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `bf5c46d`（R29.38）。
