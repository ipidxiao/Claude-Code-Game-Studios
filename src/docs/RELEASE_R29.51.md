# CoC Engine V18.6 R29.51 团体检定调用模块

发布日期：2026-10-04

## 本批范围

- 剧本技能结算时动态调用 `resolveScenarioCheckMessages`。
- AI 逻辑不再读取 `window.CoCGroupCheck`。
- 团体检定模块保持延迟加载，不进入启动图。`window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 团体检定模块仍挂载 `window.CoCGroupCheck`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `25b0de4`（R29.50）。
