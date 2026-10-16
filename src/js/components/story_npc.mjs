import { CoCStateAccessor } from '../state/accessor.mjs';
export const StoryNpc = {
    data() { return { viewMode: 'cards', filterStatus: 'all', selectedNpc: null, noteInput: '' }; },
    template: `
        <div class="d-flex flex-column h-100 apex-char-shell apex-npc-shell" style="overflow:hidden;">
            <div class="apex-npc-toolbar d-flex align-items-center gap-2 px-2 px-md-3 py-2 flex-shrink-0 flex-wrap">
                <header class="apex-panel__head mb-0 border-0 pb-0 flex-grow-1">
                    <coc-icon name="npc" :size="18"></coc-icon>
                    <span>NPC 关系网络 · ROSTER</span>
                    <span class="apex-journal-count ms-auto" aria-label="NPC 数量">{{ gameState.npcRegistry.length }}</span>
                </header>
                <div class="apex-npc-view-toggle d-flex gap-1" role="tablist" aria-label="视图模式">
                    <button type="button" role="tab" class="btn btn-sm apex-npc-view-btn"
                        :class="{ 'apex-npc-view-btn--active': viewMode === 'cards' }"
                        :aria-selected="viewMode === 'cards'" @click="viewMode = 'cards'">
                        <coc-icon name="character" :size="12"></coc-icon>
                        <span class="d-none d-sm-inline">卡片</span>
                    </button>
                    <button type="button" role="tab" class="btn btn-sm apex-npc-view-btn"
                        :class="{ 'apex-npc-view-btn--active': viewMode === 'map' }"
                        :aria-selected="viewMode === 'map'" @click="viewMode = 'map'">
                        <coc-icon name="eye" :size="12"></coc-icon>
                        <span class="d-none d-sm-inline">星图</span>
                    </button>
                </div>
                <select class="form-select form-select-sm apex-npc-filter" v-model="filterStatus" aria-label="筛选状态">
                    <option value="all">全部</option>
                    <option value="alive">存活</option>
                    <option value="dead">死亡</option>
                    <option value="missing">失踪</option>
                    <option value="insane">疯狂</option>
                </select>
            </div>

            <div v-if="gameState.npcRegistry.length === 0" class="flex-grow-1 d-flex flex-column align-items-center justify-content-center empty-state py-5">
                <coc-icon name="npc" :size="48" class="empty-state-icon text-secondary"></coc-icon>
                <div class="empty-state-title mt-2">尚未记录任何 NPC</div>
                <div class="empty-state-hint text-center px-4">AI 守秘人会在 NPC 出场时自动调用工具，在此记录。</div>
            </div>

            <div v-else-if="viewMode === 'cards'" class="flex-grow-1 overflow-auto p-2 p-md-3">
                <div v-if="filteredNpcs.length === 0" class="empty-state empty-state-compact py-4">
                    <div class="empty-state-hint">当前筛选条件下没有 NPC</div>
                </div>
                <div v-else class="row g-2">
                    <div v-for="npc in filteredNpcs" :key="npc.id" class="col-6 col-md-4 col-lg-3">
                        <article class="apex-npc-card h-100"
                            :data-status="npc.status"
                            :data-relation="relationKey(npc.relation)"
                            role="button" tabindex="0"
                            :aria-label="'查看 ' + npc.name"
                            @click="selectNpc(npc)"
                            @keyup.enter="selectNpc(npc)">
                            <div class="apex-npc-card__corner apex-npc-card__corner--tl" aria-hidden="true"></div>
                            <div class="apex-npc-card__corner apex-npc-card__corner--br" aria-hidden="true"></div>
                            <div class="d-flex justify-content-between align-items-start gap-1 mb-2">
                                <span class="apex-npc-card__name">{{ npc.name }}</span>
                                <span class="apex-badge apex-badge--sm" :class="'apex-badge--status-' + npc.status">{{ statusLabel(npc.status) }}</span>
                            </div>
                            <span class="apex-badge apex-badge--sm apex-npc-card__relation mb-2">{{ npc.relation }}</span>
                            <p class="apex-npc-card__desc mb-0">{{ npc.description || '暂无描述' }}</p>
                            <div v-if="npc.notes.length" class="apex-npc-card__meta mt-2 d-inline-flex align-items-center gap-1">
                                <coc-icon name="scroll" :size="10"></coc-icon>
                                <span>{{ npc.notes.length }} 条笔记</span>
                            </div>
                        </article>
                    </div>
                </div>
            </div>

            <div v-else-if="viewMode === 'map'" class="flex-grow-1 overflow-auto d-flex align-items-center justify-content-center apex-npc-map-stage p-2">
                <svg class="apex-npc-map" :width="mapW" :height="mapH" :viewBox="'0 0 ' + mapW + ' ' + mapH" role="img" aria-label="NPC 关系星图">
                    <defs>
                        <radialGradient id="npcMapGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="rgba(34,211,238,0.15)"/>
                            <stop offset="100%" stop-color="transparent"/>
                        </radialGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#npcMapGlow)"/>
                    <circle v-for="r in [85,130,170]" :key="r" :cx="cx" :cy="cy" :r="r"
                        fill="none" stroke="rgba(34,211,238,0.12)" stroke-width="1" stroke-dasharray="4,6"/>
                    <line v-for="npc in npcPositions" :key="'line-'+npc.id"
                        :x1="cx" :y1="cy" :x2="npc.x" :y2="npc.y"
                        :stroke="relationColor(npc.relation)" stroke-width="1"
                        :stroke-opacity="npc.status==='dead' ? 0.12 : 0.35" stroke-dasharray="3,5"/>
                    <circle :cx="cx" :cy="cy" r="30" fill="rgba(8,12,22,0.95)" stroke="var(--apex-accent)" stroke-width="2"/>
                    <use :href="'#icon-character'" :x="cx - 12" :y="cy - 14" width="24" height="24" fill="var(--apex-accent)"/>
                    <text :x="cx" :y="cy + 22" text-anchor="middle" fill="var(--apex-accent)" font-size="8" letter-spacing="1">调查员</text>
                    <g v-for="npc in npcPositions" :key="'node-'+npc.id" class="apex-npc-map-node" @click="selectNpc(npc)" role="button" tabindex="0">
                        <circle :cx="npc.x" :cy="npc.y" r="24"
                            :fill="statusBg(npc.status)"
                            :stroke="relationColor(npc.relation)" stroke-width="1.5"
                            :opacity="npc.status==='dead' ? 0.45 : 1"/>
                        <text :x="npc.x" :y="npc.y - 3" text-anchor="middle" :fill="statusColor(npc.status)" font-size="8" font-weight="bold">{{ npc.name.substring(0, 5) }}</text>
                        <text :x="npc.x" :y="npc.y + 9" text-anchor="middle" :fill="statusColor(npc.status)" font-size="7" opacity="0.85">{{ statusLabel(npc.status) }}</text>
                    </g>
                    <g class="apex-npc-map-legend" transform="translate(8, 8)">
                        <g v-for="(item, i) in relationLegend" :key="item.key" :transform="'translate(0, ' + (i * 14) + ')'">
                            <circle cx="5" cy="5" r="4" :fill="item.color" opacity="0.85"/>
                            <text x="14" y="8" fill="var(--text-muted)" font-size="8">{{ item.label }}</text>
                        </g>
                    </g>
                </svg>
            </div>

            <transition name="slide-up">
                <section v-if="selectedNpc" class="apex-npc-detail border-top flex-shrink-0">
                    <div class="apex-panel apex-panel--compact m-2 m-md-3">
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <div>
                                <h3 class="apex-npc-detail__name mb-1">{{ selectedNpc.name }}</h3>
                                <span class="apex-badge apex-badge--sm" :class="'apex-badge--status-' + selectedNpc.status">{{ statusLabel(selectedNpc.status) }}</span>
                                <span class="apex-badge apex-badge--sm apex-npc-card__relation ms-1">{{ selectedNpc.relation }}</span>
                            </div>
                            <button type="button" class="btn btn-sm apex-btn-ghost" aria-label="关闭详情" @click="selectedNpc = null">关闭</button>
                        </div>
                        <p v-if="selectedNpc.description" class="apex-npc-card__desc mb-2">{{ selectedNpc.description }}</p>
                        <p v-if="selectedNpc.behavior && selectedNpc.behavior.line" class="apex-npc-card__desc mb-2">{{ selectedNpc.behavior.line }}</p>
                        <div class="apex-npc-detail__meta mb-2 d-inline-flex align-items-center gap-1">
                            <coc-icon name="eye" :size="12"></coc-icon>
                            <span>初遇地点：{{ selectedNpc.firstSeen || '未知' }}</span>
                        </div>
                        <div class="apex-npc-status-row d-flex gap-1 mb-3 flex-wrap" role="group" aria-label="更改状态">
                            <button v-for="s in ['alive','dead','missing','insane']" :key="s" type="button"
                                class="btn btn-sm apex-npc-status-btn"
                                :class="{ 'apex-npc-status-btn--active': selectedNpc.status === s, ['apex-badge--status-' + s]: selectedNpc.status === s }"
                                @click="changeStatus(selectedNpc, s)">{{ statusLabel(s) }}</button>
                        </div>
                        <div v-if="selectedNpc.notes.length" class="mb-2">
                            <div v-for="(note, i) in selectedNpc.notes" :key="i" class="apex-npc-note">{{ note.text }}</div>
                        </div>
                        <div class="d-flex gap-2">
                            <input class="form-control form-control-sm apex-journal-input flex-grow-1"
                                v-model="noteInput" placeholder="添加笔记…" @keyup.enter="addNote">
                            <button type="button" class="btn btn-sm apex-btn-accent" @click="addNote" :disabled="!noteInput.trim()">记录</button>
                        </div>
                    </div>
                </section>
            </transition>
        </div>
    `,
    computed: {
        filteredNpcs() {
            const npcs = this.gameState.npcRegistry;
            if (this.filterStatus === 'all') return npcs;
            return npcs.filter(n => n.status === this.filterStatus);
        },
        relationLegend() {
            return [
                { key: 'ally', label: '盟友', color: this.relationColor('盟友') },
                { key: 'clue', label: '线索来源', color: this.relationColor('线索来源') },
                { key: 'neutral', label: '中立', color: this.relationColor('中立') },
                { key: 'suspect', label: '可疑', color: this.relationColor('可疑') },
                { key: 'hostile', label: '敌对', color: this.relationColor('敌对') },
            ];
        },
        cx() { return 200; },
        cy() { return 200; },
        mapW() { return 400; },
        mapH() { return 400; },
        npcPositions() {
            const cx = this.cx;
            const cy = this.cy;
            const RADII = { '盟友': 85, '线索来源': 105, '中立': 130, '可疑': 150, '敌对': 168, '未知': 115 };
            const byRelation = {};
            this.gameState.npcRegistry.forEach(npc => {
                const k = npc.relation;
                if (!byRelation[k]) byRelation[k] = [];
                byRelation[k].push(npc);
            });
            const result = [];
            Object.entries(byRelation).forEach(([rel, npcs]) => {
                const r = RADII[rel] || 130;
                npcs.forEach((npc, i) => {
                    const angle = (i / npcs.length) * 2 * Math.PI - Math.PI / 2 + (Object.keys(byRelation).indexOf(rel) * 0.4);
                    result.push({ ...npc, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
                });
            });
            return result;
        }
    },
    methods: {
        selectNpc(npc) {
            if (!npc) { this.selectedNpc = null; return; }
            if (npc.id != null && npc.id !== '') {
                this.selectedNpc = this.gameState.npcRegistry.find(n => n && n.id === npc.id) || npc;
            } else {
                // id-less: match by object identity / name, never === undefined
                const reg = this.gameState.npcRegistry || [];
                this.selectedNpc = reg.find(n => n === npc)
                    || reg.find(n => n && n.name === npc.name && (n.id == null || n.id === ''))
                    || npc;
            }
            this.noteInput = '';
        },
        relationKey(r) {
            return { '盟友': 'ally', '线索来源': 'clue', '中立': 'neutral', '可疑': 'suspect', '敌对': 'hostile', '未知': 'unknown' }[r] || 'unknown';
        },
        statusLabel(s) { return { alive: '存活', dead: '死亡', missing: '失踪', insane: '疯狂', unknown: '未知' }[s] || s; },
        statusBg(s) { return { alive: 'rgba(10,26,10,0.9)', dead: 'rgba(42,10,10,0.9)', missing: 'rgba(26,16,0,0.9)', insane: 'rgba(26,10,42,0.9)', unknown: 'rgba(17,17,17,0.9)' }[s] || '#111'; },
        statusColor(s) { return { alive: '#4ade80', dead: '#f87171', missing: '#fb923c', insane: '#c084fc', unknown: '#94a3b8' }[s] || '#aaa'; },
        relationColor(r) { return { '盟友': '#4ade80', '线索来源': '#38bdf8', '中立': '#94a3b8', '可疑': '#fb923c', '敌对': '#f87171', '未知': '#64748b' }[r] || '#555'; },
        changeStatus(npc, newStatus) {
            CoCStateAccessor.updateNpcStatus(npc.name, newStatus, null);
        },
        addNote() {
            if (!this.noteInput.trim() || !this.selectedNpc) return;
            const sel = this.selectedNpc;
            if (sel.id != null && sel.id !== '') {
                CoCStateAccessor.addNpcNote(sel.id, this.noteInput.trim());
            } else if (!sel.notes) {
                sel.notes = [];
                sel.notes.push({ text: this.noteInput.trim(), at: new Date().toISOString() });
            } else {
                sel.notes.push({ text: this.noteInput.trim(), at: new Date().toISOString() });
            }
            this.noteInput = '';
        }
    },
    setup() { return CoCStateAccessor.bindVueSetup(); }
};
