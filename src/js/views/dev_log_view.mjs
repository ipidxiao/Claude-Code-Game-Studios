// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { CoCStateAccessor } from '../state/accessor.mjs';
import { DevLogs } from '../data/dev_logs.mjs';
import { CoCDeskPref } from '../data/desk_pref.mjs';
import { CoCCapabilitySystem } from '../data/capability_system.mjs';
import { CoCScenarioCatalog } from '../data/scenarios/catalog.mjs';
import { CoCCreativeSmokeCatalog } from '../data/creative_smoke_catalog.mjs';
export const ViewDevLog = {
    template: `
        <div class="apex-lobby-shell apex-devlog-shell h-100 d-flex flex-column">
            <header class="apex-lobby-header flex-shrink-0">
                <button type="button" class="btn btn-sm apex-btn-ghost apex-lobby-back d-inline-flex align-items-center gap-1"
                    @click="switchScreen('lobby')" aria-label="返回大厅">
                    <coc-icon name="arrow-left" :size="14"></coc-icon> 返回
                </button>
                <h3 class="apex-lobby-header__title mb-0">
                    <coc-icon name="journal" :size="18"></coc-icon> 开发者日志 · DEV LOG
                </h3>
                <span class="apex-journal-count flex-shrink-0" :aria-label="'共 ' + logCount + ' 个版本'">{{ logCount }} RELEASES</span>
            </header>

            <div class="apex-panel apex-panel--compact flex-shrink-0 mb-2">
                <div class="fw-bold text-light small mb-2">实验功能</div>
                <label class="d-flex align-items-start gap-2 mb-0" style="cursor:pointer;">
                    <input type="checkbox" class="form-check-input mt-1" :checked="deskPrefPromptOn"
                        @change="onDeskPrefToggle($event)" aria-describedby="desk-pref-feature-desc">
                    <span>
                        <span class="small text-light">桌规偏好提示</span>
                        <span id="desk-pref-feature-desc" class="d-block text-secondary" style="font-size:0.68rem;line-height:1.35;">
                            默认关闭。开启后，打开桌规卡时才会弹出：严苛/电影/轻Pulp、默认继承或重置、上次能力筛。
                        </span>
                    </span>
                </label>
            </div>

            <div class="apex-panel apex-panel--compact flex-shrink-0 mb-2">
                <div class="fw-bold text-light small mb-2">引擎能力覆盖（短模）</div>
                <div class="text-secondary mb-1" style="font-size:0.68rem;">行数 {{ coverageMatrix.length }} · 只读扫描 builtins</div>
                <div class="overflow-auto" style="max-height:9rem;">
                    <div v-for="row in coverageMatrix" :key="row.id" class="text-secondary" style="font-size:0.68rem;line-height:1.4;">
                        {{ row.title }} · {{ (row.caps || []).join(' · ') || '常规' }}
                    </div>
                </div>
            </div>

            <div class="apex-panel apex-panel--compact flex-shrink-0 mb-2">
                <div class="fw-bold text-light small mb-2">创意 Smoke 目录</div>
                <div v-for="s in smokeCatalog" :key="s.id" class="text-secondary" style="font-size:0.68rem;line-height:1.4;">
                    <span class="text-info">[{{ s.phase }}]</span> {{ s.id }} — {{ s.covers }}
                </div>
            </div>

            <div class="apex-devlog-feed flex-grow-1 overflow-auto" role="feed" aria-label="开发更新日志">
                <article v-for="(log, idx) in logs" :key="idx" class="apex-devlog-entry" role="article"
                    :aria-labelledby="'devlog-title-' + idx">
                    <div class="apex-devlog-entry__rail" aria-hidden="true">
                        <span class="apex-devlog-entry__dot"></span>
                        <span v-if="idx < logs.length - 1" class="apex-devlog-entry__line"></span>
                    </div>
                    <div class="apex-devlog-entry__icon" aria-hidden="true">
                        <coc-icon name="scroll" :size="16"></coc-icon>
                    </div>
                    <div class="apex-devlog-entry__body">
                        <div class="apex-devlog-entry__head">
                            <span class="apex-devlog-entry__version">{{ log.version }}</span>
                            <span v-if="log.source === 'ai'" class="apex-badge apex-badge--sm">会话AI</span>
                            <h4 :id="'devlog-title-' + idx" class="apex-devlog-entry__title m-0">{{ log.title }}</h4>
                            <time class="apex-devlog-entry__date" :datetime="log.date">{{ log.date }}</time>
                        </div>
                        <ul class="apex-devlog-changes">
                            <li v-for="(change, cIdx) in log.changes" :key="cIdx">{{ change }}</li>
                        </ul>
                    </div>
                </article>
            </div>

            <footer class="apex-panel apex-panel--compact apex-devlog-footnote flex-shrink-0 mt-2 mb-0" role="note">
                <p class="m-0 d-inline-flex align-items-start gap-2">
                    <coc-icon name="eye" :size="12" class="flex-shrink-0 mt-1" aria-hidden="true"></coc-icon>
                    <span>本日志记录了 AI 在系统开发过程中的核心改进、Bug 修复及功能迭代。</span>
                </p>
            </footer>
        </div>
    `,
    data() {
        return {
            deskPrefPromptOn: false
        };
    },
    computed: {
        logs() {
            return DevLogs || [];
        },
        logCount() {
            return (this.logs && this.logs.length) || 0;
        },
        coverageMatrix() {
            if (!CoCCapabilitySystem?.buildEffectsCoverageMatrix || !CoCScenarioCatalog?.list) return [];
            try {
                return CoCCapabilitySystem.buildEffectsCoverageMatrix(CoCScenarioCatalog.list() || []);
            } catch (_e) {
                return [];
            }
        },
        smokeCatalog() {
            return CoCCreativeSmokeCatalog?.CREATIVE_SMOKE_CATALOG || [];
        }
    },
    mounted() {
        this.deskPrefPromptOn = !!CoCDeskPref?.isDeskPrefPromptEnabled?.();
    },
    methods: {
        switchScreen(screen) {
            CoCStateAccessor.switchScreen(screen);
        },
        onDeskPrefToggle(event) {
            const on = !!(event && event.target && event.target.checked);
            if (CoCDeskPref?.setDeskPrefPromptEnabled) {
                CoCDeskPref.setDeskPrefPromptEnabled(on);
            }
            this.deskPrefPromptOn = !!CoCDeskPref?.isDeskPrefPromptEnabled?.();
            if (CoCStateAccessor && CoCStateAccessor.showToast) {
                CoCStateAccessor.showToast(
                    this.deskPrefPromptOn ? '桌规偏好提示已开启' : '桌规偏好提示已关闭',
                    'secondary'
                );
            }
        }
    }
};
