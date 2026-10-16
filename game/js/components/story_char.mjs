// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// ===============================================

import { ApexEquipHud } from './apex_equip_hud.mjs';
import { CoCCreator } from './char_creator.mjs';
import { CharPortrait } from './char_portrait.mjs';
import { charFlags, charWoundMarks, charSanCurrent, charSanMax, charMythosHud } from './char_hud_helpers.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCEngine } from '../coc.mjs';

const RADAR_ATTRS = ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU'];
const RADAR_LABELS = ['力量STR', '体质CON', '体型SIZ', '敏捷DEX', '外貌APP', '智力INT', '意志POW', '教育EDU'];

function buildCharDiagnostics(gameState) {
    const lines = [];
    const step = (ok, label, detail) => lines.push({ ok, label, detail: detail || '' });
    step(!!window.Vue, 'Vue 已加载');
    step(!!CoCStateAccessor?.getState?.(), 'CoCStateAccessor 已挂载');
    step(!!gameState, 'gameState 存在', gameState ? `screen=${gameState.currentScreen}` : '');
    const roster = gameState?.roster;
    step(Array.isArray(roster), 'roster 为数组', `length=${Array.isArray(roster) ? roster.length : 'n/a'}`);
    const active = Array.isArray(roster) ? roster.filter((c) => c && c.isActive) : [];
    step(active.length > 0, '至少一名 isActive 调查员', `active=${active.length}`);
    if (Array.isArray(roster) && roster.length && !active.length) {
        step(false, '全员 isActive=false', '请在「调查员小队」勾选「参与行动」');
    }
    const idx = gameState?.selectedCharIndex;
    step(Number.isFinite(idx), 'selectedCharIndex 有效', `index=${idx}`);
    if (active.length) {
            const entry = (Number.isFinite(idx) && roster[idx] && roster[idx].isActive)
                ? roster[idx]
                : (active[0] || null);
        step(!!entry, 'currentChar 可解析', entry ? entry.name : 'null');
        if (entry && !entry.attrs) step(false, '角色 attrs 缺失', '建卡数据不完整');
    }
    step(!!window.Chart || !window.__cocChartLoadFailed, 'Chart.js 雷达图', window.Chart ? 'ok' : '离线回退');
    step(!!ApexEquipHud, 'ApexEquipHud 已加载');
    return lines;
}

export const StoryChar = {
    name: 'StoryChar',
    emits: ['switch-tab'],
    components: { ApexEquipHud, CharPortrait },
    template: `
        <div class="story-char-panel apex-char-shell flex-grow-1 overflow-auto p-2 p-md-3 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
                <div class="d-flex align-items-center gap-2">
                    <coc-icon name="character" :size="18"></coc-icon>
                    <h6 class="apex-hud-title m-0">调查员档案</h6>
                </div>
                <div class="d-flex gap-1">
                    <button type="button" class="btn apex-btn-accent apex-char-action-btn d-inline-flex align-items-center gap-1" aria-label="打开调查员档案新增调查员" @click="openInvestigatorArchive"><coc-icon name="character" :size="14" aria-hidden="true"></coc-icon><span class="d-none d-sm-inline">新增调查员</span><span class="d-inline d-sm-none">新增</span></button>
                    <button type="button" class="btn apex-btn-ghost apex-char-action-btn d-inline-flex align-items-center gap-1" :class="showDiag ? 'apex-btn-danger' : ''" :aria-expanded="showDiag" aria-label="切换人物页诊断" @click="showDiag = !showDiag"><coc-icon name="settings" :size="14" aria-hidden="true"></coc-icon> {{ showDiag ? '隐藏诊断' : '诊断' }}</button>
                    <button type="button" class="btn apex-btn-ghost apex-char-action-btn" aria-label="返回剧情" @click="emitSwitchTab('chat')"><coc-icon name="arrow-left" :size="14" aria-hidden="true"></coc-icon> 返回剧情</button>
                </div>
            </div>

            <div v-if="showDiag" class="mb-3 p-2 flex-shrink-0 story-char-diag apex-panel" role="alert" aria-label="人物页诊断">
                <div class="apex-diag-head mb-2">
                    <coc-icon name="settings" :size="14" aria-hidden="true"></coc-icon>
                    <span>人物页诊断</span>
                </div>
                <div v-if="mountError" class="apex-diag-line apex-diag-line--fail mb-1">
                    <coc-icon name="combat" :size="12" aria-hidden="true"></coc-icon>
                    <span>组件异常：{{ mountError }}</span>
                </div>
                <div v-for="(d, i) in diagLines" :key="i" class="apex-diag-line" :class="d.ok ? 'apex-diag-line--ok' : 'apex-diag-line--fail'">
                    <coc-icon :name="d.ok ? 'scroll' : 'combat'" :size="12" aria-hidden="true"></coc-icon>
                    <span>{{ d.label }}<span v-if="d.detail" class="text-muted"> — {{ d.detail }}</span></span>
                </div>
            </div>

            <section v-if="rosterList.length" class="apex-char-squad mb-3 flex-shrink-0">
                <header class="apex-char-squad__head">
                    <coc-icon name="character" :size="14"></coc-icon>
                    <span>小队编制 · SQUAD</span>
                    <span class="apex-char-squad__count">{{ activeCount }}/{{ rosterList.length }} 参与行动</span>
                    <button type="button" class="btn btn-sm apex-btn-ghost apex-char-squad__archive ms-auto" aria-label="打开调查员档案" @click="openInvestigatorArchive"><coc-icon name="scroll" :size="12"></coc-icon> 档案</button>
                </header>
                <div v-if="quickPresets.length" class="apex-char-quick-enroll mb-2">
                    <span class="apex-char-quick-enroll__label">快速登记</span>
                    <div class="apex-char-quick-enroll__grid">
                        <button v-for="p in quickPresets" :key="p.name" type="button" class="btn btn-sm apex-btn-ghost apex-char-quick-enroll__btn" :title="p.desc" @click="applyQuickPreset(p)">{{ p.name }}</button>
                    </div>
                </div>
                <div class="apex-char-squad__grid" role="list">
                    <article v-for="(char, ri) in rosterList" :key="(char.name || 'char') + ri" role="listitem"
                        class="apex-char-squad-card"
                        :class="{ 'apex-char-squad-card--selected': viewRosterIndex === ri, 'apex-char-squad-card--away': !char.isActive }">
                        <button type="button" class="apex-char-squad-card__main" :aria-pressed="viewRosterIndex === ri" @click="selectRosterChar(ri)">
                            <span class="apex-char-squad-card__name">{{ char.name || '未命名' }}</span>
                            <span class="apex-char-squad-card__job">{{ char.jobName || char.job?.name || '无业' }}</span>
                        </button>
                        <label class="apex-char-squad-card__toggle">
                            <input type="checkbox" class="form-check-input" :checked="!!char.isActive" @change="toggleRosterActive(ri, $event)">
                            <span>{{ char.isActive ? '参与' : '暂离' }}</span>
                        </label>
                    </article>
                </div>
            </section>

            <div v-if="currentChar" class="flex-grow-1 d-flex flex-column gap-3">
                <div class="apex-char-hero" :class="{ 'apex-char-hero--dying': charHudFlags.isDying, 'apex-char-hero--wound': charHudFlags.hasMajorWound, 'apex-char-hero--insane': charHudFlags.isInsane }">
                    <div class="apex-char-hero__accent" aria-hidden="true"></div>
                    <div class="apex-char-hero__inner">
                        <div>
                            <div class="apex-hud-sub text-uppercase">Operative File</div>
                            <h2 class="apex-char-name mb-1">{{ currentChar.name }}</h2>
                            <div class="apex-hud-meta">{{ currentChar.jobName || currentChar.job?.name || '无业' }} · {{ currentChar.expName || '无经历' }}</div>
                            <div class="mt-2 d-flex flex-wrap gap-1">
                                <span v-if="!currentChar.isActive" class="apex-badge apex-badge--away">暂离小队</span>
                                <span v-if="charHudFlags.isInsane" class="apex-badge apex-badge--danger">疯狂</span>
                                <span v-if="charHudFlags.hasMajorWound" class="apex-badge apex-badge--danger">重伤</span>
                                <span v-if="charHudFlags.isDying" class="apex-badge apex-badge--warn">濒死</span>
                                <span v-if="charHudFlags.isUnconscious" class="apex-badge">昏迷</span>
                                <span v-if="charHudFlags.isDead" class="apex-badge apex-badge--danger">死亡</span>
                            </div>
                            <div v-if="woundHud.chips.length" class="apex-wound-row mt-2">
                                <span v-for="w in woundHud.chips" :key="w.id" class="apex-wound-chip" :class="{ 'apex-wound-chip--bleed': w.bleeding }" :title="w.desc">{{ w.label }}<span v-if="w.bleeding"> · 出血</span></span>
                            </div>
                        </div>
                        <div class="apex-vitals">
                            <div class="apex-vital" data-stat="hp" :class="{ 'apex-vital--dying': charHudFlags.isDying }">
                                <div class="apex-vital__label"><span>HP</span><span>{{ displayCurrentHp(currentChar) }}/{{ displayMaxHp(currentChar) }}</span></div>
                                <div class="apex-vital__track"><div class="apex-vital__fill" :style="{ width: vitalPct(displayCurrentHp(currentChar), displayMaxHp(currentChar)) + '%' }"></div></div>
                            </div>
                            <div class="apex-vital" data-stat="mp">
                                <div class="apex-vital__label"><span>MP</span><span>{{ displayDerived(currentChar, 'mp') }}/{{ displayMaxMp(currentChar) }}</span></div>
                                <div class="apex-vital__track"><div class="apex-vital__fill" :style="{ width: vitalPct(displayDerived(currentChar, 'mp'), displayMaxMp(currentChar)) + '%' }"></div></div>
                            </div>
                            <div class="apex-vital" data-stat="san" :class="{ 'apex-vital--insane': charHudFlags.isInsane }">
                                <div class="apex-vital__label"><span :title="sanSummary">SAN</span><span>{{ displaySan(currentChar) }}/{{ displaySanMax(currentChar) }}</span></div>
                                <div class="apex-vital__track"><div class="apex-vital__fill" :style="{ width: vitalPct(displaySan(currentChar), displaySanMax(currentChar)) + '%' }"></div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <section class="apex-panel apex-char-loadout-panel">
                    <header class="apex-panel__head">
                        <coc-icon name="equip" :size="14"></coc-icon>
                        <span>调查员 · LOADOUT</span>
                    </header>
                    <div class="apex-char-loadout">
                        <div class="apex-char-loadout__portrait">
                            <char-portrait :character="currentChar" size="lg" :fill="true" />
                        </div>
                        <div class="apex-char-loadout__gear">
                            <apex-equip-hud v-if="currentChar.isActive" layout="loadout" :show-portrait="false" :show-consumables="true" />
                            <div v-else class="apex-char-loadout__away">
                                <coc-icon name="character" :size="20"></coc-icon>
                                <p>该调查员暂离小队，勾选「参与」后可编辑装备。</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="apex-panel">
                    <header class="apex-panel__head"><coc-icon name="growth" :size="14"></coc-icon><span>能力雷达</span></header>
                    <div class="story-char-radar-wrap">
                        <canvas v-if="!chartUnavailable" id="storyCharRadarChart" aria-label="属性雷达图"></canvas>
                        <div v-else class="story-char-radar-fallback text-muted small text-center py-3">雷达图不可用 — 见下方属性格</div>
                    </div>
                </section>

                <section class="apex-panel">
                    <header class="apex-panel__head"><span>基础属性</span></header>
                    <div class="apex-attr-grid">
                        <div class="attr-grid-box apex-attr-box" v-for="key in attrOrder" :key="key">
                            <div class="attr-title">{{ key }}</div>
                            <div class="attr-val">{{ displayAttr(currentChar, key) }}</div>
                            <div class="attr-sub"><span>半:{{ half(displayAttr(currentChar, key)) }}</span><span>极:{{ fifth(displayAttr(currentChar, key)) }}</span></div>
                        </div>
                    </div>
                </section>

                <section class="apex-panel">
                    <header class="apex-panel__head"><coc-icon name="scroll" :size="14"></coc-icon><span>掌握技能</span></header>
                    <div v-if="notableSkills.length" class="d-flex flex-wrap gap-1">
                        <span v-for="sk in notableSkills" :key="sk.name" class="apex-skill-chip">{{ sk.name }} {{ sk.value }}</span>
                    </div>
                    <p v-else class="text-muted small mb-0">暂无高于基础的技能记录</p>
                </section>

                <section v-if="mythosHud.visible" class="apex-panel apex-mythos-panel">
                    <header class="apex-panel__head"><coc-icon name="tentacle" :size="14"></coc-icon><span>禁忌知识 · MYTHOS</span></header>
                    <div class="apex-vital apex-mythos-skill" data-stat="mythos">
                        <div class="apex-vital__label"><span>克苏鲁神话</span><span>{{ mythosHud.skill }}</span></div>
                        <div class="apex-vital__track"><div class="apex-vital__fill" :style="{ width: vitalPct(mythosHud.skill, 99) + '%' }"></div></div>
                    </div>
                    <div v-if="mythosHud.tomes.length" class="apex-mythos-tomes">
                        <article v-for="t in mythosHud.tomes" :key="t.key" class="apex-mythos-tome">
                            <div class="apex-mythos-tome__row">
                                <span class="apex-mythos-tome__name">{{ t.name }}</span>
                                <span class="apex-badge apex-badge--sm">{{ t.phase }}</span>
                            </div>
                            <div class="apex-vital__track apex-mythos-tome__track">
                                <div class="apex-vital__fill" :style="{ width: t.pct + '%' }"></div>
                            </div>
                            <div v-if="t.totalWeeks" class="apex-mythos-tome__meta">{{ t.weeks }}/{{ t.totalWeeks }} 周</div>
                        </article>
                    </div>
                    <div v-if="mythosHud.spells.length" class="d-flex flex-wrap gap-1 mt-2">
                        <span v-for="sp in mythosHud.spells" :key="sp" class="apex-mythos-spell">{{ sp }}</span>
                    </div>
                </section>
            </div>
            <div v-else class="text-center py-4 flex-shrink-0 apex-char-empty">
                <coc-icon name="character" :size="32" class="text-muted mb-2"></coc-icon>
                <p class="text-danger mb-2">无法显示角色卡：小队为空。</p>
                <p class="text-muted small mb-3">可在剧情中临时登记调查员，无需返回大厅。</p>
                <div class="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-stretch px-3">
                    <button type="button" class="btn apex-btn-accent apex-char-action-btn d-inline-flex align-items-center justify-content-center gap-1" aria-label="打开调查员档案" @click="openInvestigatorArchive"><coc-icon name="scroll" :size="14"></coc-icon> 打开调查员档案</button>
                    <button type="button" class="btn apex-btn-ghost apex-char-action-btn d-inline-flex align-items-center justify-content-center gap-1" aria-label="返回剧情" @click="emitSwitchTab('chat')"><coc-icon name="arrow-left" :size="14" aria-hidden="true"></coc-icon> 返回剧情</button>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            mountError: '',
            showDiag: false,
            chartUnavailable: false,
            viewRosterIndex: 0,
            attrOrder: ['STR', 'CON', 'POW', 'DEX', 'APP', 'EDU', 'SIZ', 'INT', 'LUCK']
        };
    },
    computed: {
        rosterList() {
            const gs = this.gameState;
            if (!gs || !Array.isArray(gs.roster)) return [];
            return gs.roster.filter((c) => c);
        },
        activeCount() {
            return this.rosterList.filter((c) => c.isActive).length;
        },
        diagLines() {
            try {
                return buildCharDiagnostics(this.gameState);
            } catch (e) {
                return [{ ok: false, label: '诊断异常', detail: String(e && e.message ? e.message : e) }];
            }
        },
        activeChars() {
            const gs = this.gameState;
            if (!gs || !Array.isArray(gs.roster)) return [];
            return gs.roster.filter((c) => c && c.isActive);
        },
        selectedCharIndex() {
            const gs = this.gameState;
            if (!gs) return 0;
            if (this.clampSelectedCharIndex) this.clampSelectedCharIndex(gs);
            return Number.isFinite(gs.selectedCharIndex) ? gs.selectedCharIndex : 0;
        },
        currentChar() {
            const list = this.rosterList;
            if (!list.length) return null;
            const idx = Math.min(Math.max(0, this.viewRosterIndex), list.length - 1);
            return list[idx] || null;
        },
        charHudFlags() {
            return charFlags(this.currentChar);
        },
        woundHud() {
            return charWoundMarks(this.currentChar);
        },
        mythosHud() {
            return charMythosHud(this.currentChar);
        },
        sanSummary() {
            const Engine = CoCEngine;
            if (Engine?.SanityEngine?.getSanitySummary && this.currentChar) {
                return Engine.SanityEngine.getSanitySummary(this.currentChar);
            }
            return '';
        },
        notableSkills() {
            const char = this.currentChar;
            if (!char || !char.skills) return [];
            const out = [];
            for (const [name, val] of Object.entries(char.skills)) {
                if (this.isNotableSkill(char, name, val)) out.push({ name, value: val });
            }
            return out.sort((a, b) => b.value - a.value);
        },
        quickPresets() {
            return CoCCreator?.CHARACTER_PRESETS || [];
        }
    },
    watch: {
        rosterList: {
            handler(list) {
                if (!list.length) {
                    this.viewRosterIndex = 0;
                    return;
                }
                if (this.viewRosterIndex >= list.length) this.viewRosterIndex = list.length - 1;
            },
            immediate: true
        },
        currentChar: {
            handler() {
                this.$nextTick(() => this.renderRadarChart());
            },
            deep: true
        },
        viewRosterIndex() {
            this.$nextTick(() => this.renderRadarChart());
        }
    },
    methods: {
        emitSwitchTab(tab) {
            this.$emit('switch-tab', tab);
        },
        openInvestigatorArchive() {
            const gs = this.gameState;
            if (!gs) return;
            if (!gs.ui) gs.ui = {};
            gs.ui.creatorReturn = { screen: 'story', tab: 'character' };
            if (CoCCreator?.prepareNewInvestigator) CoCCreator.prepareNewInvestigator();
            const sw = this.switchScreen || CoCStateAccessor?.switchScreen;
            if (sw) sw('creator');
        },
        applyQuickPreset(preset) {
            if (!preset || !CoCCreator?.applyPreset) return;
            CoCCreator.applyPreset(preset);
            this.$nextTick(() => this.syncViewFromSelected());
        },
        selectRosterChar(ri) {
            const gs = this.gameState;
            if (!gs || !Array.isArray(gs.roster) || ri < 0 || ri >= gs.roster.length) return;
            this.viewRosterIndex = ri;
            const char = gs.roster[ri];
            if (!char?.isActive) return;
            gs.selectedCharIndex = ri;
            if (this.clampSelectedCharIndex) this.clampSelectedCharIndex(gs);
        },
        toggleRosterActive(ri, event) {
            const gs = this.gameState;
            if (!gs || !Array.isArray(gs.roster) || ri < 0 || ri >= gs.roster.length) return;
            const char = gs.roster[ri];
            if (!char) return;
            char.isActive = !!event?.target?.checked;
            if (this.clampSelectedCharIndex) this.clampSelectedCharIndex(gs);
            if (char.isActive) this.selectRosterChar(ri);
        },
        isNotableSkill(char, skillName, val) {
            if (!skillName || val === undefined) return false;
            const acc = CoCStateAccessor;
            const visible = acc?.isVisibleSkillName
                ? acc.isVisibleSkillName(skillName)
                : !(CoCEngine?.isVisibleSkillName && !CoCEngine.isVisibleSkillName(skillName));
            if (!visible) return false;
            if (skillName === '闪避') return val > Math.floor(this.numeric(char?.attrs?.DEX) / 2);
            const skillDef = acc?.getSkillDef
                ? acc.getSkillDef(skillName)
                : CoCEngine?.BaseSkills?.[skillName];
            let base = 0;
            if (skillDef !== undefined) {
                base = typeof skillDef === 'number' ? skillDef : (skillDef.base !== undefined ? skillDef.base : 0);
            }
            return val > base;
        },
        renderRadarChart() {
            const paint = (retriesLeft = 4) => {
                if (typeof Chart === 'undefined' || window.__cocChartLoadFailed) {
                    this.chartUnavailable = true;
                    return;
                }
                this.chartUnavailable = false;
                const char = this.currentChar;
                if (!char?.attrs) return;
                const ctx = document.getElementById('storyCharRadarChart');
                if (!ctx) {
                    if (retriesLeft > 0) this.$nextTick(() => paint(retriesLeft - 1));
                    return;
                }
                const dataValues = RADAR_ATTRS.map((k) => this.numeric(char.attrs[k]));
                if (this._radarChart && this._radarChart.canvas !== ctx) {
                    this._radarChart.destroy();
                    this._radarChart = null;
                }
                if (this._radarChart) {
                    this._radarChart.data.datasets[0].data = dataValues;
                    this._radarChart.update();
                } else {
                    this._radarChart = new Chart(ctx, {
                        type: 'radar',
                        data: {
                            labels: RADAR_LABELS,
                            datasets: [{
                                label: '能力评估',
                                data: dataValues,
                                backgroundColor: 'rgba(34, 211, 238, 0.18)',
                                borderColor: 'rgba(34, 211, 238, 0.85)',
                                pointBackgroundColor: '#22d3ee',
                                pointBorderColor: '#e8e8ec'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                r: {
                                    angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                    pointLabels: { color: '#ccc', font: { size: 10 } },
                                    ticks: { display: false, min: 0, max: 100, stepSize: 20 }
                                }
                            },
                            plugins: { legend: { display: false } }
                        }
                    });
                }
            };
            this.$nextTick(() => paint());
        },
        destroyRadarChart() {
            if (this._radarChart) {
                this._radarChart.destroy();
                this._radarChart = null;
            }
        },
        numeric(value, fallback = 0) {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        },
        displayAttr(char, key) {
            return this.numeric(char?.attrs?.[key]);
        },
        displayDerived(char, key) {
            return this.numeric(char?.derived?.[key]);
        },
        displayCurrentHp(char) {
            if (char?.derived && typeof char.derived.hp === 'number') return char.derived.hp;
            return this.numeric(char?.hp);
        },
        displayMaxHp(char) {
            return this.numeric(char?.derived?.maxHp || char?.derived?.hp || char?.hp);
        },
        displayMaxMp(char) {
            const fromDerived = this.numeric(char?.derived?.maxMp);
            if (fromDerived > 0) return fromDerived;
            const pow = this.numeric(char?.attrs?.POW);
            return pow > 0 ? Math.floor(pow / 5) : Math.max(1, this.displayDerived(char, 'mp'));
        },
        displaySan(char) {
            return charSanCurrent(char);
        },
        displaySanMax(char) {
            return charSanMax(char);
        },
        half(val) {
            return Math.floor(this.numeric(val) / 2);
        },
        fifth(val) {
            return Math.floor(this.numeric(val) / 5);
        },
        vitalPct(current, max) {
            const m = this.numeric(max, 1);
            const c = this.numeric(current);
            return Math.max(0, Math.min(100, Math.round((c / m) * 100)));
        },
        syncViewFromSelected() {
            const gs = this.gameState;
            if (!gs || !Array.isArray(gs.roster) || !gs.roster.length) return;
            if (this.clampSelectedCharIndex) this.clampSelectedCharIndex(gs);
            const at = gs.roster[gs.selectedCharIndex];
            if (at) {
                this.viewRosterIndex = gs.selectedCharIndex;
                return;
            }
            const resolve = this.resolveSelectedActiveChar || CoCStateAccessor.resolveSelectedActiveChar;
            const sel = typeof resolve === 'function' ? resolve(gs) : null;
            if (sel) {
                const ri = gs.roster.indexOf(sel);
                if (ri >= 0) this.viewRosterIndex = ri;
            }
        }
    },
    mounted() {
        try {
            if (!this.gameState) this.mountError = 'gameState 未注入（setup 合并失败）';
            else if (!Array.isArray(this.gameState.roster)) this.mountError = 'roster 不是数组';
            else this.syncViewFromSelected();
            if (this.currentChar && !this.currentChar.equipment) this.currentChar.equipment = {};
        } catch (e) {
            this.mountError = String(e && e.message ? e.message : e);
        }
        this.renderRadarChart();
    },
    activated() {
        this.syncViewFromSelected();
        this.renderRadarChart();
    },
    unmounted() {
        this.destroyRadarChart();
    },
    deactivated() {
        this.destroyRadarChart();
    },
    setup() {
        return CoCStateAccessor.bindVueSetup();
    }
};
