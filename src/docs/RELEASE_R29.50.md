# CoC Engine V18.6 R29.50 斜杠模块不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除斜杠模块对 `window.CoCSlash` 的自挂载。
- 玩家斜杠命令继续直接调用 `trySlash`。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- AI 逻辑仍读取 `window.CoCGroupCheck`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `ef0b36f`（R29.49）。
