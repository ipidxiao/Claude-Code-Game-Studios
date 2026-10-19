# 🔍 V18.4 修改审计报告

**审计日期**: 2026-08-02  
**审计范围**: C:/Users/x1767/AppData/Local/Temp/coc_v18  
**审计方法**: 逐文件静态代码审查，交叉引用追踪每条调用路径，验证 CHANGELOG 声明与代码一致性

---

## 审计范围

对照 CHANGELOG V18.4 的 8 项声明，逐一验证：

| # | CHANGELOG 声明 | 文件 | 验证结果 |
|---|---------------|------|---------|
| 1 | 统一HP/SAN入口 damage.mjs | js/engines/damage.mjs | ⚠️ 入口已建，但最大消费者未路由 |
| 2 | 神话典籍SAN损失不再绕过疯狂判定 | js/engines/mythos.mjs | ✅ 已修复 |
| 3 | calculateDerived增加maxHp/maxSan | js/engines/attributes.mjs | ✅ 已修复 |
| 4 | 贯穿伤害正确经过护甲减免 | js/engines/combat.mjs | ✅ 已修复 |
| 5 | 中毒HP与战斗HP字段同步 | js/engines/poison.mjs | ⚠️ 部分修复 |
| 6 | 连射/全自动触发火器故障检查 | js/engines/combat.mjs | ✅ 已修复 |
| 7 | 不定疯狂覆盖临时疯狂(互斥) | js/engines/sanity.mjs | ❌ 未实际实现 |
| 8 | Fumble阈值修复 | js/engines/dice.mjs | ✅ 已修复 |

---

## 🔴 P0 — 导致功能完全失效的BUG

### BUG 1: `apply_therapy` 工具永远失败

**文件**: `js/tools/handlers/system.mjs:74-80`  
**根因**: 参数类型不匹配

```javascript
// 当前代码（错误）:
apply_therapy: (args) => {
    const c = gameState.roster.find(r => r.name === args.target_name);
    if (!c) return `找不到: ${args.target_name}`;
    const months = args.months || 1;
    const result = Engine.SanityEngine.applyTherapy(c, months);  // ❌ 传数字给 therapist 参数
    ...
}
```

`SanityEngine.applyTherapy` 的签名是 `(ch, therapist)`，第二个参数应为有 `skills` 的角色对象。传入数字 `months` (如 1, 3) 后，`CoCEngine.checkSkill('精神分析', 1, 'normal')` 在数字上查找技能，返回 0，导致技能检定永远判定为大失败，治疗永远无效。

**影响**: `apply_therapy` 工具 100% 失败，心理治疗功能完全不可用。

**修复方向**: 工具定义期望的是"治疗月数"，但引擎实现期望"治疗师角色"。需要协调：
- 方案A: 引擎增加 months 参数，自动按月数骰多次 `applySanityReward`
- 方案B: 创建虚拟治疗师角色（带精神分析技能值）

---

## 🔴 P1 — 架构一致性缺陷

### BUG 2: `character.mjs` handler 绕过统一HP/SAN入口

**文件**: `js/tools/handlers/character.mjs:24-35, 105-107`  
**严重度**: 高 — "单点权威"架构的核心矛盾

damage.mjs 的设计目标是 **"the ONE AND ONLY place that directly modifies char.derived.hp and char.derived.sanity"**。但 `update_character_status` handler（最大HP/SAN消费方）完全绕过统一入口：

```javascript
// HP变更 — 直接操作字段（第24-35行）
if (args.hp_change > 0) {
    const maxHp = c.derived ? (c.derived.maxHp || c.derived.hp || c.hp) : (c.hp || 10);
    c.hp = Math.min((c.hp || 0) + args.hp_change, maxHp);
    if (c.derived) c.derived.hp = c.hp;  // 手动同步
} else {
    c.hp += args.hp_change;
    if (c.derived) c.derived.hp = c.hp;  // 手动同步
}

// SAN变更 — 绕过统一入口（第105-107行）
const sanityResult = window.CoCEngine.SanityEngine.applySanLoss(c, sanLoss, ...);
// 应改为: window.CoCEngine.applySanLoss(c, sanLoss, ...)
```

**影响**:
- 不触发 damage.mjs 的 `applyDamage` 中完整的重伤→濒死→死亡链（虽然 handler 自己复制了部分逻辑，但不完整）
- 双写 `hp` 和 `derived.hp` 容易出错
- 绕过 `applySanLoss` 统一的 fallback 保护
- `applyHealing` 的状态清理（isDying/isUnconscious）在 handler 中被重复实现但不一致

### BUG 3: `inventory.mjs` 绕行统一SAN入口

**文件**: `js/tools/handlers/inventory.mjs:45`  
同样调用 `Engine.SanityEngine.applySanLoss` 而非 `Engine.applySanLoss`。

### BUG 4: `poison.mjs` 直接操作HP而非路由

**文件**: `js/engines/poison.mjs:24-30`  
CHANGELOG 宣称 "所有HP变更路由到统一入口"，但 poison.mjs 直接操作 `derived.hp`:

```javascript
if (victim.derived) {
    victim.derived.hp = Math.max(0, (victim.derived.hp || victim.hp || 0) - total);
    victim.hp = victim.derived.hp;
}
```

应路由到 `CoCEngine.applyDamage(victim, total, { type: 'poison', desc: '中毒' })`。

---

## 🟡 P2 — 逻辑缺陷

### BUG 5: `applyHealing` 中 maxHp 回退链有陷阱

**文件**: `js/engines/damage.mjs:85`

```javascript
const maxHp = char.derived.maxHp || char.derived.hp || 10;
```

如果 `maxHp` 为 0（如角色死亡），回退到 `char.derived.hp`（当前HP=0），则 `Math.min(0, 0 + heal) = 0` — 治疗完全无效。应使用 `char.attrs.CON + char.attrs.SIZ` 作为最终回退。

### BUG 6: `healing.mjs` 回退路径 oldHp 计算错误

**文件**: `js/engines/healing.mjs:30`

```javascript
// IIFE先执行，更新了 derived.hp，然后:
oldHp: (character.derived.hp || 0) - healAmount
// ❌ 此时 derived.hp 已是新值，oldHp = newHp - healAmount
// 如果治疗被 maxHp 截断，oldHp 就完全错误
```

应改为在更新前保存 oldHp。不过此路径仅在 `CoCEngine.applyHealing` 不存在时使用（即回退路径），影响有限。

### BUG 7: CHANGELOG 声称的 "不定疯狂覆盖临时疯狂" 未实现

**文件**: `js/engines/sanity.mjs:32-37`  
CHANGELOG 宣称 "不定疯狂覆盖临时疯狂(互斥)"，但代码中：
- `indefInsane` 设为 true 时 **没有清除** `tempInsane`
- 两者可以同时为 true
- `getSanitySummary` 中 `indefInsane` 优先级高于 `tempInsane`（UI 覆盖），但内部状态不符

---

## 🟢 P3 — 设计改进建议

### 8. 贯穿伤害使用随机骰而非最大伤害

**文件**: `js/engines/combat.mjs:95`  
CoC 7e 规则：贯穿时武器造成 **最大伤害** + 常规伤害加值。当前代码使用 `parseDice(weapon.damage)`（随机值），而非 `parseMaxDamage()`。此为预存问题，非本次引入。

### 9. `applySanRecovery` 参数类型转换不够优雅

**文件**: `js/engines/damage.mjs:138`  
`SE.applySanityReward(char, amount + '', reason)` — 强制转换数字为字符串以匹配 `rewardDice` 参数。如果传入纯数字，功能正常；但如果需要支持骰子表达式（如 '1D6'），此转换反而有害。建议保持原类型。

---

## ✅ 正确修复确认

| 项目 | 文件 | 详情 |
|------|------|------|
| Fumble阈值 | dice.mjs:81 | `targetValue < 50 ? 96 : 100` ✅ |
| 典籍SAN绕过 | mythos.mjs:28,61,105 | 三处均通过 `CoCEngine.applySanLoss` ✅ |
| maxHp/maxSan | attributes.mjs:72 | `{ ..., maxHp: hp, maxSan: san }` ✅ |
| 贯穿护甲 | combat.mjs:130-134 | `rawBase + impaleDamage - armor` 一次计算 ✅ |
| 连射故障 | combat.mjs:60-76 | fumble时触发 checkMalfunction ✅ |
| 中毒字段 | poison.mjs:25-27 | 写 derived.hp + 同步 hp ✅ |
| 统一入口设计 | damage.mjs | applyDamage/applyHealing/applySanLoss/applySanRecovery 设计合理 ✅ |
| 组装顺序 | index.mjs:23 | damage在sanity和wound之后 ✅ |
| 剧本路由 | scenario/runner.mjs:144-147 | Engine.applySanLoss 优先，正确回退 ✅ |
| recover_luck | system.mjs:66-73 | 正确调用 Engine.recoverLuck ✅ |

---

## 综合评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 架构设计 | 8/10 | 统一入口模式正确，但实施方案不彻底 |
| Bug 数量 | 5/10 | 🔴1个P0 + 4个架构一致性问题 |
| 悖论修复完成度 | 7/10 | 6个悖论中5个正确修复，1个(互斥)未实现 |
| 代码质量 | 7/10 | 回退路径有边界bug，handler重复逻辑多 |
| CHANGELOG 准确性 | 6/10 | 部分声明与代码不一致 |

**总体**: 方向正确，关键修复到位（fumble、SAN绕过、maxHp/maxSan、贯穿护甲、连射故障）。但 **apply_therapy 工具完全损坏**，且 **统一入口未覆盖最大消费者**（character.mjs handler），使架构收益大打折扣。

---

## 优先级修复清单

| 优先级 | 问题 | 文件 | 工作量 |
|--------|------|------|--------|
| 🔴 P0 | apply_therapy 参数不匹配 | system.mjs:78 | 小 |
| 🟡 P1 | character.mjs 路由到统一入口 | character.mjs:24-35,105-107 | 中 |
| 🟡 P1 | inventory.mjs 路由到统一入口 | inventory.mjs:45 | 小 |
| 🟡 P1 | poison.mjs 路由到 applyDamage | poison.mjs:24-30 | 小 |
| 🟢 P2 | applyHealing maxHp回退链 | damage.mjs:85 | 小 |
| 🟢 P2 | CHANGELOG不实或补全互斥逻辑 | sanity.mjs:33 | 小 |
