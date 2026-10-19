# CoC Engine V18.6 R29.31 调查员创建模块引用

发布日期：2026-10-04

## 本批范围

- `CoCCreator` 改为 ESM 导出，仍由 `shell_side_effects_lobby.mjs` 在启动时创建同一实例。
- 创建页 `setup` 直接展开该导出。
- 人物页的快速预设、套用预设和新建调查员改为调用该导出。
- 移除 `window.CoCCreator`。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 开发日志页仍读取 `window.DevLogs`、`window.CoCDeskPref`、`window.CoCCapabilitySystem`、`window.CoCScenarioCatalog`、`window.CoCCreativeSmokeCatalog`。
- 创建器内部仍用 `window.Vue` 取平台注入，并用 `window.CoCStateAccessor` / `window.CoCEngine` 作为已导入模块的回退。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `bdd8819`（R29.30）。
