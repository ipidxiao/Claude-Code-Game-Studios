# Architecture Review Report

Date: 2026-10-16
Mode: full（`modes.rigor: standard` → workflow `standard`：只审架构文档 + 关键 ADR）
Engine: Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue）— 框架引擎检查不识别，见"引擎兼容性"
GDDs Reviewed: 2（`design/gdd/game-concept.md`、`design/gdd/systems-index.md`；尚无单系统 GDD）
ADRs Reviewed: 1（ADR-0001，Proposed）
Reviewer: 独立评审（未参与上述任何文档的编写）
Registry: `docs/registry/architecture.yaml`（4 条立场，均来自 ADR-0001）

Reviewed-Content-Hash: docs/architecture/adr-0001-multiplayer-relay-keeper-authority.md fd1de18d6724c1d2ad565ca902b6bbea1e65f725
Reviewed-Content-Hash: design/gdd/game-concept.md f6b1ce4222a5abec8868818a413f59f23e9dd346
Reviewed-Content-Hash: design/gdd/systems-index.md b4b7d0d849df47a43d8f1d872c8a952d75bd12e1

> **范围说明。** 第 1–14、31–34 号是已实现的现有系统；按 `standard` 档不要求为它们各写 ADR，本报告不把它们列为缺口。
> 需求从概念文档"真人守秘人辅助模式""技术考量"两节提取（第 15–30 号系统的来源）。
> 由于单系统 GDD 尚不存在，下表 TR-ID 为**暂定编号**（`TR-concept-NNN`），本次**未写入** `tr-registry.yaml`；
> 等第 15–18 号 GDD 写成后，再由 `/architecture-review` 按系统重新登记稳定编号。

---

## Traceability Summary

Total requirements: 17
✅ Covered（Accepted ADR）: 0
🟡 Covered（Proposed）: 8
⚠️ Partial: 7
❌ Gaps: 2

所有覆盖都来自一份 `Proposed` ADR，因此结论最高只能是 CONCERNS；出路是原型验证后执行
`/architecture-decision accept ADR-0001`。

## Traceability Matrix

| Requirement ID | GDD | System | Requirement | ADR Coverage | Status |
|---|---|---|---|---|---|
| TR-concept-001 | game-concept.md | 15, 17 | 房间 / 邀请码加入，角色卡、骰子、场景、战斗与追逐实时同步 | ADR-0001 决定 1、4，信封格式 | 🟡 |
| TR-concept-002 | game-concept.md | 17 | 断线重连后恢复当前局面 | ADR-0001 `seq` 补发 / 快照 | ⚠️ 补发由谁负责前后矛盾（见发现 F3） |
| TR-concept-003 | game-concept.md | 20 | 暗骰数值只有开发者账号可见，游客只见占位；不能只靠前端隐藏 | ADR-0001 决定 3 + 禁用模式 `client_side_only_hiding` | 🟡 |
| TR-concept-004 | game-concept.md | 16 | 开发者账号（"登录"）与游客两种身份 | ADR-0001 房间密钥 → `developer`，邀请码 → `guest` | ⚠️ 身份只在"加入时"确定；中转程序是否以连接身份覆盖 `from` 未写明（F1） |
| TR-concept-005 | game-concept.md | 18, 19 | 玩家视图只显示自己的卡、自己的线索、自己探索过的地图；守秘人视图显示全部 | ADR-0001 决定 3（每人一份） | 🟡 机制已定，过滤规则留给系统 18 |
| TR-concept-006 | game-concept.md | 18, 23, 24, 25 | 线索可见范围、按人记录已探索地图、日志"由谁执行 / 谁可见"——状态需按玩家分区，存档第 8 版需升级 | — | ❌ GAP（F5） |
| TR-concept-007 | game-concept.md | 26 | 界限 / 帷幕 / X 卡只作用于设置者本人，其他人看完整内容 | ADR-0001 每收件人一份内容 | ⚠️ 投递已覆盖；AI 同时产出完整版与简述版（或可折叠标记）未覆盖 |
| TR-concept-008 | game-concept.md | 27 | 暂停投票：10 分钟时限、过半通过、弃权规则、守秘人无否决权 | ADR-0001 守秘人浏览器为唯一权威 | ⚠️ 计票与计时隐含在守秘人浏览器中，未写明；与"守秘人无否决权"存在信任张力（F6） |
| TR-concept-009 | game-concept.md | 21 | 共享战斗与追逐面板全桌可见、由守秘人推进、每名玩家只能操作自己的调查员 | ADR-0001 玩家只发 `request`、`state/event` 仅守秘人可发 | 🟡 |
| TR-concept-010 | game-concept.md | 22 | 玩家不能直接改 HP / SAN / 技能；守秘人手动修改须记日志 | ADR-0001 "玩家浏览器 must never 直接改权威状态" | 🟡（日志格式属系统 22） |
| TR-concept-011 | game-concept.md | 23, 25 | 线索 / 手稿发给指定玩家；玩家向他人出示线索、分享已探索地图 | ADR-0001 `to: [memberId]`；玩家只能发给守秘人 | ⚠️ 玩家之间的出示 / 分享只能经守秘人转发，这是隐含推论，ADR 未写明 |
| TR-concept-012 | game-concept.md | 28 | 固定团共享战役：账本属于整个团，所有成员都能接着用 | ADR-0001 服务程序提供持久化存储 | ⚠️ 与"服务程序不解析 body"和"守秘人浏览器为权威"的关系未定（F4） |
| TR-concept-013 | game-concept.md | 15 | 线下（热点 / 同一 Wi-Fi）与线上用同一套代码，均走 https | ADR-0001 决定 4 | 🟡（三项 Verification Required 尚未验证，见引擎一节） |
| TR-concept-014 | game-concept.md | — | 不联机时单人模式照旧离线运行 | ADR-0001 实施准则 + 迁移步骤 2 | 🟡 |
| TR-concept-015 | game-concept.md | 29 | AI 副守秘人只在开发者账号下可用、可开关 | ADR-0001 AI 调用留在守秘人浏览器 | 🟡 |
| TR-concept-016 | game-concept.md | 3, 13, 15 | 本地存档保留；守秘人联机时继续使用自己已有的存档、战役账本与 AI 密钥 | — | ❌ GAP（F2：浏览器存储按源隔离） |
| TR-concept-017 | game-concept.md | 30 | 多模型 AI 接入层，每个模型须通过同一套工具协议契约测试 | — | ⚠️ 概念文档"Next Steps"要求单独 ADR，尚未写；不在 ADR-0001 范围内，列此备查 |

---

## 主要发现

**F1 — 中转程序没有规定"以连接身份为准"（安全，严重度：高）。**
投递规则是"`kind: 'state' | 'event'` 只接受 `from: 'keeper'`"，但 `from` 是客户端自己填的字段。
如果中转程序只校验字段值、不把它与该 WebSocket 连接加入时获得的身份对照，游客就能伪造 `from: 'keeper'`
向全桌广播假状态，或伪造自己是另一名成员。建议在 Key Interfaces 中写明：**中转程序以连接的身份覆盖 `from`
（或拒绝不一致的消息），并据此校验 `kind` 与 `to`**；同时写明房间密钥 / 邀请码如何生成、是否可吊销。
这一条直接关系到 ADR 自己的核心承诺（游客收不到、也改不了隐藏数据），应在 Accept 前补上。

**F2 — 浏览器存储按源隔离，守秘人的现有存档与 AI 密钥在新地址下"消失"（缺口，严重度：高）。**
现在的启动方式是 `python -m http.server 8080`（`src/package.json` 的 `serve`），存档在 IndexedDB、AI 密钥与模组列表在
`localStorage`，它们都绑定在 `http://localhost:8080` 这个源上。ADR 让服务程序在 `https://<局域网IP>:<端口>`
或 `https://<机器名>.ts.net` 上托管页面，这是**不同的源**：守秘人打开后看不到旧存档、战役账本和密钥；
热点下局域网 IP 变化时，源又会变，上一场的数据也看不到。ADR 需要决定守秘人浏览器固定从哪个源打开
（例如始终用 `https://localhost:<固定端口>`，玩家才用局域网 / Tailscale 地址），以及旧源数据如何迁移（现有
`exportGame` / `importGame` 可作为一次性迁移手段）。

**F3 — 重连补发的责任方前后矛盾（内部一致性，严重度：中）。**
Key Interfaces 写"由守秘人浏览器补发增量或快照"，Performance Implications 写"服务程序只缓存每个房间最近的消息用于补发"。
两种做法都可行（中转程序缓存的是已过滤、按收件人的消息，不违反"不读 body"），但必须选一种。另外：
`seq` 由守秘人浏览器分配，而守秘人浏览器刷新后计数器会丢失——需要说明 `seq` 是否持久化，或引入房间纪元号；
并说明按收件人过滤后，每个客户端看到的 `seq` 不连续，客户端不能把"跳号"当作丢包。

**F4 — 固定团战役存储与权威模型的关系未定（部分覆盖，严重度：中）。**
ADR 让服务程序"保存需要持久化的数据（固定团战役）"，同时规定它"不解析游戏内容"。可行的解读是：服务程序把战役账本作为
不透明文件保存、由守秘人浏览器读写。但概念文档要求账本"属于整个团、所有成员都能接着用"——若下次换另一名成员当守秘人、
在另一台笔记本上运行服务程序，账本如何过去？升级路径（云服务器）能解决，暂行方案下不能。建议在 ADR 中明确"服务程序存不透明数据块、
只有开发者身份能读写"，跨设备迁移留给系统 28 的 ADR。

**F5 — 按玩家分区的状态与存档升级没有归属 ADR（缺口，严重度：中）。**
线索可见范围、按人记录的地图、日志可见性都要求把现在"全队共用一份"的状态拆成按玩家区分，并把存档从第 8 版升级。
ADR-0001 正确地把过滤规则留给系统 18，但"Enables"列出的后续 ADR 里没有点名存档结构升级。建议在系统 18 的 ADR
中把**状态分区 + 存档第 9 版迁移**作为显式范围，否则它会散落在第 23、24、25 号系统各自的实现里。

**F6 — 暂停投票的计票由守秘人浏览器独占（部分覆盖，严重度：低）。**
概念文档规定守秘人"没有一票否决权"，但计时、计票都在守秘人浏览器里，守秘人掉线时整局已经暂停。以自用为主时可以接受；
建议在系统 27 的设计中写明计时以守秘人浏览器时钟为准、守秘人掉线时投票如何处理，并在 ADR 的信任模型里一句话承认这一点。

**F7 — `to: 'all'` 绕开按人过滤（风险，严重度：低）。**
由于内容限制按人生效，几乎没有叙述内容对所有人完全一样；`to: 'all'` 让一条未经过滤的消息可以一次发给全桌。
建议规定 `to: 'all'` 只用于 `kind: 'system'` 或不含叙述的结构化状态，并让 Risks 中提到的"集中出口函数"成为产生
`state/event` 消息的唯一入口。

**F8 — 本地证书方案需收窄（验证项，严重度：低）。**
带证书错误的页面上，主流浏览器不会注册 Service Worker；用户点击"继续访问"也不行。因此"自签证书"实际上不可用，
mkcert 也需要在每台手机上安装并信任根证书（iOS 需安装描述文件并在"证书信任设置"中开启）。ADR 已把这一项列为
Verification Required 与风险，处理方式恰当；建议把"或自签"删去，并把"不行则线下也改用 Tailscale"提为默认后备。

---

## Cross-ADR Conflicts

只有一份 ADR，不存在 ADR 之间的冲突。

与登记表的一致性：`docs/registry/architecture.yaml` 中 4 条立场（`multiplayer_game_state`、`multiplayer_message_envelope`、
`multiplayer_transport`、两条禁用模式）均与 ADR-0001 原文一致。一处措辞：信封契约登记为 `pattern: rpc`，实际是按收件人投递的
消息传递（更接近 `event_bus`），不影响结论。ADR 仍为 Proposed，登记表中的立场应视为暂定。

## ADR Dependency Order

`adr-dep-graph.sh`：`ADRS: 1`，`EDGES: (none)`，无 `NO_DEPS_SECTION`，无 `CYCLE`。

Foundation（无依赖）：
1. ADR-0001：联机架构——中转服务程序 + 守秘人浏览器为权威（Proposed）

无未决依赖，无环。

## GDD Revision Flags

| GDD | Assumption | Reality（来自 ADR-0001） | Action |
|---|---|---|---|
| game-concept.md | "技术考量"第二段："暗骰数值对游客隐藏，必须由**服务端**按身份过滤后再下发" | ADR-0001 与同一节后文的暂行方案都规定由**守秘人浏览器**过滤，服务程序只转发 | 改写这一句以免矛盾（文字修订，不影响系统索引状态） |

无引擎行为方面的 GDD 修订标记。`game-concept.md` 不是系统索引中的一行，因此不需要更新 `systems-index.md`。

## Engine Compatibility Issues

```
Engine: Custom-Web（未在框架中登记版本）
ADRs with Engine Compatibility section: 1 / 1
Deprecated API References: 无（无可比对的引擎参考库）
Stale Version References: 无
Post-Cutoff API Conflicts: 无（ADR 声明 Post-Cutoff APIs Used: None）
```

Engine validation: NOT ASSESSED — `engine.name: Custom-Web` 不在框架支持范围（Godot / Unity / Unreal），
没有 `docs/engine-reference/` 可比对，也没有对应的引擎专家代理。

人工核对（非框架检查）：ADR 所依赖的代码事实属实——`src/js/ai/network.mjs` 拒绝向非 https、非本机地址发送密钥；
`BroadcastChannel` 只出现在 `persistence.mjs` 与开发日志；存档结构为第 8 版（`SAVE_SCHEMA_VERSION = 8`）；
仓库中尚无 `server/` 目录。Knowledge Risk 评为 LOW 合理。三项 Verification Required 均未完成，这正是 ADR 仍应为 Proposed 的理由。

## Architecture Document Coverage

Architecture document coverage: NOT ASSESSED — no `docs/architecture/architecture.md`。

---

## Verdict: CONCERNS

- 全部覆盖都来自 **Proposed** 的 ADR-0001（上限即为 CONCERNS）。
- 2 个缺口（F2 存储源隔离、F5 状态分区 / 存档升级）、7 项部分覆盖。
- 无 ADR 间冲突，无依赖环。
- NOT ASSESSED 项：引擎校验（Custom-Web）、架构文档覆盖（无 `architecture.md`）。

拓扑选择本身（中转 + 守秘人浏览器权威、发出前按人过滤）与约束相符、备选方案的取舍理由充分，评审不建议推翻。
问题集中在接口细节与几处未归属的事项，补齐后即可进入原型验证与 Accept。

### Blocking Issues

无（非 FAIL）。建议在 `accept` 之前处理 F1、F2、F3。

### Required ADRs / ADR Revisions（按基础程度排序）

1. **修订 ADR-0001**（Accept 前）：以连接身份覆盖 `from`（F1）；固定守秘人浏览器的源与旧数据迁移（F2）；
   确定补发责任方与 `seq` 持久化（F3）；明确战役存储为不透明数据块（F4）；限制 `to: 'all'`（F7）；删去"自签"（F8）。
2. **新 ADR：多人状态同步协议（系统 17）**——消息类型、增量 / 快照、大小上限。
3. **新 ADR：按玩家过滤与状态分区（系统 18）**——可见范围模型、过滤出口函数、存档第 9 版迁移（F5）。
4. **新 ADR：多模型 AI 接入层（系统 30）**——与联机无关，可并行。
5. 之后：固定团战役存储（系统 28）。
