/**
 * CoC State layer contract (OPT-029) — JSDoc-only interface documentation.
 * No runtime refactor; consumers may import for IDE hints and future DI.
 *
 * @module state/state_contract
 */

/** @typedef {'modules'|'creator'|'story'|'devlog'} ScreenId */

/**
 * @typedef {object} ICombatState
 * @property {boolean} active
 * @property {number} round
 * @property {object[]} enemies
 * @property {object[]} initiativeOrder
 * @property {number} currentTurnIdx
 */

/**
 * @typedef {object} IGameState
 * @property {ScreenId} currentScreen
 * @property {string} activeModuleId
 * @property {object[]} roster
 * @property {boolean} isLoading
 * @property {object[]} chatHistory
 * @property {string|null} activeModal
 * @property {string} currentLocation
 * @property {string[]} knownLocations
 * @property {string[]} inventory
 * @property {string[]} storage
 * @property {object[]} journalLog
 * @property {object[]} npcRegistry
 * @property {ICombatState} combat
 * @property {object} [chase]
 * @property {object|null} [pendingRuleCheck]
 * @property {object[]} [pendingRuleChecks]
 * @property {object} [scenarioRunner]
 * @property {object} [atmosphere]
 * @property {object} [storageStatus]
 * @property {object} sceneMap
 * @property {object} clueBoard
 * @property {object[]} diceHistory
 * @property {object} aiSettings
 * @property {object} kpEngine
 * @property {number} selectedCharIndex
 * @property {object} ui
 */

/**
 * @typedef {object} ICoCState
 * @property {IGameState} gameState
 * @property {import('vue').Ref<string>} playerInput
 * @property {object} draftChar
 * @property {import('vue').Ref<string>} activeCreatorTab
 * @property {(screen: ScreenId) => void} switchScreen
 * @property {(msg: string, type?: string, opts?: object) => void} [showToast]
 * @property {(slot: string, name?: string) => Promise<boolean>|boolean} [saveGame]
 * @property {(slot: string) => Promise<boolean>|boolean} [loadGame]
 * @property {(clueId: string, status?: string|null, note?: string) => void} [markClueStatus]
 * @property {(notation: string, label?: string, rolledBy?: string, context?: string, opts?: {hidden?: boolean, visibleTo?: string|string[]}) => object|null} [rollCustomDice]
 * @property {(msg: string, opts?: object) => Promise<boolean>} [confirmAction]
 * @property {() => void} [scrollToBottom]
 */

/**
 * @typedef {object} ICoCStateAccessor
 * @property {() => ICoCState} getState
 * @property {() => IGameState} getGameState
 * @property {() => object[]} getRoster
 * @property {(msg: string, type?: string, opts?: object) => void} showToast
 */

/** Semantic version of this contract document (not save format). */
export const STATE_CONTRACT_VERSION = '18.7.0';

/** Human-readable contract summary for tooling and onboarding. */
export const STATE_CONTRACT_SUMMARY = {
    version: STATE_CONTRACT_VERSION,
    primaryGlobal: 'window.CoCState',
    accessorGlobal: 'window.CoCStateAccessor',
    modules: ['core', 'ui', 'gameplay', 'persistence'],
    migrationNote: 'UI and scenario assembly use CoCStateAccessor.getState()/bindVueSetup. window.CoCState remains the reactive core assigned in app.mjs/state.mjs.',
};
