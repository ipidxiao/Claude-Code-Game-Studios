// ===============================================
// CoC 7th Engine — ESM browser entry (single boot path)
// Shell Phase 1–4: lobby eager; async secondary views; mount_shell_globals shrunk (CoCState SoT)
// ===============================================

import { CoCState } from './state/state.mjs';
import './state/rule_check.mjs';
import './state/accessor.mjs';
import './state/aftermath.mjs';
import './state/arc_ledger.mjs';
import './state/false_lead.mjs';
import { CoCAI } from './ai_logic.mjs';
import './boot/shell_side_effects.mjs';
import { mountShellGlobals } from './boot/mount_shell_globals.mjs';
import { registerShellComponents } from './boot/register_shell_components.mjs';
import {
    loadViewDevLogAsync,
    loadViewCreatorAsync,
    loadViewStoryAsync
} from './boot/async_views.mjs';

import { CocIcon } from './components/icon_sprite.mjs';
import { ViewLobby } from './views/lobby_view.mjs';
import {
    CocToastLayer,
    CocConfirmDialog,
    CocSaveLoadingOverlay
} from './components/ui_feedback.mjs';
import { SanityEffects } from './components/sanity_effects.mjs';

mountShellGlobals({
    CoCState
});

const { createApp } = window.Vue;

const app = createApp({
    setup() {
        const state = CoCState || { gameState: { currentScreen: 'lobby' } };
        const ai = CoCAI || {};
        return { ...state, ...ai };
    }
});

registerShellComponents(app, {
    ViewLobby,
    ViewCreator: loadViewCreatorAsync(),
    ViewStory: loadViewStoryAsync(),
    ViewDevLog: loadViewDevLogAsync(),
    CocToastLayer,
    CocConfirmDialog,
    CocSaveLoadingOverlay,
    CocIcon,
    SanityEffects
});

app.mount('#app');
