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
暗骰、私有线索、按人地图、个人内容限制都要求同一份游戏状态对不同的人显示不同内容，而现有状态是全队共用一份、调查员靠名字识别，
对话历史里还混着守秘人系统提示与带骰值的工具结果。决定：所有发给他人的数据只能经过一个**在顶层字段、记录类型、记录字段三层都默认拒绝**的投影函数
`projectFor`；调查员加稳定编号 `invId`，需要区分的记录加可见范围 `vis`；存档升到第 9 版，迁移为幂等规整。

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue） |
| **Domain** | Core / Persistence |
| **Knowledge Risk** | LOW — 纯数据结构与现有存档迁移机制 |
| **References Consulted** | `src/js/state/persistence.mjs`（`SAVE_SCHEMA_VERSION = 8`、`_buildSaveData`、`migrateSaveData`）、`src/js/state/core.mjs`（系统提示写入对话历史、`addJournalEntry`）、`src/js/ai_logic.mjs`（检定写入骰子历史 / 对话 / 日志 / 工具结果）、`src/js/state/gameplay.mjs`（`addClue`、骰子、地图）、`src/js/state/accessor.mjs`（`findChar` 按名字）、`src/js/state/arc_ledger.mjs`（账本恢复替换 `roster`）、`src/js/state/ui.mjs`（`compactChatHistory`） |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | (1) 所有第 1–8 版测试存档经规整后读档正常（扩展 `save_legacy_upgrade_smoke`）；(2) 从真实写入路径生成状态的泄露测试全部通过 |

Engine validation: NOT ASSESSED — no engine specialist exists for `Custom-Web`。

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001（Proposed）——发出前过滤、唯一过滤出口 |
| **Enables** | ADR-0002（同步协议以本 ADR 的投影为唯一来源）；系统 19、20、22、23、24、25、26 |
| **Blocks** | 上述系统的实现；联机客户端适配层 |
| **Ordering Note** | 存档第 9 版、`invId`、`projectFor` 与泄露测试可以先于联机单独上线（单人模式行为不变） |

## Context

### Problem Statement
架构审查（第一轮 F5）要求把"全队共用一份"的状态拆成按人区分并升级存档。第二轮审查（R-F1–R-F13）进一步核实了现有代码的形态：

- **对话历史里混着守秘人内容**：守秘人系统提示（`core.mjs:97`，`role: 'system', isHidden: true`）、KP 引擎暗中操作记录
  （`kp_execution_engine.mjs:1054`）、`role: 'tool'` 的工具结果（含骰值与目标值，`ai_logic.mjs:728/746/757`）、assistant 消息上的 `tool_calls`、
  `isLocalOnly` 的骰值系统行（`ai_logic.mjs:695`）。
- **一次检定写进 4 处**：骰子历史、对话系统行、行动日志（"侦查 检定 成功（37/50）"）、工具结果（`ai_logic.mjs:679–696`）。
- **调查员没有稳定编号**：`findChar(name)` 按名字查找；骰子历史 `rolledBy`、日志 `charName`、AI 工具参数都用名字。
- **写入 `roster` 的入口不止读档**：`createInvestigatorRecord`、`accessor.addToRoster`、战役账本恢复（`arc_ledger.mjs:173–182`，直接替换 `roster`）。
- **数组形态**：对话消息没有稳定 id（只有存档时删除的 `_vid`），`compactChatHistory` 从前面删；骰子历史用 `unshift` 插到最前、超过 30 条从尾部删。

### Constraints
- 守秘人浏览器是唯一权威，过滤必须在它发出前完成（ADR-0001）。
- 单人模式与第 1–8 版存档必须照常可用。
- 以后还会不断新增状态字段与消息类型；**新东西默认必须不泄露**。

### Requirements
- 可见范围：全员、仅守秘人与开发者账号、指定调查员。
- 暗骰：数值只对开发者账号可见，游客在所有出现处只看到占位。
- 地图：每名玩家只拥有自己调查员探索过的区域，可通过分享合并。
- 角色卡：其他玩家只看公开部分。
- 内容限制：按观看者个人生效（**包括开发者账号与单人模式**），其他人看完整内容。

## Decision

### 1. 稳定的调查员编号 `invId`
- `createInvestigatorRecord` 创建记录时生成 `invId`（随机字符串，永不改变）。
- 所有写入 `roster` 的入口（创建、`addToRoster`、读档、战役账本恢复）都经过同一个规整函数 `ensureInvIds(roster)`，缺则补。
- **名字到 `invId` 的唯一解析函数** `resolveInvId(nameOrId)`：写入方（骰子、日志、AI 工具）拿到名字时只能经它转换；
  **解析失败时可见范围取最严格的 `{ to: 'keeper' }`**，绝不退回全员可见。

### 2. 可见范围字段 `vis`

| 值 | 含义 |
|---|---|
| 缺省 | 全员可见——**只在该记录类型的投影规则允许缺省时成立**（见第 5 节） |
| `{ to: 'keeper' }` | 仅守秘人与开发者账号 |
| `{ to: ['inv_a1', ...] }` | 指定调查员的操控者，外加守秘人与开发者账号 |

规整与投影都把现有的 `isHidden: true`、`isLocalOnly: true` 视为 `vis: { to: 'keeper' }`。

### 3. 暗骰：一处决定，带到所有派生记录
掷骰函数接受 `vis` 参数，**由掷骰处一次性决定**，并由同一处把同一个 `vis` 与同一个 `rollId` 写进它产生的全部记录：骰子历史条目、行动日志条目、
对话系统行、工具结果。暗骰时（`vis: { to: 'keeper' }`）这几处各自另写一条**占位记录**（只含技能名与"守秘人进行了一次暗骰"，带同一个 `rollId`、
`vis` 缺省），供游客视图显示。

### 4. 地图按人探索
地图房间（`sceneMap.rooms[]`）增加 `exploredBy: [invId]`。投影时只保留观看者调查员探索过的房间；`share_map` 请求（ADR-0002）把分享者已探索的房间并入对方。

### 5. 唯一投影出口 `projectFor(viewer, gameState)`——三层默认拒绝

`viewer = { memberId, role: 'keeper' | 'developer' | 'guest', invIds: [...], limits: { lines: [...], veils: [...] } }`

**第一层：顶层字段白名单。** 游客视图只从白名单字段构造，白名单之外一律不出现。

| 决定 | 字段 |
|---|---|
| 进入游客白名单 | `roster`、`currentLocation`、`knownLocations`、`chatHistory`、`journalLog`、`clueBoard`、`sceneMap`、`combat`、`chase`、`diceHistory`、`atmosphere`、`worldClock`、`inventory`、`storage`（全队物品）、`keeperStyle`（今晚桌规） |
| 明确排除 | `kpState`、`kpEngine`、`arcLedger`、`flags`、`npcRegistry`、`scenarioRunner`、`mythosHeat`、`heatEventsLog`、`skillAttempts`、`sanCaps`、`pendingAftermath`、`customWeapons`、`campaignArchive`、`activeCampaign`、`moduleSeed`、`encounterVariant`、`saveCompareMeta`、`saveBlurb`、`endingSaveBlurb`、`selectedCharIndex`、`contextMeta` 等全部守秘人或存档元数据 |

**第二层：记录类型白名单。** 白名单内的集合字段，每条记录先按类型判断能否进入游客视图：

| 集合 | 允许的记录 | 一律丢弃 |
|---|---|---|
| `chatHistory` | `role` 为 `user` 或 `assistant` 的叙述消息；联机投影只含最近 200 条（ADR-0002 第 2 节） | `role: 'system'`、`role: 'tool'`、`isHidden`、`isLocalOnly`、`isLocalError` |
| `journalLog` | 按 `vis` 判断 | `vis` 不可见者 |
| `diceHistory` | 按 `vis` 判断（暗骰只剩占位条目） | `vis` 不可见者 |
| `clueBoard.clues` | 按 `vis` 判断 | `vis` 不可见者 |
| `sceneMap.rooms` | `exploredBy` 与观看者调查员有交集 | 其余 |

**第三层：记录字段白名单。** 留下的记录只复制白名单字段，其余字段（包括 `tool_calls`、`tool_call_id`、所有 `_` 开头的字段、`vis` 本身）一律不复制：

| 记录 | 复制的字段（首版） |
|---|---|
| 对话消息 | `msgId`、`role`、`content`（经第 6 节处理）、`charName`、`timestamp` |
| 日志条目 | `id`、`type`、`summary`、`location`、`charName`、`isSuccess`、`timestamp` |
| 骰子条目 | `rollId`、`rolledBy`、`notation`、`total`、`label`、`level`（占位条目只有 `rollId`、`label`、`hidden: true`） |
| 线索 | `id`、`title`、`content`、`type`、`relatedIds`、`location`、`status` |
| 地图房间 | `id`、`name`、`status`、`connections` |
| 调查员（非操控者） | `invId`、`name`、`jobName`、外貌、可见伤势 |
| 调查员（操控者） | 完整角色卡（属性、技能、理智、背景、物品、笔记） |
| `combat` / `chase` | 字段清单由系统 21 的设计文档确定；在确定之前**只给轮次与先攻顺序中的名字**，不给任何数值 |

**观看者的三种身份：**
- `keeper`：守秘人自己的界面，直接渲染完整状态，不经过投影。
- `developer`：第一、二、三层都放行（看到完整状态），**但第 6 节的个人限制照样生效**——开发者账号也可能是桌边的玩家。
- `guest`：三层白名单全部生效，再加第 6 节。

新增顶层字段、记录类型或记录字段，**必须显式决定**是否加入相应白名单，默认不加。

这是 ADR-0001 所说的"唯一过滤出口"，也是 ADR-0002 快照、补丁与事件的唯一来源（ADR-0002 规定事件不携带内容，只引用视图中的条目）。

### 6. 个人内容限制
对话消息与日志条目可带 `safety: { tags: [...], summary: '...' }`。投影时若 `tags` 与 `viewer.limits.lines` 相交，`content` 替换为
"（此段内容已按你的设置隐藏）"；与 `limits.veils` 相交，替换为 `summary`（缺省时同上）。其他观看者不受影响。

**单人模式同样生效**：渲染对话与日志的组件经过同一个函数 `applySafety(record, limits)`，单人模式的 `limits` 来自本机设置。
X 卡（按下后折叠当前段）在本地写入该观看者的 `limits`（按 `msgId` 折叠），不影响他人。标签来源由系统 26 的设计决定。

### 7. 座位表与个人限制的存放
- **座位表**（`memberId → [invId]`）与**各成员的 `limits`** 由守秘人浏览器按房间号保存在本机 IndexedDB（`room:<房间号>`），不进游戏存档。
- 守秘人浏览器刷新后从本机读回座位表与限制，再为所有人生成快照；本机数据缺失时，玩家在重新加入时上报自己的限制，由守秘人重新确认座位。
- 玩家修改自己的界限 / 帷幕，通过 ADR-0002 的请求送达守秘人浏览器，再写入上述存储。

### 8. 存档第 9 版——幂等规整
- `SAVE_SCHEMA_VERSION` 从 8 升到 9。
- `migrateSaveData` 本来就对任何来源版本整体规整一遍；本 ADR 在其中加入**不依赖来源版本、可重复执行**的规整：
  - `ensureInvIds(roster)`，并同样处理 `arcLedger.characterSnapshot`（账本恢复会直接替换 `roster`）；
  - 状态为已探索 / 当前、缺 `exploredBy` 的地图房间，补为当时全体调查员；
  - 对话消息缺 `msgId` 的，补上稳定 id；
  - 不给旧记录加 `vis`（第 5 节第二层已把 `system` / `tool` / `isHidden` / `isLocalOnly` 挡在游客视图之外）。
- 单人模式下守秘人即玩家，投影不参与，界面与第 8 版一致（第 6 节的个人限制除外，它按本机设置生效，默认无限制）。

### Key Interfaces

```js
// src/js/state/visibility.mjs（新）
export const GUEST_TOP_LEVEL_ALLOWLIST = Object.freeze([ 'roster', 'currentLocation', 'knownLocations', 'chatHistory',
  'journalLog', 'clueBoard', 'sceneMap', 'combat', 'chase', 'diceHistory', 'atmosphere', 'worldClock',
  'inventory', 'storage', 'keeperStyle' ]);
export const GUEST_RECORD_FIELDS = Object.freeze({ chat: [...], journal: [...], dice: [...], clue: [...], room: [...], investigatorPublic: [...] });
export function canSee(viewer, vis) {}
export function applySafety(record, limits) {}          // 单人与联机共用
export function projectFor(viewer, gameState) {}         // 三层默认拒绝；返回新对象，不修改 gameState

// src/js/state/char_record.mjs
export function ensureInvIds(roster) {}
export function resolveInvId(nameOrId, roster) {}        // 解析失败 → null，调用方必须改用 { to: 'keeper' }
```

### Implementation Guidelines
- 发给他人的一切数据 **must** 经过 `projectFor`；**must never** 从 `gameState` 直接取字段发送。
- `projectFor` **must** 在顶层字段、记录类型、记录字段三层都用白名单；新增项 **must** 显式决定，默认不加。
- `role: 'system'`、`role: 'tool'`、`isHidden`、`isLocalOnly` 的记录 **must never** 进入游客视图。
- 暗骰的 `vis` **must** 由掷骰处一次决定，并带到骰子历史、日志、对话、工具结果全部派生记录。
- 可见范围 **must** 引用 `invId`；名字 **must** 经 `resolveInvId` 转换，解析失败 **must** 取 `{ to: 'keeper' }`。
- `invId` **must** 在 `createInvestigatorRecord` 中生成，所有写入 `roster` 的入口 **must** 经过 `ensureInvIds`。
- 个人限制 **must** 对开发者账号与单人模式同样生效。
- 泄露测试 **must** 从**真实写入路径**生成状态（一次 AI 回合、一次公开检定、一次暗骰、一次私有线索、一次未探索房间、一次 KP 引擎暗中操作），
  再对游客视图断言：系统提示、工具结果、骰值、私有线索、未探索房间、他人私有角色卡字段、守秘人字段都不出现。纳入 `npm run ci:smoke`。
- 每个白名单字段 **must** 有一条正向测试（游客能看到）。
- 第 9 版规整 **must** 幂等，并扩展现有存档升级冒烟测试，覆盖 `arcLedger.characterSnapshot`。

## Alternatives Considered

### Alternative 1: 只在顶层字段用白名单，记录级默认可见（本 ADR 初稿）
- **Rejection Reason**：第二轮审查 R-F1 证实对话历史会把守秘人系统提示与工具结果带给游客。默认拒绝必须下推到记录与字段。

### Alternative 2: 黑名单（列出要隐藏的字段）
- **Rejection Reason**：新增状态字段很频繁，失败方向是泄露。

### Alternative 3: 每名玩家一份独立的游戏状态
- **Rejection Reason**：同一条线索、同一个房间存多份，结算时极易不一致；改动面远大于加字段。

### Alternative 4: 按名字标识调查员
- **Rejection Reason**：改名、重名、AI 写错名字都会挂错人；R30 已有同类修复。

## Consequences

### Positive
- 三层默认拒绝，新字段、新消息类型、新记录字段都不会意外泄露。
- 暗骰在所有派生记录里一致隐藏。
- 旧存档零成本升级；单人模式行为不变，并获得个人内容限制。

### Negative
- 投影需要为每类记录维护字段清单，新功能要同步更新（遗漏表现为"游客看不到"，不泄露）。
- 掷骰函数与各写入点要传递 `vis` 与 `rollId`；AI 工具要支持可见范围参数。
- 共享战斗面板上调查员数值的可见性要等系统 21 / 22 的设计确定，在此之前游客只看到名字与轮次。

## Risks
- **字段清单漏项导致功能缺失**：缓解：每个白名单字段一条正向测试。
- **AI 工具不填可见范围**：缓解：工具参数增加可选 `vis`，缺省为全员；名字解析失败时自动取 `{ to: 'keeper' }`；守秘人界面可事后改。
- **迁移把地图探索归属算错**：缓解：旧档全部归给全体调查员（与单人时代的体验一致）。
- **座位表与限制在守秘人设备上丢失**：缓解：玩家重新加入时上报自己的限制，守秘人重新确认座位。

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| game-concept.md | 暗骰数值只有开发者账号可见，游客看不到具体数目 | 第 3 节：一处决定 `vis`，四处派生记录各有占位 |
| game-concept.md | 线索可见范围，玩家可向他人出示 | `vis` + `share_clue` |
| game-concept.md | 地图只属于亲身经历的玩家，可分享 | `exploredBy` + `share_map` |
| game-concept.md | 角色卡：其他玩家只看公开部分 | 第 5 节第三层的调查员字段分层 |
| game-concept.md | 内容限制只作用于设置者本人；单人模式也能设 | 第 6 节，开发者与单人模式同样生效 |
| systems-index.md | 系统 18 为瓶颈 | 唯一投影出口 |
| architecture-review-2026-10-16.md | F5 状态分区与存档第 9 版 | 第 1–8 节 |
| architecture-review-2026-10-16-adr-0002-0003.md | R-F1、R-F2、R-F4、R-F7、R-F8、R-F9、R-F11、R-F12、R-F13 | 见修订记录 |

GDD sync: NOT ASSESSED — 系统 18–26 尚无设计文档。

## Performance Implications
- **CPU**：每次投影遍历白名单字段与记录；对话窗口内（见 ADR-0002）4–6 人时预计每次 < 10 ms。
- **Memory**：记录多 `vis` / `rollId` / `msgId` 小字段；调查员多 `invId`。
- **Load Time**：旧存档首次读入时规整一次，可忽略。
- **Network**：无直接影响。

## Migration Plan
1. `char_record.mjs`：`invId`、`ensureInvIds`、`resolveInvId`；所有 `roster` 入口接入。
2. 存档第 9 版幂等规整（含 `arcLedger.characterSnapshot`、`msgId`、`exploredBy`）；扩展存档升级冒烟测试。
3. `visibility.mjs`：三层白名单、`projectFor`、`applySafety`；从真实写入路径生成状态的泄露测试与正向测试，纳入 `ci:smoke`。
4. 掷骰与写入点支持 `vis` / `rollId`；暗骰占位记录。
5. 联机适配层（ADR-0002）只调用 `projectFor`。

## Validation Criteria
- 泄露测试与正向测试全部通过，并在 `ci:smoke` 中运行。
- `src/tests/fixtures/` 中所有测试存档规整到第 9 版后读档正常，`npm run ci:smoke` 全部通过。
- 单人模式下界面与第 8 版一致（未设个人限制时）。

## Revision History
- 2026-10-16：按第二轮独立审查（`docs/architecture/architecture-review-2026-10-16-adr-0002-0003.md`，结论 CONCERNS）修订：
  R-F1 默认拒绝下推到记录类型与记录字段，系统 / 工具 / 隐藏 / 本地消息一律不进游客视图，泄露测试改为从真实写入路径生成；
  R-F2 暗骰 `vis` 由掷骰处一次决定并带到四处派生记录，各有占位；R-F4 `Depends On` 只留 ADR-0001；
  R-F7 开发者账号同样适用个人限制；R-F8 迁移改为幂等规整，覆盖战役账本快照，`invId` 在创建时生成；
  R-F9 `combat` / `chase` 走字段白名单，清单待系统 21 设计；R-F11 座位表与限制存守秘人本机，单人模式也应用限制；
  R-F12 逐个决定未列字段；R-F13 名字经单一解析函数转 `invId`，失败取最严格范围。状态仍为 Proposed。

## Related
- ADR-0001（依赖）、ADR-0002（以本 ADR 为唯一来源）
- `docs/architecture/architecture-review-2026-10-16.md`（F5、F7）
- `docs/architecture/architecture-review-2026-10-16-adr-0002-0003.md`（R-F1–R-F13）
- `design/gdd/game-concept.md`——"真人守秘人辅助模式"
