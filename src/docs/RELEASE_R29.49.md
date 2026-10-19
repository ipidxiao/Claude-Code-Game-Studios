# CoC Engine V18.6 R29.49 斜杠命令调用模块

发布日期：2026-10-04

## 本批范围

- AI 处理以 `/` 开头的玩家输入时直接调用 `trySlash`。
- AI 逻辑不再读取 `window.CoCSlash`。
- 斜杠模块仍把自己挂到窗口。`window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 斜杠模块仍挂载 `window.CoCSlash`。
- AI 逻辑仍读取 `window.CoCGroupCheck`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `b51e792`（R29.48）。
