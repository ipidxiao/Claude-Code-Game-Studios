import { formatChatContent as formatChatContentHelper } from './chat_format_helpers.mjs';
import { ActionWheel } from './action_wheel.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCEngine } from '../coc.mjs';
import { getCoCAI } from '../ai/coc_ai_bridge.mjs';
import { getScenarioRunner } from '../scenario/ensure_runner.mjs';
import { CoCGroupCheck } from '../campaign/group_check.mjs';

/** Monotonic Vue key for chat rows (window index caused duplicate keys after 150 msgs). */
let _chatVidSeq = 0;

/** Prefer injected stateApi / CoCStateAccessor. */
function resolveStateRoot(props) {
    if (props && props.stateApi) {
        return typeof props.stateApi.getState === 'function' ? props.stateApi.getState() : props.stateApi;
    }
    try {
        return CoCStateAccessor.getState();
    } catch (_e) {
        return null;
    }
}

export const StoryChat = {
    name: 'StoryChat',
    components: { ActionWheel },
    props: {
        stateApi: { type: Object, default: null },
    },
    data() {
        return {
            _userNearBottom: true,
            _rollCheckTarget: '',
            _soloChoiceMenuGroup: null,
            openingAutoExpanded: true,
            openingHold: false,
            _openingCollapseTimer: null
        };
    },
    template: `
        <div class="d-flex flex-column flex-grow-1 overflow-hidden p-2 p-md-3 apex-char-shell apex-chat-shell">
            <header class="apex-chat-header d-flex justify-content-between align-items-center gap-2 mb-2 flex-shrink-0">
                <div class="min-w-0">
                    <div class="apex-chat-location d-flex align-items-center gap-2 flex-wrap">
                        <coc-icon name="eye" :size="16" class="flex-shrink-0 apex-text-accent"></coc-icon>
                        <h2 class="apex-chat-location__name mb-0 text-truncate">{{ chatLocationLabel }}</h2>
                        <span v-if="splitLocationHint" class="apex-badge apex-badge--sm apex-badge--info text-truncate" :title="splitLocationHint">{{ splitLocationHint }}</span>
                        <span v-if="scenarioModeLabel" class="apex-badge apex-badge--sm apex-badge--warn">{{ scenarioModeLabel }}</span>
                    </div>
                </div>
                <button type="button" class="btn btn-sm apex-btn-ghost d-inline-flex align-items-center gap-1 flex-shrink-0 apex-chat-map-btn" @click="showModal('map')">
                    <coc-icon name="clues" :size="14"></coc-icon>
                    <span class="d-none d-sm-inline">地图</span>
                </button>
            </header>

            <section v-if="openingMessage"
                class="apex-opening-panel flex-shrink-0"
                :class="{ 'apex-opening-panel--collapsed': !openingPanelExpanded }"
                role="region"
                :aria-label="openingPanelExpanded ? ('场景开场：' + (openingMessage.opening.title || '故事开始')) : '行动信息'"
                @mousedown="onOpeningHoldStart"
                @mouseup="onOpeningHoldEnd"
                @mouseleave="onOpeningHoldEnd"
                @touchstart.passive="onOpeningHoldStart"
                @touchend="onOpeningHoldEnd"
                @touchcancel="onOpeningHoldEnd">
                <button v-if="!openingPanelExpanded" type="button" class="apex-opening-bar" aria-label="按住查看行动信息">
                    <coc-icon name="scroll" :size="14" class="apex-opening-bar__icon" aria-hidden="true"></coc-icon>
                    <span class="apex-opening-bar__label">行动信息</span>
                    <span class="apex-opening-bar__hint">按住展开</span>
                </button>
                <article v-else class="apex-opening-card">
                    <header class="apex-opening-card__head">
                        <coc-icon name="scroll" :size="20" class="apex-opening-card__icon" aria-hidden="true"></coc-icon>
                        <div class="apex-opening-card__titles min-w-0">
                            <h3 class="apex-opening-card__title mb-0 text-truncate">{{ openingMessage.opening.title }}</h3>
                            <span v-if="openingMessage.opening.subtitle" class="apex-opening-card__subtitle">{{ openingMessage.opening.subtitle }}</span>
                        </div>
                    </header>
                    <dl class="apex-opening-card__meta">
                        <div class="apex-opening-card__row">
                            <dt class="apex-opening-card__label"><coc-icon name="clock" :size="12" aria-hidden="true"></coc-icon> 时间</dt>
                            <dd class="apex-opening-card__value">{{ openingMessage.opening.time }}</dd>
                        </div>
                        <div class="apex-opening-card__row">
                            <dt class="apex-opening-card__label"><coc-icon name="eye" :size="12" aria-hidden="true"></coc-icon> 地点</dt>
                            <dd class="apex-opening-card__value">{{ openingMessage.opening.location }}</dd>
                        </div>
                        <div class="apex-opening-card__row">
                            <dt class="apex-opening-card__label"><coc-icon name="character" :size="12" aria-hidden="true"></coc-icon> 人物</dt>
                            <dd class="apex-opening-card__value">{{ openingMessage.opening.characters }}</dd>
                        </div>
                    </dl>
                    <section v-if="openingMessage.opening.past || openingMessage.opening.present || openingMessage.opening.future" class="apex-opening-card__story" aria-label="调查背景">
                        <article v-if="openingMessage.opening.past" class="apex-opening-card__beat">
                            <header class="apex-opening-card__beat-head">
                                <coc-icon name="journal" :size="13" aria-hidden="true"></coc-icon>
                                <h4 class="apex-opening-card__beat-title">已知信息</h4>
                            </header>
                            <p class="apex-opening-card__beat-text">{{ openingMessage.opening.past }}</p>
                        </article>
                        <article v-if="openingMessage.opening.present" class="apex-opening-card__beat">
                            <header class="apex-opening-card__beat-head">
                                <coc-icon name="eye" :size="13" aria-hidden="true"></coc-icon>
                                <h4 class="apex-opening-card__beat-title">当前环境</h4>
                            </header>
                            <p class="apex-opening-card__beat-text">{{ openingMessage.opening.present }}</p>
                        </article>
                        <article v-if="openingMessage.opening.future" class="apex-opening-card__beat apex-opening-card__beat--goal">
                            <header class="apex-opening-card__beat-head">
                                <coc-icon name="clues" :size="13" aria-hidden="true"></coc-icon>
                                <h4 class="apex-opening-card__beat-title">目标</h4>
                            </header>
                            <p class="apex-opening-card__beat-text">{{ openingMessage.opening.future }}</p>
                        </article>
                    </section>
                </article>
            </section>
            
            <div class="chat-box apex-chat-box mb-2 flex-grow-1" ref="chatBox" @scroll="onChatScroll" id="chatContainer" aria-live="polite" aria-atomic="false">
                <div class="apex-chat-scanline" aria-hidden="true"></div>
                <div v-if="totalMsgs === 0 && !openingMessage && !gameState.isLoading" class="empty-state empty-state-chat">
                    <coc-icon name="scroll" :size="40" class="empty-state-icon"></coc-icon>
                    <div class="empty-state-title">故事尚未开始</div>
                    <div class="empty-state-hint">在下方输入行动，或从大厅选择本地剧本</div>
                    <div v-if="needsApiKey" class="empty-state-hint empty-state-api-hint">
                        <coc-icon name="settings" :size="14"></coc-icon>
                        联网 AI 需先在设置中配置 API 密钥
                    </div>
                </div>
                <div v-for="msg in visibleMessages" :key="msg._vid" class="chat-msg apex-chat-msg">
                    <article v-if="msg.role === 'system' && !msg.isHidden"
                        class="apex-chat-block"
                        :class="{
                            'apex-chat-block--madness madness-msg': msg.isMadness,
                            'apex-chat-block--alert alert-msg': msg.isAlert,
                            'apex-chat-block--system sys-msg': !msg.isMadness && !msg.isAlert,
                            'apex-chat-block--dice': msg.isDiceRoll,
                            'apex-chat-block--log': msg.isLocalOnly && !msg.isAlert && !msg.isMadness && !msg.isDiceRoll
                        }">
                        <header v-if="!msg.isAlert" class="apex-chat-block__head">
                            <span class="apex-chat-role-badge apex-chat-role-badge--system">
                                <coc-icon name="settings" :size="12" aria-hidden="true"></coc-icon>
                                <strong class="apex-chat-role">系统</strong>
                            </span>
                        </header>
                        <div class="apex-chat-block__body chat-content">{{ formatChatContent(msg) }}</div>
                    </article>
                    <article v-else-if="msg.role === 'user' && !msg.isHidden" class="apex-chat-block apex-chat-block--user user-msg apex-chat-user">
                        <header class="apex-chat-block__head">
                            <span class="apex-chat-role-badge apex-chat-role-badge--user">
                                <coc-icon name="character" :size="12" aria-hidden="true"></coc-icon>
                                <strong class="apex-chat-role">玩家</strong>
                            </span>
                        </header>
                        <div class="apex-chat-block__body">{{ msg.content }}</div>
                    </article>
                    <article v-else-if="msg.role === 'assistant' && msg.content"
                        class="apex-chat-block apex-chat-block--kp kp-msg apex-chat-kp"
                        :class="{ 'apex-chat-block--scenario': msg._scenario }">
                        <header class="apex-chat-block__head">
                            <span class="apex-chat-role-badge apex-chat-role-badge--kp">
                                <coc-icon name="scroll" :size="12" aria-hidden="true"></coc-icon>
                                <strong class="apex-chat-role">守秘人</strong>
                            </span>
                        </header>
                        <div class="apex-chat-block__body chat-content apex-chat-body--pre">{{ formatChatContent(msg) }}</div>
                    </article>
                    
                    <div v-if="msg.tool_calls && !msg.isResolved" class="apex-chat-pending chat-pending-check p-3 mt-2">
                        <div class="apex-growth-section-label mb-2">系统判定待处理</div>
                        <div v-for="tool in msg.tool_calls" :key="tool.id">
                            <div v-if="tool && tool.function && (tool.function.name === 'request_skill_check' || tool.function.name === 'push_skill_check') && !tool.isResolved"
                                class="d-flex align-items-start gap-2 text-light small">
                                <coc-icon name="dice" :size="14" class="flex-shrink-0 mt-1 apex-text-accent"></coc-icon>
                                <span>命运时刻：<b>{{ tool.target_name || '调查员' }}</b> 请进行 <b>{{ getSafeSkillName(tool) }}</b> 检定<span v-if="tool.isPushed">（推动·更高风险）</span>。</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="gameState.isLoading" class="chat-loading apex-chat-loading d-inline-flex align-items-center gap-2">
                    <coc-icon name="tentacle" :size="14" class="empty-state-pulse"></coc-icon>
                    守秘人正在推演中…
                </div>
            </div>
            
            <div v-if="getPendingCheck()" class="d-grid mb-2 flex-shrink-0 apex-chat-roll-panel">
                <div v-if="forcedRollProgress" class="apex-chat-forced-progress small mb-1 px-1">
                    强制检定 {{ forcedRollProgress.done + 1 }}/{{ forcedRollProgress.total }} · {{ forcedRollProgress.current }} ·【{{ forcedRollProgress.skill }}】
                </div>
                <div v-if="activeRollChars.length > 1 && !forcedRollProgress && !groupChoicePendingRoll" class="apex-chat-roll-picker mb-2">
                    <div class="apex-growth-section-label px-1 mb-1">检定调查员</div>
                    <div class="d-flex flex-wrap gap-1" role="group" aria-label="选择进行检定的调查员">
                        <button v-for="ch in activeRollChars" :key="ch.name" type="button"
                            class="btn btn-sm apex-chat-roll-picker__btn"
                            :class="rollCheckTargetName === ch.name ? 'apex-btn-accent' : 'apex-btn-ghost'"
                            :aria-pressed="rollCheckTargetName === ch.name"
                            @click="_rollCheckTarget = ch.name">
                            {{ ch.name }}
                        </button>
                    </div>
                </div>
                <button type="button" class="btn apex-chat-roll-cta fw-bold py-3"
                    @click="doPendingSkillCheck">
                    <coc-icon name="dice" :size="20" class="me-1"></coc-icon>
                    {{ rollCheckTargetName || '调查员' }} 掷骰：【{{ getSafeSkillName(getPendingCheck().tool) }}】
                </button>
            </div>
            <div v-if="isScenarioActive" class="apex-chat-scenario-bar mb-2 d-flex flex-wrap gap-2 align-items-center flex-shrink-0">
                <span class="apex-badge apex-badge--sm apex-badge--warn">本地剧本模式</span>
                <button v-if="!actionWheelContext && !getPendingCheck()" type="button"
                    class="btn btn-sm apex-btn-ghost d-inline-flex align-items-center gap-1" @click="replayScenarioChoices">
                    <coc-icon name="dice" :size="12"></coc-icon> 恢复互动选项
                </button>
                <button type="button" class="btn btn-sm apex-btn-accent d-inline-flex align-items-center gap-1" @click="confirmSwitchOnline">
                    <coc-icon name="settings" :size="12"></coc-icon> 切换在线 AI
                </button>
            </div>
            <div class="apex-chat-footer flex-shrink-0">
                <div class="apex-chat-composer-row">
                    <div v-if="actionWheelContext" class="apex-action-fab-slot">
                        <action-wheel
                            variant="fab"
                            :actions="actionWheelContext.actions"
                            :title="actionWheelContext.title"
                            :disabled="gameState.isLoading"
                            @select="onWheelSelect"
                        ></action-wheel>
                    </div>
                    <div class="input-group apex-chat-composer flex-grow-1 mb-1">
                        <button type="button" class="btn apex-chat-char-btn" aria-label="打开人物面板" @click="$emit('switch-tab', 'character')">
                            <coc-icon name="character" :size="18"></coc-icon>
                        </button>
                        <input type="text" class="form-control apex-journal-input apex-chat-input"
                            v-model="playerInput" @keyup.enter="handlePlayerAction"
                            :disabled="gameState.isLoading" :placeholder="inputPlaceholder"
                            aria-label="玩家行动输入">
                        <button type="button" class="btn apex-btn-accent fw-bold px-3 d-inline-flex align-items-center justify-content-center gap-1" @click="handlePlayerAction" :disabled="gameState.isLoading" aria-label="发送行动">
                            <coc-icon name="scroll" :size="14" aria-hidden="true"></coc-icon> 发送
                        </button>
                    </div>
                </div>
                <p v-if="actionWheelContext" class="apex-action-fab-caption mb-0">{{ actionWheelContext.title }} · 点击圆钮展开行动</p>
            </div>
        </div>
    `,
    computed: {
        openingMessage() {
            const h = this.gameState?.chatHistory;
            if (!h) return null;
            return h.find((m) => m && m.isOpening && m.opening) || null;
        },
        openingPanelExpanded() {
            return this.openingAutoExpanded || this.openingHold;
        },
        chatLocationLabel() {
            return this.gameState?.currentLocation || '未知地点';
        },
        splitLocationHint() {
            const gc = CoCGroupCheck;
            if (!gc?.getSplitLocationSummary || !this.gameState?.groupCheckSession?.splitPaths) return null;
            const summary = gc.getSplitLocationSummary(this.gameState);
            return summary ? `分头：${summary}` : null;
        },
        displayMessages() {
            const h = this.gameState?.chatHistory;
            if (!h) return [];
            return h.filter((m) => m && !m.isOpening);
        },
        totalMsgs() {
            return this.displayMessages.length;
        },
        /** Cap DOM size; keys must be stable/unique across the sliding window. */
        visibleMessages() {
            const h = this.displayMessages;
            if (!h.length) return [];
            const MAX_VISIBLE = 150;
            const recent = h.length > MAX_VISIBLE ? h.slice(-MAX_VISIBLE) : h;
            return recent.map((m) => {
                if (m && m._vid == null) m._vid = ++_chatVidSeq;
                return m;
            });
        },
        scenarioChoices() {
            if (this.gameState?.groupCheckSession?.mode === 'choice') return [];
            return this.gameState?.scenarioRunner?.choices || [];
        },
        soloScenarioChar() {
            const active = this.activeRollChars;
            if (!active.length) return null;
            const gs = this.gameState;
            const resolve = CoCStateAccessor?.resolveSelectedActiveChar;
            if (typeof resolve === 'function' && gs) {
                const ch = resolve(gs);
                if (ch && active.some((a) => a && a.name === ch.name)) return ch;
            }
            const clamp = CoCStateAccessor?.clampSelectedCharIndex;
            if (typeof clamp === 'function' && gs) clamp(gs);
            const idx = Number.isFinite(gs?.selectedCharIndex) ? gs.selectedCharIndex : 0;
            const at = (gs?.roster || [])[idx];
            if (at && at.isActive && active.some((a) => a && a.name === at.name)) return at;
            return active[0];
        },
        soloChoiceMenu() {
            if (!this.isScenarioActive || this.gameState?.groupCheckSession?.mode === 'choice') return null;
            const runner = getScenarioRunner();
            const char = this.soloScenarioChar;
            if (!runner?.buildChoiceMenuForChar || !char || !this.scenarioChoices.length) return null;
            return runner.buildChoiceMenuForChar(char);
        },
        groupChoicePanel() {
            const gc = CoCGroupCheck;
            if (!gc) return null;
            return gc.getChoicePanel(this.gameState, {
                Engine: CoCEngine,
                checkRequires: getScenarioRunner()?.checkRequires
            });
        },
        activeChoiceMenu() {
            const panel = this.groupChoicePanel;
            if (panel?.menu?.hasMenu) {
                return {
                    mode: 'group',
                    title: `${panel.charName} 的行动（${panel.index}/${panel.total}）`,
                    menu: panel.menu,
                    groupId: panel.menuGroupId,
                    subOptions: panel.subOptions
                };
            }
            const menu = this.soloChoiceMenu;
            if (menu?.hasMenu && !this.getPendingCheck()) {
                const Menu = typeof window !== 'undefined' && window.CoCScenarioChoiceMenu;
                return {
                    mode: 'solo',
                    title: '选择技能或行动',
                    menu,
                    groupId: this._soloChoiceMenuGroup,
                    subOptions: Menu?.getMenuSubOptions(menu, this._soloChoiceMenuGroup) || []
                };
            }
            return null;
        },
        forcedRollProgress() {
            const gc = CoCGroupCheck;
            return gc ? gc.getForcedProgress(this.gameState) : null;
        },
        groupChoicePendingRoll() {
            const gc = CoCGroupCheck;
            return gc ? gc.getGroupChoicePendingRoll(this.gameState) : null;
        },
        aiActionChoices() {
            if (this.gameState?.scenarioRunner?.active) return [];
            return this.gameState?.aiActionChoices || [];
        },
        actionWheelContext() {
            if (this.getPendingCheck()) return null;

            const mapAction = (o, iconDefault) => {
                const skill = o.skillCheck?.skill || o.skillCheck?.skill_name || null;
                return {
                    ...o,
                    skillHint: skill,
                    icon: skill ? 'dice' : (iconDefault || 'scroll')
                };
            };

            const gc = CoCGroupCheck;
            const groupWheel = gc?.getGroupWheelContext?.(this.gameState, {
                Engine: CoCEngine,
                checkRequires: getScenarioRunner()?.checkRequires
            });
            if (groupWheel?.actions?.length) {
                const actions = groupWheel.actions.map((o) => mapAction(o));
                return {
                    title: groupWheel.title,
                    actions,
                    count: actions.length,
                    mode: 'group',
                    charName: groupWheel.charName
                };
            }

            if (this.activeChoiceMenu?.menu?.available?.length) {
                const actions = this.activeChoiceMenu.menu.available.map((o) => mapAction(o));
                return {
                    title: this.activeChoiceMenu.title,
                    actions,
                    count: actions.length,
                    mode: this.activeChoiceMenu.mode
                };
            }

            if (this.isScenarioActive && this.scenarioChoices.length && !this.gameState?.groupCheckSession?.mode) {
                const actions = this.scenarioChoices.map((c) => mapAction({
                    kind: 'scenario',
                    id: c.id,
                    label: c.label,
                    next: c.next,
                    skillCheck: c.skillCheck,
                    effects: c.effects,
                    requiresFlag: c.requiresFlag
                }));
                return { title: '可选行动', actions, count: actions.length, mode: 'solo' };
            }

            if (this.aiActionChoices.length) {
                const actions = this.aiActionChoices.map((ch) => ({
                    kind: 'ai',
                    id: ch.id,
                    label: ch.label,
                    icon: 'scroll'
                }));
                return { title: '可选行动', actions, count: actions.length, mode: 'ai' };
            }

            return null;
        },
        scenarioModeLabel() {
            const r = getScenarioRunner();
            return r && r.getModeLabel ? r.getModeLabel() : null;
        },
        needsApiKey() {
            const gs = this.gameState;
            if (!gs || gs.scenarioRunner?.active) return false;
            const key = (gs.aiSettings && gs.aiSettings.apiKey || '').trim();
            return !key;
        },
        isScenarioActive() {
            const r = this.gameState?.scenarioRunner;
            return !!(r && r.active && !r.ended);
        },
        activeRollChars() {
            const roster = this.gameState?.roster;
            if (!Array.isArray(roster)) return [];
            return roster.filter((c) => c && c.isActive);
        },
        rollCheckTargetName() {
            const pending = this.getPendingCheck();
            if (!pending) return '';
            const gc = CoCGroupCheck;
            const groupPending = gc ? gc.getGroupChoicePendingRoll(this.gameState) : null;
            if (groupPending?.charName) return groupPending.charName;
            const forced = gc ? gc.getForcedRollTarget(this.gameState) : null;
            if (forced) return forced;
            const active = this.activeRollChars;
            if (this._rollCheckTarget && active.some((c) => c.name === this._rollCheckTarget)) {
                return this._rollCheckTarget;
            }
            const toolName = pending.tool.target_name;
            if (toolName && active.some((c) => c.name === toolName)) return toolName;
            const gs = this.gameState;
            const resolve = CoCStateAccessor?.resolveSelectedActiveChar;
            if (typeof resolve === 'function' && gs) {
                const ch = resolve(gs);
                if (ch && active.some((c) => c.name === ch.name)) return ch.name;
            }
            const clamp = CoCStateAccessor?.clampSelectedCharIndex;
            if (typeof clamp === 'function') clamp(gs);
            const idx = Number.isFinite(gs?.selectedCharIndex) ? gs.selectedCharIndex : 0;
            const at = (gs?.roster || [])[idx];
            if (at && at.isActive && active.some((c) => c.name === at.name)) return at.name;
            return active[0]?.name || toolName || '调查员';
        },
        inputPlaceholder() {
            if (this.actionWheelContext) return '或点击「行动」展开扇形菜单…';
            if (this.isScenarioActive) return '输入「继续」恢复选项，或与选项一致的文字…';
            return '你要做什么？';
        }
    },
    methods: {
        onChatScroll() {
            const box = this.$refs.chatBox;
            if (!box) return;
            this._userNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
        },
        scrollChatToBottom(force = false) {
            const box = this.$refs.chatBox;
            if (!force && box && this._userNearBottom === false) return;
            const scrollOnce = () => {
                const box = this.$refs.chatBox;
                if (box) box.scrollTop = box.scrollHeight;
            };
            this.$nextTick(() => {
                scrollOnce();
                requestAnimationFrame(() => {
                    scrollOnce();
                    requestAnimationFrame(scrollOnce);
                });
            });
        },
        resetOpeningPanelTimer() {
            if (this._openingCollapseTimer) {
                clearTimeout(this._openingCollapseTimer);
                this._openingCollapseTimer = null;
            }
            this.openingAutoExpanded = true;
            this.openingHold = false;
            this._openingCollapseTimer = setTimeout(() => {
                this.openingAutoExpanded = false;
                this._openingCollapseTimer = null;
            }, 10000);
        },
        onOpeningHoldStart() {
            this.openingHold = true;
        },
        onOpeningHoldEnd() {
            this.openingHold = false;
        },
        pickScenarioChoice(choiceId) {
            if (getScenarioRunner() && getScenarioRunner().selectChoice) {
                getScenarioRunner().selectChoice(choiceId);
            }
        },
        choiceMenuEnterGroup(group) {
            if (!group?.id) return;
            if (this.activeChoiceMenu?.mode === 'group') {
                getScenarioRunner()?.setGroupChoiceMenuGroup(group.id);
            } else {
                this._soloChoiceMenuGroup = group.id;
            }
        },
        choiceMenuBack() {
            if (this.activeChoiceMenu?.mode === 'group') {
                getScenarioRunner()?.setGroupChoiceMenuGroup(null);
            } else {
                this._soloChoiceMenuGroup = null;
            }
        },
        choiceMenuPick(opt) {
            if (!opt) return;
            if (this.activeChoiceMenu?.mode === 'group') {
                getScenarioRunner()?.applyGroupCharChoice(opt);
            } else {
                this.pickScenarioChoice(opt.id);
                this._soloChoiceMenuGroup = null;
            }
        },
        onWheelSelect(action) {
            if (!action || this.gameState?.isLoading) return;
            const session = this.gameState?.groupCheckSession;
            if (session?.mode === 'choice' && session.queue?.length && !session.pendingRoll) {
                getScenarioRunner()?.applyGroupCharChoice(action);
                return;
            }
            if (this.activeChoiceMenu) {
                this.choiceMenuPick(action);
                return;
            }
            if (action.kind === 'ai' || (action.label && !action.id)) {
                this.pickAiAction(action);
                return;
            }
            if (action.id) this.pickScenarioChoice(action.id);
        },
        replayScenarioChoices() {
            if (getScenarioRunner()?.replayCurrentChoices) {
                getScenarioRunner().replayCurrentChoices();
            }
        },
        confirmSwitchOnline() {
            const ok = window.confirm('退出本地剧本？聊天记录保留，但将不再显示剧本选项。可在大厅重新载入本地剧本。');
            if (!ok) return;
            if (getScenarioRunner()?.switchToOnlineMode) {
                getScenarioRunner().switchToOnlineMode();
            }
        },
        pickAiAction(ch) {
            if (!ch || !ch.label) return;
            const state = resolveStateRoot(this.$props);
            if (!state) return;
            state.playerInput.value = ch.label;
            const _ai = getCoCAI();
            if (_ai && _ai.handlePlayerAction) {
                _ai.handlePlayerAction();
            }
        },
        doPendingSkillCheck() {
            const pending = this.getPendingCheck();
            if (!pending || !this.executeSkillCheck) return;
            const target = this.rollCheckTargetName;
            pending.tool.target_name = target;
            if (pending._synthetic) {
                pending.tool.id = pending.tool.id || ('group_roll_' + Date.now());
            }
            this.executeSkillCheck(
                pending.tool,
                pending.msg,
                this.getSafeSkillName(pending.tool),
                target
            );
            this._rollCheckTarget = '';
        },
        formatChatContent(msg) {
            return formatChatContentHelper(msg);
        }
    },
    watch: {
        openingMessage(msg, prev) {
            if (msg && msg !== prev) this.resetOpeningPanelTimer();
        },
        totalMsgs(newVal, oldVal) {
            if (newVal > oldVal && this._userNearBottom !== false) {
                this.scrollChatToBottom();
            }
            if (!this.getPendingCheck()) this._rollCheckTarget = '';
        },
        scenarioChoices() {
            this._soloChoiceMenuGroup = null;
        },
        'gameState.groupCheckSession'(newS, oldS) {
            this._soloChoiceMenuGroup = null;
            if (oldS && !newS && this._userNearBottom !== false) {
                this.scrollChatToBottom();
            }
        }
    },
    mounted() {
        const state = resolveStateRoot(this.$props);
        if (state) {
            this._origScrollToBottom = state.scrollToBottom;
            state.scrollToBottom = () => {
                setTimeout(() => {
                    if (this.scrollChatToBottom) this.scrollChatToBottom();
                }, 50);
            };
        }
        if (this.openingMessage) this.resetOpeningPanelTimer();
        this.scrollChatToBottom(true);
    },
    beforeUnmount() {
        if (this._openingCollapseTimer) clearTimeout(this._openingCollapseTimer);
        const state = resolveStateRoot(this.$props);
        if (state && this._origScrollToBottom) state.scrollToBottom = this._origScrollToBottom;
    },
    setup(props, context) {
        const state = resolveStateRoot(props);
        const ai = getCoCAI();
        const gameState = state.gameState;
        
        const getPendingCheck = () => {
            const session = gameState.groupCheckSession;
            const history = gameState.chatHistory || [];

            // Between per-investigator rolls: show choice menu, not stale roll panel.
            if (session?.mode === 'choice' && !session.pendingRoll && session.queue?.length > 0) {
                const gc = CoCGroupCheck;
                if (gc?.resolveScenarioCheckMessages) gc.resolveScenarioCheckMessages(gameState);
                return null;
            }

            const findUnresolvedCheck = (targetName, skillName) => {
                for (let i = history.length - 1; i >= 0; i--) {
                    const msg = history[i];
                    if (msg.role !== 'assistant' || !msg.tool_calls || msg.isResolved) continue;
                    const tool = msg.tool_calls.find((t) => t && t.function
                        && (t.function.name === 'request_skill_check' || t.function.name === 'push_skill_check')
                        && !t.isResolved
                        && (!targetName || t.target_name === targetName)
                        && (!skillName || t.skill_name === skillName));
                    if (tool) return { tool, msg };
                }
                return null;
            };

            if (session?.mode === 'choice' && session.pendingRoll) {
                const pr = session.pendingRoll;
                const matched = findUnresolvedCheck(pr.charName, pr.skill);
                if (matched) return matched;
                return {
                    tool: {
                        function: {
                            name: 'request_skill_check',
                            arguments: JSON.stringify({ skill_name: pr.skill, target_name: pr.charName })
                        },
                        isResolved: false,
                        target_name: pr.charName,
                        skill_name: pr.skill
                    },
                    msg: null,
                    _synthetic: true
                };
            }

            if (session?.mode === 'forced' && session.queue?.length) {
                const target = session.queue[0];
                const matched = findUnresolvedCheck(target, session.skill);
                if (matched) return matched;
            }

            return findUnresolvedCheck();
        };
        
        return Object.assign({ getPendingCheck, gameState }, state, ai);
    }
};
