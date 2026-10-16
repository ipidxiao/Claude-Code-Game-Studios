# CoC Engine V18.6 R29.24 发布说明

发布日期：2026-10-04

## 发布范围

- R29.20：按 `savedAt` 仲裁 localStorage/IndexedDB 副本，并串行化同槽位写入。
- R29.21：读档采用两阶段恢复；异常时回滚，并尝试备用副本。
- R29.22：模组卡片、自动存档和槽位页统一异步存档数据源。
- R29.23：收缩 boot/lobby/story 的 `window` 业务依赖，保留兼容自挂载。
- R29.24：生成可复现发布候选包，并在全新解压目录执行完整 CI。

## 已知限制

- localStorage 与 IndexedDB 的跨标签页通知依赖浏览器的 `storage`/`BroadcastChannel` 支持。
- IndexedDB 被浏览器策略禁用时会降级到 localStorage；容量仍受浏览器配额限制。
- `window.CoCState` 以及 `window.ViewLobby`/`window.ViewStory` 暂时保留为兼容壳。
- 不迁移规则公式、DeepSeek、旁白或 A–F 冻结契约。

## 验证门

发布源码依次通过：

1. `npm run build:assets`
2. `node tests/release_metadata_smoke.mjs`
3. `npm run ci`

正式 ZIP 解压到空目录后执行：

1. `npm ci`
2. `npm run ci`

两轮 `ci` 均包含静态审计、engine smoke 与 Playwright 浏览器测试。

## 回滚点

- 回滚整个后续路线图：`28a1ec7`（R29.19 发布加固）。
- 仅撤销全局边界收缩：回到 `da116f0`（R29.22）。
- 读档原子恢复前：回到 `be5f64a`（R29.20）。

回滚前先备份用户存档。代码回滚不会自动降级已写入的浏览器存储。
