// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { CoCStateAccessor } from '../state/accessor.mjs';
import { getCoCAI } from '../ai/coc_ai_bridge.mjs';
export const StoryMap = {
    data() { return { selectedRoom: null, mapTab: 'scene' }; },
    template: `
        <div class="story-map-panel apex-map-modal" role="dialog" aria-labelledby="apex-map-title">

            <header class="apex-map-toolbar d-flex justify-content-between align-items-center gap-2 px-3 py-2 flex-wrap">
                <div class="d-flex align-items-center gap-2 min-w-0 flex-wrap">
                    <coc-icon name="eye" :size="18" class="flex-shrink-0"></coc-icon>
                    <h2 id="apex-map-title" class="apex-map-title mb-0 text-truncate">{{ gameState.sceneMap.title || '已知地点' }}</h2>
                    <span v-if="gameState.sceneMap.rooms.length" class="apex-journal-count flex-shrink-0">{{ gameState.sceneMap.rooms.length }} 区域</span>
                </div>
                <div class="d-flex gap-1 align-items-center flex-shrink-0">
                    <div v-if="gameState.sceneMap.rooms.length" class="apex-npc-view-toggle d-flex gap-1" role="tablist">
                        <button type="button" role="tab" class="btn btn-sm apex-npc-view-btn"
                            :class="{ 'apex-npc-view-btn--active': mapTab === 'scene' }"
                            :aria-selected="mapTab === 'scene'" @click="mapTab = 'scene'">
                            <coc-icon name="clues" :size="12"></coc-icon>
                            <span class="d-none d-sm-inline">场景图</span>
                        </button>
                        <button type="button" role="tab" class="btn btn-sm apex-npc-view-btn"
                            :class="{ 'apex-npc-view-btn--active': mapTab === 'locations' }"
                            :aria-selected="mapTab === 'locations'" @click="mapTab = 'locations'">
                            <coc-icon name="scroll" :size="12"></coc-icon>
                            <span class="d-none d-sm-inline">地点列表</span>
                        </button>
                    </div>
                    <button type="button" class="btn btn-sm apex-btn-ghost" aria-label="关闭地图" @click="closeModal()">关闭</button>
                </div>
            </header>

            <div v-if="mapTab === 'scene' && gameState.sceneMap.rooms.length > 0" class="p-2 p-md-3 apex-map-stage">
                <svg :width="svgW" :height="svgH" :viewBox="'0 0 ' + svgW + ' ' + svgH"
                    class="apex-map-svg" role="img" :aria-label="gameState.sceneMap.title || '场景地图'">
                    <defs>
                        <pattern id="apexMapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(34,211,238,0.06)" stroke-width="0.5"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#apexMapGrid)"/>
                    <line v-for="(line, i) in connectionLines" :key="'l' + i"
                        :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
                        stroke="rgba(34,211,238,0.22)" stroke-width="2" stroke-dasharray="4,4"/>
                    <g v-for="room in gameState.sceneMap.rooms" :key="room.id"
                        class="apex-map-room" tabindex="0" role="button" :aria-label="room.name"
                        @keydown.enter="toggleRoomDetail(room)"
                        @keydown.space.prevent="toggleRoomDetail(room)"
                        @click="toggleRoomDetail(room)">
                        <rect :x="roomX(room)" :y="roomY(room)" :width="RW" :height="RH" rx="2"
                            :fill="roomFill(room)"
                            :stroke="room === selectedRoom ? 'var(--apex-accent)' : roomStroke(room)"
                            :stroke-width="room === selectedRoom ? 2.5 : 1.5"/>
                        <use v-if="roomStatusIcon(room)"
                            :href="'#icon-' + roomStatusIcon(room)"
                            :x="roomX(room) + 6" :y="roomY(room) + 4"
                            width="12" height="12" :fill="roomTextColor(room)"/>
                        <text v-else-if="room.status === 'unknown'"
                            :x="roomX(room) + 10" :y="roomY(room) + 13"
                            font-size="10" fill="#64748b">?</text>
                        <text :x="roomX(room) + RW / 2" :y="roomY(room) + RH / 2 + 2"
                            text-anchor="middle" dominant-baseline="middle"
                            font-size="9" :fill="roomTextColor(room)"
                            style="pointer-events: none;">
                            {{ room.name.length > 8 ? room.name.slice(0, 7) + '…' : room.name }}
                        </text>
                        <circle v-if="room.status === 'current'"
                            :cx="roomX(room) + RW - 8" :cy="roomY(room) + 8" r="4"
                            fill="var(--accent-gold)" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
                    </g>
                </svg>

                <div class="apex-map-legend d-flex flex-wrap gap-2 mt-2 px-1">
                    <span class="apex-map-legend__item"><span class="apex-map-legend__swatch apex-map-legend__swatch--current"></span>当前位置</span>
                    <span class="apex-map-legend__item"><span class="apex-map-legend__swatch apex-map-legend__swatch--explored"></span>已探索</span>
                    <span class="apex-map-legend__item"><span class="apex-map-legend__swatch apex-map-legend__swatch--dangerous"></span>危险</span>
                    <span class="apex-map-legend__item"><span class="apex-map-legend__swatch apex-map-legend__swatch--locked"></span>上锁</span>
                    <span class="apex-map-legend__item"><span class="apex-map-legend__swatch apex-map-legend__swatch--unknown"></span>未探索</span>
                </div>

                <section v-if="selectedRoom" class="apex-panel apex-panel--compact mt-2">
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span class="apex-map-room-name d-inline-flex align-items-center gap-1">
                            <coc-icon :name="roomStatusIcon(selectedRoom) || 'eye'" :size="14"></coc-icon>
                            {{ selectedRoom.name }}
                        </span>
                        <span class="apex-badge apex-badge--sm" :class="'apex-map-badge--' + selectedRoom.status">{{ statusLabel(selectedRoom.status) }}</span>
                    </div>
                    <p v-if="selectedRoom.note" class="apex-clue-card__excerpt mb-2">{{ selectedRoom.note }}</p>
                    <div v-if="selectedRoom.connections && selectedRoom.connections.length" class="apex-clue-card__meta mb-2">
                        通往：{{ selectedRoom.connections.map(id => roomName(id)).join('、') }}
                    </div>
                    <button v-if="selectedRoom.status !== 'current'" type="button"
                        class="btn btn-sm apex-btn-accent d-inline-flex align-items-center gap-1"
                        @click="goToRoom(selectedRoom)">
                        <coc-icon name="character" :size="12"></coc-icon>
                        前往此处
                    </button>
                </section>
            </div>

            <div v-if="mapTab === 'scene' && gameState.sceneMap.rooms.length === 0" class="empty-state p-4">
                <coc-icon name="eye" :size="40" class="empty-state-icon text-secondary"></coc-icon>
                <div class="empty-state-title">地图尚未绘制</div>
                <div class="empty-state-hint">探索新区域后，守秘人将逐步更新场景图</div>
            </div>

            <div v-if="mapTab === 'locations'" class="p-3 apex-map-locations">
                <div class="apex-growth-section-label mb-2">快速前往已知地点</div>
                <div v-if="gameState.knownLocations.length === 0" class="empty-state empty-state-compact py-3">
                    <div class="empty-state-hint">暂无已知地点</div>
                </div>
                <div v-else class="d-grid gap-2">
                    <button v-for="loc in gameState.knownLocations" :key="loc" type="button"
                        class="btn btn-sm apex-chat-choice-btn text-start"
                        @click="moveToLocation(loc)">
                        <coc-icon name="eye" :size="12" class="flex-shrink-0"></coc-icon>
                        前往：{{ loc }}
                    </button>
                </div>
            </div>
        </div>
    `,
    computed: {
        RW() { return 72; },
        RH() { return 38; },
        svgW() {
            const rooms = this.gameState.sceneMap.rooms || [];
            if (!rooms.length) return 300;
            const xs = rooms.map((r) => Number(r && r.x));
            const maxX = Math.max(0, ...xs.filter((n) => Number.isFinite(n)));
            return maxX * 90 + this.RW + 20;
        },
        svgH() {
            const rooms = this.gameState.sceneMap.rooms || [];
            if (!rooms.length) return 200;
            const ys = rooms.map((r) => Number(r && r.y));
            const maxY = Math.max(0, ...ys.filter((n) => Number.isFinite(n)));
            return maxY * 60 + this.RH + 20;
        },
        connectionLines() {
            const lines = [];
            const rooms = this.gameState.sceneMap.rooms;
            rooms.forEach(r => {
                (r.connections || []).forEach(targetId => {
                    const target = rooms.find(t => t.id === targetId);
                    if (target && r.id < targetId) {
                        lines.push({
                            x1: this.roomX(r) + this.RW / 2,
                            y1: this.roomY(r) + this.RH / 2,
                            x2: this.roomX(target) + this.RW / 2,
                            y2: this.roomY(target) + this.RH / 2
                        });
                    }
                });
            });
            return lines;
        }
    },
    methods: {
        roomX(r) { return r.x * 90 + 10; },
        roomY(r) { return r.y * 60 + 10; },
        roomFill(r) {
            return {
                unknown: 'rgba(8,12,22,0.95)',
                explored: 'rgba(10,26,10,0.9)',
                current: 'rgba(26,20,0,0.95)',
                dangerous: 'rgba(26,8,8,0.9)',
                locked: 'rgba(10,10,26,0.9)'
            }[r.status] || 'rgba(8,12,22,0.95)';
        },
        roomStroke(r) {
            return {
                unknown: '#334155',
                explored: '#4ade80',
                current: 'var(--accent-gold)',
                dangerous: '#f87171',
                locked: '#818cf8'
            }[r.status] || '#334155';
        },
        roomTextColor(r) {
            return {
                unknown: '#64748b',
                explored: '#86efac',
                current: 'var(--accent-gold)',
                dangerous: '#fca5a5',
                locked: '#a5b4fc'
            }[r.status] || '#94a3b8';
        },
        roomStatusIcon(r) {
            return { explored: 'eye', dangerous: 'combat', locked: 'shield' }[r.status] || null;
        },
        statusLabel(s) {
            return { unknown: '未探索', explored: '已探索', current: '当前位置', dangerous: '危险', locked: '上锁' }[s] || s;
        },
        roomName(id) {
            const r = this.gameState.sceneMap.rooms.find(rm => rm.id === id);
            return r ? r.name : id;
        },
        toggleRoomDetail(room) {
            this.selectedRoom = (this.selectedRoom && this.selectedRoom.id === room.id) ? null : room;
        },
        goToRoom(room) {
            if (!room) return;
            try {
                const state = CoCStateAccessor.getState();
                if (state && typeof state.setPosition === 'function') {
                    if (state.setPosition(room.id)) return;
                }
            } catch (_e) { /* no live state */ }
            { const _ai = getCoCAI(); if (_ai && _ai.moveToLocation) _ai.moveToLocation(room.name); }
        }
    },
    setup() { return CoCStateAccessor.bindVueSetup(getCoCAI() || {}); }
};
