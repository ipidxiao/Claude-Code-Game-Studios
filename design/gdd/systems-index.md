# Systems Index: CoC Engine（克苏鲁的呼唤第 7 版 AI 跑团引擎）

> **Status**: Draft
> **Created**: 2026-10-16
> **Last Updated**: 2026-10-18
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

这是一个**已实现的大型项目**加上一组**新功能**的系统清单，因此和从零开始的项目不同：
第 1–14 与 31–34 号是现有系统（状态 `Implemented`，均无设计文档），代码位于 `src/js/`；
第 15–30 号是新系统，来自概念文档中作者确认的真人守秘人辅助模式（联机）与多模型接入，尚未开始。

现有系统按 `standard` 档**只为联机会改动的 9 个补写设计文档**（用 `/reverse-document design`）：
骰子与检定（1）、游戏状态（2）、存档（3）、调查员与角色卡（4）、战斗（5）、追逐（6）、
线索与证据（10）、战役账本与战后余波（13）、AI 守秘人（14）。其余现有系统保持"已实现、无文档"，需要时再补。

新系统的核心是**第 18 号"按玩家过滤可见内容"**：暗骰、两种视图、线索分发、团务日志、按人地图、内容安全
都要求"同一份游戏状态，对不同的人显示不同内容"。按联机暂行方案（概念文档"技术考量"），过滤由守秘人浏览器完成，
服务程序只转发，因此第 18 号是瓶颈系统，必须最先设计。

这些系统服务于三条支柱：**规则说了算**（第 20 号暗骰仍由规则引擎结算；第 22 号手动改数值必留日志）、
**真相有代价**（第 23 号线索分发、第 28 号固定团战役延续后果）、
**随时能开团**（第 15 号热点 / Tailscale 即可开房，无需租服务器）。

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | 骰子与检定（`engines/dice` `skill_attempt` `skills` `attributes`） | Core | MVP | Implemented | — | — |
| 2 | 游戏状态（`state/core` `accessor` `state_contract`） | Core | MVP | Implemented | — | — |
| 3 | 存档（`state/persistence`，存档结构第 9 版） | Persistence | MVP | Implemented | — | 2 |
| 4 | 调查员与角色卡（车卡、职业、背景故事、小队） | Gameplay | MVP | Implemented | — | 1, 2 |
| 5 | 战斗（`engines/combat` `damage` `wound` `healing`） | Gameplay | MVP | Implemented | — | 1, 4 |
| 6 | 追逐（`engines/chase`，含载具） | Gameplay | MVP | Implemented | — | 1, 4 |
| 7 | 理智与神话（`engines/sanity` `mythos`、疯狂表） | Gameplay | MVP | Implemented | — | 1, 4 |
| 8 | 状态与环境（毒药、疾病、环境、匮乏） | Gameplay | Alpha | Implemented | — | 1, 4 |
| 9 | 社交与 NPC（`engines/social` `npc_behavior`） | Gameplay | Alpha | Implemented | — | 1, 4 |
| 10 | 线索与证据（线索板、线索质量、假线索、不可靠线索） | Narrative | MVP | Implemented | — | 2 |
| 11 | 压力：双时钟与神话热度（`state/pressure_bus` `mythos_heat`） | Gameplay | Alpha | Implemented | — | 2, 10 |
| 12 | 剧本运行器与剧本库（`scenario/`、18 个内置剧本、模组库） | Narrative | MVP | Implemented | — | 1, 2, 10 |
| 13 | 战役账本与战后余波（`state/arc_ledger` `aftermath`） | Progression | MVP | Implemented | — | 2, 3, 12 |
| 14 | AI 守秘人（`ai/`、66 个工具、KP 协议、桌规、知识书） | Core | MVP | Implemented | — | 1, 2, 10, 12 |
| 15 | 服务程序与房间（局域网热点 / Tailscale） | Core | MVP | Implemented（`server/`；游戏页面尚未接入，实机验证待做） | [server-and-room.md](server-and-room.md) | — |
| 16 | 账号身份：开发者 / 游客 | Core | MVP | Not Started | — | 15 |
| 17 | 多人状态同步（守秘人浏览器为权威） | Core | MVP | Not Started | — | 2, 15 |
| 18 | 按玩家过滤可见内容（`state/visibility`） | Core | MVP | In Progress（投影与泄露测试已实现，联机接入待第 5 步） | — | 16, 17 |
| 19 | 守秘人视图 / 玩家视图 | UI | MVP | Not Started | — | 18, 33 |
| 20 | 暗骰 | Gameplay | MVP | In Progress（写入、推动、游客视图与叙述替换已实现；群体 / 对抗 / 理智 / 战斗 / 追逐检定未接入） | — | 1, 18, 32 |
| 21 | 共享战斗与追逐面板 | Gameplay | MVP | Not Started | — | 5, 6, 17 |
| 22 | 角色卡权限与修改日志 | Gameplay | Vertical Slice | Not Started | — | 4, 16, 17, 32 |
| 23 | 线索与手稿分发 | Narrative | Vertical Slice | Not Started | — | 10, 18 |
| 24 | 团务日志（联机版行动日志） | Narrative | Vertical Slice | Not Started | — | 18, 32 |
| 25 | 按人地图与地图分享 | Gameplay | Vertical Slice | Not Started | — | 18, 31 |
| 26 | 内容安全：界限、帷幕、X 卡 | Meta | Alpha | Not Started | — | 14, 18 |
| 27 | 暂停投票 | Meta | Alpha | Not Started | — | 17 |
| 28 | 固定团共享战役 | Persistence | Alpha | Not Started | — | 13, 15 |
| 29 | AI 副守秘人开关 | Gameplay | Alpha | Not Started | — | 14, 16 |
| 30 | 多模型 AI 接入层 | Core | Alpha | Not Started | — | 14 |
| 31 | 地图（`tools/handlers/map.mjs` `components/story_map.mjs`） | UI | MVP | Implemented | — | 2 |
| 32 | 行动日志（`addJournalEntry`、`components/story_journal.mjs`、`chat_export.mjs`） | Narrative | MVP | Implemented | — | 2 |
| 33 | 界面与反馈（`views/` `components/`、显示管线、音效、理智特效） | UI | MVP | Implemented | — | 2 |
| 34 | 调查员成长（`components/story_growth.mjs`、经历包） | Progression | Alpha | Implemented | — | 4 |

---

## Categories

| Category | Description | Typical Systems |
|----------|-------------|-----------------|
| **Core** | Foundation systems everything depends on | 骰子与检定、游戏状态、AI 守秘人、服务程序、同步、过滤 |
| **Gameplay** | The systems that make the game fun | 战斗、追逐、理智、社交、暗骰、角色卡权限 |
| **Progression** | How the player grows over time | 战役账本、调查员成长 |
| **Persistence** | Save state and continuity | 存档、固定团共享战役 |
| **UI** | Player-facing information displays | 界面、地图、守秘人视图 / 玩家视图 |
| **Narrative** | Story and dialogue delivery | 剧本、线索、行动日志、线索分发、团务日志 |
| **Meta** | Systems outside the core game loop | 内容安全、暂停投票 |

---

## Priority Tiers

| Tier | Definition | Target Milestone | Design Urgency |
|------|------------|------------------|----------------|
| **MVP** | 现有系统：单人核心循环所需。新系统：真人团联机最小可用版本（房间、身份、同步、过滤、两种视图、暗骰、共享战斗面板） | 联机首个可玩版本 | Design FIRST |
| **Vertical Slice** | 一场完整联机跑团所需：角色卡权限、线索分发、团务日志、按人地图 | 完整跑完一个剧本 | Design SECOND |
| **Alpha** | 其余联机功能与多模型；现有的次要规则系统 | 功能齐全 | Design THIRD |
| **Full Vision** | 暂无 | — | Design as needed |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. 骰子与检定（1）— 所有检定、战斗、理智都经过它（已实现）
2. 游戏状态（2）— 唯一的状态来源，同步与过滤都从它取数据（已实现）
3. 服务程序与房间（15）— 联机的入口；按暂行方案只转发，不懂规则

### Core Layer (depends on foundation)

1. 存档（3）— depends on: 2
2. 调查员与角色卡（4）— depends on: 1, 2
3. 线索与证据（10）— depends on: 2
4. 地图（31）、行动日志（32）、界面与反馈（33）— depends on: 2
5. 账号身份（16）— depends on: 15
6. 多人状态同步（17）— depends on: 2, 15
7. **按玩家过滤可见内容（18）— depends on: 16, 17**（瓶颈，8 个系统依赖它）

### Feature Layer (depends on core)

1. 战斗（5）、追逐（6）、理智与神话（7）、状态与环境（8）、社交与 NPC（9）— depends on: 1, 4
2. 压力（11）— depends on: 2, 10
3. 剧本运行器与剧本库（12）— depends on: 1, 2, 10
4. 战役账本与战后余波（13）— depends on: 2, 3, 12
5. AI 守秘人（14）— depends on: 1, 2, 10, 12
6. 调查员成长（34）— depends on: 4
7. 暗骰（20）— depends on: 1, 18, 32
8. 共享战斗与追逐面板（21）— depends on: 5, 6, 17
9. 角色卡权限与修改日志（22）— depends on: 4, 16, 17, 32
10. 线索与手稿分发（23）— depends on: 10, 18
11. 团务日志（24）— depends on: 18, 32
12. 按人地图与地图分享（25）— depends on: 18, 31
13. 暂停投票（27）— depends on: 17
14. 固定团共享战役（28）— depends on: 13, 15
15. AI 副守秘人开关（29）— depends on: 14, 16
16. 多模型 AI 接入层（30）— depends on: 14
17. 内容安全（26）— depends on: 14, 18

### Presentation Layer (depends on features)

1. 守秘人视图 / 玩家视图（19）— depends on: 18, 33

### Polish Layer (depends on everything)

暂无。

---

## Recommended Design Order

现有系统的"设计"指用 `/reverse-document design` 补文档；新系统用 `/design-system` 设计。

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | 游戏状态（2）— 补文档 | MVP | Foundation | lead-programmer | S |
| 2 | 服务程序与房间（15） | MVP | Foundation | network-programmer | M |
| 3 | 账号身份（16） | MVP | Core | network-programmer, security-engineer | S |
| 4 | 多人状态同步（17） | MVP | Core | network-programmer | L |
| 5 | 按玩家过滤可见内容（18） | MVP | Core | network-programmer, game-designer | L |
| 6 | 骰子与检定（1）— 补文档 | MVP | Foundation | systems-designer | S |
| 7 | 行动日志（32）— 补文档 | MVP | Core | game-designer | S |
| 8 | 暗骰（20） | MVP | Feature | game-designer | S |
| 9 | 战斗（5）、追逐（6）— 补文档 | MVP | Feature | systems-designer | M |
| 10 | 共享战斗与追逐面板（21） | MVP | Feature | game-designer, ui-programmer | M |
| 11 | 守秘人视图 / 玩家视图（19） | MVP | Presentation | ux-designer | M |
| 12 | 调查员与角色卡（4）— 补文档 | Vertical Slice | Core | game-designer | S |
| 13 | 角色卡权限与修改日志（22） | Vertical Slice | Feature | game-designer | S |
| 14 | 线索与证据（10）— 补文档 | Vertical Slice | Core | game-designer | M |
| 15 | 线索与手稿分发（23） | Vertical Slice | Feature | game-designer | S |
| 16 | 团务日志（24） | Vertical Slice | Feature | game-designer | S |
| 17 | 按人地图与地图分享（25） | Vertical Slice | Feature | game-designer, level-designer | S |
| 18 | 存档（3）、战役账本（13）— 补文档 | Alpha | Core / Feature | lead-programmer | M |
| 19 | 固定团共享战役（28） | Alpha | Feature | network-programmer | M |
| 20 | 暂停投票（27） | Alpha | Feature | game-designer | S |
| 21 | AI 守秘人（14）— 补文档 | Alpha | Feature | ai-programmer | L |
| 22 | 内容安全（26） | Alpha | Feature | game-designer, ux-designer | M |
| 23 | AI 副守秘人开关（29） | Alpha | Feature | ai-programmer | S |
| 24 | 多模型 AI 接入层（30） | Alpha | Feature | ai-programmer | M |

多模型接入层（30）只依赖 AI 守秘人，与联机无关，可以随时插队单独做。

---

## Circular Dependencies

- 未发现。

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-----------------|------------|
| 按玩家过滤可见内容（18） | Technical / Design | 8 个系统依赖它；漏过滤一处就会泄露暗骰或别人的线索；现有状态是全队共用一份，改成按人区分会触及存档结构 | 最先设计；为"游客收不到隐藏数据"写自动化测试；联机 ADR 先行 |
| 多人状态同步（17） | Technical | 现有代码无任何网络同步；状态深度依赖页面（`window.CoCState`），断线重连与冲突处理是全新领域 | 先做最小原型：两台设备同步一次检定结果 |
| 服务程序与房间（15） | Technical | 局域网 IP 需 https 才能启用 Service Worker；Tailscale 需每名玩家安装客户端 | 原型阶段验证证书方案与 Tailscale 加入流程 |
| 内容安全（26） | Design | 同一段叙述对不同玩家显示不同，需要 AI 同时产出完整版与简述版，或前端按标记折叠 | 设计阶段先确定折叠方式，再定 AI 输出协议改动 |
| 多模型 AI 接入层（30） | Technical | 现有工具与五段输出协议针对 DeepSeek 调校，其他模型可能绕过规则引擎 | 每个模型必须通过同一套工具协议契约测试（基于 `tool_schema_contract_smoke`） |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 34（现有 18，新建 16） |
| Design docs started | 0 |
| Design docs reviewed | 0 |
| Design docs approved | 0 |
| MVP systems designed | 0/21（现有 14 个均已实现但无文档，其中 9 个联机相关的待补；新建 7 个） |
| Vertical Slice systems designed | 0/4 |

---

## Next Steps

- [x] 把联机暂行方案写成 ADR：ADR-0001（Proposed），原型验证通过后用 `/architecture-decision accept ADR-0001` 接受
- [x] 系统 17、18 的 ADR：ADR-0002 多人状态同步协议、ADR-0003 按玩家过滤与存档第 9 版（均 Proposed）
- [x] 服务程序原型：`prototypes/multiplayer-relay/`（规则 11/11、三档连接、网页端三窗口试玩 7/7）
- [ ] 按设计顺序，先补"游戏状态（2）"文档，再设计"服务程序与房间（15）"
- [ ] 对每份完成的文档运行 `/design-review`
- [ ] MVP 系统设计完成后运行 `/gate-check`
- [ ] 为第 17、18 号做最小联机原型，验证后再大规模开发
