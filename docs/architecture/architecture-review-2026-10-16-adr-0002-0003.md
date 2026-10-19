# Architecture Review Report — ADR-0002 / ADR-0003（含与 ADR-0001 的交叉检查）

Date: 2026-10-16
Mode: full，重点为 ADR-0002、ADR-0003（`modes.rigor: standard` → workflow `standard`：只审架构文档 + 关键 ADR；`modes.automation: guided`）
Engine: Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue）— 框架引擎检查不识别，见"引擎兼容性"
GDDs Reviewed: 2（`design/gdd/game-concept.md`、`design/gdd/systems-index.md`；尚无单系统 GDD）
ADRs Reviewed: 3（ADR-0001、ADR-0002、ADR-0003，均为 Proposed）
Reviewer: 独立评审（未参与上述任何文档的编写）
Registry: `docs/registry/architecture.yaml`（YAML 可解析；ADR-0002 / 0003 新增 6 条立场）
Prior report: `docs/architecture/architecture-review-2026-10-16.md`（CONCERNS）。新鲜度检查：ADR-0002、ADR-0003 为 `NEW`，
ADR-0001 与两份 GDD 为 `CHANGED` → 结构性变化，按完整审查重跑。

Reviewed-Content-Hash: docs/architecture/adr-0001-multiplayer-relay-keeper-authority.md 3385861ad0227ae7803a6e86b734905b2f9938a1
Reviewed-Content-Hash: docs/architecture/adr-0002-multiplayer-sync-protocol.md a58ba908cc8c076e9bec4744502e020f50708359
Reviewed-Content-Hash: docs/architecture/adr-0003-per-player-visibility-and-save-v9.md 85825e59b767959447dd76711fda1aab17bac9cb
Reviewed-Content-Hash: design/gdd/game-concept.md 3bcacfd794561ad2becf0dcb235d047b1dd652b0
Reviewed-Content-Hash: design/gdd/systems-index.md 690f05cb49f2cd25eb56a835a948311542b562f0

> **范围说明。** 沿用上次报告的暂定编号 `TR-concept-NNN`（001–017），新增 018；本次**未写入** `tr-registry.yaml`，
> 理由同上次：第 15–18 号系统尚无 GDD，等 GDD 写成后再按系统登记稳定编号。第 1–14、31–34 号现有系统按 `standard` 档不要求 ADR。

---

## Traceability Summary

Total requirements: 18
✅ Covered（Accepted ADR）: 0
🟡 Covered（Proposed）: 8
⚠️ Partial: 9
❌ Gaps: 1

上次的两个缺口已关闭：F2（守秘人源）由 ADR-0001 修订覆盖，F5（状态分区 + 存档第 9 版）由 ADR-0003 覆盖。
所有覆盖仍来自 Proposed ADR，结论上限为 CONCERNS。

## Traceability Matrix

| Requirement ID | GDD | System | Requirement | ADR Coverage | Status |
|---|---|---|---|---|---|
| TR-concept-001 | game-concept.md | 15, 17 | 房间 / 邀请码加入；角色卡、骰子、场景、战斗与追逐实时同步 | ADR-0001 拓扑与信封；ADR-0002 投影视图快照 + 补丁 | 🟡 |
| TR-concept-002 | game-concept.md | 17 | 断线重连后恢复当前局面 | ADR-0001 `epoch` / `dseq` / 服务程序补发；ADR-0002 `baseVer` 校验 + `resync` | ⚠️ 机制完整，但快照只带 200 条对话与"上次已发视图"的关系未定，数组差异算法与现有数据形态不符（R-F5） |
| TR-concept-003 | game-concept.md | 20 | 暗骰数值仅开发者账号可见，游客只见占位；暗骰照常写入日志与互动窗口 | ADR-0003 `vis: { to: 'keeper' }` 骰子记录 + 占位 | ⚠️ 一次检定的数值同时写进 4 处，ADR 只处理了 `diceHistory`；瞬时事件无过滤函数（R-F2、R-F3） |
| TR-concept-004 | game-concept.md | 16 | 开发者账号与游客两种身份 | ADR-0001 修订 F1（以连接身份覆盖 `from`、凭据与吊销），原型 11/11 验证 | 🟡 |
| TR-concept-005 | game-concept.md | 18, 19 | 玩家视图只显示自己的卡、自己的线索、自己探索过的地图；守秘人看全部 | ADR-0003 白名单 + `vis` + `exploredBy` + 角色卡分层 | ⚠️ 白名单只在顶层默认拒绝，集合内记录默认可见，`chatHistory` 会把守秘人系统提示与工具结果发给游客（R-F1） |
| TR-concept-006 | game-concept.md | 18, 23, 24, 25 | 线索 / 日志 / 地图按人分区，存档第 8 版升级 | ADR-0003 第 1–3、7 节 | ⚠️ 迁移落点与战役账本恢复路径未覆盖（R-F8） |
| TR-concept-007 | game-concept.md | 26 | 界限 / 帷幕 / X 卡只作用于设置者本人 | ADR-0003 第 6 节 `safety` 挂钩 + `viewer.limits` | ⚠️ 标签来源留给系统 26（合理）；开发者身份不适用限制（R-F7）；X 卡与设置限制没有请求类型（R-F10） |
| TR-concept-008 | game-concept.md | 27 | 暂停投票（时限、过半、弃权、无否决权） | ADR-0001 F6 信任模型说明；ADR-0002 `vote` 请求 | 🟡 |
| TR-concept-009 | game-concept.md | 21 | 共享战斗与追逐面板全桌可见，每名玩家只能操作自己的调查员 | ADR-0002 请求 / 回执；ADR-0003 白名单含 `combat`、`chase` | ⚠️ "敌人公开状态"未定义；面板上的调查员数值与角色卡分层冲突（R-F9） |
| TR-concept-010 | game-concept.md | 22 | 玩家能改自己的名字 / 背景 / 笔记，不能直接改 HP / SAN / 技能；守秘人手改记日志 | ADR-0001 玩家只发请求；ADR-0003 角色卡分层 | ⚠️ ADR-0002 首批请求类型没有"改自己的角色卡"（R-F10） |
| TR-concept-011 | game-concept.md | 23, 25 | 线索发给指定玩家；玩家向他人出示线索、分享已探索地图 | ADR-0002 `share_clue` / `share_map`；ADR-0003 `vis` / `exploredBy` | 🟡 |
| TR-concept-012 | game-concept.md | 28 | 固定团共享战役 | ADR-0001 F4 不透明数据块 | ⚠️ 未变：跨设备迁移留给系统 28 的 ADR |
| TR-concept-013 | game-concept.md | 15 | 线下（热点 / Wi-Fi）与线上同一套代码 | ADR-0001 决定 4，三档连接（Chromium 实测） | 🟡（实机待验证） |
| TR-concept-014 | game-concept.md | — | 不联机时单人模式照旧 | ADR-0001/0002/0003 实施准则；ADR-0003 迁移缺省全员可见 | 🟡 |
| TR-concept-015 | game-concept.md | 29 | AI 副守秘人仅开发者账号可用 | ADR-0001 AI 留在守秘人浏览器；ADR-0002 玩家端不调用 AI | 🟡 |
| TR-concept-016 | game-concept.md | 3, 13, 15 | 守秘人联机时继续使用已有存档、战役账本与 AI 密钥 | ADR-0001 F2：守秘人固定 `http://localhost:8080` | 🟡 |
| TR-concept-017 | game-concept.md | 30 | 多模型 AI 接入层，契约测试 | — | ❌ GAP（与联机无关，可并行；上次列为 ⚠️ 备查，现按"无 ADR"如实计为缺口） |
| TR-concept-018 | game-concept.md | 26 | 单人模式下玩家也可给自己设界限与帷幕 | ADR-0003 第 6 节 | ⚠️ ADR-0003 第 7 节规定单人模式"投影不参与"，挂钩在单人模式下不生效（R-F11） |

---

## 代码事实核对（ADR 的 References Consulted）

| ADR 的说法 | 核对结果 |
|---|---|
| `SAVE_SCHEMA_VERSION = 8`（ADR-0003） | 属实，`src/js/state/persistence.mjs:73` |
| 存档序列化字段"30 多个"（ADR-0002） | 属实，`_buildSaveData` 的 `data` 有 36 个字段（`persistence.mjs:535` 起） |
| 白名单与排除清单中的字段名（ADR-0003 第 5 节） | 全部存在于 `_buildSaveData`；另有 `inventory`、`storage`、`activeCampaign`、`moduleSeed`、`encounterVariant`、`keeperStyle`、`endingSaveBlurb`、`saveBlurb`、`selectedCharIndex`、`contextMeta` 两边都未列（默认拒绝下不泄露，但见 R-F12） |
| `accessor.findChar(name)` 按名字查找（ADR-0003） | 属实，`src/js/state/accessor.mjs:48` |
| 调查员没有稳定编号（ADR-0003） | 属实；记录由 `createInvestigatorRecord`（`src/js/state/char_record.mjs:19`）创建，无 id 字段 |
| `addJournalEntry` 在 `core.mjs`、`addClue` / 骰子 / 地图在 `gameplay.mjs` | 属实（`core.mjs:152`；`gameplay.mjs:381`、`327`/`374`、`438–476`）。但写入点不止这些：`ai_logic.mjs:679` 也写骰子历史，`campaign/kp_execution_engine.mjs:1129` 直接 `push` 线索，`scenario/effects_apply.mjs`、`campaign/group_check.mjs` 也改地图 |
| `migrateSaveData` 可"增加 8 → 9 步骤"（ADR-0003） | 函数存在（`persistence.mjs:426`），但它是**一次性规整全部字段后盖上当前版本号**，没有按版本分步的结构（见 R-F8） |
| `save_legacy_upgrade_smoke`、`src/tests/fixtures/` | 存在（`src/package.json` 的 `test:engine`；fixtures 含 `r29_17_save.json`、`r29_19_save.json`） |
| 对话消息已有 `isHidden` / `isLocalOnly`（概念文档） | 属实，且被用于守秘人私密内容——这正是 R-F1 的来源 |
| 原型 relay 对 `to: 'all'` 的规则 | `prototypes/multiplayer-relay/relay.mjs:107`：只放行 `kind: 'system'`（见 R-F6） |

---

## 主要发现

**R-F1 — `chatHistory` 进入游客白名单，但记录级默认"可见"，会泄露守秘人系统提示与检定结果（安全，严重度：高）。**
ADR-0003 的"默认拒绝"只在**顶层字段**成立；白名单内集合的记录规则是"`vis` 缺省 = 全员可见"，迁移又规定"其他记录不加 `vis`"。
而现有 `chatHistory` 里混有只该守秘人看的内容：
- 守秘人系统提示（`{ role: 'system', isHidden: true }`，`src/js/state/core.mjs:97`；剧本运行器也依赖它，`scenario/runner.mjs:798`）；
- KP 引擎的暗中操作记录（"社交渗透……已被标记 _kpCompromised"，`campaign/kp_execution_engine.mjs:1054`）；
- `role: 'tool'` 的工具结果，含骰值与目标值（`ai_logic.mjs:728/746/757`），以及 assistant 消息上的 `tool_calls` 参数；
- `isLocalOnly` 的系统行（"骰出 37/50"，`ai_logic.mjs:695`）。

按 ADR-0003 原文实现，游客快照会包含这些内容，正是 ADR-0001 核心承诺要防的情况。泄露测试"构造含该数据的状态"若只构造带 `vis` 的私有记录，
也测不出这一类。建议：(1) 把"默认拒绝"下推到**记录与字段级**——集合字段的投影对每类记录用字段白名单（例如对话只取 `role ∈ {user, assistant}`
的 `content` 与必要元数据，丢弃 `tool_calls`、`role: 'tool'`、`isHidden`、`isLocalOnly` 与所有 `_` 开头字段）；(2) 迁移或投影把
`isHidden` / `isLocalOnly` 视为 `vis: { to: 'keeper' }`；(3) 泄露测试改为**从真实写入路径**（一次 AI 回合、一次检定）生成状态再投影，
而不是手工构造。`roster`、`combat`、`chase` 的子字段同理需要字段白名单。

**R-F2 — 一次暗骰的数值写进 4 处，ADR-0003 只处理了 1 处（安全，严重度：高）。**
现有检定路径（`ai_logic.mjs:679–696`）一次写入：`diceHistory` 条目、`chatHistory` 的系统行、`journalLog` 的 `skill_check` 摘要
（"侦查 检定 成功（37/50）"）、`role: 'tool'` 结果；`gameplay.mjs:327/374` 的骰子路径也写日志。ADR-0003 第 2 节只说"暗骰是 `vis: keeper` 的骰子记录"，
Key Interfaces 的示例实际上像日志条目（`type`、`summary`），两者混在一起。建议规定：**暗骰由掷骰函数一次性决定 `vis`，并由同一处把它带到所有派生记录**
（骰子历史、日志、对话、工具结果），占位条目也在这些地方各生成一条；泄露测试覆盖全部四处。

**R-F3 — 瞬时事件没有过滤函数（ADR-0002 × ADR-0003 × ADR-0001 接口冲突，严重度：高）。**
ADR-0001 要求 `state` / `event` 消息**全部**由唯一过滤出口产生；ADR-0003 自称 `projectFor(viewer, gameState)` 就是这个出口，但它只把状态映射为视图；
ADR-0002 第 3 节说骰子动画、提示条、`request_result` 等 `event` "同样按人投影后逐人发送"——却没有任何函数定义如何投影一个事件。
暗骰的骰子动画事件就是一个现成的泄露口。建议二选一并写进 ADR-0002/0003：
(a) 新增 `projectEventFor(viewer, event)`，同样默认拒绝（按事件类型白名单）；或
(b) **事件不携带内容**，只引用投影视图中已存在的条目（例如 `{ type: 'dice_anim', entryId }`，动画数值从该成员视图里的骰子条目读取，游客视图里只有占位条目）。
(b) 让"唯一出口"真正唯一，评审倾向 (b)。登记表 `guest_projection` 的签名需同步。

**R-F4 — 依赖方向写反，隐含一个环（依赖，严重度：中）。**
`adr-dep-graph.sh` 输出 `adr-0003 -> adr-0002`，无 `CYCLE`，但这是因为 ADR-0002 只声明了 ADR-0001。实际上：ADR-0002 迁移第 1 步就是"实现 ADR-0003 的 `projectFor`"，
Ordering Note 写"投影函数的定义在 ADR-0003"，登记表 `guest_projection` 也把 ADR-0002 列为消费者——即 0002 依赖 0003；
而 ADR-0003 又声明依赖 0002，同时自己的 Ordering Note 说"存档第 9 版可以先于联机单独上线"。若两边都如实声明就是环。
建议：ADR-0003 `Depends On` 只留 ADR-0001（过滤出口的约束来自 0001）；ADR-0002 `Depends On` 改为 ADR-0001 + ADR-0003。

**R-F5 — 快照窗口与"上次已发视图"不一致；数组差异的快速路径不符合现有数据形态（正确性，严重度：中）。**
- ADR-0002 第 2 节说快照"对话历史只带最近 200 条"，第 1 节说补丁由"上次已发视图"与新视图比较产生。如果 200 条只在快照里截断、视图里不截断（或反之），
  守秘人保存的"上次已发视图"与客户端实际持有的就不同，之后的 `/chatHistory/N` 路径会错位。应把窗口写进 `projectFor`（视图本身只含最近 N 条），快照 = 视图。
- Risks 里"对追加型数组按长度与末尾 id 生成 `add`"的前提不成立：对话消息**没有稳定 id**（只有运行时 `_vid`，存档时被删，`persistence.mjs:545`）；
  `compactChatHistory` 会从**前面**删消息（`state/ui.mjs:69`）；`diceHistory` 是 `unshift` 加到最前、超过 30 条从尾部 `pop`（`gameplay.mjs:327–328`、`ai_logic.mjs:679–694`）。
  建议：给对话消息分配稳定 id（写入时或投影时），数组按 id 比较而不是按下标；明确无法判定时退回整字段 `replace`。

**R-F6 — `to: 'all'` 的规则三处不一致（接口契约，严重度：中）。**
ADR-0001 允许 `to: 'all'` 用于 `kind: 'system'` **或**"不含叙述的结构化状态"；ADR-0002 第 3 节允许 `kind: 'event'` 的系统通知用 `to: 'all'`；
原型 `relay.mjs:107` 只放行 `kind: 'system'`（服务程序不读 body，也只能按 `kind` 判断）。另外"投票开始"在 ADR-0001 是 `system`、在 ADR-0002 是 `event`。
建议统一为"`to: 'all'` ⇔ `kind: 'system'`"（与原型一致、服务程序可执行），并同步修改 ADR-0001 的实施准则、ADR-0002 第 3 节与登记表 `multiplayer_message_envelope` 的签名。

**R-F7 — 开发者身份与个人内容限制冲突（一致性，严重度：中）。**
ADR-0003 第 5 节："守秘人与 `developer`：返回完整状态"；第 6 节：限制"按观看者个人生效"。概念文档的规则对**每名玩家**成立；而暗骰数值对"登录开发者账号"可见，
说明开发者账号也可能是坐在桌边的玩家。按原文，设置了界限的开发者账号玩家会看到完整内容。建议：开发者视图 = 完整状态 + 第 6 节挂钩（守秘人本人的视图可另行约定）。

**R-F8 — 存档第 9 版迁移的落点与覆盖面（持久化，严重度：中）。**
- `migrateSaveData` 没有版本分步结构：它对任何来源版本都整体规整一遍，再写 `version = SAVE_SCHEMA_VERSION`。"8 → 9 步骤"应实现为**幂等的规整**：
  缺 `invId` 就生成、缺 `exploredBy` 就按房间状态补，不依赖 `sourceVersion`（这样第 1–7 版存档也自然得到）。
- 战役账本 `restoreCarrySnapshot`（`state/arc_ledger.mjs:173–182`）直接用 `arcLedger.characterSnapshot` 替换 `roster`，不经过迁移；
  旧账本里的角色没有 `invId`。迁移需同时处理 `arcLedger.characterSnapshot`，或在所有写入 `roster` 的入口（`createInvestigatorRecord`、`accessor.addToRoster`、
  账本恢复、读档）统一补 `invId`。
- `invId` 应在 `createInvestigatorRecord` 里生成，而不是只在迁移里。

**R-F9 — 共享战斗面板与角色卡分层的边界未定（设计，严重度：低）。**
ADR-0003 白名单写 `combat`（"只含敌人公开状态"），但"敌人公开状态"没有字段清单；战斗面板（`components/story_combat.mjs`）显示全队调查员，
而角色卡分层把 HP 等归为私有，只公开"可见伤势"。这是第 21、22 号系统 GDD 要回答的问题；ADR 应写明 `combat` / `chase` 也走字段白名单（见 R-F1），具体清单由 GDD 定。

**R-F10 — 请求类型不覆盖概念文档的玩家操作（部分覆盖，严重度：低）。**
ADR-0002 首批请求没有：改自己的名字 / 背景 / 笔记（概念文档第 9 项）、X 卡折叠、设置个人界限 / 帷幕（第 10 项）。"首批"二字留了扩展余地，
但建议在 ADR 中写明每个请求都要由守秘人浏览器按座位表校验"这名成员是否操控该 `invId`"（`roll` 的"为自己的调查员"同理），并列出待补的请求类型归属的系统。

**R-F11 — 座位表与个人限制存在哪里（缺口，严重度：中）。**
ADR-0003 说座位表"存在房间会话里，不进存档"。但守秘人浏览器刷新后（新 `epoch`）内存清空，要为所有人重新生成快照就需要座位表与各人的 `limits`；
服务程序不读 body，没有现成的"房间会话"能提供。建议写明：座位表与限制由守秘人浏览器按房间号存进本地存储（如 IndexedDB / sessionStorage），
或由客户端在请求快照时重新上报自己的限制、守秘人重新确认座位。另：概念文档要求单人模式也能设界限与帷幕，而 ADR-0003 第 7 节规定单人模式"投影不参与"——
第 6 节挂钩需要在单人模式的渲染路径上同样生效（TR-concept-018）。

**R-F12 — 未列入白名单的共享字段（功能，严重度：低）。**
`inventory`、`storage`（全队物品）、`activeCampaign`、`keeperStyle` 等既不在白名单也不在排除清单。默认拒绝下它们不会泄露，但游客将看不到全队背包。
建议在 ADR-0003 中逐个作出决定（这正是白名单设计要求的"显式决定"），并为每个白名单字段写正向测试（ADR 已提）。

**R-F13 — 写入方仍按名字识别调查员（风险，严重度：低）。**
`vis` 与 `exploredBy` 用 `invId`，但写入方拿到的是名字：骰子历史 `rolledBy: c.name`、日志 `charName`、AI 工具参数、`findChar(name)`。
从名字到 `invId` 的转换是新的薄弱点（登记表禁用模式 `name_based_visibility`）。建议规定写入点通过单一解析函数把名字解析为 `invId`，
解析失败时取最严格的可见范围（仅守秘人），而不是全员可见。

---

## Cross-ADR Conflicts

### Conflict: ADR-0002 vs ADR-0003（与 ADR-0001 F7）
Type: Integration
ADR-0002 claims: `event` 消息"按人投影后逐人发送"。
ADR-0003 claims: `projectFor(viewer, gameState)` 是唯一出口，只处理状态。
ADR-0001 claims: 全部 `state` / `event` 必须由唯一过滤出口产生。
Impact: 事件（含暗骰动画）没有定义好的过滤路径，实现者会各写各的，泄露风险回到"分散过滤"。
Resolution options:
  1. 事件只引用视图中的条目，不携带内容（评审推荐）
  2. 新增默认拒绝的 `projectEventFor`，并在 ADR-0003 中把它列为第二个（也是最后一个）出口

### Conflict: ADR-0001 vs ADR-0002（与原型 relay）
Type: Integration
ADR-0001 claims: `to: 'all'` 可用于 `kind: 'system'` 或不含叙述的结构化状态。
ADR-0002 claims: `kind: 'event'` 的系统通知可用 `to: 'all'`；"投票开始"为 `event`。
Prototype: 只放行 `kind: 'system'`。
Impact: 按 ADR-0002 实现的广播事件会被服务程序拒绝。
Resolution options:
  1. 统一为 `to: 'all'` ⇔ `kind: 'system'`（评审推荐）
  2. 放宽服务程序规则（服务程序无法判断 body 是否含叙述，不推荐）

### Conflict: ADR-0002 vs ADR-0003
Type: Dependency
ADR-0002: 实施需要 ADR-0003 的 `projectFor`（迁移第 1 步、Ordering Note、登记表消费关系）。
ADR-0003: 声明依赖 ADR-0002。
Impact: 若如实声明即成环；当前声明方向与实际实施顺序相反，`/create-epics` 等按依赖排序的技能会排错顺序。
Resolution: 见 R-F4。

**无数据归属冲突**：`multiplayer_game_state`（守秘人浏览器）与 `investigator_identity`（调查员记录，创建后不变）不重叠；
ADR-0002 只读取 ADR-0003 的投影结果，不写状态。

**登记表一致性**：`guest_projection`、`player_request_and_result`、`multiplayer_state_delivery`、`investigator_identity` 及三条新禁用模式
（`guest_view_blacklist`、`name_based_visibility`、`player_side_dice`）均与 ADR 原文一致。R-F3、R-F6 的修订需要同步改 `guest_projection` 与
`multiplayer_message_envelope` 的签名。

## ADR Dependency Order

`adr-dep-graph.sh`：`ADRS: 3`；`EDGES: adr-0002 -> adr-0001, adr-0003 -> adr-0001, adr-0003 -> adr-0002`；无 `NO_DEPS_SECTION`；无 `CYCLE`。

⚠️ ADR-0002 依赖 ADR-0001——ADR-0001 仍为 Proposed。
⚠️ ADR-0003 依赖 ADR-0001、ADR-0002——两者均为 Proposed。

按声明的拓扑顺序：ADR-0001 → ADR-0002 → ADR-0003。
**按 R-F4 修正后的推荐实施顺序：**
Foundation:
  1. ADR-0001：中转服务程序 + 守秘人浏览器为权威
Depends on Foundation:
  2. ADR-0003：可见范围模型、`projectFor`、存档第 9 版（存档部分可先于联机上线）
  3. ADR-0002：同步协议（需要 ADR-0001 的信封与 ADR-0003 的投影）

## GDD Revision Flags

无 GDD 修订标记。上次标出的"服务端过滤"措辞已在 `game-concept.md` 改为"守秘人浏览器按身份过滤"。
R-F9（战斗面板上调查员数值的可见性）与 R-F10（X 卡、改角色卡的操作）是第 21、22、26 号 GDD 待回答的问题，不是现有 GDD 的错误；
这些系统尚无 GDD 行可改，因此不更新 `systems-index.md`。

## Engine Compatibility Issues

```
Engine: Custom-Web（未在框架中登记版本）
ADRs with Engine Compatibility section: 3 / 3
Deprecated API References: 无（无可比对的引擎参考库）
Stale Version References: 无
Post-Cutoff API Conflicts: 无（三份 ADR 均声明 Post-Cutoff APIs Used: None）
```

Engine validation: NOT ASSESSED — `engine.name: Custom-Web` 不在框架支持范围（Godot / Unity / Unreal），
没有 `docs/engine-reference/` 可比对，也没有对应的引擎专家代理，因此未进行专家咨询。

人工核对（非框架检查）见上文"代码事实核对"。ADR-0002/0003 的 Knowledge Risk 评为 LOW 合理（纯 JS 数据结构 + WebSocket）。
ADR-0002 的三项 Verification Required 与 ADR-0003 的两项均未完成；原型只覆盖服务程序一侧。

## Architecture Document Coverage

Architecture document coverage: NOT ASSESSED — no `docs/architecture/architecture.md`。

---

## Verdict: CONCERNS

- 全部覆盖来自 **Proposed** ADR（上限即为 CONCERNS）。
- 上次的 2 个缺口已关闭；本次 1 个缺口（多模型接入层，与联机无关）、9 项部分覆盖。
- 3 处 ADR 间问题（事件过滤出口、`to: 'all'` 规则、依赖方向），均可通过修订文字解决，不需要推翻任何决定。
- NOT ASSESSED 项：引擎校验（Custom-Web）、架构文档覆盖（无 `architecture.md`）。

两份新 ADR 的核心选择——投影视图差异补丁、顶层白名单、`invId`、旧档全员可见——方向正确，备选方案的取舍有理有据，评审不建议推翻。
问题集中在：**"默认拒绝"只做到了顶层**，而本项目最敏感的数据（守秘人系统提示、检定数值）恰好放在白名单内的集合里。

### Blocking Issues

无（非 FAIL）。但 **R-F1、R-F2、R-F3 应在 `accept` 之前解决**：它们直接违背 ADR-0001 的核心承诺"游客设备收不到隐藏数据"，
且按现在的 ADR 文字实现、按现在的泄露测试写法验证，测试会通过而数据仍会泄露。

### Required ADR Revisions（按基础程度排序）

1. **修订 ADR-0003**（Accept 前）：记录级 / 字段级默认拒绝与 `isHidden`/`isLocalOnly` 映射（R-F1）；暗骰可见范围贯穿所有派生记录（R-F2）；
   `Depends On` 只留 ADR-0001（R-F4）；开发者视图也套用个人限制（R-F7）；迁移改为幂等规整并覆盖战役账本与 `createInvestigatorRecord`（R-F8）；
   座位表与限制的存放位置、单人模式挂钩（R-F11）；未列字段逐个决定（R-F12）；名字到 `invId` 的单一解析（R-F13）。
2. **修订 ADR-0002**（Accept 前）：事件只引用视图条目或定义 `projectEventFor`（R-F3）；`Depends On` 加 ADR-0003（R-F4）；
   对话窗口进入投影、消息稳定 id、按 id 比较数组（R-F5）；`to: 'all'` 只用于 `kind: 'system'`（R-F6）；请求的座位校验与待补请求类型（R-F10）。
3. **小修 ADR-0001**：`to: 'all'` 规则与原型对齐（R-F6）；同步登记表两条签名。
4. 之后：多模型 AI 接入层 ADR（系统 30，可并行）、固定团战役存储 ADR（系统 28）。

### Pre-gate checklist（参考）

| 项 | 状态 |
|---|---|
| 测试根目录 | Custom-Web 不在框架引擎表内；项目实际测试在 `src/tests/`（`npm run ci:smoke`），框架的 `tests/unit/`、`tests/integration/` 不存在 |
| `.github/workflows/tests.yml` | ❌ 不存在 |
| `design/accessibility-requirements.md` | ❌ 不存在 |
| `design/ux/interaction-patterns.md` | ❌ 不存在 |

在进入 `/gate-check` 之前需补齐（或按项目实际情况在 gate-check 中说明替代物）。修订上述 ADR 后建议重跑 `/architecture-review`。
