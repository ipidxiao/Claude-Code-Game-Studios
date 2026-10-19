// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { CoCStateAccessor } from '../state/accessor.mjs';
export const StoryGrowth = {
    name: 'StoryGrowth',
    data() {
        return {
            rollResults: {},
            eduResults: {},
            agingResults: {}
        };
    },
    template: `
        <div class="d-flex flex-column h-100 overflow-auto apex-char-shell apex-growth-shell p-2 p-md-3 gap-3">

            <header class="apex-panel apex-panel--compact text-center">
                <div class="apex-panel__head justify-content-center border-0 pb-2 mb-2">
                    <coc-icon name="growth" :size="18"></coc-icon>
                    <span>角色成长 · PROGRESSION</span>
                </div>
                <p class="apex-growth-intro mb-0">本章节中成功使用的技能可进行提升检定（D100 &gt; 当前技能值即可提升）</p>
            </header>

            <div v-if="activeChars.length === 0" class="empty-state py-4">
                <coc-icon name="character" :size="40" class="empty-state-icon text-secondary"></coc-icon>
                <div class="empty-state-title">无在场调查员</div>
            </div>

            <section v-for="char in activeChars" :key="char.name" class="apex-panel apex-growth-char">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-3 flex-wrap">
                    <div class="d-flex align-items-center flex-wrap gap-2">
                        <h3 class="apex-growth-char__name mb-0">{{ char.name }}</h3>
                        <span class="apex-badge apex-badge--sm">{{ char.age || 25 }} 岁</span>
                        <span class="apex-badge apex-badge--sm apex-badge--ok">
                            {{ (char.skillsUsedThisSession || []).length }} 项可提升
                        </span>
                    </div>
                    <button v-if="(char.skillsUsedThisSession || []).length > 0" type="button"
                        class="btn btn-sm apex-btn-accent d-inline-flex align-items-center gap-1"
                        @click="rollAll(char)">
                        <coc-icon name="dice" :size="12"></coc-icon>
                        一键全检定
                    </button>
                </div>

                <div v-if="(char.skillsUsedThisSession || []).length > 0" class="mb-3">
                    <div class="apex-growth-section-label">可提升技能</div>
                    <div class="d-flex flex-wrap gap-2">
                        <div v-for="entry in char.skillsUsedThisSession" :key="entry.name"
                            class="apex-growth-skill-chip"
                            :class="{ 'apex-growth-skill-chip--done': rollResults[char.name + '_' + entry.name] }">
                            <span class="apex-growth-skill-chip__name">{{ entry.name }}</span>
                            <span class="apex-growth-skill-chip__val">{{ entry.currentValue }}</span>
                            <button type="button" class="btn btn-sm apex-growth-roll-btn"
                                :disabled="!!rollResults[char.name + '_' + entry.name]"
                                :aria-label="'检定 ' + entry.name"
                                @click="doRoll(char, entry)">
                                <coc-icon name="dice" :size="12"></coc-icon>
                            </button>
                            <span v-if="rollResults[char.name + '_' + entry.name]"
                                class="apex-growth-roll-result"
                                :class="rollResults[char.name + '_' + entry.name].success ? 'apex-growth-roll-result--ok' : 'apex-growth-roll-result--fail'">
                                <template v-if="rollResults[char.name + '_' + entry.name].success">
                                    +{{ rollResults[char.name + '_' + entry.name].gained }}
                                    <span class="text-muted">({{ rollResults[char.name + '_' + entry.name].roll }})</span>
                                </template>
                                <template v-else>
                                    未提升 <span class="text-muted">({{ rollResults[char.name + '_' + entry.name].roll }})</span>
                                </template>
                            </span>
                        </div>
                    </div>
                </div>
                <p v-else class="apex-growth-hint mb-3">本章节无技能成功记录 — 通过技能检定成功可积累成长机会</p>

                <div v-if="getCompletedRolls(char).length > 0" class="mb-3">
                    <div class="apex-growth-section-label">已检定</div>
                    <div class="d-flex flex-wrap gap-1">
                        <span v-for="r in getCompletedRolls(char)" :key="r.skill"
                            class="apex-growth-done-chip"
                            :class="r.gained > 0 ? 'apex-growth-done-chip--ok' : ''">
                            {{ r.skill }}
                            <strong>{{ r.gained > 0 ? '+' + r.gained : '—' }}</strong>
                        </span>
                    </div>
                </div>

                <div class="apex-growth-actions row g-2 pt-2">
                    <div class="col-6">
                        <div class="apex-growth-action-card apex-growth-action-card--edu">
                            <div class="apex-growth-action-card__title d-inline-flex align-items-center gap-1">
                                <coc-icon name="scroll" :size="12"></coc-icon>
                                EDU 成长检定
                            </div>
                            <div class="apex-growth-action-card__hint">需骰出 &gt; {{ char.attrs?.EDU || 0 }}</div>
                            <button v-if="!eduResults[char.name]" type="button"
                                class="btn btn-sm apex-btn-accent mt-2" @click="doEdu(char)">检定</button>
                            <div v-else class="apex-growth-action-result mt-2"
                                :class="eduResults[char.name].success ? 'apex-growth-roll-result--ok' : 'apex-growth-roll-result--fail'">
                                骰出 {{ eduResults[char.name].roll }}
                                {{ eduResults[char.name].success ? '→ EDU +' + eduResults[char.name].gained : '→ 无变化' }}
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="apex-growth-action-card apex-growth-action-card--age">
                            <div class="apex-growth-action-card__title d-inline-flex align-items-center gap-1">
                                <coc-icon name="character" :size="12"></coc-icon>
                                年龄增长
                            </div>
                            <div class="apex-growth-action-card__hint">当前 {{ char.age || 25 }} 岁</div>
                            <button v-if="!agingResults[char.name]" type="button"
                                class="btn btn-sm apex-btn-danger mt-2" @click="doAging(char)">+1 年</button>
                            <div v-else class="apex-growth-action-result mt-2 apex-growth-roll-result--fail">
                                {{ char.age }} 岁
                                <span v-if="agingResults[char.name].effects && agingResults[char.name].effects.length"
                                    class="d-block small mt-1">{{ agingResults[char.name].effects.join(' ') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer class="text-center pb-2">
                <button type="button" class="btn btn-sm apex-btn-ghost" @click="clearAll()">
                    清除本章节成长记录（开始新章节）
                </button>
            </footer>
        </div>
    `,
    computed: {
        activeChars() { return this.gameState.roster.filter(c => c.isActive); }
    },
    methods: {
        doRoll(char, entry) {
            const key = char.name + '_' + entry.name;
            const result = CoCStateAccessor.rollImprovement(char.name, entry.name);
            if (result) this.rollResults[key] = result;
        },
        doEdu(char) {
            const result = CoCStateAccessor.rollEduImprovement(char.name);
            if (result) this.eduResults[char.name] = result;
        },
        doAging(char) {
            const result = CoCStateAccessor.applyAging(char.name);
            if (result) this.agingResults[char.name] = result;
        },
        rollAll(char) {
            const skills = [...(char.skillsUsedThisSession || [])];
            skills.forEach(entry => this.doRoll(char, entry));
        },
        getCompletedRolls(char) {
            return Object.entries(this.rollResults)
                .filter(([k]) => k.startsWith(char.name + '_'))
                .map(([k, v]) => ({ skill: k.slice(char.name.length + 1), gained: v.gained }));
        },
        async clearAll() {
            const ok = await CoCStateAccessor.confirmAction('确认清除本章节成长记录？这将重置所有调查员的技能成长积累。', { title: '清除成长记录', danger: true });
            if (!ok) return;
            CoCStateAccessor.clearSessionSkills();
            this.rollResults = {};
            this.eduResults = {};
            this.agingResults = {};
        }
    },
    setup() { return CoCStateAccessor.bindVueSetup(); }
};
