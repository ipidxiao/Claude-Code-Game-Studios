# CoC Engine V18.6 R29.46 线索本不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除线索本对 `window.CoCLorebook` 的自挂载。
- 扩展上下文继续使用模块导出的 `CoCLorebook`。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 状态核心仍读取 `window.CoCStoryOpening`。
- 线索本注入后仍通过 `window.CoCExtensions` 发出事件。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `b0db355`（R29.45）。
