/**
 * Shell Phase 1–3 — register root Vue views / chrome on the app instance.
 * index.html switches screens via v-if on gameState.currentScreen:
 *   lobby|roster|settings|character|saves|modules|scenarios|scenario_store → view-lobby
 *   creator → view-creator
 *   story (+ activeModal) → view-story
 *   devlog → view-dev-log (Phase 3 pilot: may be defineAsyncComponent)
 */

/**
 * @param {import('vue').App} app
 * @param {object} parts — View* may be sync options or async wrappers
 */
export function registerShellComponents(app, parts) {
    const {
        ViewLobby,
        ViewCreator,
        ViewStory,
        ViewDevLog,
        CocToastLayer,
        CocConfirmDialog,
        CocSaveLoadingOverlay,
        CocIcon,
        SanityEffects
    } = parts;

    app.component('view-lobby', ViewLobby);
    app.component('view-creator', ViewCreator);
    app.component('view-story', ViewStory);
    app.component('view-dev-log', ViewDevLog);
    app.component('coc-toast-layer', CocToastLayer);
    app.component('coc-confirm-dialog', CocConfirmDialog);
    app.component('coc-save-loading-overlay', CocSaveLoadingOverlay);
    app.component('coc-icon', CocIcon);
    app.component('sanity-effects', SanityEffects);
}

export const SHELL_SCREEN_MAP = {
    lobby: 'view-lobby',
    roster: 'view-lobby',
    settings: 'view-lobby',
    character: 'view-lobby',
    saves: 'view-lobby',
    modules: 'view-lobby',
    scenarios: 'view-lobby',
    scenario_store: 'view-lobby',
    creator: 'view-creator',
    story: 'view-story',
    devlog: 'view-dev-log'
};
