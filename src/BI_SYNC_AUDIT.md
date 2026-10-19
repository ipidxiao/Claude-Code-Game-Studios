# 🔄 AI-引擎双向同步审计报告

**审计日期**: 2026-08-02  
**审计范围**: `C:/Users/x1767/AppData/Local/Temp/coc_v18`  
**审计方法**: 全量静态代码审查，追踪每条引擎状态变更路径 → tool handler 返回值 → LLM 可见内容，以及每条 LLM 工具调用 → 引擎参数映射 → 实际效果  

---

## 审计总览

| 方向 | 发现数量 | P0 | P1 | P2 |
|------|---------|----|----|-----|
| 引擎→AI (引擎改了AI不知道) | 12 | 3 | 5 | 4 |
| AI→引擎 (AI描述与引擎不一致) | 10 | 2 | 5 | 3 |
| 双向死循环/沉没 | 5 | 1 | 2 | 2 |
| **合计** | **27** | **6** | **12** | **9** |

---

## I. 引擎→AI 方向 (引擎改了，AI不知道)

### 🔴 P0-1: `applySanLoss` 疯狂触发静默 — LLM完全不知道临时/不定疯狂

**文件**: `js/engines/sanity.mjs:9-39`, `js/tools/handlers/character.mjs:85-121`

`SanityEngine.applySanLoss()` 返回完整结果对象:
```js
{ newSan, loss, cause, tempInsanity: bool, indefInsanity: bool, bout: {...}, description: '...' }
```

但在 `character.mjs:93-102`，handler 只把 `sanityResult.description` 推入 `isLocalOnly:true` 消息。handler 的 return 值始终是 `resultMsg + " 绝对禁止反悔！"`，其中 `resultMsg` 不含任何 SAN 变更细节。

**实际效果**:
- LLM 调用 `update_character_status({san_change: -8})` 后，收到返回: `"玩家受到伤害。绝对禁止反悔！"`
- LLM **完全不知道**:
  - 是否触发了临时疯狂 (一次损失≥5 + INT检定失败)
  - 疯狂发作类型 (bout of madness 的具体症状)
  - 是否触发了不定疯狂 (日累积损失 ≥ POW/5)
  - 获得了什么恐惧症/狂躁症 (phobia/mania)
  - 实际 SAN 新值 (只能从下一次 teamDetails 注入中推断)

**严重性**: 疯狂是 CoC 核心机制。LLM 若不知道角色疯了，会在叙事中继续理性互动，严重破坏恐怖氛围。

### 🔴 P0-2: `applyDamage` 重伤/濒死信息完全不可见

**文件**: `js/engines/damage.mjs:19-68`, `js/tools/handlers/character.mjs:30-83`

引擎 `applyDamage()` 返回 `{ newHp, damageDealt, majorWound: {...}, dying: {...}, unconscious: bool }`。Handler 处理流程:

1. `dmgResult.majorWound` → 构建 `statusAlert` 详情 → push as `isLocalOnly:true` → LLM看不到
2. `dmgResult.dying` → 同上
3. `dmgResult.unconscious` → 同上
4. Handler return: `"玩家重伤，系统正强制其进行体质检定。"` (仅当有重伤时) 或 `"玩家受到伤害。"` (普通伤害)

**LLM 完全不知道**:
- 实际伤害数值（只在下一次 teamDetails 注入中看到新 HP）
- 重伤部位 (头/躯干/四肢等)
- 重伤后果 (昏迷、武器掉落、属性减半、内出血)
- 是否濒死 (dying check 结果)
- 是否已死亡 (isDead)

**唯一例外**: `forceCheck` 机制 (character.mjs:82) 在重伤但未死/昏迷时，会强制插入 `request_skill_check` 进行 CON 检定。这是唯一传递到 LLM 的机械信号，但 LLM 仍不知道为何被强制检定。

### 🔴 P0-3: `applyMajorWound` 副作用完全不可见

**文件**: `js/engines/wound.mjs:24-57`

重伤引擎修改了大量角色状态，全部对 LLM 不可见:
- `ch.status.hasMajorWound = true`
- `ch.status.isUnconscious = true` (CON检定失败时)
- `ch.equipment.weapon = null` (武器掉落)
- `ch.attrs.STR = Math.floor(ch.attrs.STR / 2)` (力量减半)
- `ch.attrs.DEX = Math.floor(ch.attrs.DEX / 2)` (敏捷减半)
- `ch.attrs.CON = Math.floor(ch.attrs.CON / 2)` (体质减半)
- `ch.attrs.APP = 0` (APP归零)
- `wound.bleeding = true` (内出血)
- `wound.prone = true` (倒地)

这些变更既不注入 system prompt，也不在工具返回值中反映。LLM 可能在下一次请求的 teamDetails 中看到装备槽变化，但属性减半完全不可见——LLM 会继续以原始属性值评估能力。

### 🟡 P1-1: `castSpell` sanCost 动态值 — LLM 完全盲猜

**文件**: `js/engines/mythos.mjs:85-126`, `js/tools/definitions.mjs:506-515`, `js/data/spells.mjs`

法术的 `sanCost` 是骰子表达式 (如 `"1D6"`, `"1D10/1D100"`) 在引擎中运行时解析。但 LLM 的 `cast_spell` 工具定义只接收 `spell_name` 字符串，不包含任何费用信息。LLM 的 system prompt 中也未注入任何法术数据。

**LLM 完全不知道**:
- 法术的 sanCost / powCost / mpCost
- 法术的 mythosRequired
- 已学会的法术列表 (无 `getKnownSpells` 工具)

LLM 在叙事中可能描述 "你消耗了 2 点 SAN"，但引擎实际扣除 `1D6` (=1~6) — 造成叙事与引擎状态不一致。

### 🟡 P1-2: `initialBrowse`/`fullStudy` 自动学会法术 — LLM 不知道新法术

**文件**: `js/engines/mythos.mjs:14-79`, `js/tools/handlers/mythos.mjs:22-57`

典籍完整研读时，引擎自动调用 `CoCStudyState.learnSpell(ch, spellName)` 学会法术。这些法术列表在 `result.spellsLearned` 中，但 handler 只把 `result.description` 作为返回值。学会的法术名称仅在 `addJournalEntry` 中记录（LLM 不可见）。

**后果**: 角色自动学会法术后，LLM 不知道角色现在能施放哪些法术。下次调用 `cast_spell` 可能失败（提示"尚未学会"），LLM 无法理解原因。

### 🟡 P1-3: `processPoisonTick` 持续伤害 — LLM 不知道毒素生效

**文件**: `js/engines/poison.mjs:15-33`

毒素每回合自动造成伤害（通过 `applyDamage`），但处理结果只在引擎内部。无对应工具返回值通知 LLM。如果毒素在 LLM 回合之间触发，LLM 完全不知道角色正在持续掉血。

### 🟡 P1-4: `applyTherapy` 精神分析结果 — LLM 不知道恐惧症治愈

**文件**: `js/engines/sanity.mjs:80-99`, `js/tools/handlers/system.mjs:76-89`

引擎 `applyTherapy` 在大成功时可以治愈恐惧症/狂躁症。Handler 返回对象但 `processTools` 中 `String(result)` 会变成 `"[object Object]"` — LLM 收到无意义字符串。

### 🟡 P1-5: 角色状态标志位 (isDying/isUnconscious/hasMajorWound) — 不注入 teamDetails

**文件**: `js/ai_logic.mjs:283-288`

`teamDetails` 注入只包含 `name/hp/san/equipment`。角色状态标志 (`status.isDying`, `status.isUnconscious`, `status.hasMajorWound`) 完全不注入。LLM 不知道角色是否昏迷、是否濒死、是否有重伤 — 只能从工具返回值中猜测。

### 🟢 P2-1: `checkMalfunction`/`checkImpale` 武器机制 — LLM 知道但不被通知

`autoResolveExchange` (combat.mjs:118-153) 内部调用 `checkMalfunction` 和 `checkImpale`。故障/贯穿效果通过 `result.msg` 传回。LLM 可以从 `fire_weapon` 返回值中看到，但没有独立通知。

### 🟢 P2-2: `spendLuck` 运气消耗 — 返回值已足够但无后续影响提示

Handler 返回 `result.message`（如 "消费了 5 点运气！（剩余 45）"），这是少有的返回完整信息的工具。但 LLM 不知道运气消耗后对技能检定的影响。

### 🟢 P2-3: `realityCheck` SAN 对抗 — LLM 看不到对抗结果

`realityCheck` (sanity.mjs:56-68) 在执行 SAN 检定后才能确定损失。但 LLM 不知道检定是否通过，只看到后续的 SAN 损失。

### 🟢 P2-4: KP 引擎 `onCombatStart` 敌人调整 — LLM 看到调整后结果但不透明

`start_combat` handler 调用 `kpEng.onCombatStart()` 可能修改敌人数据。LLM 看到修改后的敌人但不知道 KP 引擎做了什么调整。

---

## II. AI→引擎 方向 (AI描述状态后，引擎没更新)

### 🔴 P0-4: `apply_environmental_damage` 返回错误对象 (Copy-Paste Bug)

**文件**: `js/tools/handlers/system.mjs:19-42`

这是本次审计发现的**最严重代码缺陷**:

```javascript
// system.mjs:40-41 — 在 apply_environmental_damage 函数体内
return { recovered: totalRecovered, months, newSan: c.derived.sanity,
    desc: c.name + ' 在精神病院接受了 ' + months + ' 个月治疗，恢复 ' + totalRecovered + ' 点SAN。' };
```

这段代码属于 `apply_therapy` handler（第76-89行），因 copy-paste 错误被放到了 `apply_environmental_damage` 函数内。`totalRecovered` 和 `months` 在该作用域中为 `undefined`。

**实际效果**: LLM 调用 `apply_environmental_damage` 后，`processTools` 执行 `String(result)` → `"[object Object]"`。LLM 收到无意义字符串，无法知道环境伤害是否生效。虽然伤害通过 `ctx.dispatch` 已实际应用，但 LLM 无法确认。

### 🔴 P0-5: LLM 无治疗/急救工具 — 只能用 hp_change>0 绕过引擎

**文件**: `js/engines/healing.mjs:4-37`, `js/tools/handlers/character.mjs:24-29`

引擎 `HealingEngine.applyHealing` 有完整的技能检定逻辑（急救/医学检定 → 大成功2x/极难1.5x/失败0.5x/重伤移除），但**没有对应的 AI 工具**。

`update_character_status` handler 在 `hp_change > 0` 时 (character.mjs:25-28) 确实调用了 `applyHealing`，但这个逻辑只对 `hp_change > 0` 有效。LLM 不知道：
- 应该用 `hp_change` 正值来治疗（工具描述未说明）
- 应该传递什么参数来触发技能检定
- 治疗可以移除重伤状态 (healing.mjs:25-28 移除 `hasMajorWound`)

**后果**: LLM 可能描述"队友给你包扎"，但不调用任何工具 → 引擎不更新 → 叙事与状态脱节。

### 🟡 P1-6: `castSpell` sanCost LLM 猜测 vs 引擎真实值 — 叙事-机制鸿沟

LLM 叙事中可能说"消耗 3 点 SAN 施法"，但引擎实际解析 `spell.sanCost` 后扣除 `1D6` (=1~6)。若实际扣除 6 点，触发临时疯狂，而 LLM 叙事中只说消耗了 3 点 — **叙事与引擎完全矛盾**。

修复方向：在 system prompt 中注入法术费用表，或在 `cast_spell` 工具定义中要求 LLM 不描述具体费用。

### 🟡 P1-7: `update_character_status` handler 不返回任何状态变更详情

**文件**: `js/tools/handlers/character.mjs:19-123`

无论 LLM 传入什么参数 (`hp_change`, `san_change`)，handler 返回的都是极简字符串:
- 仅 HP 伤害: `"玩家受到伤害。绝对禁止反悔！"`
- 重伤: `"玩家重伤，系统正强制其进行体质检定。绝对禁止反悔！"`
- 死亡: `"玩家死亡。绝对禁止反悔！"`
- SAN 损失: `"玩家受到伤害。绝对禁止反悔！"` (同上)

LLM 不知道:
- 实际减少了多少 HP
- 新 HP 值
- 是否触发重伤/濒死/昏迷/死亡
- 是否触发疯狂

### 🟡 P1-8: `update_inventory` 返回 "完成" — LLM 不知物品是否添加成功

**文件**: `js/tools/handlers/inventory.mjs:21-71`

Handler 在处理物品添加时：
- KP 引擎校验失败 → 返回 "物品未添加（KP规则校验失败）"
- 成功 → 返回 "完成"

LLM 完全不知道:
- 哪些物品实际添加了（可能部分被 KP 拒绝）
- 是否触发了神话物品 SAN 检测
- 自定义武器属性是否注册成功

### 🟡 P1-9: `register_npc` 返回 "已记录 {name}" — LLM 不知 KP 引擎反应

**文件**: `js/tools/handlers/npc.mjs:21-29`

Handler 调用 KP 引擎的 `applySocialInfiltration`，可能触发社交渗透机制。LLM 不知道是否触发了渗透、NPC 是否被 KP 引擎标记。

### 🟡 P1-10: `castSpell` 永久 POW 扣除 — LLM 可能忽略

**文件**: `js/engines/mythos.mjs:102`

```js
if (ch.attrs && ch.attrs.POW) ch.attrs.POW = Math.max(1, ch.attrs.POW - spell.powCost);
```

POW 是永久扣除，影响后续所有 POW 检定、MP 上限和 SAN 最大值。LLM 只从描述文本中知道消耗了 POW，但可能不理解为永久修改。下次描述角色能力时仍可能用旧 POW 值。

### 🟢 P2-5: `bonus_penalty_roll` 返回值 — 对象而非字符串 → [object Object]

**文件**: `js/tools/handlers/system.mjs:50-65`

Handler 返回完整的 `result` 对象（含 `level`, `rolledValue`, `targetValue` 等）。`processTools` 中 `String(result)` → `"[object Object]"`。LLM 看不到检定详情。

修复: 应返回 `result.description` 字符串。

### 🟢 P2-6: `apply_poison` 返回值 — 对象而非字符串

Handler 返回 `r` (engine 返回对象 → `{applied, potency, desc}`)。`String(r)` → `"[object Object]"`。

### 🟢 P2-7: `recover_luck` 和 `apply_therapy` 返回值 — 对象而非字符串

这些 handler 返回结构化对象，但 `processTools` 强制 `String()` 转换。LLM 收到的是 `"[object Object]"`。

---

## III. 双向死循环/沉没状态

### 🔴 P0-6: Scenario Runner 与 AI KP 状态完全隔离 — 切换时双向盲区

**文件**: `js/ai_logic.mjs:121-128`, `js/scenario/runner.mjs`

当 `scenarioRunner.isActive()` 为 true 时，AI 完全被跳过。剧本的:
- `flags` (分支标记)
- `currentNodeId`
- `pendingBranch`

对 AI KP 完全不可见。切换到 AI KP 模式后，剧本状态丢失。

AI KP 模式下累积的:
- 角色状态变更 (HP/SAN/重伤/疯狂)
- 背包物品
- NPC 关系
- 线索

对 Scenario Runner 也完全不可见。用户若从 AI KP 切换回离线剧本，所有 AI 会话进度丢失。

### 🟡 P1-11: 工具禁用无 LLM 通知 — LLM 反复调用被禁工具进入死循环

当 KP 引擎禁用某工具或拒绝操作时（如 `validateItemAcquisition` 返回 `ok:false`），handler 返回错误字符串。但 LLM 不理解这是"永久禁用"还是"本次失败"，可能在下一次请求中重试同一工具。

### 🟡 P1-12: 重试循环中的状态变更 — LLM 不知道正在重试

**文件**: `js/ai_logic.mjs:316-320`

AI 请求重试通知被推入 `isLocalOnly:true` (LINE 318)。如果重试过程中之前的部分工具调用已经生效（快照回滚前的状态），LLM 完全不知道回滚发生了。

### 🟢 P2-8: `maxSan` 钳位 — LLM 不知道 SAN 恢复上限

`applySanityReward` 将 SAN 钳制在 `maxSan`。但如果 `maxSan` 未设置 (默认 99)，LLM 不知道角色 SAN 有上限。LLM 可能描述恢复超过上限的 SAN。

### 🟢 P2-9: 上下文压缩触发后 LLM 不知道自己"失忆"了

**文件**: `js/core/context_manager.mjs:163-195`

当 API 消息超过 48 条/60K 字符时，早期消息被丢弃。LLM 不知道上下文被裁剪了 — 可能引用已被丢弃的 NPC/线索/事件，导致叙事断裂。

---

## IV. 代码缺陷 (额外发现)

### 🔴 Bug: `system.mjs` `apply_environmental_damage` 返回 therapy 数据
**位置**: `js/tools/handlers/system.mjs:40-41`  
**原因**: Copy-paste 错误，`apply_therapy` 的返回语句被误放到 `apply_environmental_damage` 函数内  
**影响**: 环境伤害工具永远返回 `[object Object]`，LLM 确认不到伤害生效  
**修复**: 将第40-41行替换为正确的环境伤害结果返回

### 🟡 Bug: 多个 handler 返回对象而不是字符串
**位置**: `system.mjs:40,48,58,74,87` (recover_luck, apply_therapy, bonus_penalty_roll, apply_poison)  
**原因**: Handler 返回 JS 对象，但 `processTools` 执行 `String(result)` → `"[object Object]"`  
**影响**: LLM 收到无意义字符串  
**修复**: wrapper 中检测 object 返回值，提取 `.desc`/`.message`/`.description` 字段

### 🟡 Bug: `applyTherapy` handler 使用错误的 therapist 数据结构
**位置**: `js/tools/handlers/system.mjs:80`  
```js
const therapist = { name: '精神病院医师', derived: { psychoanalysis: 75 } };
```
引擎 `checkSkill('精神分析', therapist)` 通过 `getSkillValue` 查找技能值，路径可能是 `therapist.skills['精神分析']` 而非 `therapist.derived.psychoanalysis`。需验证 `getSkillValue` 的实现来确定此 bug 是否影响疗效。

---

## V. 修复优先级清单

| # | 优先级 | 问题 | 修复方向 | 位置 |
|---|--------|------|---------|------|
| 1 | 🔴 P0 | `apply_environmental_damage` 返回错误对象 | 修复 copy-paste bug | system.mjs:40-41 |
| 2 | 🔴 P0 | SAN 变更不通知 LLM 疯狂触发 | handler 返回 `sanityResult.description` | character.mjs:122 |
| 3 | 🔴 P0 | 伤害详情不通知 LLM 重伤/濒死 | handler 返回结构化摘要 | character.mjs:82,122 |
| 4 | 🔴 P0 | MajorWound 副作用 LLM 不可见 | 工具返回包含部位/后果 | character.mjs:73 |
| 5 | 🔴 P0 | 缺少 `getKnownSpells`/法术数据注入 | 新工具 + prompt 注入 | definitions.mjs |
| 6 | 🔴 P0 | 缺少治疗工具 `apply_healing` | 新工具定义 + handler | definitions.mjs + system.mjs |
| 7 | 🟡 P1 | `castSpell` sanCost LLM 盲猜 | prompt 注入法术费用表 | ai_prompt_config.mjs |
| 8 | 🟡 P1 | Handler 对象返回值 → `[object Object]` | wrapper 提取 `.desc` 字段 | ai_logic.mjs:558 |
| 9 | 🟡 P1 | `update_inventory` 返回 "完成" | 返回 `added.join('、')` | inventory.mjs:71 |
| 10 | 🟡 P1 | teamDetails 不注入角色状态标志 | 添加 status 到注入 | ai_logic.mjs:287 |
| 11 | 🟡 P1 | Scenario Runner ↔ AI KP 数据隔离 | 状态共享机制 | runner.mjs + ai_logic.mjs |
| 12 | 🟡 P1 | 毒素持续伤害无 LLM 通知 | handler 返回剩余 HP | system.mjs:43-48 |
| 13 | 🟡 P1 | 典籍研读自动学会法术不通知 LLM | tool 返回含 spellsLearned | mythos.mjs:57 |
| 14 | 🟡 P1 | KP 引擎拒绝通知细化 | 返回拒绝原因 | inventory.mjs:27, combat.mjs:179 |
| 15 | 🟢 P2 | 上下文压缩无 LLM 通知 | 压缩时追加提示到末尾 | context_manager.mjs |
| 16 | 🟢 P2 | 重试循环中状态回滚不透明 | handler 异常时返回回滚信息 | ai_logic.mjs:546-548 |
| 17 | 🟢 P2 | `applyTherapy` therapist 技能路径疑为错误 | 验证 `getSkillValue` 实现 | healing.mjs:13 |
| 18 | 🟢 P2 | `maxSan` 钳位 LLM 不知道 | prompt 中说明 SAN 上限 | ai_prompt_config.mjs |

---

## VI. 关键文件清单

| 文件 | 行号 | 审计要点 |
|------|------|---------|
| `js/engines/sanity.mjs` | 9-39 | `applySanLoss` 返回完整疯狂数据，handler 消费不足 |
| `js/engines/damage.mjs` | 19-68 | `applyDamage` 单点权威，重伤/濒死信息被 `isLocalOnly` 吞没 |
| `js/engines/wound.mjs` | 24-57 | `applyMajorWound` 6种副作用全部 LLM 不可见 |
| `js/engines/mythos.mjs` | 14-126 | sanCost/POW 动态扣除，LLM 完全盲猜 |
| `js/engines/healing.mjs` | 4-37 | 完整治疗引擎但无 AI 工具 |
| `js/tools/handlers/character.mjs` | 22-123 | **核心问题所在**: 伤害/SAN handler 返回值极简 |
| `js/tools/handlers/combat.mjs` | 257-308 | `fire_weapon` 弹药/伤害通知全在 `isLocalOnly` |
| `js/tools/handlers/inventory.mjs` | 21-71 | 返回 "完成"，物品详情在 `isLocalOnly` |
| `js/tools/handlers/npc.mjs` | 21-29 | 返回 "已记录XX"，社交渗透在 `isLocalOnly` |
| `js/tools/handlers/system.mjs` | 19-42 | **🔴 copy-paste bug**: 环境伤害返回 therapy 数据 |
| `js/tools/handlers/system.mjs` | 40,48,58,74,87 | 多个 handler 返回对象 → `[object Object]` |
| `js/tools/definitions.mjs` | 506-515 | `cast_spell` 工具定义不含 `sanCost` 信息 |
| `js/ai_logic.mjs` | 283-288 | `teamDetails` 注入仅含 name/hp/san/equipment |
| `js/ai_logic.mjs` | 558 | `String(result ?? '')` — 对象返回值被破坏 |
| `js/ai_logic.mjs` | 121-128 | Scenario Runner 跳过 AI KP |
| `js/data/ai_prompt_config.mjs` | 36-86 | SYSTEM_RULES_BLOCK 不含法术/治疗/疯狂信息 |
| `js/core/context_manager.mjs` | 163-195 | `isLocalOnly` 过滤 + 消息截断 |

---

## VII. 架构性建议

### 1. 建立"状态变更摘要通道"

当前架构中，isLocalOnly 承担了两个矛盾的角色: (1) UI 显示给用户 (2) 阻止发送给 LLM。建议分离:
- **UI 事件**: 推入 `chatHistory` 用于界面渲染
- **状态变更摘要**: 在每个 handler 的 return 中返回结构化摘要，包含: `{hpChange, sanChange, newHp, newSan, effects: [...]}`

### 2. `processTools` 返回对象自动转换

在 `ai_logic.mjs:558` 处，将 `String(result ?? '')` 改为智能转换:
```js
const stringResult = typeof result === 'object' && result !== null
    ? (result.desc || result.description || result.message || JSON.stringify(result))
    : String(result ?? '');
```

### 3. 系统提示静态注入法术/典籍数据

将 `CoCSpells` 和 `CoCMythosTomes` 的摘要注入到 system prompt，让 LLM 在调用前就知道费用和效果。

---

*审计工具: 手动代码审查 + grep 追踪 · CoC V18.2 · 发现 27 个同步问题，其中 6 个 P0*
