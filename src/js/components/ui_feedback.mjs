// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { toastTitle as toastTitleHelper } from './chat_format_helpers.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';

const TOAST_ICON = { success: 'scroll', warning: 'tentacle', danger: 'combat', info: 'eye' };

export const CocToastLayer = {
    props: ['toasts'],
    template: `
        <div class="coc-toast-layer apex-feedback-layer" aria-live="polite" aria-atomic="true">
            <div v-for="toast in (toasts || [])" :key="toast.id"
                class="coc-toast apex-feedback-toast"
                :class="'apex-feedback-toast--' + (toast.type || 'info')"
                role="status">
                <coc-icon :name="toastIcon(toast.type)" :size="16" class="apex-feedback-toast__icon" aria-hidden="true"></coc-icon>
                <div class="apex-feedback-toast__content">
                    <div class="coc-toast-title apex-feedback-toast__title">{{ toast.title || toastTitle(toast.type) }}</div>
                    <div class="coc-toast-body apex-feedback-toast__body">{{ toast.message }}</div>
                </div>
            </div>
        </div>
    `,
    methods: {
        toastTitle(type) {
            return toastTitleHelper(type);
        },
        toastIcon(type) {
            return TOAST_ICON[type] || TOAST_ICON.info;
        }
    }
};

export const CocConfirmDialog = {
    props: ['dialog'],
    template: `
        <div v-if="dialog" class="modal-overlay apex-confirm-overlay coc-confirm-overlay" @click.self="resolve(false)">
            <div class="apex-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="coc-confirm-title">
                <header class="apex-confirm-panel__head">
                    <coc-icon name="tentacle" :size="18" class="apex-confirm-panel__icon" aria-hidden="true"></coc-icon>
                    <h2 id="coc-confirm-title" class="apex-confirm-panel__title">{{ dialog.title || '确认操作' }}</h2>
                </header>
                <div class="apex-confirm-panel__message">{{ dialog.message }}</div>
                <div class="apex-confirm-panel__actions">
                    <button type="button" class="btn apex-btn-ghost apex-confirm-btn"
                        :aria-label="dialog.cancelText || '取消'"
                        @click="resolve(false)">{{ dialog.cancelText || '取消' }}</button>
                    <button type="button" class="btn apex-confirm-btn"
                        :class="dialog.danger ? 'apex-btn-danger' : 'apex-btn-accent'"
                        :aria-label="dialog.okText || '确认'"
                        @click="resolve(true)">{{ dialog.okText || '确认' }}</button>
                </div>
            </div>
        </div>
    `,
    methods: {
        resolve(ok) {
            const state = CoCStateAccessor?.getState?.() || null;
            if (state && state.resolveConfirm) state.resolveConfirm(ok);
        }
    }
};

export const CocSaveLoadingOverlay = {
    props: ['loading', 'message'],
    template: `
        <div v-if="loading" class="modal-overlay save-loading-overlay" aria-live="polite" aria-busy="true">
            <div class="empty-state save-loading-state">
                <coc-icon name="storage" :size="40" class="empty-state-icon empty-state-pulse"></coc-icon>
                <div class="empty-state-title">{{ message || '正在加载存档…' }}</div>
                <div class="empty-state-hint">请稍候，正在从 IndexedDB 恢复数据</div>
            </div>
        </div>
    `
};
