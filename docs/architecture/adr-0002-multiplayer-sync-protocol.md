# ADR-0002: 多人状态同步协议——按人投影视图 + 增量补丁

## Status
Proposed

## Date
2026-10-16

## Last Verified
2026-10-16

## Decision Makers
ipidxiao（作者，授权按 Claude 的节奏推进）；Claude（起草）

## Summary
ADR-0001 定了联机拓扑（中转服务程序 + 守秘人浏览器为权威），但没有定守秘人浏览器到底发什么、玩家浏览器怎么跟上。
决定：守秘人浏览器为每名成员维护一份"投影视图"（按 ADR-0003 过滤后的游戏状态），首次发完整快照，之后只发与上次已发视图的差异补丁；
玩家的一切行动都是带编号的请求，由守秘人浏览器结算后回执；骰子只在守秘人浏览器里掷。

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue） |
| **Domain** | Networking / Core |
| **Knowledge Risk** | LOW — 纯 JavaScript 数据结构与 WebSocket，无引擎 API |
| **References Consulted** | `src/js/state/persistence.mjs`（`_buildSaveData` 字段清单）、`src/js/state/core.mjs`（`addJournalEntry`）、`src/js/state/gameplay.mjs`（骰子、线索、地图写入点）、`prototypes/multiplayer-relay/README.md` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | (1) 4 名玩家同时在线时，一次检定后的补丁在局域网内 1 秒内到达所有人；(2) 守秘人刷新后所有玩家收到快照并与守秘人一致；(3) 补丁版本不匹配时客户端能自动改要快照 |

Engine validation: NOT ASSESSED — no engine specialist exists for `Custom-Web`。

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001（Proposed）——信封、`epoch`、`dseq`、服务程序补发；ADR-0003（Proposed）——`projectFor` 是快照、补丁与事件的唯一来源 |
| **Enables** | 系统 19（两种视图）、20（暗骰）、21（共享战斗与追逐面板）、22–27 的同步部分 |
| **Blocks** | 联机客户端适配层的实现 |
| **Ordering Note** | 本 ADR 定"怎么送"，ADR-0003 定"送什么"。ADR-0003 不依赖本 ADR（其存档与投影部分可先行上线） |

## Context

### Problem Statement
现有游戏状态是一个大对象（`gameState`），存档时序列化的字段有 30 多个（`roster`、`chatHistory`、`journalLog`、`clueBoard`、`sceneMap`、
`combat`、`chase`、`diceHistory`、`kpState`、`arcLedger` 等）。联机时守秘人浏览器每次结算都会改动其中一部分，
需要一种方式把"这名玩家该看到的变化"可靠地送到他的浏览器，并在断线、刷新后恢复一致。

### Constraints
- 守秘人浏览器是唯一权威（ADR-0001），玩家浏览器不能改权威状态。
- 每名玩家看到的内容不同（ADR-0003 的投影），所以不能给所有人发同一份补丁。
- 跑团是低频事件，但单条叙述和完整快照可能较大（对话历史、线索、日志）。
- 原型发现：客户端必须持久化自己最后收到的 `dseq`，不能从界面上的消息推算。

### Requirements
- 首次加入、重连缺口过大、守秘人刷新后：发完整快照。
- 平时：只发变化，带宽与界面刷新都小。
- 玩家的每个行动都能得到"成功 / 被拒绝及原因"的回执。
- 规则忠实优先（支柱 1）：检定由守秘人浏览器掷骰，玩家端不产生随机结果。

## Decision

### 1. 投影视图 + 差异补丁
守秘人浏览器为每名在线成员保存"上次已发出的投影视图"及其版本号 `viewVer`。每次状态变化后（合并 100 ms 内的多次变化）：
1. 用 ADR-0003 的 `projectFor(viewer, gameState)` 生成该成员的新视图；
2. 与上次已发视图做结构化比较，生成补丁（JSON Patch 风格：`add` / `replace` / `remove`，路径指向视图内部）；
3. 补丁为空则不发；否则发 `kind: 'state'` 消息，`baseVer` 为旧版本，`viewVer` 为新版本。

先过滤再比较：补丁永远只由投影视图之间的差异产生，**不可能**带出投影里没有的数据。

### 2. 快照 = 投影视图
`kind: 'state'`、`body.type: 'snapshot'`，内容就是当前投影视图本身与 `viewVer`，不另做截断。
**对话窗口写在投影里**：联机投影的 `chatHistory` 只含最近 200 条（按 `msgId` 取），因此守秘人保存的"上次已发视图"与客户端持有的视图永远是同一份；
更早的对话通过 `history_page` 请求分页获取。分页结果走**专用回复通道**：`kind: 'state'`、`body.type: 'history_page'`，内容由
`projectHistoryPage(viewer, gameState, beforeMsgId, n)`（ADR-0003，与 `projectFor` 共用第二、三层规则与 `applySafety`）生成；
它**不改变 `viewVer`**，也不进入"上次已发视图"，客户端只把它显示在历史区域。这是视图之外唯一允许携带游戏内容的消息。
开发者视图同样受 ADR-0003 的白名单与 `NEVER_PROJECT` 约束，不会把整个运行时状态（如战役档案、AI 设置）塞进快照。
单条消息上限 256 KB；超过时按顶层字段拆成多条 `snapshot_part`，最后一条带 `final: true`。

### 3. 瞬时事件不携带内容
骰子动画、提示条、音效等用 `kind: 'event'` 逐人发送（`to: [memberId]`），但**事件本身不带任何游戏内容**，只带类型与它所指向的视图条目编号，
例如 `{ type: 'dice_anim', rollId }`、`{ type: 'toast', msgId }`。客户端从自己的投影视图里取该条目来显示：开发者账号的视图里是带数值的骰子条目，
游客视图里只有占位条目，所以暗骰动画对游客只播放"守秘人掷了一次骰"。这样 `projectFor` 是唯一的过滤出口，不存在第二个需要过滤的通道。
补丁与对应事件放在同一批发送，补丁在前，保证客户端收到事件时条目已经存在。
`request_result` 回执只含 `reqId`、`ok` 与 `reason`（`reason` 只能取预先定义的原因代码，不含游戏内容）。

`to: 'all'` **只能**与 `kind: 'system'` 搭配（成员上下线、投票开始与结束、房间公告），与原型服务程序的校验一致；`state` / `event` 一律逐人发送。

### 4. 请求与回执
玩家发 `kind: 'request'`，`body` 带客户端生成的 `reqId` 与 `type`。首批类型：

| type | 含义 | 守秘人浏览器的处理 |
|---|---|---|
| `say` | 角色发言 / 描述行动 | 进入对话历史；AI 或真人守秘人据此推进 |
| `roll` | 请求为自己操控的某名调查员做技能检定，请求体带 `invId` | 先校验 `invId` 属于发起者，再**由守秘人浏览器掷骰**并结算，结果走正常状态补丁 |
| `share_clue` | 向指定成员出示自己的线索 | 按 ADR-0003 改该线索的可见范围 |
| `share_map` | 分享自己已探索的地图区域 | 按 ADR-0003 合并到对方的已探索集合；是否需要接收方在互动窗口点击确认，由系统 25 的设计决定 |
| `vote` | 暂停投票表态 | 系统 27 计票 |
| `history_page` | 拉取更早的对话（带 `beforeMsgId`） | 用 `projectHistoryPage` 生成该成员可见的那一页，经专用回复通道发送（第 2 节） |
| `resync` | 补丁版本对不上，要快照 | 发该成员的快照 |

守秘人浏览器处理每个请求前，**按座位表校验发起者是否有权操作所涉及的 `invId`**（例如 `roll` 只能为自己操控的调查员掷骰，`share_clue` 只能出示自己可见的线索）。
每个请求回一条 `kind: 'event'`、`body.type: 'request_result'`，含 `reqId`、`ok`、失败时的 `reason`。

首批之外、由后续系统补充的请求类型：`edit_own_card`（改自己调查员的名字 / 背景 / 笔记，系统 22）、`set_limits`（设置个人界限 / 帷幕，系统 26）、
`pause_request`（发起暂停，系统 27）。X 卡只折叠自己的视图，在玩家本机处理，不需要请求。

### 5. 客户端规则
- 客户端在本地（`localStorage`，按房间号区分）保存成员令牌、`epoch`、最后收到的 `dseq`、当前 `viewVer`。
- 收到补丁时 `baseVer` 与本地 `viewVer` 不一致 → 丢弃该补丁并发 `resync`。
- 收到事件时若引用的条目不在本地视图中 → 忽略该事件（不报错、不显示内容）。
- 收到不同 `epoch` 的消息 → 清空本地视图，等待快照。
- 玩家端界面只渲染投影视图，不运行规则引擎、不调用 AI。

### Architecture Diagram

```
守秘人浏览器                                                   玩家浏览器
┌──────────────────────────────────────────┐                ┌───────────────────────┐
│ gameState（权威）                        │                │ 本地投影视图 viewVer  │
│   │ 状态变化（100 ms 合并）               │                │   ▲                   │
│   ▼                                      │   state 补丁   │   │ 应用补丁 / 快照   │
│ projectFor(成员A) ─► 与上次视图比较 ─────┼──► 中转 ──────►│───┘                   │
│ projectFor(成员B) ─► 与上次视图比较 ─────┼──► 中转 ──► …  │                       │
│   ▲                                      │                │ 按钮 → request(reqId) │
│   └── 结算请求、掷骰 ◄───────────────────┼─── 中转 ◄──────┼── say/roll/share/vote │
│       回执 request_result ───────────────┼──► 中转 ──────►│                       │
└──────────────────────────────────────────┘                └───────────────────────┘
```

### Key Interfaces

```js
// 守秘人 → 成员：快照
{ kind: 'state', to: [memberId], body: { type: 'snapshot', viewVer: 41, view: { ... } } }
// 守秘人 → 成员：补丁
{ kind: 'state', to: [memberId], body: { type: 'patch', baseVer: 41, viewVer: 42,
  ops: [ { op: 'add', path: '/journalLog/-', value: { ... } }, { op: 'replace', path: '/combat/currentTurnIdx', value: 2 } ] } }
// 成员 → 守秘人：请求
{ kind: 'request', to: 'keeper', body: { type: 'roll', reqId: 'a1-17', invId: 'inv_a1', skill: '侦查' } }
// 守秘人 → 成员：历史分页（唯一的视图外内容通道，不改变 viewVer）
{ kind: 'state', to: [memberId], body: { type: 'history_page', beforeMsgId: 'm-0412', items: [ /* projectHistoryPage 的结果 */ ] } }
// 守秘人 → 成员：回执（reason 为原因代码）
{ kind: 'event', to: [memberId], body: { type: 'request_result', reqId: 'a1-17', ok: false, reason: 'not_your_turn' } }
// 守秘人 → 成员：事件只引用视图条目
{ kind: 'event', to: [memberId], body: { type: 'dice_anim', rollId: 'r-0912' } }
// 系统通知（唯一允许 to:'all' 的情况）
{ kind: 'system', to: 'all', body: { type: 'vote_started', voteId: 'v3' } }
```

服务程序在 `created` 回复中附带 `playerUrls`（局域网 http / https 与 Tailscale 地址），守秘人页面用它生成邀请链接（原型发现：从页面地址生成会得到 `localhost`）。

### Implementation Guidelines
- 补丁 **must** 只由两个投影视图的差异生成；**must never** 由原始 `gameState` 的变化直接生成。
- 事件 **must never** 携带游戏内容，只能引用投影视图中的条目编号；`request_result` 的 `reason` **must** 是预定义的原因代码。
- `to: 'all'` **must** 只用于 `kind: 'system'`。
- 每个请求 **must** 先按座位表校验发起者对相关 `invId` 的权限，再结算。
- 数组差异 **must** 按记录的稳定编号（`msgId`、`rollId`、`id`）比较，**must never** 按下标比较；无法判定时退回整字段 `replace`。
  比较前 **must** 先调用 ADR-0003 的 `assignStableIds`，保证新消息已有编号。
- 历史分页 **must** 只经 `history_page` 专用通道发送，**must never** 改变 `viewVer` 或混入投影视图。
- 每名成员 **must** 有各自的"上次已发视图"；**must never** 把一名成员的补丁发给另一名成员。
- 玩家端 **must never** 掷骰或产生随机结果；`roll` 请求一律由守秘人浏览器掷骰。
- 每个 `request` **must** 得到一条 `request_result` 回执。
- 客户端 **must** 持久化 `dseq`、`epoch`、`viewVer` 与令牌，**must never** 从界面内容推算它们。
- 联机适配层 **must** 在未加入房间时完全不生效，单人模式与现有测试行为不变。

## Alternatives Considered

### Alternative 1: 每次都发完整快照
- **Pros**：最简单，不会不一致。
- **Cons**：对话历史和日志增长后每次几十 KB 到几百 KB，手机热点下卡顿明显；界面每次整体重绘。
- **Rejection Reason**：带宽与界面开销随游戏时长线性增长。

### Alternative 2: 转发原始操作（"操作日志"同步），玩家端重放
- **Description**：守秘人把每次状态写入（如 `addClue(...)`）原样转发，玩家端用同一套状态代码重放。
- **Pros**：消息小；复用现有状态函数。
- **Cons**：玩家端必须运行完整状态代码；每个操作都要单独判断"这名玩家能不能看到"，任何遗漏就是泄露；重放顺序与随机数一致性难保证。
- **Rejection Reason**：把过滤分散到每个操作上，违反 ADR-0003 的"唯一出口、默认拒绝"。

### Alternative 3: 使用 CRDT / 第三方同步库（如 Yjs、Automerge）
- **Pros**：成熟的合并与离线编辑支持。
- **Cons**：本项目只有一个写入方（守秘人浏览器），不需要多方合并；这类库按"共享同一文档"设计，按人过滤要另做；引入依赖与打包问题（项目无打包步骤）。
- **Rejection Reason**：解决的不是这个项目的问题。

## Consequences

### Positive
- 过滤只在一处发生（投影），补丁天然不可能泄露投影之外的数据。
- 带宽与界面刷新只与变化量相关。
- 玩家端很薄：只渲染视图、发请求，不跑规则与 AI。
- 骰子只在守秘人端掷，规则忠实（支柱 1）不受联机影响。

### Negative
- 守秘人浏览器每次变化要为每名成员各算一次投影和比较，人数增加时开销线性增长。
- 需要为现有界面组件准备"只读视图模式"，因为玩家端没有完整 `gameState`。
- 玩家的每个操作都多一个往返，延迟取决于守秘人浏览器与网络。

## Risks
- **比较开销**：大数组（对话、日志）逐项比较可能慢。缓解：按稳定编号建索引后比较（对话从前面压缩、骰子历史从前面插入都不影响按编号比较）；
  投影只对变化的顶层字段重算；对话窗口固定为 200 条。
- **版本错乱**：补丁丢失或乱序导致视图分叉。缓解：`baseVer` 校验 + 自动 `resync`；`dseq` 连续性由服务程序保证（ADR-0001）。
- **快照过大**：超过 256 KB。缓解：分片 + 对话历史分页。

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| game-concept.md | 多人同步：角色卡、骰子、场景、战斗与追逐实时同步，断线重连后恢复 | 投影视图快照 + 补丁；`viewVer` 校验与 `resync` |
| game-concept.md | 规则说了算（支柱 1） | 玩家端不掷骰，`roll` 请求由守秘人浏览器结算 |
| game-concept.md | 线索分发、地图分享、玩家向他人出示 | `share_clue` / `share_map` 请求，由守秘人浏览器改可见范围 |
| game-concept.md | 暂停投票 | `vote` 请求，计票在系统 27 |
| systems-index.md | 系统 17 多人状态同步 | 本 ADR |
| architecture-review-2026-10-16.md | 新 ADR：多人状态同步协议（消息类型、增量 / 快照、大小上限） | 第 1–5 节 |

GDD sync: NOT ASSESSED — 系统 17 尚无设计文档，概念文档与系统清单不定义接口名称。

## Performance Implications
- **CPU**：每次变化 × 在线人数的投影与比较；4–6 人、跑团频率下预计每次 < 10 ms（待原型实测）。
- **Memory**：守秘人浏览器为每名成员保存一份上次视图；视图不含守秘人私有数据，体量小于完整状态。
- **Load Time**：首次加入一次快照（预计几十 KB）。
- **Network**：平时每次变化几百字节到几 KB。

## Migration Plan
1. 实现 ADR-0003 的 `projectFor` 与泄露测试。
2. 在 `src/js/` 新增联机适配层：比较与补丁、请求处理、回执；未加入房间时不加载。
3. 为玩家端准备只读视图入口，先接骰子、日志、场景三块，再接战斗与追逐面板（系统 21）。
4. 在原型上验证 Verification Required 三项后接入正式服务程序。

## Validation Criteria
- 自动化测试：同一份状态变化，为两名可见范围不同的成员生成的补丁，各自只含自己可见的内容。
- 自动化测试：丢弃一条补丁后，客户端检测到 `baseVer` 不符并通过 `resync` 恢复一致。
- 4 个浏览器窗口联机跑完一次检定、一次战斗回合，所有窗口一致。
- 未加入房间时 `cd src && npm run ci:smoke` 全部通过。

## Revision History
- 2026-10-16：按第二轮独立审查（`docs/architecture/architecture-review-2026-10-16-adr-0002-0003.md`，结论 CONCERNS）修订：
  R-F3 事件不携带内容、只引用视图条目，`projectFor` 成为唯一出口；R-F4 `Depends On` 增加 ADR-0003；
  R-F5 对话窗口写进投影（快照 = 视图），数组按稳定编号比较；R-F6 `to: 'all'` 只用于 `kind: 'system'`；
  R-F10 请求先按座位表校验，列出后续请求类型的归属系统。状态仍为 Proposed。
- 2026-10-16：按第三轮独立审查（`docs/architecture/architecture-review-2026-10-16-round3.md`）修订：R3-F3 历史分页走不改变 `viewVer` 的专用通道；
  R3-F4 比较前先分配稳定编号；R3-F10 `roll` 请求带 `invId`；R3-F11 分享确认交给系统 25；R3-F1 说明开发者快照也受白名单约束。状态仍为 Proposed。

## Related
- ADR-0001（依赖）：信封、`epoch`、`dseq`、服务程序补发
- ADR-0003（依赖）：`projectFor` 与可见范围模型
- `docs/architecture/architecture-review-2026-10-16-adr-0002-0003.md`
- `docs/architecture/architecture-review-2026-10-16.md`
- `prototypes/multiplayer-relay/README.md`
