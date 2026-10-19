# CoC Engine V18.6 R29.36 线索本读取剧本存储

发布日期：2026-10-04

## 本批范围

- 线索本收集设定时改为调用 `CoCScenarioStore.getScenario`。
- 存储没有该剧本时仍回退到 `CoCScenarioCatalog.get`。
- 移除线索本对 `window.CoCScenarioStore` 的读取。
- `window.CoCState` 保持为启动时唯一挂载的状态源。

## 未纳入本批

- 运行器仍优先使用调用前放上的 `window.CoCScenarioStore` 作为测试替身。
- 规则、DeepSeek、旁白和 A–F 契约未改。

## 回滚点

- 撤销本批：回到 `d550521`（R29.35）。
