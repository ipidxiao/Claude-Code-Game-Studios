// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { CoCStateAccessor } from '../state/accessor.mjs';

/** Prefer injected stateApi / CoCStateAccessor. */
function resolveStateApi(props) {
    if (props && props.stateApi) return props.stateApi;
    return CoCStateAccessor;
}

export const StoryStore = {
    props: {
        stateApi: { type: Object, default: null },
    },
    template: `
        <div class="flex-grow-1 overflow-auto p-2 p-md-3 apex-char-shell story-store-panel">
            <header class="apex-panel__head mb-3 justify-content-center">
                <coc-icon name="storage" :size="18"></coc-icon>
                <span>安全屋仓库 · STASH</span>
            </header>
            <section class="apex-panel apex-panel--flush">
            <ul class="list-group list-group-flush apex-inv-list">
                <li v-if="gameState.storage.length === 0" class="list-group-item apex-inv-row empty-state empty-state-compact border-0 text-muted">
                    <coc-icon name="storage" :size="32" class="empty-state-icon text-secondary"></coc-icon>
                    <div class="empty-state-title">仓库里没存东西</div>
                </li>
                <li v-for="(item, idx) in gameState.storage" :key="idx" class="list-group-item apex-inv-row d-flex justify-content-between align-items-center">
                    <span class="d-flex align-items-center gap-2 text-light">
                        <coc-icon name="inventory" :size="16" class="text-secondary"></coc-icon>
                        {{ formatItemName(item) }}
                    </span>
                    <button class="btn btn-sm apex-btn-accent" @click="moveToInventory(item, idx)">取出</button>
                </li>
            </ul>
            </section>
        </div>
    `,
    setup(props) {
        const api = resolveStateApi(props);
        const gameState = api && typeof api.getGameState === 'function' ? api.getGameState() : api.gameState;
        const moveToInventory = (item, idx) => {
            const i = Number(idx);
            if (!Number.isInteger(i) || i < 0 || i >= gameState.storage.length) return;
            if (gameState.storage[i] !== item) return;
            gameState.inventory.push(item);
            gameState.storage.splice(i, 1);
        };
        const formatItemName = (item) => (typeof item === 'object' && item?.name) ? item.name : String(item);
        return { moveToInventory, formatItemName, gameState };
    }
};
