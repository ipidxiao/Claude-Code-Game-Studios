# CoC Engine V18.6 R29.56 入口重复导入

发布日期：2026-10-09

## 本批范围

- `js/app.mjs` 去掉导入后没有再读取的具名绑定。
- `CoCState`、`CoCAI`，以及 `rule_check`、`accessor`、`aftermath`、`arc_ledger`、`false_lead`、`shell_side_effects` 的启动导入保留。

## 未纳入本批

- 各模块自己的窗口赋值未改。
- 规则、存档和理智公式未改。

## 回滚点

- 撤销本批：回到 `1bfa6fc`（R29.55 创建页经历包）。
