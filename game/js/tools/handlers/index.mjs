// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC AI Tool Handler Registry — ESM version.
 *
 * Imports domain handler functions directly instead of looking up
 * window.CoCToolHandlerModules.
 */
import { character } from './character.mjs';
import { inventory } from './inventory.mjs';
import { dice } from './dice.mjs';
import { clues } from './clues.mjs';
import { map } from './map.mjs';
import { combat } from './combat.mjs';
import { chase } from './chase.mjs';
import { npc } from './npc.mjs';
import { mythos } from './mythos.mjs';
import { system } from './system.mjs';

const MODULE_ORDER = Object.freeze([
    'character', 'inventory', 'dice', 'clues',
    'map', 'combat', 'chase', 'mythos', 'npc', 'system'
]);

const MODULES = { character, inventory, dice, clues, map, combat, chase, mythos, npc, system };

const createContext = function(State, Engine, handlers) {
    const { gameState, addJournalEntry, addNpc, updateNpcStatus,
            startCombat, endCombat, updateEnemy, advanceTurn,
            createMap, updateRoom, setPosition,
            addClue, linkClues, markClueStatus,
            rollCustomDice, groupRoll } = State;
    return { State, Engine, handlers, gameState, addJournalEntry, addNpc,
             updateNpcStatus, startCombat, endCombat, updateEnemy, advanceTurn,
             createMap, updateRoom, setPosition,
             addClue, linkClues, markClueStatus,
             rollCustomDice, groupRoll,
             dispatch: (name, args = {}) => {
                 if (!handlers[name]) throw new Error(`未知工具 ${name || '(空)'}`);
                 return handlers[name](args || {});
             }};
};

const create = function(State, Engine) {
    if (!State || !Engine) return {};
    const handlers = {};
    const context = createContext(State, Engine, handlers);
    MODULE_ORDER.forEach((moduleName) => {
        const factory = MODULES[moduleName];
        if (typeof factory !== 'function') return;
        const partial = factory(context) || {};
        Object.keys(partial).forEach((toolName) => {
            if (handlers[toolName]) throw new Error(`重复 Tool Handler: ${toolName}`);
            handlers[toolName] = partial[toolName];
        });
    });
    return handlers;
};

const getHandlerNames = (handlers = null) => Object.keys(handlers || {});
const getModuleOrder = () => MODULE_ORDER.slice();
const getLoadedModuleNames = () => Object.keys(MODULES).sort();

export const CoCToolHandlers = { create, getHandlerNames, getModuleOrder, getLoadedModuleNames };

if (typeof window !== 'undefined') {
    window.CoCToolHandlers = CoCToolHandlers;
    window.CoCToolHandlerModules = MODULES;
}
