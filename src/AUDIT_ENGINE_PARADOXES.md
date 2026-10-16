# 🔍 CoC 7e 引擎逻辑悖论审计报告

**审计日期**: 2026-08-01  
**审计范围**: `js/engines/` 下全部11个引擎模块交叉验证  
**审计方法**: 静态代码分析，追踪每条CoC 7e规则在多个引擎中的实现路径，检查是否存在矛盾结果

---

## 发现的悖论 (Paradoxes Found)

### 🔴 PARADOX 1 (严重): Fumble 阈值使用 `skillValue` 而非 `targetValue`

**文件**: `dice.mjs` — `checkSkill()` 函数  
**行号**: 80

```javascript
// 当前代码 (错误):
const fumbleThreshold = skillValue < 50 ? 96 : 100;
```

**应使用**:
```javascript
const fumbleThreshold = targetValue < 50 ? 96 : 100;
```

**规则依据**: CoC 7e Keeper Rulebook p.90 — fumble 阈值基于 "the dice roll required for success"（即检定所需掷骰值），而非角色的基础技能值。在困难/极难难度下，所需掷骰值是 halved/reduced 的 targetValue。

**矛盾场景**:
- 技能 80, 困难难度: `targetValue=40`。正确 fumble 应为 96-100（因40<50）。代码 fumble 为 100 only（因80≥50）。**困难检定的 fumble 概率被错误降低了 4 倍**。
- 技能 100, 极难难度: `targetValue=20`。正确 fumble 应为 96-100。代码 fumble 为 100 only。**极难检定的 fumble 概率被错误降低了 4 倍**。

**影响**: 所有非普通难度的技能检定 fumble 概率错误，高技能角色在困难/极难检定中几乎不会大失败。


### 🔴 PARADOX 2 (严重): 神话典籍 SAN 损失绕过 SanityEngine 完整机制

**文件**: `mythos.mjs` vs `sanity.mjs`

**路径A** (通过 SanityEngine):
- `sanity.mjs` `applySanLoss()` — 完整的 SAN 损失处理链:
  1. 更新 `ch.derived.sanity`
  2. 追踪 `ch.insanity.dailyLoss` (每日累计)
  3. 触发临时疯狂 (单次损失≥5 + INT检定失败)
  4. 触发不定疯狂 (dailyLoss ≥ maxSan/5)
  5. 写 `ch.insanity.history` 日志

**路径B** (绕过 SanityEngine):
- `mythos.mjs` `initialBrowse()` (行 28-29):
  ```javascript
  if (ch.derived) ch.derived.sanity = Math.max(0, (ch.derived.sanity || 0) - sanLoss);
  ```
- `mythos.mjs` `fullStudy()` (行 61-62): 同样直接操作

**矛盾**: 阅读典籍损失的 SAN 永远不会触发临时疯狂、不定疯狂、每日损失追踪或历史记录。同一角色因怪物损失5点SAN会触发临时疯狂检定，但因阅读典籍损失5点SAN则静默通过。

**影响**: 阅读《死灵之书》导致10点SAN损失不会触发任何疯狂机制，这是一个严重的规则漏洞。


### 🔴 PARADOX 3 (严重): `calculateDerived()` 不设置 `maxSan` 和 `maxHp`，多个消费者依赖它们

**文件**: `attributes.mjs` `calculateDerived()`  
**行号**: 49-72

`calculateDerived` 返回 `{ hp, mp, san, db, build, mov }` — **缺少 `maxHp` 和 `maxSan`**。

**矛盾路径**:

| 消费者 | 期望字段 | 缺少时的后果 |
|--------|----------|-------------|
| `healing.mjs:23` | `derived.maxHp` | `Math.min(undefined, hp+heal)` = **NaN** — 治疗会破坏HP |
| `wound.mjs:13` | `derived.maxHp` | `!ch.derived.maxHp` → `null` — **重伤系统永不触发** |
| `sanity.mjs:73,88` | `derived.maxSan` | `maxSan \|\| 99` → 上限默认为99而非POW |
| `sanity.mjs:107` | `derived.maxSan` | SAN比率计算使用99而非实际POW |
| `sanity_effects.js:39` | `derived.maxSan` | UI显示错误的SAN比率 |

**补丁状态**: `char_creator.mjs` 在行424-425手动补丁 `maxHp`，但**从不补丁 `maxSan`**。其他创建角色的路径（如 `state/core.mjs` 预设、`campaign_loader.mjs`）各自设置 `maxHp`。

**影响**: 重症/治疗/理智恢复上限三个系统都会因缺失字段产生错误行为。


### 🟡 PARADOX 4 (高): `autoResolveExchange` 贯穿伤害绕过护甲

**文件**: `combat.mjs`

**路径A** — `resolveCombatExchange()` (行40):
```javascript
const damage = this.calculateDamage(weapon?.damage || "1D3", 
    attacker.derived?.db, defender.armor || 0);
```
→ `calculateDamage` 减去护甲: `Math.max(0, totalDamage - targetArmor)`

**路径B** — `autoResolveExchange()` (行104-136):
1. 调用 `resolveCombatExchange` → 获得已减护甲的 `result.damage`
2. 然后 (行116-119):
```javascript
const impale = this.checkImpale(weapon, result.res);
if (impale.impaled) {
    damage += impale.impaleDamage || 0;  // 直接加在已减护甲的值上
    result.damage = damage;
}
```

**矛盾**: 基础伤害已减去护甲，但贯穿奖励伤害 (`impaleDamage`) 未经护甲减免直接累加。这意味着贯穿伤害的一部分（武器基础骰值）绕过了护甲。

**额外发现**: `checkImpale` 使用 `parseDice(weapon.damage)` (随机骰值) 而非 CoC 7e 规定的最大武器伤害 (`max damage`)。CoC 7e 规则要求贯穿时武器造成最大伤害+常规伤害加值。


### 🟡 PARADOX 5 (高): 中毒伤害修改错误HP字段

**文件**: `poison.mjs` vs `combat.mjs` / `healing.mjs`

- `poison.mjs` `processPoisonTick()` (行23): `victim.hp = Math.max(0, victim.hp - total);`
- `combat.mjs`: 通过 `derived.hp` 追踪HP
- `healing.mjs`: `character.derived.hp = Math.min(character.derived.maxHp, ...)`

**矛盾**: 中毒修改 `victim.hp` 顶层字段，而战斗和治疗使用 `victim.derived.hp`。对于同时有 `hp` 和 `derived.hp` 的角色（大多数调查员卡），中毒伤害不会反映在 `derived.hp` 上，导致HP状态不同步。


### 🟡 PARADOX 6 (中): 连射/全自动从不触发火器故障

**文件**: `combat.mjs`

- `autoResolveExchange()` (行106): 调用 `checkMalfunction()` — **会检查故障**
- `resolveBurstFire()` (行54-71): **从不调用 `checkMalfunction()`**

**矛盾**: 单发射击会触发火器故障检查，但连射/全自动扫射（可能发射数十发子弹）完全不会。这违背了CoC 7e的故障规则——连射应增加故障概率（因为射击次数更多）。


### 🟢 PARADOX 7 (低): `compareSuccess` 在闪避判定中的平局处理差异（实为规则正确）

**文件**: `combat.mjs`

| 场景 | 比较逻辑 | 平局结果 | CoC 7e 规则 |
|------|---------|---------|-------------|
| 普通闪避 | `compareSuccess(dodge, attack) >= 0` | 闪避者胜 | ✅ 闪避者赢平局 |
| 反击 | `compareSuccess(counter, attack) > 0` | 攻击者胜 | ✅ 攻击者赢平局 |
| 连射闪避 | `compareSuccess(attack, dodge) > 0` | 闪避者胜 | ✅ 连射中需严格超过才能闪避单发 |

**结论**: 三种场景看似不一致，实则均符合 CoC 7e 规则。非悖论。


### 🟢 PARADOX 8 (低): 大成功/大失败在奖罚骰后的判定

**文件**: `dice.mjs`

- `checkSkill` 的大成功判定: `roll === 1` — 仅 01 为大成功，无论奖罚骰
- `checkSkill` 的大失败判定: `roll >= fumbleThreshold` — 基于 `skillValue`（非 `targetValue`，见 Paradox 1）

**奖罚骰实现**:
- `rollBonusDice`: 骰个位一次，多个十位取最低 → 倾向低值，01 概率增加
- `rollPenaltyDice`: 骰个位一次，多个十位取最高 → 倾向高值，96+ 概率增加

**结论**: 奖罚骰与大成功/大失败的判定逻辑本身无矛盾（01始终大成功，符合规则）。真正的矛盾在于 fumble 阈值使用了错误的基准值（Paradox 1）。


## 汇总

| # | 严重度 | 引擎文件 | 描述 | 影响 |
|---|--------|---------|------|------|
| 1 | 🔴 严重 | `dice.mjs` | Fumble阈值用skillValue而非targetValue | 困难/极难检定fumble概率错4倍 |
| 2 | 🔴 严重 | `mythos.mjs` ↔ `sanity.mjs` | 典籍SAN损失绕过SanityEngine | 阅读典籍永不触发疯狂 |
| 3 | 🔴 严重 | `attributes.mjs` | calculateDerived缺maxHp/maxSan | 治疗NaN、重伤不触发、SAN上限错误 |
| 4 | 🟡 高 | `combat.mjs` | autoResolveExchange贯穿伤害绕过护甲 | 贯穿奖励无视护甲 |
| 5 | 🟡 高 | `poison.mjs` ↔ others | 中毒用hp而非derived.hp | HP状态不同步 |
| 6 | 🟡 中 | `combat.mjs` | 连射/全自动不检查火器故障 | 扫射永不卡壳 |
| 7 | 🟢 低 | `combat.mjs` | compareSuccess平局差异 | 非悖论,符合规则 |
| 8 | 🟢 低 | `dice.mjs` | 奖罚骰后大成功判定 | 非悖论,符合规则 |

**总计**: 6个实质性悖论 (3严重 + 2高 + 1中), 2个误报已排除
