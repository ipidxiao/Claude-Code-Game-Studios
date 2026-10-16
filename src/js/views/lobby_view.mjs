// V18.1: 使用 CoCStateAccessor
// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { charFlags, charSanCurrent } from '../components/char_hud_helpers.mjs';
import { safeJsonParse } from '../data/utils.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCEngine } from '../coc.mjs';
import { getKpEngine, saveKpPreference } from '../state/kp_config.mjs';
import { applyKeeperStyle } from '../data/keeper_style.mjs';
import { startScenarioById } from '../scenario/ensure_runner.mjs';
import { CoCArcChapters } from '../data/arc_chapters.mjs';
import { assembleSessionManifest } from '../data/session_manifest.mjs';
import { CoCScenarioStore } from '../scenario/store.mjs';
import { CoCScenarioCatalog } from '../data/scenarios/catalog.mjs';
import { CoCCapabilitySystem } from '../data/capability_system.mjs';
import { CoCArcLedger } from '../state/arc_ledger.mjs';
import { CoCDeskPref } from '../data/desk_pref.mjs';
import { KpGameLoop } from '../campaign/kp_game_loop.mjs';

export const ViewLobby = {
      data() { return { autoSave: null, saveSlots: [], modules: [], modulesLoading: true, newModName: '', editingModId: null, editingModName: '', rememberKey: false, scenarios: [], pendingScenarioId: null, storeItems: [], selectedStoreId: null, storeSearch: '', storeTagFilter: '', capabilityFilter: '', storeLoading: false, storeError: '', publicCatalogBase: '', storeImportStep: '', storeImportDetail: '', deskCard: null, compareSlotA: '', compareSlotB: '', auditResult: null, auditTargetId: null, saveDiagnostics: null }; },
      template: `
          <div class="apex-lobby-root">
              <!-- ===== 模组选择界面 ===== -->
              <div v-if="gameState.currentScreen === 'modules'" class="apex-lobby-shell">
                  <header class="apex-lobby-header">
                      <button type="button" class="btn btn-sm apex-btn-ghost apex-lobby-back d-inline-flex align-items-center gap-1" @click="switchScreen('lobby')"><coc-icon name="arrow-left" :size="14"></coc-icon> 返回</button>
                      <h3 class="apex-lobby-header__title mb-0"><coc-icon name="storage" :size="18"></coc-icon> 模组管理</h3>
                      <span class="apex-lobby-header__spacer btn btn-sm" aria-hidden="true">占位</span>
                  </header>
                  <div class="text-center mb-4">
                      <div class="coc-section-subtitle">每个模组拥有独立的角色队伍与剧情存档</div>
                  </div>

                  <div v-if="modulesLoading" class="empty-state">
                      <coc-icon name="storage" :size="36" class="empty-state-icon empty-state-pulse"></coc-icon>
                      <div class="empty-state-title">正在加载模组…</div>
                  </div>

                  <div v-else-if="modules.length === 0" class="empty-state">
                      <coc-icon name="storage" :size="40" class="empty-state-icon"></coc-icon>
                      <div class="empty-state-title">尚无模组</div>
                      <div class="empty-state-hint">在下方创建你的第一个调查模组</div>
                  </div>

                  <div v-for="mod in modules" :key="mod.id" class="mb-3 p-3 apex-lobby-mod-card lobby-mod-card" :class="mod.id === gameState.activeModuleId ? 'apex-lobby-mod-card--active active' : ''">
                      <div v-if="editingModId === mod.id" class="d-flex gap-2 mb-1">
                          <input class="form-control form-control-sm apex-lobby-input flex-grow-1" v-model="editingModName" @keyup.enter="confirmRename(mod.id)" placeholder="模组名称">
                          <button type="button" class="btn btn-sm apex-btn-accent" @click="confirmRename(mod.id)">确认</button>
                          <button type="button" class="btn btn-sm apex-btn-ghost" @click="editingModId = null">取消</button>
                      </div>
                      <div v-else class="d-flex justify-content-between align-items-start">
                          <div class="flex-grow-1 me-2" style="min-width:0;">
                              <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                  <span class="apex-lobby-mod-name">{{ mod.name }}</span>
                                  <span v-if="mod.id === 'default'" class="apex-badge apex-badge--sm">默认</span>
                                  <span class="apex-badge apex-badge--sm ms-1" :class="mod.kpEnabled ? 'apex-badge--danger' : ''" :title="mod.kpEnabled ? 'KP 协议引擎已启用' : 'KP 协议引擎已关闭'">{{ mod.kpEnabled ? 'KP 开' : 'KP 关' }}</span>
                              </div>
                              <div v-if="mod.autoSave" class="apex-lobby-mod-meta">
                                  <span class="d-inline-flex align-items-center gap-1"><coc-icon name="character" :size="12"></coc-icon> {{ mod.autoSave.charNames }}</span>
                                  <span aria-hidden="true">·</span>
                                  <span class="d-inline-flex align-items-center gap-1"><coc-icon name="eye" :size="12"></coc-icon> {{ mod.autoSave.location }}</span><br>
                                  <span class="d-inline-flex align-items-center gap-1"><coc-icon name="storage" :size="12"></coc-icon> 自动存档：{{ mod.autoSave.savedAt }}</span>
                                  <div v-if="mod.autoSave.saveBlurb" class="text-secondary mt-1" style="font-size:0.68rem;line-height:1.35;">{{ mod.autoSave.saveBlurb }}</div>
                              </div>
                              <div v-else class="text-secondary" style="font-size:0.72rem;">尚无存档</div>
                          </div>
                          <div class="d-flex flex-column gap-1 flex-shrink-0">
                              <button type="button" class="btn btn-sm apex-btn-accent fw-bold d-inline-flex align-items-center gap-1" @click="doEnterModule(mod.id)"><coc-icon name="scroll" :size="12"></coc-icon> 进入</button>
                              <button type="button" class="btn btn-sm apex-btn-ghost py-0 lobby-mod-btn d-inline-flex align-items-center gap-1" @click="startRename(mod)"><coc-icon name="settings" :size="12"></coc-icon> 改名</button>
                              <button v-if="mod.id !== 'default'" type="button" class="btn btn-sm apex-btn-danger py-0 lobby-mod-btn" @click="doDeleteModule(mod.id)">删除</button>
                          </div>
                      </div>
                  </div>

                  <div class="apex-lobby-create-bar mt-2">
                      <div class="d-flex gap-2">
                          <input class="form-control form-control-sm apex-lobby-input flex-grow-1" v-model="newModName" placeholder="新模组名称（如：假面、独自对抗黑暗…）" @keyup.enter="doCreateModule">
                          <button type="button" class="btn btn-sm apex-btn-accent fw-bold" @click="doCreateModule" :disabled="!newModName.trim()">新建</button>
                      </div>
                  </div>
              </div>

              <!-- ===== 大厅界面 ===== -->
              <div v-if="gameState.currentScreen === 'lobby'" class="apex-lobby-shell apex-lobby-shell--center">
                  <div class="apex-lobby-hero lobby-hero">
                      <coc-icon name="elder" :size="72" class="apex-lobby-hero__logo lobby-hero-logo" title="CoC Engine"></coc-icon>
                      <div class="apex-lobby-hero__tagline lobby-hero-tagline">克苏鲁的呼唤 · 第七版守秘人引擎</div>
                  </div>
                  <h3 class="apex-lobby-title mb-1">模组大厅</h3>
                  <div class="apex-lobby-subtitle mb-4" v-if="currentModName"><coc-icon name="storage" :size="14"></coc-icon> {{ currentModName }}</div>

                  <div v-if="autoSave" class="apex-lobby-autosave lobby-autosave-banner">
                      <div class="d-flex justify-content-between align-items-center gap-2">
                          <div>
                              <div class="apex-lobby-autosave__label"><coc-icon name="storage" :size="14"></coc-icon> 检测到自动存档</div>
                              <div class="apex-lobby-autosave__meta">{{ autoSave.charNames }} · {{ autoSave.location }}</div>
                              <div class="apex-lobby-autosave__meta">{{ autoSave.savedAt }}</div>
                              <div v-if="autoSave.saveBlurb" class="apex-lobby-autosave__meta text-secondary mt-1" style="font-size:0.68rem;line-height:1.35;max-width:28rem;">{{ autoSave.saveBlurb }}</div>
                          </div>
                          <button type="button" class="btn btn-sm apex-btn-accent fw-bold flex-shrink-0 d-inline-flex align-items-center gap-1" @click="quickLoad"><coc-icon name="storage" :size="12"></coc-icon> 继续</button>
                      </div>
                  </div>

                  <button type="button" class="btn apex-lobby-action apex-lobby-action--primary lobby-action-btn" @click="switchScreen('roster')"><coc-icon name="character" :size="20"></coc-icon> 调查员小队管理</button>
                  <button type="button" class="btn apex-lobby-action apex-lobby-action--ghost lobby-action-btn" @click="openScenarios"><coc-icon name="scroll" :size="20"></coc-icon> 本地剧本模式</button>
                  <button type="button" class="btn apex-lobby-action apex-lobby-action--ghost lobby-action-btn" @click="openScenarioStore"><coc-icon name="storage" :size="20"></coc-icon> 模组库</button>
                  <button type="button" class="btn apex-lobby-action apex-lobby-action--ghost lobby-action-btn" @click="switchScreen('settings')"><coc-icon name="settings" :size="20"></coc-icon> AI 引擎设置</button>
                  <div class="apex-lobby-kp-panel lobby-kp-panel" :class="gameState.kpEngine?.enabled ? 'apex-lobby-kp-panel--active active' : ''">
                      <div class="form-check form-switch mb-2">
                          <input class="form-check-input" type="checkbox" id="kpEngineToggle" :checked="gameState.kpEngine?.enabled" @change="toggleKpEngine($event)" aria-describedby="kp-engine-desc">
                          <label class="form-check-label apex-lobby-kp-panel__label" for="kpEngineToggle"><coc-icon name="settings" :size="14"></coc-icon> KP 协议引擎</label>
                      </div>
                      <div id="kp-engine-desc" class="text-muted" style="font-size:0.72rem;">默认开启（有意设计）。KP 协议在代码层执行行动校验、缩放与五段输出；关闭后仍保留部分底层校验。</div>
                      <div v-if="gameState.kpEngine?.enabled" class="apex-lobby-kp-stats lobby-kp-stats mt-2">
                          注意力 {{ gameState.kpState?.ATTENTION_LEVEL ?? gameState.kpEngine?.global?.attention ?? 0 }} ·
                          战力 {{ gameState.kpState?.PLAYER_POWER ?? gameState.kpEngine?.global?.playerPower ?? 0 }} ·
                          阶段 {{ gameState.kpState?.PHASE ?? gameState.kpEngine?.global?.phase ?? 'CALM' }}
                      </div>
                  </div>
                  <div class="apex-lobby-grid mb-2">
                      <button type="button" class="btn apex-lobby-action apex-lobby-action--ghost apex-lobby-action--sm mb-0 d-inline-flex align-items-center justify-content-center gap-1" @click="switchScreen('saves')"><coc-icon name="storage" :size="16"></coc-icon> 存档管理</button>
                      <button type="button" class="btn apex-lobby-action apex-lobby-action--ghost apex-lobby-action--sm mb-0 d-inline-flex align-items-center justify-content-center gap-1" @click="backToModules"><coc-icon name="storage" :size="16"></coc-icon> 切换模组</button>
                  </div>
                  <button type="button" class="btn apex-lobby-action apex-lobby-action--ghost apex-lobby-action--sm mb-0 d-inline-flex align-items-center justify-content-center gap-1" @click="switchScreen('devlog')"><coc-icon name="journal" :size="16"></coc-icon> 开发者日志</button>
              </div>

              <!-- ===== 本地剧本选择 ===== -->
              <div v-if="gameState.currentScreen === 'scenarios'" class="apex-lobby-shell">
                  <header class="apex-lobby-header">
                      <h3 class="apex-lobby-header__title mb-0"><coc-icon name="scroll" :size="18"></coc-icon> 本地剧本</h3>
                      <button type="button" class="btn btn-sm apex-btn-ghost apex-lobby-back d-inline-flex align-items-center gap-1" @click="switchScreen('lobby')"><coc-icon name="arrow-left" :size="14"></coc-icon> 返回</button>
                  </header>
                  <div class="text-muted small mb-3">无需 AI 与网络，由内置剧本驱动剧情。首次在线加载后完全离线可玩。</div>
                  <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
                      <label class="text-muted small mb-0">能力筛</label>
                      <select class="form-select form-select-sm apex-lobby-input" style="max-width:12rem;" v-model="capabilityFilter" aria-label="能力标签筛选">
                          <option value="">全部</option>
                          <option v-for="cap in capabilityGlossary" :key="cap.id" :value="cap.id">{{ cap.label }}</option>
                      </select>
                      <span v-if="capabilityFilterGloss" class="text-secondary" style="font-size:0.68rem;max-width:28rem;line-height:1.35;">{{ capabilityFilterGloss }}</span>
                  </div>
                  <div v-if="chapterMapRows.length" class="apex-panel apex-panel--compact mb-3">
                      <div class="fw-bold text-light small mb-2">短模战役链
                          <span v-if="recommendedNext" class="apex-badge apex-badge--sm ms-2">下一本：{{ recommendedNext.title }}</span>
                      </div>
                      <div v-if="chapterProgress" class="mb-2">
                          <div class="d-flex justify-content-between align-items-center gap-2">
                              <div class="text-secondary" style="font-size:0.68rem;">{{ chapterProgress.label }}</div>
                              <button v-if="recommendedNext" type="button" class="btn btn-sm apex-btn-accent py-0"
                                  @click="focusRecommendedChapter">打开下一本</button>
                          </div>
                          <div class="mt-1" style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                              <div :style="{ width: Math.round(chapterProgress.doneRatio * 100) + '%', height: '100%', background: 'rgba(125, 211, 252, 0.65)' }"></div>
                          </div>
                      </div>
                      <div class="d-flex flex-wrap gap-2" ref="chapterMapEl">
                          <button v-for="node in chapterMapRows" :key="node.id" type="button"
                              class="btn btn-sm"
                              :class="{
                                  'apex-btn-accent': node.status === 'playable' || node.recommended,
                                  'apex-btn-ghost': (node.status === 'done' || node.status === 'locked') && !node.recommended,
                                  'opacity-50': node.status === 'locked'
                              }"
                              :disabled="node.status === 'locked'"
                              :title="node.unlockHint || node.title"
                              :data-chapter-id="node.id"
                              @click="openChapterNode(node)">
                              <span v-if="node.recommended">★ </span>
                              <span v-if="node.status === 'done'">✓ </span>
                              <span v-else-if="node.status === 'locked'">🔒 </span>
                              {{ node.title }}
                              <span v-if="node.recommended" class="apex-badge apex-badge--sm ms-1">下一本</span>
                          </button>
                      </div>
                      <div class="text-secondary mt-2" style="font-size:0.68rem;">已完成 / 可玩 / 未解锁 · 点击可玩节点打开桌规卡</div>
                      <div class="mt-2">
                          <button type="button" class="btn btn-sm apex-btn-ghost" @click="auditSelectedScenario"
                              :disabled="!deskCard && !auditTargetId">校验当前剧本</button>
                          <span v-if="auditResult" class="small ms-2"
                              :class="auditResult.ok ? 'text-success' : 'text-warning'">{{ auditResult.summary }}</span>
                      </div>
                      <div v-if="auditResult && auditResult.errors && auditResult.errors.length" class="text-warning small mt-1">
                          <div v-for="(err, i) in auditResult.errors.slice(0, 8)" :key="'ae'+i">· {{ err }}</div>
                      </div>
                  </div>
                  <div v-if="deskCard" class="apex-panel apex-panel--compact mb-3">
                      <div class="fw-bold text-light small mb-2">今晚桌规卡</div>
                      <div class="text-muted small mb-2">剧本：{{ deskCard.title }}</div>
                      <div v-if="deskCard.capabilityPreviewLine" class="text-info small mb-2">{{ deskCard.capabilityPreviewLine }}</div>
                      <div v-if="deskCard.capabilityPreview && deskCard.capabilityPreview.length" class="mb-2 d-flex flex-wrap gap-1">
                          <span v-for="cap in deskCard.capabilityPreview" :key="'dc'+cap"
                              class="apex-badge apex-badge--sm" :title="capabilityGloss(cap)">{{ cap }}</span>
                      </div>
                      <div v-if="deskCard.contractHealth" class="mb-2"
                          :class="deskCard.contractHealth.ok ? 'text-success' : 'text-warning'"
                          style="font-size:0.72rem;">{{ deskCard.contractHealth.summary }}</div>
                      <div class="mb-2">
                          <label class="form-label text-muted small mb-1" for="desk-keeper-style">桌规风格</label>
                          <select id="desk-keeper-style" class="form-select form-select-sm apex-lobby-input" v-model="deskCard.keeperStyle">
                              <option value="strict">严苛</option>
                              <option value="cinematic">电影</option>
                              <option value="pulp_lite">轻Pulp</option>
                          </select>
                      </div>
                      <div class="text-secondary mb-2" style="font-size:0.72rem;">规则档将随桌规切换：{{ deskRulesetHint }}</div>
                      <div v-if="deskCard.carrySummary && deskCard.carrySummary.hasSnapshot" class="row g-2 mb-2">
                          <div class="col-6">
                              <div class="apex-lobby-alert apex-lobby-alert--info py-2 h-100">
                                  <div class="fw-bold small mb-1">继承将带走</div>
                                  <div class="small">调查员：{{ deskCard.carrySummary.names }}</div>
                                  <div class="small">物品 {{ deskCard.carrySummary.itemCount }} · 热度下限 {{ deskCard.carrySummary.heat }} · 标记 {{ deskCard.carrySummary.flagCount }}</div>
                                  <div class="small text-secondary mt-1">线索板不整板迁移；章节解锁保留</div>
                              </div>
                          </div>
                          <div class="col-6">
                              <div class="apex-lobby-alert py-2 h-100" style="border-color:rgba(248,113,113,0.35);">
                                  <div class="fw-bold small mb-1">重置将清空</div>
                                  <div class="small">物品仓与仓库、热度归 0、不应用带走标记</div>
                                  <div class="small">现有调查员 HP/SAN/MP 回满</div>
                                  <div class="small text-secondary mt-1">章节解锁元数据仍保留</div>
                              </div>
                          </div>
                      </div>
                      <div v-if="deskCard.carrySummary && deskCard.carrySummary.hasSnapshot" class="d-flex flex-column gap-2">
                          <button type="button" class="btn btn-sm"
                              :class="deskCard.preferredCarry === 'inherit' ? 'apex-btn-accent' : 'apex-btn-ghost'"
                              @click="confirmDeskCard('inherit')">继承档案与收获开局{{ deskCard.preferredCarry === 'inherit' ? '（默认）' : '' }}</button>
                          <button type="button" class="btn btn-sm"
                              :class="deskCard.preferredCarry === 'reset' ? 'apex-btn-accent' : 'apex-btn-ghost'"
                              @click="confirmDeskCard('reset')">重置调查员后开局{{ deskCard.preferredCarry === 'reset' ? '（默认）' : '' }}</button>
                          <button type="button" class="btn btn-sm apex-btn-ghost" @click="deskCard = null">取消</button>
                      </div>
                      <div v-else class="d-flex gap-2">
                          <button type="button" class="btn btn-sm apex-btn-accent" @click="confirmDeskCard(null)">确认开局</button>
                          <button type="button" class="btn btn-sm apex-btn-ghost" @click="deskCard = null">取消</button>
                      </div>
                  </div>
                  <div class="apex-lobby-scenario-grid">
                      <div v-for="sc in filteredScenarios" :key="sc.id" class="apex-lobby-scenario-card lobby-scenario-card"
                          :class="{ 'opacity-50': sc.chapterLocked }">
                          <span v-if="sc.lengthTier" class="apex-lobby-scenario-card__length apex-badge apex-badge--sm" :class="lengthTierClass(sc.lengthTier)">{{ sc.lengthTier }}</span>
                          <div class="apex-lobby-scenario-card__title">{{ sc.title }}
                              <span v-if="sc.readsArcLedger || sc.continuesArc" class="apex-badge apex-badge--sm ms-1">可接续</span>
                              <span v-if="sc.chapterLocked" class="apex-badge apex-badge--sm apex-badge--warn ms-1">未解锁</span>
                          </div>
                          <div v-if="sc.subtitle" class="text-info small">{{ sc.subtitle }}</div>
                          <div v-if="sc.chapterLocked" class="text-warning small mt-1">{{ sc.unlockHint || '先完成前置短模以解锁本章' }}</div>
                          <div v-if="!sc.chapterLocked && deskCarryHint" class="text-info small mt-1">{{ deskCarryHint }}</div>
                          <div class="text-muted small mt-1">{{ sc.description }}</div>
                          <div class="apex-lobby-scenario-card__meta">{{ sc.era }} · 约 {{ sc.estimatedMinutes || '?' }} 分钟 · {{ sc.nodeCount }} 节点</div>
                          <div v-if="sc.tags && sc.tags.length" class="text-secondary mt-1" style="font-size:0.68rem;">{{ (sc.tags || []).join(' · ') }}</div>
                          <button type="button" class="btn btn-sm apex-btn-accent fw-bold mt-2 d-inline-flex align-items-center gap-1"
                              :disabled="sc.chapterLocked"
                              @click="openDeskCard(sc)"><coc-icon name="dice" :size="12"></coc-icon> 开始剧本</button>
                      </div>
                  </div>
                  <div v-if="!filteredScenarios.length" class="empty-state empty-state-compact py-3">
                      <coc-icon name="scroll" :size="36" class="empty-state-icon"></coc-icon>
                      <div class="empty-state-title">暂无可用剧本</div>
                      <div class="empty-state-hint">可从模组库下载或导入 JSON 剧本</div>
                  </div>
              </div>

              <!-- ===== 模组库 ===== -->
              <div v-if="gameState.currentScreen === 'scenario_store'" class="apex-lobby-shell">
                  <header class="apex-lobby-header">
                      <h3 class="apex-lobby-header__title mb-0"><coc-icon name="storage" :size="18"></coc-icon> 模组库</h3>
                      <button type="button" class="btn btn-sm apex-btn-ghost apex-lobby-back d-inline-flex align-items-center gap-1" @click="switchScreen('lobby')"><coc-icon name="arrow-left" :size="14"></coc-icon> 返回</button>
                  </header>
                  <div class="text-muted small mb-3">浏览内置、可下载与 Chaosium 官方模组。官方 PDF 可「一键导入并转换」为本地剧本（仅存 IndexedDB，个人使用）。亦可自行导入 JSON。详见 <code>docs/CHAOSIUM_LICENSING.md</code>。</div>
                  <div class="apex-lobby-alert apex-lobby-alert--info" role="note"><coc-icon name="eye" :size="14"></coc-icon><span>Chaosium 官方模组版权归 Chaosium。转换在浏览器本地完成，请勿再分发转换后的剧情 JSON。</span></div>
                  <div class="apex-panel apex-panel--compact mb-3">
                      <label class="form-label text-muted small mb-1">公开资源基址（可选）</label>
                      <div class="input-group input-group-sm">
                          <input class="form-control apex-lobby-input" v-model="publicCatalogBase" placeholder="https://example.com/coc-engine/" @keyup.enter="savePublicCatalogBase">
                          <button type="button" class="btn btn-sm apex-btn-accent" @click="savePublicCatalogBase">保存</button>
                      </div>
                      <div class="text-secondary mt-1" style="font-size:0.72rem;">可将引擎 ZIP 部署到任意公开静态网站，在此填写基址 URL 即可下载扩展模组。留空则仅使用同域包（完全离线）。</div>
                  </div>
                  <div v-if="storeUsesFallback" class="apex-lobby-alert apex-lobby-alert--warn" role="alert"><coc-icon name="tentacle" :size="14"></coc-icon><span>IndexedDB 不可用，已降级为 localStorage（容量有限）。</span></div>
                  <div class="row g-2 mb-3">
                      <div class="col-md-6">
                          <input class="form-control form-control-sm apex-lobby-input" v-model="storeSearch" placeholder="搜索标题或描述…" @input="refreshStore">
                      </div>
                      <div class="col-md-6">
                          <select class="form-select form-select-sm apex-lobby-input" v-model="storeTagFilter" @change="refreshStore">
                              <option value="">全部标签</option>
                              <option v-for="tag in storeAllTags" :key="tag" :value="tag">{{ tag }}</option>
                          </select>
                      </div>
                  </div>
                  <div class="row g-3">
                      <div class="col-lg-7">
                          <div class="apex-lobby-store-grid">
                              <div v-for="item in filteredStoreItems" :key="item.id"
                                  class="apex-lobby-store-card"
                                  :class="selectedStoreId === item.id ? 'apex-lobby-store-card--selected' : ''"
                                  @click="selectStoreItem(item.id)">
                                  <div class="d-flex justify-content-between align-items-start gap-1">
                                      <div class="fw-bold text-warning small">{{ item.title }}</div>
                                      <span v-if="item.importOnly && item.status === 'downloaded' && item.convertedFromPdf" class="apex-badge apex-badge--sm flex-shrink-0 apex-badge--success">已转换 · 个人使用</span>
                                      <span v-else-if="item.importOnly && item.status === 'downloaded'" class="apex-badge apex-badge--sm flex-shrink-0 apex-badge--success">已导入</span>
                                      <span v-else-if="item.pdfConvert" class="apex-badge apex-badge--sm flex-shrink-0 apex-badge--info">官方 PDF · 可本地转换</span>
                                      <span v-else-if="item.importOnly" class="apex-badge apex-badge--sm flex-shrink-0 apex-badge--info">官方 · 需自行下载</span>
                                      <span v-else class="apex-badge apex-badge--sm flex-shrink-0" :class="storeStatusBadge(item.status)">{{ storeStatusLabel(item.status) }}</span>
                                  </div>
                                  <div class="text-muted" style="font-size:0.7rem;">{{ item.author }} · {{ item.license }}</div>
                                  <div class="text-secondary mt-1" style="font-size:0.72rem;line-height:1.3;">{{ (item.description || '').slice(0, 60) }}…</div>
                                  <div class="mt-1">
                                      <span v-for="t in (item.tags || []).slice(0, 3)" :key="t" class="apex-badge apex-badge--sm me-1">{{ t }}</span>
                                  </div>
                              </div>
                          </div>
                          <div v-if="!filteredStoreItems.length" class="text-muted text-center py-4">无匹配模组</div>
                      </div>
                      <div class="col-lg-5">
                          <div v-if="selectedStoreItem" class="apex-lobby-store-detail">
                              <h5 class="text-warning d-inline-flex align-items-center gap-2"><coc-icon name="scroll" :size="16"></coc-icon> {{ selectedStoreItem.title }}</h5>
                              <div v-if="selectedStoreItem.subtitle" class="text-info small">{{ selectedStoreItem.subtitle }}</div>
                              <div class="text-muted small mt-2">{{ selectedStoreItem.description }}</div>
                              <div class="mt-2 small">
                                  <div><span class="text-secondary">作者：</span>{{ selectedStoreItem.author }}</div>
                                  <div class="d-flex align-items-center gap-1 flex-wrap">
                                      <span class="text-secondary">许可：</span>
                                      <span class="apex-badge apex-badge--sm">{{ selectedStoreItem.license }}</span>
                                      <a v-if="selectedStoreItem.licenseUrl" :href="selectedStoreItem.licenseUrl" target="_blank" rel="noopener noreferrer" class="apex-badge apex-badge--sm apex-badge--info text-decoration-none">许可详情</a>
                                  </div>
                                  <div v-if="selectedStoreItem.source === 'remote' || selectedStoreItem.source === 'official'">
                                      <span class="text-secondary">资源：</span>
                                      <span v-if="selectedStoreItem.importOnly" class="apex-badge apex-badge--sm apex-badge--info">官方链接（无再分发）</span>
                                      <span v-else class="apex-badge apex-badge--sm"> {{ publicCatalogBase ? '公开网站 + 同域包' : '同域包（离线可用）' }}</span>
                                  </div>
                                  <div v-if="selectedStoreItem.officialUrl">
                                      <span class="text-secondary">官方页面：</span>
                                      <a :href="selectedStoreItem.officialUrl" target="_blank" rel="noopener noreferrer" class="small">{{ selectedStoreItem.officialUrl }}</a>
                                  </div>
                                  <div v-if="selectedStoreItem.status === 'downloaded' && selectedStoreItem.downloadSource">
                                      <span class="text-secondary">下载自：</span>
                                      <span class="apex-badge apex-badge--sm" :class="downloadSourceBadge(selectedStoreItem.downloadSource)">{{ downloadSourceLabel(selectedStoreItem.downloadSource) }}</span>
                                  </div>
                                  <div><span class="text-secondary">时长：</span>约 {{ selectedStoreItem.estimatedMinutes || selectedStoreItem.playTime || '?' }} 分钟</div>
                                  <div><span class="text-secondary">节点：</span>{{ selectedStoreItem.nodeCount || '?' }}</div>
                              </div>
                              <div class="mt-2">
                                  <span v-for="t in (selectedStoreItem.tags || [])" :key="t" class="apex-badge apex-badge--sm me-1 mb-1">{{ t }}</span>
                              </div>
                              <div v-if="storeError" class="text-danger small mt-2">{{ storeError }}</div>
                              <div v-if="storeImportStep" class="text-info small mt-2">{{ importProgressLabel(storeImportStep, storeImportDetail) }}</div>
                              <div class="d-flex flex-wrap gap-2 mt-3">
                                  <button v-if="selectedStoreItem.pdfConvert && selectedStoreItem.status !== 'downloaded'" type="button" class="btn btn-sm apex-btn-accent fw-bold d-inline-flex align-items-center gap-1" :disabled="storeLoading" @click="doImportOfficialOneClick(selectedStoreItem.id)">
                                      <coc-icon name="combat" :size="14"></coc-icon>
                                      {{ storeLoading ? importProgressLabel(storeImportStep, storeImportDetail) || '处理中…' : '一键导入并转换' }}
                                  </button>
                                  <label v-if="selectedStoreItem.pdfConvert && selectedStoreItem.status !== 'downloaded'" class="btn btn-sm apex-btn-ghost mb-0 d-inline-flex align-items-center gap-1" style="cursor:pointer;">
                                      <coc-icon name="scroll" :size="14"></coc-icon> 选择 PDF 转换
                                      <input type="file" accept=".pdf,application/pdf" style="display:none" @change="doImportOfficialPdfFile($event, selectedStoreItem.id)">
                                  </label>
                                  <button v-if="selectedStoreItem.importOnly && selectedStoreItem.officialUrl" type="button" class="btn btn-sm apex-btn-ghost d-inline-flex align-items-center gap-1" @click="openOfficialUrl(selectedStoreItem.officialUrl)">
                                      <coc-icon name="upload" :size="14"></coc-icon> 前往官方页面
                                  </button>
                                  <label v-if="selectedStoreItem.importOnly && selectedStoreItem.status !== 'downloaded' && !selectedStoreItem.pdfConvert" class="btn btn-sm apex-btn-ghost mb-0 d-inline-flex align-items-center gap-1" style="cursor:pointer;">
                                      <coc-icon name="download" :size="14"></coc-icon> 我已下载，导入本地 JSON
                                      <input type="file" accept=".json,application/json" style="display:none" @change="doImportOfficialPack($event, selectedStoreItem.id)">
                                  </label>
                                  <label v-if="selectedStoreItem.importOnly && selectedStoreItem.status !== 'downloaded' && selectedStoreItem.pdfConvert" class="btn btn-sm apex-btn-ghost mb-0 d-inline-flex align-items-center gap-1" style="cursor:pointer;">
                                      <coc-icon name="download" :size="14"></coc-icon> 导入 JSON
                                      <input type="file" accept=".json,application/json" style="display:none" @change="doImportOfficialPack($event, selectedStoreItem.id)">
                                  </label>
                                  <button v-if="selectedStoreItem.downloadable && selectedStoreItem.status === 'available'" type="button" class="btn btn-sm apex-btn-accent fw-bold d-inline-flex align-items-center gap-1" :disabled="storeLoading" @click="doDownloadScenario(selectedStoreItem.id)">
                                      <coc-icon name="download" :size="14"></coc-icon>
                                      {{ storeLoading ? '下载中…' : '下载到本地' }}
                                  </button>
                                  <button v-if="selectedStoreItem.status === 'downloaded'" type="button" class="btn btn-sm apex-btn-danger" :disabled="storeLoading" @click="doRemoveDownload(selectedStoreItem.id)">移除下载</button>
                                  <button v-if="selectedStoreItem.status !== 'available'" type="button" class="btn btn-sm apex-btn-accent fw-bold d-inline-flex align-items-center gap-1" @click="startLocalScenario(selectedStoreItem.id)"><coc-icon name="dice" :size="12"></coc-icon> 开始剧本</button>
                              </div>
                              <div v-if="selectedStoreItem.pdfConvert && selectedStoreItem.status !== 'downloaded'" class="text-secondary mt-2" style="font-size:0.68rem;line-height:1.4;">
                                  个人使用 · 版权归 Chaosium · 请勿再分发。转换在您的浏览器内完成，不会上传至引擎服务器。
                              </div>
                          </div>
                          <div v-else class="text-muted text-center py-5 apex-lobby-store-detail d-flex flex-column align-items-center justify-content-center gap-2">
                              <coc-icon name="arrow-left" :size="20"></coc-icon> 选择左侧模组查看详情
                          </div>
                      </div>
                  </div>
              </div>

              <!-- ===== 存档管理界面 ===== -->
              <div v-if="gameState.currentScreen === 'saves'" class="apex-lobby-shell">
                  <header class="apex-lobby-header">
                      <h4 class="apex-lobby-header__title mb-0"><coc-icon name="storage" :size="18"></coc-icon> 存档管理</h4>
                      <button type="button" class="btn btn-sm apex-btn-ghost apex-lobby-back d-inline-flex align-items-center gap-1" @click="switchScreen('lobby')"><coc-icon name="arrow-left" :size="14"></coc-icon> 返回</button>
                  </header>
                  <div class="apex-panel apex-panel--compact mb-3" :class="gameState.storageStatus.warning ? 'apex-save-storage--warn' : ''">
                      <div class="d-flex justify-content-between small">
                          <span class="text-muted">浏览器存储估算</span>
                          <span class="text-light">{{ formatStorageBytes(gameState.storageStatus.usedBytes) }} / {{ formatStorageBytes(gameState.storageStatus.quotaBytes) }}</span>
                      </div>
                      <div class="text-secondary" style="font-size:0.72rem;">当前战役预估存档 {{ formatStorageBytes(gameState.storageStatus.currentSaveBytes) }}；写入后约 {{ ((gameState.storageStatus.projectedRatio || 0) * 100).toFixed(1) }}%</div>
                      <div v-if="gameState.storageStatus.warning" class="apex-lobby-alert apex-lobby-alert--warn mt-2 mb-0 py-1"><coc-icon name="tentacle" :size="12"></coc-icon><span>{{ gameState.storageStatus.warning }}</span></div>
                  </div>
                  <div class="apex-panel apex-panel--compact mb-3">
                      <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
                          <div class="fw-bold text-light small">存档副本诊断</div>
                          <div class="d-flex gap-1">
                              <button type="button" class="btn btn-sm apex-btn-ghost" @click="refreshSaveDiagnostics">诊断</button>
                              <button type="button" class="btn btn-sm apex-btn-ghost" @click="downloadSaveDiagnostics" :disabled="!saveDiagnostics">导出报告</button>
                          </div>
                      </div>
                      <div v-if="!saveDiagnostics" class="text-secondary" style="font-size:0.72rem;">检查 localStorage 与 IndexedDB 的时间、合法性，以及当前选中的副本。</div>
                      <div v-else>
                          <div v-for="row in diagnosticRows" :key="row.fullKey" class="mb-2">
                              <div class="text-light" style="font-size:0.75rem;">{{ diagnosticSlotLabel(row.slotKey) }} · 选中 {{ diagnosticSourceLabel(row.selected) }}</div>
                              <div class="text-muted" style="font-size:0.68rem;">local {{ diagnosticReplicaLabel(row.local) }} · IDB {{ diagnosticReplicaLabel(row.idb) }}</div>
                              <div class="d-flex gap-1 mt-1">
                                  <button v-if="row.needsRepair" type="button" class="btn btn-sm apex-btn-accent" @click="confirmRepairSaveReplica(row.slotKey, false)">修复缺失副本</button>
                                  <button v-if="row.diverged" type="button" class="btn btn-sm apex-btn-accent" @click="confirmRepairSaveReplica(row.slotKey, true)">用选中副本覆盖</button>
                                  <button v-if="row.canCleanup" type="button" class="btn btn-sm apex-btn-danger" @click="confirmCleanupInvalidReplica(row.slotKey)">清理损坏副本</button>
                              </div>
                          </div>
                          <div v-if="diagnosticRows.length === 0" class="text-secondary" style="font-size:0.72rem;">当前模组没有可诊断的存档副本。</div>
                      </div>
                  </div>
                  <div v-for="slot in saveSlots" :key="slot.key" class="apex-lobby-save-slot">
                      <div class="d-flex justify-content-between align-items-center">
                          <div class="flex-grow-1 me-2">
                              <div class="fw-bold text-light small">{{ slot.label }}</div>
                              <div v-if="slot.hasData" class="text-muted" style="font-size:0.72rem;">{{ slot.charNames }} · {{ slot.location }}<br>{{ slot.savedAt }}</div>
                              <div v-if="slot.hasData && slot.saveBlurb" class="text-secondary mt-1" style="font-size:0.68rem;line-height:1.35;">{{ slot.saveBlurb }}</div>
                              <div v-else-if="!slot.hasData" class="text-secondary" style="font-size:0.72rem;">— 空槽位 —</div>
                          </div>
                          <div class="d-flex gap-1">
                              <button type="button" class="btn btn-sm apex-btn-accent" @click="lobbyLoad(slot.key)" :disabled="!slot.hasData">读取</button>
                              <button type="button" class="btn btn-sm apex-btn-danger" @click="lobbyDelete(slot.key)" :disabled="!slot.hasData">删</button>
                          </div>
                      </div>
                  </div>
                  <div class="apex-panel apex-panel--compact mb-3">
                      <div class="fw-bold text-light small mb-2">存档对比（只读）</div>
                      <div class="row g-2 mb-2">
                          <div class="col-6">
                              <select class="form-select form-select-sm apex-lobby-input" v-model="compareSlotA" aria-label="对比槽位A">
                                  <option value="">— A —</option>
                                  <option v-if="autoSave" value="auto">自动存档</option>
                                  <option v-for="slot in saveSlots.filter(s => s.hasData)" :key="'a'+slot.key" :value="slot.key">{{ slot.label }}</option>
                              </select>
                          </div>
                          <div class="col-6">
                              <select class="form-select form-select-sm apex-lobby-input" v-model="compareSlotB" aria-label="对比槽位B">
                                  <option value="">— B —</option>
                                  <option v-if="autoSave" value="auto">自动存档</option>
                                  <option v-for="slot in saveSlots.filter(s => s.hasData)" :key="'b'+slot.key" :value="slot.key">{{ slot.label }}</option>
                              </select>
                          </div>
                      </div>
                      <div v-if="compareLeft || compareRight" class="row g-2">
                          <div class="col-6">
                              <div class="text-muted" style="font-size:0.72rem;" v-if="compareLeft">{{ compareLeft.location }} · {{ compareLeft.savedAt }}</div>
                              <div class="text-secondary mt-1" style="font-size:0.68rem;line-height:1.35;" v-if="compareLeft">{{ compareLeft.saveBlurb || '（无摘要）' }}</div>
                              <div class="text-info mt-1" style="font-size:0.68rem;" v-if="compareLeft && compareLeft.arcLedgerBlurb">账本 {{ compareLeft.arcLedgerBlurb }}</div>
                              <div class="text-secondary mt-1" style="font-size:0.68rem;" v-if="compareDiffLine">{{ compareDiffLine }}</div>
                              <div class="text-warning mt-1" style="font-size:0.68rem;" v-if="compareMetaDiffLine">{{ compareMetaDiffLine }}</div>
                          </div>
                          <div class="col-6">
                              <div class="text-muted" style="font-size:0.72rem;" v-if="compareRight">{{ compareRight.location }} · {{ compareRight.savedAt }}</div>
                              <div class="text-secondary mt-1" style="font-size:0.68rem;line-height:1.35;" v-if="compareRight">{{ compareRight.saveBlurb || '（无摘要）' }}</div>
                              <div class="text-info mt-1" style="font-size:0.68rem;" v-if="compareRight && compareRight.arcLedgerBlurb">账本 {{ compareRight.arcLedgerBlurb }}</div>
                          </div>
                      </div>
                  </div>
                  <div class="border-top border-secondary pt-3 mt-2">
                      <div class="text-muted small mb-2">JSON 文件备份（跨设备转移）</div>
                      <div class="d-flex gap-2">
                          <button type="button" class="btn btn-sm apex-btn-accent flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1" @click="exportGame"><coc-icon name="download" :size="14"></coc-icon> 导出</button>
                          <label class="btn btn-sm apex-btn-ghost flex-grow-1 mb-0 d-inline-flex align-items-center justify-content-center gap-1" style="cursor:pointer;">
                              <coc-icon name="download" :size="14"></coc-icon> 导入<input type="file" accept=".json" style="display:none" @change="doLobbyImport($event)">
                          </label>
                      </div>
                  </div>
              </div>

              <!-- ===== AI 设置界面 ===== -->
              <div v-if="gameState.currentScreen === 'settings'" class="apex-lobby-shell apex-lobby-settings settings-panel">
                  <header class="apex-lobby-header">
                      <div class="d-flex align-items-center gap-2">
                          <button type="button" class="btn btn-sm apex-btn-ghost apex-lobby-back d-inline-flex align-items-center gap-1" @click="switchScreen('lobby')"><coc-icon name="arrow-left" :size="14"></coc-icon> 返回</button>
                          <h3 class="apex-lobby-header__title mb-0"><coc-icon name="settings" :size="18"></coc-icon> AI 引擎设置</h3>
                      </div>
                  </header>
                  <div class="mb-3">
                      <label class="form-label" for="settings-base-url">接口地址</label>
                      <input id="settings-base-url" type="text" class="form-control apex-lobby-input" v-model="gameState.aiSettings.baseUrl" aria-describedby="settings-base-url-hint" autocomplete="url">
                      <div id="settings-base-url-hint" class="form-field-hint">OpenAI / DeepSeek 等兼容 API 基址</div>
                  </div>
                  <div class="mb-3">
                      <label class="form-label" for="settings-api-key">API 密钥</label>
                      <input id="settings-api-key" type="password" class="form-control apex-lobby-input" v-model="gameState.aiSettings.apiKey" placeholder="DeepSeek / OpenAI 兼容密钥" aria-describedby="settings-api-key-hint" autocomplete="off">
                      <div id="settings-api-key-hint" class="form-field-hint d-inline-flex align-items-start gap-1"><coc-icon name="shield" :size="12"></coc-icon> 仅存于本机浏览器（localStorage / sessionStorage 明文），不会上传至引擎服务器；共用设备或勾选「记住密钥」时请自行评估风险</div>
                  </div>
                  <div class="apex-lobby-alert apex-lobby-alert--info settings-privacy-hint" role="note">
                      <strong>隐私说明：</strong>API 密钥以明文保存在浏览器本地存储中，引擎无后端服务器。清除站点数据或取消「记住密钥」后，关闭浏览器即会清除会话级密钥。使用联网守秘人时，行动、角色姓名和密钥会发送到接口地址中的主机。
                  </div>
                  <div v-if="!(gameState.aiSettings.apiKey || '').trim()" class="empty-state empty-state-compact empty-state-inline mb-3">
                      <coc-icon name="settings" :size="28" class="empty-state-icon"></coc-icon>
                      <div class="empty-state-title">未配置 API 密钥</div>
                      <div class="empty-state-hint">联网 AI 守秘人需要密钥；本地剧本模式无需配置</div>
                  </div>
                  <div class="mb-3">
                      <label class="form-label" for="settings-model">模型名称</label>
                      <input id="settings-model" type="text" class="form-control apex-lobby-input" v-model="gameState.aiSettings.model" aria-describedby="settings-model-hint">
                      <div id="settings-model-hint" class="form-field-hint">与接口提供商文档中的模型 ID 一致</div>
                  </div>
                  <div class="mb-3">
                      <label class="form-label" for="settings-difficulty">守秘人难度</label>
                      <select id="settings-difficulty" class="form-select apex-lobby-input settings-difficulty-select" v-model="gameState.aiSettings.difficultyPreset" @change="onDifficultyPresetChange($event)" aria-describedby="settings-difficulty-desc">
                          <option value="merciful">仁慈 — 宽容线索与判定</option>
                          <option value="standard">标准 — CoC 7e 默认</option>
                          <option value="brutal">致命 — 残酷后果</option>
                          <option value="divine_war">神战 — 神话战争级严苛模式</option>
                      </select>
                      <div id="settings-difficulty-desc" class="form-field-hint">影响 AI 守秘人的线索宽容度与后果严厉程度</div>
                      <div v-if="gameState.aiSettings.difficultyPreset === 'divine_war' && !gameState.kpEngine?.enabled" class="apex-lobby-alert apex-lobby-alert--warn settings-difficulty-hint mt-2 mb-0">
                          <coc-icon name="tentacle" :size="12"></coc-icon><span>神战预设建议启用 KP 协议引擎（大厅开关），以获得注意力、敌对组织与五段输出协议的完整 enforcement。</span>
                      </div>
                  </div>
                  <div class="mb-3">
                      <label class="form-label" for="settings-keeper-style">桌规风格</label>
                      <select id="settings-keeper-style" class="form-select apex-lobby-input" v-model="gameState.keeperStyle" @change="onKeeperStyleChange($event)" aria-describedby="settings-keeper-style-desc">
                          <option value="strict">严苛 — 7e-full，少跳检定</option>
                          <option value="cinematic">电影 — 7e-core，可推进场面</option>
                          <option value="pulp_lite">轻Pulp — pulp 档</option>
                      </select>
                      <div id="settings-keeper-style-desc" class="form-field-hint">切换规则档提示 + AI 工具倾向（不另开结算核）</div>
                  </div>
                  <div class="mb-3 form-check">
                        <input class="form-check-input" type="checkbox" id="rememberKey" v-model="rememberKey" style="background:#111;border-color:#555;">
                        <label class="form-check-label" for="rememberKey" style="font-size:0.7rem;color:#aaa;">记住密钥（跨会话保存；取消则关闭浏览器后自动清除）</label>
                  </div>
                  <button type="button" class="btn apex-btn-accent d-inline-flex align-items-center gap-1" @click="saveSettings(rememberKey)"><coc-icon name="storage" :size="14"></coc-icon> 保存</button>
              </div>

              <!-- ===== 调查员管理界面 ===== -->
              <div v-if="gameState.currentScreen === 'roster'" class="apex-lobby-shell">
                  <header class="apex-lobby-header">
                      <button type="button" class="btn btn-sm apex-btn-ghost apex-lobby-back d-inline-flex align-items-center gap-1" @click="switchScreen('lobby')"><coc-icon name="arrow-left" :size="14"></coc-icon> 返回</button>
                      <h3 class="apex-lobby-header__title mb-0"><coc-icon name="character" :size="18"></coc-icon> 调查员小队</h3>
                      <button type="button" class="btn btn-sm apex-btn-accent fw-bold d-inline-flex align-items-center gap-1" @click="switchScreen('story')" :disabled="gameState.roster.length === 0"><coc-icon name="scroll" :size="14"></coc-icon> 进入剧情</button>
                  </header>
                  <ul class="list-group list-group-flush mb-4">
                      <li v-if="gameState.roster.length === 0 && !hasDraftInvestigator" class="list-group-item apex-lobby-roster-item border-secondary">
                          <div class="empty-state empty-state-compact">
                              <coc-icon name="character" :size="36" class="empty-state-icon"></coc-icon>
                              <div class="empty-state-title">尚无调查员</div>
                              <div class="empty-state-hint">创建至少一名调查员后方可进入剧情</div>
                          </div>
                      </li>
                      <li v-if="hasDraftInvestigator" class="list-group-item apex-lobby-roster-item apex-lobby-roster-item--draft">
                          <div class="d-flex justify-content-between align-items-start">
                              <div>
                                  <strong class="text-warning">{{ draftDisplayName }}</strong>
                                  <span v-if="draftJobName" class="badge ms-1 badge-job">{{ draftJobName }}</span>
                                  <span class="apex-badge apex-badge--sm ms-1">编辑中</span><br>
                                  <span v-if="draftChar.derived.hp" class="badge badge-hp me-1">HP: {{ draftChar.derived.hp }}</span>
                                  <span v-if="draftChar.derived.san" class="badge badge-san me-1">SAN: {{ draftChar.derived.san }}</span>
                                  <span v-if="draftChar.attrs.STR > 0" class="badge" style="background:#3a3a4a; color:#cccccc;">STR: {{ draftChar.attrs.STR }}</span>
                              </div>
                              <button type="button" class="btn btn-sm apex-btn-ghost" @click="switchScreen('creator')">继续编辑</button>
                          </div>
                      </li>
                      <li v-for="(char, index) in gameState.roster" :key="index" class="list-group-item apex-lobby-roster-item">
                          <div class="d-flex justify-content-between align-items-start">
                              <div>
                                  <strong class="text-warning">{{ char.name }}</strong>
                                  <span v-if="char.jobName" class="badge ms-1 badge-job">{{ char.jobName }}</span>
                                  <span v-if="charFlags(char).isInsane" class="apex-badge apex-badge--sm apex-badge--danger ms-1">疯狂</span><br>
                                  <span class="badge badge-hp me-1">HP: {{ char.hp }}</span>
                                  <span class="badge badge-san me-1">SAN: {{ charSanCurrent(char) }}</span>
                                  <span v-if="char.attrs" class="badge me-1" style="background:#3a3a4a; color:#cccccc;">STR: {{ char.attrs.STR }}</span>
                                  <span v-if="char.attrs" class="badge me-1" style="background:#3a3a4a; color:#cccccc;">DEX: {{ char.attrs.DEX }}</span>
                                  <span v-if="char.skills" class="apex-badge apex-badge--sm">{{ Object.keys(char.skills).length }} 项技能</span>
                              </div>
                              <div class="d-flex flex-column align-items-end gap-1">
                                  <div class="form-check form-switch">
                                      <input class="form-check-input" type="checkbox" v-model="char.isActive">
                                      <label class="form-check-label small" style="color:#aaa;">{{ char.isActive ? '参与行动' : '暂离' }}</label>
                                  </div>
                                  <button type="button" class="btn btn-sm apex-btn-danger py-0" style="font-size:0.72rem;" @click="deleteInvestigator(index, char)">移除</button>
                              </div>
                          </div>
                      </li>
                  </ul>
                  <div class="d-flex gap-2">
                      <button type="button" class="btn apex-btn-ghost d-inline-flex align-items-center justify-content-center gap-1" @click="switchScreen('lobby')"><coc-icon name="arrow-left" :size="14"></coc-icon> 返回大厅</button>
                      <button type="button" class="btn apex-btn-accent flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1" @click="switchScreen('creator')"><coc-icon name="dice" :size="16"></coc-icon> 创建新调查员</button>
                  </div>
              </div>
          </div>
      `,
      computed: {
          currentModName() {
              const id = CoCStateAccessor.getGameState().activeModuleId;
              if (!id || id === 'default') return '默认模组';
              try {
                  const meta = safeJsonParse(localStorage.getItem('coc_module_' + id + '_meta'), {});
                  return meta.name || '未命名模组';
              } catch(e) { return ''; }
          },
          selectedStoreItem() {
              if (!this.selectedStoreId) return null;
              return this.storeItems.find((i) => i.id === this.selectedStoreId) || null;
          },
          storeAllTags() {
              const tags = new Set();
              (this.storeItems || []).forEach((i) => (i.tags || []).forEach((t) => tags.add(t)));
              return [...tags].sort();
          },
          filteredStoreItems() {
              let items = this.storeItems || [];
              const q = (this.storeSearch || '').trim().toLowerCase();
              if (q) {
                  items = items.filter((i) =>
                      (i.title || '').toLowerCase().includes(q) ||
                      (i.description || '').toLowerCase().includes(q) ||
                      (i.tags || []).some((t) => t.toLowerCase().includes(q))
                  );
              }
              if (this.storeTagFilter) {
                  items = items.filter((i) => (i.tags || []).includes(this.storeTagFilter));
              }
              return items;
          },
          hasDraftInvestigator() {
              const draft = this.draftChar || {};
              const attrs = draft.attrs || {};
              return !!((draft.name || '').trim() || draft.job || Number(attrs.STR) > 0);
          },
          draftDisplayName() {
              const name = this.draftChar && (this.draftChar.name || '').trim();
              return name || '未命名调查员';
          },
          draftJobName() {
              const job = this.draftChar && this.draftChar.job;
              return job && job.name ? job.name : '';
          },
          storeUsesFallback() {
              return CoCScenarioStore.usesLocalStorageFallback && CoCScenarioStore.usesLocalStorageFallback();
          },
          filteredScenarios() {
              const list = this.scenarios || [];
              const cap = this.capabilityFilter;
              if (!cap) return list;
              const Cap = CoCCapabilitySystem;
              return list.filter((s) => {
                  if ((s.tags || []).includes(cap)) return true;
                  if (Cap && Cap.previewScenarioCapabilities) {
                      return Cap.previewScenarioCapabilities(s).includes(cap);
                  }
                  return false;
              });
          },
          deskCarryHint() {
              try {
                  const gs = CoCStateAccessor && CoCStateAccessor.getGameState();
                  const summary = CoCArcLedger && CoCArcLedger.carrySummary
                      ? CoCArcLedger.carrySummary(gs && gs.arcLedger)
                      : null;
                  if (!summary || !summary.hasSnapshot) return '';
                  return '余波可继承：' + summary.names + ' · 物品 ' + summary.itemCount + ' · 热度 ' + summary.heat;
              } catch (_e) {
                  return '';
              }
          },
          chapterMapRows() {
              try {
                  const gs = CoCStateAccessor && CoCStateAccessor.getGameState();
                  const fn = CoCArcChapters && CoCArcChapters.chapterMapStatus;
                  if (!fn) return [];
                  const get = (id) => (CoCScenarioCatalog && CoCScenarioCatalog.get)
                      ? CoCScenarioCatalog.get(id)
                      : null;
                  const rows = fn(gs && gs.arcLedger, get);
                  const rec = CoCArcChapters.recommendNextChapter
                      ? CoCArcChapters.recommendNextChapter(gs && gs.arcLedger, get)
                      : null;
                  const recId = rec && rec.id;
                  return rows.map((r) => Object.assign({}, r, { recommended: !!(recId && r.id === recId) }));
              } catch (_e) {
                  return [];
              }
          },
          recommendedNext() {
              return (this.chapterMapRows || []).find((r) => r.recommended) || null;
          },
          chapterProgress() {
              const Cap = CoCCapabilitySystem;
              if (!Cap || !Cap.chapterMapProgress) return null;
              return Cap.chapterMapProgress(this.chapterMapRows || []);
          },
          capabilityGlossary() {
              const Cap = CoCCapabilitySystem;
              return (Cap && Cap.CAPABILITY_GLOSSARY) || [];
          },
          capabilityFilterGloss() {
              if (!this.capabilityFilter) return '';
              const Cap = CoCCapabilitySystem;
              return Cap && Cap.capabilityGloss ? Cap.capabilityGloss(this.capabilityFilter) : '';
          },
          compareDiffLine() {
              const a = this.compareLeft && this.compareLeft.arcMeta;
              const b = this.compareRight && this.compareRight.arcMeta;
              if (!a || !b) return '';
              const dHeat = (Number(a.heat) || 0) - (Number(b.heat) || 0);
              const dUnlock = (Number(a.unlockCount) || 0) - (Number(b.unlockCount) || 0);
              const snap = (a.hasSnapshot ? '有快照' : '无快照') + ' vs ' + (b.hasSnapshot ? '有快照' : '无快照');
              return '对比差：热度 ' + (dHeat >= 0 ? '+' : '') + dHeat
                  + ' · 解锁 ' + (dUnlock >= 0 ? '+' : '') + dUnlock
                  + ' · ' + snap;
          },
          compareMetaDiffLine() {
              const Cap = CoCCapabilitySystem;
              const a = this.compareLeft && this.compareLeft.saveCompareMeta;
              const b = this.compareRight && this.compareRight.saveCompareMeta;
              if (!Cap || !Cap.formatSaveCompareDiff || !a || !b) return '';
              return Cap.formatSaveCompareDiff(a, b);
          },
          deskRulesetHint() {
              if (!this.deskCard) return '';
              const map = { strict: '7e-full', cinematic: '7e-core', pulp_lite: 'pulp' };
              return map[this.deskCard.keeperStyle] || '7e-core';
          },
          diagnosticRows() {
              const slots = this.saveDiagnostics && this.saveDiagnostics.slots;
              return (slots || []).filter((row) => row.local.present || row.idb.present);
          },
          compareLeft() {
              return this._resolveCompareSlot(this.compareSlotA);
          },
          compareRight() {
              return this._resolveCompareSlot(this.compareSlotB);
          }
      },
      setup() {
          const state = CoCStateAccessor.getState();

          const quickLoad = async () => {
              const ok = await state.loadGame('auto');
              if (ok) { state.switchScreen('story'); state.scrollToBottom(); }
          };
          const lobbyLoad = async (slotKey) => {
              const okConfirm = await state.confirmAction('载入存档将覆盖当前游戏进度，确认吗？', { title: '读取存档' });
              if (!okConfirm) return;
              const ok = await state.loadGame(slotKey);
              if (ok) { state.switchScreen('story'); state.scrollToBottom(); }
          };
          const lobbyDelete = async (slotKey) => {
              const okConfirm = await state.confirmAction('确认删除该存档？', { title: '删除存档', danger: true, okText: '删除' });
              if (!okConfirm) return;
              const ok = await state.deleteSave(slotKey);
              state.showToast && state.showToast(ok ? '存档已删除。' : '存档删除失败。', ok ? 'success' : 'danger');
          };
          const doLobbyImport = async (event) => {
              const file = event.target.files[0]; if (!file) return;
              try { await state.importGame(file); state.switchScreen('story'); state.scrollToBottom(); state.showToast && state.showToast('导入成功。', 'success'); }
              catch(e) { state.showToast && state.showToast('导入失败：' + e, 'danger'); }
              event.target.value = '';
          };
          const deleteInvestigator = async (index, char) => {
              const name = char && char.name ? char.name : '该调查员';
              const ok = await state.confirmAction(`确认将 ${name} 从小队移除？`, { title: '移除调查员', danger: true, okText: '移除' });
              if (!ok) return;
              if (state.removeCharacterAt(index)) state.showToast && state.showToast(`${name} 已移除。`, 'success');
              else state.showToast && state.showToast('移除失败：调查员索引无效。', 'danger');
          };

          return Object.assign({}, state, { quickLoad, lobbyLoad, lobbyDelete, doLobbyImport, deleteInvestigator });
      },
      methods: {
          lengthTierClass(tier) {
              if (tier === '简单') return 'apex-badge--ok';
              if (tier === '标准') return 'apex-badge--warn';
              return 'apex-badge--info';
          },
          charFlags,
          charSanCurrent,
          diagnosticSlotLabel(slotKey) {
              return ({ auto: '自动存档', slot1: '槽位 1', slot2: '槽位 2', slot3: '槽位 3' })[slotKey] || slotKey;
          },
          diagnosticSourceLabel(source) {
              if (source === 'local') return 'localStorage';
              if (source === 'idb') return 'IndexedDB';
              return '无';
          },
          diagnosticReplicaLabel(replica) {
              if (!replica || !replica.present) return '缺失';
              if (!replica.valid) return '损坏';
              return (replica.savedAt || '未知时间') + (replica.location ? ' · ' + replica.location : '');
          },
          async refreshSaveDiagnostics() {
              this.saveDiagnostics = await CoCStateAccessor.diagnoseSaves();
          },
          async downloadSaveDiagnostics() {
              const report = await CoCStateAccessor.exportSaveDiagnostics();
              this.saveDiagnostics = report;
              CoCStateAccessor.showToast('诊断报告已导出。', 'success');
          },
          async confirmRepairSaveReplica(slotKey, overwriteValid) {
              const ok = await CoCStateAccessor.confirmAction(
                  overwriteValid
                      ? '将用选中副本覆盖另一份仍然有效的存档。覆盖前会保留原文备份，确认继续？'
                      : '将用选中副本补齐缺失或损坏的另一份存档。操作前会保留原文备份，确认继续？',
                  { title: '修复存档副本', danger: !!overwriteValid, okText: '修复' }
              );
              if (!ok) return;
              const result = await CoCStateAccessor.repairSaveReplica(slotKey, { confirmed: true, overwriteValid: !!overwriteValid });
              CoCStateAccessor.showToast(
                  result && result.ok ? '副本已修复，备份 ' + result.backupId : '修复未执行：' + ((result && result.reason) || '未知原因'),
                  result && result.ok ? 'success' : 'warning'
              );
              await this.refreshData();
              await this.refreshSaveDiagnostics();
          },
          async confirmCleanupInvalidReplica(slotKey) {
              const ok = await CoCStateAccessor.confirmAction('只删除损坏副本，有效副本会保留。删除前会保存原文备份，确认继续？', {
                  title: '清理损坏副本',
                  danger: true,
                  okText: '清理'
              });
              if (!ok) return;
              const result = await CoCStateAccessor.cleanupInvalidReplica(slotKey, { confirmed: true });
              CoCStateAccessor.showToast(
                  result && result.ok ? '损坏副本已清理，备份 ' + result.backupId : '清理未执行：' + ((result && result.reason) || '未知原因'),
                  result && result.ok ? 'success' : 'warning'
              );
              await this.refreshData();
              await this.refreshSaveDiagnostics();
          },
          async refreshData() {
              [this.autoSave, this.saveSlots] = await Promise.all([
                  CoCStateAccessor.getAutoSave(),
                  CoCStateAccessor.getSaveSlots()
              ]);
              this.modules = await CoCStateAccessor.getModules();
              this.modulesLoading = false;
              CoCStateAccessor.getStorageStatus('slot1', '预估存档');
          },
          async backToModules() {
              await this.refreshData();
              CoCStateAccessor.switchScreen('modules');
          },
          async doEnterModule(id) {
              CoCStateAccessor.enterModule(id);
              [this.autoSave, this.saveSlots] = await Promise.all([
                  CoCStateAccessor.getAutoSave(),
                  CoCStateAccessor.getSaveSlots()
              ]);
          },
          async doCreateModule() {
              const name = this.newModName.trim();
              if (!name) return;
              const id = CoCStateAccessor.createModule(name);
              this.newModName = '';
              this.modules = await CoCStateAccessor.getModules();
              CoCStateAccessor.enterModule(id);
              [this.autoSave, this.saveSlots] = await Promise.all([
                  CoCStateAccessor.getAutoSave(),
                  CoCStateAccessor.getSaveSlots()
              ]);
          },
          async doDeleteModule(id) {
              const ok = await CoCStateAccessor.confirmAction('删除模组将永久清除其所有存档，确认吗？', { title: '删除模组', danger: true, okText: '删除' });
              if (!ok) return;
              const deleted = await CoCStateAccessor.deleteModule(id);
              CoCStateAccessor.showToast(
                  deleted ? '模组已删除。' : '模组删除未完整完成，请重试。',
                  deleted ? 'success' : 'danger'
              );
              this.modules = await CoCStateAccessor.getModules();
          },
          startRename(mod) {
              this.editingModId = mod.id;
              this.editingModName = mod.name;
          },
          async confirmRename(id) {
              if (this.editingModName.trim()) {
                  CoCStateAccessor.renameModule(id, this.editingModName.trim());
                  this.modules = await CoCStateAccessor.getModules();
              }
              this.editingModId = null;
          },
          refreshScenariosList() {
              const store = CoCScenarioStore;
              const enrich = (list) => {
                  const gs = CoCStateAccessor.getGameState();
                  const ledger = gs && gs.arcLedger;
                  const gated = CoCArcChapters && CoCArcChapters.isChapterGatedAllowed;
                  return (list || []).map((i) => {
                      const full = (CoCScenarioCatalog && CoCScenarioCatalog.get)
                          ? CoCScenarioCatalog.get(i.id)
                          : (store && store.getScenario ? store.getScenario(i.id) : null);
                      const sc = full || i;
                      const chapterLocked = gated
                          ? !gated(sc, ledger)
                          : !!(sc.requiresChapterUnlock && !(ledger && ledger.chapters && (ledger.chapters.unlocked || []).includes(sc.id)));
                      return Object.assign({}, i, {
                          readsArcLedger: !!(sc.readsArcLedger || i.readsArcLedger),
                          continuesArc: !!(sc.readsArcLedger || sc.requiresChapterUnlock || i.continuesArc),
                          requiresChapterUnlock: !!(sc.requiresChapterUnlock || i.requiresChapterUnlock),
                          chapterLocked,
                          unlockHint: chapterLocked
                              ? (() => {
                                  const prereq = CoCArcChapters && CoCArcChapters.unlockPrerequisites
                                      ? CoCArcChapters.unlockPrerequisites(sc.id)
                                      : [];
                                  if (!prereq.length) return '先完成前置短模以解锁本章';
                                  const titles = prereq.map((id) => {
                                      const t = (CoCScenarioCatalog && CoCScenarioCatalog.get)
                                          ? CoCScenarioCatalog.get(id)
                                          : null;
                                      return (t && t.title) || id;
                                  });
                                  return '先完成：' + titles.join(' / ');
                              })()
                              : ''
                      });
                  });
              };
              if (store) {
                  store.init().then(() => {
                      if (CoCScenarioCatalog) CoCScenarioCatalog.refresh();
                      this.scenarios = enrich(store.listCatalog().filter((i) => store.isAvailable(i.id)));
                  });
              } else if (CoCScenarioCatalog) {
                  CoCScenarioCatalog.refresh();
                  this.scenarios = enrich(CoCScenarioCatalog.list());
              }
          },
          openScenarios() {
              this.refreshScenariosList();
              CoCStateAccessor.switchScreen('scenarios');
          },
          refreshScenarioStore() {
              this.storeError = '';
              const store = CoCScenarioStore;
              if (!store) return;
              store.init().then(() => {
                  if (CoCScenarioCatalog) CoCScenarioCatalog.refresh();
                  this.refreshStore();
              });
          },
          openScenarioStore() {
              const store = CoCScenarioStore;
              if (!store) {
                  CoCStateAccessor.showToast('模组库未加载。', 'danger');
                  return;
              }
              this.loadPublicCatalogBase();
              this.refreshScenarioStore();
              CoCStateAccessor.switchScreen('scenario_store');
          },
          loadPublicCatalogBase() {
              const store = CoCScenarioStore;
              if (store && store.getPublicCatalogBase) {
                  this.publicCatalogBase = store.getPublicCatalogBase() || '';
              }
          },
          savePublicCatalogBase() {
              const store = CoCScenarioStore;
              if (!store || !store.setPublicCatalogBase) return;
              const result = store.setPublicCatalogBase(this.publicCatalogBase);
              if (result && result.ok === false) {
                  CoCStateAccessor.showToast(result.error || '公开资源基址无效', 'danger');
                  this.publicCatalogBase = (result.value != null ? result.value : this.publicCatalogBase) || '';
                  return;
              }
              if (result && result.value != null) this.publicCatalogBase = result.value;
              CoCStateAccessor.showToast('公开资源基址已保存。', 'success');
          },
          refreshStore() {
              const store = CoCScenarioStore;
              if (!store) return;
              this.storeItems = store.listCatalog();
              if (this.selectedStoreId && !this.storeItems.find((i) => i.id === this.selectedStoreId)) {
                  this.selectedStoreId = null;
              }
          },
          selectStoreItem(id) {
              this.selectedStoreId = id;
              this.storeError = '';
          },
          storeStatusLabel(status) {
              return { builtin: '已内置', downloaded: '已下载', available: '可下载', official: '官方链接' }[status] || status;
          },
          storeStatusBadge(status) {
              return { builtin: 'apex-badge--warn', downloaded: 'apex-badge--success', available: '', official: 'apex-badge--info' }[status] || '';
          },
          downloadSourceLabel(source) {
              return { public: '公开网站', mirror: '公开网站', bundled: '同域包', fallback: '同域包', remote: '公开网站', import: '本地导入', official_pdf_converted: 'PDF 本地转换' }[source] || source;
          },
          downloadSourceBadge(source) {
              return { public: 'apex-badge--info', mirror: 'apex-badge--info', bundled: '', fallback: '', remote: 'apex-badge--info', import: 'apex-badge--warn', official_pdf_converted: 'apex-badge--warn' }[source] || '';
          },
          importProgressLabel(step, detail) {
              const labels = { download: '下载中…', parse: '解析 PDF…', convert: '生成剧情…', ai_chunk: 'AI 转换中…', done: '完成' };
              if (step === 'ai_chunk' && detail && detail.total) {
                  return `AI 转换中… (${detail.index || '?'}/${detail.total})`;
              }
              return labels[step] || step || '';
          },
          openOfficialUrl(url) {
              if (url) window.open(url, '_blank', 'noopener,noreferrer');
          },
          async doImportOfficialOneClick(catalogId) {
              const store = CoCScenarioStore;
              if (!store || !store.importOfficialOneClick) {
                  CoCStateAccessor.showToast('PDF 转换功能未加载。', 'danger');
                  return;
              }
              this.storeLoading = true;
              this.storeError = '';
              this.storeImportStep = 'download';
              this.storeImportDetail = '';
              try {
                  await store.importOfficialOneClick(catalogId, (step, detail) => {
                      this.storeImportStep = step;
                      this.storeImportDetail = detail || {};
                  });
                  this.refreshStore();
                  CoCStateAccessor.showToast('已导入，可在本地剧本模式游玩', 'success');
              } catch (e) {
                  this.storeError = String(e.message || e);
                  CoCStateAccessor.showToast('转换失败：' + this.storeError, 'danger');
              } finally {
                  this.storeLoading = false;
                  this.storeImportStep = '';
                  this.storeImportDetail = '';
              }
          },
          async doImportOfficialPdfFile(event, catalogId) {
              const file = event.target.files && event.target.files[0];
              event.target.value = '';
              if (!file) return;
              const store = CoCScenarioStore;
              if (!store || !store.importOfficialOneClick) return;
              this.storeLoading = true;
              this.storeError = '';
              this.storeImportStep = 'parse';
              try {
                  const arrayBuffer = await file.arrayBuffer();
                  await store.importOfficialOneClick(catalogId, (step, detail) => {
                      this.storeImportStep = step;
                      this.storeImportDetail = detail || {};
                  }, { arrayBuffer, forceRuleBased: true });
                  this.refreshStore();
                  CoCStateAccessor.showToast('已导入，可在本地剧本模式游玩', 'success');
              } catch (e) {
                  this.storeError = String(e.message || e);
                  CoCStateAccessor.showToast('转换失败：' + this.storeError, 'danger');
              } finally {
                  this.storeLoading = false;
                  this.storeImportStep = '';
                  this.storeImportDetail = '';
              }
          },
          async doImportOfficialPack(event, catalogId) {
              const file = event.target.files && event.target.files[0];
              event.target.value = '';
              if (!file) return;
              const store = CoCScenarioStore;
              if (!store || !store.importOfficialPack) {
                  CoCStateAccessor.showToast('导入功能未加载。', 'danger');
                  return;
              }
              this.storeLoading = true;
              this.storeError = '';
              try {
                  await store.importOfficialPack(catalogId, file);
                  this.refreshStore();
                  CoCStateAccessor.showToast('官方模组 JSON 已导入本地。', 'success');
              } catch (e) {
                  this.storeError = String(e.message || e);
                  CoCStateAccessor.showToast('导入失败：' + this.storeError, 'danger');
              } finally {
                  this.storeLoading = false;
              }
          },
          async doDownloadScenario(id) {
              const store = CoCScenarioStore;
              if (!store) return;
              this.storeLoading = true;
              this.storeError = '';
              try {
                  await store.downloadScenario(id);
                  this.refreshStore();
                  CoCStateAccessor.showToast('模组已下载到本地。', 'success');
              } catch (e) {
                  this.storeError = String(e.message || e);
                  const item = this.selectedStoreItem;
                  const pdfHint = item && item.pdfConvert ? ' 若已获取官方 PDF，可改用「选择 PDF 转换」。' : '';
                  CoCStateAccessor.showToast('下载失败：' + this.storeError + pdfHint, 'danger', { timeout: 8000 });
              } finally {
                  this.storeLoading = false;
              }
          },
          async doRemoveDownload(id) {
              const store = CoCScenarioStore;
              if (!store) return;
              const ok = await CoCStateAccessor.confirmAction('确认从本地移除该模组？（内置模组无法移除）', { title: '移除下载', danger: true, okText: '移除' });
              if (!ok) return;
              this.storeLoading = true;
              try {
                  await store.removeDownload(id);
                  this.refreshStore();
                  CoCStateAccessor.showToast('已移除本地模组。', 'success');
              } catch (e) {
                  CoCStateAccessor.showToast('移除失败。', 'danger');
              } finally {
                  this.storeLoading = false;
              }
          },
          async startLocalScenario(scenarioId) {
              const store = CoCScenarioStore;
              if (store && store.init) await store.init();
              if (CoCStateAccessor.getGameState().roster.length === 0) {
                  CoCStateAccessor.showToast('请先创建至少一名调查员，已打开创建页面。', 'warning');
                  this.pendingScenarioId = scenarioId;
                  CoCStateAccessor.getGameState().scenarioRunner.pendingScenarioId = scenarioId;
                  CoCStateAccessor.switchScreen('creator');
                  return;
              }
              const started = await startScenarioById(scenarioId);
              if (!started) {
                  const detail = store && !store.isAvailable(scenarioId)
                      ? '模组未在本地就绪，请重新下载或导入。'
                      : '剧本数据无效或 runner 未加载。';
                  CoCStateAccessor.showToast('剧本加载失败：' + detail, 'danger');
                  return;
              }
              this.pendingScenarioId = null;
              this.deskCard = null;
              CoCStateAccessor.getGameState().scenarioRunner.pendingScenarioId = null;
              CoCStateAccessor.switchScreen('story');
              CoCStateAccessor.scrollToBottom();
          },
          openDeskCard(sc) {
              const gs = CoCStateAccessor.getGameState();
              const Desk = CoCDeskPref;
              const pref = Desk && Desk.loadDeskPref ? Desk.loadDeskPref(sc.id) : null;

              const applyCard = (style, carry) => {
                  this.auditTargetId = sc.id;
                  this.auditResult = null;
                  if (pref && typeof pref.capabilityFilter === 'string' && Desk && Desk.isDeskPrefPromptEnabled && Desk.isDeskPrefPromptEnabled()) {
                      this.capabilityFilter = pref.capabilityFilter;
                  }
                  const man = assembleSessionManifest(gs, sc, {
                      keeperStyle: style,
                      preferredCarry: carry,
                      includeContractHealth: true
                  });
                  this.deskCard = {
                      id: man.id,
                      title: man.title,
                      keeperStyle: man.keeperStyle,
                      preferredCarry: man.preferredCarry,
                      carrySummary: man.carrySummary,
                      capabilityPreview: man.capabilityPreview,
                      capabilityPreviewLine: man.capabilityPreviewLine,
                      contractHealth: man.contractHealth,
                      manifestVersion: man.manifestVersion
                  };
              };

              let keeperStyle = (pref && pref.keeperStyle) || gs.keeperStyle || 'cinematic';
              let preferredCarry = (pref && pref.carryMode) || 'inherit';
              if (preferredCarry === 'none') preferredCarry = 'inherit';
              applyCard(keeperStyle, preferredCarry);

              if (Desk && Desk.isDeskPrefPromptEnabled && Desk.isDeskPrefPromptEnabled()) {
                  const body = Desk.formatDeskPrefPrompt(pref || Desk.emptyDeskPref());
                  CoCStateAccessor.confirmAction(body, {
                      title: '桌规偏好',
                      okText: '沿用',
                      cancelText: '手选'
                  }).then((ok) => {
                      if (!ok || !this.deskCard || this.deskCard.id !== sc.id) return;
                      const p = Desk.normalizeDeskPref(pref);
                      this.deskCard.keeperStyle = p.keeperStyle;
                      this.deskCard.preferredCarry = p.carryMode === 'none' ? 'inherit' : p.carryMode;
                      if (typeof p.capabilityFilter === 'string') this.capabilityFilter = p.capabilityFilter;
                  }).catch(() => {});
              }
          },
          capabilityGloss(id) {
              const Cap = CoCCapabilitySystem;
              return Cap && Cap.capabilityGloss ? Cap.capabilityGloss(id) : '';
          },
          focusRecommendedChapter() {
              const node = this.recommendedNext;
              if (!node) return;
              this.openChapterNode(node);
              this.$nextTick(() => {
                  const root = this.$refs.chapterMapEl;
                  if (!root || !root.querySelector) return;
                  const btn = root.querySelector('[data-chapter-id="' + node.id + '"]');
                  if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              });
          },
          openChapterNode(node) {
              if (!node || node.status === 'locked') return;
              const sc = (this.scenarios || []).find((s) => s.id === node.id)
                  || (CoCScenarioCatalog && CoCScenarioCatalog.get && CoCScenarioCatalog.get(node.id));
              if (!sc) return;
              this.openDeskCard(sc);
          },
          async confirmDeskCard(carryMode) {
              if (!this.deskCard) return;
              if (carryMode === 'reset') {
                  const ok = await CoCStateAccessor.confirmAction(
                      '将清空物品与热度、HP/SAN/MP 回满；章节解锁保留。确认重置？',
                      { title: '重置调查员', danger: true, okText: '确认重置' }
                  );
                  if (!ok) return;
              }
              const gs = CoCStateAccessor.getGameState();
              const styleId = this.deskCard.keeperStyle || 'cinematic';
              gs.keeperStyle = styleId;
              if (typeof applyKeeperStyle === 'function') {
                  applyKeeperStyle(gs, CoCEngine, styleId);
              }
              if (!gs.ui) gs.ui = {};
              if (carryMode === 'inherit' || carryMode === 'reset') {
                  gs.ui.carryMode = carryMode;
                  gs.ui.importArcLedger = carryMode === 'inherit';
              } else {
                  delete gs.ui.carryMode;
                  gs.ui.importArcLedger = true;
              }
              const Desk = CoCDeskPref;
              if (Desk && Desk.saveDeskPref) {
                  Desk.saveDeskPref(this.deskCard.id, {
                      keeperStyle: styleId,
                      carryMode: carryMode || 'none',
                      capabilityFilter: this.capabilityFilter || ''
                  });
              } else {
                  try {
                      localStorage.setItem('coc_desk_pref_' + this.deskCard.id, JSON.stringify({
                          keeperStyle: styleId,
                          carryMode: carryMode || 'none',
                          capabilityFilter: this.capabilityFilter || ''
                      }));
                  } catch (_e) { /* ignore */ }
              }
              const id = this.deskCard.id;
              this.startLocalScenario(id);
          },
          auditSelectedScenario() {
              const id = (this.deskCard && this.deskCard.id) || this.auditTargetId;
              if (!id) return;
              const sc = (CoCScenarioCatalog && CoCScenarioCatalog.get)
                  ? CoCScenarioCatalog.get(id)
                  : null;
              if (!sc) {
                  this.auditResult = { ok: false, summary: '未找到剧本', errors: ['missing scenario'] };
                  return;
              }
              const v = CoCScenarioCatalog.validate
                  ? CoCScenarioCatalog.validate(sc)
                  : { ok: false, errors: ['validate missing'] };
              const Cap = CoCCapabilitySystem;
              const health = Cap && Cap.bucketContractAudit ? Cap.bucketContractAudit(v) : null;
              if (this.deskCard && this.deskCard.id === id && health) {
                  this.deskCard.contractHealth = health;
              }
              this.auditResult = {
                  ok: !!v.ok,
                  summary: (health && health.summary) || (v.ok ? ('通过：' + (sc.title || id)) : ('未通过：' + ((v.errors && v.errors.length) || 0) + ' 项')),
                  errors: v.errors || [],
                  buckets: health && health.buckets
              };
          },
          _resolveCompareSlot(key) {
              if (!key) return null;
              if (key === 'auto') return this.autoSave;
              return (this.saveSlots || []).find((s) => s.key === key) || null;
          },
          toggleKpEngine(event) {
              const eng = getKpEngine();
              if (!eng || !eng.setKpEngineEnabled) {
                  CoCStateAccessor.showToast('KP 引擎模块未加载。', 'danger');
                  if (event && event.target) event.target.checked = false;
                  return;
              }
              const gs = CoCStateAccessor.getGameState();
              const enabled = !!(event && event.target && event.target.checked);
              eng.setKpEngineEnabled(gs, enabled);
              if (!enabled) gs.kpState = null;
              saveKpPreference(gs.activeModuleId, enabled);
              if (enabled && KpGameLoop) {
                  KpGameLoop.register(gs);
              } else if (KpGameLoop) {
                  KpGameLoop.unregister();
              }
              CoCStateAccessor.showToast(
                  enabled ? 'KP 协议引擎已启用。' : 'KP 协议引擎已关闭。',
                  enabled ? 'success' : 'secondary'
              );
          },
          onDifficultyPresetChange(event) {
              const preset = event && event.target ? event.target.value : '';
              if (preset === 'divine_war' && !CoCStateAccessor.getGameState().kpEngine?.enabled) {
                  CoCStateAccessor.showToast(
                      '神战预设建议启用 KP 协议引擎（大厅开关）。',
                      'warning'
                  );
              }
          },
          onKeeperStyleChange(event) {
              const id = event && event.target ? event.target.value : 'cinematic';
              const Eng = CoCEngine;
              if (typeof applyKeeperStyle === 'function') {
                  applyKeeperStyle(CoCStateAccessor.getGameState(), Eng, id);
              } else {
                  CoCStateAccessor.getGameState().keeperStyle = id;
              }
              CoCStateAccessor.showToast('桌规已切换：' + id, 'success');
          }
      },
      async mounted() {
          await this.refreshData();
          this._saveRefreshHandler = () => { this.refreshData(); };
          this._storageRefreshHandler = (event) => {
              const key = event && event.key;
              if (!key || key === 'coc_module_list' || key.startsWith('coc_save_') || key.startsWith('coc_module_')) {
                  this.refreshData();
              }
          };
          window.addEventListener('coc:saves-changed', this._saveRefreshHandler);
          window.addEventListener('storage', this._storageRefreshHandler);
          try {
              this.rememberKey = typeof localStorage !== 'undefined' && !!localStorage.getItem('vue_coc_api_cloud');
          } catch (_e) {
              this.rememberKey = false;
          }
      },
      beforeUnmount() {
          window.removeEventListener('coc:saves-changed', this._saveRefreshHandler);
          window.removeEventListener('storage', this._storageRefreshHandler);
      },
      watch: {
          capabilityFilter(val) {
              const Desk = CoCDeskPref;
              if (!Desk) return;
              const id = this.deskCard && this.deskCard.id;
              if (id && Desk.saveDeskPref) {
                  const cur = Desk.loadDeskPref(id);
                  Desk.saveDeskPref(id, Object.assign({}, cur, { capabilityFilter: val || '' }));
              } else if (Desk.saveGlobalDeskPref) {
                  const g = Desk.loadGlobalDeskPref();
                  Desk.saveGlobalDeskPref(Object.assign({}, g, { capabilityFilter: val || '' }));
              }
          },
          async 'gameState.currentScreen'(newScreen) {
              if (newScreen === 'modules') this.modules = await CoCStateAccessor.getModules();
              if (newScreen === 'lobby') this.autoSave = await CoCStateAccessor.getAutoSave();
              if (newScreen === 'scenarios') this.refreshScenariosList();
              if (newScreen === 'scenario_store') this.refreshScenarioStore();
              if (newScreen === 'saves') { this.saveSlots = await CoCStateAccessor.getSaveSlots(); CoCStateAccessor.getStorageStatus('slot1', '预估存档'); }
          }
      }
  };
