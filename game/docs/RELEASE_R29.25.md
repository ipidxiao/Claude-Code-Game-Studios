# CoC Engine V18.6 R29.25 发布验收

发布日期：2026-10-04

## 范围

用 R29.17 / R29.19 真实存档 fixture 验证升级到当前引擎，不改存档格式。

验收中发现：孤立 persistence 恢复会因 `CoCStateAccessor.getState()` 抛错而回滚合法旧档。现已改为 accessor 未挂载时跳过先手顺序清理。

## 验收矩阵

| 场景 | 期望 |
| --- | --- |
| R29.17 local-only | 槽位显示旧钟楼，读档恢复 Alice / tower，磁盘原文不变 |
| R29.19 IDB-only | 槽位显示码头仓库，读档恢复航运清单与世界钟，不伪造 local 副本 |
| 旧 local + 新 IDB | 选择较新的 R29.19 副本，并提示 IndexedDB 较新 |
| 新 local + 旧 IDB | 选择较新的 R29.19 local 副本 |
| 损坏 local + 完整旧 IDB | 回退到 IndexedDB，损坏原文保留 |
| 损坏 IDB + 完整旧 local | 回退到 localStorage |
| 刷新 | 旧档在大厅/槽位页仍然可见 |
| 离线启动 | 首访缓存完成后断网仍能进入大厅 |
| 跨标签页 | 另一标签页无需手工刷新即可看到新存档 |

## 已知限制

- 离线启动依赖第一次在线访问已写入 Service Worker 缓存。
- 跨标签页刷新依赖 `BroadcastChannel` 或 `storage` 事件。
- 读档不会把内存迁移结果写回旧副本；只有用户再次存档才会生成当前会话快照。

## 回滚点

- 仅撤销本验收门禁：回到 `1cf83c4`（R29.24）。
- 存档行为回滚：回到 `28a1ec7`（R29.19）。
