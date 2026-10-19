# Code Review — 审查修订提交 7cfff83（身份登记与暗骰，回应 2026-10-17 审查 F1–F9）

Date: 2026-10-18
Commit: `7cfff83` fix: resolve the identity and dark-roll review findings at their root
Scope: `git diff 7b65152..7cfff83 -- src`（17 个 `src/` 文件），以及同一提交中的 ADR-0003 与 `docs/registry/architecture.yaml`
Reviewer: 独立评审（未参与 7cfff83 的编写）
Engine: Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue）
ADR: ADR-0003（Proposed），重点 §1、§1.1、§3、§8、Key Interfaces、Implementation Guidelines
Prior report: `code-review-2026-10-17-adr-0003-step4-identity.md`（CHANGES REQUIRED，F1–F9）

Reviewed-Content-Hash: docs/architecture/adr-0003-per-player-visibility-and-save-v9.md 2b6d49f78db951c9dd6877ea1c7f3736ab10eb19
Reviewed-Content-Hash: docs/registry/architecture.yaml 841811e83fb45c6fcdf9b41a2619940b7e7bd583
Reviewed-Content-Hash: src/js/state/identity_registry.mjs 04dace58dce1cfb3bc77ceccb70b7d67999e0a11
Reviewed-Content-Hash: src/js/state/visibility.mjs 02e82f0250d2dfc60b9831d56f2c67a4ea6b9b0b
Reviewed-Content-Hash: src/js/state/persistence.mjs 1a7034513fdd8b22a36c7fbba3f92227413e8670
Reviewed-Content-Hash: src/js/ai_logic.mjs fd49ba77e851ae76255efe10c3af501b0b9433bf
Reviewed-Content-Hash: src/js/views/lobby_view.mjs 57d620e101ab78ea627cfc801ff6580a1fcf82d4
Reviewed-Content-Hash: src/tests/identity_registry_smoke.mjs e7367990016875f94277cadc0bd53f40740b0f7f
Reviewed-Content-Hash: src/tests/visibility_leak_smoke.mjs 872435dc76a4dceb78e4fb3c90f4caddcd60f082
Reviewed-Content-Hash: src/tests/playwright/identity_merge.spec.mjs 87a625d55a002c1a34026368ceb0ca76daeba3d0

## 结论

**Verdict: CHANGES REQUIRED**

上一轮的三条必修项，在它们被描述的那条路径上都修好了，修法也对准了根因：

- **F1**：用真实 fixture、**两个独立进程**（第二个进程相当于另一台设备）复现。已合并并写回的存档在空登记下读入，编号不变，
  `_idsChanged = 0`，`exploredBy` 不变。
- **F2**：推动沿用原检定的 `vis`，推动失败的提示改为追加。
- **F3**：暗骰清单不再受 30 条骰子面板限制；保存、读档后旧叙述仍会替换（端到端复现）。

但这次修订新引入了两处必须修的问题，另有一处必须在第 5 步接入 `projectFor` 之前修：

1. **N1 [Medium，必须修]** 登记丢失时，**拆分**会被悄悄撤销并写回。这和 F1 是同一类问题，只是从"合并"换成了"拆分"：
   合并的决定随存档带走，拆分的决定却只记在本机登记里。
2. **N3 [Medium，必须修]** 新的【骰子】段正则遇到段里任何【…】（例如引擎自己检定行格式里的【安】【心理学】）就提前结束，
   暗骰的成败等级留在游客视图里。旧正则会把这一段删掉，所以这是修 F6 带来的回退。
   registry 里写的是"游客视图永不含【骰子】段"，现在做不到。
3. **N2 [Medium，第 5 步前必须修]** 暗骰账本覆盖整个战役，替换又只按数值匹配，于是游客视图里与任一暗骰同数值的
   公开数字都会被换成"（暗骰）"：伤害、理智损失、公开检定，连暗骰**之前**写的叙述也不例外。战役越长，范围越大。
   账本满 1000 条时，一次投影约 0.6 秒。

另有 5 条低级问题与测试缺口。31 处故意改坏，测试抓到 20 处；没抓到的里有 2 处会掩盖真实缺陷（N09、D13）。

## 检查了什么

| 项 | 结果 |
|---|---|
| `git show 7cfff83` 全部 `src/` 改动 | 已读；`identity_registry.mjs`、`visibility.mjs` 逐行读；`ai_logic.mjs executeSkillCheck`、`skill_attempt.mjs`（推动的门禁）、`persistence.mjs` 相关段、`tool_snapshot.mjs`、`lobby_view.mjs` 对照读 |
| `cd src && npm ci && npm run ci:smoke` | **通过**（exit 0；`visibility_leak_smoke: OK`、`identity_registry_smoke: OK`；Node v22.22.0） |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test` | **18/18 通过**（32.0 s）。运行会重写 `production/qa/evidence/identity-merge-done.png`、`identity-merge-suggestion.png`，已从运行前的副本还原，`git status` 干净 |
| 用真实 fixture `src/tests/fixtures/r29_17_save.json` 复现 F1–F5 | 经 `CoCStatePersistence.migrateSaveData`。"另一台设备"用独立 Node 进程模拟（见下方"方法说明"） |
| 复现新问题 | N1（两个进程）、N2、N3、注册表的合并 / 拆分交互（L2、L3）、性能（投影、大厅扫描） |
| 变异测试：一次只改一处，跑 6 个相关 smoke（`visibility_leak`、`identity_registry`、`save_legacy_upgrade`、`save_idb_consistency`、`save_diagnostics`、`tool_rollback`），然后立即还原 | 31 处有效，抓到 20 处，见 L4。提交信息里说的"前三轮 69 处复跑全部抓到"，**未复核**（那些脚本不在本会话里） |
| 对照 ADR-0003 与 registry | 见"ADR 对照" |

**方法说明：** 在同一进程里换一个空的 `localStorage` 并**不能**模拟"登记丢失"。`read()` 发现存储里没有这个键时，会退回内存里的旧状态
（`identity_registry.mjs:113`）。我第一次同进程复现因此被污染，作废；以下凡是"另一台设备"的结论，都来自独立的第二个进程。

Engine validation: NOT ASSESSED — 自研引擎，框架引擎专家检查不适用。

---

## 上一轮 F1–F9 的修复状态

| # | 状态 | 依据 |
|---|---|---|
| F1 合并在登记丢失时被撤销 | **已修（合并）**；同类问题在**拆分**上仍在，见 N1 | 两进程复现：`A merged save on fresh registry -> X former [Z] _idsChanged 0 exploredBy [X]`。根因判断正确："找不到别名"不再被当作拆分；拆分改为正面记录（`splits`）。变异 N02（恢复旧推断）被抓到 |
| F2 推动暗骰后公开 | **已修（主路径）**；有残留，见 L1 | 推动沿用原检定 `vis`、提示改为 `+=`；变异 D01、D02 都被抓到。残留：继承靠"调查员名 + 技能名"在骰子历史里找，而不是取门禁已经核实过的那条尝试记录 |
| F3 暗骰数值在旧叙述里重现 | **已修（窗口、翻页、读档）**；修法带来 N2 | `darkRolls` 由 `recordRoll` 唯一写入，随存档保存、读档恢复（端到端：保存 → 清空 → `_restoreFromData` → 旧叙述仍为"（暗骰）"）。ADR 与 registry 已把措辞改为"第二道防线" |
| F4 存储失败 | **已修**；"无 `localStorage`"无法从代码上修，已写进 ADR | 配额满时以内存为准（变异 N06 被抓到）；`merge` / `split` / `markDistinct` 返回 `saved`，面板提示（N11 被抓到）；登记损坏时先备份（N07 被抓到） |
| F5 合并链中的拆分 | **已修** | 测试第 10 节与本人复现一致。变异 N03（取第一个被拆分的编号而不是最后一个）没被抓到：两次读入后结果相同，只是多写回一次，可以接受 |
| F6 【骰子】段正则 / 同值替换 | **部分修**。别名段标题不再吞掉【故事】；但新正则过宽，造成 N3。同值误替换没有修，范围反而扩大到整个战役（N2） | 见 N2、N3 |
| F7 测试缺口 | **列出的项都已补**（V14、V19、V21、R9、R11/12/20、R13、R15、P1）；有新缺口，见 L4 | 对应变异 D06、N12 等被抓到；Playwright 新增跨模组扫描 |
| F8 面板与证据 | **已修** | 提示看返回值；导入带来源；`forgetSources` 每次扫描都刷新证据。D17、D18 没有测试 |
| F9 ADR 措辞 | **基本已修** | 写回内容、`remapInvIds` 范围、`isLocalOnly` 例外、多标签页窗口、Key Interfaces 都已改。代码注释 `identity_registry.mjs:53-54`（"Walks the whole object … without a list to maintain"）仍然说得太宽 |

---

## 新问题

### N1 — [Medium，必须修] 登记丢失时拆分被撤销并写回 — VERIFIED（两进程复现）

**位置：** `identity_registry.mjs:269-274`（`observe` 从 `formerInvIds` 重新学会合并）、`:216-221`（拆分后的记录去掉了被拆编号）、`:366-374`（`split` 只写本机登记）。

**复现**（`dev1.mjs` / `dev2.mjs`，真实 fixture）：设备 1 读入两份不同写入的 Alice（X、Z），合并 Z→X，槽位 2 写回为 `X [Z]`，再拆分 Z，
槽位 2 写回为 `Z`。同时留下一份合并期间的副本 `X [Z]`，它可以是导出文件、另一个模组或槽位，也可以是没被写回的另一个副本
（`loadGame` 只写回被读的那个副本）。设备 2 的登记是空的，依次读入这两份：

```
B split save after stale copy on fresh registry -> X former [ 'Z' ] _idsChanged 1 exploredBy [ 'X' ]
B2 (split save first, then stale copy, then split save again) -> X _idsChanged 1
```

已写回的拆分结果被改回 X，`_idsChanged = 1`，所以 `loadGame` 会把它写回存档。玩家对此没有做过任何操作。
登记损坏后重建（F4 的新路径）、清除站点数据后再导入，也会走到这一步。

**影响：** ADR §1.1 写"登记丢失……已写回的存档编号不变"；registry `derived_or_reissued_identity` 写"编号只因玩家确认的合并或拆分而改变"。
两条都被违反。ADR 括号里"拆分记录不随存档走，属本机决定"只说了拆分会丢，没说已写回的拆分存档会被**改回去**。

**5 Why：**
1. 为什么拆分过的存档变回 X？`canonicalize` 找到了别名 Z→X。
2. 为什么有这条别名？`observe` 从合并期间那份副本的 `formerInvIds` 重新学会了它。
3. 为什么重新学会时不知道已经拆分过？拆分只记在登记的 `splits` 里，登记丢了。
4. 为什么存档里没有拆分的证据？拆分恢复时把 Z 从 `formerInvIds` 里删了，记录上不再留下"Z 不是 X"。
5. **根因：** 玩家的身份决定只有一半随存档走。合并有存档里的记录（`formerInvIds`），拆分 / "不是同一人"只在本机。
   存档里记的是"改过哪些号"，没记"玩家最后的结论"。

**修法建议：** 让两种决定对称，都随存档走，并按时间先后决出。例如拆分恢复时在记录上留 `splitFrom: [{ id: X, at }]`
（合并同样带时间戳），`observe` 读到时写入 `splits` 与 `distinct = 'user'`；重新学会合并时，若本机或任何已读存档里有更晚的拆分 / 不同人记录，就跳过。
补一条测试：照上面的两进程场景，空登记先后读"合并期间的副本"与"拆分后的存档"，拆分后的存档编号不变，`_idsChanged` 为 0。

### N2 — [Medium，第 5 步接入 `projectFor` 前必须修] 暗骰账本覆盖整个战役，按数值误替换公开内容 — VERIFIED

**位置：** `visibility.mjs:113-124`（`recordRoll` 把每次暗骰写进账本）、`:155-170`（`narrationForGuest` 对每条叙述套用全部暗骰）、`:173-179`（`hiddenRollsFor`）。

**复现**（`repro_dark.mjs`，经真实的 `recordRoll` 与 `projectFor`）：

```
三次暗骰（5、3、37/45），之后一条公开叙述：
2 guest: 【叙事】怪物扑来，安受到 （暗骰） 点伤害，又失去 （暗骰） 点理智。她的侦查目标 （暗骰） 并不高，骰出 （暗骰） 也算尽力了。
暗骰之前写的公开叙述：
3 earlier public narration: 【叙事】安骰出 （暗骰），成功。
账本满 1000 条、200 条对话窗口：
4 projectFor ... 684 ms；之后 5 次共 3124 ms；账本 JSON 114 KB
```

d100 暗骰在几十次之后就覆盖了 1–100 的大部分数值，此后游客视图里几乎所有"N 点""骰出 N""N/M""目标 N"都会被替换。
不会泄露（替换失败时是关闭的），但游客看不到伤害、理智损失、公开检定的数值。ADR §3 写的"同一视图里公开掷骰恰好与暗骰同数值时"
把这当成偶发情况，实际上是常态。`projectFor` 目前只有测试在调用（`grep` 结果为空），所以这是潜在问题；第 5 步一按成员投影就会显现，
而且每次投影约 0.6 秒。

**5 Why：**
1. 为什么公开数字被换掉？它的数值出现在账本里。
2. 为什么出现在账本里就换？替换只看数值，对每一条叙述都套用全部暗骰。
3. 为什么只看数值？叙述与"它描述的是哪次掷骰"之间没有联系。
4. 为什么没有联系？写入叙述时没有记下这一回合 AI 看到了哪些暗骰结果；账本只是把面板的 30 条换成了 1000 条。
5. **根因：** "暗骰 → 叙述"的关系没有在写入时记录，只能事后靠数值猜。

**修法建议：** AI 收到附带 `DARK_ROLL_AI_NOTE` 的工具结果后，给它写出的那条（以及同一工具轮的后续）assistant 消息记上
`darkRollIds`（只存 `rollId`、`total`、`target`、`label`，随消息保存）；投影时只用该消息自己的清单替换。
这正是上一轮 F3 修法 (a) 的前半句。这样替换只发生在描述该暗骰的叙述里，暗骰之前的叙述与无关的伤害数字不受影响，
每条消息只需检查几次掷骰（性能问题一并解决），账本也可以去掉。补测试：暗骰之后的另一回合里，公开叙述的同值数字原样保留；
暗骰之前的叙述原样保留。

### N3 — [Medium，必须修] 【骰子】段在段内第一个【…】处结束，暗骰的成败等级留在游客视图里 — VERIFIED

**位置：** `visibility.mjs:143`

```js
const DICE_PHASE_RE = /(?:【骰子】|【判定】|\[骰子\])[\s\S]*?(?=【[^】\n]{1,8}】|$)/g;
```

前瞻会在**任何** 1–8 个字的【…】处停下，包括人名、技能名与结果。引擎自己的检定行就是 `【安】进行【心理学】检定：骰出 87/60，失败。`，
AI 照抄进【骰子】段很常见：

```
"【骰子】\n【安】进行【心理学】检定：骰出 87/60，失败。\n【叙事】安皱起眉。"
  新: "【安】进行【心理学】检定：骰出 （暗骰），失败。\n【叙事】安皱起眉。"
  旧: "【叙事】安皱起眉。"
"【骰子】守秘人为【安】进行了【心理学】检定：失败（困难成功需 30）。\n【叙事】…"
  新: "【安】进行了【心理学】检定：失败（困难成功需 30）。\n【叙事】…"
"【骰子】心理学检定 87/60 →【失败】\n【叙事】…"
  新: "【失败】\n【叙事】…"
```

数值还有第二道替换挡着，但成败等级（以及"困难成功需 30"这样的写法）没有任何替换规则能挡，原样到了游客那里。
这只在 AI 违背提示时发生（第一道防线仍在）。但 registry `dark_roll_numbers_in_guest_narration` 写的是
"Guest views never carry the AI narration's dice section"，而这种情况下【骰子】段并没有被完全去掉。

**5 Why：** 等级为什么留下？【骰子】段在【安】处就结束了。→ 为什么在那里结束？结尾前瞻接受任意【…】。→ 为什么这样写？
为了不再吞掉【故事】等别名（F6），选了"任意标签"，而不是"已知段标题"。→ 为什么没有已知段标题的清单可用？段标题定义在
`ai/output_protocol.mjs` 的 `PHASE_MARKERS`，没有导出共用。→ **根因：** 段边界在两处各自定义，F6 时也只是在其中一处改。

**修法建议：** 从 `output_protocol.mjs` 导出全部段标题（含别名【故事】【描述】【线索】等）的唯一清单，`DICE_PHASE_RE` 的开头与结尾都用它，
不用任意【…】。补测试：上面三种写法在游客视图里都不剩"失败 / 成功 / 需 30"。变异 D08（恢复旧正则）已被抓到，说明别名一侧有测试；缺的是这一侧。

### L1 — [Low] 推动的可见范围按"名字 + 技能名"去找，找不到时退回公开 — PLAUSIBLE（代码追踪）

**位置：** `visibility.mjs:131-137`、`ai_logic.mjs:683-686`。

推动的门禁（`skill_attempt.mjs canAttemptSkill`）已经用 `charName + trim(skill) + situation` 核实过"刚刚失败的那次检定"，
`previousRollVisibility` 却另外按 `rolledBy === c.name && label === skillName`（不 trim）在骰子历史里再找一遍。
在剧本节点或规则检定情境下，`situation` 不含技能名，所以 AI 推动时把技能名写成 `"心理学 "` 也能通过门禁，但这里找不到原检定，
于是改用推动工具自己的参数，缺省就是公开。另外，`hit.vis` 为 `undefined`（原检定公开）时也会退回参数：
AI 在推动时加上 `hidden` 会把公开检定变成暗骰，这与 ADR"推动沿用原检定的 vis"不一致（不泄露）。
**修法：** `recordSkillAttempt` 把原检定的 `rollId` / `vis` 记在尝试记录上，推动直接从门禁返回的记录里取，不再按名字搜索；找不到时取 `{ to: 'keeper' }` 而不是公开。

### L2 — [Low] 拆分后再把被拆者并给别人，会擦掉还没重读的副本上的拆分证据 — VERIFIED

`repro_c.mjs`：W、X、Z 三人，合并 Z→X，某个副本写成 `X [Z]`，拆分 Z，再合并 Z 与 W（W 先登记，所以 Z→W）。`merge` 执行
`delete data.splits[Z]`（`identity_registry.mjs:344`），那份还没重读的 `X [Z]` 副本从此永远停在 X：

```
stale replica of slot Z after merge(W,Z): X (expected W: the record is Z, now merged into W)
```

ADR"再次合并会清除该拆分记录"只考虑了与**原来那人**再合并。**修法：** 只在 `merge` 的另一方就是拆分时的正式编号（`splits[Z] === canonical`）时才清除；
否则保留拆分记录，`canonicalize` 恢复到 `resolveIn(Z)`（这一步现有代码已经会做）。

### L3 — [Low] 从存档重新学会合并时，绕过了 `merge()` 的全部把关 — VERIFIED

`observe` 读到 `formerInvIds` 就写别名（`:269-274`），不看 `distinct`。`repro_identity.mjs D`：设备 B 上玩家已标记 X、Z"不是同一人"，
导入设备 A 合并过的存档后：`resolve(Z)==X: true`，B 上 Z 的存档被改写为 X。同一路径也不检查 `'together'`（同队者），
而 `merge()` 对同队者是拒绝的。任何带 `formerInvIds` 的导入文件都能在不经确认的情况下把本机的人并掉。
**修法：** 与 N1 一起处理：重新学会时，遇到本机 `distinct` 中的 `'together'` 一律跳过；遇到 `'user'` 按时间先后决定，或者改为放进面板的建议里，由玩家确认。

### L4 — [Low] 测试缺口（变异存活） — VERIFIED

31 处改动，抓到 20 处。存活的：

| # | 改坏的地方 | 若真发生 |
|---|---|---|
| **N09** | `observe` 重新学会时不看 `splits[f]` | **同一台设备**上，拆分后大厅扫描读到没写回的另一个副本，拆分立即被撤销。代码现在是对的，但没有测试守着 |
| **D13** | `_restoreFromData` 读档时不恢复 `darkRolls` | 读档后账本为空，骰子面板以外的旧叙述数值原样给游客。测试只覆盖了 `migrateSaveData`，没有覆盖读档 |
| N03 | 拆分时取第一个被拆分的编号 | 结果相同，只是要两次读入才收敛（可接受） |
| N10 | 重新学会时不做环检查 | `resolveIn` 有环保护，影响有限 |
| D03 | 推动只在骰子面板里找原检定 | 原检定被 30 条挤出后推动变公开（不现实，见 L1） |
| D05 | 账本上限改为 30 | 测试只做了 2 次暗骰，上限从未被触到 |
| D15 | 新游戏不清空账本 | 上一局的暗骰继续造成误替换（N2） |
| D16 | 读档失败回滚时不恢复账本 | 同上 |
| D17 | 导入时不带来源 | 面板证据显示"未知来源" |
| D18 | 扫描时不清旧来源（持久层调用） | 第 13 节只直接调了登记，没经过 `scanIdentities` |

**修法：** 至少补 N09（同设备：拆分后观察一份合并期间的副本，再读拆分后的存档，编号不变）与 D13（经 `_restoreFromData` 读档后，骰子面板以外的旧叙述仍会替换）。

### L5 — [Low] 工具回滚快照不含 `darkRolls` — PLAUSIBLE（代码追踪）

`ai/tool_snapshot.mjs` 文件头写"快照必须覆盖处理函数抛错前可能写入的全部状态"，`roll_dice` 经 `rollCustomDice → recordRoll` 会写 `darkRolls`，
快照里却没有这个字段。处理函数在掷骰后抛错时，骰子面板被回滚，账本里却留下一次"没发生"的暗骰。后果只是多出一个误替换的数值（N2），不泄露。
**修法：** 把 `darkRolls` 加进快照与恢复；如果 N2 改为按消息记录，就不再需要这个字段。

### Info

- **大厅扫描性能可以接受**（`bench_scan.mjs`）：登记 60 KB，32 个副本扫描 58 ms。`forgetSources` 先把来源清掉，所以每次扫描都会触发约 33 次登记写入，
  "只在有变化时才写"在扫描时实际不起作用；量级不大。
- `splits` 只增不减；`导入文件 …`、`未知来源` 这类来源永远不会被 `forgetSources` 清掉，只见于导入文件的人会一直留在建议里。
- 叙述替换覆盖不到的写法（"得到 87""是 87"、中文数字）已写进 dev log 的 remaining，属于第二道防线的已知边界。
- 关于环：`X[Y]`、`Y[Z]`、`Z[X]` 三份存档依次读入，只学到 `Y→X`、`Z→Y`，不形成环（`repro_identity.mjs E`）。

---

## ADR 对照

### 代码没有做到 ADR / registry 要求的

| 位置 | 要求 | 实际 | 见 |
|---|---|---|---|
| ADR §1.1"决定随存档走" | 登记丢失时已写回的存档编号不变 | 已写回的**拆分**存档会被改回合并后的编号并写回 | N1 |
| registry `derived_or_reissued_identity` | 编号只因玩家确认的合并 / 拆分而改变 | 重新学会合并会撤销拆分（N1），或覆盖"不是同一人"的决定（L3），都不经确认 | N1、L3 |
| registry `identity_registry` 注释 | "loss is safe … only local splits are lost" | 拆分不只是丢失，已写回的拆分结果会被反转 | N1 |
| registry `dark_roll_numbers_in_guest_narration` | 游客视图永不含 AI 叙述的【骰子】段 | 段内第一个【…】之后的内容留在视图里 | N3 |
| ADR §3 推动 | 推动沿用原检定的 `vis` | 原检定公开或找不到时，改用推动参数；按名字搜索 | L1 |
| ADR §1.1"再次合并会清除该拆分记录" | （隐含：只影响与原来那人的再合并） | 并给第三人也会清除，还没重读的副本保持错误编号 | L2 |
| `tool_snapshot.mjs` 文件头 | 覆盖处理函数可能写入的全部状态 | 不含 `darkRolls` | L5 |

### 已经做到的（核对过）

- §1.1 拆分是正面记录，"找不到别名"不再当作拆分；合并链中拆哪一环都有效；存储满时以内存为准并告知面板；损坏时先备份；扫描时刷新证据。
- §3 `recordRoll` 是骰子条目的唯一写入点（`grep diceHistory.unshift` 只剩 `visibility.mjs:115`）；`darkRolls` 属于守秘人数据
  （变异 D07 被抓到）；随存档保存与恢复；对话检定行 `isLocalOnly` 不进存档（`persistence.mjs:575`），ADR 的说法属实。
- §8 迁移结果 `_idsChanged` 把合并、拆分都计入；空登记读已合并存档时为 0。
- Key Interfaces 已加入 `recordRoll`、`previousRollVisibility`，`ensureInvIds(roster, { donors })` 已更正。

### ADR / registry 应根据代码改写的

| 位置 | 建议 |
|---|---|
| ADR §3"同一视图里公开掷骰恰好与暗骰同数值时……" | 修 N2 之前必须写明实情：账本覆盖整个战役，误替换会随时长扩大，并影响暗骰之前的叙述 |
| ADR §3"到下一个任意【…】段标题为止" | 修 N3 时改为"到下一个已知段标题为止（与 `output_protocol` 共用清单）" |
| ADR §1.1 括号"拆分记录不随存档走" | 修 N1 之后删掉；修之前必须写明后果：已写回的拆分结果在登记丢失后会被反转并写回 |
| registry `state_ownership` | 缺 `darkRolls` 一条：唯一写入者 `recordRoll`，随存档保存，属守秘人数据（`state_contract.mjs` 已经写了） |
| `identity_registry.mjs:53-54` 代码注释 | 与 ADR 对齐："只覆盖 `canonicalize` 传入的 12 个顶层字段之下" |

---

## Code Review（skill 格式）

### Engine Specialist Findings: N/A — NOT ASSESSED（自研引擎）

### Testability: GAPS
登记仍然可以注入存储与时钟，新测试也走了真实写入函数（`executeSkillCheck`、`rollCustomDice`、`migrateSaveData`）。缺口见 L4，其中 N09、D13 两处会掩盖真实缺陷。

### ADR Compliance: DRIFT
N1、N3 是 ADR / registry DRIFT（违反明文不变量）；L1、L2、L3 为 MINOR DEVIATION。没有使用 ADR 否决的方案。

### Standards Compliance: 5/6
- 文档注释：通过（新函数都有）。
- 复杂度：**轻微不通过**。`canonicalize` 新的拆分分支（`:216-221`）用两个 `continue` 区分"恢复后编号不变"与"恢复后换号"，读起来费力；`narrationForGuest` 每次调用都为每次掷骰新建 5 个正则（N2 的性能来源）。
- 依赖注入、接口、配置外置：通过 / 可接受。

### Architecture: MINOR ISSUES
依赖方向不变，没有循环。结构上的问题是决定的存放位置不对称（N1、L3 的根因）：一部分在存档里，一部分只在本机。
另外，暗骰与叙述的关系没有在写入时记录（N2 的根因）。

### SOLID: COMPLIANT

### Game-Specific Concerns
- 第 5 步按成员投影时，N2 的 0.6 秒 / 次会直接变成卡顿，要先修。
- 大厅扫描性能可以接受（见 Info）。

### Positive Observations
- F1 的根因判断准确：不再把"找不到别名"当作拆分证据；合并决定随存档带走也是正确的方向，只是没有延伸到拆分。
- `recordRoll` 把骰子条目收成唯一写入点，并且用 grep 验证得了，这是对 F3"依赖面板"的结构性修复，不是把上限调大。
- 推动失败的提示从赋值改为追加，还在测试里断言了提示仍在，正对 F2 的第二个原因。
- 存储失败的处理（`unsaved` 标志、`saved` 返回值、损坏时先备份）简单，可测，都有测试。

### Required Changes
1. N1：拆分 / "不是同一人"与合并一样随存档带走，并按时间先后决出；补两进程测试。
2. N3：【骰子】段的结尾改用与 `output_protocol` 共用的段标题清单；补测试。
3. N2（第 5 步前）：替换范围限定到描述该暗骰的消息（消息带 `darkRollIds`）；补"无关公开数字与暗骰之前的叙述原样保留"的测试。

### Suggestions
L1–L5；补 L4 中 N09、D13 两条测试；ADR / registry 按上表改写。

### Verdict: CHANGES REQUIRED

---

*复现与变异脚本在评审会话的 scratchpad 中（`repro_identity.mjs`、`dev1.mjs` / `dev2.mjs`、`repro_c.mjs`、`repro_dark.mjs`、`repro_reload.mjs`、`bench_scan.mjs`、`mutate.mjs`），未提交。
每处变异跑完立即还原，结束时 `git status` 干净；Playwright 重写的两张证据截图已还原。工作树只多出本报告。*
