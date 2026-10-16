/**
 * Shell Phase 3 / 3b — async view loaders.
 * Uses Vue.defineAsyncComponent + dynamic import().
 * Target .mjs paths remain in SW ASSETS (walk all js/ .mjs files) so offline hits cache.
 *
 * Tradeoff (3b): view-creator / view-story are async, but js/boot/shell_side_effects*.mjs
 * lobby+shared eager; runner deferred (ensure_runner); story_* via ViewStory; char_creator on lobby barrel
 * for tools and legacy shims. Only the Vue screen component registration is deferred.
 */
import { CoCStateAccessor } from '../state/accessor.mjs';

function vueApi() {
    if (typeof window === 'undefined' || !window.Vue) {
        throw new Error('async_views: window.Vue required');
    }
    return window.Vue;
}

function shellViewFallback(kind, label) {
    const isErr = kind === 'error';
    return {
        name: isErr ? 'ShellAsyncViewError' : 'ShellAsyncViewLoading',
        props: isErr ? { error: { default: null } } : {},
        template: isErr
            ? `<div class="apex-lobby-shell p-4 text-center" role="alert">
                <p class="text-danger mb-2">界面加载失败：${label}</p>
                <p class="small text-muted mb-3">请检查网络或刷新后重试（离线包应已缓存该模块）。</p>
                <button type="button" class="btn btn-sm apex-btn-ghost" @click="goLobby">返回大厅</button>
               </div>`
            : `<div class="apex-lobby-shell p-4 text-center text-muted" aria-busy="true">
                <p class="mb-0">正在加载「${label}」…</p>
               </div>`,
        methods: {
            goLobby() {
                try {
                    if (CoCStateAccessor && typeof CoCStateAccessor.switchScreen === 'function') {
                        CoCStateAccessor.switchScreen('lobby');
                    }
                } catch (_e) { /* ignore */ }
            }
        }
    };
}

/**
 * @param {() => Promise<object>} loader — resolves to a Vue component options object
 * @param {string} label — Chinese label for fallbacks
 */
export function defineShellAsyncView(loader, label) {
    const { defineAsyncComponent } = vueApi();
    return defineAsyncComponent({
        loader,
        delay: 80,
        timeout: 20000,
        loadingComponent: shellViewFallback('loading', label),
        errorComponent: shellViewFallback('error', label)
    });
}

export function loadViewDevLogAsync() {
    return defineShellAsyncView(
        () => import('../views/dev_log_view.mjs').then((m) => m.ViewDevLog),
        '开发者日志'
    );
}

export function loadViewCreatorAsync() {
    return defineShellAsyncView(
        () => import('../views/creator_view.mjs').then((m) => m.ViewCreator),
        '调查员创建'
    );
}

export function loadViewStoryAsync() {
    return defineShellAsyncView(
        () => import('../views/story_view.mjs').then((m) => m.ViewStory),
        '剧情界面'
    );
}

export const ASYNC_VIEW_PILOT = {
    viewDevLog: true,
    viewCreator: true,
    viewStory: true,
    sideEffectsEager: true,
    storyUiDeferred: true,
    runnerDeferred: true,
    note: 'Views async; lobby+shared eager; runner via ensureScenarioRunner; story_* via ViewStory. SW asset walk.'
};
