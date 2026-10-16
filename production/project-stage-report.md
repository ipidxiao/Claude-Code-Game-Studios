# Project Stage Analysis

**Date**: 2026-10-16
**Stage**: Production（观测值；`project.yaml` 中未配置 `project.stage`）
**Stage Confidence**: CONCERNS — 代码规模明确指向 Production，但框架层面的前置信息（引擎、概念/简报、rigor）全部缺失，且代码根目录不在框架支持的三种引擎之内

## 项目概况

`src/` 是一款浏览器端《克苏鲁的呼唤》第 7 版 AI 主持跑团游戏（CoC Engine V18.7-ParadoxFree，修订号 R30，存档结构第 8 版）。
技术栈：原生 ES 模块（`.mjs`）+ Vue（vendor 内置）+ PWA（`sw.js`），Node 22 跑冒烟测试，Playwright 跑浏览器测试。
它已经过 R1–R30 多轮迭代，有完整发版说明，是一个处于持续开发中的成熟项目，而不是新项目。

## Completeness Overview

- **Design**: 0%（框架格式）— `design/` 下没有任何文档：无 game-concept / game-brief、无 systems-index、无 GDD、无 art bible。设计信息分散在代码（`src/js/data/`，约 5.2 万行规则表与剧本数据）、`src/docs/` 发版说明与 `src/*_AUDIT.md` 审计报告中。
- **Code**: 高 — `src/js/` 283 个文件，约 7.6 万行。主要系统：
  - `data/`（156 文件，51.7k 行）：规则表、剧本、NPC、物品、疾病、疯狂表等
  - `components/`（22，6.1k）：UI 组件（角色、战斗、背包、线索、地图等）
  - `engines/`（19，5.9k）：规则引擎
  - `state/`（18，5.2k）：状态与存档
  - `tools/`（14，5.0k）：AI 工具调用
  - `scenario/`（13，4.1k）：剧本运行器
  - `campaign/`（3，2.7k）、`views/`（4，2.2k）、`ai/`（10，1.1k）、`rules/`（8，0.7k）
  - 内置剧本约 19 个（教程、废弃疗养院、灯塔夜班、假面嘉年华、无尽列车等）
- **Architecture**: 0%（框架格式）— 无 `docs/architecture/`、无 ADR。已有非标准架构资料：`src/docs/SHELL_SPLIT_PLAN.md`、`src/MANIFEST.yaml`（文件归属）、`src/docs/TA_REVIEW_V18.md`、多份审计报告。
- **Production**: 无框架产物 — 无 epics / stories / sprints / milestones。迭代记录在 `src/CHANGELOG.md` 与 `src/docs/RELEASE_R*.md`。
- **Tests**: 有 — `src/tests/` 123 个 Node 冒烟测试 + 3 个 Playwright 用例，项目自带 `npm run ci:smoke` / `npm run ci` 门禁与覆盖率门。**本次未运行**，通过与否未验证。

## 框架配置状态

| 项 | 状态 |
|---|---|
| `engine.name` | 未配置 — 自研 JS/Vue 网页引擎，`/setup-engine` 只支持 Godot / Unity / Unreal |
| 代码根目录 | `src/`（游戏已从 `game/` 移到 `src/`，框架按唯一候选目录识别） |
| `project.stage` | 未写入（`/start` 时用户选择不保存） |
| `modes.rigor` | 未写入 — 本次 `/start` 中用户选了 `full`，但未保存，配置解析回落到默认 `minimal` |
| `modes.automation` | 未写入 — 本次选了 `guided`，未保存 |
| CI | 仓库根无 `.github/workflows/`，PR 上没有检查在跑 |

配置的 stage 与观测的 stage 无法比较（前者为空），因此置信度给 CONCERNS。

> **更新（同日，报告之后）：** 已写入 `project.stage: Production`、`modes.rigor: standard`、
> `modes.automation: guided`、`engine.name: Custom-Web`，以及指向 `src/` 下 npm 脚本的
> `commands.test` / `commands.run`。游戏从 `game/` 移到了 `src/`，移动后在 `src/` 下 `npm ci && npm run ci:smoke` 全部通过（退出码 0）。上表反映的是分析当时的状态。

## Gaps Identified

按用户在 `/start` 中选的 `full` 档列出；如果最终保存为更低档位，第 2–4 条中的多数不再算缺口。

1. **引擎与 rigor 未登记。** 框架所有技能都靠 `project.yaml` 判断引擎、代码根与档位。`/setup-engine` 不支持自研网页引擎，需要手动在 `project.yaml` 写 `engine.name`（如 `custom-web`）、语言与代码根 `src/js/`，并保存 `modes.rigor`。问题：要按 `full` 保存，还是改为 `standard`？
2. **没有概念文档 / 简报。** 游戏已经成型，适合从现有代码和发版说明反推，而不是重新 `/brainstorm`。问题：是否用 `/reverse-document concept src/` 生成 `design/gdd/game-concept.md`？
3. **没有系统索引和 GDD。** 规则、剧本、AI 主持、存档、战斗、理智等都已实现但没有设计文档。问题：先 `/map-systems` 列出系统，再对核心系统逐个 `/reverse-document design src/js/<system>`？
4. **没有 ADR / 架构总览。** 已有拆包计划、文件归属和多份审计可作素材。问题：是否用 `/reverse-document architecture` 生成 `docs/architecture/architecture.md`，并把关键决定（ESM 单一源、AI 工具调用协议、存档版本）补成 ADR？
5. **仓库根没有 CI。** 游戏自带 `npm run ci:smoke`，但仓库没有工作流去跑它。问题：是否加一个 GitHub Actions 工作流在 `src/` 下跑 `ci:smoke`？
6. **测试未验证。** 需要在 `src/` 下 `npm ci && npm run ci:smoke` 确认当前基线是绿的。

## Recommended Next Steps

1. 登记引擎与 rigor 到 `project.yaml`（手动，写前给出草稿）。
2. 在 `src/` 跑一次 `npm run ci:smoke`，确认测试基线。
3. `/reverse-document concept src/` → 概念文档。
4. `/map-systems` → 系统索引；再按优先级对核心系统 `/reverse-document design`。
5. `/reverse-document architecture` → 架构总览与关键 ADR。
6. `/adopt` 审核反推出来的文档格式，然后 `/gate-check`。
