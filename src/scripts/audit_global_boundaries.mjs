import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contracts = [
    {
        file: 'js/boot/async_views.mjs',
        forbidden: ['window.CoCStateAccessor']
    },
    {
        file: 'js/boot/register_shell_components.mjs',
        forbidden: ['window.CocConfirmDialog', 'window.CocSaveLoadingOverlay']
    },
    {
        file: 'js/components/ui_feedback.mjs',
        forbidden: ['window.CocConfirmDialog', 'window.CocSaveLoadingOverlay']
    },
    {
        file: 'js/views/lobby_view.mjs',
        forbidden: [
            'window.CoCScenarioStore',
            'window.CoCScenarioCatalog',
            'window.CoCCapabilitySystem',
            'window.CoCArcLedger',
            'window.CoCDeskPref',
            'window.KpGameLoop',
            'window.ViewLobby'
        ]
    },
    {
        file: 'js/views/story_view.mjs',
        forbidden: ['window._refreshStorySaveSlots', 'window.KpGameLoop', 'window.ViewStory']
    },
    {
        file: 'js/views/creator_view.mjs',
        forbidden: ['window.ViewCreator', 'window.CoCCreator']
    },
    {
        file: 'js/views/dev_log_view.mjs',
        forbidden: [
            'window.ViewDevLog',
            'window.DevLogs',
            'window.CoCDeskPref',
            'window.CoCCapabilitySystem',
            'window.CoCScenarioCatalog',
            'window.CoCCreativeSmokeCatalog'
        ]
    },
    {
        file: 'js/components/apex_equip_hud.mjs',
        forbidden: ['window.ApexEquipHud']
    },
    {
        file: 'js/components/story_char.mjs',
        forbidden: ['window.ApexEquipHud', 'window.StoryChar', 'window.CoCCreator']
    },
    {
        file: 'js/components/story_chat.mjs',
        forbidden: ['window.StoryChat']
    },
    {
        file: 'js/components/story_inv.mjs',
        forbidden: ['window.StoryInv']
    },
    {
        file: 'js/components/story_store.mjs',
        forbidden: ['window.StoryStore']
    },
    {
        file: 'js/components/story_journal.mjs',
        forbidden: ['window.StoryJournal']
    },
    {
        file: 'js/components/story_npc.mjs',
        forbidden: ['window.StoryNpc']
    },
    {
        file: 'js/components/story_combat.mjs',
        forbidden: ['window.StoryCombat']
    },
    {
        file: 'js/components/story_growth.mjs',
        forbidden: ['window.StoryGrowth']
    },
    {
        file: 'js/components/story_map.mjs',
        forbidden: ['window.StoryMap']
    },
    {
        file: 'js/components/story_clues.mjs',
        forbidden: ['window.StoryClues']
    },
    {
        file: 'js/components/story_equip.mjs',
        forbidden: ['window.StoryEquip']
    },
    {
        file: 'js/components/story_dice.mjs',
        forbidden: ['window.StoryDice']
    },
    {
        file: 'js/components/char_portrait.mjs',
        forbidden: ['window.CharPortrait']
    },
    {
        file: 'js/components/action_wheel.mjs',
        forbidden: ['window.ActionWheel']
    },
    {
        file: 'js/components/sanity_effects.mjs',
        forbidden: ['window.SanityEffects']
    },
    {
        file: 'js/components/icon_sprite.mjs',
        forbidden: ['window.CocIcon', 'window.CoCIconSprite']
    },
    {
        file: 'js/components/char_hud_helpers.mjs',
        forbidden: ['window.CharHudHelpers']
    },
    {
        file: 'js/components/chat_format_helpers.mjs',
        forbidden: ['window.ChatFormatHelpers']
    },
    {
        file: 'js/components/combat_ui_helpers.mjs',
        forbidden: ['window.CombatUiHelpers']
    },
    {
        file: 'js/components/char_creator.mjs',
        forbidden: ['window.CoCCreator']
    },
    {
        file: 'js/data/desk_pref.mjs',
        forbidden: ['window.CoCDeskPref']
    },
    {
        file: 'js/data/creative_smoke_catalog.mjs',
        forbidden: ['window.CoCCreativeSmokeCatalog']
    },
    {
        file: 'js/tools/handlers/system.mjs',
        forbidden: ['window.DevLogs']
    },
    {
        file: 'js/state/persistence.mjs',
        forbidden: ['window.CoCCapabilitySystem']
    },
    {
        file: 'js/scenario/runner.mjs',
        forbidden: ['window.CoCCapabilitySystem', 'window.CoCScenarioCatalog', 'window.CoCScenarioStore', 'window.CoCScenarioRunner']
    },
    {
        file: 'js/ai/lorebook.mjs',
        forbidden: ['window.CoCScenarioCatalog', 'window.CoCScenarioStore', 'window.CoCLorebook']
    },
    {
        file: 'js/core/extensions.mjs',
        forbidden: ['window.CoCLorebook']
    },
    {
        file: 'js/data/scenarios/remote_catalog.mjs',
        forbidden: ['window.CoCScenarioRemoteCatalog']
    },
    {
        file: 'js/scenario/pdf_import.mjs',
        forbidden: ['window.CoCScenarioPdfImport']
    },
    {
        file: 'js/scenario/ensure_runner.mjs',
        forbidden: ['window.CoCScenarioRunner']
    },
    {
        file: 'js/data/capability_system.mjs',
        forbidden: ['window.CoCCapabilitySystem']
    },
    {
        file: 'js/scenario/store.mjs',
        forbidden: ['window.CoCScenarioCatalog', 'window.CoCScenarioStore', 'window.CoCScenarioRemoteCatalog', 'window.CoCScenarioPdfImport']
    },
    {
        file: 'js/story_opening.mjs',
        forbidden: ['window.CoCScenarioCatalog', 'window.CoCStoryOpening']
    },
    {
        file: 'js/data/session_manifest.mjs',
        forbidden: ['window.CoCScenarioCatalog']
    },
    {
        file: 'js/data/scenarios/catalog.mjs',
        forbidden: ['window.CoCScenarioCatalog', 'window.CoCScenarioStore']
    },
    {
        file: 'js/state/core.mjs',
        forbidden: ['window.CoCStoryOpening']
    },
    {
        file: 'js/ai_logic.mjs',
        forbidden: ['window.CoCSlash', 'window.CoCGroupCheck']
    },
    {
        file: 'js/tools/slash.mjs',
        forbidden: ['window.CoCSlash']
    },
    {
        file: 'js/campaign/group_check.mjs',
        forbidden: ['window.CoCGroupCheck']
    }
];

const failures = [];
for (const contract of contracts) {
    const source = readFileSync(join(root, contract.file), 'utf8');
    for (const token of contract.forbidden) {
        if (source.includes(token)) failures.push(`${contract.file}: forbidden ${token}`);
    }
}

if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
}

console.log('audit_global_boundaries: OK', {
    files: contracts.length,
    forbiddenTokens: contracts.reduce((sum, contract) => sum + contract.forbidden.length, 0)
});
