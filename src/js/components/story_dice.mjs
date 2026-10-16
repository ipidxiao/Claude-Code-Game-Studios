// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件

import { CoCStateAccessor } from '../state/accessor.mjs';
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

export const StoryDice = {
      data() {
          return {
              customNotation: '',
              customLabel: '',
              diceCount: 1,
              lastRollEntry: null,
              animating: false,
              pushSkill: '',
              pushReason: '',
              pushResult: null
          };
      },
      template: `
          <div class="dice-panel apex-dice-modal" role="dialog" aria-labelledby="apex-dice-title">

              <header class="apex-dice-header d-flex justify-content-between align-items-center gap-2 px-3 py-2 flex-wrap">
                  <div class="d-flex align-items-center gap-2 min-w-0 flex-wrap">
                      <coc-icon name="dice" :size="18" class="flex-shrink-0 text-warning"></coc-icon>
                      <h2 id="apex-dice-title" class="apex-dice-title mb-0">骰子台 · DICE</h2>
                      <span class="apex-journal-count flex-shrink-0" aria-label="骰子数量">{{ diceCount }} 枚</span>
                  </div>
                  <button type="button" class="btn btn-sm apex-btn-ghost flex-shrink-0" aria-label="关闭骰子台" @click="closeModal()">关闭</button>
              </header>

              <section class="px-3 pt-2 pb-2 apex-dice-quick">
                  <header class="apex-panel__head border-0 pb-1 mb-2 px-0">
                      <coc-icon name="d6" :size="14"></coc-icon>
                      <span>快速骰子 · QUICK</span>
                  </header>
                  <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                      <div class="apex-dice-stepper d-flex align-items-center gap-1" role="group" aria-label="骰子数量">
                          <button type="button" class="btn btn-sm apex-dice-stepper-btn dice-count-btn"
                              aria-label="减少骰子数量" @click="diceCount=Math.max(1,diceCount-1)">−</button>
                          <span class="text-center fw-bold apex-dice-count-num dice-count-num" aria-live="polite">{{ diceCount }}</span>
                          <button type="button" class="btn btn-sm apex-dice-stepper-btn dice-count-btn"
                              aria-label="增加骰子数量" @click="diceCount=Math.min(10,diceCount+1)">+</button>
                      </div>
                      <span class="text-muted dice-count-sep" aria-hidden="true">×</span>
                      <div class="d-flex flex-wrap gap-1 flex-grow-1">
                          <button v-for="sides in [4,6,8,10,12,20,100]" :key="sides" type="button"
                              class="btn btn-sm fw-bold apex-dice-quick-btn dice-quick-btn"
                              :aria-label="'掷 ' + diceCount + 'd' + sides" @click="quickRoll(sides)">d{{ sides }}</button>
                      </div>
                  </div>
              </section>

              <div v-if="lastRollEntry" class="mx-3 mb-2 apex-dice-result dice-result-panel"
                  :class="animating ? 'dice-pulse apex-dice-result--pulse' : ''">
                  <div class="apex-dice-result__label dice-result-label">{{ lastRollEntry.label }}</div>
                  <div class="d-flex justify-content-center flex-wrap gap-1 mb-1">
                      <span v-for="(v,i) in lastRollEntry.kept" :key="i" class="dice-face-svg apex-dice-face">
                          <svg class="dice-shape" viewBox="0 0 24 24" aria-hidden="true">
                              <use :href="'#icon-' + diceShapeId(lastRollEntry.sides)"></use>
                          </svg>
                          <span class="dice-value">{{ v }}</span>
                      </span>
                  </div>
                  <div v-if="lastRollEntry.rolls.length > lastRollEntry.kept.length"
                      class="d-flex justify-content-center gap-1 mb-1">
                      <span v-for="(v,i) in droppedDice" :key="'d'+i" class="dice-face-svg dice-dropped-face apex-dice-face apex-dice-face--dropped">
                          <svg class="dice-shape" viewBox="0 0 24 24" aria-hidden="true">
                              <use :href="'#icon-' + diceShapeId(lastRollEntry.sides)"></use>
                          </svg>
                          <span class="dice-value">{{ v }}</span>
                      </span>
                  </div>
                  <div class="apex-dice-total dice-total">
                      {{ lastRollEntry.total }}
                      <span v-if="lastRollEntry.mod" class="apex-dice-mod dice-mod">
                          ({{ lastRollEntry.kept.reduce((s,r)=>s+r,0) }} {{ lastRollEntry.mod>0?'+':'' }}{{ lastRollEntry.mod }})
                      </span>
                  </div>
                  <div class="apex-dice-notation dice-notation">{{ lastRollEntry.notation }}</div>
              </div>

              <div v-if="lastRollEntry && lastRollEntry.isGroup" class="mx-3 mb-2 apex-panel apex-panel--compact apex-dice-group">
                  <header class="apex-panel__head border-0 pb-1 mb-2 px-0">
                      <coc-icon name="character" :size="14"></coc-icon>
                      <span>群体 · GROUP · {{ lastRollEntry.label }}</span>
                  </header>
                  <div v-for="r in lastRollEntry.groupResults" :key="r.name"
                      class="d-flex justify-content-between align-items-center gap-2 py-1 apex-dice-group-row">
                      <span class="text-light text-truncate">{{ r.name }}</span>
                      <span class="d-inline-flex align-items-center gap-1 flex-shrink-0">
                          <span class="apex-clue-card__meta">{{ r.roll }}/{{ r.skillVal }}</span>
                          <span :class="groupLevelClass(r.level)">{{ r.level }}</span>
                      </span>
                  </div>
              </div>

              <section class="apex-panel apex-panel--compact mx-3 mb-2">
                  <header class="apex-panel__head border-0 pb-1 mb-2 px-0">
                      <coc-icon name="scroll" :size="14"></coc-icon>
                      <span>自定义 · CUSTOM</span>
                  </header>
                  <div class="apex-clue-card__meta mb-2">表示法如 2d6+3、3d10k2</div>
                  <div class="d-flex gap-1 flex-wrap">
                      <input v-model="customNotation" class="form-control form-control-sm apex-dice-input dice-input flex-grow-1"
                          placeholder="2d6+3" aria-label="自定义骰子表示法" @keyup.enter="customRoll()" />
                      <input v-model="customLabel" class="form-control form-control-sm apex-dice-input dice-input dice-input-label"
                          placeholder="名称" aria-label="掷骰名称" @keyup.enter="customRoll()" />
                      <button type="button" class="btn btn-sm apex-btn-accent apex-dice-roll-btn dice-roll-btn d-inline-flex align-items-center gap-1"
                          aria-label="掷自定义骰子" @click="customRoll()">
                          <coc-icon name="dice" :size="12"></coc-icon>掷
                      </button>
                  </div>
                  <div class="apex-clue-card__meta mt-2">kN=取最高N个　lN=取最低N个</div>
              </section>

              <section class="apex-panel apex-panel--compact mx-3 mb-2 apex-dice-push">
                  <header class="apex-panel__head border-0 pb-1 mb-2 px-0">
                      <coc-icon name="combat" :size="14"></coc-icon>
                      <span>推动检定 · PUSH</span>
                  </header>
                  <div class="apex-clue-card__meta mb-2">失败后可用，消耗技能成长</div>
                  <div class="d-flex gap-1 flex-wrap">
                      <input v-model="pushSkill" class="form-control form-control-sm apex-dice-input dice-input flex-grow-1"
                          placeholder="技能名" aria-label="推动检定技能名" />
                      <input v-model="pushReason" class="form-control form-control-sm apex-dice-input dice-input dice-input-label"
                          placeholder="推动理由" aria-label="推动理由" />
                      <button type="button" class="btn btn-sm apex-btn-danger d-inline-flex align-items-center gap-1"
                          aria-label="推动检定" @click="doPush()">
                          <coc-icon name="tentacle" :size="12"></coc-icon>推动
                      </button>
                  </div>
                  <div v-if="pushResult" class="mt-2 d-inline-flex align-items-center gap-1"
                      :class="pushResult.success ? 'text-success' : 'text-danger'" style="font-size:0.72rem;">
                      <coc-icon :name="pushResult.success ? 'clues' : 'combat'" :size="12"></coc-icon>
                      {{ pushResult.msg }}
                  </div>
              </section>

              <section class="apex-dice-history dice-history-area">
                  <header class="apex-dice-history__head px-3 py-2">
                      <div class="apex-panel__head border-0 pb-0 mb-0 px-0">
                          <coc-icon name="journal" :size="14"></coc-icon>
                          <span>掷骰记录 · LOG</span>
                          <span class="apex-journal-count ms-auto">{{ gameState.diceHistory.length }}</span>
                      </div>
                  </header>
                  <div v-if="gameState.diceHistory.length===0" class="px-3 pb-3 empty-state empty-state-compact">
                      <coc-icon name="dice" :size="28" class="empty-state-icon text-secondary"></coc-icon>
                      <div class="empty-state-title">暂无记录</div>
                      <div class="empty-state-hint">快速掷骰或自定义表示法的结果将显示于此</div>
                  </div>
                  <article v-for="entry in gameState.diceHistory.slice(0,15)" :key="entry.id"
                      class="apex-dice-history-item dice-history-item px-3 py-2 d-flex justify-content-between align-items-center gap-2"
                      tabindex="0" role="button" :aria-label="'查看掷骰记录 ' + entry.label"
                      @click="selectHistoryEntry(entry)"
                      @keydown.enter="selectHistoryEntry(entry)"
                      @keydown.space.prevent="selectHistoryEntry(entry)">
                      <span class="apex-dice-history__name dice-history-name text-truncate">{{ entry.label }}</span>
                      <span class="d-flex align-items-center gap-2 flex-shrink-0">
                          <span class="apex-dice-history__notation dice-history-notation">{{ entry.notation }}</span>
                          <span class="fw-bold" :class="historyTotalClass(entry)">
                              {{ entry.isGroup ? '群' : entry.total }}
                          </span>
                      </span>
                  </article>
              </section>
          </div>
      `,
      computed: {
          droppedDice() {
              if (!this.lastRollEntry) return [];
              const kept = [...this.lastRollEntry.kept];
              const all = [...this.lastRollEntry.rolls];
              kept.forEach(v => { const i = all.indexOf(v); if(i>=0) all.splice(i,1,null); });
              return all.filter(v => v !== null);
          }
      },
      methods: {
          diceShapeId(sides) {
              if (sides === 6) return 'd6';
              if (sides === 20) return 'd20';
              return 'd20';
          },
          historyTotalClass(entry) {
              if (entry.isGroup) return 'apex-dice-history__total apex-dice-history__total--group';
              if (entry.total >= entry.sides) return 'apex-dice-history__total apex-dice-history__total--high';
              if (entry.total <= entry.count) return 'apex-dice-history__total apex-dice-history__total--low';
              return 'apex-dice-history__total apex-dice-history__total--mid';
          },
          groupLevelClass(level) {
              if (level.includes('成功')) return 'apex-badge apex-badge--sm apex-badge--ok';
              if (level.includes('失败')) return 'apex-badge apex-badge--sm apex-badge--fail';
              return 'apex-badge apex-badge--sm apex-badge--warn';
          },
          selectHistoryEntry(entry) {
              this.lastRollEntry = entry;
          },
          doPush() {
              if (!this.pushSkill.trim()) return;
              const active = this.gameState.roster.filter(r => r.isActive);
              if (!active.length) { this.pushResult = { success: false, msg: '没有活跃调查员' }; return; }
              const resolve = CoCStateAccessor?.resolveSelectedActiveChar;
              const clamp = CoCStateAccessor?.clampSelectedCharIndex;
              let ch = typeof resolve === 'function' ? resolve(this.gameState) : null;
              if (!ch) {
                  if (typeof clamp === 'function') clamp(this.gameState);
                  const idx = Number.isFinite(this.gameState.selectedCharIndex) ? this.gameState.selectedCharIndex : 0;
                  const at = this.gameState.roster[idx];
                  ch = (at && at.isActive) ? at : active[0];
              }
              const skillName = this.pushSkill.trim();
              const reason = this.pushReason.trim();
              const attemptSpec = { charName: ch.name, skill: skillName, isPush: true };
              const gate = CoCStateAccessor.canAttemptSkill(attemptSpec);
              if (gate && gate.ok === false) {
                  this.pushResult = { success: false, msg: gate.reason };
                  setTimeout(() => { this.pushResult = null; }, 5000);
                  return;
              }
              const difficulty = gate.difficulty || 'normal';
              const result = CoCStateAccessor.executePushedRoll(skillName, ch, difficulty);
              CoCStateAccessor.recordSkillAttempt(Object.assign({ difficulty }, attemptSpec), result);
              const summary = reason
                  ? `${skillName} 推动检定 ${result.level}（${result.rolledValue}/${result.targetValue}）— ${reason}`
                  : `${skillName} 推动检定 ${result.level}（${result.rolledValue}/${result.targetValue}）`;
              CoCStateAccessor.addJournalEntry({
                  type: 'skill_check',
                  charName: ch.name,
                  summary,
                  isSuccess: result.rolledValue <= result.targetValue
              });
              if (result.success) {
                  this.pushResult = { success: true, msg: '推动成功！' + result.rolledValue + '/' + result.targetValue + ' → ' + result.level };
                  if (ch.skills) ch.skills[skillName] = result.skillValue;
                  if (!ch.skillsUsedThisSession) ch.skillsUsedThisSession = [];
                  if (!ch.skillsUsedThisSession.some((s) => s.name === skillName)) {
                      ch.skillsUsedThisSession.push({ name: skillName, currentValue: result.skillValue });
                  }
              } else {
                  const cons = result.consequence;
                  const consMsg = cons && cons.desc ? cons.desc : (result.level === '大失败' ? '推动大失败！后果严重！' : '推动失败');
                  this.pushResult = { success: false, msg: consMsg + ' (' + result.rolledValue + '/' + result.targetValue + ')' };
                  if (cons && cons.desc) {
                      this.gameState.chatHistory.push({ role: 'system', isLocalOnly: true, isAlert: true, content: `⚠️ [推动后果] ${cons.desc}` });
                  }
              }
              this.pushReason = '';
              setTimeout(() => { this.pushResult = null; }, 5000);
          },
          quickRoll(sides) {
              const notation = `${this.diceCount}d${sides}`;
              const entry = CoCStateAccessor.rollCustomDice(notation, `${this.diceCount}d${sides}`, '玩家');
              if (entry) { this.lastRollEntry = entry; this.flash(); }
          },
          customRoll() {
              if (!this.customNotation.trim()) return;
              const entry = CoCStateAccessor.rollCustomDice(this.customNotation.trim(), this.customLabel||this.customNotation.trim(), '玩家');
              if (!entry) { CoCStateAccessor.showToast('无效的骰子表示法，请使用如 2d6+3 的格式', 'warning'); return; }
              this.lastRollEntry = entry; this.flash();
          },
          flash() { this.animating=true; setTimeout(()=>this.animating=false, 400); }
      },
      setup() { return CoCStateAccessor.bindVueSetup(); }
  };
