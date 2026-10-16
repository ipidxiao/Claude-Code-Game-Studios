# CoC Engine V18.6 R29.52 团体检定不再挂到窗口

发布日期：2026-10-04

## 本批范围

- 移除团体检定模块对 `window.CoCGroupCheck` 的自挂载。
- 剧本技能结算继续动态调用 `resolveScenarioCheckMessages`。
- 团体检定保持延迟加载。`window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 其余窗口名保持不动，包括 `window.CoCState`、`window.Vue`、`window.Chart`、`window.CoCStateAccessor`、`window.CoCEngine`、`window.CoCAI`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `92df7af`（R29.51）。
