# 🤖 AI-引擎规则对齐审计报告 (V18.1)

**审计日期**: 2026-08-01  
**审计范围**: `C:/Users/x1767/AppData/Local/Temp/coc_v18`  
**审计维度**: 工具覆盖率 · KP引擎验证 · 提示有效性

---

## 1. 工具覆盖率 (Tool Coverage)

### 1.1 引擎方法 → 工具映射矩阵

#### ✅ 已覆盖 (有对应工具)

| 引擎模块 | 引擎方法 | 对应工具 | 覆盖路径 |
|---------|---------|---------|---------|
| dice.mjs | `checkSkill` | `request_skill_check`, `push_skill_check`, `bonus_penalty_roll` | handler调用Engine.checkSkill |
| dice.mjs | `rollBonusDice` | `bonus_penalty_roll` (bonus_dice参数) | handler→system.mjs调用 |
| dice.mjs | `rollPenaltyDice` | `bonus_penalty_roll` (penalty_dice参数) | handler→system.mjs调用 |
| dice.mjs | `executePushedRoll` | `push_skill_check` | 自动调用checkSkill |
| dice.mjs | `spendLuck` | `spend_luck` | character.mjs handler |
| dice.mjs | `roll` / `parseDice` | `roll_dice`, `group_roll`, `opposed_roll` | dice.mjs handler |
| combat.mjs | `resolveCombatExchange` | `fire_weapon`, `fight_back` | combat.mjs handler内部 |
| combat.mjs | `resolveBurstFire` | `burst_fire` | combat.mjs handler |
| combat.mjs | `autoResolveExchange` | `fire_weapon` | combat.mjs handler内部 |
| sanity.mjs | `applySanLoss` | `update_character_status` (san_change<0) | character.mjs handler |
| sanity.mjs | `applySanityReward` | `update_character_status` (san_change>0) | character.mjs handler |
| mythos.mjs | `initialBrowse` | `study_tome` (weeks=0) | mythos.mjs handler |
| mythos.mjs | `fullStudy` | `study_tome` (weeks>0) | mythos.mjs handler |
| mythos.mjs | `castSpell` | `cast_spell` | mythos.mjs handler |
| wound.mjs | `checkMajorWound` / `applyMajorWound` / `dyingCheck` | `update_character_status` | 自动触发 |
| environmental.mjs | 全部5个方法 | `apply_environmental_damage` | system.mjs handler |
| poison.mjs | `applyPoison` | `apply_poison` | system.mjs handler |

#### ❌ 未覆盖 (引擎方法无对应AI工具)

| 引擎模块 | 引擎方法 | 严重度 | 说明 |
|---------|---------|--------|------|
| dice.mjs | `recoverLuck` | 🔴 中 | 无 `recover_luck` 工具；AI无法通过工具调用恢复运气 |
| healing.mjs | `applyHealing` | 🔴 高 | **无任何治疗/急救工具**；AI无法让玩家使用急救箱等消耗品恢复HP |
| sanity.mjs | `applyTherapy` | 🟡 中 | 无心理治疗工具；`精神分析`技能在引擎中有完整实现但AI无法调用 |
| sanity.mjs | `realityCheck` | 🟡 低 | 无直接工具；但 `update_character_status` + SanityEngine 可间接触发 |
| sanity.mjs | `resetDailyLoss` | 🟢 低 | 内部状态管理，无需独立工具 |
| attributes.mjs | `applyAgeModifiers` / `calculateDerived` | 🟢 低 | 角色创建阶段使用，非游戏运行时 |
| combat.mjs | `checkImpale` | 🟡 低 | 无直接工具；在 `fire_weapon` handler中自动调用，提示词#13提到但无独立调用 |
| combat.mjs | `checkMalfunction` | 🟡 低 | 同上，自动处理但无独立工具 |
| poison.mjs | `resistCheck` | 🟢 低 | engine内部自动处理 |
| poison.mjs | `processPoisonTick` | 🟢 低 | engine内部自动处理 |

### 1.2 覆盖率统计

- **引擎公开方法总数**: ~48 (不含 `_` 前缀的内部方法)
- **AI可直接调用的工具**: 35
- **引擎方法有工具覆盖**: 34/48 = **70.8%**
- **运行时关键方法覆盖**: 29/34 = **85.3%** (排除角色创建/UI辅助方法)
- **完全无覆盖的关键方法**: 3 (`recoverLuck`, `applyHealing`, `applyTherapy`)

### 1.3 工具定义质量

| 属性 | 状态 | 说明 |
|------|------|------|
| 参数Schema | ✅ 完整 | 所有35个工具均有完整JSON Schema |
| 工具分级(tier) | ✅ 有 | required(6个) + suggested(15个) + neutral |
| 描述质量 | ✅ 良好 | 中英文混合，含【必须调用】【建议调用】前缀 |
| singleAsArray | ✅ 内部 | 标记数组字段但剥离后才发给AI |
| additionalProperties | ✅ false | 防止AI幻觉参数 |
| auditAgainstHandlers | ✅ 内置 | 可自动检测定义vs handler不匹配 |

---

## 2. KP引擎验证 (KP Engine Validation)

### 2.1 引擎架构

```
KpExecutionEngine (主引擎)
├── ensureKpEngine() — 初始化+状态同步
├── isEnabled() — 运行状态判断
├── validatePlayerAction() — 玩家行动合法性
├── validateNarrativeLanguage() — 叙述语言检查(时代/未来科技)
├── onCombatStart() — 战斗初始化钩子
├── handleFirearmAttempt() — 火器现实扭曲检查
├── finalizeCombatPower() — 战斗结算
├── checkAntiOneShot() — 反一击必杀
├── tickDoomClock() — 末日时钟
├── updateAttention() — 注意力系统
├── registerPath() — 调查路径追踪
├── evaluateKeyClueRequest() — 关键线索评估
├── canAddClue() — 线索添加控制
├── applySocialInfiltration() — 社交渗透
├── validateItemAcquisition() — 物品获取校验
├── checkMythosItem() — 神话物品检测
├── inferAmmoType() — 弹药类型推断
├── countBackpackAmmo() — 背包弹药统计
├── consumeBackpackAmmo() — 弹药消耗
└── runAntagonistTick() — 反派AI回合
```

### 2.2 验证结果

| 验证项 | 状态 | 详情 |
|--------|------|------|
| 引擎初始化 | ✅ | `ensureKpEngine` 处理所有默认值+状态同步 |
| 伦敦规则集加载 | ✅ | `loadLondonRulesPreset` 加载COC_LONDON_KP_RULES |
| 状态双向同步 | ✅ | `syncLondonToGlobal` / `syncGlobalToLondon` |
| 时代限制 | ✅ | 检测未来科技词汇，含知识门控 |
| 语言自校正 | ✅ | `runLanguageCorrection` 集成 |
| 环境熵计算 | ✅ | 氛围/天气/位置/神话因素综合计算 |
| 弹药系统 | ✅ | 5种弹药类型，背包匹配，自动消耗 |
| 火器现实扭曲 | ✅ | 空间错位/弹道失效两种block |
| 反一击必杀 | ✅ | `checkAntiOneShot` 防止boss秒杀 |
| 战斗威力追踪 | ✅ | 记录伤害/命中/弹药消耗 |
| 场景路径系统 | ✅ | 真路径/假路径分类，关键线索门控 |
| 社交渗透 | ✅ | NPC注册/状态更新触发 |
| 反派AI | ✅ | 注意力/警戒/知识三级驱动 |
| 末日时钟 | ✅ | 随关键事件推进 |
| 运行稳定性 | ✅ | 无语法错误，ESM模块化 |

### 2.3 发现的问题

| 问题 | 严重度 | 详情 |
|------|--------|------|
| `isActive()` 已弃用 | 🟢 低 | 标记为deprecated但保留向后兼容 |
| 测试注入队列共存 | 🟢 低 | `_testRollQueue` 在engine和kp_engine各有一份，可能不同步 |
| 弹药系统仅依赖背包 | 🟡 中 | 不检查装备槽中的弹药；仅从inventory匹配 |

---

## 3. 提示有效性 (Prompt Effectiveness)

### 3.1 提示架构

```
系统提示 = 小队状态 + 难度预设 + 战役注入 + 沉浸叙述块 + SYSTEM_RULES_BLOCK
```

### 3.2 规则覆盖

SYSTEM_RULES_BLOCK 包含 **15条铁律**：

| # | 铁律 | 覆盖场景 | 质量 |
|---|------|---------|------|
| 1 | 枪弹分离 | 武器管理 | ✅ 明确 |
| 2 | 装备与弹药匹配 | 开火前提 | ✅ 明确 |
| 3 | 伤害立刻结算 | 战斗 | ✅ 含反驳指令 |
| 4 | 检定前摇+静默调用 | 探索 | ✅ 防剧透 |
| 5 | 物品获取记录 | 探索 | ✅ |
| 6 | NPC记录 | 社交 | ✅ |
| 7 | 战斗铁律+行动菜单 | 战斗 | ✅ 详细7a子规则 |
| 8 | 地图铁律 | 场景 | ✅ |
| 9 | 线索铁律 | 调查 | ✅ |
| 10 | 骰子铁律+奖励惩罚骰 | 检定 | ✅ 强调核心机制 |
| 11 | 环境伤害铁律 | 危险 | ✅ |
| 12 | 毒素铁律 | 异常状态 | ✅ |
| 13 | 武器机制铁律 | 战斗特殊 | ✅ 参考checkImpale/checkMalfunction |
| 14 | 开发者日志 | 元数据 | ✅ |
| 15 | 物品属性铁律 | 标准化 | ✅ 含具体武器名列表 |

### 3.3 关键词拦截

| 拦截模式 | 触发词 | 强制动作 |
|---------|--------|---------|
| 高危指令 | 开枪/射击/开火/扣动扳机 | 调用fire_weapon |
| 伤害指令 | 伤害/砸/咬/攻击 | 调用update_character_status |
| 技能指令 | 搜索/找/检查/看/听 | 调用request_skill_check |
| 物品获取 | 拾起/拿/捡/带走/收起 | 调用update_inventory |

### 3.4 难度预设

| 预设 | ID | 影响 |
|------|-----|------|
| 仁慈 | merciful | 额外线索、宽容判定、降低即死 |
| 标准 | standard | 无特殊修改 |
| 致命 | brutal | 严格执行、不施舍线索 |
| 神战 | divine_war | KP协议引擎+注意力+敌对组织 |

### 3.5 提示有效性评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 规则完整性 | **9/10** | 15条铁律覆盖所有关键场景 |
| 工具引导力 | **8/10** | 关键词拦截+【必须调用】标记 |
| 负面约束 | **7/10** | 有"禁止反悔""无情反驳"但缺anti-hallucination |
| 战役集成 | **8/10** | 伦敦规则集+反派AI注入 |
| 沉浸感 | **7/10** | 有沉浸叙述块但依赖外部模块 |
| 错误恢复 | **5/10** | 缺"当工具调用失败时的回退策略" |

### 3.6 提示改进建议

1. **添加`recover_luck`工具**: AI无法恢复运气 → 加工具+提示规则
2. **添加治疗工具**: `use_item`或`apply_healing` → 让AI能调用急救/治疗
3. **添加`apply_therapy`工具**: 精神分析已有引擎实现 → 暴露给AI
4. **增强anti-hallucination**: 在提示中加入"不要虚构不存在的技能/物品/工具参数"
5. **工具失败回退**: 当工具返回错误时AI应如何响应（重试/降级/告知玩家）
6. **添加`check_impale`和`check_malfunction`的叙事指引**: 目前仅提示词#13提到，可增强为独立工具

---

## 4. 综合评分

| 维度 | 评分 | 权重 | 加权 |
|------|------|------|------|
| 工具覆盖率 | **71%** | 40% | 28.4 |
| KP引擎验证 | **95%** | 35% | 33.3 |
| 提示有效性 | **78%** | 25% | 19.5 |
| **综合** | **81%** | — | **81.1** |

### 优先级修复清单

| 优先级 | 问题 | 工作量 |
|--------|------|--------|
| 🔴 P0 | 添加 `apply_healing` 工具 (急救/治疗) | 中 — 需新tool定义+handler |
| 🔴 P0 | 添加 `recover_luck` 工具 | 小 — engine已有，仅需暴露 |
| 🟡 P1 | 添加 `apply_therapy` 工具 (精神分析) | 小 — engine已有 |
| 🟡 P1 | 提示增加anti-hallucination约束 | 小 — 纯文本修改 |
| 🟡 P1 | 提示增加工具失败回退策略 | 小 — 纯文本修改 |
| 🟢 P2 | `checkImpale`/`checkMalfunction`独立工具 | 小 — 可选增强 |
| 🟢 P2 | 弹药系统加入装备槽检查 | 中 — 需修改kp_engine |

---

*审计工具: 手动代码审查 + 静态分析 · CoC V18.1*
