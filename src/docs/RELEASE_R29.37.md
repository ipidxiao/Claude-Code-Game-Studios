# CoC Engine V18.6 R29.37 运行器登记剧本存储

发布日期：2026-10-04

## 本批范围

- 运行器开局和读取当前剧本改为使用登记的 `CoCScenarioStore`。
- 移除运行器对 `window.CoCScenarioStore` 的读取。
- 测试在导入运行器后调用 `bindScenarioStore` 放入替身。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 剧本存储在窗口上还没有同名对象时仍把自己挂到 `window.CoCScenarioStore`。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `2d9601b`（R29.36）。
