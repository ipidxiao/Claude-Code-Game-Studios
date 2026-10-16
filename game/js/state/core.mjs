// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

import { safeJsonParse } from '../data/utils.mjs';
import { KP_ENGINE_DEFAULT_ENABLED, applyKpPreferenceToGameState } from './kp_config.mjs';
import { pushStoryOpening } from '../story_opening.mjs';

/** @returns {boolean} Canonical default lives in js/state/kp_config.mjs */
function _kpDefaultEnabled() {
    return KP_ENGINE_DEFAULT_ENABLED !== undefined ? KP_ENGINE_DEFAULT_ENABLED : true;
}

function _applyKpPreferenceToGameState(gameState) {
    applyKpPreferenceToGameState(gameState);
}

/**
 * CoC State Core — reactive state definitions + basic UI navigation.
 *
 * Owns: gameState (reactive), draftChar (reactive), playerInput (ref),
 *       activeCreatorTab (ref), and basic navigation helpers.
 */
export const CoCStateCore = (function(Vue) {
    if (!Vue) return {};
    const { reactive, ref, nextTick } = Vue;

    const gameState = reactive({
        currentScreen: 'modules',
        activeModuleId: 'default',
        roster: [],
        isLoading: false,
        chatHistory: [],
        activeModal: null,
        currentLocation: "未知的房间",
        knownLocations: ["未知的房间"],
        inventory: [], storage: [],
        journalLog: [],
        npcRegistry: [],
        combat: { active: false, round: 1, enemies: [], initiativeOrder: [], currentTurnIdx: 0, location: '', notes: '' },
        chase: { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null },
        pendingRuleCheck: null,
        pendingRuleChecks: [],
        pendingAftermath: [],
        moduleSeed: 0,
        encounterVariant: null,
        keeperStyle: 'cinematic',
        mythosHeat: 0,
        arcLedger: null,
        flags: {},
        sceneMap: { title: '', rooms: [], currentRoomId: null },
        clueBoard: { clues: [], links: [] },
        diceHistory: [],
        aiSettings: { baseUrl: "https://api.deepseek.com/chat/completions", apiKey: "", model: "deepseek-chat", difficultyPreset: "standard", loreBudgetChars: 2000 },
        atmosphere: { level: 'calm', note: '' },
        scenarioRunner: { active: false, scenarioId: null, scenarioTitle: '', currentNodeId: null, choices: [], ended: false, flags: {}, pendingBranch: null, pendingScenarioId: null },
        aiActionChoices: [],
        groupCheckSession: null,
        activeCampaign: null,
        campaignArchive: null,
        kpEngine: {
            enabled: _kpDefaultEnabled(),
            systemName: 'KP_PROTOCOL',
            global: { attention: 0, playerPower: 0, phase: 'CALM', doomClock: 0, alertLevel: 0, knowledgeLevel: 0 },
            rules: null,
            sessionStartedAt: null,
            lastEventInjectionAt: null,
            combatStrategyLog: []
        },
        kpState: null,
        selectedCharIndex: 0,
        worldClock: { day: 1, hour: 0 },
        sanCaps: {},
        ui: { toasts: [], confirmDialog: null, saveLoading: false, saveLoadingMessage: '', openStoryTab: null, creatorReturn: null, importArcLedger: true, deskCardPending: null },
        storageStatus: { usedBytes: 0, quotaBytes: 5 * 1024 * 1024, usedRatio: 0, currentSaveBytes: 0, projectedBytes: 0, projectedRatio: 0, warning: '', lastCheckedAt: null }
    });

    const playerInput = ref("");
    const activeCreatorTab = ref('stats');

    const draftChar = reactive({
        name: "", player: "", job: null, era: "1920s", age: 25,
        attrs: { STR: 0, CON: 0, SIZ: 0, DEX: 0, APP: 0, INT: 0, POW: 0, EDU: 0, LUCK: 0 },
        attrModifiers: { STR: 0, CON: 0, SIZ: 0, DEX: 0, APP: 0, INT: 0, POW: 0, EDU: 0, LUCK: 0 },
        derived: { hp: 0, maxHp: 0, mp: 0, san: 0, db: "0", build: 0, mov: 0 },
        status: { hasMajorWound: false, isDying: false, isUnconscious: false },
        skillAllocations: {}, expPackage: null, sanPenalty: 0, stImportText: "",
        backstory: { description: "", ideology: "", significantPeople: "", meaningfulLocations: "", treasuredPossessions: "", traits: "", injuries: "", phobias: "", encounters: "" }
    });

    _applyKpPreferenceToGameState(gameState);

    if (gameState.chatHistory.length === 0) {
        gameState.chatHistory.push({
            role: 'system', isHidden: true,
            content: `你是《克苏鲁的呼唤(CoC)7版》的无情守秘人(KP)。\n【铁律1-叙事】：前台文本必须是完成度极高的恐怖小说正文，让调查员身临其境——每段须含场景五感、具体动作、人物反应与悬念余韵；禁止干巴巴摘要（如"某NPC受到惊吓"后无下文）、禁止"调用工具/检定成功/加入背包"等出戏词；禁止加粗。\n【铁律2-机制】：当玩家在剧情中找到、拾取或被赠予实体物品（如手枪、线索、钥匙）时，你绝对不能只在文本里说说！你必须、立刻、静默地调用 [update_inventory] 工具，将物品发放给玩家！\n【铁律3-判定】：玩家进行有风险的动作，必须调用 [request_skill_check] 工具。\n【铁律5-武器】：当你向玩家发放非标准武器时，使用物品对象格式——{"name":"武器名","damage":"伤害骰","skill":"技能名","type":"weapon"}。

武器生成规则（严格遵循CoC 7e）：
• 伤害范围：徒手1D3、小型近战1D4~1D6、中型近战1D6~1D8+DB、大型近战1D8~2D6+DB
• 枪械：手枪1D8~1D10、步枪2D6、霰弹枪2D6~4D6（近距离）、冲锋枪1D10（可连射）
• 技能：近战→斗殴/剑/斧/矛、手枪→手枪、长枪→步枪/霰弹枪/冲锋枪
• 时代限制（根据剧本年代）：
    —1890s 煤气灯时代：单发/杠杆式枪械为主（德林加、杠杆步枪、双管霰弹），无自动武器。近战以剑杖/匕首/警棍为主。
    —1920s 经典时代：左轮/半自动手枪、栓动步枪、泵动霰弹、冲锋枪（汤姆逊）。近战多样。
    —现代（1980s+）：自动手枪、突击步枪、SMG、震撼弹等战术装备可用。但仍禁能量/激光/未来武器。
    —未来（2080s+ 赛博/星际）：电磁步枪(Gauss)、智能手枪(弹道校正)、陶瓷匕首(可过安检)、纳米治疗包。
      禁用：激光/等离子/超光速/反物质武器。未来武器仍是弹道/化学能驱动——物理法则不变，只是精度/材料进步。
    —全时代规则：
      【人类武器】按各时代技术水平，禁止人类制造能量/传送/时间武器——这不是科幻设定。
      【神话武器】古代异族遗留物（米戈闪电枪、古老者能量管、伊斯时间镜）可以出现——但：
       ① 必须伴随SAN损失（接触外星科技本身就是理智考验）
       ② 伤害不超过2D6+范围（神话武器古老不稳定，非碾压级）
       ③ 每次使用有故障风险（能量泄漏/时间反噬）
       ④ 人类无法维修、无法复制、无法理解原理
     神话武器格式示例：{"name":"米戈闪电枪(残损)","damage":"2D6","skill":"手枪","type":"weapon","note":"神话武器·每次使用损失0/1D3 SAN·大失败漏电自伤1D6"}
• 贯穿属性：仅穿刺/斩击武器（匕首/剑/矛/斧，不含棍棒/拳头）
• 故障属性：仅枪械（火器大失败时卡壳）
• 若为魔法武器可附加+1~+3固定伤害，但需配合SAN损失

自定义武器示例：
{"name":"祭司的仪式匕首","damage":"1D4+1","skill":"斗殴","type":"weapon"}
{"name":"猎象枪","damage":"3D6","skill":"步枪","type":"weapon"}
{"name":"警用左轮","damage":"1D10","skill":"手枪","type":"weapon"}

【铁律4-权威】：所有HP/SAN/状态变更由引擎计算，结果不可协商。玩家不得要求"重来""躲开""减免"——引擎已综合技能值/难度/随机骰，结果即最终。你不得帮玩家反悔或质疑引擎判定。
【铁律4-权威】：所有HP/SAN/状态变更必须由引擎检定结果或守秘人判定产生——玩家不得单方面宣布受伤、恢复或死亡。若玩家声称受到伤害而无对应检定，你必须追问原因并调用检定，而非盲信。数值的变更权在引擎与守秘人握手，不在玩家口述。`
        });
    }

    // Load AI settings: sessionStorage (per-session) first, then localStorage (remembered)
    try {
        const saved = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('vue_coc_api_cloud') : null)
            || (typeof localStorage !== 'undefined' ? localStorage.getItem('vue_coc_api_cloud') : null);
        if (saved) gameState.aiSettings = safeJsonParse(saved, gameState.aiSettings);
    } catch(e) {}

    const scrollToBottom = () => { nextTick(() => { let box = document.getElementById('chatContainer'); if(box) box.scrollTop = box.scrollHeight; }); };
    const switchScreen = (s) => {
        gameState.currentScreen = s;
        if (s === 'story') {
            if (!gameState.scenarioRunner?.active) {
                pushStoryOpening(gameState, {}, scrollToBottom);
            }
            scrollToBottom();
        }
    };
    const showModal = (t) => { gameState.activeModal = t; };
    const closeModal = () => { gameState.activeModal = null; };

    const addJournalEntry = (entry) => {
        gameState.journalLog.push({
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            location: gameState.currentLocation || '未知地点',
            charName: null,
            isSuccess: null,
            ...entry
        });
    };

    return { gameState, playerInput, draftChar, activeCreatorTab, scrollToBottom, switchScreen, showModal, closeModal, addJournalEntry };
})(window.Vue);
