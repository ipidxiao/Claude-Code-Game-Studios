# ADR-0003: 按玩家过滤——可见范围模型、唯一投影出口与存档第 9 版

## Status
Proposed

## Date
2026-10-16

## Last Verified
2026-10-16

## Decision Makers
ipidxiao（作者，授权按 Claude 的节奏推进）；Claude（起草）

## Summary
暗骰、私有线索、按人地图、个人内容限制都要求同一份游戏状态对不同的人显示不同内容，而现有状态是全队共用一份、调查员靠名字识别。
决定：给需要区分的记录加可见范围字段、给调查员加稳定编号，所有发给玩家的数据只能经过一个"默认拒绝"的投影函数 `projectFor`；
存档升到第 9 版，旧档的全部内容按"公开"读入。

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue） |
| **Domain** | Core / Persistence |
| **Knowledge Risk** | LOW — 纯数据结构与现有存档迁移机制 |
| **References Consulted** | `src/js/state/persistence.mjs`（`SAVE_SCHEMA_VERSION = 8`、`_buildSaveData`、`migrateSaveData`）、`src/js/state/core.mjs`（`addJournalEntry`）、`src/js/state/gameplay.mjs`（`addClue`、骰子历史、地图）、`src/js/state/accessor.mjs`（`findChar` 按名字查找） |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | (1) 第 8 版存档全部能升级到第 9 版并照常读档（现有 `save_legacy_upgrade_smoke` 扩展）；(2) 泄露测试覆盖每一类私有数据 |

Engine validation: NOT ASSESSED — no engine specialist exists for `Custom-Web`。

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001（Proposed）——守秘人浏览器发出前过滤；ADR-0002（Proposed）——投影视图是补丁的唯一来源 |
| **Enables** | 系统 19（两种视图）、20（暗骰）、22（角色卡权限）、23（线索分发）、24（团务日志）、25（按人地图）、26（内容安全） |
| **Blocks** | 上述系统的实现；联机客户端适配层 |
| **Ordering Note** | 存档第 9 版迁移可以先于联机单独上线（单人模式下所有内容都对守秘人可见，行为不变） |

## Context

### Problem Statement
架构审查（F5）指出：线索可见范围、按人记录的地图、日志可见性都要把现在"全队共用一份"的状态拆成按人区分，并升级存档；
这件事没有归属，会散落到第 23、24、25 号系统各自的实现里。代码检索还发现两处前提缺失：

- **调查员没有稳定编号**：`accessor.findChar(name)` 按名字查找，改名或重名都会把可见范围挂错人。
- **私有数据散在很多字段里**：`clueBoard`、`journalLog`、`chatHistory`、`diceHistory`、`sceneMap`，以及只该守秘人看的
  `kpState`、`arcLedger`、`flags`、`npcRegistry`、`scenarioRunner`、`mythosHeat`、`heatEventsLog` 等。

### Constraints
- 守秘人浏览器是唯一权威，过滤必须在它发出前完成（ADR-0001）。
- 补丁只能由投影视图生成（ADR-0002）。
- 单人模式与现有第 8 版存档必须照常可用。
- 以后还会不断新增状态字段；新字段默认必须不泄露。

### Requirements
- 可见范围至少支持：全员、仅守秘人与开发者账号、指定调查员。
- 暗骰：数值只对开发者账号可见，游客看到占位。
- 地图：每名玩家只拥有自己调查员亲身探索过的区域，可通过分享合并。
- 内容限制：按观看者个人生效，其他人看完整内容。
- 角色卡：其他玩家只看公开部分。

## Decision

### 1. 稳定的调查员编号
每条调查员记录增加 `invId`（创建时生成的随机字符串，永不改变）。所有可见范围引用 `invId`，不引用名字。
联机房间里另有"座位表"：`memberId → [invId]`（一名玩家可操控一名或多名调查员），由守秘人在开局时分配，存在房间会话里，不进存档。

### 2. 可见范围字段 `vis`
需要区分的记录增加可选字段 `vis`：

| 值 | 含义 |
|---|---|
| 缺省（`undefined`） | 全员可见（第 8 版旧数据全部按此处理） |
| `{ to: 'keeper' }` | 仅守秘人与开发者账号 |
| `{ to: ['inv_a1', 'inv_b2'] }` | 指定调查员的操控者，外加守秘人与开发者账号 |

适用的记录：线索（`clueBoard.clues[]`）、日志条目（`journalLog[]`）、对话消息（`chatHistory[]`）、骰子记录（`diceHistory[]`）。
暗骰是 `vis: { to: 'keeper' }` 的骰子记录，投影时为游客生成占位条目（"守秘人进行了一次暗骰「侦查」"）。

### 3. 地图按人探索
地图房间（`sceneMap.rooms[]`）增加 `exploredBy: [invId]`。投影时只保留观看者的调查员探索过的房间；
`share_map` 请求（ADR-0002）把分享者已探索的房间编号并入对方调查员的 `exploredBy`。守秘人看全部。

### 4. 角色卡分层
调查员记录分为公开部分（姓名、外貌、职业、可见伤势）与私有部分（属性、技能、理智、背景、物品、笔记）。
投影时，非操控者只得到公开部分；守秘人与开发者账号得到全部。字段归属清单写在 `projectFor` 的白名单里（见第 5 节）。

### 5. 唯一投影出口 `projectFor(viewer, gameState)`——默认拒绝
- `viewer = { memberId, role: 'developer' | 'guest', invIds: [...], limits: { lines: [...], veils: [...] } }`。
- 守秘人与 `developer`：返回完整状态（守秘人自己界面照旧）。
- `guest`：从一个**顶层字段白名单**开始构造视图，白名单之外的字段**一律不出现**。新增状态字段如果没人把它加进白名单，游客就收不到。
- 白名单内的集合字段逐条按 `vis`、`exploredBy`、角色卡分层过滤。
- 首版白名单（游客）：`roster`（分层后）、`currentLocation`、`knownLocations`、`chatHistory`、`journalLog`、`clueBoard`、`sceneMap`、
  `combat`（只含敌人公开状态）、`chase`、`diceHistory`、`atmosphere`、`worldClock`。
  明确排除：`kpState`、`kpEngine`、`arcLedger`、`flags`、`npcRegistry`、`scenarioRunner`、`mythosHeat`、`heatEventsLog`、`skillAttempts`、
  `sanCaps`、`pendingAftermath`、`customWeapons`、`campaignArchive`、`saveCompareMeta` 等全部守秘人数据。
- 这是 ADR-0001 F7 所说的"唯一过滤出口"，也是 ADR-0002 补丁的唯一来源。

### 6. 个人内容限制的挂钩
对话消息与日志条目可带 `safety: { tags: [...], summary: '...' }`。投影时若 `tags` 与观看者的 `limits.lines` 相交，整条替换为
"（此段内容已按你的设置隐藏）"；与 `limits.veils` 相交，替换为 `summary`（缺省时同上）。其他观看者不受影响。
标签从哪里来（AI 输出协议如何产出 `tags` 与 `summary`）由系统 26 的设计决定，本 ADR 只定挂钩。

### 7. 存档第 9 版
- `SAVE_SCHEMA_VERSION` 从 8 升到 9；`migrateSaveData` 增加 8 → 9 步骤：
  - 为每名调查员生成 `invId`；
  - 地图中状态为已探索 / 当前的房间，`exploredBy` 设为当时全体调查员（单人时代全队一起行动）；
  - 其他记录不加 `vis`（即全员可见）。
- 第 9 版存档的 `vis`、`exploredBy`、`invId` 随存档保存；座位表不进存档。
- 单人模式下守秘人即玩家，投影不参与，行为与第 8 版一致。

### Key Interfaces

```js
// src/js/state/visibility.mjs（新）
export const GUEST_TOP_LEVEL_ALLOWLIST = Object.freeze([ 'roster', 'currentLocation', 'knownLocations', 'chatHistory',
  'journalLog', 'clueBoard', 'sceneMap', 'combat', 'chase', 'diceHistory', 'atmosphere', 'worldClock' ]);
export function canSee(viewer, vis) { /* undefined → true; 'keeper' → developer only; [invIds] → intersects viewer.invIds or developer */ }
export function projectFor(viewer, gameState) { /* 默认拒绝：只从白名单构造；返回新对象，不修改 gameState */ }

// 记录示例
{ id: 'c12', title: '撕下的日记页', vis: { to: ['inv_a1'] } }                       // 私有线索
{ type: 'dice', summary: '侦查 37', vis: { to: 'keeper' }, darkSkill: '侦查' }       // 暗骰
{ id: 'r3', name: '地下室', status: 'explored', exploredBy: ['inv_a1'] }             // 按人地图
{ role: 'assistant', content: '……', safety: { tags: ['gore'], summary: '你们发现了遇害者。' } }
```

### Implementation Guidelines
- 发给游客的一切数据 **must** 经过 `projectFor`；**must never** 从 `gameState` 直接取字段发送。
- `projectFor` **must** 以白名单构造游客视图；新增顶层字段 **must** 显式决定是否加入白名单，默认不加。
- 可见范围 **must** 引用 `invId`；**must never** 引用调查员名字。
- `projectFor` **must never** 修改传入的 `gameState`（返回新对象）。
- 每类私有数据（暗骰、私有线索、未探索房间、他人私有角色卡字段、守秘人数据、触发个人限制的段落） **must** 有一条泄露测试：
  构造含该数据的状态，断言游客视图的序列化结果中不出现它。泄露测试纳入 `npm run ci:smoke`。
- 第 8 → 9 版迁移 **must** 由现有 `migrateSaveData` 完成，并扩展现有存档升级冒烟测试。

## Alternatives Considered

### Alternative 1: 黑名单（列出要隐藏的字段）
- **Pros**：改动少，现有字段默认都能看。
- **Cons**：每新增一个守秘人字段都要记得加进黑名单，忘了就泄露；这个项目新增状态字段很频繁（R1–R30 的发版记录）。
- **Rejection Reason**：失败方向是泄露，与 ADR-0001 的核心承诺相反。

### Alternative 2: 每名玩家一份独立的游戏状态
- **Description**：为每名玩家维护各自的线索板、地图、日志副本。
- **Pros**：投影简单。
- **Cons**：同一条线索、同一个房间存多份，结算时要同步修改多处，极易不一致；存档体积成倍增长；现有代码全部按单份状态写。
- **Rejection Reason**：改动面与一致性风险都远大于加字段。

### Alternative 3: 按名字标识调查员
- **Pros**：不用改存档。
- **Cons**：改名、重名、AI 叙述里写错名字都会把可见范围挂错人；R30 发版记录里已有"未知名字不得落到其他调查员"的同类修复。
- **Rejection Reason**：标识必须稳定。

## Consequences

### Positive
- 只有一个出口、默认拒绝，新字段不会意外泄露。
- 旧存档零成本升级（全员可见），单人模式不变。
- 暗骰、线索分发、按人地图、角色卡权限、内容限制共用同一套机制。

### Negative
- 存档结构升级，需要扩展迁移与测试。
- 现有写入点（`addClue`、`addJournalEntry`、骰子、地图）要能带上 `vis` / `exploredBy`；AI 工具也要能指定可见范围。
- 白名单需要随新功能维护，忘了加时表现为"游客看不到某个新功能"（可见、可修，但不泄露）。

## Risks
- **白名单漏加导致功能缺失**：缓解：为每个白名单字段写"游客能看到"的正向测试；新增字段时测试提示。
- **迁移把地图探索归属算错**：旧档里无法区分谁探索了哪里。缓解：迁移时全部归给全体调查员（与单人时代的实际体验一致）。
- **AI 工具不会填 `vis`**：AI 守秘人生成私有线索时可能漏填。缓解：工具参数增加可选的可见范围，缺省为全员；守秘人界面可事后改。

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| game-concept.md | 暗骰数值只有开发者账号可见，游客看不到具体数目 | `vis: { to: 'keeper' }` + 占位条目 |
| game-concept.md | 线索可见范围（全队 / 指定玩家 / 仅守秘人），玩家可向他人出示 | `vis` + `share_clue` |
| game-concept.md | 地图只属于亲身经历的玩家，可分享到聊天 / 互动窗口 | `exploredBy` + `share_map` |
| game-concept.md | 角色卡：其他玩家只看公开部分 | 角色卡分层 |
| game-concept.md | 内容限制只作用于设置它的个人，其他人看完整内容 | `safety` 挂钩 + `viewer.limits` |
| systems-index.md | 系统 18 为瓶颈，8 个系统依赖它 | 唯一投影出口 |
| architecture-review-2026-10-16.md | F5：状态分区与存档第 9 版需归属 ADR | 第 1–7 节 |

GDD sync: NOT ASSESSED — 系统 18–26 尚无设计文档。

## Performance Implications
- **CPU**：每次投影遍历白名单字段；与 ADR-0002 的比较合计，4–6 人时预计每次 < 10 ms。
- **Memory**：每条记录多一个小字段；调查员多一个编号。
- **Load Time**：第 8 版存档首次读入时迁移一次，可忽略。
- **Network**：无直接影响（由 ADR-0002 决定）。

## Migration Plan
1. 新增 `src/js/state/visibility.mjs`（`canSee`、`projectFor`、白名单）与泄露测试，纳入 `ci:smoke`。
2. 存档升到第 9 版：`invId`、`exploredBy` 迁移；扩展 `save_legacy_upgrade_smoke`。
3. 写入点支持可选的 `vis` / `exploredBy`（缺省全员可见，单人行为不变）。
4. 联机适配层（ADR-0002）只调用 `projectFor`。

## Validation Criteria
- 泄露测试全部通过，并在 `ci:smoke` 中运行。
- 所有现有第 8 版测试存档（`src/tests/fixtures/`）升级到第 9 版后读档正常，`npm run ci:smoke` 全部通过。
- 单人模式下界面与第 8 版一致。

## Related
- ADR-0001、ADR-0002（依赖）
- `docs/architecture/architecture-review-2026-10-16.md`（F5、F7）
- `design/gdd/game-concept.md`——"真人守秘人辅助模式"
