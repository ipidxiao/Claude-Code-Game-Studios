# ADR-0003: 按玩家过滤——可见范围模型、唯一投影出口与存档第 9 版

## Status
Proposed

## Date
2026-10-16

## Last Verified
2026-10-17

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

### 1. 唯一且永久的调查员编号 `invId`
**根因（2026-10-17 代码审查 F1 的 5why 分析）：** 编号在两次读档之间变化 ← 编号在读档时临时补发 ← 旧存档里没有编号、读档又不写回
← 调查员没有身份，只有一份份被复制的数值（每个存档槽、自动存档、战役账本快照、导出文件各一份），引擎靠名字认人
← 记录结构从一开始就没有身份字段。所以修法不是"每次都算出同一个编号"，而是**让身份成为记录的一部分：发一次、存下来、此后只读**。

- **发号只在两个时刻**：新建调查员（`createInvestigatorRecord`）；旧存档第一次读入（第 8 节）。编号是随机生成的唯一值，
  **不从名字、位置或存档内容推算**。
- **发了就存**：旧存档读入后若发了编号，`loadGame` 立刻把这份存档（该副本的第 9 版规整结果，与玩家下次存档时写入的内容相同；`savedAt` 不变）
  **写回它被读出的那个副本**；另一个副本、损坏的原文、仅 IndexedDB 的槽位都不动。此后读档只读不发。
  这取代了 R29.25"读档不改写存档"的规则——这是唯一的例外，其余 R29.25 的副本规则保持不变。
- **复制不换号**：存档、战役账本快照（`exportArcLedger`）、工具回滚快照都是深拷贝，编号随记录走。
  旧战役账本快照里没有编号的同一个人，通过与同一份存档的 roster **按唯一名字配对一次**取得相同编号（这是一次性的迁移配对，
  不是用名字作身份；重名或找不到时发新号）。
- 写入 `roster` 的入口经过 `ensureInvIds`：创建、`addToRoster`、读档、战役账本恢复。工具出错回滚与读档失败回滚恢复的是
  同一会话里已带编号的深拷贝，不需要补号。重号会被重新发号。
- 同一个人在多个副本里的编号统一，见第 1.1 节。
- **名字到 `invId` 的唯一解析函数** `resolveInvId(nameOrId)`：写入方（骰子、日志、AI 工具）拿到名字时只能经它转换；
  **解析失败时可见范围取最严格的 `{ to: 'keeper' }`**，绝不退回全员可见。

### 1.1 跨副本的身份登记（`src/js/state/identity_registry.mjs`）
**根因（5why）：** 同一个人在两份旧档里拿到两个编号 ← 每份副本各自发号 ← 发号的地方只看得到眼前这一份，不知道别处已经发过什么
← 设备上没有一个"发过哪些编号"的记录，人只以副本的形式存在 ← 而对两份来自不同写入的副本，"是不是同一个人"这个事实根本不在数据里
（同名不等于同一人，数值变了也不等于换了人），只在玩家心里，系统却从来不问。

所以修法有两半，缺一不可：
- **设备上唯一的身份登记**（`localStorage` 键 `coc_identity_registry`），记住每次发号：
  - **同一次写入的副本自动同号——有证据，不靠猜。** 没有编号的旧记录按"`savedAt` + 记录类别 + 记录全文（+ 同文序号）"作键；
    同一次存档写出的 localStorage 副本、IndexedDB 副本、导出文件、再导入，键都相同，取到第一次发的编号。
    键只用来查"这份副本发过什么"，**编号本身仍是随机值**，不从内容推算。没有 `savedAt` 的记录不作键（无法证明是同一次写入）。
  - 大厅读取模组列表时会读遍所有模组的存档，因此每份存档在被读入之前就已登记，同一副本无论先读哪一份都拿到同一个编号。
    **只读路径（大厅、诊断、存档对比）写登记是有意的**；登记只在内容有变化时才写。
- **来自不同写入的副本由玩家确认。** 登记把"同名、不同编号、未被判定为不同人"的两人列为建议，存档管理里的"调查员身份"面板展示
  两人各自见于哪些存档、职业、玩家名，由玩家选"是同一人"或"不是同一人"：
  - "是同一人"记为别名（先登记者为准）。每份存档下次读入时把别名编号改写为正式编号，**存档里所有引用一并改写**
    （`roster`、账本快照，以及存档数据 12 个顶层字段之下的 `invId`、`exploredBy`、`vis.to`；以后新增的带编号字段须使用这三种键名之一，
    或加入 `remapInvIds` 的规则），旧编号记入记录的 `formerInvIds`，
    再按第 1 节写回被读的副本。当前打开的游戏立即改写，下次存档生效。
  - "不是同一人"记为不同，不再建议。
  - **可以拆分**：拆分在登记里留下**正面记录**（`splits[被拆者] = 当时的正式编号`），存档下次读入时，若记录的 `formerInvIds` 中有被拆分的编号，
    就恢复到最近一个被拆分的编号（合并链中拆哪一环都有效）。**没有拆分记录就不恢复**——"找不到别名"不是拆分的证据（代码审查 F1、F5）。
    被拆者再与**原来那人**合并时清除该拆分记录；并给别人时保留，合并期间写出的旧副本仍能回到正确的人（审计 L2）。
  - **同一队伍里的两人永远不是同一人**：登记看到两人出现在同一份 `roster` 里就记为不同，既不建议也不允许合并；
    改写时若会让同一 `roster` 出现两个相同编号，则不改写并记为不同。
- **决定随存档走，按时间先后决出**（审计 2026-10-18 N1、L3）：
  **根因（5why）**——拆分后的存档在别的设备上被改回合并 ← 别的设备从合并期间的副本学会了合并 ← 它不知道后来拆分过 ← 拆分只记在本机登记、
  存档里不留痕迹 ← 玩家的身份决定只有一半（合并）随存档走，另一半（拆分、"不是同一人"）只在本机。所以修法是让三种决定对称：
  - 登记把玩家的每个决定（合并、拆分、"不是同一人"）记成**带时间的决定日志**；别名、拆分、不同人都由日志**按时间顺序重放**得出，
    同一对人以最后一个决定为准；"同一队伍里出现过"是事实，不是决定，重放时任何合并都不能违反它。
  - 每条调查员记录带着与它有关的决定（`idDecisions`）随存档保存；读档时**先学会存档带来的决定，再改写编号**。
    于是登记丢失、换设备、导入别处存档时，合并与拆分都能按原先的先后重建，读入顺序不影响结果；与本机决定冲突时，以时间较晚者为准。
  - 第 1.1 节以前（R30.3）写出的存档只有 `formerInvIds`，视为最早的合并决定。
  - 已知限制：不同设备的时钟不准时，"较晚"按各自时钟判断。
  尚未写回的旧副本会重新发号，同名的人会再次出现在建议里。
- **存储失败**：本机存储满或不可用时，登记保留在内存里并以内存为准，直到写入成功；合并、拆分、"不是同一人"会告诉面板"未能保存"，
  面板提示这项决定只保留到刷新页面为止（已读取并写回的存档仍带着决定）。登记内容损坏时先原样另存为 `coc_identity_registry.bad-<时间>` 再重建。
- **证据**：每次"检查全部存档"会先清掉各存档槽的来源记录再重新收集，已删除或覆盖的存档不再作为证据；不在任何存档里的人不再出现在建议里。
- 已知窗口：两个标签页同时第一次打开大厅时，登记的整块读改写可能互相覆盖，窗口很小，记录在案。

### 2. 可见范围字段 `vis`

| 值 | 含义 |
|---|---|
| 缺省 | 全员可见——**只在该记录类型的投影规则允许缺省时成立**（见第 5 节） |
| `{ to: 'keeper' }` | 仅守秘人与开发者账号 |
| `{ to: ['inv_a1', ...] }` | 指定调查员的操控者，外加守秘人与开发者账号 |

规整与投影都把现有的 `isHidden: true`、`isLocalOnly: true` 视为 `vis: { to: 'keeper' }`。

### 3. 暗骰：一处决定，带到所有派生记录；占位在投影时生成
掷骰函数接受 `{ hidden, visibleTo }`，由 `rollVisibility` 算出 `vis`，**由掷骰处一次性决定**，并由同一处把同一个 `vis` 与同一个 `rollId` 写进它产生的全部记录：骰子历史条目、行动日志条目、
对话里的检定结果行、工具结果。

**权威状态里每次掷骰只有一组真实记录，不存占位。** 占位由 `projectFor` 在投影时生成：观看者看不到某条记录、而该记录类型"允许占位"时，
输出一条**同编号**的占位版本（只含技能名与"守秘人进行了一次暗骰"）。这样同一编号在任何一份视图里只对应一条记录，按编号比较与按编号取条目都确定；
存档、AI 上下文和单人回看里也不会出现重复条目。

允许占位的记录类型：骰子条目、日志里的检定条目、对话里的检定结果行。工具结果（`role: 'tool'`）不允许占位——游客本来就看不到工具结果。

对话里的检定结果行是一种新的可投影记录：`{ role: 'system', kind: 'roll', rollId, vis, content }`。第二层对它**显式放行并按 `vis` 投影**
（公开检定原样、暗骰变占位），这样概念文档要求的"暗骰照常写入互动窗口"在游客视图里也成立；其他 `role: 'system'` 消息仍一律丢弃。
检定结果行带 `isLocalOnly: true`，它在这里只表示"不发给 AI、不进存档"；`kind: 'roll'` 是 `isLocalOnly` 记录进入游客视图的**唯一例外**，按 `vis` 投影。

`rollId` 用随机串或单调计数器生成。现有骰子条目的 `id: Date.now()` 在同一毫秒内多次掷骰会重号，不能当 `rollId`。

**AI 叙述里的【骰子】段（代码审查 F8，已解决，两道防线都做）：**
1. **提示**：暗骰的工具结果末尾附 `DARK_ROLL_AI_NOTE`，要求【骰子】段只写"守秘人进行了一次暗骰"，任何段落都不写骰值与目标值。
2. **投影**：游客视图里的 assistant 消息一律去掉【骰子】段（到下一个**已知段标题**为止，标题清单与输出协议共用 `data/narrative_sections.mjs`，
   含【故事】等别名；段内的【人名】【技能】【失败】等括号不是段标题，不会让【骰子】段提前结束——审计 N3；
   它只是检定结果行的副本，游客已从检定结果行按 `vis` 拿到该看的部分），并对该观看者看不到的掷骰，把正文里以下写法替换为"（暗骰）"：
   `N/M`、"骰出 / 掷出 / 掷了 / 骰值 / 点数 / 结果 + N"、"技能名 + N"、"N 点"、"目标 / 技能值 / 成功率 + 目标值"（`narrationForGuest`）。
   **替换哪些数值，在写入叙述时就记下**（审计 N2 的根因：暗骰与叙述的关系没有在写入时记录，只能事后按数值猜）：
   掷骰处把暗骰放进 `gameState.pendingDarkRolls`（"AI 已看到、尚未叙述"）；AI 的叙述消息写入时（`triggerAI` 的唯一写入点）领走它们，
   记在该消息的 `darkRolls` 上，随对话保存。投影只按**该消息自己的**清单、只替换该观看者看不到的那些掷骰。
   因此暗骰之前写的叙述、之后回合里同数值的伤害或公开检定都原样保留；不受骰子面板 30 条上限影响，对话窗口、往前翻页、读档后都成立。
   `darkRolls` 只在守秘人 / 开发者视图里，游客视图的字段白名单不含它，也不发给 AI（API 消息按字段构造）。
   替换只发生在视图里，权威状态与守秘人 / 开发者视图保留原文。
   **这是第二道防线，不是完全解析**：AI 若用以上之外的写法复述数值（如"八十七"），或在**以后的回合**里重提早先的暗骰数值，
   无法从文本判定；第一道防线是提示（工具结果要求任何段落都不写数值）。

**掷骰处（第 4 步已实现）**：`rollVisibility(gameState, { hidden, visibleTo })` 一次决定可见范围（名字经 `resolveInvId`，任一解析失败取
`{ to: 'keeper' }`），`newRollId()` 发编号；以下三处把同一个 `rollId` 与 `vis` 写进它产生的全部可投影记录：
`rollCustomDice`（骰子条目 + 日志条目）、AI 工具 `roll_dice`（再加对话检定结果行）、`executeSkillCheck`（骰子条目 + 对话检定结果行 + 日志检定条目）。
骰子条目只经 `recordRoll(gameState, entry)` 写入（骰子面板 + 暗骰时进入 `pendingDarkRolls`；工具出错回滚时一并回滚）。
**推动检定**是同一次检定的继续，不是新的决定：推动沿用被推动那次检定的 `vis`，AI 不必再说一次（代码审查 F2）。
原检定的 `vis` 记在推动门禁核实的那条**尝试记录**上（`skillAttempts`），推动直接从门禁返回的记录取，不再按名字搜索（审计 L1）；
免检的推动（规则检定）退回按骰子面板查找，**找不到时取 `{ to: 'keeper' }`，绝不退回公开**。
AI 工具 `roll_dice` 与 `request_skill_check` 增加可选参数 `hidden`、`visible_to`；缺省为公开。日志与对话条目都带 `label`，占位显示"暗骰「侦查」"（F4）。
工具结果（`role: 'tool'`）按记录类型对所有游客不可见，不另写 `vis`。
**尚未支持暗骰**：`group_roll`、`opposed_roll`、理智 / 战斗 / 追逐等其他检定路径——它们目前只产生公开记录或仅守秘人可见的系统行，
不会泄露；需要暗骰时按同一模式接入。

### 4. 地图按人探索
地图房间（`sceneMap.rooms[]`）增加 `exploredBy: [invId]`。投影时只保留观看者调查员探索过的房间。

- **唯一写入函数**：所有把房间设为已探索 / 当前的写入（`setPosition`、`updateRoom`、AI 工具、群体检定等）都经过 `markExplored(roomId, presentInvIds)`，
  按"当前在场的调查员"写入 `exploredBy`。在系统 25 的设计定义"分头行动"之前，"在场" = 座位表中的全部调查员（单人模式 = 全部调查员）。
- **危险 / 上锁房间**：`dangerous` 与 `locked` 是房间的附加状态，不等于探索过；只有经过 `markExplored` 的房间才进入某人的地图。
- **分享**：`share_map` 请求（ADR-0002）把分享者已探索的房间并入对方。是否需要接收方在互动窗口点击确认，由系统 25 的设计决定（概念文档写的是"点击后收录"）。

### 5. 唯一投影出口 `projectFor(viewer, gameState)`——三层默认拒绝

`viewer = { memberId, role: 'keeper' | 'developer' | 'guest', invIds: [...], limits: { lines: [...], veils: [...] } }`

**第一层：顶层字段白名单。** 游客视图只从白名单字段构造，白名单之外一律不出现。

| 决定 | 字段 |
|---|---|
| 进入游客白名单 | `roster`、`currentLocation`、`knownLocations`、`chatHistory`、`journalLog`、`clueBoard`、`sceneMap`、`combat`、`chase`、`diceHistory`、`atmosphere`、`worldClock`、`inventory`、`storage`（全队物品）、`keeperStyle`（今晚桌规） |
| 明确排除 | `kpState`、`kpEngine`、`arcLedger`、`flags`、`npcRegistry`、`scenarioRunner`、`mythosHeat`、`heatEventsLog`、`skillAttempts`、`sanCaps`、`pendingAftermath`、`customWeapons`、`campaignArchive`、`activeCampaign`、`moduleSeed`、`encounterVariant`、`saveCompareMeta`、`saveBlurb`、`endingSaveBlurb`、`selectedCharIndex`、`contextMeta` 等全部守秘人或存档元数据 |
| 暂不放行，待系统 19 / 20 设计决定 | 只在运行时存在、驱动玩家提示的字段：`pendingRuleCheck(s)`（"请先掷骰"）、`groupCheckSession`（群体检定）、`aiActionChoices`（行动选项）、`lastSkillCheck`。默认拒绝下不会泄露，但玩家端暂时看不到这些提示 |

**任何身份都不得投影（`NEVER_PROJECT`）**：`aiSettings`（含守秘人的 AI 密钥 `apiKey`）以及所有本机设置与界面状态（`ui`、`storageStatus`、`activeModal` 等）。
开发者视图同样不含这些字段。

**第二层：记录类型白名单。** 白名单内的集合字段，每条记录先按类型判断能否进入游客视图：

| 集合 | 允许的记录 | 一律丢弃 |
|---|---|---|
| `chatHistory` | `role` 为 `user` 或 `assistant` 的叙述消息；`role: 'system', kind: 'roll'` 的检定结果行（按 `vis`，不可见时输出占位）。联机投影只含最近 200 条（ADR-0002 第 2 节） | 其他 `role: 'system'`、`role: 'tool'`、`isHidden`、`isLocalOnly`、`isLocalError` |
| `journalLog` | 有 `vis` 时按 `vis`；没有 `vis` 时只放行 `JOURNAL_PUBLIC_TYPES` 中的类型（检定、骰子、战斗、追逐、地图、线索、剧本事件等玩家可见的事件；检定 / 骰子条目不可见时输出占位） | `note`（个人笔记）、`system`、`npc_spawn`、`npc_status`、无类型与任何新类型——默认仅守秘人 |
| `diceHistory` | 按 `vis` 判断（不可见时输出占位） | — |
| `clueBoard.clues` | 按 `vis` 判断 | `vis` 不可见者 |
| `clueBoard.links` | 两端线索都对观看者可见的连线 | 任一端不可见的连线 |
| `sceneMap.rooms` | `exploredBy` 与观看者调查员有交集 | 其余 |
| `inventory` / `storage` | 全部（全队物品） | — |
| `knownLocations` | 全部 | — |

**第三层：记录字段白名单。** 留下的记录只复制白名单字段，其余字段（包括 `tool_calls`、`tool_call_id`、所有 `_` 开头的字段、`vis` 本身）一律不复制：

| 记录 | 复制的字段（首版） |
|---|---|
| 对话消息 | `msgId`、`role`、`content`（经第 6 节处理）、`charName`、`timestamp` |
| 日志条目 | `id`、`type`、`summary`、`location`、`charName`、`isSuccess`、`timestamp` |
| 骰子条目 | `rollId`、`rolledBy`、`notation`、`total`、`label`、`level`（占位条目只有 `rollId`、`label`、`hidden: true`） |
| 线索 | `id`、`title`、`content`、`type`、`relatedIds`、`location`、`status` |
| 地图房间 | `id`、`name`、`status`、`x`、`y`（绘制用坐标）；`note` 不复制（守秘人备注） |
| 线索连线 | `from`、`to`；`note` 不复制 |
| 物品 | 字符串物品原样；对象物品只复制 `name`、`type`、`qty`、`desc`（剧本效果原样拷贝的其余字段不复制） |
| 标量字段 | `currentLocation`、`sceneMap.title`、`sceneMap.currentRoomId`（仅当该房间在观看者地图内，否则为 `null`）、`atmosphere.level`、`worldClock`、`keeperStyle`：原样复制；`atmosphere.note` 不复制 |
| 调查员（非操控者） | `invId`、`name`、`jobName`、外貌、可见伤势 |
| 调查员（操控者） | 完整角色卡（属性、技能、理智、背景、物品、笔记） |
| `combat` / `chase` | 字段清单由系统 21 的设计文档确定；在确定之前**只给轮次与先攻顺序中的名字**，不给任何数值 |

**观看者的三种身份：**
- `keeper`：守秘人自己的界面，直接渲染完整状态，不经过投影。
- `developer`：从**开发者白名单**构造——即游戏数据字段（游客白名单 + 明确排除清单中的守秘人数据），第二、三层放行，
  **但不含 `NEVER_PROJECT`**（AI 密钥与本机界面状态），**且第 6 节的个人限制照样生效**——开发者账号也可能是桌边的玩家。
  不复制整个运行时 `gameState`。
- `guest`：三层白名单全部生效，再加第 6 节。

新增顶层字段、记录类型或记录字段，**必须显式决定**是否加入相应白名单，默认不加。

这是 ADR-0001 所说的"唯一过滤出口"，也是 ADR-0002 快照、补丁与事件的唯一来源（ADR-0002 规定事件不携带内容，只引用视图中的条目）。

### 6. 个人内容限制
对话消息与日志条目可带 `safety: { tags: [...], summary: '...' }`。投影时若 `tags` 与 `viewer.limits.lines` 相交，`content` 替换为
"（此段内容已按你的设置隐藏）"；与 `limits.veils` 相交，替换为 `summary`（缺省时同上）。其他观看者不受影响。

**单人模式同样生效**：渲染对话与日志的组件经过同一个函数 `applySafety(record, limits)`，单人模式的 `limits` 来自本机设置。
（`applySafety` 已实现并由投影使用；接入单人模式的渲染组件随系统 26 一起做，因为在那之前没有任何写入点产生 `safety.tags`。）
X 卡（按下后折叠当前段）是**玩家本机的独立状态**（按 `msgId` 记住折叠了哪些段），不属于 `viewer.limits`，不发给守秘人，不影响他人
（与 ADR-0002"X 卡不需要请求"一致）。标签来源由系统 26 的设计决定。

### 6.5 `msgId` 与 `rollId` 的唯一分配点
现有对话写入约有 138 处、分布在 30 个文件，不逐个修改。**唯一分配点**是 `assignStableIds(gameState)`：由**调用方**在每次投影 / 比较之前
（第 5 步的联机适配层负责；`projectFor` 本身保持纯函数，不补号），以及每次存档之前（`_buildSaveData` 已调用），
为 `chatHistory` 中缺 `msgId` 的消息、`diceHistory` 中缺 `rollId` 的条目就地补号（随存档保存，属于第 9 版字段）。
由掷骰函数产生的记录在写入时就带 `rollId`（第 3 节），`assignStableIds` 只兜底。

### 7. 座位表与个人限制的存放
- **座位表**（`memberId → [invId]`）与**各成员的 `limits`** 由守秘人浏览器按房间号保存在本机 IndexedDB（`room:<房间号>`），不进游戏存档。
- 守秘人浏览器刷新后从本机读回座位表与限制，再为所有人生成快照；本机数据缺失时，玩家在重新加入时上报自己的限制，由守秘人重新确认座位。
- 玩家修改自己的界限 / 帷幕，通过 ADR-0002 的请求送达守秘人浏览器，再写入上述存储。

### 8. 存档第 9 版——幂等规整
- `SAVE_SCHEMA_VERSION` 从 8 升到 9。
- `migrateSaveData` 本来就对任何来源版本整体规整一遍；本 ADR 在其中加入**不依赖来源版本、可重复执行**的规整：
  - `identityRegistry.issue`（内部调用 `ensureInvIds(roster, { donors })`）、`canonicalize`、`observe`（第 1、1.1 节）；`arcLedger.characterSnapshot` 用同一份 roster 作配对来源。发了编号时迁移结果带一个不可枚举的
    `_idsChanged` 计数（发号、合并、拆分都计入），`loadGame` 据此把编号写回读出的副本；
  - **仅对来源版本 < 9 的存档**：状态为已探索 / 当前、缺 `exploredBy` 的地图房间，补为当时全体调查员（这是唯一依赖来源版本的规整；
    第 9 版及以后缺 `exploredBy` 一律取空集，失败时关闭而不是开放）；
  - 对话消息缺 `msgId` 的、骰子条目缺 `rollId` 的，补上稳定 id；
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
export const NEVER_PROJECT = Object.freeze([ 'aiSettings', 'ui', 'storageStatus', 'activeModal' /* 及所有本机界面状态 */ ]);
export function projectFor(viewer, gameState) {}         // 三层默认拒绝；返回新对象，不修改 gameState；生成同编号占位
export function projectHistoryPage(viewer, gameState, beforeMsgId, n) {}   // 与 projectFor 共用第二、三层与 applySafety（ADR-0002 分页）
export function assignStableIds(gameState) {}            // msgId / rollId 唯一分配点
export function markExplored(gameState, roomId, presentInvIds) {}         // exploredBy 唯一写入点
export function newRollId() {}                           // 掷骰处发 rollId
export function rollVisibility(gameState, { hidden, visibleTo }) {}       // 掷骰处一次决定 vis
export function narrationForGuest(content, hiddenRolls) {}                // 游客视图：去【骰子】段、替换暗骰数值
export function recordRoll(gameState, entry) {}          // 骰子条目唯一写入点；暗骰同时进 pendingDarkRolls
export function takeDarkRolls(gameState) {}              // AI 叙述写入时领走，记在消息的 darkRolls 上
export function previousRollVisibility(gameState, rolledBy, label) {}     // 免检推动的后备查找

// src/js/state/identity_registry.mjs（新，第 1.1 节）
export const identityRegistry;   // issue / canonicalize / observe / suggestions / merge / markDistinct / split / merges
export function remapInvIds(data, map) {}               // 改写存档内全部编号引用

// src/js/state/char_record.mjs
export function ensureInvIds(roster, { donors }) {}      // 返回发号数
export function resolveInvId(nameOrId, roster) {}        // 解析失败 → null，调用方必须改用 { to: 'keeper' }
```

### Implementation Guidelines
- 发给他人的一切数据 **must** 经过 `projectFor`（或其分页版本 `projectHistoryPage`）；**must never** 从 `gameState` 直接取字段发送。
- `NEVER_PROJECT` 中的字段 **must never** 出现在任何身份的视图里，包括开发者；开发者视图 **must** 从白名单构造，**must never** 复制整个运行时 `gameState`。
- 占位 **must** 在投影时生成，**must never** 作为记录存进权威状态。
- 把房间设为已探索 / 当前 **must** 经过 `markExplored`；对话 `msgId` 与骰子 `rollId` **must** 由 `assignStableIds` 或掷骰函数分配。
- `projectFor` **must** 在顶层字段、记录类型、记录字段三层都用白名单；新增项 **must** 显式决定，默认不加。
- `role: 'system'`、`role: 'tool'`、`isHidden`、`isLocalOnly` 的记录 **must never** 进入游客视图——唯一例外是对话检定结果行 `kind: 'roll'`，按 `vis` 投影（第 3 节）。
- 暗骰的 `vis` **must** 由掷骰处一次决定，并带到骰子历史、日志、对话、工具结果全部派生记录。
- 可见范围 **must** 引用 `invId`；名字 **must** 经 `resolveInvId` 转换，解析失败 **must** 取 `{ to: 'keeper' }`。
- `invId` **must** 在 `createInvestigatorRecord` 中生成，所有写入 `roster` 的入口 **must** 经过 `ensureInvIds`。
- 个人限制 **must** 对开发者账号与单人模式同样生效。
- 泄露测试 **must** 从**真实写入路径**生成状态（一次 AI 回合、一次公开检定、一次暗骰、一次私有线索、一次未探索房间、一次 KP 引擎暗中操作），
  再对游客视图断言：系统提示、工具结果、骰值、私有线索、未探索房间、他人私有角色卡字段、守秘人字段都不出现；
  并对**开发者视图**断言：不含 `apiKey` 及其他 `NEVER_PROJECT` 字段。纳入 `npm run ci:smoke`。
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
- **AI 工具不填可见范围**：缓解：`roll_dice` / `request_skill_check` 有可选 `hidden`、`visible_to`，缺省为公开；名字解析失败时自动取 `{ to: 'keeper' }`。
- **AI 在叙述里写出暗骰数值**：缓解：工具结果提示 + 投影去掉【骰子】段并替换数值（第 3 节）。叙述用其他写法暗示数值（如"差一点"）无法从文本判定，属叙事本身。
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
4. 掷骰与写入点支持 `vis` / `rollId`；暗骰占位记录。（2026-10-17 已实现，见第 3 节）
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
- 2026-10-16：按第三轮独立审查（`docs/architecture/architecture-review-2026-10-16-round3.md`，结论 CONCERNS）修订：
  R3-F1 开发者视图改为白名单构造并新增 `NEVER_PROJECT`（含 AI 密钥），加开发者泄露测试；R3-F2 占位改为投影时生成，对话新增可投影的检定结果行；
  R3-F4 新增 `msgId` / `rollId` 唯一分配点；R3-F5 新增 `markExplored`，"补为全体"只对第 9 版以前的存档执行；
  R3-F6 为每个白名单字段给出第二、三层规则，房间补 `x`、`y`；R3-F7 列出待系统 19 / 20 决定的运行时字段；
  R3-F9 X 卡为玩家本机状态，`roster` 入口补上两个回滚点；R3-F11 分享是否需要接收方确认交给系统 25。状态仍为 Proposed。

- 2026-10-17：迁移计划第 1–3 步已实现（`src/js/state/char_record.mjs`、`src/js/state/visibility.mjs`、存档第 9 版规整、`src/tests/visibility_leak_smoke.mjs`），游戏的 `ci:smoke` 与 Playwright 全部通过。第 4 步（掷骰与写入点带 `vis` / `rollId`）与第 5 步（联机适配层）未做。状态仍为 Proposed。

- 2026-10-17：按独立代码审查（`docs/architecture/code-review-2026-10-17-adr-0003-steps1-3.md`，结论 CHANGES REQUIRED）修订：
  F1 用 5why 找到根因（调查员没有身份，只有被复制的数值），第 1 节改为"发一次、存下来、此后只读"，读到旧档时把编号写回被读的副本，
  取代 R29.25"读档不改写"规则；账本快照与 roster 按唯一名字配对一次。另：日志无 `vis` 时只放行列出的公开类型（F7）；
  `assignStableIds` 由调用方负责（F9）；`applySafety` 接入单人渲染随系统 26（F5）；回滚入口说明（F6）；暗骰前须处理 AI 叙述的【骰子】段（F8）。
  实现中还发现分头行动的群体检定把探索记录记给全队，已改为只记当前移动的调查员。状态仍为 Proposed。

- 2026-10-17：用户要求彻底解决"同一个人在不同旧档里编号不同"。5why 根因：设备上没有发号记录，而"是否同一人"只在玩家心里、系统从不问。
  新增第 1.1 节身份登记：同一次写入的副本按证据自动同号；不同写入的同名者由玩家在存档管理里确认合并，可拆分，同队者永不合并；
  合并改写存档内全部编号引用并保留 `formerInvIds`。删除第 1 节的"已知限制"。迁移结果的标记改名为 `_idsChanged`。
  同日实现迁移计划第 4 步：掷骰处一次决定 `vis` 与 `rollId`；F8 以"工具结果提示 + 游客视图去掉【骰子】段并替换暗骰数值"解决；F4 日志占位带技能名。状态仍为 Proposed。

- 2026-10-17：按独立代码审查（`docs/architecture/code-review-2026-10-17-adr-0003-step4-identity.md`，结论 CHANGES REQUIRED）修订：
  F1 拆分改为正面记录，登记丢失不再撤销合并，合并决定随存档的 `formerInvIds` 走、登记据此重新学会；F2 推动沿用原检定的可见范围；
  F3 暗骰数值替换改按随存档保存的 `darkRolls`，扩充写法并写明这是第二道防线；F4 存储失败以内存为准并告知面板、损坏先备份；
  F5 合并链中任一环可拆；F6 【骰子】段到任意段标题为止；F8 证据随扫描刷新；F9 写回内容、`remapInvIds` 范围、`isLocalOnly` 例外与多标签页窗口写明。
  状态仍为 Proposed。

- 2026-10-18：按独立审计（`docs/architecture/code-review-2026-10-18-review-fix-7cfff83.md`，结论 CHANGES REQUIRED）修订：
  N1 / L3 身份决定改为带时间的决定日志，三种决定都随存档走、按时间重放（第 1.1 节）；L2 拆分后并给别人不再清除拆分记录；
  N2 暗骰数值替换改为按"写入叙述时记下的那几次暗骰"，删去 R30.3 的全战役暗骰账本；N3 【骰子】段结尾用与输出协议共用的段标题清单；
  L1 推动从尝试记录取原检定的可见范围，找不到时只给守秘人；L5 工具回滚包含未叙述的暗骰。状态仍为 Proposed。

## Related
- ADR-0001（依赖）、ADR-0002（以本 ADR 为唯一来源）
- `docs/architecture/architecture-review-2026-10-16.md`（F5、F7）
- `docs/architecture/architecture-review-2026-10-16-adr-0002-0003.md`（R-F1–R-F13）
- `docs/architecture/architecture-review-2026-10-16-round3.md`（R3-F1–R3-F11）
- `design/gdd/game-concept.md`——"真人守秘人辅助模式"
