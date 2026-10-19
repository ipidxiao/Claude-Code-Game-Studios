# Code Review — ADR-0003 迁移计划第 1–3 步（commit 668078d）

Date: 2026-10-17
Commit: `668078d` feat: add investigator invId, save schema v9 and per-player projection
Reviewer: 独立评审（未参与该提交的编写）
Engine: Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue）
ADRs: ADR-0003（Proposed，主依据）；ADR-0001、ADR-0002 只在接口处对照
Registry: `docs/registry/architecture.yaml`
Prior reports: `architecture-review-2026-10-16.md`、`architecture-review-2026-10-16-adr-0002-0003.md`、`architecture-review-2026-10-16-round3.md`

Reviewed-Content-Hash: docs/architecture/adr-0003-per-player-visibility-and-save-v9.md c341c33986bd5756ac95b216ee75001668385846
Reviewed-Content-Hash: docs/registry/architecture.yaml 89f18365a8999332d3d41200605de7944d8381f5
Reviewed-Content-Hash: src/js/state/visibility.mjs 1692a5930fec35db64ec8636f721f2f521a626cf
Reviewed-Content-Hash: src/tests/visibility_leak_smoke.mjs 2734273b8f0949f0081b1c96e405cb2e659bc4b6

## 结论

**Verdict: CHANGES REQUIRED**

投影函数本身的方向是对的：三层白名单、开发者视图白名单化、`aiSettings` 不出现在任何视图、占位不入状态，这几条代码都做到了，
`ci:smoke` 全部通过。但有两处必须改：

1. **`invId` 并不"永不改变"**（ADR-0003 第 1 节、registry `investigator_identity: created-once`）。旧档每次读入都换一套新编号，
   战役账本快照里的同一名调查员拿到的是另一套编号。已用脚本复现。
2. **泄露测试拦不住大部分泄露。** 我对过滤函数和接线处做了 23 处故意改坏，泄露测试只抓到 5 处。几条断言用的是本来就会被
   别的规则滤掉的数据，等于没有验证。ADR 把这条测试当作投影的门禁，它现在还当不起。

另有若干低级问题与 ADR 需要同步修改的地方，见下文。

## 检查了什么

| 项 | 结果 |
|---|---|
| `git show 668078d` 全部 15 个文件 | 已读 |
| `cd src && npm ci && npm run ci:smoke` | **通过**（exit 0；`visibility_leak_smoke: OK`；Node v22.22.0） |
| Playwright 套件 | **本次未运行**（提交说明称 16/16 通过，本报告未复核） |
| 真实旧档 `src/tests/fixtures/r29_17_save.json`、`r29_19_save.json` 的迁移 | 两份都正常升到第 9 版。**但这两份存档没有地图房间、骰子历史和 `arcLedger.characterSnapshot`**，第 9 版新增的分支用它们测不到；我在其上补了房间与快照后另行验证（见 F1） |
| 变异测试（23 处故意改坏，跑 `visibility_leak_smoke` 与 `save_legacy_upgrade_smoke`） | 抓到 5 处，见 F2 |
| 对照 ADR-0003 第 1–8 节、Implementation Guidelines、Validation Criteria 与 registry | 见"ADR 对照" |
| 现有聊天、日志、骰子、线索、房间的写入点（找出投影实际会碰到的数据形状） | 已用 grep 普查 |

Engine validation: NOT ASSESSED — 自研引擎，框架引擎专家检查不适用。
Testability（qa-tester）：N/A — 没有提供 story 文件；可测性改为用上面的变异测试直接检验。

---

## Findings

### F1 — [Medium，必须修] `invId` 会变：旧档每次读入都换号，账本快照与 roster 编号不一致 — VERIFIED

**位置：** `src/js/state/persistence.mjs:282-283`（迁移中的 `ensureInvIds(d.roster)` 与 `ensureInvIds(d.arcLedger.characterSnapshot)`），
`src/js/state/char_record.mjs:181-190`。

**证据（scratchpad 脚本，用两份真实 fixture，补一个 `current` 房间和 `characterSnapshot = clone(roster)`）：**

```
r29_17_save.json roster [ 'Alice:inv_ae07…' ] snapshot [ 'Alice:inv_0d67…' ] exploredBy [ 'inv_ae07…' ]
  second load of same stored v8 save, roster invId: inv_6472… same? false
r29_19_save.json roster [ 'Bob:inv_6c3a…' ]   snapshot [ 'Bob:inv_84de…' ]   exploredBy [ 'inv_6c3a…' ]
  second load of same stored v8 save, roster invId: inv_62ce… same? false
```

两个问题：

- **同一人两套编号。** 第 9 版之前的存档里 roster 与 `characterSnapshot` 是同一批人，但两次 `ensureInvIds` 各自随机生成，
  互不相干。之后 `restoreCarrySnapshot`（`scenario/runner.mjs:731`，"继承"模式开新剧本时）用快照替换 roster，调查员的编号就变了。
- **读档不回写。** `save_legacy_upgrade_smoke` 明确断言"load must not rewrite the stored schema"，所以第 8 版存档在玩家再次存档之前
  每读一次就换一套 `invId`。

**影响：** 现在是单人模式，还没有泄露。但第 5 步的座位表（`memberId → [invId]`，按房间号存在守秘人本机，ADR-0003 第 7 节）与
`exploredBy` 都以 `invId` 为键：编号一变，玩家就掉座，或者地图上找不到自己探索过的房间（失败时关闭，不泄露，但功能坏掉）。
这违反了 ADR 第 1 节"永不改变"与 registry 的 `write_access: created-once`。

**修法建议：**
- 迁移时先给 roster 补号，再按**唯一的名字**把 roster 的 `invId` 抄给快照里同名、缺编号的记录。ADR 禁止的是"用名字**作为**标识"，
  一次性的迁移配对不在此列。重名或找不到同名记录时才生成新号。
- 旧档读入后的编号要稳定，下面两条选一条，属于设计决定，交作者定：(a) 读档成功后把规整结果写回该槽（需要改掉上面那条断言）；
  (b) 对缺编号的旧记录用确定的方法生成编号（例如存档创建时间 + roster 下标的哈希，不用名字），多次读入结果相同。
- 测试补两条：快照与 roster 同一人编号相同；同一份第 8 版存档读两次，`invId` 相同。ADR 的 Implementation Guidelines
  本来就要求"扩展现有存档升级冒烟测试，覆盖 `arcLedger.characterSnapshot`"，这一项目前没做（见 F2 的 M16）。

### F2 — [Medium，必须修] 泄露测试大多拦不住改坏的过滤 — VERIFIED

提交说明称"对过滤函数做了 8 处故意改坏，全部抓到"。我另做了 23 处（每次只改一处，跑完立即还原，工作树已确认干净）：

| # | 改坏的地方 | 被抓到？ | 若在真实数据上发生 |
|---|---|---|---|
| M1 | 日志忽略 `vis`（`projectJournal` 恒为可见） | **否** | 私有 / 守秘人日志泄露 |
| M2 | 骰子历史忽略 `vis` | 是 | — |
| M3 | 他人角色卡给完整卡 | 是 | — |
| M4 | 房间 `connections` 不过滤 | **否** | 泄露未探索房间的 id |
| M5 | `currentRoomId` 不过滤 | **否** | 泄露未探索房间 id |
| M6 | 房间复制 `note` | **否** | 泄露守秘人房间备注 |
| M7 | 线索复制 `vis`、`note` | **否** | 泄露可见范围与备注 |
| M8 | `projectHistoryPage` 游客走开发者分支 | **否** | 分页把系统提示、工具结果整段给游客 |
| M9 | 物品整条复制 | **否** | 剧本效果的附带字段泄露 |
| M10 | `atmosphere` 整条复制 | **否** | `atmosphere.note`（ADR 明确不复制）泄露 |
| M11 | `combat` 整条复制 | **否** | 敌人 HP、属性等数值泄露 |
| M12 | 线索连线复制 `note` | **否** | 连线备注泄露 |
| M13 | 对话检定行忽略 `vis` | 是 | — |
| M14 | 叙述消息忽略 `vis` | **否** | 指定调查员的叙述泄露给他人 |
| M15 | `effectiveVis` 不把 `isHidden` / `isLocalOnly` 当 `{to:'keeper'}` | **否** | 隐藏线索 / 日志 / 骰子泄露 |
| M16 | 迁移不给 `characterSnapshot` 补号 | **否** | 见 F1 |
| M17 | `addToRoster` 不调 `ensureInvIds` | **否** | 新入队调查员无编号 |
| M18 | `updateRoom` 不调 `markExplored` | **否** | 房间不进地图（失败时关闭） |
| M19 | 群体检定移位不调 `markExplored` | **否** | 同上 |
| M20 | `loadGame` 去掉 `ensureInvIds` | 否（等价变异：迁移已经补过号） | — |
| M21 | 迁移对第 9 版也补 `exploredBy` | 是 | — |
| M22 | 不修复重号 | 是 | — |
| M23 | `resolveInvId` 重名时取第一个 | **否** | 可见范围挂错人，ADR 要求返回 null |

**原因（逐条对过测试源码）：**
- `KEEPER-ROOM-NOTE` 写在**未探索**的 `cellar` 上，`KEEPER-LINK-NOTE` 写在指向**守秘人线索**的连线上。这两样本来就被房间 / 线索规则
  滤掉，"备注不复制"这条规则根本没被测到（M6、M12）。
- 分页测试的前 10 条全是 `line i` 叙述，`projectHistoryPage(…, null, 200)` 又够不到下标 0 的系统提示，所以 M8 存活。
- 没有任何带 `vis` 或 `isHidden` 的日志、带 `isHidden` 的线索或骰子、带 `vis` 的叙述消息、带额外字段的物品、带 `note` 的
  `atmosphere`、带数值的战斗（M1、M9–M11、M14、M15）。
- "每个白名单字段一条正向测试"只做了 `k in a`，返回 `null` 或空对象也能通过。
- `addToRoster` 只断言了 `typeof === 'function'`。ADR 要求用一条测试遍历所有写入 roster 的入口，目前没有这条测试（M17）。
- ADR 要求"一次 AI 回合"走真实写入路径。测试第 49–58 行是手写的对话记录形状（注释写着"Shapes written by ai_logic.mjs"），
  并没有调用真实写入函数。骰子、地图、线索、KP 引擎这几处走的是真实写入函数，这部分属实。

**修法：** 让每条断言都只靠一条规则成立，就像测试里 `UNFLAGGED-SYSTEM-NOTE` / `HIDDEN-ASSISTANT-DRAFT` 已有的写法：
给已探索房间写 note；给公开线索之间的连线写 note；给 `atmosphere` 写 note；给物品加剧本字段；给战斗敌人写 HP；
加一条 `isHidden` 线索和一条带 `vis` 的日志；在分页范围内放一条系统消息；加重名用例；真正调用一次 `addToRoster`。
改完以后，把上表每一处改坏重跑一遍，确认都能抓到。

### F3 — [Low] `createMap` 建出的"已探索 / 当前"房间不经过 `markExplored` — VERIFIED

`src/js/state/gameplay.mjs:454-461`：`createMap` 原样保留传入房间的 `status`（来自 AI 工具或剧本数据），但不写 `exploredBy`。
这类房间对所有游客都不可见。失败时关闭，不泄露；但不符合 ADR 第 4 节"所有把房间设为已探索 / 当前的写入都经过 `markExplored`"。
修法：在 `createMap` 末尾，对 `status` 为 `explored` / `current` 的房间调用 `markExplored(…, presentInvIds(gameState))`。

### F4 — [Low] 日志暗骰占位没有技能名 — VERIFIED

`visibility.mjs:187` 用的是 `e.label`，但现有日志写入（`ai_logic.mjs:696`、`story_dice.mjs:229`、`core.mjs:153`）都不写 `label`，
技能名只在 `summary` 里。占位因此只会显示"守秘人进行了一次暗骰"，与 ADR 第 3 节"只含技能名与……"不符。
可以在第 4 步由掷骰处写入 `label` 时一起解决，届时补一条断言。

### F5 — [Low] 单人渲染还没有接 `applySafety` — VERIFIED

除了 `visibility.mjs`，`src/js` 中没有任何文件调用 `applySafety`。ADR 第 6 节写的是"渲染对话与日志的组件经过同一个函数"。
目前还没有任何写入点产生 `safety.tags`（标签来源属系统 26），所以现在不影响行为。要么在第 3 步把它接进 `story_chat` / `story_journal`，
要么在 ADR 的迁移计划里写明这一项推迟到系统 26。

### F6 — [Low] 两处 roster 回滚点没有经过 `ensureInvIds` — VERIFIED

ADR 第 1 节列出的入口里，工具出错回滚（`ai/tool_snapshot.mjs:78` `replaceArray(gameState.roster, snapshot.roster)`）与读档失败回滚
（`persistence.mjs:761` 附近 `_restoreObject`）都没有调用 `ensureInvIds`。回滚的都是已经规整过的记录，所以现在没有实际危害，
但 ADR 写的是"所有入口都经过"。可以补调用，也可以在 ADR 里写明"回滚恢复的是已规整的快照，豁免"。两者选一。

### F7 — [Info，ADR 问题] 日志、骰子、线索在第二层其实是"缺省可见" — VERIFIED

提交说明和 registry 的 `record_default_visible_to_guests` 都说"记录类型默认拒绝"，但代码与 ADR 第 5 节的表格一致：
`journalLog`、`diceHistory`、`clueBoard.clues` 没有 `vis` 时**全员可见**，日志也不按 `type` 筛选。实际后果是：
`story_journal.mjs:126` 写入的 `type: 'note'`（个人笔记）到联机时是守秘人自己写的笔记，会原样发给所有游客。
建议在 ADR 第 5 节第二层给 `journalLog` 列出允许缺省可见的类型（`skill_check`、`combat`、`chase`、`scenario`、`checkpoint`），
`note` 默认 `{ to: 'keeper' }`（或按作者归属），新增类型默认拒绝。这样才和"三层默认拒绝"的说法一致。

### F8 — [Info，ADR 问题，第 4 步之前必须解决] AI 叙述里的【骰子】段 — VERIFIED

`ai/output_protocol.mjs` 的五段协议中，`【骰子】` 段写在 assistant 消息的 `content` 里（例如"检定 45/60"）。投影对 `assistant`
消息原样复制 `content`。ADR 第 3 节列出的暗骰派生记录有骰子历史、日志、对话检定行、工具结果，**没有列 AI 叙述本身**。
第 4 步一旦加入暗骰，数值就会经叙述正文流向游客。ADR 需要决定：是暗骰时禁止 AI 在叙述中写数值（提示词 + 输出校验），
还是投影时剥掉 `【骰子】` 段。

### F9 — [Info] 其他观察
- `projectFor` 不调用 `assignStableIds`（保持纯函数，这是对的），但 ADR 第 6.5 节写的是"每次投影之前补号"。应在 ADR 中写明由
  调用方（第 5 步的适配层）负责，否则没有 `msgId` 的消息投影后 `msgId` 为 `undefined`，分页就按不到编号。
- `combat.initiativeOrder` 里的名字包括尚未现身的敌人。ADR 允许这样做（交给系统 21），这里只是提醒。

---

## ADR 对照

### 代码没有做到 ADR 要求的

| ADR 位置 | 要求 | 代码 | 见 |
|---|---|---|---|
| §1 | `invId` 永不改变 | 旧档每次读入换号；快照与 roster 编号不一致 | F1 |
| §1 | 所有 roster 入口经 `ensureInvIds`；一条测试遍历全部入口 | 两处回滚没接；遍历测试缺失 | F6、F2 |
| §3 | 占位含技能名 | 日志占位不含技能名 | F4 |
| §4 | 所有已探索 / 当前写入经 `markExplored` | `createMap` 没有 | F3 |
| §6 | 单人渲染经 `applySafety` | 没接 | F5 |
| Guidelines | 存档升级冒烟测试覆盖 `characterSnapshot` | 没有 | F1、F2 |
| Guidelines | 每个白名单字段一条正向测试；泄露测试从真实写入路径产生 | 正向测试只查键存在；AI 回合是手写形状 | F2 |
| Validation | fixtures 规整到第 9 版后读档正常 | 通过，但 fixtures 不含第 9 版新分支要处理的数据 | 检查表 |

### ADR 应根据代码改写的

| ADR 位置 | 代码实际 | 建议 |
|---|---|---|
| §5 第三层 日志字段 | 多了 `rollId` | 加进表格（第 3 节要求按 `rollId` 对应占位，加上是对的） |
| §5 第三层 | 对话检定行复制 `msgId, role, kind, rollId, content`；表格没有这一行 | 补一行 |
| §5 第三层 combat / chase | 另给了 `active`、`currentTurnIdx`、追逐参与者名字 | 写进"系统 21 之前"的临时清单 |
| §5 `NEVER_PROJECT` | 另加了 `currentScreen`、`isLoading`、`activeModuleId` | 写进清单 |
| §5 开发者视图 | 代码用的是 `KEEPER_DATA_FIELDS` 16 个字段；`campaignArchive`、`saveCompareMeta`、`saveBlurb`、`contextMeta` 不在其中 | ADR 给出开发者白名单的确切清单，而不是"明确排除清单中的守秘人数据" |
| §5 `keeper` 身份 | "不经过投影"；代码里 `projectFor` 对 `keeper` 返回开发者视图 | 写明这是兜底行为 |
| Key Interfaces | 要求导出 `GUEST_RECORD_FIELDS`；代码是模块内部常量 | 导出（正向测试可以逐字段遍历），或者从 ADR 中删掉 |
| §5 第二层 | 日志 / 骰子 / 线索缺省可见 | F7 |
| §3 派生记录 | 没有列 AI 叙述的【骰子】段 | F8 |
| §6.5 | 写的是"每次投影之前" | 写明由调用方负责（F9） |
| 修订记录 2026-10-17 | 写的是"ci:smoke 与 Playwright 全部通过" | 补一句：泄露测试存活的变异待修（F2），否则读者会以为门禁已经充分 |

### Registry

- `investigator_identity: write_access: created-once` — F1 修复之前，这条与代码不符。
- 缺少 `exploredBy`（唯一写入点 `markExplored`）以及 `msgId` / `rollId`（唯一分配点 `assignStableIds`）的状态条目。ADR 把它们定为
  "唯一写入点"，按 registry 的惯例应各登记一条。
- `record_default_visible_to_guests` 的描述（"records … are not visible to guests by default"）与 ADR 第二层的缺省可见规则相矛盾（F7）。
  两边应该统一。

---

## Code Review（skill 格式）

### Engine Specialist Findings: N/A — NOT ASSESSED（自研引擎，框架专家不适用）

### Testability: GAPS
函数都是纯函数或对 `gameState` 依赖注入，便于测试；缺的是测试本身（F2）。

### ADR Compliance: DRIFT
ADR-0003：F1（违反 §1 不变量）、F3–F6 为 ADR DRIFT / MINOR DEVIATION。没有使用 ADR 明确否决的方案（顶层黑名单、按名字标识、
存储占位、开发者复制整个状态都没有出现）。ADR-0001 / ADR-0002：本提交不涉及联机，只对照了接口：`projectHistoryPage` 与
`CHAT_WINDOW = 200` 符合 ADR-0002 第 2 节。

### Standards Compliance: 5/6
- 公开函数都有文档注释：通过。
- 复杂度与长度：通过（最长的 `guestView` / `projectChat` 都在 40 行以内）。
- 依赖注入：通过。
- 配置外置：**不通过（轻微）**。`CHAT_WINDOW`、占位文案写死在代码里；这两项属于协议常量，不算玩法数值，可以接受。
- 接口：通过。

### Architecture: CLEAN
依赖方向正确：`visibility.mjs` 不导入任何模块，`gameplay` / `group_check` / `persistence` 依赖它；没有循环依赖（`build:js:check` 通过）。

### SOLID: COMPLIANT

### Game-Specific Concerns
- 投影每次都深拷贝；对话按 200 条窗口截取，但截取发生在完整遍历之后（`projectChat` 先处理全部历史再 `slice(-200)`）。
  长战役的对话可能有数千条，第 5 步按帧或按补丁调用时建议从尾部倒序取够 200 条即停。目前不调用，不影响。

### Positive Observations
- 开发者视图从白名单构造，测试同时断言 `NEVER_PROJECT` 不在任何白名单中。这是对 R3-F1 很好的结构性防护。
- `UNFLAGGED-SYSTEM-NOTE` / `HIDDEN-ASSISTANT-DRAFT` 两条用例让角色规则与标志规则各自单独成立，是正确的写法，应推广到 F2 列出的各条。
- 第 9 版规整确实幂等，并且只有 `exploredBy` 这一处依赖来源版本，与 ADR 完全一致；第 9 版存档缺 `exploredBy` 时失败关闭，也有测试。
- `_coerceSceneMap`、存档裁剪、`compactChatHistory` 都保留 `exploredBy` / `msgId`（已逐一核对）。
- 暗骰占位在投影时生成，权威状态里只有一条记录，并有断言。

### Required Changes
1. F1：同一调查员在 roster 与账本快照中编号一致；旧档多次读入编号稳定；补对应测试。
2. F2：让泄露测试的每条断言不依赖其他规则就能成立，并补齐入口遍历测试与正向测试；修完后重跑上表的变异，确认都能抓到。

### Suggestions
F3–F6 的修补；F7–F9 与"ADR 对照"所列的 ADR / registry 改写。

### Verdict: CHANGES REQUIRED

---

*变异脚本与 F1 复现脚本都在评审会话的 scratchpad 中，未提交；运行后工作树已确认干净。*
