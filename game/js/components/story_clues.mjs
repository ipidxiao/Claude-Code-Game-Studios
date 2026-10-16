// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCUnreliableClues } from '../state/unreliable_clues.mjs';
import { CoCFalseLead } from '../state/false_lead.mjs';
const CLUE_TYPE_ICONS = {
    physical: 'inventory',
    testimony: 'npc',
    document: 'scroll',
    location: 'eye',
    event: 'combat',
    person: 'character',
    supernatural: 'tentacle',
};

export const StoryClues = {
    data() {
        return {
            viewMode: 'cards',
            filterType: 'all',
            filterStatus: 'all',
            selectedClue: null,
            addingNote: false,
            noteText: '',
            webPage: 0,
            cluesPerPage: 12,
            _layoutKey: '',
            _layoutPositions: {}
        };
    },
    template: `
        <div class="d-flex flex-column h-100 apex-char-shell apex-clue-shell">

            <div class="apex-clue-toolbar d-flex align-items-center gap-2 px-2 px-md-3 py-2 flex-shrink-0 flex-wrap">
                <header class="apex-panel__head mb-0 border-0 pb-0 flex-grow-1 d-none d-md-flex">
                    <coc-icon name="clues" :size="18"></coc-icon>
                    <span>线索板 · INTEL</span>
                </header>
                <div class="apex-npc-view-toggle d-flex gap-1" role="tablist" aria-label="线索视图">
                    <button type="button" role="tab" class="btn btn-sm apex-npc-view-btn"
                        :class="{ 'apex-npc-view-btn--active': viewMode === 'cards' }"
                        :aria-selected="viewMode === 'cards'" @click="viewMode = 'cards'">
                        <coc-icon name="scroll" :size="12"></coc-icon>
                        <span class="d-none d-sm-inline">卡片</span>
                    </button>
                    <button type="button" role="tab" class="btn btn-sm apex-npc-view-btn"
                        :class="{ 'apex-npc-view-btn--active': viewMode === 'web' }"
                        :aria-selected="viewMode === 'web'" @click="viewMode = 'web'">
                        <coc-icon name="eye" :size="12"></coc-icon>
                        <span class="d-none d-sm-inline">关联</span>
                    </button>
                </div>
                <select class="form-select form-select-sm apex-npc-filter" v-model="filterType" aria-label="线索类型">
                    <option value="all">全部类型</option>
                    <option value="physical">物证</option>
                    <option value="testimony">证词</option>
                    <option value="document">文件</option>
                    <option value="location">地点</option>
                    <option value="event">事件</option>
                    <option value="person">人物</option>
                    <option value="supernatural">异常</option>
                </select>
                <select class="form-select form-select-sm apex-npc-filter" v-model="filterStatus" aria-label="线索状态">
                    <option value="all">全部状态</option>
                    <option value="new">新发现</option>
                    <option value="investigating">调查中</option>
                    <option value="key">关键线索</option>
                    <option value="solved">已解释</option>
                    <option value="suspicious">可疑</option>
                </select>
                <span class="apex-journal-count flex-shrink-0">{{ gameState.clueBoard.clues.length }} 条</span>
                <button type="button" class="btn btn-sm apex-btn-ghost flex-shrink-0"
                    :class="{ 'apex-badge--warn': suspiciousCount > 0 }"
                    @click="filterStatus = filterStatus === 'suspicious' ? 'all' : 'suspicious'"
                    title="筛选可疑线索">
                    可疑 {{ suspiciousCount }}
                </button>
                <span v-if="mythosHeat > 0" class="apex-badge apex-badge--sm flex-shrink-0"
                    :class="mythosHeat >= 4 ? 'apex-badge--warn' : ''"
                    :title="mythosHeat >= 4 ? '神话关注热度 ' + mythosHeat + '/5 — 笔记可能不可靠' : ('神话关注热度 ' + mythosHeat + '/5')">
                    异常关注 {{ mythosHeat }}/5
                </span>
                <span v-if="gameState.kpEngine?.enabled" class="apex-badge apex-badge--sm apex-badge--warn flex-shrink-0">
                    真 {{ scenePathTrue }}/3 · 假 {{ scenePathFalse }}
                </span>
            </div>

            <div v-if="viewMode === 'cards'" class="flex-grow-1 overflow-auto p-2 p-md-3 apex-clue-feed">
                <div v-if="gameState.clueBoard.clues.length === 0" class="empty-state">
                    <coc-icon name="clues" :size="40" class="empty-state-icon text-secondary"></coc-icon>
                    <div class="empty-state-title">尚未发现任何线索</div>
                    <div class="empty-state-hint">调查员发现证据时，AI 会自动记录到此处</div>
                </div>
                <div v-else-if="filteredClues.length === 0" class="empty-state empty-state-compact py-4">
                    <div class="empty-state-hint">当前筛选条件下没有线索</div>
                </div>

                <article v-for="clue in filteredClues" :key="clue.id"
                    class="apex-clue-card mb-2"
                    :class="{ 'apex-clue-card--expanded': isSelectedClue(clue), 'apex-clue-card--key': clue.status === 'key' }"
                    :data-type="clue.type"
                    :data-status="clue.status"
                    role="button" tabindex="0"
                    :aria-expanded="isSelectedClue(clue)"
                    @click="toggleClueDetail(clue)"
                    @keyup.enter="toggleClueDetail(clue)">
                    <div class="apex-clue-card__corner apex-clue-card__corner--tl" aria-hidden="true"></div>
                    <div class="apex-clue-card__corner apex-clue-card__corner--br" aria-hidden="true"></div>
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                            <span class="apex-clue-card__icon" :style="'color:' + typeColor(clue.type)">
                                <coc-icon :name="typeIconName(clue.type)" :size="16"></coc-icon>
                            </span>
                            <span class="apex-clue-card__title text-truncate" :style="'color:' + typeColor(clue.type)">{{ displayTitle(clue) }}</span>
                        </div>
                        <div class="d-flex gap-1 flex-shrink-0">
                            <span v-if="clue.meta && clue.meta.falseLead" class="apex-badge apex-badge--sm apex-badge--warn">可疑</span>
                            <span class="apex-badge apex-badge--sm" :class="'apex-badge--clue-' + clue.status">{{ statusLabel(clue.status) }}</span>
                            <span class="apex-badge apex-badge--sm apex-clue-type-badge">{{ typeLabel(clue.type) }}</span>
                        </div>
                    </div>

                    <p v-if="!isSelectedClue(clue)" class="apex-clue-card__excerpt mb-0">{{ displayContent(clue) }}</p>

                    <div v-if="isSelectedClue(clue)" class="apex-clue-card__detail">
                        <p class="apex-clue-card__content mb-2">{{ displayContent(clue) }}</p>
                        <div class="apex-clue-card__meta mb-2 d-inline-flex align-items-center gap-1">
                            <coc-icon name="eye" :size="12"></coc-icon>
                            <span>{{ clue.location || '未知地点' }}</span>
                        </div>

                        <div v-if="getRelated(clue).length > 0" class="mb-2">
                            <div class="apex-growth-section-label">关联线索</div>
                            <div class="d-flex flex-wrap gap-1">
                                <button v-for="rel in getRelated(clue)" :key="rel.id" type="button"
                                    class="btn btn-sm apex-clue-link-btn"
                                    @click.stop="selectedClue = rel">
                                    <coc-icon :name="typeIconName(rel.type)" :size="10"></coc-icon>
                                    {{ rel.title }}
                                </button>
                            </div>
                        </div>

                        <div v-if="clue.note" class="apex-npc-note mb-2 d-inline-flex align-items-start gap-1">
                            <coc-icon name="scroll" :size="12" class="flex-shrink-0 mt-1"></coc-icon>
                            <span>{{ clue.note }}</span>
                        </div>

                        <div class="d-flex flex-wrap gap-1 mt-2" role="group" aria-label="线索操作">
                            <button type="button" class="btn btn-sm apex-clue-action apex-clue-action--key" @click.stop="setStatus(clue, 'key')">
                                <coc-icon name="tier-s" :size="10"></coc-icon> 关键
                            </button>
                            <button type="button" class="btn btn-sm apex-clue-action" @click.stop="setStatus(clue, 'investigating')">
                                <coc-icon name="eye" :size="10"></coc-icon> 调查中
                            </button>
                            <button type="button" class="btn btn-sm apex-clue-action" @click.stop="setStatus(clue, 'solved')">
                                <coc-icon name="scroll" :size="10"></coc-icon> 已解释
                            </button>
                            <button v-if="clue.meta && clue.meta.falseLead" type="button"
                                class="btn btn-sm apex-clue-action apex-badge--warn"
                                @click.stop="debunkFalseLead(clue)">
                                <coc-icon name="eye" :size="10"></coc-icon> 揭穿
                            </button>
                            <button type="button" class="btn btn-sm apex-clue-action" @click.stop="startNote(clue)">
                                <coc-icon name="journal" :size="10"></coc-icon> 笔记
                            </button>
                        </div>
                        <div v-if="addingNote && isSelectedClue(clue)" class="mt-2 d-flex gap-2" @click.stop>
                            <input v-model="noteText" class="form-control form-control-sm apex-journal-input flex-grow-1"
                                placeholder="添加玩家笔记…" @keyup.enter="saveNote(clue)">
                            <button type="button" class="btn btn-sm apex-btn-accent" @click="saveNote(clue)">保存</button>
                        </div>
                    </div>
                </article>
            </div>

            <div v-if="viewMode === 'web'" class="flex-grow-1 overflow-auto d-flex flex-column">
                <div v-if="gameState.clueBoard.clues.length === 0" class="empty-state flex-grow-1">
                    <coc-icon name="clues" :size="40" class="empty-state-icon text-secondary"></coc-icon>
                    <div class="empty-state-title">尚未发现任何线索</div>
                    <div class="empty-state-hint">调查员发现证据时，AI 会自动记录到此处</div>
                </div>
                <div v-else class="apex-clue-map-stage flex-grow-1 p-2">
                    <svg :width="webW" :height="webH" :viewBox="'0 0 ' + webW + ' ' + webH"
                        class="apex-clue-map" role="img" aria-label="线索关联图">
                        <g v-for="(link, i) in gameState.clueBoard.links" :key="'lk' + i">
                            <line v-if="nodePos(link.from) && nodePos(link.to)"
                                :x1="nodePos(link.from).x" :y1="nodePos(link.from).y"
                                :x2="nodePos(link.to).x" :y2="nodePos(link.to).y"
                                stroke="rgba(34,211,238,0.25)" stroke-width="1.5" />
                            <text v-if="link.note && nodePos(link.from) && nodePos(link.to)"
                                :x="(nodePos(link.from).x + nodePos(link.to).x) / 2"
                                :y="(nodePos(link.from).y + nodePos(link.to).y) / 2"
                                text-anchor="middle" font-size="8" fill="var(--text-muted)">{{ link.note }}</text>
                        </g>
                        <g v-for="clue in pagedWebClues" :key="clue.id"
                            class="apex-clue-map-node" tabindex="0" role="button"
                            :aria-label="clue.title"
                            @keydown.enter="toggleClueDetail(clue)"
                            @keydown.space.prevent="toggleClueDetail(clue)"
                            @click="toggleClueDetail(clue)">
                            <circle :cx="nodePos(clue.id).x" :cy="nodePos(clue.id).y"
                                :r="clue.status === 'key' ? 26 : 20"
                                :fill="nodeColor(clue)"
                                :stroke="isSelectedClue(clue) ? 'var(--apex-accent)' : (clue.status === 'key' ? 'var(--accent-gold)' : 'rgba(34,211,238,0.35)')"
                                :stroke-width="clue.status === 'key' ? 2.5 : 1.5" />
                            <use :href="'#icon-' + typeIconName(clue.type)"
                                :x="nodePos(clue.id).x - 8" :y="nodePos(clue.id).y - 12"
                                width="16" height="16" :fill="typeColor(clue.type)" />
                            <text :x="nodePos(clue.id).x" :y="nodePos(clue.id).y + 12"
                                text-anchor="middle" font-size="7.5" :fill="typeColor(clue.type)">
                                {{ clue.title.length > 6 ? clue.title.slice(0, 5) + '…' : clue.title }}
                            </text>
                        </g>
                    </svg>
                </div>
                <div v-if="webPageCount > 1" class="apex-clue-pager d-flex justify-content-center align-items-center gap-2 py-2 flex-shrink-0">
                    <button type="button" class="btn btn-sm apex-btn-ghost" :disabled="webPage <= 0" @click="webPage = Math.max(0, webPage - 1)">上一页</button>
                    <span class="small text-muted">{{ webPage + 1 }} / {{ webPageCount }}</span>
                    <button type="button" class="btn btn-sm apex-btn-ghost" :disabled="webPage >= webPageCount - 1" @click="webPage = Math.min(webPageCount - 1, webPage + 1)">下一页</button>
                </div>
                <section v-if="selectedClue && viewMode === 'web'" class="apex-clue-web-detail m-2 m-md-3 flex-shrink-0">
                    <div class="apex-panel apex-panel--compact">
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <span class="apex-clue-card__title d-inline-flex align-items-center gap-1" :style="'color:' + typeColor(selectedClue.type)">
                                <coc-icon :name="typeIconName(selectedClue.type)" :size="14"></coc-icon>
                                {{ selectedClue.title }}
                            </span>
                            <span class="apex-badge apex-badge--sm" :class="'apex-badge--clue-' + selectedClue.status">{{ statusLabel(selectedClue.status) }}</span>
                        </div>
                        <p class="apex-clue-card__content mb-0">{{ selectedClue.content }}</p>
                        <div v-if="selectedClue.note" class="apex-npc-note mt-2 mb-0 d-inline-flex gap-1">
                            <coc-icon name="scroll" :size="12"></coc-icon>
                            <span>{{ selectedClue.note }}</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    `,
    computed: {
        filteredClues() {
            return this.gameState.clueBoard.clues.filter(c => {
                const typeOk = this.filterType === 'all' || c.type === this.filterType;
                let statusOk = true;
                if (this.filterStatus === 'suspicious') {
                    statusOk = !!(c.meta && c.meta.falseLead);
                } else if (this.filterStatus !== 'all') {
                    statusOk = c.status === this.filterStatus;
                }
                return typeOk && statusOk;
            });
        },
        suspiciousCount() {
            return (this.gameState.clueBoard.clues || []).filter((c) => c && c.meta && c.meta.falseLead).length;
        },
        webW() {
            const n = this.pagedWebClues.length;
            return Math.max(300, Math.ceil(Math.sqrt(n || 1)) * 120 + 80);
        },
        webH() {
            const n = this.pagedWebClues.length;
            const cols = Math.max(1, Math.ceil(Math.sqrt(n || 1)));
            const rows = Math.max(1, Math.ceil(n / cols));
            return Math.max(200, rows * 110 + 80);
        },
        webPageCount() {
            const total = this.gameState.clueBoard.clues.length;
            return Math.max(1, Math.ceil(total / this.cluesPerPage));
        },
        pagedWebClues() {
            const clues = this.gameState.clueBoard.clues;
            if (clues.length <= this.cluesPerPage) return clues;
            const start = this.webPage * this.cluesPerPage;
            return clues.slice(start, start + this.cluesPerPage);
        },
        scenePathTrue() { return this.gameState.kpEngine?.scenePaths?.truePathCount ?? 0; },
        scenePathFalse() { return this.gameState.kpEngine?.scenePaths?.falsePathCount ?? 0; },
        mythosHeat() { return Math.max(0, Math.min(5, Number(this.gameState.mythosHeat) || 0)); }
    },
    methods: {
        displayTitle(clue) {
            return this._distort(clue).title;
        },
        displayContent(clue) {
            return this._distort(clue).content;
        },
        _distort(clue) {
            const fn = (CoCUnreliableClues && CoCUnreliableClues.distortClueDisplay)
                || null;
            if (!fn) return { title: clue.title, content: clue.content };
            return fn(clue, {
                mythosHeat: this.mythosHeat,
                moduleSeed: this.gameState.moduleSeed || 0
            });
        },
        typeIconName(t) { return CLUE_TYPE_ICONS[t] || 'clues'; },
        typeLabel(t) { return { physical: '物证', testimony: '证词', document: '文件', location: '地点', event: '事件', person: '人物', supernatural: '异常' }[t] || t; },
        typeColor(t) { return { physical: '#fbbf24', testimony: '#5eead4', document: '#7dd3fc', location: '#a3e635', event: '#f472b6', person: '#e879f9', supernatural: '#c084fc' }[t] || '#94a3b8'; },
        statusLabel(s) { return { new: '新发现', investigating: '调查中', solved: '已解释', key: '关键线索' }[s] || s; },
        nodeColor(c) { return { new: 'rgba(8,12,22,0.95)', investigating: 'rgba(20,20,8,0.95)', key: 'rgba(26,20,0,0.95)', solved: 'rgba(13,13,13,0.95)' }[c.status] || 'rgba(8,12,22,0.95)'; },
        nodePos(id) {
            this.ensureWebLayout();
            if (this._layoutPositions[id]) return this._layoutPositions[id];
            const clues = this.pagedWebClues;
            const idx = clues.findIndex(c => c.id === id);
            if (idx < 0) return null;
            const cols = Math.max(1, Math.ceil(Math.sqrt(clues.length)));
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            return { x: col * 120 + 60, y: row * 110 + 60 };
        },
        ensureWebLayout() {
            const clues = this.pagedWebClues;
            const links = this.gameState.clueBoard.links || [];
            const key = clues.map(c => c.id).join('|') + '::' + links.map(l => `${l.from}-${l.to}`).join('|');
            if (key === this._layoutKey && Object.keys(this._layoutPositions).length) return;
            this._layoutKey = key;
            const positions = {};
            const n = clues.length;
            const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
            clues.forEach((c, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                positions[c.id] = { x: col * 120 + 60, y: row * 110 + 60 };
            });
            for (let iter = 0; iter < 24; iter++) {
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        const a = clues[i].id;
                        const b = clues[j].id;
                        const pa = positions[a];
                        const pb = positions[b];
                        let dx = pb.x - pa.x;
                        let dy = pb.y - pa.y;
                        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const minDist = 52;
                        if (dist < minDist) {
                            const push = (minDist - dist) * 0.35;
                            dx = (dx / dist) * push;
                            dy = (dy / dist) * push;
                            pa.x -= dx;
                            pa.y -= dy;
                            pb.x += dx;
                            pb.y += dy;
                        }
                    }
                }
                links.forEach((link) => {
                    const pa = positions[link.from];
                    const pb = positions[link.to];
                    if (!pa || !pb) return;
                    const dx = pb.x - pa.x;
                    const dy = pb.y - pa.y;
                    pa.x += dx * 0.04;
                    pa.y += dy * 0.04;
                    pb.x -= dx * 0.04;
                    pb.y -= dy * 0.04;
                });
            }
            this._layoutPositions = positions;
        },
        getRelated(clue) {
            const linked = this.gameState.clueBoard.links
                .filter(l => l.from === clue.id || l.to === clue.id)
                .map(l => (l.from === clue.id ? l.to : l.from));
            return this.gameState.clueBoard.clues.filter(c => linked.includes(c.id));
        },
        isSelectedClue(clue) {
            if (!this.selectedClue || !clue) return false;
            if (clue.id != null && clue.id !== '' && this.selectedClue.id != null && this.selectedClue.id !== '') {
                return this.selectedClue.id === clue.id;
            }
            return this.selectedClue === clue;
        },
        toggleClueDetail(clue) {
            const same = this.selectedClue && (
                (clue.id != null && clue.id !== '' && this.selectedClue.id === clue.id)
                || (this.selectedClue === clue)
            );
            this.selectedClue = same ? null : clue;
            if (!this.selectedClue) this.addingNote = false;
        },
        setStatus(clue, status) {
            CoCStateAccessor.markClueStatus(clue.id, status);
        },
        debunkFalseLead(clue) {
            const fn = CoCFalseLead && CoCFalseLead.debunkFalseLeadClues;
            if (!fn) return;
            const gs = CoCStateAccessor.getGameState();
            fn(gs, { clueId: clue.id });
            if (CoCStateAccessor.showToast) {
                CoCStateAccessor.showToast('已揭穿可疑线索并更正记录。', 'success');
            }
        },
        startNote(clue) { this.addingNote = true; this.noteText = clue.note || ''; },
        saveNote(clue) {
            CoCStateAccessor.markClueStatus(clue.id, null, this.noteText);
            this.addingNote = false;
        }
    },
    setup() { return CoCStateAccessor.bindVueSetup(); }
};
