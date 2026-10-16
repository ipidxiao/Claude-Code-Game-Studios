# Architecture Review Report — 第三轮（ADR-0001 / ADR-0002 / ADR-0003 联审）

Date: 2026-10-16
Mode: full，三份联机 ADR 联审（`modes.rigor: standard` → workflow `standard`：只审架构文档 + 关键 ADR；`modes.automation: guided`）
Engine: Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue）— 框架引擎检查不识别，见"引擎兼容性"
GDDs Reviewed: 2（`design/gdd/game-concept.md`、`design/gdd/systems-index.md`；尚无单系统 GDD）
ADRs Reviewed: 3（ADR-0001、ADR-0002、ADR-0003，均为 Proposed）
Reviewer: 独立评审（未参与上述任何文档的编写）
Registry: `docs/registry/architecture.yaml`
Prior reports: `architecture-review-2026-10-16.md`（第一轮，F1–F8，CONCERNS）、`architecture-review-2026-10-16-adr-0002-0003.md`（第二轮，R-F1–R-F13，CONCERNS）。
新鲜度检查（对第二轮报告）：三份 ADR 均为 `CHANGED`，两份 GDD 为 `UNCHANGED`，无 `UNRESOLVED` → 按请求做完整联审。

Reviewed-Content-Hash: docs/architecture/adr-0001-multiplayer-relay-keeper-authority.md e6419cfc6ead14ac9da0b836168aef1e34effb9d
Reviewed-Content-Hash: docs/architecture/adr-0002-multiplayer-sync-protocol.md d6da422a6ac441d0e41afdfde6b5e6dd7eecad2d
Reviewed-Content-Hash: docs/architecture/adr-0003-per-player-visibility-and-save-v9.md 44812ab57e909b8def6a47058c97aa41ad4ce7a1
Reviewed-Content-Hash: design/gdd/game-concept.md 3bcacfd794561ad2becf0dcb235d047b1dd652b0
Reviewed-Content-Hash: design/gdd/systems-index.md 690f05cb49f2cd25eb56a835a948311542b562f0

> **范围说明。** 沿用暂定编号 `TR-concept-001`–`018`，本次**未写入** `tr-registry.yaml`（理由同前两轮：第 15–18 号系统尚无 GDD）。
> 第 1–14、31–34 号现有系统按 `standard` 档不要求 ADR。本轮新发现编号为 **R3-F1 … R3-F11**。

---

## Traceability Summary

Total requirements: 18
✅ Covered（Accepted ADR）: 0
🟡 Covered（Proposed）: 13
⚠️ Partial: 4
❌ Gaps: 1

较第二轮（🟡 8 / ⚠️ 9 / ❌ 1）明显改善。所有覆盖仍来自 Proposed ADR，结论上限为 CONCERNS。

## Traceability Matrix

| Requirement ID | GDD | System | Requirement | ADR Coverage | Status |
|---|---|---|---|---|---|
| TR-concept-001 | game-concept.md | 15, 17 | 房间 / 邀请码加入；角色卡、骰子、场景、战斗与追逐实时同步 | ADR-0001 拓扑与信封；ADR-0002 投影视图快照 + 补丁 | 🟡（`history_page` 的回复通道未定义，见 R3-F3） |
| TR-concept-002 | game-concept.md | 17 | 断线重连后恢复当前局面 | ADR-0001 `epoch` / `dseq` / 服务程序补发；ADR-0002 `baseVer` + `resync`、对话窗口进投影、按编号比较数组 | 🟡（运行时 `msgId` 由谁分配未定，见 R3-F4） |
| TR-concept-003 | game-concept.md | 20 | 暗骰数值仅开发者账号可见；暗骰**照常写入行动日志和互动窗口**，游客只见占位 | ADR-0003 第 3 节一处决定 `vis`；ADR-0002 事件只引用条目 | ⚠️ 占位作为真实记录写进状态，互动窗口里的占位被第二层丢弃，且与按编号比较冲突（R3-F2） |
| TR-concept-004 | game-concept.md | 16 | 开发者账号与游客两种身份 | ADR-0001 F1 修订，原型 11/11 | 🟡（守秘人与其他开发者连接如何区分只在原型里，见 R3-F8） |
| TR-concept-005 | game-concept.md | 18, 19 | 玩家视图只显示自己的卡、线索、已探索地图；守秘人看全部 | ADR-0003 三层白名单 + `vis` + `exploredBy` + 角色卡分层 | ⚠️ 开发者视图为"完整状态"会带出 AI 密钥（R3-F1）；部分白名单字段没有第三层规则（R3-F6） |
| TR-concept-006 | game-concept.md | 18, 23, 24, 25 | 线索 / 日志 / 地图按人分区，存档第 9 版 | ADR-0003 第 1–4、8 节 | ⚠️ `exploredBy` 运行时由谁写入未定，版本无关的规整会把它补成"全体"（R3-F5）；`msgId` 同 R3-F4 |
| TR-concept-007 | game-concept.md | 26 | 界限 / 帷幕 / X 卡只作用于设置者本人 | ADR-0003 第 6、7 节；ADR-0002 `set_limits` | 🟡（标签来源留给系统 26） |
| TR-concept-008 | game-concept.md | 27 | 暂停投票 | ADR-0001 信任模型；ADR-0002 `vote` / `pause_request` | 🟡 |
| TR-concept-009 | game-concept.md | 21 | 共享战斗与追逐面板，每名玩家只能操作自己的调查员 | ADR-0002 座位校验；ADR-0003 `combat`/`chase` 暂只给名字与轮次 | 🟡（字段清单待系统 21 GDD） |
| TR-concept-010 | game-concept.md | 22 | 玩家改自己的名字 / 背景 / 笔记，不能直接改数值 | ADR-0002 `edit_own_card`（后续）+ 座位校验 | 🟡 |
| TR-concept-011 | game-concept.md | 23, 25 | 线索发给指定玩家；玩家在互动窗口出示线索、分享地图 | ADR-0002 `share_clue` / `share_map`；ADR-0003 `vis` / `exploredBy` | 🟡（与概念文档"对方点击后收录"的交互有出入，见 R3-F11） |
| TR-concept-012 | game-concept.md | 28 | 固定团共享战役 | ADR-0001 F4 不透明数据块 | ⚠️ 未变：跨设备迁移留给系统 28 的 ADR |
| TR-concept-013 | game-concept.md | 15 | 线下与线上同一套代码 | ADR-0001 决定 4，三档连接（Chromium 实测） | 🟡（实机待验证） |
| TR-concept-014 | game-concept.md | — | 不联机时单人模式照旧 | 三份 ADR 的实施准则；ADR-0003 第 8 节 | 🟡 |
| TR-concept-015 | game-concept.md | 29 | AI 副守秘人仅开发者账号可用 | ADR-0001 AI 留在守秘人浏览器 | 🟡 |
| TR-concept-016 | game-concept.md | 3, 13, 15 | 守秘人联机时继续使用已有存档、账本与 AI 密钥 | ADR-0001 守秘人固定 `http://localhost:8080` | 🟡 |
| TR-concept-017 | game-concept.md | 30 | 多模型 AI 接入层，契约测试 | — | ❌ GAP（与联机无关，可并行） |
| TR-concept-018 | game-concept.md | 26 | 单人模式下也可给自己设界限与帷幕 | ADR-0003 第 6 节 `applySafety` 单人与联机共用 | 🟡 |

---

## 前两轮发现的处理情况

### 第一轮（F1–F8）

| 发现 | 结论 | 依据 |
|---|---|---|
| F1 以连接身份覆盖 `from` | ✅ 已解决 | ADR-0001 Key Interfaces + 实施准则；原型"伪造 `from` 被拒" PASS |
| F2 守秘人源隔离 | ✅ 已解决 | 守秘人固定 `http://localhost:8080`；登记表 `keeper_page_origin` |
| F3 补发责任方 / `seq` | ✅ 已解决 | 服务程序补发，`epoch` + 按收件人 `dseq`；原型验证 |
| F4 战役存储与权威 | ✅ 已解决（范围内） | 不透明数据块、仅 `developer` 读写；跨设备留给系统 28（仍为 ⚠️ TR-012，属预期） |
| F5 状态分区 + 存档第 9 版 | ✅ 已解决 | 由 ADR-0003 承担 |
| F6 计票信任模型 | ✅ 已解决 | ADR-0001 Negative 一节写明 |
| F7 `to: 'all'` 与唯一出口 | ✅ 已解决 | 三份 ADR、原型、登记表一致：`to: 'all'` ⇔ `kind: 'system'` |
| F8 自签证书 | ⏹ 由作者决定取代 | 改为三档连接；代价写入 Risks。注意 C 档明文传输与本轮 R3-F1 叠加 |

### 第二轮（R-F1–R-F13）

| 发现 | 结论 | 依据 / 残留 |
|---|---|---|
| R-F1 记录级默认可见 | ✅ 已解决（游客路径） | 三层白名单；`system`/`tool`/`isHidden`/`isLocalOnly` 一律不进游客视图；泄露测试改为从真实写入路径生成。残留：开发者路径（R3-F1）与未定规则的白名单字段（R3-F6） |
| R-F2 暗骰写进 4 处 | ⚠️ 部分解决 | "掷骰处一次决定 `vis`、带到全部派生记录"成立；但"另写一条占位记录"的做法引入新问题（R3-F2） |
| R-F3 事件无过滤函数 | ✅ 已解决 | 事件只带条目编号，`projectFor` 成为唯一出口；登记表新增 `content_in_events`。新问题：`history_page` 失去合法通道（R3-F3） |
| R-F4 依赖方向 | ✅ 已解决 | `adr-dep-graph.sh`：`adr-0002 -> adr-0001`、`adr-0002 -> adr-0003`、`adr-0003 -> adr-0001`，无环 |
| R-F5 快照窗口 / 数组差异 | ⚠️ 部分解决 | 窗口进投影（快照 = 视图）、按编号比较——方向正确；但运行时 `msgId` 的分配点没有规定（R3-F4） |
| R-F6 `to: 'all'` 三处不一致 | ✅ 已解决 | ADR-0001 第 139、160 行，ADR-0002 第 84、151 行，`relay.mjs:107`，登记表签名一致 |
| R-F7 开发者也适用个人限制 | ✅ 已解决 | ADR-0003 第 5 节 `developer` + 第 6 节 |
| R-F8 迁移落点 | ✅ 已解决 | 幂等规整、覆盖 `arcLedger.characterSnapshot`、`invId` 在 `createInvestigatorRecord` 生成。但"幂等、不依赖版本"用在 `exploredBy` 上会放宽可见范围（R3-F5） |
| R-F9 战斗面板边界 | ✅ 已解决 | 系统 21 定清单前只给名字与轮次（保守默认） |
| R-F10 请求类型与座位校验 | ✅ 已解决 | 座位校验写入准则；`edit_own_card`、`set_limits`、`pause_request` 归属已列。小残留：`roll` 没有 `invId` 参数（R3-F10） |
| R-F11 座位表与限制存放 | ✅ 已解决 | 守秘人本机 IndexedDB `room:<房间号>`；缺失时玩家重新上报；单人模式经 `applySafety` |
| R-F12 未列字段 | ✅ 已解决（决定层面） | `inventory`、`storage`、`keeperStyle` 进白名单，其余排除。残留：进白名单的字段缺第三层规则（R3-F6） |
| R-F13 名字到 `invId` | ✅ 已解决 | `resolveInvId`，失败取 `{ to: 'keeper' }` |

**小结**：21 项前序发现中，18 项已解决或由作者决定取代，3 项（R-F2、R-F5、以及 R-F1/R-F12 的残留）部分解决，残留都已并入本轮新发现。

---

## 代码事实核对（本轮新增）

| ADR 的说法 / 本轮依赖的事实 | 核对结果 |
|---|---|
| ADR-0003 第 5 节：`developer` 三层都放行，"看到完整状态" | 运行时 `gameState` 含 `aiSettings`（`src/js/state/core.mjs:56`），启动时从 `sessionStorage`/`localStorage` 的 `vue_coc_api_cloud` 读入**含 `apiKey`**（`core.mjs:131–137`）。完整状态 = 带密钥 |
| 检定写入点（`ai_logic.mjs:679–696`） | 属实：`diceHistory.unshift`（已有 `id: Date.now()`）、对话 `role: 'system', isLocalOnly: true` 骰值行、`addJournalEntry` 摘要、`role: 'tool', isHidden: true` 结果 |
| `isLocalOnly` 消息的去向 | **不进存档**（`persistence.mjs:537` 过滤），**不进 AI 上下文**（`ai_logic.mjs:291`、`core/context_manager.mjs:166`） |
| `role: 'tool'` 消息的去向 | 只要 `tool_call_id` 匹配最近一次工具调用就发给 AI 接口（`context_manager.mjs:120–135`）；`isHidden` 不影响 |
| 对话写入点数量 | `chatHistory.push` 等直接写入约 138 处，分布在 30 个文件；没有统一的写入函数 |
| 日志条目 `id` | 已存在（`core.mjs:153`，`Date.now() + Math.random()`） |
| 地图状态写入点 | `gameplay.mjs:466`（`updateRoom`，AI 工具可设 `explored`/`dangerous`/`locked`）、`gameplay.mjs:474–479`（`setPosition`）、`campaign/group_check.mjs:134`；位置只有一个全局 `sceneMap.currentRoomId` / `currentLocation`，没有按调查员的位置 |
| 地图房间字段 | `createMap` 存 `id`、`name`、`status`、`x`、`y`、`connections`、`note`（`gameplay.mjs:451–458`） |
| 物品形态 | 既有字符串（`tools/slash.mjs:143`），也有剧本效果原样拷贝的任意对象（`scenario/effects_apply.mjs:232`、`tools/handlers/system.mjs:85`） |
| `roster` 写入入口 | ADR 列出的四类属实；另有两个回滚恢复点：`ai/tool_snapshot.mjs:78`、`state/persistence.mjs:735`（快照取自当前 `roster`，第 9 版后已带 `invId`，风险低） |
| 守秘人与开发者的区分 | 只在原型：第一个凭房间密钥加入的连接成为 `keeper`（`prototypes/multiplayer-relay/relay.mjs:84`）；ADR-0001 未写 |
| 现有代码中的暗骰 | 尚不存在（`src/js` 中无暗骰实现），ADR-0003 第 3 节是新功能设计 |

---

## 本轮新发现

**R3-F1 — 开发者视图 = 完整运行时状态，会把守秘人的 AI 密钥发到每台开发者设备（安全，严重度：高）。**
ADR-0003 第 5 节规定 `developer` "第一、二、三层都放行（看到完整状态）"，登记表 `guest_projection` 写作 "developers: full state"。
但 `projectFor(viewer, gameState)` 的输入是**运行时** `gameState`，其中 `aiSettings.apiKey` 是守秘人的 DeepSeek 密钥（`core.mjs:56/136`），
另有 `ui`、`storageStatus`、`activeModal` 等本机界面状态。ADR-0001 又允许开发者账号走 C 档普通 http，并在 Risks 中承认"同一热点内的其他设备能嗅探发给开发者账号的消息"——
两者叠加，密钥会以明文出现在热点上。这也与登记表禁用模式 `guest_view_blacklist` 的精神相反（"从 `gameState` 复制"）。
建议：开发者视图同样**从白名单构造**（例如 `DEVELOPER_TOP_LEVEL_ALLOWLIST` = 存档字段中的游戏数据），并设一份**任何身份都不得投影**的清单（`aiSettings` 及所有本机设置 / 界面字段），
加一条泄露测试"开发者快照不含 `apiKey`"。这同时解决快照体量问题（完整状态含 `campaignArchive`、`arcLedger` 等，单个顶层字段就可能超过 ADR-0002 的 256 KB 分片上限）。

**R3-F2 — 暗骰占位作为真实记录写进状态，带来三个连锁问题（ADR-0002 × ADR-0003 接口冲突，严重度：中）。**
ADR-0003 第 3 节：暗骰时在骰子历史、日志、对话系统行、工具结果"各自另写一条占位记录（带同一个 `rollId`、`vis` 缺省）"。
1. **同一编号两条记录**：守秘人界面（直接渲染完整状态）与开发者视图（三层放行）会同时看到真实条目和占位条目，二者 `rollId` 相同；
   ADR-0002 要求数组"按稳定编号比较"、事件 `{ type: 'dice_anim', rollId }` 按编号取条目——同一编号对应两条记录时，比较与取条目都不确定。
2. **互动窗口看不到占位**：概念文档第 207 行要求暗骰"照常写入行动日志和**互动窗口**"。对话里的占位是系统行，而第二层规定 `chatHistory` 只放行 `user`/`assistant`、`role: 'system'` 一律丢弃——
   游客的互动窗口里永远没有这条占位。同理，第二层对 `chatHistory` 不看 `vis`，第 3 节"把 `vis` 写进对话系统行"对投影没有作用。
3. **占位进入 AI 上下文与存档**：工具结果的占位是 `role: 'tool'` 消息，不是 `isLocalOnly`；若它沿用真实结果的 `tool_call_id`，会作为重复的工具结果发给 AI 接口（`context_manager.mjs:130`），
   AI 同时看到"骰出 37/50"与"守秘人进行了一次暗骰"。日志占位也会进存档和战役记录，单人模式回看时出现重复条目。
建议：**占位在投影时生成，而不是存进状态**——权威状态里只有一条带 `vis` 的真实记录；`projectFor` 对"该观看者看不到、但该类型允许占位"的记录输出同编号的占位版本。
对话中为检定结果增加一个可投影的记录类型（例如 `role: 'system', kind: 'roll', rollId, vis`），在第二层显式放行并按 `vis` 投影为占位；工具结果不需要占位（游客本就看不到 `tool`）。

**R3-F3 — `history_page` 的回复没有合法通道（ADR-0002 内部矛盾，严重度：中）。**
ADR-0002 第 4 节说 `history_page` "返回该成员可见的那一页"，第 2 节说"分页结果同样经 `projectFor` 处理"。但：事件**不得**携带游戏内容（第 3 节、准则、登记表 `content_in_events`）；
`request_result` 只含 `reqId`/`ok`/原因代码；`state` 消息就是投影视图本身，而视图被规定为"只含最近 200 条"，把旧消息放进去会打破"上次已发视图 = 客户端视图"的不变量。
另外 `projectFor(viewer, gameState)` 的签名没有分页参数。建议：定义一种不改变 `viewVer` 的 `kind: 'state', body.type: 'history_page'` 回复，
由同一模块中的 `projectHistoryPage(viewer, gameState, beforeMsgId, n)` 生成（与 `projectFor` 共用第二、三层规则与 `applySafety`），并在登记表 `guest_projection` 与 `content_in_events` 中写明这是唯一的例外通道。

**R3-F4 — 运行时 `msgId` 由谁分配没有规定（正确性 / 带宽，严重度：中）。**
ADR-0002 的对话窗口"按 `msgId` 取"、数组"按稳定编号比较"、`toast` 事件引用 `msgId`，ADR-0003 第三层复制 `msgId`——但 ADR-0003 只在**存档规整**里"对缺 `msgId` 的消息补上"。
现有对话写入是约 138 处直接 `push`、分布在 30 个文件；新写入的消息在下次读档之前都没有 `msgId`。按 ADR-0002 的退路，这时只能整字段 `replace`，即每次叙述都重发 200 条对话，抵消补丁设计的意义；`toast` 也无从引用。
建议：在 ADR-0003 中规定一个**唯一的分配点**——最小改动是在投影 / 联机适配层比较之前，为 `gameState.chatHistory` 中缺 `msgId` 的消息就地补号（随存档保存，第 9 版字段），而不是改 30 个文件；
`rollId` 同理（骰子条目已有 `id: Date.now()`，同一毫秒内多次掷骰会重号，应换成计数器或随机串）。

**R3-F5 — `exploredBy` 的运行时写入方未定，且"不依赖版本"的规整会把它放宽为全员（可见性，严重度：中）。**
ADR-0003 第 4 节只说房间"增加 `exploredBy`"，没有规定谁在何时写入。现有地图状态由 `setPosition`、`updateRoom`（AI 工具可直接设 `explored`）、`group_check.mjs:134` 等多处修改，
而游戏只有一个全局位置（`sceneMap.currentRoomId`），没有"哪些调查员在场"的概念。第 8 节的规整又是**不依赖来源版本、每次读档都执行**的："状态为已探索 / 当前、缺 `exploredBy` 的房间补为全体调查员"。
后果：第 9 版下经某个漏写 `exploredBy` 的路径探索的房间，本局对所有游客都不可见（失败关闭），**读档后却变成对所有人可见**（失败开放），与"默认拒绝"相反。
建议：(1) 规定所有把房间设为 `explored`/`current` 的写入经一个函数，按"当前在场调查员"写 `exploredBy`；在系统 24 的 GDD 定义分头行动之前，"在场" = 座位表中的全部调查员；
(2) "补为全体"只对**来源版本 < 9** 的存档执行——这是唯一应当依赖版本的规整；第 9 版及以后缺 `exploredBy` 时取空集；(3) 说明 `dangerous`/`locked` 状态的房间如何处理。

**R3-F6 — 部分白名单字段没有第三层规则，"三层默认拒绝"在这些字段上不成立（可见性，严重度：中）。**
第三层只给出对话、日志、骰子、线索、房间、调查员、战斗 / 追逐的字段清单。进了顶层白名单、却没有规则的还有：`inventory`/`storage`（物品可能是字符串，也可能是剧本效果原样拷贝的任意对象）、
`clueBoard.links`（连到未公开线索时会暴露其编号与关系）、`sceneMap.title`/`currentRoomId`、`knownLocations`、`atmosphere`、`worldClock`、`keeperStyle`。
实现者只能二选一：整体复制（失败开放）或丢弃（功能缺失），ADR 没有告诉他选哪个。另外房间字段清单漏了 `x`、`y`（`createMap` 存了坐标，地图要靠它绘制），`note` 也未决定。
建议：`GUEST_RECORD_FIELDS` 为每个顶层白名单字段都给出规则——标量写明"原样复制"，物品写字段清单（字符串物品原样），`clueBoard.links` 只保留两端都可见的连线，房间加 `x`、`y` 并对 `note` 作出决定。

**R3-F7 — 只在运行时存在、驱动玩家提示的字段未作决定（功能，严重度：低）。**
白名单是对照 `_buildSaveData` 定的，但 `projectFor` 读的是运行时状态。`pendingRuleCheck(s)`（"请先点击掷骰"）、`groupCheckSession`（群体检定）、`aiActionChoices`（行动选项按钮）、`lastSkillCheck`
既不在白名单也不在排除清单。默认拒绝下不会泄露，但玩家端将看不到"轮到你掷骰"之类的提示。建议在 ADR-0003 中逐个决定，具体字段留给系统 19、20 的 GDD。

**R3-F8 — 守秘人连接与其他开发者连接如何区分只写在原型里（接口契约，严重度：低）。**
ADR-0001 只有 `developer` / `guest` 两种角色，却规定 `state`/`event` "只接受守秘人连接发出"；ADR-0003 的观看者有 `keeper`/`developer`/`guest` 三种。
原型的做法是"第一个凭房间密钥加入的连接成为 `keeper`"（`relay.mjs:84`）。建议把这条规则、守秘人断线期间其他开发者凭密钥加入时的处理（不得顶替 `keeper`）写进 ADR-0001 Key Interfaces，并同步登记表。

**R3-F9 — 文档与登记表的小处不一致（一致性，严重度：低）。**
- ADR-0001 GDD Requirements 表仍写"`seq` 补发 / 快照"（现为 `epoch` + `dseq`）；Enables 仍写"后续 ADR"，应点名 ADR-0002、ADR-0003。
- 登记表 `player_request_and_result` 的签名未随 R-F10 更新（座位校验、`edit_own_card`/`set_limits`/`pause_request`）；`investigator_identity` 的注释"由 v8 → v9 迁移生成"应改为"由第 9 版幂等规整补齐"。
- ADR-0003 第 6 节说 X 卡"在本地写入该观看者的 `limits`"，第 7 节说 `limits` 存在守秘人本机——应写明 X 卡折叠是玩家本机的独立状态，不是 `viewer.limits`（与 ADR-0002"X 卡不需要请求"一致）。
- ADR-0003 的 `roster` 入口清单可补上两个回滚恢复点（`ai/tool_snapshot.mjs:78`、`persistence.mjs:735`），或把准则改为"所有入口经同一函数"并加测试。

**R3-F10 — `roll` 请求没有指明调查员（接口，严重度：低）。**
ADR-0002 的 `roll` 请求体只有 `skill`，而座位表是 `memberId → [invId]`，一名玩家可以操控多名调查员（现有"多人模式"即一人操控多名调查员）。
座位校验需要知道"为哪名调查员掷骰"。建议请求体加 `invId`，校验其属于发起者。

**R3-F11 — 分享的交互与概念文档有出入（设计，严重度：低）。**
概念文档第 211、219 行：玩家在**互动窗口**里出示线索 / 分享地图，"其他玩家**点击后**收录进自己的地图"。ADR-0002 的 `share_map` 是守秘人浏览器直接并入对方的已探索集合，
互动窗口里也没有可投影的分享条目（同 R3-F2 第 2 点）。这是第 23、25 号系统 GDD 要定的交互，ADR 可先写明"是否需要接收方确认由 GDD 决定"。

---

## Cross-ADR Conflicts

### Conflict: ADR-0003 vs ADR-0002（暗骰占位与按编号比较）
Type: Integration
ADR-0003 claims: 暗骰时真实记录与占位记录**都**写进状态，带同一个 `rollId`。
ADR-0002 claims: 数组按稳定编号比较；事件按 `rollId` 引用视图中的条目。
Impact: 守秘人界面与开发者视图中同一 `rollId` 对应两条记录，补丁生成与事件取条目不确定；游客互动窗口看不到占位（R3-F2）。
Resolution options:
  1. 占位在 `projectFor` 中按观看者生成，状态里只存一条真实记录（评审推荐）
  2. 占位用不同编号（如 `rollId + ':ph'`），事件分别引用——仍需解决对话占位被第二层丢弃的问题，不推荐

### Conflict: ADR-0003 vs ADR-0001（开发者完整状态与 C 档明文）
Type: State / Security
ADR-0003 claims: 开发者视图三层放行，等于完整状态。
ADR-0001 claims: 开发者账号可走普通 http，热点内可被嗅探（作为可接受风险）。
Impact: 运行时状态中的 AI 密钥随开发者快照以明文发出（R3-F1）。ADR-0001 接受的风险是"暗骰数值被嗅探"，不包括密钥。
Resolution options:
  1. 开发者视图也从白名单构造，并设"任何身份不得投影"清单（评审推荐）
  2. 禁止开发者账号走 C 档——与作者"证书不限制游玩"的决定冲突，不推荐

### Conflict: ADR-0002 内部（`history_page` vs `content_in_events`）
Type: Integration
Impact: 分页请求无法回复而不违反"事件不带内容"或"视图只含 200 条"（R3-F3）。
Resolution: 定义不改变 `viewVer` 的 `history_page` 状态回复，由共用规则的分页投影函数生成，登记为唯一例外。

**无数据归属冲突**：`multiplayer_game_state`（守秘人浏览器）与 `investigator_identity`（调查员记录）不重叠；ADR-0002 只读 ADR-0003 的投影。

**登记表一致性**：`multiplayer_message_envelope`、`guest_projection`、`multiplayer_state_delivery`、`content_in_events`、`record_default_visible_to_guests` 与 ADR 原文一致；
`self_signed_lan_certificate` 已正确标为 superseded。需要同步：`guest_projection`（R3-F1 后开发者不再是 "full state"；R3-F3 的分页例外）、`player_request_and_result`（R3-F9、R3-F10）、
`investigator_identity` 注释（R3-F9）。`state_ownership` 中 `multiplayer_game_state` 的 `referenced_by` 只列了 ADR-0001，可补 ADR-0002/0003（非必须）。

## ADR Dependency Order

`adr-dep-graph.sh`：`ADRS: 3`；`EDGES: adr-0002 -> adr-0001, adr-0002 -> adr-0003, adr-0003 -> adr-0001`；无 `NO_DEPS_SECTION`；无 `CYCLE`。
声明方向与实际实施顺序一致（R-F4 已解决）。

⚠️ ADR-0002 依赖 ADR-0001、ADR-0003——两者均为 Proposed。
⚠️ ADR-0003 依赖 ADR-0001——仍为 Proposed。

### Recommended ADR Implementation Order (topologically sorted)
Foundation (no dependencies):
  1. ADR-0001：中转服务程序 + 守秘人浏览器为权威
Depends on Foundation:
  2. ADR-0003：可见范围模型、`projectFor`、存档第 9 版（存档与投影部分可先于联机上线）
Feature layer:
  3. ADR-0002：同步协议（requires ADR-0001, ADR-0003）

## GDD Revision Flags

无 GDD 修订标记。R3-F2 第 2 点与 R3-F11 是 ADR 未满足概念文档（第 207、211、219 行），应改 ADR 而不是改 GDD；
R3-F5、R3-F7 涉及的"分头行动""轮到你掷骰"是第 19、20、24 号系统 GDD 待回答的问题，这些系统尚无 GDD 行可改，因此不更新 `systems-index.md`。

## Engine Compatibility Issues

```
Engine: Custom-Web（未在框架中登记版本）
ADRs with Engine Compatibility section: 3 / 3
Deprecated API References: 无（无可比对的引擎参考库）
Stale Version References: 无
Post-Cutoff API Conflicts: 无（三份 ADR 均声明 Post-Cutoff APIs Used: None）
```

Engine validation: NOT ASSESSED — `engine.name: Custom-Web` 不在框架支持范围（Godot / Unity / Unreal），没有 `docs/engine-reference/` 可比对，
也没有对应的引擎专家代理，因此未进行专家咨询。

人工核对（非框架检查）见上文"代码事实核对"。三份 ADR 的 Knowledge Risk 评为 LOW 合理。Verification Required 状况：ADR-0001 的 (1)(2) 实机部分与 (3)(4) 待做（原型只覆盖服务程序一侧与 Chromium 三档）；
ADR-0002 三项、ADR-0003 两项均未开始——这与三份 ADR 仍为 Proposed 相符。

## Architecture Document Coverage

Architecture document coverage: NOT ASSESSED — no `docs/architecture/architecture.md`。

---

## Verdict: CONCERNS

- 全部覆盖来自 **Proposed** ADR（上限即为 CONCERNS）。
- 前两轮 21 项发现：18 项已解决或由作者决定取代，3 项部分解决（残留并入本轮）。
- 本轮 11 项新发现：1 高（R3-F1）、5 中（R3-F2–F6）、5 低（R3-F7–F11）；3 处 ADR 间问题，均可通过修订文字解决，不需要推翻任何决定。
- 1 个缺口（多模型接入层，与联机无关）、4 项部分覆盖。
- NOT ASSESSED 项：引擎校验（Custom-Web）、架构文档覆盖（无 `architecture.md`）。

第二轮的核心问题——"默认拒绝只做到顶层"——在**游客路径**上已经解决，修订质量高：事件不带内容、三层白名单、从真实写入路径生成的泄露测试都是正确的做法。
本轮问题集中在两处：**开发者路径绕开了白名单**（R3-F1），以及**几个新机制缺少运行时写入点**（占位、`msgId`、`exploredBy`、分页回复）——它们在纸面上成立，但现有代码里没有一个地方会产生 ADR 所依赖的数据。

### Blocking Issues

无（非 FAIL）。建议 **R3-F1、R3-F2、R3-F3 在 `accept` 之前解决**：R3-F1 会泄露密钥；R3-F2、R3-F3 是 ADR 之间 / ADR 内部的契约矛盾，按现文字实现会各写各的。
R3-F4、R3-F5、R3-F6 也应在 ADR-0003 接受前写定，因为它们决定第 9 版存档的字段。

### Required ADR Revisions（按基础程度排序）

1. **修订 ADR-0003**：开发者视图从白名单构造 + "任何身份不得投影"清单 + 密钥泄露测试（R3-F1）；占位在投影时生成，对话增加可投影的检定记录类型（R3-F2）；
   `msgId` / `rollId` 的唯一分配点（R3-F4）；`exploredBy` 写入函数与"补为全体"仅限旧版本（R3-F5）；每个白名单字段的第三层规则，房间加 `x`/`y`（R3-F6）；运行时字段逐个决定（R3-F7）；X 卡状态与 `roster` 入口措辞（R3-F9）。
2. **修订 ADR-0002**：`history_page` 回复通道与分页投影函数（R3-F3）；`roll` 加 `invId`（R3-F10）；分享是否需接收方确认交给 GDD（R3-F11）；256 KB 分片对单个大字段的处理（随 R3-F1 缓解）。
3. **小修 ADR-0001**：守秘人连接的认定规则（R3-F8）；GDD 表与 Enables 措辞（R3-F9）。
4. **同步登记表**：`guest_projection`、`player_request_and_result`、`investigator_identity`。
5. 之后：多模型 AI 接入层 ADR（系统 30，可并行）、固定团战役存储 ADR（系统 28）。

### Pre-gate checklist（参考）

| 项 | 状态 |
|---|---|
| 测试根目录 | Custom-Web 不在框架引擎表内；项目实际测试在 `src/tests/`（`npm run ci:smoke`）；框架的 `tests/unit/`、`tests/integration/` 不存在 |
| `.github/workflows/tests.yml` | ❌ 不存在 |
| `design/accessibility-requirements.md` | ❌ 不存在 |
| `design/ux/interaction-patterns.md` | ❌ 不存在 |

进入 `/gate-check` 前需补齐，或在 gate-check 中说明项目的替代物。修订上述 ADR 后建议再跑一次 `/architecture-review`（可只审 ADR-0003 与 ADR-0002）。
