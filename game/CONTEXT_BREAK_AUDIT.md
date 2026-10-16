# 🔍 上下文断链审计: 系统提示/UI状态/场景数据/角色信息 → LLM

**审计日期**: 2026-08-02
**审计范围**: `C:/Users/x1767/AppData/Local/Temp/coc_v18`
**审计方法**: 全量静态代码审查，逐文件追踪数据从 state → prompt construction → LLM 的完整路径

---

## 1. 系统提示注入了什么？缺少什么？

### 1.1 当前系统提示注入路径

三层注入结构：

**Layer 1 — Hidden System Message (core.mjs:81-85)**
```
你是《克苏鲁的呼唤(CoC)7版》的无情守秘人(KP)。
【铁律1-叙事】：前台文本必须是完成度极高的恐怖小说正文...
【铁律2-机制】：拾取物品必须静默调用 [update_inventory]...
【铁律3-判定】：有风险动作必须调用 [request_skill_check]...
```
- **位置**: `gameState.chatHistory[0]`，`isHidden: true`
- **生命周期**: Context Manager 保护不被截断 (context_manager.mjs:32,69)

**Layer 2 — Per-turn Injection (ai_logic.mjs:282-305)**
每次 AI 请求时，追加到 **最后一条 user 消息的 content 尾部**：
```javascript
cleanMsg.content += CoCAIPromptConfig.buildSystemInjection(
    teamDetails, gameState.aiSettings.difficultyPreset, gameState
);
```
实际内容 (`ai_prompt_config.mjs:153-157`):
```
\n\n\n[【当前行动小队状态】：
\n\n{teamDetails}
{difficultyPreset injection}
{campaignBlock: KP rules + antagonist rules + campaign summary}
{immersiveProsePrompt}
{SYSTEM_RULES_BLOCK (15条铁律)}
```

**Layer 3 — Keyword Intercepts (ai_logic.mjs:303-304)**
```
matchKeywordIntercept(playerInput) → 追加拦截后缀
```

### 1.2 teamDetails 的内容 (ai_logic.mjs:283-288)

```javascript
activeRoster.map(c => {
    let e = c.equipment || {};
    let eStr = Object.entries(e).filter(([k,v]) => v)
        .map(([k,v]) => `${k}:${v}`).join(", ") || "无装备";
    return `【${c.name}】(HP:${c.hp}/${c.derived.hp}, SAN:${c.sanity}, 装备:${eStr})`;
}).join("\n");
```

**注入内容**: 调查员名称、HP、SAN、装备槽位值
**每次请求都注入**: 是（追加到用户消息尾部）

---

### 1.3 🔴 系统提示缺失的完整数据清单

以下 `gameState` 数据**存在于运行时状态，但从未传递到 LLM**：

| # | gameState 字段 | 数据类型 | 严重度 | 说明 |
|---|---------------|---------|--------|------|
| 1 | `roster[].attrs` | 属性对象 (STR/CON/SIZ/DEX/APP/INT/POW/EDU/LUCK) | 🔴 高 | LLM 不知道角色属性值，无法在叙事中准确判断能力边界 |
| 2 | `roster[].skills` / `roster[].skillAllocations` | 技能对象 | 🔴 高 | LLM 不知道角色技能，调用 `request_skill_check` 时只能盲目指定技能名 |
| 3 | `roster[].backstory` | 9个字段 | 🔴 高 | description/ideology/significantPeople/meaningfulLocations/treasuredPossessions/traits/injuries/phobias/encounters — 角色扮演核心信息完全缺失 |
| 4 | `roster[].job` / `roster[].jobName` | 职业信息 | 🟡 中 | LLM 不知道角色职业背景，限制叙事贴合度 |
| 5 | `roster[].era` | 时代 | 🟡 中 | LLM 不知道所处时代设定 |
| 6 | `roster[].age` | 年龄 | 🟡 低 | 角色年龄信息缺失 |
| 7 | `roster[].derived` (完整) | 派生属性 | 🟡 中 | 只注入 hp，缺失 mp/san/db/build/mov 等战斗关键属性 |
| 8 | `roster[].status` | 状态标志 | 🟡 中 | isDying/isUnconscious/hasMajorWound 标志未注入，LLM 无法感知角色重伤/昏迷/濒死 |
| 9 | `inventory` | 背包物品数组 | 🔴 高 | LLM 完全不知道玩家背包有什么物品，只能依赖玩家文本和工具返回 |
| 10 | `npcRegistry` | NPC 关系网络 | 🔴 高 | LLM 不知道已注册的 NPC 列表、关系、状态 |
| 11 | `clueBoard` | 线索板 (clues + links) | 🔴 高 | LLM 不知道已发现的线索，无法串联叙事 |
| 12 | `journalLog` | 日志条目 | 🟡 中 | LLM 无历史事件摘要 |
| 13 | `sceneMap` | 场景地图 | 🟡 中 | rooms 详细信息（状态、连接、备注）未注入 |
| 14 | `combat` | 战斗状态 | 🔴 高 | active/round/enemies/initiativeOrder/currentTurnIdx — LLM 不知道战斗界面状态 |
| 15 | `atmosphere` | 氛围 | 🟡 低 | level/note 未注入 |
| 16 | `knownLocations` | 已知地点 | 🟡 低 | 仅 campaign summary 部分覆盖 |
| 17 | `kpEngine.global` | KP 引擎全局状态 | 🟡 中 | attention/playerPower/phase/doomClock — 仅 campaign summary 部分覆盖 |
| 18 | `scenarioRunner` | 剧本状态 | 🔴 高 | flags/currentNodeId/pendingBranch — 剧本离线和 AI KP 模式数据隔离，互不可见 |

---

## 2. 工具返回值 → LLM 断链

### 2.1 核心问题：isLocalOnly 吞没状态变更细节

所有工具 handler 将**详细的系统变更信息**推入 `gameState.chatHistory` 时标记 `isLocalOnly: true`，这些消息被 `context_manager.mjs` 的 `buildApiMessages()` 过滤掉（第166行: `.filter(m => m && !m.isLocalError && !m.isLocalOnly)`）。

LLM 收到的工具返回是 handler 的 return 值——通常是一个极短字符串：

| 工具名 | LLM 收到的返回值 | 被 `isLocalOnly` 隐藏的信息 |
|-------|-----------------|--------------------------|
| `update_character_status` | `"玩家重伤，系统正强制其进行体质检定。"` | HP 变化量、重伤部位、昏迷/濒死状态、SAN 变化详情 |
| `update_inventory` | `"完成"` | 添加的具体物品名、来源、KP 验证结果 |
| `register_npc` | `"已记录 {name}"` | NPC 关系类型、社交渗透触发 |
| `fire_weapon` | `result.msg`（如 "击中！造成X伤害"） | 弹药消耗通知、武器贯穿/故障详情、伤害结算中间过程 |
| `start_combat` | `"战斗已开始，敌人：{names}"` | 先攻排序、KP 引擎敌人调整 |
| `update_enemy` | `"{name} 受到 X 伤害"` | 护甲减免过程、KP 免疫触发 |
| `enemy_attack` | `"{target} 受到 X 点伤害"` | 完整伤害链（→重伤→濒死→死亡→昏迷通知） |

**影响**: LLM 只能通过贫乏的工具返回来推断游戏状态，无法感知完整的系统事件链。

### 2.2 具体文件位置

- **character.mjs**: 第74行 `statusAlert` 完整状态数据 → push as `isLocalOnly`；第122行返回 `resultMsg`
- **inventory.mjs**: 第54行 物品添加通知 → push as `isLocalOnly`；第57行返回 `"完成"` / `"完成"`
- **combat.mjs**: 第43行 敌人伤害通知 → push as `isLocalOnly`；第211行返回简单摘要
- **npc.mjs**: 第24行 NPC 注册通知 → push as `isLocalOnly`；第29行返回 `"已记录 {name}"`
- **ai_logic.mjs**: 第613行 技能检定详情 → push as `isLocalOnly`；第647行返回 `"结果：{level}（{rolled}/{target}）。继续叙事，禁废话。"`

---

## 3. 角色信息 → LLM 断链

### 3.1 角色创建时收集但 LLM 不可见的数据

**char_creator.mjs** 收集完整角色数据包括：
- 9 个基础属性 (STR/CON/SIZ/DEX/APP/INT/POW/EDU/LUCK)
- 职业 + 职业技能分配
- 经历包 (expPackage with era filtering)
- 9 个 backstory 字段
- 装备分配（武器装备到 slot）

**注入到 LLM 的内容** (`ai_logic.mjs:283-288`):
```
【{name}】(HP:{hp}/{maxHp}, SAN:{sanity}, 装备:{eStr})
```

**缺失比例**: ~95% 的角色数据完全不可见于 LLM

### 3.2 装备解码错位

系统提示中装备通过 `Object.entries(equipment).filter(([k,v])=>v)` 解析为 `head:value, acc1:value, ...`，但这些 slot 值是武器名称字符串，并非实际 inventory 物品。LLM 看不到：
- 物品的完整属性（伤害骰、类型、特性）
- 武器与弹药的关联
- 物品的其他属性（如手电筒的照明效果、绳索的长度）

---

## 4. 场景数据 → LLM 断链

### 4.1 场景 Runner 状态隔离

**scenario/runner.mjs** 维护的离线剧本状态：
- `flags` — 分支标记（如 `has_badge_or_article`, `visited_warehouse`）
- `currentNodeId` — 当前剧情节点
- `choices` — 可用选项
- `pendingBranch` / `pendingScenarioId` — 待切换分支

**这些数据完全不可见于 AI KP**。当用户在离线剧本中运行时（`scenarioRunner.active === true`），AI KP 完全不被调用（`ai_logic.mjs:121-128`跳过触发）。当用户在 AI KP 模式中时，剧本数据完全不进入 system prompt。

### 4.2 离线模式下的 AI 断链

当 `scenarioRunner.isActive()` 返回 true 时：
```javascript
// ai_logic.mjs:121-128
if (scenarioRunner && scenarioRunner.isActive && scenarioRunner.isActive()) {
    playerInput.value = '';
    gameState.aiActionChoices = [];
    scrollToBottom();
    scenarioRunner.handleInput(text);
    return;  // ← 完全跳过 AI KP
}
```

**影响**: 离线剧本不支持 AI 辅助叙事；AI KP 模式不感知剧本结构。两种模式的数据完全隔离。

---

## 5. KP 引擎内部状态 → LLM 断链

### 5.1 部分注入

**campaign_loader.mjs** 的 `buildCampaignContextSummary()` (第71-91行) 注入：
```
引擎：ATTENTION={kp.ATTENTION_LEVEL} PLAYER_POWER={kp.PLAYER_POWER} PHASE={kp.PHASE} DOOM={kp.DOOM_CLOCK}
敌对组织：警戒{ant.ALERT_LEVEL} 情报{ant.KNOWLEDGE_LEVEL} 掌控{ant.CONTROL_LEVEL}
```

### 5.2 缺失注入

以下 KP 引擎内部状态**存在但不注入**：
- `kpEngine.combatStrategyLog` — 战斗策略日志
- `kpEngine.sessionStartedAt` / `lastEventInjectionAt` — 时间线
- `londonKpState.hunt` / `londonKpState.reality` — 狩猎/现实扭曲子状态
- KP 策略权重详情 (`adaptStrategy` 只在 KP 启用时注入权重摘要，非 KP 模式完全缺失)

### 5.3 注入时机断裂

KP 策略自适应只在 `kpEng.isEnabled(gameState)` 为 true 时触发 (ai_logic.mjs:296-302)。当用户关闭 KP 引擎时：
1. 难度预设 `divine_war` 的 injection 仍注入（通过 difficulty injection）
2. 但 `adaptStrategy` 的策略权重不会注入
3. 物品获取不再要求 source 参数
4. 弹药系统仍可通过 combat handler 工作（独立于 KP 引擎）

---

## 6. 上下文压缩断链

### 6.1 压缩参数 (context_manager.mjs)

| 用途 | maxMessages | maxChars | messageCharLimit |
|------|------------|----------|-----------------|
| 运行时 | 260 | 180,000 | 6,000 |
| 存档 | 180 | 120,000 | 6,000 |
| **API 请求** | **48** | **60,000** | 6,000 |

### 6.2 断链效应

- 超过 48 条消息的历史被裁剪
- 超过 6,000 字符的单条消息被截断（附加 `[已截断 N 字]` 标记）
- 旧的 tool-call 簇被降级为纯文本 assistant message（第143-154行）
- **长期战役中，早期上下文（NPC 出场、线索发现、关键事件）必然丢失**

### 6.3 隐藏系统提示保护

Context Manager 保护 `isHidden` 的 system message（压缩时不丢弃，第69行）。但 `isLocalOnly` 消息在 API 构建时被过滤（第166行），这是正确的——这些消息是 UI 反馈不应发送到 LLM。**但工具返回值太瘦，导致 LLM 只能看到 UI 反馈之外的贫乏摘要。**

---

## 7. 综合断链矩阵

```
数据源               → 在 state 中存在? → 在 system prompt 中? → 在工具返回值中? → LLM 可见?
───────────────────────────────────────────────────────────────────────────────────
角色属性(9项)          ✅                 ❌                    ❌                ❌
角色技能               ✅                 ❌                    ❌                ❌
角色背景(9字段)         ✅                 ❌                    ❌                ❌
角色HP/SAN             ✅                 ✅                    ✅(工具)          ✅
角色装备slot            ✅                 ✅(slot字符串)         ❌                ⚠️部分
角色状态(重伤/昏迷)     ✅                 ❌                    ❌(isLocalOnly)   ❌
背包物品               ✅                 ❌                    ⚠️("完成")        ❌
NPC注册表              ✅                 ❌                    ⚠️("已记录X")    ❌
线索板                 ✅                 ❌                    ⚠️(工具返回)     ❌
日志                   ✅                 ❌                    ❌                ❌
场景地图               ✅                 ❌                    ❌                ❌
战斗状态               ✅                 ❌                    ⚠️(工具返回)     ❌(仅工具结果)
氛围                   ✅                 ❌                    ❌                ❌
已知地点               ✅                 ⚠️(campaign only)     ❌                ❌
KP引擎全局             ✅                 ⚠️(campaign only)     ❌                ❌(仅策略权重)
剧本flags              ✅                 ❌                    ❌                ❌(离线隔离)
```

---

## 8. 关键修复建议 (优先级排序)

### P0 — LLM 失明于核心游戏状态
1. **注入 inventory 摘要到 system prompt**: 背包物品列表（至少物品名称和数量）
2. **注入 NPC registry 摘要**: 已注册 NPC 的 name/relation/status
3. **注入 clueBoard 摘要**: 已发现线索的 title/type/status（最多5条）
4. **注入角色技能摘要**: 至少角色擅长技能列表（skill值>50的）

### P1 — 工具返回值过于贫乏
5. **丰富工具返回值**: handler 返回结构化摘要而非 `"完成"`，包含状态变更的关键数据（如 `"获得：左轮手枪、6发左轮子弹 | 来源：警察局证物室"`）
6. **战斗状态注入**: 战斗进行中时注入当前回合/敌人状态/先攻顺序摘要

### P2 — 角色扮演数据断链
7. **注入角色 backstory 摘要**: 至少 description + ideology + phobias（约200字摘要）
8. **注入角色属性**: 至少关键属性值（DEX/INT/POW/EDU）

### P3 — 长期战役连续性
9. **压缩时生成摘要**: context compaction 时生成叙事摘要注入而非纯截断
10. **关键事件摘要**: 维护 journalLog 摘要注入到 system prompt

---

## 9. 审计文件清单

| 文件 | 角色 |
|------|------|
| `js/ai_logic.mjs` | 主 AI 调度：system prompt 拼接 (L282-305) |
| `js/data/ai_prompt_config.mjs` | 系统提示构建：teamDetails + injection (L153-157) |
| `js/core/context_manager.mjs` | 上下文压缩/API 消息构建 (L163-195) |
| `js/state/core.mjs` | gameState 定义 + hidden system prompt (L28-64, L81-85) |
| `js/state/gameplay.mjs` | 战斗/线索/地图/NPC 状态管理 |
| `js/tools/handlers/character.mjs` | 角色工具: 返回 msg vs isLocalOnly 详情 (L74,122) |
| `js/tools/handlers/inventory.mjs` | 物品工具: 返回 "完成" vs isLocalOnly 详情 (L54,57) |
| `js/tools/handlers/combat.mjs` | 战斗工具: 返回摘要 vs isLocalOnly 详情 |
| `js/tools/handlers/npc.mjs` | NPC 工具: 返回 "已记录" vs isLocalOnly 详情 |
| `js/components/char_creator.mjs` | 角色创建: 收集完整数据但 95% 不注入 LLM |
| `js/scenario/runner.mjs` | 离线剧本: 与 AI KP 完全数据隔离 (L121-128) |
| `js/campaign/campaign_loader.mjs` | 战役摘要: 部分 KP 数据注入 (L71-91) |
| `js/campaign/kp_execution_engine.mjs` | KP 引擎: 内部状态注入缺口 |
