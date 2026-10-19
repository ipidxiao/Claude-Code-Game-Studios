# Code Review — 审计提交 2b81a3a、af15dd4（身份决定日志、暗骰按消息记录，回应 2026-10-18 审计 N1–N3、L1–L5）

Date: 2026-10-18
Commits:
- `2b81a3a` fix: carry identity decisions in saves and stamp dark rolls on narration
- `af15dd4` fix: finish the identity registry follow-ups from the fix list
Scope: `git diff 10687e9..af15dd4 -- src`（17 个 `src/` 文件），以及同一范围内的 ADR-0003 与 `docs/registry/architecture.yaml`
Reviewer: 独立评审（未参与这两个提交的编写）
Engine: Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue）
ADR: ADR-0003（Proposed），重点 §1.1、§3、Key Interfaces
Prior report: `code-review-2026-10-18-review-fix-7cfff83.md`（CHANGES REQUIRED：N1–N3、L1–L5）

Reviewed-Content-Hash: docs/architecture/adr-0003-per-player-visibility-and-save-v9.md 15e66b5c18b2992e5fa5654a0f2b673d2bdc46f8
Reviewed-Content-Hash: docs/registry/architecture.yaml dbb8d40e54b68aa7e9fe19253d205ca0ffc21352
Reviewed-Content-Hash: src/js/state/identity_registry.mjs e38b40d5c119f65f4c39fc0fcb37f208ba76be61
Reviewed-Content-Hash: src/js/state/visibility.mjs 67e9b4cf47a0484143c25423e5c7efe9818f50cb
Reviewed-Content-Hash: src/js/state/persistence.mjs 8ab21fb10043c512dbccdde07a3f8eb76edf33bb
Reviewed-Content-Hash: src/js/ai_logic.mjs ef2833309c55ab425c7184ac64e4c2a6b6085acc
Reviewed-Content-Hash: src/js/data/narrative_sections.mjs 5a14d732253b085b9ca1d28e1efe9bba1a3c87a8
Reviewed-Content-Hash: src/js/engines/skill_attempt.mjs 4fb4e6b1ecf53b46d94aef08d9468af4336af4db
Reviewed-Content-Hash: src/js/ai/tool_snapshot.mjs 1a288373ecc01f8d951600073b5a653197552e52
Reviewed-Content-Hash: src/tests/identity_registry_smoke.mjs 0d8fd45d248fa3dea2d9332853e0e0730fdd5a11
Reviewed-Content-Hash: src/tests/visibility_leak_smoke.mjs decf841b6b0dad7ff92f793b156b6b0af42416b3
Reviewed-Content-Hash: src/tests/tool_rollback_smoke.mjs 88dab53f588253e2d15e46c65f05723ab06e46de

## 结论

**Verdict: CHANGES REQUIRED**

上一轮三条必修项，在当时描述的路径上都修好了，而且修在根因上：

- **N1**：两个独立进程、真实 fixture、两种读入顺序都复现过。拆分后的存档在另一台设备上编号不变，`_idsChanged = 0`。
  合并期间留下的旧副本也跟着拆分改回来。
- **N2**：暗骰清单改为按消息记录。暗骰之前写的叙述、之后回合里同数值的公开数字都原样保留，全战役账本已删除。
- **N3**：段标题清单只在一处定义，三种写法下【骰子】段都被整段去掉。

但修法本身带来两处必须修的问题：

1. **A1 [Medium，第 5 步接入 `projectFor` 前必须修]** 暗骰清单会被下一条 assistant 消息领走，**即使那条消息没有叙述**（只有工具调用）。
   常见的流程是"检定 → AI 先调结算工具 → 再叙述"。在这个流程里，真正复述数值的那条叙述没有清单，第二道防线对它完全失效。
   已经在真实的 `triggerAI` / `executeSkillCheck` 路径上复现：游客看到"心理学骰出 87，目标 60"。
2. **A2 [Medium，必须修]** 决定日志按**各设备自己的墙钟**排序。一台设备学到另一台设备"时间更晚"的合并之后，玩家在本机点拆分，
   函数返回 `{ ok: true, saved: true }`，面板提示"已拆分"，合并却原样不动。反方向（合并不生效）、同一台设备时钟回拨，也都复现了。
   ADR 把这写成"已知限制"，但没写出后果：玩家自己刚做的决定在本机就不生效，而且提示成功。

另有 4 条低级问题（A3 是 L2 修法带来的回退），以及测试缺口（47 处有效变异，抓到 33 处；有实际意义的漏网 9 处）。

## 检查了什么

| 项 | 结果 |
|---|---|
| `git diff 10687e9..af15dd4 -- src` | 全部已读。`identity_registry.mjs`、`visibility.mjs` 逐行读；`ai_logic.mjs`（`triggerAI` 写入点、`processTools`、`executeSkillCheck`）、`skill_attempt.mjs`、`persistence.mjs` 相关段、`tool_snapshot.mjs`、`output_protocol.mjs`、`lobby_view.mjs` 身份面板对照读 |
| `cd src && npm ci && npm run ci:smoke` | **通过**（exit 0；`visibility_leak_smoke: OK`、`identity_registry_smoke: OK`、`tool_rollback_smoke: OK`；Node v22.22.0） |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test` | **18/18 通过**（40.1 s）。运行会重写 `production/qa/evidence/identity-merge-done.png`、`identity-merge-suggestion.png`，已从运行前的副本还原，`git status` 干净 |
| `cd server && npm ci && npm test` | **17/17 通过** |
| 复现上一轮 N1–N3、L1–L5 | 真实 fixture `src/tests/fixtures/r29_17_save.json`，经 `CoCStatePersistence.migrateSaveData`。"另一台设备"用**独立 Node 进程**加独立的文件存储（N1），或独立的登记实例加独立存储（时钟场景） |
| 复现新问题 | A1：真实 `triggerAI` 加 stub 网络，跑三轮工具流程。A2：三种时钟场景。A3：合并 → 拆分 → 并给第三人 → 再拆分。A4：扫描期间另一个标签页写入。A5：输出协议承认的各种段标题写法。另外用**旧代码**（`10687e9` 的 `identity_registry.mjs`）写出 R30.3 登记，再用新代码读入 |
| 变异测试：一次只改一处，跑 7 个相关 smoke（`identity_registry`、`visibility_leak`、`tool_rollback`、`skill_attempt`、`save_legacy_upgrade`、`save_idb_consistency`、`save_diagnostics`），然后立即还原 | 47 处有效，抓到 33 处，见 A7；结束时 `git status` 干净 |
| 对照 ADR-0003 与 registry | 见"ADR 对照" |

Engine validation: NOT ASSESSED — 自研引擎，框架引擎专家检查不适用。

---

## 上一轮 N1–N3、L1–L5 的修复状态

| # | 状态 | 依据 |
|---|---|---|
| **N1** 登记丢失时拆分被撤销 | **已修（根因）** | 两进程复现（`n1_dev1.mjs` / `n1_dev2.mjs`）。设备 1：合并 → 写出"合并期间副本" → 拆分 → 写回 `Z`，记录带 `idDecisions: [merge, split]`。设备 2 用空登记、两种顺序各读两遍：`split#1->Z _idsChanged=0`、`split#2->Z _idsChanged=0`，`exploredBy` 保持 `[Z]`，旧副本 `stale#2->Z`，`resolve(Z)=Z`。变异 I01（不学存档带来的决定）、I02（记录不带决定）被抓到。**前提是两台设备的时钟大致准**，见 A2 |
| **N2** 暗骰账本覆盖整个战役 | **原症状已修**；修法留下新缺口 A1 | 消息带 `darkRolls`，投影只用该消息自己的清单，并按观看者过滤。测试走真实 `triggerAI`，断言了"暗骰前的叙述保留""后一回合同数值保留""Ann 能看到自己那次掷骰的数值、Bo 看不到"。D02、D03 被抓到。性能问题随之消失（每条消息只查自己的几次掷骰）。缺口在"清单交给哪条消息"，见 A1 |
| **N3** 【骰子】段在段内【…】处结束 | **已修** | `DICE_PHASE_RE` 的开头和结尾都来自 `narrative_sections.mjs`；三种写法都只剩"【叙事】安皱起眉。"。D10（恢复旧正则）、D11（去掉别名）被抓到。残留：清单里没有协议承认的 ASCII / 英文别名，见 A5（失败时关闭，不泄露） |
| **L1** 推动按名字查找，找不到时公开 | **已修** | 门禁返回尝试记录上的 `vis`（`skill_attempt.mjs:93`）；免检推动退回骰子面板查找，找不到时为 `{ to: 'keeper' }`；AI 在推动时传的 `hidden` 不再生效。D12、D14、D15、D16 被抓到 |
| **L2** 拆分后并给别人，擦掉拆分证据 | **原症状已修**；同一处留下新回退 A3 | 测试第 15 节通过，旧副本 `X [Z]` 跟到 W。但在保留的拆分记录之下，按第二次合并改写过的存档在第二次读入时会丢掉 `formerInvIds`，之后再拆分就恢复不了，见 A3 |
| **L3** 从存档重新学会合并时绕过把关 | **已修**（受 A2 限制） | 重放时同队者永不合并（I03 被抓到）；"不是同一人"与合并按时间先后决出（第 16 节；I04、I05、I07 被抓到）。但"先后"用的是各设备墙钟，见 A2 |
| **L4** 测试缺口 | **部分修** | N09 → 第 14 节同设备部分；D13 → 经 `_restoreFromData` 读档（D06 被抓到）。上一轮的 D15（新游戏清空）、D16（读档失败回滚）对应到新字段仍没有测试（本轮 D08、D09 漏网） |
| **L5** 工具回滚不含暗骰 | **已修**；测试不完整 | 快照与恢复都含 `pendingDarkRolls`，D05 被抓到。D19（快照里不存这个字段）漏网：测试只从空清单开始，看不出"回滚把回滚前就有的未叙述暗骰也清掉了" |

---

## 新问题

### A1 — [Medium，第 5 步前必须修] 暗骰清单被没有叙述的工具轮消息领走 — VERIFIED（真实 AI 路径）

**位置：** `ai_logic.mjs:443-445`（`takeDarkRolls` 无条件交给下一条 assistant 消息），`visibility.mjs` 的 `takeDarkRolls`。

**复现**（`dark_turn.mjs`：真实 `triggerAI` → `processTools` → `executeSkillCheck`，只把网络换成 stub）：

```
第 1 轮 AI：request_skill_check（hidden）          → 玩家点检定，暗骰 87/60
第 2 轮 AI：content=null，tool_calls=[update_character_status]   ← 先结算后果
第 3 轮 AI：【叙事】安盯着对方，心理学骰出 87，目标 60……          ← 复述了数值（违背提示）

assistant#0 content=""  tool_calls=request_skill_check      darkRolls=
assistant#1 content=""  tool_calls=update_character_status  darkRolls=87
assistant#2 content="【骰子】…【叙事】安盯着对方，心理学骰出 87，目标…"  darkRolls=
Bo sees: 【叙事】安盯着对方，心理学骰出 87，目标 60，她什么也没看出来。
```

"检定之后先调结算工具（伤害、理智、状态），再写叙述"是这个工具协议下的常见顺序（`narrative_settle_reconcile` 甚至会要求先调结算工具）。
同一回合的叙述分在两条消息里（第 2 轮有正文和工具调用，第 3 轮继续写）时，第二条同样没有清单。上一轮 R30.3 的全战役账本能挡住这种情况，
所以这是第二道防线的回退。目前 `projectFor` 只在测试里调用（`grep` 结果为空），还没有人真正看到泄露。

**5 Why：**
1. 为什么 Bo 看到 87？描述这次暗骰的叙述消息上没有 `darkRolls`。
2. 为什么没有？清单已经被上一条消息领走了，那条消息只有工具调用、没有正文。
3. 为什么它能领走？`takeDarkRolls` 把清单交给 `triggerAI` 写入的**下一条** assistant 消息，不看这条消息有没有叙述。
4. 为什么按"下一条消息"交？修法把"描述这次掷骰的叙述"建模成了一条消息，但一个回合的叙述跨好几个工具轮，每一轮都是一条 assistant 消息。
5. **根因：** 暗骰和叙述的对应单位应当是**回合**（从掷骰起，到玩家下一次输入为止），而不是一条消息。

**修法建议：** `pendingDarkRolls` 在整个回合内保持"打开"，本回合里每条**有正文**的 assistant 消息都记一份副本；玩家下一次输入时
（`handlePlayerAction` 写入用户消息的地方）才清空。这样也符合 ADR 自己的说法（"AI 已看到、尚未叙述"）。
补测试：stub 网络按三轮返回（检定 → 只有工具调用 → 叙述），断言叙述消息带清单、游客视图里数值被替换；再补一条"叙述分在两条消息里"。
现有测试的 `narrate` stub 每次都直接返回正文，所以抓不到这种情况。

### A2 — [Medium，必须修] 决定按各设备墙钟排序，玩家的拆分或合并在本机不生效却提示成功 — VERIFIED

**位置：** `identity_registry.mjs:56`（`byTime`）、`:268`（`stamp = now() + '#' + 计数`）、`:96`（`replay` 按 `at` 排序）、`:551-556`（`split` 不检查结果）。

**复现**（`skew.mjs`，每台设备是独立的登记实例和独立存储，注入时钟）：

```
1 设备 A 时钟快一天，合并 X、Z；设备 B（时钟准，真实时间更晚）读到 A 的存档后拆分 Z：
  B split(Z) returns {"ok":true,"saved":true} -> resolve(Z)==X still: true  merges listed: 1
  B save after split: X (split had no effect)
2 反过来：A 拆分（时钟快），B 之后再合并：
  B merge(X,Z) returns {"ok":true,"saved":true} -> resolve(Z)==X: false  suggestions: 0
3 同一台设备，两次决定之间时钟回拨一小时：
  split {"ok":true,"saved":true} -> still merged: true
```

面板提示"已拆分"（`lobby_view.mjs:851-853` 只看 `ok`），刷新后合并还在。场景 2 更糟：合并不生效，而 A 的拆分留下的 `distinct = 'user'`
又让这对人不再被建议，玩家在这台设备上**再也没有办法**把他们合并。系统 15 面向局域网热点、离线使用，设备不一定能对时，时钟不准并不罕见。

**5 Why：**
1. 为什么拆分不生效？重放时，学来的合并排在拆分之后。
2. 为什么排在后面？它的 `at`（A 的时钟）比拆分的 `at`（B 的时钟）晚。
3. 为什么能更晚？`at` 取各设备自己的 `new Date()`，彼此之间没有关系。
4. 为什么这会推翻玩家刚做的决定？"以最后一个决定为准"的本意是"玩家看到之前的决定以后又做的决定"，这是**因果上的先后**；
   代码却用了物理时间。
5. **根因：** 决定的先后用了互不相关的墙钟，而不是"做决定时已经看到了什么"。

**修法建议：** 改用混合逻辑时钟：新决定的 `at = max(now(), 日志里最晚的 at) + 1 个刻度`（日志里已经包含从存档学来的决定）。
这样本机在学到别人的决定之后做的决定一定排在它们后面。两台设备互相不知道对方时做的决定，仍按时间排序，这在 ADR 里写明即可。
另外，`merge` / `split` / `markDistinct` 在重放之后检查结果，没有生效就返回 `ok: false` 并说明原因，面板不能再提示成功。
补测试：上面三种时钟场景。

### A3 — [Low，L2 修法带来的回退] 拆分后再并给第三人，存档读两次就丢掉 `formerInvIds`，之后无法再拆分 — VERIFIED

**位置：** `identity_registry.mjs:257-261`（`splitIndex`）、`:385-390`（找到拆分记录就去掉对应的 `formerInvIds`）、`:104`（L2 修法保留 `splits[Z]`）。

**复现**（`remerge.mjs`，W、X、Z 三人，追踪 Z 的存档）：

```
merge X,Z; load Z save:            X ["Z"]
split Z; load:                     Z []
merge W,Z; load:                   W ["Z"]
load again:                        W []          ← 没有任何新决定，存档却被改写（并写回）
split(Z) -> {"ok":true,"saved":true} resolve(Z)= Z
load after split:                  W []          ← 拆分恢复不了，应为 Z
```

**5 Why：** 再拆分为什么恢复不了？记录上已经没有 `Z`。→ 为什么没有？第二次读入时 `splitIndex` 找到了 `splits[Z]`，把它当成"这次合并被拆分过"。
→ 为什么会找到？L2 修法让 `splits[Z]`（= X，记的是**上一次**与 X 的拆分）在并给 W 之后继续保留。→ 为什么旧的拆分记录会作用到新的合并上？
`splitIndex` 只问"这个旧编号有没有被拆分过"，不问"是从谁那里拆出来的"。→ **根因：** 拆分记录没有标明它撤销的是哪一次合并。

**修法建议：** `splits[Z]` 改为"曾经从谁那里拆出"的集合；`canonicalize` 只在记录的当前正式编号属于这个集合时才视为已拆分。
`X [Z]`（旧副本）因为 X 在集合里，回到 `resolve(Z)`；`W [Z]` 在并给 W 期间不受影响；再次从 W 拆分后，两份都回到 Z。
补测试：上面的序列，加上"并给 W 期间读两次，存档不变"。

### A4 — [Low] 跨标签页合并用并集，扫描期间另一个标签页写入会把已清掉的来源加回来 — VERIFIED

**位置：** `identity_registry.mjs:225-230`（`people.sources` 取并集）。

`crosstab.mjs`：标签页 A 扫描（`batch` → 清掉全部来源 → 只重新收集槽位 1）。扫描等待期间，标签页 B 自动存档并写入登记。
A 结束时读到存储已变，于是取并集，已删除的槽位 2 又成了证据：`after scan … suggestions 1 (expect 0)`，存储里也是 1。
**根因：** 并集表达不了"删除"，而 `forgetSources` 恰恰是删除。**修法：** 合并来源时，以本次扫描清掉的标签为准（记下扫描开始时间，
`sources[label]` 早于这个时间的一律不取），或者给来源加删除标记。后果只是多出一条过期建议，下次扫描就会消失（如果当时没有并发写入）。

### A5 — [Low] 【骰子】段结尾清单不含协议承认的 ASCII / 英文别名，游客看到的叙述整条为空 — VERIFIED

`narrative_sections.mjs` 只收【…】形式。`output_protocol.mjs` 的 `header(phase, extra)` 另外接受 `[叙事]`、`STORY_PHASE`、`[旁白]`、
`NARRATION_PHASE`、`[交互]`、`INTERACTION_PHASE`、`[行动]`、`ACTION_ORDER`。`regex2.mjs`：`【骰子】… [叙事] … [旁白] …` 不会被协议重组
（`ok: false, restructured: false`），原样存下，游客视图是 `""`。这种情况失败时关闭，不泄露，但游客会丢掉整条叙述。开头一侧没有问题：
`DICE_PHASE`、`[骰子]` 开头的叙述会被协议重组成【骰子】。**根因：** 与 N3 同类，别名只有一半移进了共用清单。**修法：** 把 `extra`
也放进 `narrative_sections.mjs`，两边都从那里生成。

### A6 — [Low] R30.3 存档的暗骰账本在迁移时直接删除，旧叙述失去第二道防线 — PLAUSIBLE（代码追踪）

`persistence.mjs:484` 读档时 `delete d.darkRolls`，旧 assistant 消息上没有 `darkRolls`。R30.3 已经发布（`CHANGELOG.md`），
这些存档里 AI 若在叙述中复述过暗骰数值，第 5 步接入后会原样给游客。**修法：** 迁移时把账本里的每次暗骰挂到 `ts` 之后第一条有正文的
assistant 消息上（按 A1 的修法，应挂到该回合内的全部这类消息上），再删除账本。

### A7 — [Low] 测试缺口（变异存活） — VERIFIED

47 处有效变异，抓到 33 处。漏网的 14 处里，I21、I23、I24、D13、D18 是等价或近似等价的改动（结果相同，或者被别的白名单兜住）。
其余 9 处有实际意义：

| # | 改坏的地方 | 若真发生 |
|---|---|---|
| **I09** | 跨标签页合并时改成本标签页的发号记录优先 | 另一个标签页已经写回存档的编号，会被扫描期间的临时编号覆盖，同一份旧副本得到两个编号，正是登记要防的缺陷。第 18 节只检查"两边的编号都在 `copies` 里"，没有检查同一个键上谁赢 |
| **I16** | 隐式合并（只有 `formerInvIds`）改为最晚 | R30.3 登记里的拆分会被 R30.3 旧副本推翻。没有测试覆盖"R30.3 登记 + R30.3 旧副本" |
| **I19 / I20** | R30.3 登记读入时不建日志 / 漏掉"不是同一人" | 已经升级的用户会丢掉全部旧决定。**这条升级路径没有任何测试。** 我用旧代码（`10687e9`）写出带合并、拆分、"不是同一人"的登记，再用新代码读入（`legacy_reg.mjs`），结果正确：`resolve(B)=B`、`resolve(C)=A`、`distinct A|D: user`，旧副本 `A[B]→B`。所以代码目前是对的，但没有测试守着 |
| I11 | 跨标签页不合并对方新见到的人 | 建议里少一个人，直到下次扫描 |
| D08 | 新游戏不清空 `pendingDarkRolls` | 上一局的暗骰挂到新游戏第一条叙述上（只是多替换） |
| D09 | 读档失败回滚时不恢复 `pendingDarkRolls` | 未叙述的暗骰丢失，下一条叙述没有清单 |
| D19 | 工具快照不存 `pendingDarkRolls` | 回滚时把回滚之前就在等待的暗骰也清掉了。测试只从空清单开始 |
| D20 | 免检推动的后备查找不 trim | 只影响后备路径 |

**修法：** 至少补 I09（同一个键：先写入的标签页的编号保留，后写入的临时编号不覆盖）、I19 / I20 / I16（把 `legacy_reg.mjs` 的场景写进测试，
可以直接用 fixture 形式的 R30.3 登记 JSON），以及 D19（回滚前已有一条未叙述暗骰，回滚后仍在）。

### Info

- **`idDecisions` 的增长与写回**（`churn.mjs`）：`decisionsFor` 每读一次扩一层（把"相关的人的相关的人"也带上），所以要读两次才稳定，
  这两次都会写回（`1/2 1/3 0/3 0/3`）。经"不是同一人"连起来的人，彼此的决定都会随对方的存档走；与本人无关的拆分也会让本人的存档在下次读入时写回。
  拆分 / 合并来回切 50 次后，每条记录带 104 条决定、约 14 KB，`arcLedger.characterSnapshot` 里还会再存一份。规模由玩家操作决定，可以接受；
  但 `canonicalize` 的返回值文档写"how many records changed id"，现在也包括"决定清单变了"，`_idsChanged` 的含义已经变宽，建议改名或改注释。
- **批处理与存储失败**：`batch` 期间 `write` 直接返回 `true`。扫描进行中如果有 `merge` / `split`，面板会提示已保存；扫描结束时那一次写入如果失败，
  只会置 `unsaved`，不会告诉面板。触发窗口很小。
- **R30.3 日志编号**：`ensureLog` 用 `'legacy:m:' + a` 作为编号。两台设备上同一个 a 的旧合并对象不同时，`learnInto` 会按编号去重，丢掉其中一条。很罕见。
- `CHANGELOG.md` R30.4 写"暗骰只在描述它的那段叙述里隐去数值"。修好 A1 之前，这句话对"先结算后叙述"的回合不成立。

---

## ADR 对照

### 代码没有做到 ADR / registry 要求的

| 位置 | 要求 | 实际 | 见 |
|---|---|---|---|
| ADR §3"AI 的叙述消息写入时领走它们" / registry `pending_dark_rolls`"on the narration that took them" | 清单记在描述该暗骰的叙述上 | 记在下一条 assistant 消息上，可能只有工具调用、没有正文 | A1 |
| registry `dark_roll_numbers_in_guest_narration` | 叙述按它写入时的暗骰清单替换 | 先结算后叙述的回合里，叙述没有清单 | A1 |
| ADR §1.1"同一对人以最后一个决定为准" / registry `derived_or_reissued_identity`"latest decision wins" | 玩家的最后一个决定生效 | 时钟不准时，本机刚做的决定可能完全不生效，还提示成功；同一台设备时钟回拨也一样 | A2 |
| ADR §1.1"可以拆分……合并链中拆哪一环都有效" | 任何时候拆分都能恢复存档 | 拆分 → 并给第三人 → 读两次之后，再拆分恢复不了 | A3 |
| ADR §1.1"多个标签页……证据取并集" + "证据：先清掉全部来源" | 扫描后已删除的存档不再作为证据 | 扫描期间另一个标签页写入时，被清掉的来源经并集又回来了 | A4 |
| registry `pending_dark_rolls` `write_access` | recordRoll 追加、takeDarkRolls 清空 | `tool_snapshot.mjs` 的恢复、`persistence.mjs` 的新游戏 / 读档 / 读档失败回滚也会写这个字段，清单没有列全 | — |

### 已经做到的（核对过）

- §1.1 决定日志：三种决定都随存档走，读档时先学会存档带来的决定再改写编号，与读入顺序无关（两进程、两种顺序）；R30.3 存档的 `formerInvIds` 当作最早的合并；
  同队者永不合并；扫描只写一次登记（I13、I27 被抓到）；扫描清掉全部来源并计入当前游戏（I25、I26 被抓到）；多标签页写入前先合并，决定不会丢（I08、I10、I12 被抓到）。
- §1.1 R30.3 登记升级：用旧代码写出、新代码读入，合并、拆分、"不是同一人"都保留（但没有测试，见 A7）。
- §3 按消息记录：游客视图不含 `darkRolls`（D17 被抓到），API 消息按字段构造，不会发给 AI；随对话与存档保存、读档后仍然替换；推动从尝试记录取 `vis`，找不到时只给守秘人。
- §3【骰子】段：开头和结尾都来自共用清单，段内的【人名】【技能】【失败】不会让段提前结束。
- registry 已补 `pending_dark_rolls` 一条；`remapInvIds` 的注释已经与实际范围（12 个顶层字段）一致。

### ADR / registry 应根据代码改写的

| 位置 | 建议 |
|---|---|
| ADR §1.1"已知限制：不同设备的时钟不准时，'较晚'按各自时钟判断" | 修 A2 之前必须写明后果：本机刚做的拆分 / 合并可能不生效，并且提示成功。修 A2 之后改为："本机的决定总排在它已经学到的决定之后；只有两台设备互不知道对方时做的决定，才按时间排序" |
| ADR §1.1 拆分记录 | 修 A3 时改为"拆分记录标明从谁那里拆出" |
| ADR §1.1 多标签页 | 写明来源的删除怎样跨标签页合并（A4） |
| ADR §3 / registry `pending_dark_rolls` | 修 A1 时把"领走"的单位从"消息"改为"回合"；`write_access` 列全 |
| ADR §3 输出协议别名 | 修 A5 时写明"ASCII / 英文段标题也在共用清单里" |

---

## Code Review（skill 格式）

### Engine Specialist Findings: N/A — NOT ASSESSED（自研引擎）

### Testability: GAPS
登记仍然可以注入存储与时钟，新测试走了真实路径（`triggerAI`、`executeSkillCheck`、`scanIdentities`、`_restoreFromData`），这一点比上一轮好。
缺口：AI 测试 stub 每次直接返回正文（A1 抓不到）；时钟测试的每台设备都用单调递增、彼此协调的假时钟（A2 抓不到）；R30.3 登记升级、跨标签页发号谁优先没有测试（A7）。

### ADR Compliance: DRIFT
A1、A2 违反 ADR / registry 的明文不变量；A3、A4 为 MINOR DEVIATION。没有使用 ADR 否决的方案。

### Standards Compliance: 5/6
- 文档注释：通过。
- 复杂度：**轻微不通过**。`canonicalize` 里 `splitIndex` / `keep` / `reverted` 加上两个 `continue` 的分支仍然难读（A3 就藏在这里）；
  `replay` 在 `observe`、`learnInto`、`decide`、`mergeStored`、`canonicalize` 的同队分支里各调一次，一次扫描会重放很多次（目前量级可以接受）。
- 依赖注入、接口、配置外置：通过 / 可接受。

### Architecture: MINOR ISSUES
"决定日志 + 重放"的方向是对的，正对上一轮"决定只有一半随存档走"的根因。剩下的两个结构问题：先后关系应当是因果上的（A2），不是物理时间；
暗骰与叙述的对应单位应当是回合（A1），不是一条消息。

### SOLID: COMPLIANT

### Game-Specific Concerns
- 局域网 / 离线场景下设备时钟不可靠，A2 在这个项目的目标场景里比一般网页更容易出现。
- 每次投影只查消息自己的几次暗骰，性能问题已经消失。

### Positive Observations
- N1 的修法做在根因上：三种决定对称，都随存档走；读档时先学会决定再改写编号，与读入顺序无关。
- 用"回放日志"推导别名、拆分、不同人，比原来在多处直接改这几张表更容易推理，也让跨标签页合并变得简单。
- N2 修法不是把上限调大，而是在写入时记下对应关系，正是上一轮建议的方向；测试走真实 `triggerAI`。
- N3 把段标题收成一处定义，输出协议和投影共用。
- 新增的测试大多经过真实写入函数，变异命中率从 20/31 提高到 33/47。

### Required Changes
1. **A1**：未叙述的暗骰在整个回合内保持打开，本回合每条有正文的 assistant 消息都记一份，玩家下一次输入时清空；补三轮工具流程的测试。
2. **A2**：决定时间改用混合逻辑时钟（不早于日志里已有的最晚决定）；`merge` / `split` / `markDistinct` 在重放后检查结果，没有生效就不提示成功；补三种时钟场景的测试。

### Suggestions
A3–A6；A7 里的 I09、I16 / I19 / I20、D19 测试；ADR / registry 按上表改写。

### Verdict: CHANGES REQUIRED

---

*复现与变异脚本在评审会话的 scratchpad（`repro/`）中，未提交：`shim.mjs`、`n1_dev1.mjs` / `n1_dev2.mjs`、`skew.mjs`、`dark_turn.mjs`、`remerge.mjs`、
`legacy_reg.mjs`（加载 `10687e9` 的旧 `identity_registry.mjs`）、`crosstab.mjs`、`churn.mjs`、`regex.mjs` / `regex2.mjs`、`mutate.mjs`。
每处变异跑完立即还原，结束时 `git status` 只多出本报告；Playwright 重写的两张证据截图已还原。*
