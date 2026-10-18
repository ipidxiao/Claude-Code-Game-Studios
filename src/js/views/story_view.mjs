// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { StoryChat } from '../components/story_chat.mjs';
import { StoryChar } from '../components/story_char.mjs';
import { StoryInv } from '../components/story_inv.mjs';
import { StoryStore } from '../components/story_store.mjs';
import { StoryJournal } from '../components/story_journal.mjs';
import { StoryNpc } from '../components/story_npc.mjs';
import { StoryCombat } from '../components/story_combat.mjs';
import { StoryGrowth } from '../components/story_growth.mjs';
import { StoryMap } from '../components/story_map.mjs';
import { StoryClues } from '../components/story_clues.mjs';
import { StoryEquip } from '../components/story_equip.mjs';
import { StoryDice } from '../components/story_dice.mjs';
import { ChatExport } from '../chat_export.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { assemblePressureHudLine } from '../data/display_pipeline.mjs';
import { getCoCAI } from '../ai/coc_ai_bridge.mjs';
import { KpGameLoop } from '../campaign/kp_game_loop.mjs';

let refreshStorySaveSlots = null;

export const ViewStory = {
    data() { return { activeStoryTab: 'chat', loadedTabs: {}, saveSlots: [] }; },
      
      components: {
          'story-chat': StoryChat,
          'story-char': StoryChar,
          'story-inv': StoryInv,
          'story-store': StoryStore,
        'story-journal': StoryJournal,
        'story-npc': StoryNpc,
        'story-combat': StoryCombat,
        'story-growth': StoryGrowth,
        'story-map': StoryMap,
        'story-clues': StoryClues,
        'story-equip': StoryEquip,
        'story-dice': StoryDice
      },
      
      template: `
          <div class="d-flex flex-column bg-dark" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10;">
              <div v-if="carryBrief" class="apex-panel apex-panel--compact m-2" style="z-index:20;">
                  <div class="fw-bold text-light small mb-1">继承开局摘要</div>
                  <div class="small text-info">调查员：{{ carryBrief.names }}</div>
                  <div class="small">物品 {{ carryBrief.itemCount }} · 热度下限 {{ carryBrief.heat }} · 标记 {{ carryBrief.flagCount }}</div>
                  <div v-if="carryBrief.pressureLine" class="small text-warning mt-1">{{ carryBrief.pressureLine }}</div>
                  <button type="button" class="btn btn-sm apex-btn-accent mt-2" @click="dismissCarryBrief">知道了</button>
              </div>
              <div v-if="endingRecap" class="apex-panel apex-panel--compact m-2" style="z-index:19;">
                  <div class="fw-bold text-light small mb-1">结局</div>
                  <div v-for="(line, i) in (endingRecap.playerLines || endingRecap.lines)" :key="'er'+i" class="small" :class="i === 0 ? 'text-light' : 'text-secondary'">{{ line.text }}</div>
                  <div class="d-flex gap-2 mt-2">
                      <button type="button" class="btn btn-sm apex-btn-ghost" @click="copyEndingRecap">复制完整记录</button>
                      <button type="button" class="btn btn-sm apex-btn-ghost" @click="dismissEndingRecap">关闭</button>
                  </div>
              </div>
              <div class="d-flex align-items-center w-100 story-toolbar apex-story-toolbar">
                  <button type="button" class="apex-story-action apex-story-action--back story-tab-btn flex-shrink-0" @click="switchScreen('lobby')" title="返回模组大厅" aria-label="返回模组大厅"><coc-icon name="arrow-left" :size="16"></coc-icon><span class="apex-story-action__label">大厅</span></button>
                  <div v-if="gameState.kpEngine?.enabled" class="apex-kp-hud flex-shrink-0">
                      <span class="apex-kp-hud__badge">KP</span>
                      <span class="apex-kp-hud__stat apex-kp-hud__stat--warn">注意力{{ gameState.kpState?.ATTENTION_LEVEL ?? gameState.kpEngine?.global?.attention ?? 0 }}</span>
                      <span class="apex-kp-hud__sep" aria-hidden="true">·</span>
                      <span class="apex-kp-hud__stat apex-kp-hud__stat--info">战力{{ gameState.kpState?.PLAYER_POWER ?? gameState.kpEngine?.global?.playerPower ?? 0 }}</span>
                      <span class="apex-kp-hud__sep" aria-hidden="true">·</span>
                      <span class="apex-kp-hud__stat">{{ gameState.kpState?.PHASE ?? gameState.kpEngine?.global?.phase ?? 'CALM' }}</span>
                  </div>
                  <div v-if="dualClocks" class="apex-kp-hud flex-shrink-0" title="双时钟进度">
                      <span class="apex-kp-hud__badge">时钟</span>
                      <span class="apex-kp-hud__stat apex-kp-hud__stat--info">调查{{ dualClocks.investigation }}/{{ dualClocks.maxInvestigation }}</span>
                      <span class="apex-kp-hud__sep" aria-hidden="true">·</span>
                      <span class="apex-kp-hud__stat apex-kp-hud__stat--warn">仪式{{ dualClocks.ritual }}/{{ dualClocks.maxRitual }}</span>
                  </div>
                  <div v-if="pressureHud" class="apex-kp-hud flex-shrink-0" title="战役余波">
                      <span class="apex-kp-hud__badge">余波</span>
                      <span class="apex-kp-hud__stat apex-kp-hud__stat--warn">{{ pressureHud }}</span>
                  </div>
                  <div class="apex-story-tabs flex-shrink-0" role="tablist" aria-label="剧情子面板">
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'chat'" :class="{ 'apex-story-tab--active': activeStoryTab === 'chat' }" @click="activeStoryTab = 'chat'"><coc-icon name="scroll" :size="14"></coc-icon><span class="apex-story-tab__label">剧情</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'character'" :class="{ 'apex-story-tab--active': activeStoryTab === 'character' }" @click="activeStoryTab = 'character'"><coc-icon name="character" :size="14"></coc-icon><span class="apex-story-tab__label">人物</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'inventory'" :class="{ 'apex-story-tab--active': activeStoryTab === 'inventory' }" @click="activeStoryTab = 'inventory'"><coc-icon name="inventory" :size="14"></coc-icon><span class="apex-story-tab__label">随身</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'storage'" :class="{ 'apex-story-tab--active': activeStoryTab === 'storage' }" @click="activeStoryTab = 'storage'"><coc-icon name="storage" :size="14"></coc-icon><span class="apex-story-tab__label">仓库</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'journal'" :class="{ 'apex-story-tab--active': activeStoryTab === 'journal' }" @click="activeStoryTab = 'journal'"><coc-icon name="journal" :size="14"></coc-icon><span class="apex-story-tab__label">日志</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'npc'" :class="{ 'apex-story-tab--active': activeStoryTab === 'npc' }" @click="activeStoryTab = 'npc'"><coc-icon name="npc" :size="14"></coc-icon><span class="apex-story-tab__label">NPC</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'growth'" :class="{ 'apex-story-tab--active': activeStoryTab === 'growth' }" @click="activeStoryTab = 'growth'"><coc-icon name="growth" :size="14"></coc-icon><span class="apex-story-tab__label">成长</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'clues'" :class="{ 'apex-story-tab--active': activeStoryTab === 'clues' }" @click="activeStoryTab = 'clues'"><coc-icon name="clues" :size="14"></coc-icon><span class="apex-story-tab__label">线索</span></button>
                      <button type="button" class="apex-story-tab story-tab-btn" role="tab" :aria-selected="activeStoryTab === 'equip'" :class="{ 'apex-story-tab--active': activeStoryTab === 'equip' }" @click="activeStoryTab = 'equip'"><coc-icon name="equip" :size="14"></coc-icon><span class="apex-story-tab__label">装备</span></button>
                  </div>
                  <div class="apex-story-actions flex-shrink-0" role="toolbar" aria-label="剧情工具">
                      <button type="button" class="apex-story-action apex-story-action--tool story-tab-btn" @click="copyChat" title="复制全部对话" aria-label="复制全部对话">
                          <coc-icon name="clipboard" :size="14" aria-hidden="true"></coc-icon>
                          <span class="apex-story-action__label">复制</span>
                      </button>
                      <button type="button" class="apex-story-action apex-story-action--tool story-tab-btn" @click="exportChat" title="导出对话文本" aria-label="导出对话为 Markdown">
                          <coc-icon name="download" :size="14" aria-hidden="true"></coc-icon>
                          <span class="apex-story-action__label">导出</span>
                      </button>
                      <button type="button" class="apex-story-action apex-story-action--tool story-tab-btn" @click="switchScreen('settings')" title="AI 引擎设置" aria-label="AI 引擎设置">
                          <coc-icon name="settings" :size="14" aria-hidden="true"></coc-icon>
                          <span class="apex-story-action__label">设置</span>
                      </button>
                      <button type="button" class="apex-story-action apex-story-action--tool story-tab-btn" @click="showModal('dice')" title="骰子台" aria-label="打开骰子台">
                          <coc-icon name="dice" :size="16" aria-hidden="true"></coc-icon>
                          <span class="apex-story-action__label">骰子</span>
                      </button>
                      <button type="button" class="apex-story-action apex-story-action--tool story-tab-btn" @click="openSaveModal()" title="存档管理" aria-label="存档管理">
                          <coc-icon name="storage" :size="14" aria-hidden="true"></coc-icon>
                          <span class="apex-story-action__label">存档</span>
                      </button>
                  </div>
              </div>

              <div class="d-flex flex-column flex-grow-1 overflow-hidden min-h-0 story-tab-panel">
              <keep-alive :include="tabKeepAliveNames">
                <component
                    :is="activeStoryComponent"
                    :key="activeStoryTab"
                    @switch-tab="activeStoryTab = $event"
                ></component>
              </keep-alive>
              </div>
              
              <!-- 战斗/追逐面板 — 战斗或追逐激活时弹出 -->
              <story-combat v-if="gameState.combat.active || (gameState.chase && gameState.chase.active) || gameState.activeModal === 'combat'"></story-combat>

              <!-- 地图 Modal -->
              <div v-if="gameState.activeModal === 'map'" class="modal-overlay">
                  <story-map></story-map>
              </div>

              <!-- 骰子台 Modal -->
                <div v-if="gameState.activeModal === 'dice'" class="modal-overlay apex-dice-overlay">
                    <story-dice></story-dice>
                </div>

                <!-- 存档 Modal -->
              <div v-if="gameState.activeModal === 'save'" class="modal-overlay apex-save-overlay">
                  <div class="apex-save-modal" role="dialog" aria-labelledby="apex-save-title">
                      <button type="button" class="btn btn-sm apex-btn-ghost apex-save-close" aria-label="关闭存档" @click="closeModal">关闭</button>
                      <h4 id="apex-save-title" class="apex-story-save-title mb-3 d-inline-flex align-items-center gap-2"><coc-icon name="storage" :size="18"></coc-icon> 存档管理</h4>
                      <div class="apex-panel apex-panel--compact mb-3" :class="gameState.storageStatus.warning ? 'apex-save-storage--warn' : ''">
                          <header class="apex-panel__head border-0 pb-1 mb-2 px-0">
                              <coc-icon name="settings" :size="14"></coc-icon>
                              <span>存储估算 · STORAGE</span>
                          </header>
                          <div class="d-flex justify-content-between small mb-1">
                              <span class="text-muted">浏览器存储估算</span>
                              <span class="text-light">{{ formatStorageBytes(gameState.storageStatus.usedBytes) }} / {{ formatStorageBytes(gameState.storageStatus.quotaBytes) }}</span>
                          </div>
                          <div class="apex-clue-card__meta">本次存档约 {{ formatStorageBytes(gameState.storageStatus.currentSaveBytes) }}，写入后预计 {{ ((gameState.storageStatus.projectedRatio || 0) * 100).toFixed(1) }}%</div>
                          <div v-if="gameState.storageStatus.warning" class="apex-badge apex-badge--warn story-tab-btn d-inline-flex align-items-center gap-1 mt-2"><coc-icon name="tentacle" :size="12"></coc-icon> {{ gameState.storageStatus.warning }}</div>
                      </div>
                      
                      <!-- 手动存档槽 -->
                      <div class="mb-3">
                          <div v-for="slot in saveSlots" :key="slot.key" class="apex-panel apex-panel--compact mb-2 apex-save-slot">
                              <div class="d-flex justify-content-between align-items-start gap-2">
                                  <div class="flex-grow-1" style="min-width:0;">
                                      <div class="fw-bold text-light d-inline-flex align-items-center gap-1" style="font-size:0.85rem;">
                                          <coc-icon name="storage" :size="12"></coc-icon>{{ slot.label }}
                                      </div>
                                      <div v-if="slot.hasData" class="text-muted text-truncate story-tab-btn mt-1">
                                          {{ slot.charNames }} · {{ slot.location }}<br>{{ slot.savedAt }}
                                      </div>
                                      <div v-else class="text-secondary story-tab-btn mt-1">— 空槽位 —</div>
                                  </div>
                                  <div class="d-flex flex-column gap-1 flex-shrink-0">
                                      <button type="button" class="btn btn-sm apex-btn-accent py-0 px-2" @click="doSave(slot.key, slot.label)">存入</button>
                                      <button type="button" class="btn btn-sm apex-btn-ghost py-0 px-2" @click="doLoad(slot.key)" :disabled="!slot.hasData">读取</button>
                                      <button type="button" class="btn btn-sm apex-btn-danger py-0 px-2" @click="doDelete(slot.key)" :disabled="!slot.hasData">删</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <!-- 导出/导入 -->
                      <div class="border-top border-secondary pt-3">
                          <header class="apex-panel__head border-0 pb-1 mb-2 px-0">
                              <coc-icon name="scroll" :size="14"></coc-icon>
                              <span>JSON 备份 · BACKUP</span>
                          </header>
                          <div class="d-flex gap-2">
                              <button type="button" class="btn btn-sm apex-btn-accent flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1" @click="exportGame"><coc-icon name="download" :size="14"></coc-icon> 导出</button>
                              <label class="btn btn-sm apex-btn-ghost flex-grow-1 mb-0 cursor-pointer d-inline-flex align-items-center justify-content-center gap-1">
                                  <coc-icon name="clues" :size="14"></coc-icon> 导入<input type="file" accept=".json" style="display:none" @change="doImport($event)">
                              </label>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      `,
      computed: {
          activeStoryComponent() {
              const map = {
                  chat: 'story-chat',
                  character: 'story-char',
                  inventory: 'story-inv',
                  storage: 'story-store',
                  journal: 'story-journal',
                  npc: 'story-npc',
                  growth: 'story-growth',
                  clues: 'story-clues',
                  equip: 'story-equip',
                  dice: 'story-dice',
                  map: 'story-map'
              };
              return map[this.activeStoryTab] || 'story-chat';
          },
          dualClocks() {
              const c = this.gameState.scenarioRunner && this.gameState.scenarioRunner.clocks;
              if (!c) return null;
              return {
                  investigation: Number(c.investigation) || 0,
                  ritual: Number(c.ritual) || 0,
                  maxInvestigation: Number(c.maxInvestigation) || 5,
                  maxRitual: Number(c.maxRitual) || 5
              };
          },
          pressureHud() {
              // Wave C DP1: assemble via Display Pipeline (locked pressureHudLine stays pure).
              return assemblePressureHudLine(this.gameState) || '';
          },
          carryBrief() {
              return (this.gameState.ui && this.gameState.ui.carryBrief) || null;
          },
          endingRecap() {
              return (this.gameState.ui && this.gameState.ui.endingRecap) || null;
          }
      },
      setup() {
          const tabKeepAliveNames = ['StoryChat', 'StoryChar', 'StoryInv', 'StoryStore', 'StoryJournal', 'StoryNpc', 'StoryGrowth', 'StoryClues', 'StoryEquip', 'StoryMap', 'StoryDice', 'StoryCombat', 'ApexEquipHud'];
          const state = CoCStateAccessor.getState();
          const ai = getCoCAI();
          
          const openSaveModal = function() {
              if (refreshStorySaveSlots) refreshStorySaveSlots();
              state.getStorageStatus && state.getStorageStatus('slot1', '预估存档');
              state.showModal('save');
          };
          
          const doSave = async function(slotKey, slotLabel) {
              const ok = await state.saveGame(slotKey, slotLabel);
              if (ok) {
                  state.gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `💾 [存档] 已保存至"${slotLabel}"。` });
                  state.showToast && state.showToast(`已保存至"${slotLabel}"。`, 'success');
                  if (refreshStorySaveSlots) await refreshStorySaveSlots();
              } else { state.showToast && state.showToast('存档失败，请检查浏览器存储设置。', 'danger'); }
          };
          
          const doLoad = async function(slotKey) {
              const okConfirm = await state.confirmAction('载入存档将覆盖当前游戏进度，确认吗？', { title: '读取存档' });
              if (!okConfirm) return;
              const ok = await state.loadGame(slotKey);
              if (ok) { state.closeModal(); state.scrollToBottom(); }
          };
          
          const doDelete = async function(slotKey) {
              const okConfirm = await state.confirmAction('确认删除该存档？此操作不可恢复。', { title: '删除存档', danger: true, okText: '删除' });
              if (!okConfirm) return;
              const ok = await state.deleteSave(slotKey);
              state.showToast && state.showToast(ok ? '存档已删除。' : '存档删除失败。', ok ? 'success' : 'danger');
              if (refreshStorySaveSlots) await refreshStorySaveSlots();
          };
          
          const doImport = async function(event) {
              const file = event.target.files[0];
              if (!file) return;
              try {
                  await state.importGame(file);
                  state.closeModal(); state.scrollToBottom();
                  state.showToast && state.showToast('导入成功。', 'success');
              } catch(e) { state.showToast && state.showToast('导入失败：' + e, 'danger'); }
              event.target.value = '';
          };
          
          const copyChat = function() { ChatExport.copyChatText(state); };
          const exportChat = function() { ChatExport.exportChatMarkdown(state); };
          return Object.assign({}, state, ai, { tabKeepAliveNames, openSaveModal, doSave, doLoad, doDelete, doImport, copyChat, exportChat });
      },
      async mounted() {
          refreshStorySaveSlots = async () => {
              this.saveSlots = await CoCStateAccessor.getSaveSlots();
              CoCStateAccessor.getStorageStatus('slot1', '预估存档');
          };
          this.saveSlots = await CoCStateAccessor.getSaveSlots();
          CoCStateAccessor.getStorageStatus('slot1', '预估存档');
          const gs = CoCStateAccessor.getGameState();
          if (gs && gs.kpEngine && gs.kpEngine.enabled && KpGameLoop) {
              KpGameLoop.register(gs);
          }
          this.applyPendingStoryTab();
      },
      watch: {
          'gameState.currentScreen'(screen) {
              if (screen === 'story') this.applyPendingStoryTab();
          }
      },
      methods: {
          dismissCarryBrief() {
              if (this.gameState.ui) delete this.gameState.ui.carryBrief;
          },
          dismissEndingRecap() {
              if (this.gameState.ui) delete this.gameState.ui.endingRecap;
          },
          async copyEndingRecap() {
              const text = this.endingRecap && this.endingRecap.copyText;
              if (!text) return;
              try {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(text);
                  }
                  CoCStateAccessor.showToast && CoCStateAccessor.showToast('已复制完整记录。', 'success');
              } catch (_e) {
                  CoCStateAccessor.showToast && CoCStateAccessor.showToast('复制失败。', 'danger');
              }
          },
          applyPendingStoryTab() {
              const gs = CoCStateAccessor.getGameState();
              const tab = gs && gs.ui && gs.ui.openStoryTab;
              if (!tab) return;
              this.activeStoryTab = tab;
              gs.ui.openStoryTab = null;
          }
      },
      unmounted() {
          refreshStorySaveSlots = null;
          if (KpGameLoop) KpGameLoop.unregister();
      }
  };
