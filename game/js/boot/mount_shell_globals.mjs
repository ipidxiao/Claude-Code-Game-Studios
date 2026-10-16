/**
 * Shell Phase 4b — intentional window.* mounts (minimal).
 * Required SoT: window.CoCState (Vue reactive core; Accessor lazy-binds here).
 * CoCAI / CoCToolHandlers peeled — UI + extensions/ai_logic use ESM; modules still
 * self-mount for any leftover window readers / Node mocks.
 */

/**
 * @param {object} deps
 */
export function mountShellGlobals(deps) {
    if (typeof window === 'undefined') return;

    const { CoCState } = deps;

    // Required Vue SoT — always ensure (state.mjs also assigns; keep explicit boot assign).
    if (CoCState) {
        window.CoCState = CoCState;
    }
}

/** Still assigned by mountShellGlobals (SoT only). */
export const SHELL_MOUNTED_GLOBALS = [
    'CoCState'
];

/** Peeled — self-mount and/or ESM consumers (R29.9–R29.10). */
export const SHELL_PEELED_GLOBALS = [
    'CoCKeeperStyle', 'CoCMythosHeat', 'CoCUnreliableClues', 'CoCEncounterSeed',
    'CoCArcChapters', 'CoCArcPressureCopy', 'CoCCapabilitySystem', 'CoCCapabilityRisk',
    'CoCDeskPref', 'CoCCreativeSmokeCatalog',
    'CoCBaseSkills', 'CoCJobs', 'CoCExperiences', 'CoCItemDB', 'parseItemData', 'DevLogs',
    'CoCEngine', 'CoCContextManager', 'CoCToolDefinitions', 'CoCToolHandlers',
    'CoCStateCore', 'CoCStateUI', 'CoCStateGameplay', 'CoCStatePersistence',
    'CoCAI', 'CoCExtensions', 'CoCSlash', 'ChatExport',
    'CoCGlobalsRegistry', 'listDeprecatedGlobals',
    'ViewLobby', 'ViewStory', 'ViewCreator', 'ViewDevLog',
    'CocConfirmDialog', 'CocSaveLoadingOverlay',
    'ApexEquipHud', 'StoryChat', 'StoryChar', 'StoryInv', 'StoryStore',
    'StoryJournal', 'StoryNpc', 'StoryCombat', 'StoryGrowth', 'StoryMap',
    'StoryClues', 'StoryEquip', 'StoryDice',
    'CharPortrait', 'ActionWheel', 'SanityEffects', 'CocIcon', 'CoCIconSprite',
    'CharHudHelpers', 'ChatFormatHelpers', 'CombatUiHelpers',
    'CoCCreator', 'CoCScenarioCatalog', 'CoCScenarioStore', 'CoCScenarioRemoteCatalog',
    'CoCScenarioPdfImport', 'CoCScenarioRunner', 'CoCLorebook', 'CoCStoryOpening',
    'CoCGroupCheck'
];
