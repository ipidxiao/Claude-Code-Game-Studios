# 🔧 CCGS 技术美术审查报告 (V18.1)

> **审查日期**: 2026-08-01  
> **审查范围**: CSS性能、Canvas渲染、资源加载、暗黑主题、动画系统  
> **项目**: CoC 7th TRPG 引擎 — 克苏鲁的呼唤跑团助手  

---

## 1. 📊 性能视觉 — CSS 性能分析

### 1.1 CSS `contain` 使用

| 选择器 | contain 值 | 评价 |
|--------|-----------|------|
| `.story-panel` | `layout style` | ✅ 良好 — 限制布局重算范围 |
| `.story-tab-content` | `layout style paint` | ✅ 最佳 — 完全隔离子树 |
| `.chat-message` | `layout style` | ✅ 合理 |
| `.inv-item` | `layout style` | ✅ 合理 |

**评分**: 8/10 — 核心重复渲染区域均已应用 `contain`，覆盖面良好。

### 1.2 `will-change` / `transform` 优化

**已使用位置**:
- `.story-panel { will-change: transform }` (line 2004)
- `.apex-action-fan { will-change: transform, opacity }` (line 3493)

**⚠️ 问题**:
1. **`.story-panel` 永久创建合成层**: `will-change` 应仅在实际即将动画时临时添加，常驻会导致持续占用 GPU 显存。建议改为通过 JS 在滚动/切换时动态添加，动画结束后移除。
2. **缺少 GPU 层提升**: 战斗面板 (`.combat-panel`)、骰子动画 (`dice_canvas`)、消息列表 (`.chat-box`) 等高频动画区域未使用 `will-change` 或 `transform: translateZ(0)` 主动提升到合成层。

### 1.3 重绘/回流风险

**✅ 良好实践**:
- 所有动画使用 `transform` + `opacity`（仅触发合成，不触发 layout/paint）
- 按钮 active 状态使用 `transform: scale()` 而非修改 width/height

**⚠️ 风险点**:
1. **`filter` 动画代价高**: `san-shock`、`combat-hit-flash`、`combat-crit-flash` 等使用 `filter: brightness()/hue-rotate()/drop-shadow()` 动画，这些触发 GPU paint，在低端设备上可能掉帧。建议：
   - 短时 filter 动画（<0.6s）可接受
   - 长时/循环 filter 动画应改用 `opacity` 叠加层方案
2. **Body 伪元素持续动画**: `body::after` 有 18 秒 `ambient-breathe` 无限循环，包含 `transform: scale()` + `opacity`，持续占用合成器资源。
3. **`void app.offsetWidth` 强制回流**: `sanity_effects.js` 中使用此技巧重启 CSS 动画（标准做法，但每次触发强制同步布局）

### 1.4 动画性能 (GPU vs CPU)

| 动画类型 | 触发层级 | 性能 | 建议 |
|---------|---------|------|------|
| `transform` (scale/translate) | Composite only | 🟢 优秀 | — |
| `opacity` | Composite only | 🟢 优秀 | — |
| `filter` (brightness/hue-rotate) | Paint + Composite | 🟡 中等 | 限制持续时间 |
| `box-shadow` 动画 (san-pulse) | Paint + Composite | 🟡 中等 | 用 `opacity` 叠加伪元素替代 |
| `background` 渐变动画 | Paint | 🔴 较差 | 避免 |

---

## 2. 🎨 Canvas 渲染分析

### 2.1 `dice_canvas.js` — 粒子系统

**架构质量**: 7/10

| 项目 | 状态 | 说明 |
|------|------|------|
| HiDPI 支持 | ✅ | `dpr = Math.min(devicePixelRatio, 2)` — 正确限制 2x 防止性能问题 |
| rAF 驱动 | ✅ | 使用 `requestAnimationFrame`，正确取消 |
| 粒子生命周期 | ✅ | `life` + `decay` 控制，自动回收 |
| 粒子上限 | ❌ | **无最大粒子数限制** — 快速连续 roll() 会累积粒子 |
| 渐变缓存 | ⚠️ | `_drawDie()` 每帧创建新 `LinearGradient` — 应缓存 |
| 内存管理 | ✅ | `destroy()` 清理 rAF，粒子动画自动停止 |

**改进建议**:
```js
// 添加粒子池上限
const MAX_PARTICLES = 80;
if (this.particles.length + count > MAX_PARTICLES) {
    this.particles = this.particles.slice(-(MAX_PARTICLES - count));
}
```

### 2.2 `canvas_chat.mjs` — 渲染管线

**架构质量**: 6/10 (原型阶段)

| 项目 | 状态 | 说明 |
|------|------|------|
| 视口裁剪 | ✅ | 只渲染可见消息 (viewport culling) |
| HiDPI | ✅ | `dpr` 缩放 + `ctx.scale()` |
| CJK 文本换行 | ✅ | 逐字符测量，中日韩友好 |
| 性能陷阱 | ⚠️ | `_computeLayouts()` 是 computed — 大历史会卡 |
| 字体一致性 | ❌ | 硬编码 `monospace`，与系统 UI 字体不一致 |
| OffscreenCanvas | ❌ | 未使用 Worker 离屏渲染 |
| Resize 处理 | ⚠️ | `handleResize()` 每次重新获取 context，丢失状态 |

**改进建议**:
- 将 layouts 缓存为 `data` 而非 `computed`，仅在消息变化时重新计算
- 使用 `ctx.font = getComputedStyle(document.body).fontFamily` 继承系统字体

---

## 3. 📦 资源加载分析

### 3.1 Vendor 库体积

| 文件 | 原始大小 | 预估 Gzip | 用途 | 评价 |
|------|---------|----------|------|------|
| `pdf.worker.min.js` | **1,087 KB** | ~320 KB | PDF 解析 Worker | 🔴 最大体积 — 按需加载 |
| `pdf.min.js` | 320 KB | ~95 KB | PDF.js 主库 | 🔴 阻塞渲染 |
| `bootstrap.min.css` | 233 KB | ~30 KB | UI 框架 | 🟡 大量未使用样式 |
| `chart.min.js` | 205 KB | ~65 KB | 雷达图 | 🟡 仅角色创建使用 |
| `vue.global.prod.js` | 158 KB | ~55 KB | Vue 3 运行时 | 🟢 核心依赖 |
| `anime.umd.min.js` | 118 KB | ~35 KB | 动画引擎 | 🟡 仅 Action Wheel 使用 |
| **总计** | **~2.1 MB** | **~600 KB** | | |

### 3.2 关键渲染路径

**⚠️ 严重问题 — 同步阻塞**:
```
<head>
  bootstrap.min.css    ← 阻塞渲染 (233KB CSS)
  vue.global.prod.js   ← 阻塞解析 (158KB JS)
  chart.min.js         ← 阻塞解析 (205KB JS)
  pdf.min.js           ← 阻塞解析 (320KB JS)  
  pdf.worker.min.js    ← 阻塞解析 (1,087KB JS) 🔴
  anime.umd.min.js     ← 阻塞解析 (118KB JS)
  style.css            ← 阻塞渲染 (153KB CSS)
</head>
```

**所有 vendor 脚本均为同步加载**，总计约 2MB 的同步 JS 阻塞首屏渲染。

**改进建议**:
1. `pdf.worker.min.js` — 不应在 `<head>` 中加载，应在实际需要 PDF 功能时动态加载
2. 所有 vendor 脚本添加 `defer` 属性
3. 使用 `<link rel="preload">` 提示浏览器提前下载关键资源
4. `bootstrap.min.css` 考虑使用 PurgeCSS 裁剪，移除约 70% 未使用的选择器

### 3.3 字体加载策略

**✅ 无 Web 字体依赖** — 全部使用系统字体栈：
```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 
             'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

这是性能最优解：零网络请求、无 FOUT/FOIT、即时渲染。

---

## 4. 🌑 暗黑主题审查

### 4.1 完整覆盖度

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 背景色 | ✅ | 全部黑色系 (#141414 → #0d0d14) |
| 文字色 | ✅ | 全浅色系 (#e8e8ec → #a4a4b0) |
| 表单控件 | ✅ | 深色背景 + 浅色文字 |
| Bootstrap 覆盖 | ✅ | nav-tabs, form-control, badges 均已覆盖 |
| 边框 | ✅ | 低对比度暗色边框 ~#3a3a44 |

### 4.2 滚动条样式

**❌ 缺失 — 无任何滚动条样式**:
- 无 `::-webkit-scrollbar` 自定义
- 无 `scrollbar-color` (Firefox)
- 无 `scrollbar-width` (Firefox)

**风险**: Windows 系统上默认滚动条为浅灰色，在暗黑背景下会形成明显白色闪烁。

**推荐修复**:
```css
/* Chrome/Safari/Edge */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg-dark); }
::-webkit-scrollbar-thumb { 
    background: var(--border-light); 
    border-radius: 4px; 
}
::-webkit-scrollbar-thumb:hover { background: #5a5a64; }

/* Firefox */
* { scrollbar-color: var(--border-light) var(--bg-dark); scrollbar-width: thin; }
```

### 4.3 选中文本颜色

**❌ 缺失 — 无 `::selection` 样式**:
- 浏览器默认选中色在暗黑背景下通常可用（浅蓝底白字），但未经过主题化设计

**推荐**:
```css
::selection { 
    background: rgba(232, 168, 74, 0.35); 
    color: var(--text-primary); 
}
```

### 4.4 自动暗色模式

**❌ 缺失 — 无 `color-scheme` 声明**:
```css
:root { color-scheme: dark; }  /* 未设置 */
```

**影响**: 浏览器原生控件（`<select>` 下拉、`<input type="date">`、滚动条等）可能渲染为浅色主题，产生白色闪烁。

---

## 5. 🎬 动画系统审查

### 5.1 战斗特效完整性

| 特效 | 实现 | 质量 |
|------|------|------|
| 命中闪烁 | `combat-hit-flash` (filter brightness) | 🟢 好 |
| 暴击特效 | `combat-crit-flash` (brightness + shake) | 🟢 优秀 |
| 闪避 | `combat-dodge-flash` (opacity + translateX) | 🟢 好 |
| 格挡 | `combat-block-flash` (white flash) | 🟢 好 |
| 击杀 | `combat-kill-flash` (desaturate + fade) | 🟢 优秀 |
| 神话物品发光 | `mythicGlow` (2s pulse) | 🟢 好 |

**评分**: 8.5/10 — 战斗视觉反馈完整且有层次。

### 5.2 SAN 视觉效果

**分层体系** (完整度: 9/10):

| SAN 比例 | CSS 类 | 视觉效果 |
|----------|--------|---------|
| ≥60% | (无) | 正常 |
| 40-60% | `low-san` | 边缘暗化 |
| 20-40% | `very-low-san` | 红色暗角 |
| <20% | `critical-san` | 脉冲红边 |
| 临时疯狂 | `madness-border` | 闪烁红光边框 |

**触发特效**:
- `san-shock`: 亮度 + 饱和度 + 色相旋转动画 (≥3 SAN 损失)
- `san-shake`: 8 方向抖动 (≥3 SAN 损失)
- `san-pulse`: 心跳脉冲边框 (疯狂状态)
- `san-recover`: 恢复光效

**⚠️ 问题**: `san-shock` 使用 `filter` 动画影响整个 `#app` 容器（含所有 DOM 子树），在复杂 UI 状态下可能造成明显卡顿。建议缩小影响范围或使用 overlay 方案。

### 5.3 过渡动画

**✅ 良好实践**:
- 统一过渡变量: `--transition-fast: 0.15s` / `--transition-normal: 0.25s`
- 按钮 active 状态缩放反馈
- Action Wheel 扇出动画 (CSS keyframes + staggered delays)
- Tooltip 入场动画

**⚠️ 问题**:
- Action Wheel 的 SVG 动画（`apex-fan-sweep`）使用 `stroke-dashoffset` — 性能可接受，但需关注
- `.apex-action-fan__slice` 使用 `transition` 而非 `will-change` — 首次悬停可能产生 1 帧延迟

### 5.4 无障碍动画

**✅ 完整实现**:
```css
@media (prefers-reduced-motion: reduce) {
    /* 禁用所有动画 */
    .apex-action-fan-backdrop, .apex-action-fan, .apex-action-fan__label,
    .apex-action-fan__hub-glow, .apex-action-fan__rim-sweep,
    .apex-action-wheel-trigger__ring, .apex-action-wheel-trigger__cone {
        animation: none !important;
    }
}
```

JS 层也有 `prefersReducedMotion()` 检查（`anime.mjs`）。

---

## 6. 📋 优先级修复清单

### 🔴 严重 (P0 — 应立即修复)

| 序号 | 问题 | 影响 | 修复工作量 |
|------|------|------|-----------|
| 1 | `pdf.worker.min.js` (1.1MB) 在 `<head>` 同步加载 | 首屏延迟 ~2-3s | 小 — 移到按需加载 |
| 2 | 所有 vendor 脚本缺少 `defer` | 阻塞 HTML 解析 | 小 — 添加 defer 属性 |
| 3 | 无 `color-scheme: dark` | 原生控件白闪烁 | 极小 — 1 行 CSS |
| 4 | 无滚动条样式 | Windows 浅色滚动条 | 小 — 10 行 CSS |

### 🟡 中等 (P1 — 应在下一迭代修复)

| 序号 | 问题 | 影响 | 修复工作量 |
|------|------|------|-----------|
| 5 | `.story-panel will-change` 永久激活 | 持续占用 GPU 内存 | 小 — 动态控制 |
| 6 | `dice_canvas.js` 粒子无上限 | 快速操作可能卡顿 | 小 — 添加上限常量 |
| 7 | `canvas_chat.mjs` layout 每次重算 | 大历史卡顿 | 中 — 重构缓存策略 |
| 8 | 战斗/SAN filter 动画影响全页面 | 低端设备卡顿 | 中 — 缩小范围 |
| 9 | Body `ambient-breathe` 持续动画 | 空闲时仍耗资源 | 小 — 添加 `pause` 逻辑 |

### 🟢 建议 (P2 — 性能优化)

| 序号 | 建议 | 收益 |
|------|------|------|
| 10 | `bootstrap.min.css` PurgeCSS 裁剪 | 减少 ~150KB CSS |
| 11 | `dice_canvas` 渐变缓存 | 减少每帧 GC 压力 |
| 12 | 战斗面板 GPU 层提升 | 战斗动画更流畅 |
| 13 | `::selection` 选中色主题化 | 视觉一致性 |

---

## 7. 📈 总体评分

| 维度 | 评分 | 评语 |
|------|------|------|
| CSS 性能 | **7.5/10** | contain 和 transform 使用良好，will-change 需调优 |
| Canvas 渲染 | **6.5/10** | 粒子系统扎实，chat canvas 仍为原型 |
| 资源加载 | **4/10** | 同步阻塞严重，vendor 体积大 |
| 暗黑主题 | **7/10** | 覆盖面广但缺滚动条/选中/color-scheme |
| 动画系统 | **8.5/10** | 战斗 + SAN 特效完整，无障碍覆盖良好 |
| **综合** | **6.7/10** | 视觉效果好，加载性能是主要短板 |

---

*生成于 CCGS TA Review Pipeline v1.0 · CoC V18.1*
