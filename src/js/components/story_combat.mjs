// ===============================================
// Combat panel: select target, direct tool dispatch, inline dice CTA.
// Damage/SAN only via Kernel (dispatchToolHandler → rule_check).
// ===============================================

import {
    filterActiveInitiativeOrder,
    computeActiveTurnIdx,
    resolveFirstWoundedChar,
    charMaxHp,
    buildQuickActionText,
    resolveAttackTarget,
    quickActionToToolCall,
    actionGate,
    enemyAttackTurnKey,
    canTriggerEnemyAttack,
    enemyAttackToolCall,
    chaseActionToToolCall,
    chaseStatusText,
    CHASE_QUICK_ACTIONS,
} from './combat_ui_helpers.mjs';
import { charFlags, charWoundMarks, charSanCurrent, charSanMax } from './char_hud_helpers.mjs';
import { setCombatReactAction, applyToolForceCheck } from '../state/rule_check.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { resolveSelectedActiveChar } from '../state/selection.mjs';
import { isActiveCombatEnemy } from '../engines/npc_behavior.mjs';
import { CoCEngine } from '../coc.mjs';
import { getCoCAI } from '../ai/coc_ai_bridge.mjs';

function findPendingCheckMsg(gameState) {
    const history = gameState.chatHistory || [];
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role !== 'assistant' || !msg.tool_calls || msg.isResolved) continue;
        const tool = msg.tool_calls.find((t) => t && t.function
            && (t.function.name === 'request_skill_check' || t.function.name === 'push_skill_check')
            && !t.isResolved);
        if (tool) return { tool, msg };
    }
    return null;
}

export const StoryCombat = {
    data() {
        return {
            expandInitiative: false,
            selectedEnemyId: null,
            panelMinimized: false
        };
    },
    template: `
        <div class="modal-overlay apex-combat-overlay" :class="{ 'apex-combat-overlay--min': panelMinimized }" style="z-index:50;">
            <div v-if="panelMinimized" class="apex-combat-minibar px-3 py-2 d-flex align-items-center justify-content-between gap-2">
                <span class="small">{{ panelTitleShort }} · {{ currentTurnName }}</span>
                <div class="d-flex gap-1">
                    <button type="button" class="btn btn-sm apex-btn-accent" v-if="pendingCheck" @click="doCombatRoll">掷骰</button>
                    <button type="button" class="btn btn-sm apex-btn-ghost" @click="panelMinimized = false">展开</button>
                </div>
            </div>
            <div v-else class="combat-panel apex-combat-modal" role="dialog" aria-labelledby="apex-combat-title">

                <header class="apex-combat-header d-flex justify-content-between align-items-center gap-2 px-3 py-2 flex-wrap">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <coc-icon name="combat" :size="18" class="text-danger"></coc-icon>
                        <h2 id="apex-combat-title" class="apex-combat-title mb-0">{{ panelTitle }}</h2>
                        <span v-if="combatActive" class="apex-badge apex-badge--sm apex-badge--fail">第 {{ combatRound }} 回合</span>
                        <span v-if="chaseActive" class="apex-badge apex-badge--sm">追逐 · 第 {{ chaseRound }} 轮</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <div class="apex-clue-card__meta d-inline-flex align-items-center gap-1">
                            <coc-icon name="eye" :size="12"></coc-icon>
                            {{ combatLocation }}
                        </div>
                        <button type="button" class="btn btn-sm apex-btn-ghost" @click="panelMinimized = true" title="收起面板以查看聊天">收起</button>
                    </div>
                </header>

                <div v-if="combatActive" class="apex-combat-turn px-3 py-2 text-center combat-turn-banner">
                    <div class="apex-combat-turn__label combat-turn-label">
                        现在行动：<strong>{{ currentTurnName }}</strong>
                    </div>
                    <div v-if="currentTurnIsEnemy" class="mt-1">
                        <div class="text-danger small">敌人回合 — 自动出手</div>
                        <button type="button" class="btn btn-sm apex-btn-accent mt-1"
                            :disabled="!canEnemyAttack" :title="enemyAttackTitle"
                            @click="runEnemyAttack(false)">
                            敌方出手
                        </button>
                    </div>
                    <div v-else class="text-muted small mt-1">点选敌人 → 快速指令直调结算 · 或收起后自由描述</div>
                </div>

                <div v-if="pendingCheck" class="px-3 py-2 border-bottom apex-combat-roll-cta">
                    <button type="button" class="btn apex-chat-roll-cta fw-bold py-2 w-100"
                        @click="doCombatRoll">
                        <coc-icon name="dice" :size="18" class="me-1"></coc-icon>
                        {{ pendingRoller }} 掷骰：【{{ pendingSkill }}】
                    </button>
                </div>

                <div v-if="combatActive" class="px-3 py-2 border-bottom combat-initiative-bar apex-combat-init">
                    <div class="d-flex justify-content-between align-items-center combat-initiative-toggle"
                        tabindex="0" role="button" aria-label="切换先攻排序" :aria-expanded="expandInitiative"
                        @click="expandInitiative = !expandInitiative"
                        @keydown.enter="expandInitiative = !expandInitiative"
                        @keydown.space.prevent="expandInitiative = !expandInitiative">
                        <span class="apex-growth-section-label mb-0">先攻顺序 · INITIATIVE</span>
                        <span class="apex-combat-chevron" :class="{ 'apex-combat-chevron--open': expandInitiative }" aria-hidden="true"></span>
                    </div>
                    <div v-if="expandInitiative" class="d-flex flex-wrap gap-1 mt-2 pb-1">
                        <span v-for="(t, i) in activeOrder" :key="t.id || t.name"
                            class="apex-badge apex-badge--sm d-inline-flex align-items-center gap-1"
                            :class="initiativeChipClass(t, i)">
                            <coc-icon v-if="i === activeTurnIdx" name="combat" :size="10"></coc-icon>
                            {{ t.name }}
                        </span>
                    </div>
                </div>

                <section v-if="combatActive" class="px-3 pt-2 pb-1 flex-shrink-0">
                    <header class="apex-panel__head border-0 pb-2 mb-2 px-0">
                        <coc-icon name="tentacle" :size="14"></coc-icon>
                        <span>敌方 · HOSTILE</span>
                        <span class="text-muted small ms-2">点击选中目标</span>
                    </header>
                    <div v-if="!combatEnemies.length" class="empty-state empty-state-compact">
                        <coc-icon name="combat" :size="32" class="empty-state-icon text-secondary"></coc-icon>
                        <div class="empty-state-title">暂无敌方单位</div>
                        <div class="empty-state-hint">守秘人宣告战斗后，敌人将显示于此</div>
                    </div>
                    <article v-for="enemy in combatEnemies" :key="enemy.id || enemy.name"
                        class="apex-combat-enemy mb-2 combat-enemy-card"
                        :class="{
                            defeated: enemy.isDefeated,
                            'apex-combat-enemy--active': !enemy.isDefeated,
                            'apex-combat-enemy--selected': isSelectedEnemy(enemy)
                        }"
                        role="button"
                        tabindex="0"
                        @click="selectEnemy(enemy)"
                        @keydown.enter="selectEnemy(enemy)">
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <div class="d-flex flex-wrap align-items-center gap-1">
                                <span class="apex-combat-enemy__name combat-enemy-name" :class="{ defeated: enemy.isDefeated }">{{ enemy.name }}</span>
                                <span v-if="isSelectedEnemy(enemy) && !enemy.isDefeated" class="apex-badge apex-badge--sm apex-badge--warn">目标</span>
                                <span v-if="enemy.armor" class="apex-badge apex-badge--sm combat-armor-badge">
                                    <coc-icon name="shield" :size="10"></coc-icon> {{ enemy.armor }}
                                </span>
                                <span v-if="enemy.isDefeated" class="apex-badge apex-badge--sm apex-map-badge--unknown d-inline-flex align-items-center gap-1 combat-defeated-badge">
                                    <coc-icon name="combat" :size="10"></coc-icon> 击败
                                </span>
                            </div>
                            <span v-if="!enemy.isDefeated" class="apex-combat-enemy__hp combat-enemy-hp">{{ enemy.hp }}/{{ enemy.maxHp || enemy.hp }}</span>
                        </div>
                        <div v-if="!enemy.isDefeated" class="apex-vital" data-stat="hp">
                            <div class="apex-vital__track combat-hp-progress">
                                <div class="apex-vital__fill" :style="'width:' + Math.max(0, enemy.hp / (enemy.maxHp || enemy.hp || 1) * 100) + '%'"></div>
                            </div>
                        </div>
                        <p v-if="enemy.description" class="apex-clue-card__excerpt mt-2 mb-0 combat-enemy-desc">{{ enemy.description }}</p>
                    </article>
                </section>

                <section v-if="combatActive" class="px-3 pt-2 pb-2 border-top apex-combat-allies">
                    <header class="apex-panel__head border-0 pb-2 mb-2 px-0">
                        <coc-icon name="character" :size="14"></coc-icon>
                        <span>调查员 · SQUAD</span>
                    </header>
                    <div class="d-flex flex-wrap gap-2">
                        <article v-for="char in activeChars" :key="char.name" class="apex-combat-ally combat-char-card flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center mb-2 gap-1 flex-wrap">
                                <span class="apex-combat-ally__name combat-char-name">{{ char.name }}</span>
                                <div class="d-flex flex-wrap gap-1">
                                    <span v-if="hudFlags(char).isInsane" class="apex-badge apex-badge--sm apex-badge--fail combat-char-insane">疯狂</span>
                                    <span v-if="hudFlags(char).hasMajorWound" class="apex-badge apex-badge--sm apex-badge--danger">重伤</span>
                                    <span v-if="hudFlags(char).isDying" class="apex-badge apex-badge--sm apex-badge--warn">濒死</span>
                                </div>
                            </div>
                            <div class="apex-vital mb-1" data-stat="hp" :class="{ 'apex-vital--dying': hudFlags(char).isDying }">
                                <div class="apex-vital__label combat-char-stats">
                                    <span>HP {{ char.hp }}/{{ charMaxHp(char) }}</span>
                                    <span>SAN {{ charSanCurrent(char) }}/{{ charSanMax(char) }}</span>
                                </div>
                                <div class="apex-vital__track combat-hp-progress-inv">
                                    <div class="apex-vital__fill" :style="'width:' + Math.max(0, char.hp / (charMaxHp(char) || 1) * 100) + '%'"></div>
                                </div>
                            </div>
                            <p v-if="woundLine(char)" class="apex-combat-wound-line mb-0">{{ woundLine(char) }}</p>
                        </article>
                    </div>
                </section>

                <section v-if="chaseActive" class="px-3 pt-2 pb-2 border-top apex-chase-panel">
                    <header class="apex-panel__head border-0 pb-2 mb-2 px-0">
                        <coc-icon name="rifle" :size="14"></coc-icon>
                        <span>{{ chaseVehicle ? '载具枪战 · VEHICLE' : '追逐 · CHASE' }}</span>
                    </header>
                    <p class="apex-clue-card__excerpt small mb-2">{{ chaseSummary }}</p>
                    <div class="d-flex flex-wrap gap-1">
                        <button type="button" class="btn btn-sm apex-combat-action"
                            v-for="act in visibleChaseActions" :key="act.id"
                            :disabled="chaseActionDisabled(act.id)"
                            :title="chaseActionTitle(act.id)"
                            @click="runChaseAction(act.id)">
                            {{ act.label }}
                        </button>
                    </div>
                    <p v-if="combatActive" class="text-muted small mt-2 mb-0">战斗进行中时，追逐轮次随战斗回合推进，勿重复点「下一轮」。</p>
                </section>

                <section v-if="combatActive" class="px-3 pb-3 pt-2 border-top combat-actions-bar apex-combat-actions">
                    <div class="apex-combat-hint combat-guidance-hint mb-2" role="note">
                        <coc-icon name="scroll" :size="12" class="flex-shrink-0 mt-1"></coc-icon>
                        <span v-if="pendingReact">正在被攻击：点「生存」闪避或「反击」，二者只能选一，然后掷骰。</span>
                        <span v-else>近战/射击/闪避/反击/逃脱直调规则引擎；其余指令仍可描述行动。</span>
                    </div>
                    <div class="apex-growth-section-label mb-2 combat-actions-label">快速指令 · CoC 7e</div>
                    <div class="d-flex flex-wrap gap-1">
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            :disabled="!canUseAction('melee')" :title="actionTitle('melee')"
                            @click="runAction('melee')">
                            <coc-icon name="equip" :size="13"></coc-icon> 近战
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            :disabled="!canUseAction('shoot')" :title="actionTitle('shoot')"
                            @click="runAction('shoot')">
                            <coc-icon name="rifle" :size="13"></coc-icon> 射击
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            :disabled="!canUseAction('counter')" :title="actionTitle('counter')"
                            @click="chooseReact('counter')">
                            <coc-icon name="combat" :size="13"></coc-icon> 反击
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            :disabled="!canUseAction('dodge')" :title="actionTitle('dodge')"
                            @click="chooseReact('dodge')">
                            <coc-icon name="shield" :size="13"></coc-icon> 生存
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            :disabled="!canUseAction('flee')" :title="actionTitle('flee')"
                            @click="runAction('flee')">
                            <coc-icon name="eye" :size="13"></coc-icon> 逃脱
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            @click="feedText('grapple')">
                            <coc-icon name="equip" :size="13"></coc-icon> 擒抱
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            @click="feedText('skill')">
                            <coc-icon name="growth" :size="13"></coc-icon> 技能
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            @click="feedText('intimidate')">
                            <coc-icon name="npc" :size="13"></coc-icon> 交涉
                        </button>
                        <button type="button" class="btn btn-sm apex-combat-action combat-quick-btn"
                            @click="feedText('environment')">
                            <coc-icon name="eye" :size="13"></coc-icon> 环境
                        </button>
                        <button type="button" class="btn btn-sm apex-btn-ghost"
                            @click="endTurn" title="结束当前回合">
                            结束回合
                        </button>
                    </div>
                </section>

                <footer v-if="!combatActive" class="px-3 pb-3 text-center">
                    <button type="button" class="btn btn-sm apex-btn-ghost" @click="closeModal">关闭面板</button>
                </footer>
            </div>
        </div>
    `,
    computed: {
        combatActive() { return !!(this.gameState.combat && this.gameState.combat.active); },
        chaseActive() { return !!(this.gameState.chase && this.gameState.chase.active); },
        chaseVehicle() { return !!(this.gameState.chase && this.gameState.chase.vehicle); },
        combatRound() { return (this.gameState.combat && this.gameState.combat.round) || 1; },
        chaseRound() { return (this.gameState.chase && this.gameState.chase.round) || 1; },
        combatLocation() {
            return (this.gameState.combat && this.gameState.combat.location)
                || (this.chaseVehicle ? '载具追逐' : '追逐')
                || '—';
        },
        combatEnemies() {
            return (this.gameState.combat && this.gameState.combat.enemies) || [];
        },
        panelTitle() {
            if (this.combatActive && this.chaseActive && this.chaseVehicle) return '战斗 · 载具枪战';
            if (this.combatActive) return '战斗中 · COMBAT';
            if (this.chaseVehicle) return '载具枪战 · VEHICLE';
            return '追逐 · CHASE';
        },
        panelTitleShort() {
            if (this.combatActive) return `战斗 · 第 ${this.combatRound} 回合`;
            return `追逐 · 第 ${this.chaseRound} 轮`;
        },
        chaseSummary() {
            return chaseStatusText(this.gameState.chase, CoCEngine);
        },
        visibleChaseActions() {
            return CHASE_QUICK_ACTIONS.filter((a) => {
                if (a.vehicleOnly && !this.chaseVehicle) return false;
                if (a.chaseOnlyRound && this.combatActive) return false;
                return true;
            });
        },
        enemyAttackTargetName() {
            const hpOf = (c) => {
                if (!c) return 0;
                if (c.derived && typeof c.derived.hp === 'number') return c.derived.hp;
                return Number(c.hp) || 0;
            };
            const pending = this.gameState.pendingRuleCheck;
            if (pending && pending.kind === 'combat_react') {
                const who = pending.target || pending.roller;
                if (who) return who;
            }
            const selected = resolveSelectedActiveChar(this.gameState);
            if (selected && hpOf(selected) > 0) return selected.name;
            const living = this.activeChars.find((c) => hpOf(c) > 0) || this.activeChars[0];
            return (living && living.name) || null;
        },
        enemyAttackerName() {
            if (!this.currentTurnIsEnemy || !this.currentTurn) return null;
            return this.currentTurn.name || null;
        },
        canEnemyAttack() {
            return canTriggerEnemyAttack({
                combatActive: this.combatActive,
                currentTurnIsEnemy: this.currentTurnIsEnemy,
                pendingRuleCheck: this.gameState.pendingRuleCheck,
                enemyName: this.enemyAttackerName,
                targetName: this.enemyAttackTargetName
            }).ok;
        },
        enemyAttackTitle() {
            const g = canTriggerEnemyAttack({
                combatActive: this.combatActive,
                currentTurnIsEnemy: this.currentTurnIsEnemy,
                pendingRuleCheck: this.gameState.pendingRuleCheck,
                enemyName: this.enemyAttackerName,
                targetName: this.enemyAttackTargetName
            });
            return g.ok ? '结算敌方攻击（Kernel）' : (g.desc || '');
        },
        chaseActorName() {
            const parts = (this.gameState.chase && this.gameState.chase.participants) || [];
            const rosterNames = new Set(this.activeChars.map((c) => c.name));
            const onRoster = parts.find((p) => p && rosterNames.has(p.name));
            if (onRoster) return onRoster.name;
            if (this.actingChar && this.actingChar.name) return this.actingChar.name;
            return (this.activeChars[0] && this.activeChars[0].name) || null;
        },
        chaseShootEnemy() {
            const sel = this.selectedEnemy;
            if (sel && sel.name) return sel.name;
            const parts = (this.gameState.chase && this.gameState.chase.participants) || [];
            const actor = this.chaseActorName;
            const actorPart = parts.find((p) => p && p.name === actor);
            const foe = parts.find((p) => {
                if (!p || p.name === actor) return false;
                if (p.isEnemy) return true;
                if (actorPart && p.isQuarry !== actorPart.isQuarry) return true;
                return false;
            });
            if (foe && foe.name) return foe.name;
            const anyOther = parts.find((p) => p && p.name !== actor);
            return (anyOther && anyOther.name) || null;
        },
        activeChars() { return (this.gameState.roster || []).filter(c => c && c.isActive); },
        activeOrder() {
            if (!this.combatActive) return [];
            return filterActiveInitiativeOrder(
                this.gameState.combat.initiativeOrder,
                this.gameState.combat.enemies,
                this.gameState.roster
            );
        },
        activeTurnIdx() { return computeActiveTurnIdx(this.gameState.combat?.currentTurnIdx, this.activeOrder.length); },
        currentTurn() { return this.activeOrder[this.activeTurnIdx] || null; },
        currentTurnName() { return this.currentTurn ? this.currentTurn.name : (this.chaseActive ? '追逐中' : '—'); },
        currentTurnIsEnemy() { return this.currentTurn ? this.currentTurn.isEnemy : false; },
        firstWoundedChar() {
            return resolveFirstWoundedChar(
                this.gameState.roster,
                this.activeChars,
                resolveSelectedActiveChar(this.gameState) || this.actingChar
            );
        },
        actingChar() {
            if (this.currentTurn && !this.currentTurn.isEnemy) {
                return this.gameState.roster.find((c) => c && c.name === this.currentTurn.name) || null;
            }
            const pending = this.gameState.pendingRuleCheck;
            if (pending && pending.kind === 'combat_react') {
                const who = pending.roller || pending.target;
                const named = who && (this.gameState.roster || []).find((c) => c && c.name === who);
                if (named) return named;
            }
            return resolveSelectedActiveChar(this.gameState) || null;
        },
        selectedEnemy() {
            return resolveAttackTarget(this.combatEnemies, this.selectedEnemyId);
        },
        pendingReact() {
            return this.gameState.pendingRuleCheck && this.gameState.pendingRuleCheck.kind === 'combat_react';
        },
        pendingCheck() {
            return findPendingCheckMsg(this.gameState);
        },
        pendingSkill() {
            const p = this.pendingCheck;
            if (!p || !p.tool) return '检定';
            if (p.tool.skill_name) return p.tool.skill_name;
            try {
                const args = JSON.parse((p.tool.function && p.tool.function.arguments) || '{}');
                return args.skill_name || '检定';
            } catch (_e) {
                return '检定';
            }
        },
        pendingRoller() {
            const p = this.pendingCheck;
            if (!p || !p.tool) return '调查员';
            if (p.tool.target_name) return p.tool.target_name;
            try {
                const args = JSON.parse((p.tool.function && p.tool.function.arguments) || '{}');
                return args.target_name || this.actingChar?.name || '调查员';
            } catch (_e) {
                return this.actingChar?.name || '调查员';
            }
        }
    },
    methods: {
        charMaxHp,
        charSanCurrent,
        charSanMax,
        hudFlags(char) {
            return charFlags(char);
        },
        woundLine(char) {
            return charWoundMarks(char).summary;
        },
        isSelectedEnemy(enemy) {
            if (!isActiveCombatEnemy(enemy)) return false;
            const sel = this.selectedEnemy;
            if (!sel) return false;
            return sel === enemy || sel.id === enemy.id || sel.name === enemy.name;
        },
        selectEnemy(enemy) {
            if (!isActiveCombatEnemy(enemy)) return;
            this.selectedEnemyId = enemy.id != null ? enemy.id : enemy.name;
        },
        actionTitle(actionId) {
            const Engine = CoCEngine;
            const gate = actionGate(Engine, this.actingChar, actionId);
            return gate.ok ? '' : (gate.desc || '无法行动');
        },
        canUseAction(actionId) {
            if (this.currentTurnIsEnemy && actionId !== 'dodge' && actionId !== 'counter') return false;
            const Engine = CoCEngine;
            return actionGate(Engine, this.actingChar, actionId).ok;
        },
        chooseReact(action) {
            if (this.pendingReact) {
                if (action === 'counter' && this.gameState.pendingRuleCheck.ranged) {
                    setCombatReactAction(this.gameState, 'dodge');
                    return;
                }
                setCombatReactAction(this.gameState, action);
                return;
            }
            this.runAction(action === 'counter' ? 'counter' : 'dodge');
        },
        initiativeChipClass(t, i) {
            if (i !== this.activeTurnIdx) return 'apex-combat-init-chip';
            return t.isEnemy ? 'apex-combat-init-chip apex-combat-init-chip--enemy-active' : 'apex-combat-init-chip apex-combat-init-chip--ally-active';
        },
        feedText(actionId) {
            const text = buildQuickActionText(actionId, this.firstWoundedChar);
            CoCStateAccessor.setPlayerInput(text);
            { const _ai = getCoCAI(); if (_ai && _ai.handlePlayerAction) _ai.handlePlayerAction(); }
        },
        dispatchToolCall(call) {
            if (!call) return;
            if (call.error) {
                this.gameState.chatHistory.push({
                    role: 'system', isLocalOnly: true, isAlert: true, content: '⚠️ ' + call.error
                });
                return;
            }
            const _ai = getCoCAI();
            if (!_ai || typeof _ai.dispatchToolHandler !== 'function') {
                this.gameState.chatHistory.push({
                    role: 'system', isLocalOnly: true, isAlert: true,
                    content: '⚠️ 规则工具未就绪，无法结算。'
                });
                return;
            }
            try {
                const result = _ai.dispatchToolHandler(call.tool, call.args || {});
                applyToolForceCheck(this.gameState, result);
            } catch (err) {
                this.gameState.chatHistory.push({
                    role: 'system',
                    isLocalOnly: true,
                    isAlert: true,
                    content: '⚠️ 指令失败：' + (err.message || err)
                });
            }
        },
        runAction(actionId) {
            if (!this.canUseAction(actionId)) return;
            const actor = this.actingChar?.name;
            const call = quickActionToToolCall(actionId, actor, this.selectedEnemy);
            if (!call) {
                this.feedText(actionId);
                return;
            }
            this.dispatchToolCall(call);
        },
        runEnemyAttack(fromAuto) {
            const gate = canTriggerEnemyAttack({
                combatActive: this.combatActive,
                currentTurnIsEnemy: this.currentTurnIsEnemy,
                pendingRuleCheck: this.gameState.pendingRuleCheck,
                enemyName: this.enemyAttackerName,
                targetName: this.enemyAttackTargetName
            });
            if (!gate.ok) return;
            const key = enemyAttackTurnKey(this.combatRound, this.activeTurnIdx, this.enemyAttackerName);
            if (fromAuto && this.gameState._lastEnemyAttackKey === key) return;
            const enemyObj = (this.gameState.combat.enemies || []).find(
                (e) => e && e.name === this.enemyAttackerName
            ) || this.currentTurn;
            const call = enemyAttackToolCall(this.enemyAttackerName, this.enemyAttackTargetName, {
                enemy: enemyObj
            });
            this.dispatchToolCall(call);
        },
        maybeAutoEnemyAttack() {
            if (this.gameState._suppressEnemyAttackAuto) {
                this.gameState._suppressEnemyAttackAuto = false;
                return;
            }
            if (!this.canEnemyAttack) return;
            const key = enemyAttackTurnKey(this.combatRound, this.activeTurnIdx, this.enemyAttackerName);
            if (this.gameState._lastEnemyAttackKey === key) return;
            this.runEnemyAttack(true);
        },
        chaseActionDisabled(actionId) {
            if (this.gameState.pendingRuleCheck) return true;
            const chase = this.gameState.chase;
            const speedPending = chase && chase.active && chase.speedResolved === false;
            if (speedPending && actionId !== 'end') return true;
            if (actionId === 'shoot') {
                return !this.chaseActorName || !this.chaseShootEnemy;
            }
            if (actionId === 'tick' || actionId === 'end') return false;
            return !this.chaseActorName;
        },
        chaseActionTitle(actionId) {
            if (this.chaseActionDisabled(actionId)) {
                if (this.gameState.pendingRuleCheck) return '等待掷骰';
                const chase = this.gameState.chase;
                if (chase && chase.active && chase.speedResolved === false) return '请先完成开场速度检定';
                return '缺少行动者或目标';
            }
            return '';
        },
        runChaseAction(actionId) {
            if (this.chaseActionDisabled(actionId)) return;
            const call = chaseActionToToolCall(actionId, this.chaseActorName, {
                vehicle: this.chaseVehicle,
                enemyName: this.chaseShootEnemy,
                shooterName: this.chaseActorName
            });
            this.dispatchToolCall(call);
        },
        endTurn() {
            CoCStateAccessor.advanceTurn();
        },
        doCombatRoll() {
            const pending = findPendingCheckMsg(this.gameState);
            const _aiPend = getCoCAI();
            if (!pending || !_aiPend || typeof _aiPend.executeSkillCheck !== 'function') return;
            const skill = pending.tool.skill_name
                || (_aiPend.getSafeSkillName && _aiPend.getSafeSkillName(pending.tool))
                || '斗殴';
            const head = this.gameState.pendingRuleCheck;
            const target = (head && head.roller)
                || pending.tool.target_name
                || this.actingChar?.name
                || '调查员';
            pending.tool.target_name = target;
            _aiPend.executeSkillCheck(pending.tool, pending.msg, skill, target);
        },
        closeModal() {
            if (this.gameState.activeModal === 'combat') this.gameState.activeModal = null;
        }
    },
    watch: {
        'gameState.combat.enemies': {
            deep: true,
            handler(list) {
                if (!this.selectedEnemyId && Array.isArray(list)) {
                    const first = resolveAttackTarget(list, null);
                    if (first) this.selectedEnemyId = first.id != null ? first.id : first.name;
                }
            },
            immediate: true
        },
        currentTurnIsEnemy: {
            handler() { this.$nextTick(() => this.maybeAutoEnemyAttack()); },
            immediate: true
        },
        activeTurnIdx() { this.$nextTick(() => this.maybeAutoEnemyAttack()); },
        'gameState.pendingRuleCheck'(v) {
            if (!v) this.$nextTick(() => this.maybeAutoEnemyAttack());
        }
    },
    setup() { return CoCStateAccessor.bindVueSetup(); }
};
