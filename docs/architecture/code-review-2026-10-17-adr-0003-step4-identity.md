# Code Review — 调查员身份登记与 ADR-0003 迁移计划第 4 步（commits 9333115、3cc5b33）

Date: 2026-10-17
Commits: `9333115` fix: issue investigator ids once and persist them on load；`3cc5b33` feat: investigator identity registry and dark-roll writers
Scope: `git diff 0377ca6..3cc5b33 -- src`（28 个文件中的 `src/` 部分）
Reviewer: 独立评审（未参与这两个提交的编写）
Engine: Custom-Web（自研浏览器引擎：原生 ES 模块 + Vue）
ADRs: ADR-0003（Proposed，主依据，重点 §1、§1.1、§3、§8）；ADR-0001、ADR-0002 只在接口处对照
Registry: `docs/registry/architecture.yaml`
Prior report: `code-review-2026-10-17-adr-0003-steps1-3.md`（CHANGES REQUIRED，F1–F9）

Reviewed-Content-Hash: docs/architecture/adr-0003-per-player-visibility-and-save-v9.md 95996764c7b4033a4de8031903bd3aa9f567b516
Reviewed-Content-Hash: docs/registry/architecture.yaml 3176f723ada34f45fb63c34ad9c68b3ef9ff6958
Reviewed-Content-Hash: src/js/state/identity_registry.mjs 50faf6eeb18b161eb0d084e0c180cc6d2bced592
Reviewed-Content-Hash: src/js/state/visibility.mjs 729b016b21ca889612063a832f9c41c56c8378b9
Reviewed-Content-Hash: src/tests/identity_registry_smoke.mjs 201e273bdae944599d05496ff5c64d9038c6891a
Reviewed-Content-Hash: src/tests/visibility_leak_smoke.mjs a98435bd693d19ab8e6f96b1a5e088a42635f1ed
Reviewed-Content-Hash: src/tests/playwright/identity_merge.spec.mjs 225d2e06c9537e98d944b092b29a88eb413a9fc3

## 结论

**Verdict: CHANGES REQUIRED**

上一轮的两条必修项都修好了：旧档读入后编号写回被读的副本，再读同号；账本快照与 roster 同一人同号；泄露测试改为每条断言只靠一条规则成立，
第 4 步的三个掷骰处也走的是真实写入函数。我对第 4 步的写入与投影做了 23 处故意改坏，泄露测试抓到 20 处。`ci:smoke` 与 Playwright 全部通过。

但新加的身份登记与暗骰各有一处必须修：

1. **合并在登记丢失时会被悄悄撤销，并写回存档**（ADR-0003 §1.1 明确说不会）。在另一台设备、清除浏览器数据之后或导入别处的存档时，
   已合并并写回的存档在下次读入时退回合并前的编号，引用一并改写，然后被写回。已用真实 fixture 端到端复现（F1）。
2. **推动一次暗骰，推动的结果对所有游客公开**：`push_skill_check` 没有 `hidden` 参数，`executeSkillCheck` 只看推动工具自己的参数（F2）。
3. **暗骰数值的第二道防线有窗口限制**：替换依据的是最多 30 条的骰子历史，这次暗骰被挤出骰子历史之后，200 条对话窗口里旧叙述中的数值会原样给游客；
   分页同理（F3）。registry 新增的禁止模式 `dark_roll_numbers_in_guest_narration` 写的是"游客视图永远不含"，目前做不到。

其余是低级问题、测试缺口与 ADR / registry 需要同步修改的地方。

## 检查了什么

| 项 | 结果 |
|---|---|
| `git diff 0377ca6..3cc5b33 -- src` 全部文件 | 已读；`identity_registry.mjs`、`visibility.mjs`、`persistence.mjs` 相关段、`ai_logic.mjs` `executeSkillCheck`、`dice.mjs`、`lobby_view.mjs` 逐行读 |
| `cd src && npm ci && npm run ci:smoke` | **通过**（exit 0；`visibility_leak_smoke: OK`、`identity_registry_smoke: OK`；Node v22.22.0） |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test` | **17/17 通过**（33.7 s）。测试会重写 `production/qa/evidence/identity-merge-*.png`，已还原，未提交 |
| 真实旧档 `src/tests/fixtures/r29_17_save.json`、`r29_19_save.json` | 两份都是第 8 版、有 `savedAt`、无编号、无账本快照。经 `migrateSaveData`：同一次写入的两个副本同号、复制到另一个模组也同号、另一次写入的同名者不同号；合并后写回正确；**换一个空登记再读，合并被撤销**（F1） |
| 登记的存储失败 / 损坏 / 无存储 | 用注入的 storage 复现：配额满、JSON 损坏、无 `localStorage` 三种（F4） |
| 合并链与拆分 | 复现（F5） |
| 暗骰数值进游客视图的路径 | 逐条追了骰子历史、日志、对话检定行、工具结果、AI 叙述、`lastSkillCheck`、分页；脚本复现 F3、F6 |
| 变异测试（每次只改一处，跑 `visibility_leak_smoke`、`identity_registry_smoke`、`save_legacy_upgrade_smoke`，立即还原） | 第 4 步 23 处抓到 20 处；登记 20 处抓到 12 处，其中 1 处是等价变异；另对 Playwright 做 2 组，均存活。见 F7 |
| 对照 ADR-0003 §1、§1.1、§2、§3、§8、Key Interfaces、Implementation Guidelines 与 registry | 见"ADR 对照" |

Engine validation: NOT ASSESSED — 自研引擎，框架引擎专家检查不适用。
Testability（qa-tester）：N/A — 没有提供 story 文件；可测性改为用上面的变异测试直接检验。

---

## Findings

### F1 — [Medium，必须修] 登记丢失时合并被撤销并写回 — VERIFIED

**位置：** `src/js/state/identity_registry.mjs:201-205`（`canonicalize` 的拆分判断）。

```js
if (target === rec.invId && former.length) {
    const last = former[former.length - 1];
    const back = resolveIn(data, last);
    if (back !== rec.invId) { target = back; reverted = true; }
}
```

"拆分"是靠"登记里找不到 `last → 当前编号` 的别名"推断出来的。可是登记为空时也找不到，于是任何带 `formerInvIds` 的记录都会被"恢复"。

**复现（scratchpad 脚本，经 `CoCStatePersistence.migrateSaveData`，用真实 fixture `r29_17_save.json`）：** 第一个进程读入两份不同写入的 Alice、合并、
重读得到写回内容；第二个进程（相当于刷新后的另一台设备，或清除了 `coc_identity_registry`）读同一份写回内容：

```
merged & written back: true [ 'inv_956eee7b68714d50' ]
fresh registry: merged id inv_81e5105d → inv_956eee7b ; reverted to pre-merge id: true ; _idsChanged = 1
```

`_idsChanged = 1` 意味着 `loadGame` 会把撤销后的结果写回存档（`persistence.mjs:1254-1259`），`exploredBy`、`vis.to` 也一并改回。
同一路径还会在以下情况触发：导出的已合并存档在另一台设备导入（`importGame` 同样经过 `canonicalize`）；登记 JSON 损坏被覆盖（F4）；
浏览器不给 `localStorage`（登记只在内存里，每次刷新都是空登记）。

**影响：** 与 ADR §1.1 最后一条"登记丢失……不影响已写回的存档"直接矛盾；编号在玩家没有任何操作的情况下改变，违反 §1"永不改变"。
第 5 步的座位表以 `invId` 为键，换设备主持时玩家会掉座。

**修法建议：** 拆分要留下正面证据，不能靠"找不到别名"推断。例如 `split(id)` 写入 `data.splits[id] = 原正式编号`（或给记录写 `splitFrom`），
`canonicalize` 只在登记里**有**这条拆分记录时才恢复；登记里既无别名也无拆分记录时保持现状。补一条测试：空登记读已合并存档，编号不变、`_idsChanged` 为 0。

### F2 — [Medium，必须修] 推动暗骰后，推动结果对所有游客公开 — VERIFIED（代码追踪）

**位置：** `src/js/tools/definitions.mjs:66-77`（`push_skill_check` 无 `hidden` / `visible_to`），`src/js/ai_logic.mjs:680-682`、`706-710`。

- `executeSkillCheck` 从**本次**工具调用的参数读 `hidden`。推动走的是 `push_skill_check`，它的参数里没有 `hidden`，`rollVisibility` 返回 `undefined`，
  推动的骰子条目、对话检定行（"骰出 N/M"）、日志检定条目都按公开写入。原检定是暗骰时，推动等于把结果公开。
- 即使 AI 在推动调用里自行带上 `hidden: true`（`toolArgs` 读的是原始参数），推动失败分支用 `toolResultSuffix = …` **赋值**，覆盖了前面附上的
  `DARK_ROLL_AI_NOTE`，AI 就收不到"不要复述数值"的提示。

**修法建议：** 推动沿用被推动那次检定的可见范围（例如从 `lastSkillCheck` 或原检定的骰子条目取 `vis`），不靠 AI 再说一次；
推动失败分支改为 `toolResultSuffix +=`。补一条测试：暗骰失败后推动，游客视图里推动也是占位。ADR §3 也要写上推动的规则。

### F3 — [Medium，必须修] 暗骰数值在旧叙述里会重新出现 — VERIFIED

**位置：** `src/js/state/visibility.mjs:126-130`（`hiddenRollsFor` 只看 `gs.diceHistory`），`gameplay.mjs:337`、`ai_logic.mjs:702`（骰子历史上限 30 条）。

`narrationForGuest` 只替换"该观看者看不到的掷骰"的数值，而这份清单来自骰子历史。骰子历史只保留最近 30 条，对话窗口是 200 条，还能往前分页。
暗骰被后来的 30 次掷骰挤出之后，AI 当时写进叙述正文里的数值就不再替换：

```
fresh       : 【叙事】安看着他，骰出 （暗骰），心里有数（（暗骰））。
after 30    : 【叙事】安看着他，骰出 87，心里有数（87/60）。
```

另外，即使在窗口内，替换也只认 `N/M` 与"骰出 / 掷出 / 骰值 / 点数 / 结果 + N"。"心理学 87，""掷了 87 点""目标 60"都原样保留（脚本已验证）。
第一道防线（`DARK_ROLL_AI_NOTE` 提示）仍在，所以只在 AI 违规时泄露；但 registry 的 `dark_roll_numbers_in_guest_narration` 与 ADR §3 写的是"游客视图不含"。

**修法建议（选一，属设计决定）：** (a) 让暗骰清单不受骰子历史上限影响——例如在 AI 叙述写入时把当回合暗骰的 `rollId` 记到该消息上（`darkRollIds`），
投影按消息自己的清单替换；或单独保留一份不截断的暗骰数值索引（只存 `rollId`、`total`、`target`）。
(b) 承认这是尽力而为的第二道防线，把 registry 与 ADR 的措辞改为"提示为主、替换为辅"，并写明已知漏网形式。
无论选哪条，都给分页加一条断言（见 F7 的 V14）。

### F4 — [Low] 登记存储失败时的行为 — VERIFIED

**位置：** `identity_registry.mjs:106-126`（`read` / `write`）。

- **配额满时**（这恰好是存档改写 IndexedDB 的时候）：`write` 失败只更新内存，但 `read` 优先读 `localStorage` 里的旧内容，内存被忽略。
  结果是同一次写入的两个副本拿到不同编号——登记要解决的正是这个问题。复现：`E quota full: two replicas of one write same id? false`。
- 同一情况下 `merge` 不检查 `write` 的返回值，返回 `ok: true`，界面提示"已合并。"，刷新面板后建议还在、合并列表为空。
- 登记 JSON 损坏时 `read` 退回空登记，下一次 `write` 把损坏内容整个覆盖；别名就此丢失，再接 F1 撤销所有合并。
- 浏览器不给 `localStorage` 时登记只在内存，每次刷新都是空的（复现 `F no storage, after reload same id? false`）。ADR 只说了"登记丢失"，没说这一种。

**修法建议：** `read` 在写失败之后优先用内存；`merge` / `split` / `markDistinct` 把写入失败返回给界面并提示；损坏的登记先备份到另一个键再重建。

### F5 — [Low] 合并链上的拆分对部分存档无效 — VERIFIED

先合并 Z→Y，读入一次 Z 的存档（记录变为 Y，`formerInvIds [Z]`），再合并 Y→X，再读一次（变为 X，`[Z, Y]`）。
面板列出"Z 已合并到 X"与"Y 已合并到 X"两行。玩家点 Z 那行"拆分"：

```
B after split(Z): saveZ id is X (split ignored)
B suggestions after split [ [ 'X', 'Z' ] ]
```

`canonicalize` 只看 `formerInvIds` 的最后一项（Y，仍是 X 的别名），所以不恢复；而 `split` 只把 `Z|Y` 记为不同，`X|Z` 又出现在建议里。
同样的合并，如果存档是在两次合并都完成之后才第一次读入（`formerInvIds [Z]`），拆分就有效——结果取决于读档时机。
修法：拆分时沿 `formerInvIds` 从后往前找第一个已被拆分的编号；`split` 把被拆者与整条链的正式编号记为不同。

### F6 — [Low] 叙述去【骰子】段的正则只认四个主标签 — VERIFIED

**位置：** `visibility.mjs:102`。开头认 `【骰子】|【判定】|[骰子]`，结尾只认 `【叙事|旁白|交互|行动】`；而 `ai/output_protocol.mjs:7-11` 还接受
`【故事】`、`【描述】`、`【线索】` 作为别名。AI 写"【判定】…【故事】…"时整段叙述被删光，游客看到空消息（失败时关闭，不泄露）：
`"【判定】心理学 87/60 失败\n【故事】安皱起眉。" → ""`。
另外替换是按数值做的：暗骰掷出 3 时，同窗口内公开掷骰的"骰出 3"也被换成"（暗骰）"，游客会误以为那次公开检定是暗骰。
修法：结尾前瞻与 `output_protocol.mjs` 共用同一份标签表；替换只作用于暗骰之后的那条叙述（与 F3 的 (a) 一起解决）。

### F7 — [Low] 测试缺口（变异存活） — VERIFIED

第 4 步（23 处，抓到 20 处）：

| # | 改坏的地方 | 被抓到？ | 若真发生 |
|---|---|---|---|
| V1–V13、V15–V18、V20、V22、V23 | 骰子 / 日志 / 对话行不带 `vis`、`rollId`；不附提示；不去【骰子】段；不替换；`rollVisibility` 解析失败或 `hidden` 被忽略；占位不带技能名；等 | 是 | — |
| V14 | `projectHistoryPage` 不传暗骰清单 | **否** | 往前翻页时暗骰数值原样给游客 |
| V19 | 骰子占位附带 `target`、`level` | **否** | 暗骰成败等级泄露（测试只断言 `total` 为空） |
| V21 | `executeSkillCheck` 忽略 `visible_to` | **否** | 指定调查员看不到自己的暗骰（失败时关闭） |

身份登记（20 处，抓到 12 处）：

| # | 改坏的地方 | 被抓到？ | 若真发生 |
|---|---|---|---|
| R1–R8、R10、R17–R19 | 同队检查、`vis` / `exploredBy` 改写、拆分恢复、同队禁止合并、记录同队、副本查表、`savedAt` 入键、迁移计数、建议跳过别名、写回、拆分记为不同 | 是 | — |
| R9 | 副本键去掉"同文序号" | **否** | 同一队里两份完全相同的记录（例如两张默认预设卡）在两个副本间互换编号 |
| R11 + R12 + R20（同时去掉） | 合并 / 拆分 / 存档时不改写当前打开的游戏 | **否**（含 Playwright） | ADR"当前打开的游戏立即改写"无测试 |
| R13 | 拆分恢复取第一个旧编号而不是最后一个 | **否** | 见 F5 |
| R14 | 账本快照的旧编号也加入改写表 | 否 | 可视为等价（更宽的改写），不算缺口 |
| R15 | 没有 `savedAt` 也作键 | **否** | 不同写入的同内容记录被自动视为同一人，违反 `guessed_identity_merge` |
| R16 | 改写时也遍历 `formerInvIds` | 否 | 等价变异：`formerInvIds` 是字符串数组，遍历不改任何值 |
| P1（Playwright） | `scanIdentities` 不读其他模组 | **否** | 测试两份存档都在默认模组，ADR §1.1"读遍所有模组"没有验证 |

Playwright `identity_merge.spec.mjs` 确实走了真实界面（扫描、确认、合并、读档、写回、刷新后再读），这部分属实；缺的是跨模组、打开中的游戏、拆分。

**修法：** 补分页内的暗骰叙述、占位不含 `level` / `target` 的断言（或白名单化占位字段）、技能检定 `visible_to`、相同记录两份的副本、
无 `savedAt`、合并时有打开的游戏、合并链拆分（F5）、空登记读已合并存档（F1）、第二个模组里的同名者。

### F8 — [Low] 面板与证据的小问题 — VERIFIED

- `lobby_view.mjs:845-852`：`markIdentitiesDistinct`、`splitIdentity` 不看返回值，拆分失败也提示"已拆分"。
- `persistence.mjs:1532`：`importGame` 第二次规整（`_restoreFromData(save, save.slotName)`）不带来源，登记里给这个人多记一条"未知来源"，面板上会显示出来。
- 登记的 `people` 与 `sources` 只增不减：删除或覆盖存档之后，旧调查员仍在建议里，"见于 槽位 1"指向已经不含此人的槽位。
  合并到这样的"幽灵"编号无害（只是换了一个编号），但证据会误导玩家。可在 `scanIdentities` 时只保留本次扫描实际见到的来源。

### F9 — [Info] 其他观察

- **写回的不只是编号。** `_persistIssuedIds` 写回的是完整的迁移结果：对话按 `trimForSave` 压缩、`londonKpState` 删除、`masks_london` 存档的
  `campaignArchive` 清空等都随之落盘。这些规整在玩家下次存档时本来也会发生，所以不算新增的数据丢失；但 ADR §1 写的是"只多出编号与第 9 版规整，其余原样"，不准确。
- **多标签页。** 登记是整块读改写。两个标签页同时第一次打开大厅时，可能各自为同一份旧档发号，后写者覆盖前者；之后一个副本被写回 A、
  另一个旧副本查表得 B。窗口很小，应用支持跨标签页同步存档，记录在案即可。
- `hash53` 只作副本键，不作编号，53 位碰撞概率可忽略；碰撞的后果是两条不同记录共用一个编号，属"猜测合并"，但实际不会发生。
- `remapInvIds` 遍历 `canonicalize` 里列出的 12 个顶层字段，并且只认 `invId`、`exploredBy`、`vis.to` 三种键名。以后新增的带编号字段只有落在这
  12 个字段之下、并且用这三种键名时才会自动覆盖（例如 `inventory[].ownerInvId` 就不会）。代码注释与 ADR 的"以后新增的带编号字段自动覆盖"说得太宽。
- 公开检定的骰子条目现在多带 `target`（`DICE_FIELDS`）。他人的技能值原本就从公开检定行"骰出 37/50"可见，不是新增泄露。

---

## ADR 对照

### 代码没有做到 ADR 要求的，或做法不同

| ADR 位置 | 要求 | 代码 | 见 |
|---|---|---|---|
| §1、§1.1 末条 | 编号永不改变；登记丢失不影响已写回的存档 | 登记丢失 / 换设备 / 导入时撤销合并并写回 | F1 |
| §1.1 | 可以拆分，按 `formerInvIds` 恢复 | 合并链上的拆分对部分存档无效 | F5 |
| §1.1 | 存档内全部引用按字段名遍历，新增字段自动覆盖 | 只在 12 个顶层字段下、三种键名 | F9 |
| §1.1 | 每份存档在被读入之前已登记 | 登记写入失败时不成立 | F4 |
| §3 | 掷骰处一次决定，带到所有派生记录 | 推动检定不继承原检定的可见范围 | F2 |
| §3 F8 第 2 条 | 游客视图里暗骰数值替换为"（暗骰）" | 骰子历史 30 条以外不替换；多种写法漏网 | F3 |
| registry `dark_roll_numbers_in_guest_narration` | 游客视图永不含暗骰数值 | 同上 | F3 |

### 已经做到的（核对过）

- §1 发一次、写回被读的副本、另一个副本与损坏原文不动：`_persistIssuedIds` 只写 `candidate.source` 那一份，写失败只发系统提示，不影响读档。
- §1 账本快照按唯一名字配对一次：`ensureInvIds(…, { donors })`，重名或找不到时发新号；`restoreCarrySnapshot` 同样以当前 roster 为配对来源。
- §1.1 同一次写入的副本自动同号（真实 fixture 验证）；不同写入的同名者不自动合并；同队者既不建议也不允许合并；合并时会造成同队重号的不改写。
- §3 三个掷骰处共用一个 `rollId` 与 `vis`；`resolveInvId` 失败取 `{ to: 'keeper' }`；工具结果不进游客视图；日志与对话占位带技能名（上轮 F4 已解决）。
- §8 迁移结果带不可枚举的 `_idsChanged`，发号、合并、拆分都计入；第 9 版存档再读不发号、不写回（`save_legacy_upgrade_smoke` 有断言）。
- 上轮 F3（`createMap`）、F7（日志缺省类型）、F9（`projectChat` 从尾部取够即停）都已修。

### ADR 应根据代码改写的

| ADR 位置 | 代码实际 | 建议 |
|---|---|---|
| §1.1 末条 | 登记丢失会撤销合并（F1） | 修 F1 之后这条才成立；修之前必须改写成实情 |
| §1.1 | 浏览器不给 `localStorage` 时登记只在内存 | 写明这种情况等同于每次刷新都丢失登记 |
| §1 "只多出编号与第 9 版规整，其余原样" | 写回完整迁移结果 | 改为"写回该副本的规整结果（与下次存档内容相同），`savedAt` 不变" |
| §2 / Implementation Guidelines "`isLocalOnly` 的记录 must never 进入游客视图" | 对话检定行带 `isLocalOnly: true`，按 §3 放行 | 写明 `kind: 'roll'` 是唯一例外；它的 `isLocalOnly` 只表示"不发给 AI" |
| §3 掷骰处清单 | 没有提推动检定 | 加上：推动继承原检定的 `vis`（F2） |
| §3 F8 第 2 条 | 只替换 `N/M` 与"骰出 N"等，按 30 条骰子历史 | 按 F3 选定的方案改写措辞 |
| §3 "掷骰函数接受 `vis` 参数" | 接受 `{ hidden, visibleTo }`，由 `rollVisibility` 算出 `vis` | 措辞对齐 |
| §8 第一条 | 写的是 `ensureInvIds(roster)` | 改为 `identityRegistry.issue`（内部调用 `ensureInvIds`）+ `canonicalize` + `observe` |
| Key Interfaces | `ensureInvIds(roster)` | 实际是 `ensureInvIds(roster, { donors })`，返回发号数 |
| §1.1 | `observe` 在每次规整与每次存档时写登记；只读路径（大厅、诊断、存档对比）也会写 | 写明登记的写入时机，说明只读路径写登记是有意的 |

### Registry

- `investigator_identity.write_access: issued-once-then-persisted` — 没有提合并 / 拆分会经玩家确认改写编号并保留 `formerInvIds`。建议在 `interface` 里加上
  `formerInvIds`，在注释里写明唯一的改写者是 `identityRegistry.canonicalize`。
- 缺一条 state 条目：设备级身份登记 `localStorage['coc_identity_registry']`（唯一写入者 `identity_registry.mjs`，不进存档，丢失时的行为见 F1）。
- `derived_or_reissued_identity`："never issued again for a record that already had one"——合并与拆分会给已有编号的记录换号（经玩家确认，合理），
  F1 则是不经确认地换号。措辞应区分这两者。
- `dark_roll_numbers_in_guest_narration`：见 F3，要么代码兑现，要么措辞降为"尽力替换"。

---

## Code Review（skill 格式）

### Engine Specialist Findings: N/A — NOT ASSESSED（自研引擎，框架专家不适用）

### Testability: GAPS
登记用 `createIdentityRegistry({ storage, now })` 注入存储与时钟，便于测试（存储失败、损坏都能在 Node 里复现）。缺的是测试本身（F7）。

### ADR Compliance: DRIFT
ADR-0003：F1（违反 §1 / §1.1 的不变量）、F2、F3 为 ADR DRIFT；F5、F9 为 MINOR DEVIATION。没有使用 ADR 明确否决的方案：编号仍是随机值，
不按名字认人（名字只用于建议与一次性配对），不存占位，开发者视图仍从白名单构造。ADR-0001 / ADR-0002：本次不涉及联机；分页仍符合 ADR-0002 §2。

### Standards Compliance: 5/6
- 公开函数的文档注释：通过（`identity_registry.mjs` 每个方法都有）。
- 复杂度与长度：**不通过（轻微）**。`canonicalize` 约 45 行，嵌套四层，`executeSkillCheck` 原本就超长，本次又加了几行。建议把拆分恢复判断抽成函数，顺便修 F5。
- 依赖注入：通过（模块级单例 `identityRegistry` 只是默认实例，测试用工厂函数）。
- 配置外置：轻微（`SLOT_LABELS`、占位与提示文案写死；属界面文案与协议常量，可以接受）。
- 接口：通过。

### Architecture: MINOR ISSUES
依赖方向正确：`identity_registry` → `char_record`，`visibility` → `char_record`，`persistence` → 两者；没有循环依赖。
问题是**只读路径有写副作用**：`getModules`、`getSaveSlots`、`diagnoseSaves` 每次都经 `migrateSaveData` 写登记（每份存档、每个副本各写一次）。
这是 §1.1"读入之前已登记"有意为之，但应在 ADR 里写明（见上表），并留意 F4 的失败模式。

### SOLID: COMPLIANT
登记的发号、合并、证据三件事都在一个对象里，但都围绕"身份"这一个职责，暂不需要拆分。

### Game-Specific Concerns
- 大厅每渲染一次，每个模组 × 4 个槽位 × 2 个副本各做一次完整迁移，再整体序列化登记写回。存档多、对话长时大厅会变慢。可以只在发号或证据有变化时写登记
  （`observe` 现在无条件 `write`）。
- `hiddenRollsFor` 每次投影都对骰子历史过滤一遍，再对每条 assistant 消息逐个暗骰建正则；规模很小，不影响。

### Positive Observations
- 5why 根因写得清楚，修法（发一次、写回、此后只读）切中根因，而不是"每次都算出同一个编号"。
- 副本键用"`savedAt` + 类别 + 全文 + 同文序号"，只在有证据时自动同号，编号本身仍随机。这个设计是对的，真实 fixture 上验证通过。
- "同队者永不合并"同时在 `observe`、`merge`、`canonicalize` 三处把关，任何一处被改坏测试都能抓到（R1、R5、R6）。
- 泄露测试的第 4 步部分走的是真实的 `roll_dice` 处理函数与 `executeSkillCheck`，固定随机数后搜索具体数值，并断言"替换只在视图里、权威状态保留原文"。
- `projectChat` 改为从尾部取够即停，`projectHistoryPage` 与 `projectFor` 共用同一个单条投影函数，上轮的重复逻辑没了。

### Required Changes
1. F1：拆分要有正面记录；登记为空时不撤销合并；补测试。
2. F2：推动检定继承原检定的可见范围；推动失败分支不覆盖暗骰提示；补测试。
3. F3：暗骰数值替换不能依赖 30 条的骰子历史（或者把 ADR 与 registry 的承诺降级）；补分页断言。

### Suggestions
F4–F8 的修补；F9 与"ADR 对照"、"Registry"所列的改写。

### Verdict: CHANGES REQUIRED

---

*变异脚本与复现脚本都在评审会话的 scratchpad 中，未提交。每处改动跑完立即还原；Playwright 重写的两张证据截图已还原；提交前工作树只多出本报告。*
