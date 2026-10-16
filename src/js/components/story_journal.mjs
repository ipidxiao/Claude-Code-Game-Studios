// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { journalIconId } from './icon_sprite.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';

const JOURNAL_TYPE_LABELS = {
    skill_check: '检定',
    san_loss: 'SAN',
    hp_loss: 'HP',
    item_found: '获得',
    item_lost: '失去',
    combat: '战斗',
    note: '笔记',
    heal: '治疗',
    san_recover: '恢复',
};

export const StoryJournal = {
    data() { return { noteInput: '', showNoteInput: false }; },
    template: `
        <div class="d-flex flex-column h-100 apex-char-shell apex-journal-shell" style="overflow:hidden;">
            <div class="apex-journal-toolbar d-flex justify-content-between align-items-center gap-2 px-2 px-md-3 py-2 flex-shrink-0">
                <header class="apex-panel__head mb-0 border-0 pb-0 flex-grow-1">
                    <coc-icon name="journal" :size="18"></coc-icon>
                    <span>调查员记录 · JOURNAL</span>
                    <span class="apex-journal-count ms-auto" aria-label="日志条数">{{ entryCount }}</span>
                </header>
                <div class="d-flex gap-1 flex-shrink-0">
                    <button type="button" class="btn btn-sm apex-btn-ghost d-inline-flex align-items-center gap-1"
                        :aria-expanded="showNoteInput" @click="showNoteInput = !showNoteInput">
                        <coc-icon name="scroll" :size="12"></coc-icon>
                        <span class="d-none d-sm-inline">记笔记</span>
                    </button>
                    <button type="button" class="btn btn-sm apex-btn-danger" @click="clearLog">清空</button>
                </div>
            </div>

            <div v-if="showNoteInput" class="apex-panel apex-panel--compact mx-2 mx-md-3 mb-2 flex-shrink-0">
                <div class="d-flex gap-2">
                    <input class="form-control form-control-sm apex-journal-input flex-grow-1"
                        v-model="noteInput" placeholder="记录线索、想法、备忘…" @keyup.enter="addNote">
                    <button type="button" class="btn btn-sm apex-btn-accent" @click="addNote" :disabled="!noteInput.trim()">记录</button>
                </div>
            </div>

            <div class="flex-grow-1 overflow-auto px-2 px-md-3 py-2 apex-journal-feed">
                <div v-if="groupedEntries.length === 0" class="empty-state">
                    <coc-icon name="journal" :size="40" class="empty-state-icon text-secondary"></coc-icon>
                    <div class="empty-state-title">尚无记录</div>
                    <div class="empty-state-hint">技能检定、伤亡、物品等事件将自动记录于此</div>
                </div>

                <section v-for="[date, entries] in groupedEntries" :key="date" class="apex-journal-day mb-3">
                    <div class="apex-journal-date">
                        <span class="apex-journal-date__line" aria-hidden="true"></span>
                        <span class="apex-journal-date__label">{{ date }}</span>
                        <span class="apex-journal-date__line" aria-hidden="true"></span>
                    </div>
                    <article v-for="entry in entries" :key="entry.id"
                        class="apex-journal-entry"
                        :data-type="entry.type">
                        <div class="apex-journal-entry__icon" :style="'color:' + getColor(entry.type)">
                            <coc-icon :name="journalIconId(entry.type)" :size="16"></coc-icon>
                        </div>
                        <div class="apex-journal-entry__body">
                            <div class="apex-journal-entry__top">
                                <span class="apex-journal-entry__type">{{ typeLabel(entry.type) }}</span>
                                <span class="apex-journal-entry__summary">{{ entry.summary }}</span>
                                <span v-if="entry.isSuccess === true" class="apex-badge apex-badge--sm apex-badge--ok">成功</span>
                                <span v-if="entry.isSuccess === false" class="apex-badge apex-badge--sm apex-badge--fail">失败</span>
                            </div>
                            <div class="apex-journal-entry__meta">
                                <span v-if="entry.charName" class="d-inline-flex align-items-center gap-1">
                                    <coc-icon name="character" :size="10"></coc-icon>{{ entry.charName }}
                                </span>
                                <span v-if="entry.location">{{ entry.location }}</span>
                                <span class="apex-journal-entry__time">{{ formatTime(entry.timestamp) }}</span>
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        </div>
    `,
    computed: {
        entryCount() {
            return (this.gameState.journalLog && this.gameState.journalLog.length) || 0;
        },
        groupedEntries() {
            const groups = {};
            [...this.gameState.journalLog].reverse().forEach(entry => {
                const date = new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
                if (!groups[date]) groups[date] = [];
                groups[date].push(entry);
            });
            return Object.entries(groups);
        }
    },
    methods: {
        journalIconId,
        typeLabel(type) {
            return JOURNAL_TYPE_LABELS[type] || '事件';
        },
        getColor(type) {
            return {
                skill_check: 'var(--accent-gold)',
                san_loss: '#b388ff',
                hp_loss: 'var(--danger)',
                item_found: '#4ade80',
                item_lost: '#94a3b8',
                combat: '#fb923c',
                note: 'var(--apex-accent)',
                heal: '#4ade80',
                san_recover: '#4ade80',
            }[type] || 'var(--text-muted)';
        },
        formatTime(ts) {
            try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
        },
        addNote() {
            if (!this.noteInput.trim()) return;
            CoCStateAccessor.addJournalEntry({ type: 'note', summary: this.noteInput.trim() });
            this.noteInput = '';
            this.showNoteInput = false;
        },
        async clearLog() {
            const ok = await CoCStateAccessor.confirmAction('清空全部日志记录？', { title: '清空日志', danger: true });
            if (!ok) return;
            this.gameState.journalLog.splice(0);
        }
    },
    setup() { return CoCStateAccessor.bindVueSetup(); }
};
