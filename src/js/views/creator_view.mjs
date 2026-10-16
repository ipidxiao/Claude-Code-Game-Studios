// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { CharPortrait } from '../components/char_portrait.mjs';
import { CoCCreator } from '../components/char_creator.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCEngine } from '../coc.mjs';

export const ViewCreator = {
    components: { CharPortrait },
    computed: {
        previewCharacter() {
            const d = this.draftChar || {};
            return { name: d.name || '未命名', jobName: d.job?.name || '' };
        }
    },
    template: `
        <div class="apex-creator-root apex-char-shell">
            <header class="apex-creator-header">
                <button type="button" class="btn btn-sm apex-btn-ghost apex-creator-back d-inline-flex align-items-center gap-1" @click="goBack">
                    <coc-icon name="arrow-left" :size="14"></coc-icon> 返回
                </button>
                <h1 class="apex-creator-header__title mb-0">
                    <coc-icon name="character" :size="18"></coc-icon> 调查员档案
                </h1>
                <span class="apex-creator-header__spacer" aria-hidden="true"></span>
            </header>

            <section v-if="!draftChar.name" class="apex-panel apex-creator-quick-start mb-3">
                <header class="apex-panel__head">
                    <coc-icon name="character" :size="14"></coc-icon>
                    <span>快速开始 · PRESETS</span>
                </header>
                <p class="apex-creator-quick-start__hint mb-2">一键创建完整角色，即刻开始冒险。也可手动填写下方表单。</p>
                <div class="apex-creator-preset-grid">
                    <button type="button" v-for="p in CHARACTER_PRESETS" :key="p.name"
                        class="btn apex-creator-preset-card"
                        @click="applyPreset(p)"
                        :title="p.desc">
                        <coc-icon name="character" :size="16"></coc-icon>
                        <span class="apex-creator-preset-card__label">{{ p.name }}</span>
                    </button>
                </div>
            </section>

            <nav class="apex-creator-steps mb-3" role="tablist" aria-label="建卡步骤">
                <button type="button" role="tab" class="apex-creator-step"
                    :class="{ 'apex-creator-step--active': activeCreatorTab === 'stats' }"
                    :aria-selected="activeCreatorTab === 'stats'"
                    @click="activeCreatorTab = 'stats'">
                    <span class="apex-creator-step__num">01</span>
                    <span class="apex-creator-step__label">数值与技能</span>
                </button>
                <button type="button" role="tab" class="apex-creator-step"
                    :class="{ 'apex-creator-step--active': activeCreatorTab === 'backstory' }"
                    :aria-selected="activeCreatorTab === 'backstory'"
                    @click="activeCreatorTab = 'backstory'">
                    <span class="apex-creator-step__num">02</span>
                    <span class="apex-creator-step__label">背景与经历</span>
                </button>
            </nav>

            <div v-show="activeCreatorTab === 'stats'" class="apex-creator-body">
                <div class="apex-creator-identity mb-3">
                    <section class="apex-panel apex-creator-preview-panel">
                        <header class="apex-panel__head"><coc-icon name="character" :size="14"></coc-icon><span>实时预览</span></header>
                        <char-portrait :character="previewCharacter" size="md" :show-gear="false" />
                    </section>
                    <section class="apex-panel apex-creator-form-panel flex-grow-1">
                        <header class="apex-panel__head"><coc-icon name="clipboard" :size="14"></coc-icon><span>身份信息 · ID</span></header>
                        <div class="row g-2 mb-2">
                            <div class="col-6">
                                <label class="sheet-label" for="creator-name">姓名</label>
                                <input id="creator-name" type="text" class="form-control form-control-sm apex-creator-input" v-model="draftChar.name" aria-describedby="creator-name-hint" autocomplete="name">
                                <div id="creator-name-hint" class="form-field-hint">调查员在模组中的称呼</div>
                            </div>
                            <div class="col-6">
                                <label class="sheet-label" for="creator-player">玩家</label>
                                <input id="creator-player" type="text" class="form-control form-control-sm apex-creator-input" v-model="draftChar.player" aria-describedby="creator-player-hint">
                                <div id="creator-player-hint" class="form-field-hint">桌游玩家姓名或昵称</div>
                            </div>
                        </div>
                        <div class="row g-2">
                            <div class="col-4">
                                <label class="sheet-label" for="creator-age">年龄 (影响属性)</label>
                                <input id="creator-age" type="number" class="form-control form-control-sm apex-creator-input" v-model="draftChar.age" aria-describedby="creator-age-hint" min="15" max="90">
                                <div id="creator-age-hint" class="form-field-hint">影响属性修正与移动力</div>
                            </div>
                            <div class="col-8">
                                <label class="sheet-label" for="creator-era">时代背景 (决定可选职业)</label>
                                <select id="creator-era" class="form-select form-select-sm apex-creator-input" v-model="draftChar.era" aria-describedby="creator-era-hint">
                                    <option value="1920s">1920s (经典)</option>
                                    <option value="现代">现代 (Modern)</option>
                                    <option value="1890s">1890s (煤气灯)</option>
                                </select>
                                <div id="creator-era-hint" class="form-field-hint">切换时代会过滤不可用职业</div>
                            </div>
                        </div>
                    </section>
                </div>

                <div class="d-flex mb-3 gap-2 flex-wrap">
                    <button type="button" class="btn apex-btn-accent flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1 apex-creator-action" @click="rollAllStats">
                        <coc-icon name="dice" :size="16"></coc-icon> 掷骰生成
                    </button>
                    <button type="button" class="btn apex-btn-ghost d-inline-flex align-items-center gap-1 apex-creator-action" @click="showSTImport = !showSTImport">
                        <coc-icon name="upload" :size="14"></coc-icon> .st 导入
                    </button>
                </div>

                <section v-if="showSTImport" class="apex-panel apex-creator-import mb-3">
                    <div v-if="!importPreview">
                        <header class="apex-panel__head"><coc-icon name="upload" :size="14"></coc-icon><span>粘贴角色数据</span></header>
                        <div class="form-field-hint mb-2">支持 .st指令 / 属性表 / 技能表，中英文均可</div>
                        <textarea class="form-control form-control-sm apex-creator-input mb-2" rows="5" v-model="draftChar.stImportText" placeholder=".st 力量50 体质60 体型65 敏捷70 外貌45 智力75 意志55 教育80 幸运60&#10;侦查:75 聆听:60 图书馆使用:55 急救:45"></textarea>
                        <button type="button" class="btn apex-btn-accent w-100 d-inline-flex align-items-center justify-content-center gap-1" @click="importSTData">
                            <coc-icon name="eye" :size="14"></coc-icon> 解析数据
                        </button>
                    </div>
                    <div v-else>
                        <header class="apex-panel__head"><coc-icon name="eye" :size="14"></coc-icon><span>解析结果预览</span></header>
                        <div v-if="Object.keys(importPreview.info).length > 0" class="mb-2">
                            <div class="apex-creator-import__group-label">人物信息</div>
                            <div class="d-flex flex-wrap gap-1">
                                <span v-for="(val, key) in importPreview.info" :key="key" class="apex-badge apex-badge--sm">{{ key }}: {{ val }}</span>
                            </div>
                        </div>
                        <div v-if="Object.keys(importPreview.attrs).length > 0" class="mb-2">
                            <div class="apex-creator-import__group-label">基础属性 ({{ Object.keys(importPreview.attrs).length }} 项)</div>
                            <div class="d-flex flex-wrap gap-1">
                                <span v-for="(val, key) in importPreview.attrs" :key="key" class="apex-badge apex-badge--info apex-badge--sm">{{ key }}: {{ val }}</span>
                            </div>
                        </div>
                        <div v-if="Object.keys(importPreview.skills).length > 0" class="mb-2">
                            <div class="apex-creator-import__group-label">技能 ({{ Object.keys(importPreview.skills).length }} 项)</div>
                            <div class="d-flex flex-wrap gap-1 creator-import-skills">
                                <span v-for="(val, key) in importPreview.skills" :key="key" class="apex-skill-chip">{{ key }}: {{ val }}</span>
                            </div>
                        </div>
                        <div class="form-field-hint mb-2">确认后将覆盖现有数值。</div>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn apex-btn-accent flex-grow-1" @click="confirmImport">确认导入</button>
                            <button type="button" class="btn apex-btn-ghost" @click="cancelImport">重新编辑</button>
                        </div>
                    </div>
                </section>

                <div v-show="draftChar.attrs.STR > 0">
                    <section class="apex-panel mb-3">
                        <header class="apex-panel__head"><coc-icon name="growth" :size="14"></coc-icon><span>能力雷达</span></header>
                        <div class="creator-radar-wrap">
                            <canvas v-if="!chartUnavailable" id="radarChart" aria-label="属性雷达图"></canvas>
                            <div v-else class="text-muted small text-center pt-5 px-2" role="status">
                                雷达图不可用（Chart.js 未加载）。属性数值见下方网格。
                            </div>
                        </div>
                    </section>

                    <section class="apex-panel mb-3">
                        <header class="apex-panel__head"><span>基础属性</span></header>
                        <div class="row g-1">
                            <div class="col-4" v-for="(val, key) in draftChar.attrs" :key="key">
                                <div class="attr-grid-box apex-attr-box">
                                    <div class="attr-eval-badge badge" :class="val>=80 ? 'bg-danger' : (val>=50 ? 'bg-success' : 'bg-secondary')">
                                        {{ getAttrEvaluation(val) }}
                                    </div>
                                    <div class="attr-title">{{ key }}</div>
                                    <div class="attr-val">
                                        {{ val }}
                                        <span v-if="draftChar.attrModifiers[key] > 0" class="text-success ms-1 apex-creator-mod">+{{ draftChar.attrModifiers[key] }}</span>
                                        <span v-else-if="draftChar.attrModifiers[key] < 0" class="text-danger ms-1 apex-creator-mod">{{ draftChar.attrModifiers[key] }}</span>
                                    </div>
                                    <div class="attr-sub">
                                        <span>半:{{ Math.floor(val/2) }}</span>
                                        <span>极:{{ Math.floor(val/5) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="apex-panel apex-creator-derived mb-3">
                        <header class="apex-panel__head"><span>衍生数值</span></header>
                        <div class="apex-creator-vitals row g-2 mb-2">
                            <div class="col-4 text-center">
                                <div class="apex-creator-vital-label">HP</div>
                                <div class="apex-creator-vital-val text-danger">{{ draftChar.derived.hp }}</div>
                            </div>
                            <div class="col-4 text-center">
                                <div class="apex-creator-vital-label">MP</div>
                                <div class="apex-creator-vital-val text-primary">{{ draftChar.derived.mp }}</div>
                            </div>
                            <div class="col-4 text-center">
                                <div class="apex-creator-vital-label">SAN</div>
                                <div class="apex-creator-vital-val text-info">{{ draftChar.derived.san }}</div>
                            </div>
                        </div>
                        <div class="row g-2">
                            <div class="col-4">
                                <div class="apex-creator-derived-chip">
                                    <div class="apex-creator-derived-chip__label">伤害加值</div>
                                    <div class="apex-creator-derived-chip__val">{{ draftChar.derived.db }}</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="apex-creator-derived-chip">
                                    <div class="apex-creator-derived-chip__label">体格</div>
                                    <div class="apex-creator-derived-chip__val">{{ draftChar.derived.build }}</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="apex-creator-derived-chip">
                                    <div class="apex-creator-derived-chip__label">移动力</div>
                                    <div class="apex-creator-derived-chip__val">{{ draftChar.derived.mov }}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="apex-panel apex-creator-occupation mb-3">
                        <header class="apex-panel__head"><coc-icon name="character" :size="14"></coc-icon><span>选择职业 · OCCUPATION</span></header>
                        <label class="sheet-label mb-1" for="creator-job">根据上述属性，为你挑选最合适的行当</label>
                        <select id="creator-job" class="form-select form-select-sm apex-creator-input apex-creator-input--accent" v-model="draftChar.job" @change="handleOccupationChange(draftChar.name)">
                            <option :value="null" disabled>请选择职业以解锁本职技能点</option>
                            <option v-for="(job, idx) in availableJobs" :key="idx" :value="job">{{ job.name }}</option>
                        </select>
                    </section>

                    <section class="apex-panel apex-creator-skills mb-3" :class="{ 'apex-creator-skills--locked': !draftChar.job }">
                        <header class="apex-panel__head"><coc-icon name="growth" :size="14"></coc-icon><span>技能分配 · SKILLS</span></header>
                        <div class="apex-creator-points row align-items-center small mb-2 pb-2 border-bottom border-secondary">
                            <div class="col-4 fw-bold">可用点数</div>
                            <div class="col-8 d-flex justify-content-end gap-3">
                                <span>本职 <strong class="apex-creator-points__occ" :class="pointStats.occRemainRaw === 0 ? 'text-success' : ''">{{ pointStats.occRemain }}</strong></span>
                                <span>兴趣 <strong class="apex-creator-points__per" :class="pointStats.perRemainRaw === 0 ? 'text-success' : ''">{{ pointStats.perRemain }}</strong></span>
                            </div>
                        </div>
                        <div v-if="pointStats.occOverspent || pointStats.perOverspent" class="small text-danger mb-2" role="status">
                            当前加点超过可用点数，请先减少已分配点数后再登记。
                        </div>
                        <div v-else-if="!isPointAllocationComplete" class="small text-warning mb-2" role="status">
                            须将本职与兴趣技能点全部分配完毕（剩余=0）方可登记归档。
                        </div>
                        <div class="apex-creator-skill-head row align-items-center small fw-bold mb-2 pb-1 border-bottom border-secondary">
                            <div class="col-4">技能名称</div>
                            <div class="col-2 text-center px-0">总值</div>
                            <div class="col-3 text-center px-0">本职(±5)</div>
                            <div class="col-3 text-center px-0">兴趣(±5)</div>
                        </div>
                        <div class="creator-skill-scroll">
                            <div v-for="skill in dynamicSkillNames" :key="skill" class="apex-creator-skill-row row align-items-center flex-nowrap mb-1 pb-1">
                                <div class="col-4 small text-truncate" :class="isUnlockedSkill(skill) ? 'unlocked-skill' : ''">
                                    {{ skill }}
                                    <span v-if="isClassSkill(skill)" class="apex-badge apex-badge--warn apex-badge--sm ms-1">本职</span>
                                    <span v-if="isUnlockedSkill(skill)" class="apex-badge apex-badge--danger apex-badge--sm ms-1">解锁</span>
                                </div>
                                <div class="col-2 text-center fw-bold px-0" :class="isUnlockedSkill(skill) ? 'text-danger' : 'text-white'">{{ getSkillTotal(skill) }}</div>
                                <div class="col-3 d-flex justify-content-center align-items-center px-0 flex-nowrap gap-1">
                                    <button type="button" class="btn btn-sm apex-btn-ghost apex-creator-skill-btn py-0 px-1" :disabled="!isClassSkill(skill)" @click="removeSkillPoint(skill, 'occ')">−</button>
                                    <span class="apex-creator-skill-val apex-creator-skill-val--occ">{{ getSkillOcc(skill) }}</span>
                                    <button type="button" class="btn btn-sm apex-btn-accent apex-creator-skill-btn py-0 px-1" :disabled="!isClassSkill(skill) || pointStats.occRemain < 5" @pointerdown.prevent="startAutoAdd(skill, 'occ')" @pointerup="stopAutoAdd" @pointerleave="stopAutoAdd" @pointercancel="stopAutoAdd">+</button>
                                </div>
                                <div class="col-3 d-flex justify-content-center align-items-center px-0 flex-nowrap gap-1">
                                    <button type="button" class="btn btn-sm apex-btn-ghost apex-creator-skill-btn py-0 px-1" @click="removeSkillPoint(skill, 'per')">−</button>
                                    <span class="apex-creator-skill-val apex-creator-skill-val--per">{{ getSkillPer(skill) }}</span>
                                    <button type="button" class="btn btn-sm apex-btn-accent apex-creator-skill-btn py-0 px-1" :disabled="pointStats.perRemain < 5" @pointerdown.prevent="startAutoAdd(skill, 'per')" @pointerup="stopAutoAdd" @pointerleave="stopAutoAdd" @pointercancel="stopAutoAdd">+</button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <div v-show="activeCreatorTab === 'backstory'" class="apex-creator-body">
                <section class="apex-panel mb-3">
                    <header class="apex-panel__head"><coc-icon name="scroll" :size="14"></coc-icon><span>可选规则 · 有故事的调查员</span></header>
                    <select class="form-select form-select-sm apex-creator-input mb-2" v-model="draftChar.expPackage" @change="applyExperience" :disabled="draftChar.attrs.STR === 0">
                        <option :value="null">无特殊经历 (理智正常)</option>
                        <option v-for="(exp, idx) in availableExperiences" :key="idx" :value="exp">{{ exp.name }}</option>
                    </select>
                    <div v-if="draftChar.expPackage" class="small text-muted">
                        <span>{{ draftChar.expPackage.desc }}</span><br>
                        <strong class="text-danger">代价：</strong> 掷骰扣除 {{ draftChar.expPackage.sanLoss }} 理智 <strong class="text-danger">(当前已扣除 {{ draftChar.sanPenalty }} 点)</strong><br>
                        <strong class="text-info">奖励：</strong> 获得 {{ draftChar.expPackage.bonusPoints }} 额外兴趣点，解锁技能 [{{ draftChar.expPackage.unlock.join(', ') }}]。
                    </div>
                </section>

                <section class="apex-panel">
                    <header class="apex-panel__head"><coc-icon name="journal" :size="14"></coc-icon><span>背景档案 · BACKSTORY</span></header>
                    <div class="row g-2">
                        <div class="col-12"><label class="sheet-label">形象描述</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.description"></textarea></div>
                        <div class="col-12"><label class="sheet-label">思想与信念</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.ideology"></textarea></div>
                        <div class="col-12"><label class="sheet-label">重要之人 (极易触发剧情)</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.significantPeople"></textarea></div>
                        <div class="col-12"><label class="sheet-label">意义非凡之地</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.meaningfulLocations"></textarea></div>
                        <div class="col-12"><label class="sheet-label">宝贵之物</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.treasuredPossessions"></textarea></div>
                        <div class="col-12"><label class="sheet-label">特质</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.traits"></textarea></div>
                        <div class="col-12"><label class="sheet-label text-danger">伤疤与疤痕</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.injuries"></textarea></div>
                        <div class="col-12"><label class="sheet-label text-danger">恐惧症与狂躁症</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.phobias"></textarea></div>
                        <div class="col-12"><label class="sheet-label text-warning">神话遭遇</label><textarea class="form-control form-control-sm apex-creator-input" rows="1" v-model="draftChar.backstory.encounters"></textarea></div>
                    </div>
                </section>
            </div>

            <footer class="apex-creator-footer d-flex gap-2 mt-3 pt-3">
                <button type="button" class="btn apex-btn-ghost apex-creator-action" @click="goBack">放弃</button>
                <button type="button" class="btn apex-btn-accent flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1 apex-creator-action apex-creator-action--primary" @click="saveDraftCharacter" :disabled="!draftChar.name || draftChar.attrs.STR === 0 || !draftChar.job || !isPointAllocationComplete">
                    <coc-icon name="storage" :size="16"></coc-icon> 登记归档
                </button>
            </footer>
        </div>
    `,
    setup() {
        return CoCStateAccessor.bindVueSetup(
            Object.assign({ Engine: CoCEngine }, CoCCreator || {})
        );
    }
};
