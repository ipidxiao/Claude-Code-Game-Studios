# Shell / 按屏拆包计划（V18.6）

入口：`index.html` → `js/app.mjs`（唯一 ESM boot）。`npm run build:assets` 同步 `sw.js` ASSETS。

## 屏幕路由

| Screen | Component | 加载 |
|---|---|---|
| lobby* | `view-lobby` | eager |
| creator | `view-creator` | async |
| story | `view-story` | async（顺带 `story_*`） |
| devlog | `view-dev-log` | async |

## Boot

| 模块 | 状态 |
|---|---|
| `mount_shell_globals.mjs` | 仅 `CoCState` SoT |
| `shell_side_effects_lobby/shared` | eager（shared 含 `campaign_loader` → `story_opening`） |
| `shell_side_effects_story.mjs` | **无 eager import**（R29.11） |
| `scenario/ensure_runner.mjs` | lobby/creator `await startScenarioById` → `import('./runner.mjs')` |
| `async_views.mjs` | creator/story/devlog |

## Runner 延后（R29.11）

- 大厅 / 角色创建在 `switchScreen('story')` **之前** `await startScenarioById`
- `group_check` 随 runner 动态图加载；`story_chat` 另 ESM import
- `story_opening` 仍在 **shared**（`campaign_loader`）供自由探索 `switchScreen('story')`
- `ai_logic` 用 `getScenarioRunner()`（不静态 import runner）

## 阶段进度

1–4b ~~完成~~ · **R29.11 runner 延后** · 壳层主线完成。

不做：A–F；改 Vue 反应核。
