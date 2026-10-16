# CoC Engine V18.6 R29.30 界面辅助全局收缩

发布日期：2026-10-04

## 本批范围

- 移除 `window.CharHudHelpers`、`window.ChatFormatHelpers`、`window.CombatUiHelpers`。
- 人物状态、聊天格式和战斗界面辅助继续通过 ESM 具名导出。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- `window.CoCCreator` 仍被创建页读取。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `c0372b3`（R29.29）。
