# Agent 约定

改代码后必须按 `.cursor/rules/verify-after-change.mdc` 做可靠性验证。未跑通不得宣称完成。

最短门：

1. 改了 `js/**` → `npm run build:assets`
2. 对应 smoke → `npm run test:engine`
3. 引擎/规则/工具/存档/剧本 → `npm run ci:smoke`（退出码 0）
4. 存档、AI、prose 或浏览器关键路径 → `npm run ci`（含 Chromium Playwright）

`ci:smoke` = `build:js:check` + 写路径/包对等/能力/压力/pre-af audits + `coverage:gate` + `test:engine`。
`ci` = `ci:smoke` + `ci:browser`。
