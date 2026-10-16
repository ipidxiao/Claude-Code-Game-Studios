/**
 * Local Scenario Runner — offline narrative driver parallel to AI KP.
 * Uses structured scenario nodes: narrative, choices, skill checks, effects.
 */
import { CoCLog } from '../data/logger.mjs';
import { CoCGroupCheck as GroupCheck } from '../campaign/group_check.mjs';
import { buildScenarioChoiceMenu } from './choice_menu.mjs';
import { pushStoryOpening } from '../story_opening.mjs';
import { isDryNarrative, DEFERRED_NARRATIVE_HINT } from '../data/narrative_prose.mjs';
import { shouldSkipBranchSetupNarrative, buildGroupSkillNarrative, computeGroupSkillOutcome } from './group_outcome.mjs';
import { CoCProseBridge } from './prose_bridge.mjs';
import { applyScenarioEffects } from './effects_apply.mjs';
import { enqueueRuleCheck } from '../state/rule_check.mjs';
import { hasClueQualityAtLeast, pickClueQualityBranch } from '../data/investigate_outcomes.mjs';
import { applyModuleSeed } from '../data/encounter_seed.mjs';
import { exportArcLedger, importArcLedger, seedWithArcBias, restoreCarrySnapshot, resetInvestigatorCarry, hasCarrySnapshot, applyReputationPressure } from '../state/arc_ledger.mjs';
import { assemblePressureChoiceSuffix } from '../data/display_pipeline.mjs';
import { assembleCarryBrief } from '../data/session_manifest.mjs';
import { assembleEncounterVerdict } from '../data/encounter_verdict.mjs';
import { assembleTimelineContract } from '../data/timeline_contract.mjs';
import { isChapterGatedAllowed } from '../data/arc_chapters.mjs';
import { resolveMarkCapabilityId, CAPABILITY_IR_VERSION } from '../data/capability_risk.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCEngine } from '../coc.mjs';
import { CoCCapabilitySystem } from '../data/capability_system.mjs';
import { CoCScenarioStore } from './store.mjs';

export const CoCScenarioRunner = (function (State, Engine, Store) {
    if (!State || !Store) return {};

    // Tests call bindScenarioStore after import. Production keeps the module export.
    let scenarioStore = Store;

    const bindScenarioStore = (next) => {
        scenarioStore = next || Store;
    };

    const { gameState, scrollToBottom, addJournalEntry, addClue, createMap, setPosition, addNpc } = State;
    let scenarioStartGeneration = 0;

    const defaultRunner = () => ({
        active: false,
        scenarioId: null,
        scenarioTitle: '',
        currentNodeId: null,
        choices: [],
        ended: false,
        flags: {},
        pendingBranch: null,
        deferredNarrative: null,
        judgmentMarks: [],
        spentChoiceIds: [],
        pushOffer: null,
        clocks: null,
        onClockFull: null
    });

    const ensureRunner = () => {
        if (!gameState.scenarioRunner) gameState.scenarioRunner = defaultRunner();
        return gameState.scenarioRunner;
    };

    const getScenario = () => {
        const r = ensureRunner();
        const Store = scenarioStore;
        return r.scenarioId && Store ? Store.getScenario(r.scenarioId) : null;
    };

    const getNode = (nodeId) => {
        const scenario = getScenario();
        if (!scenario || !nodeId) return null;
        return scenario.nodes[nodeId] || null;
    };

    const pushKp = (text) => {
        const body = String(text);
        if (isDryNarrative(body)) {
            CoCLog.debug('[scenario] dry narrative node:', body.slice(0, 80));
        }
        gameState.chatHistory.push({ role: 'assistant', content: body, _scenario: true });
        scrollToBottom();
    };

    const pushSystem = (text, opts = {}) => {
        gameState.chatHistory.push({ role: 'system', isLocalOnly: true, ...opts, content: text });
        scrollToBottom();
    };

    const setChoices = (choices) => {
        const r = ensureRunner();
        r.choices = Array.isArray(choices) ? choices.filter((c) => c && c.label) : [];
    };

    const hasClueOrItem = (runner) => {
        const clues = gameState.clueBoard?.clues || [];
        const inv = gameState.inventory || [];
        const hasBadge = clues.some((c) => c.id === 'dos_badge') || inv.some((i) => String(i.name || i).includes('工牌'));
        const hasArticle = clues.some((c) => c.id === 'dos_article');
        return hasBadge || hasArticle;
    };

    const hasClueId = (clueId) => {
        const clues = gameState.clueBoard?.clues || [];
        return clues.some((c) => c && c.id === clueId);
    };

    const checkRequires = (choice) => {
        if (!choice) return true;
        const r = ensureRunner();
        // Hidden until the named clue is on the board. No toast: the button is absent.
        if (choice.requiresClueId && !hasClueId(choice.requiresClueId)) return false;
        if (choice.requiresFlag) {
            if (choice.requiresFlag === 'has_badge_or_article') {
                if (hasClueOrItem(r)) {
                    r.flags.has_badge_or_article = true;
                } else {
                    pushSystem('⚠️ 你缺少进入凭据（码头工牌或记者稿件）。试试旅馆或老渔夫路线。', { isAlert: true });
                    return false;
                }
            } else if (!r.flags[choice.requiresFlag]) {
                const flag = choice.requiresFlag;
                let blocked = '⚠️ 还需要更多线索才能选择这一项。';
                if (flag === 'police_interest') {
                    blocked = '⚠️ 这一项需要警察盯梢。它来自战后余波，或上一局战役账本。';
                } else if (flag === 'reputation_hit') {
                    blocked = '⚠️ 这一项需要风声已紧。它来自公共场所冲突后的余波，或上一局战役账本。';
                }
                pushSystem(blocked, { isAlert: true });
                return false;
            }
        }
        if (choice.requiresClueQuality) {
            const clues = gameState.clueBoard?.clues || [];
            let need = choice.requiresClueQuality;
            if (need === 'seed' || choice.useSeedClueQuality) {
                need = (r.flags && r.flags.seedRequiresClueQuality) || 'solid';
            }
            if (!hasClueQualityAtLeast(clues, need)) {
                pushSystem('⚠️ 线索质量不足（需要' + need + '级物证）。提高检定档次或另寻证据。', { isAlert: true });
                return false;
            }
        }
        return true;
    };

    const applyEffects = (effects, targetCharName) => {
        const out = applyScenarioEffects({
            gameState,
            Engine,
            pushSystem,
            addJournalEntry,
            addClue,
            createMap,
            setPosition,
            addNpc,
            syncSplitDisplayLocation: GroupCheck.syncSplitDisplayLocation,
            deferSanCheck: true,
            ensureFlags: () => {
                const r = ensureRunner();
                if (!r.flags) r.flags = {};
                if (!gameState.flags) gameState.flags = {};
                return r.flags;
            }
        }, effects, targetCharName);
        if (out && out.combat && out.combat.pending && out.combat.cfg) {
            queuePendingCombatRoll(out.combat.cfg, targetCharName);
        }
        if (out && out.san && out.san.pending) {
            enqueueRuleCheck(gameState, {
                kind: 'san',
                skill: 'SAN',
                roller: out.san.target,
                target: out.san.target,
                notation: out.san.notation,
                cause: out.san.cause || '剧本目击',
                prompt: `请进行【SAN】检定（${out.san.target}）。失败按大档扣理智。`
            });
        }
        if (out && out.chase) markCapability('追逐');
        if (out && out.clocks) {
            markCapability('双时钟');
            checkClockFull();
        }
        if (out && out.debunkFalseLead && out.debunkFalseLead.count) markCapability('假线索');
        return out;
    };

    const queuePendingCombatRoll = (combatCfg, targetCharName) => {
        const r = ensureRunner();
        const skill = combatCfg.weaponSkill || '斗殴';
        const target = targetCharName || resolveDefaultCheckTarget();
        r.pendingBranch = {
            nextNode: r.currentNodeId,
            nodeId: r.currentNodeId,
            skill,
            target,
            pendingCombat: combatCfg,
            stayOnNode: true
        };
        emitSkillCheckRequest({
            skill,
            target_name: target,
            next: r.currentNodeId
        }, getNode(r.currentNodeId));
    };

    const markCapability = (tag) => {
        const r = ensureRunner();
        if (!Array.isArray(r.capabilitiesUsed)) r.capabilitiesUsed = [];
        let id;
        try {
            id = resolveMarkCapabilityId(tag);
        } catch (err) {
            CoCLog.error('markCapability rejected', tag, err && err.message);
            return;
        }
        if (id && !r.capabilitiesUsed.includes(id)) r.capabilitiesUsed.push(id);
    };

    const pushEndingRecap = (gs, endingKey) => {
        const prevUnlocked = (gs._preEndUnlocked || []).slice();
        const ledger = gs.arcLedger || {};
        const flags = Object.keys(ledger.flagsCarry || {}).filter((k) => ledger.flagsCarry[k]);
        const inv = (ledger.investigators && ledger.investigators[0]) || {};
        const heatLog = Array.isArray(gs.heatEventsLog) ? gs.heatEventsLog : [];
        const unlockedNow = (ledger.chapters && ledger.chapters.unlocked) || [];
        const newUnlocks = unlockedNow.filter((id) => prevUnlocked.indexOf(id) < 0);
        const r = gs.scenarioRunner || {};
        const caps = Array.isArray(r.capabilitiesUsed) ? r.capabilitiesUsed : [];

        const timeline = [];
        timeline.push({ t: 'end', text: '终局节点：' + endingKey });
        timeline.push({
            t: 'evidence',
            text: '证据档：' + (inv.topClueQuality || 'weak') + ' · 热度：' + (ledger.mythosHeatFloor || 0) + '/5'
        });
        const encounterVerdict = assembleEncounterVerdict(gs);
        if (encounterVerdict && encounterVerdict.line) {
            timeline.push({ t: 'verdict', text: encounterVerdict.line });
        }
        if (heatLog.length) {
            heatLog.forEach((e) => timeline.push({ t: 'heat', text: e.journal || e.id }));
        } else {
            timeline.push({ t: 'heat', text: '热度事件：无' });
        }
        timeline.push({ t: 'flag', text: '带走标记：' + (flags.length ? flags.join('、') : '无') });
        if (newUnlocks.length) {
            timeline.push({ t: 'unlock', text: '新解锁：' + newUnlocks.join('、') });
        }
        if (caps.length) {
            timeline.push({ t: 'cap', text: '本局用到：' + caps.join(' · ') });
        }
        const preview = Array.isArray(r.capabilitiesPreview) ? r.capabilitiesPreview : [];
        let capabilityDiffLine = '';
        if (CoCCapabilitySystem.diffCapabilities) {
            const diff = CoCCapabilitySystem.diffCapabilities(preview, caps);
            capabilityDiffLine = diff.line || '';
            if (capabilityDiffLine) {
                timeline.push({ t: 'capdiff', text: capabilityDiffLine });
            }
        }
        timeline.push({ t: 'hint', text: '下一剧本可在桌规卡选择「继承档案与收获」或「重置调查员」。' });

        const timelineContract = assembleTimelineContract(timeline);
        const lines = timelineContract.ok ? timelineContract.rows : timeline;
        const copyText = lines.map((x) => x.text).join('\n');
        if (!gs.ui) gs.ui = {};
        const recap = {
            endingKey,
            lines,
            copyText,
            flags,
            newUnlocks,
            capabilitiesUsed: caps.slice(),
            capabilitiesPreview: preview.slice(),
            capabilityDiffLine,
            capabilityIrVersion: CAPABILITY_IR_VERSION,
            encounterVerdict: encounterVerdict || null,
            timelineContractVersion: timelineContract.contractVersion,
            timelineContractOk: timelineContract.ok
        };
        gs.ui.endingRecap = recap;
        if (CoCCapabilitySystem.buildEndingSaveBlurb) {
            gs.endingSaveBlurb = CoCCapabilitySystem.buildEndingSaveBlurb(recap);
        } else {
            gs.endingSaveBlurb = timeline[0] ? timeline[0].text : ('终局：' + endingKey);
        }
        pushSystem('📋 [结局回放]\n' + copyText, { isLocalOnly: true });
        delete gs._preEndUnlocked;
    };

    const applySetup = (setup) => {
        if (!setup) return;
        applyEffects(setup);
        if (setup.map && createMap) {
            createMap(setup.map.title, setup.map.rooms);
            if (setup.map.currentRoomId && setPosition) setPosition(setup.map.currentRoomId);
        }
    };

    const initClocks = (scenario) => {
        const r = ensureRunner();
        const c = scenario && scenario.clocks;
        if (c && typeof c === 'object') {
            r.clocks = {
                investigation: Number(c.investigation) || 0,
                ritual: Number(c.ritual) || 0,
                maxInvestigation: Number(c.maxInvestigation) || 5,
                maxRitual: Number(c.maxRitual) || 5
            };
            r.onClockFull = scenario.onClockFull || null;
            markCapability('双时钟');
        } else {
            r.clocks = null;
            r.onClockFull = null;
        }
    };

    /** After advanceClock effects, force branch if a track is full. */
    const checkClockFull = () => {
        const r = ensureRunner();
        if (!r.clocks || !r.onClockFull || r._clockFullFired) return null;
        const invMax = Number(r.clocks.maxInvestigation) || 5;
        const ritMax = Number(r.clocks.maxRitual) || 5;
        let hit = null;
        if ((Number(r.clocks.ritual) || 0) >= ritMax && r.onClockFull.ritual) hit = r.onClockFull.ritual;
        else if ((Number(r.clocks.investigation) || 0) >= invMax && r.onClockFull.investigation) {
            hit = r.onClockFull.investigation;
        }
        if (!hit) return null;
        r._clockFullFired = true;
        if (hit.effects) applyEffects(hit.effects);
        if (hit.next) {
            pushSystem('⏱ [双时钟] 进度已满，强制推进。', { isAlert: true });
            goToNode(hit.next);
        }
        return hit;
    };

    const clearScenarioTransients = () => {
        gameState.chase = { active: false, round: 1, vehicle: false, quarryName: '', participants: [], outcome: null };
        if (gameState.combat && Array.isArray(gameState.combat.enemies)) {
            gameState.combat.enemies = gameState.combat.enemies.filter((e) => e && !e.fromScenario);
        }
        gameState.pendingRuleCheck = null;
        gameState.pendingRuleChecks = [];
        delete gameState._lastScenarioCheckLevel;
        delete gameState._scenarioEffectActor;
        const r = gameState.scenarioRunner;
        if (r && r.pendingBranch) {
            delete r.pendingBranch.pendingCombat;
            if (r.pendingBranch.stayOnNode) r.pendingBranch = null;
        }
        (gameState.chatHistory || []).forEach((m) => {
            if (!m || !m._scenarioCheck) return;
            m.isResolved = true;
            (m.tool_calls || []).forEach((tc) => {
                if (tc) tc.isResolved = true;
            });
        });
    };

    const resolveBranch = (node, success, branchOpts = {}) => {
        const branch = node.branch || {};
        const nextId = success ? (branch.success || branch.onSuccess) : (branch.failure || branch.onFailure);
        if (nextId) goToNode(nextId, { skipNarrative: !!branchOpts.skipLandingNarrative });
        else pushSystem('⚠️ [剧本] 分支节点缺少后续定义。', { isAlert: true });
    };

    const resolveDefaultCheckTarget = () => {
        const roster = gameState.roster || [];
        if (typeof State.resolveSelectedActiveChar === 'function') {
            const selected = State.resolveSelectedActiveChar(gameState);
            if (selected && selected.name) return selected.name;
        }
        const active = roster.filter((c) => c && c.isActive);
        if (!active.length) return roster[0]?.name || '调查员';
        if (typeof State.clampSelectedCharIndex === 'function') State.clampSelectedCharIndex(gameState);
        const idx = Number.isFinite(gameState.selectedCharIndex) ? gameState.selectedCharIndex : 0;
        const at = roster[idx];
        if (at && at.isActive && at.name) return at.name;
        return active[0].name;
    };

    const emitSkillCheckRequest = (checkConfig, branchNode) => {
        const skill = checkConfig.skill || checkConfig.skill_name || '侦查';
        const target = checkConfig.target
            || checkConfig.target_name
            || resolveDefaultCheckTarget();

        const toolId = 'scenario_check_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const r = ensureRunner();
        const prior = r.pendingBranch || {};
        const branchNext = checkConfig.choiceOption?.next || checkConfig.next || null;
        const msg = {
            role: 'assistant',
            content: `请进行【${skill}】检定。`,
            tool_calls: [{
                id: toolId,
                type: 'function',
                function: {
                    name: checkConfig.isPush ? 'push_skill_check' : 'request_skill_check',
                    arguments: JSON.stringify({ skill_name: skill, target_name: target })
                },
                isResolved: false,
                isPushed: !!checkConfig.isPush,
                target_name: target,
                skill_name: skill
            }],
            isResolved: false,
            _scenarioCheck: true,
            _branchNode: branchNext || branchNode?.id || prior.nextNode || r.currentNodeId
        };
        gameState.chatHistory.push(msg);
        // Prefer explicit next / existing pending over currentNodeId — scenario node
        // objects often have no `.id`, so falling back to currentNodeId breaks groupOutcome.
        const resolvedNext = branchNext
            || prior.nextNode
            || checkConfig.branchNodeId
            || null;
        if (checkConfig.groupCheck) {
            if (!r.pendingBranch?.nextNode || resolvedNext) {
                r.pendingBranch = {
                    nextNode: resolvedNext || prior.nextNode || r.currentNodeId,
                    fromChoice: checkConfig.choiceOption?.id || prior.fromChoice || null,
                    nodeId: resolvedNext || prior.nextNode || r.currentNodeId,
                    skill,
                    target,
                    groupCheck: true
                };
            }
        } else if (!r.pendingBranch) {
            r.pendingBranch = {
                nextNode: resolvedNext || r.currentNodeId,
                nodeId: resolvedNext || r.currentNodeId,
                skill,
                target
            };
        }
        scrollToBottom();
    };

    const queueSkillCheck = (checkConfig, branchNode) => {
        emitSkillCheckRequest(checkConfig, branchNode);
    };

    /**
     * Skill for a check node: its own skillCheck if declared, else the skill used by the
     * scenario's choices that roll into it (every built-in check node has exactly one).
     */
    const landingCheckFor = (nodeId, node) => {
        const own = node.skillCheck || (node.branch && node.branch.skillCheck);
        if (own && (own.skill || own.skill_name)) return Object.assign({}, own);
        const scen = getScenario();
        for (const n of Object.values((scen && scen.nodes) || {})) {
            for (const c of (n && n.choices) || []) {
                if (c && c.next === nodeId && c.skillCheck && (c.skillCheck.skill || c.skillCheck.skill_name)) {
                    return Object.assign({}, c.skillCheck);
                }
            }
        }
        return null;
    };

    /** Emit the check of a check node the runner landed on (same path as a skill-check choice). */
    const startLandingCheck = (nodeId, node) => {
        const r = ensureRunner();
        const check = landingCheckFor(nodeId, node);
        if (!check) {
            pushSystem('⚠️ [剧本] 检定节点缺少检定定义，无法继续。', { isAlert: true });
            return false;
        }
        // landedOn: goToNode already showed this node's narrative and applied its effects;
        // resolveSkillCheckBranch must not replay them.
        r.pendingBranch = { nextNode: nodeId, fromChoice: null, isPush: false, falseLead: false, falseNext: null, landedOn: nodeId };
        const skill = check.skill || check.skill_name || '侦查';
        const active = GroupCheck.getActiveInvestigators(gameState);
        if (active.length > 1 && check.mode !== 'single') {
            GroupCheck.startForcedSession(gameState, {
                skill,
                aggregate: check.aggregate || 'any',
                pendingBranch: r.pendingBranch,
                branchNodeId: nodeId,
                choiceLabel: node.checkpoint || skill
            }, (cfg) => emitSkillCheckRequest({ ...cfg, next: nodeId, branchNodeId: nodeId }, node));
            pushSystem(`👥 强制检定【${skill}】：请每名调查员依次掷骰。`, { isLocalOnly: true });
            return true;
        }
        queueSkillCheck({ ...check, skill, next: nodeId }, node);
        return true;
    };

    const syncKpGameLoop = () => {
        if (typeof window !== 'undefined' && window.KpGameLoop && typeof window.KpGameLoop.register === 'function') {
            window.KpGameLoop.register(gameState);
        }
    };

    const shouldStayOnCheckFailure = (node) => {
        return !(node && node.branch && (node.branch.failure || node.branch.onFailure || node.branch.success || node.branch.onSuccess));
    };

    const choiceSkillStillOpen = (choice) => {
        if (!choice?.skillCheck || choice.skillCheck.isPush) return true;
        if (typeof Engine.canAttemptSkill !== 'function') return true;
        const skill = choice.skillCheck.skill || choice.skillCheck.skill_name;
        if (!skill) return true;
        return Engine.canAttemptSkill(gameState, {
            charName: resolveDefaultCheckTarget(),
            skill,
            isPush: false,
            choiceId: choice.skillCheck.originalChoiceId || choice.id,
            nextNode: choice.next
        }).ok;
    };

    const mapNodeChoices = (choices) => {
        const r = ensureRunner();
        const spent = new Set(r.spentChoiceIds || []);
        const suffix = assemblePressureChoiceSuffix(gameState, { flags: r.flags });
        const mapped = (choices || [])
            .filter((c) => !spent.has(c.id || c.label))
            .filter((c) => !c.requiresClueId || hasClueId(c.requiresClueId))
            .map((c) => ({
                id: c.id || c.label,
                label: String(c.label || '') + (suffix && (c.requiresClueQuality || c.requiresFlag || c.falseLead) ? suffix : ''),
                next: c.next,
                skillCheck: c.skillCheck || null,
                effects: c.effects || null,
                requiresFlag: c.requiresFlag || null,
                requiresClueId: c.requiresClueId || null,
                requiresClueQuality: c.requiresClueQuality || null,
                useSeedClueQuality: !!c.useSeedClueQuality,
                branchByClueQuality: c.branchByClueQuality || null,
                falseLead: !!c.falseLead,
                falseNext: c.falseNext || null
            }))
            .filter(choiceSkillStillOpen);
        if (r.pushOffer && r.pushOffer.nodeId === r.currentNodeId && !spent.has(`push:${r.pushOffer.fromChoice}`)) {
            mapped.push({
                id: `push:${r.pushOffer.fromChoice}`,
                label: `推动【${r.pushOffer.skill}】（孤注一掷）`,
                next: r.pushOffer.nextNode,
                skillCheck: {
                    skill: r.pushOffer.skill,
                    isPush: true,
                    originalChoiceId: r.pushOffer.fromChoice
                }
            });
        }
        return mapped;
    };

    /** Void an unrolled scenario dice panel so a manual replay cannot resolve the next branch. */
    const voidOpenScenarioChecks = () => {
        const history = gameState.chatHistory || [];
        let voided = 0;
        for (const msg of history) {
            if (!msg || !msg._scenarioCheck || !Array.isArray(msg.tool_calls)) continue;
            const open = msg.tool_calls.filter((t) => t && !t.isResolved);
            if (!open.length) continue;
            open.forEach((t) => { t.isResolved = true; });
            msg.isResolved = true;
            voided += open.length;
        }
        if (voided) {
            ensureRunner().pendingBranch = null;
            pushSystem('（已作废未完成的检定，可重新选择行动。）', { isLocalOnly: true });
        }
        return voided;
    };

    /** opts.silent marks an internal replay (post-resolution); only manual replays void open checks. */
    const replayCurrentChoices = (opts = {}) => {
        const r = ensureRunner();
        if (!r.active || r.ended) return false;
        const node = getNode(r.currentNodeId);
        if (!node?.choices?.length) return false;
        if (!opts.silent) voidOpenScenarioChecks();
        const mapped = mapNodeChoices(node.choices);
        const active = GroupCheck.getActiveInvestigators(gameState);
        if (active.length > 1) {
            GroupCheck.startChoiceSession(gameState, { scenarioChoices: mapped, nodeId: r.currentNodeId });
            setChoices([]);
            // Group choice handled by UI
            return true;
        }
        setChoices(mapped);
        // UI buttons handle choice display; no chat spam needed
        return true;
    };

    const flushDeferredNarrative = () => {
        const r = ensureRunner();
        const text = r.deferredNarrative;
        if (!text || !String(text).trim()) {
            r.deferredNarrative = null;
            return false;
        }
        r.deferredNarrative = null;
        pushKp(String(text).trim());
        return true;
    };

    const goToNode = (nodeId, opts = {}) => {
        const r = ensureRunner();
        let node = getNode(nodeId);
        if (!node) {
            pushSystem(`⚠️ [剧本] 找不到节点「${nodeId}」。`, { isAlert: true });
            return false;
        }

        // Evidence-tier ending router: redirect before applying this node's payload.
        if (node.endingsByClueQuality && !opts.skipClueEnding) {
            const clues = gameState.clueBoard?.clues || [];
            const picked = pickClueQualityBranch(node.endingsByClueQuality, clues);
            const targetId = picked && picked.next;
            if (targetId && targetId !== nodeId) {
                return goToNode(targetId, Object.assign({}, opts, { skipClueEnding: true }));
            }
        }

        r.currentNodeId = nodeId;
        r.pendingBranch = null;
        // New node replaces any previous gate unless caller already flushed.
        if (!opts.keepDeferred) r.deferredNarrative = null;

        if (node.effects) applyEffects(node.effects);
        // Clock-full may recursively goToNode — do not continue with the old node payload.
        if (checkClockFull()) return true;
        if (node.checkpoint) {
            if (addJournalEntry) addJournalEntry({ type: 'checkpoint', summary: node.checkpoint });
            pushSystem(`📍 [检查点] ${node.checkpoint}`, { isLocalOnly: true });
        }
        if (node.narrative && !opts.skipNarrative) {
            const proseKeys = node._proseKeys || (node.proseKey ? [node.proseKey] : [nodeId]);
            const scen = getScenario();
            const proseScenarioId = scen?.proseScenarioId || r.scenarioId;
            const awaitingSkillCheck = !!(node.branch)
                || !!(node.choices && node.choices.some((c) => c && c.skillCheck));
            const gateOpts = { awaitingSkillCheck };
            let gated = {
                visible: node.narrative,
                deferred: '',
                judgmentParas: [],
                hasJudgment: false
            };
            if (proseScenarioId && proseKeys.length && CoCProseBridge.enrichNarrativeGatedSync) {
                gated = CoCProseBridge.enrichNarrativeGatedSync(node.narrative, proseKeys, proseScenarioId, gateOpts);
            } else if (proseScenarioId && proseKeys.length) {
                gated.visible = CoCProseBridge.enrichNarrativeSync(node.narrative, proseKeys, proseScenarioId, gateOpts);
            } else if (awaitingSkillCheck && typeof CoCProseBridge.partitionNarrationByJudgment === 'function') {
                const part = CoCProseBridge.partitionNarrationByJudgment(node.narrative, gateOpts);
                gated = {
                    visible: part.before || node.narrative,
                    deferred: part.after || '',
                    judgmentParas: part.judgmentParas || [],
                    hasJudgment: !!part.hasJudgment
                };
            }
            if (gated.visible) pushKp(gated.visible);
            // Gate plot after 判定段落 until skill check completes.
            r.deferredNarrative = gated.deferred || null;
            r.judgmentMarks = gated.judgmentParas || [];
            if (r.deferredNarrative) {
                pushSystem(DEFERRED_NARRATIVE_HINT, { isLocalOnly: true });
            }
        }

        if (node.end) {
            r.ended = true;
            r.choices = [];
            gameState._preEndUnlocked = ((gameState.arcLedger && gameState.arcLedger.chapters && gameState.arcLedger.chapters.unlocked) || []).slice();
            exportArcLedger(gameState, { scenarioId: r.scenarioId, endingKey: nodeId });
            pushEndingRecap(gameState, nodeId);
            pushSystem('📜 [本地剧本] 本段剧情已结束。可导出存档或返回大厅选择其他剧本。');
            return true;
        }

        if (node.branch && !node.choices) {
            r.choices = [];
            // Normally a check node is resolved without being entered (the choice queues the
            // roll). Landing here directly — a plain side-room choice, or a branch that leads into
            // another check node — left no choices and no dice panel: emit the node's own check.
            if (!r.pendingBranch && !gameState.groupCheckSession) startLandingCheck(nodeId, node);
            scrollToBottom();
            return true;
        }

        if (node.choices && node.choices.length) {
            const mapped = mapNodeChoices(node.choices);
            const active = GroupCheck.getActiveInvestigators(gameState);
            if (active.length > 1) {
                GroupCheck.startChoiceSession(gameState, { scenarioChoices: mapped, nodeId });
                setChoices([]);
                pushSystem('👥 每名调查员请分别选择行动。', { isLocalOnly: true });
                return true;
            }
            setChoices(mapped);
            return true;
        }

        r.choices = [];
        return true;
    };

    const startScenario = (scenarioId) => {
        const Store = scenarioStore;
        if (!Store || typeof Store.isAvailable !== 'function') {
            CoCLog.error('Scenario store not ready');
            return false;
        }
        if (!Store.isAvailable(scenarioId)) {
            CoCLog.error('Scenario not available locally', scenarioId);
            return false;
        }
        const scenario = Store.getScenario(scenarioId);
        const validation = Store.validate ? Store.validate(scenario) : { ok: false, errors: ['validate missing'] };
        if (!validation.ok) {
            CoCLog.error('Scenario validation failed', validation.errors);
            return false;
        }
        if (!isChapterGatedAllowed(scenario, gameState.arcLedger)) {
            CoCLog.error('Scenario chapter locked', scenarioId);
            pushSystem('🔒 [战役章节] 尚未解锁「' + (scenario.title || scenarioId) + '」。先完成前置短模。', { isAlert: true });
            return false;
        }

        const carryMode = (gameState.ui && gameState.ui.carryMode) || null;
        if (carryMode === 'inherit' && hasCarrySnapshot(gameState.arcLedger)) {
            restoreCarrySnapshot(gameState);
            pushSystem('📒 [继承] 已恢复调查员档案与收获（物品/热度/标记将接入本局）。', { isLocalOnly: true });
        } else if (carryMode === 'reset') {
            resetInvestigatorCarry(gameState);
            pushSystem('🔄 [重置] 已清空收获并恢复满状态；章节解锁保留。', { isLocalOnly: true });
        }

        const startGeneration = ++scenarioStartGeneration;
        gameState.scenarioRunner = defaultRunner();
        clearScenarioTransients();
        delete gameState.endingSaveBlurb;
        if (gameState.ui) delete gameState.ui.endingRecap;
        const r = ensureRunner();
        r.active = true;
        r.scenarioId = scenarioId;
        r.scenarioTitle = scenario.title;
        try {
            if (typeof window !== 'undefined' && window.CoCExtensions && window.CoCExtensions.emit) {
                window.CoCExtensions.emit('chapter:change', {
                    scenarioId,
                    title: scenario.title || '',
                    nodeId: scenario.startNode || null
                });
            }
        } catch (_e) { /* ignore */ }
        initClocks(scenario);
        if (CoCCapabilitySystem.previewScenarioCapabilities) {
            r.capabilitiesPreview = CoCCapabilitySystem.previewScenarioCapabilities(scenario);
        } else {
            r.capabilitiesPreview = [];
        }

        const useArc = carryMode === 'inherit'
            || scenario.readsArcLedger
            || gameState._forceImportArcLedger
            || (gameState.ui && gameState.ui.importArcLedger);
        if (useArc && gameState.arcLedger && carryMode !== 'reset') {
            importArcLedger(gameState, { skipHeat: false });
            delete gameState._forceImportArcLedger;
            if (gameState.ui) gameState.ui.importArcLedger = false;
            pushSystem('📒 [战役账本] 已载入上一局余波（声望/热度/标记）。', { isLocalOnly: true });
        }
        if (carryMode === 'inherit' && hasCarrySnapshot(gameState.arcLedger)) {
            if (!gameState.ui) gameState.ui = {};
            const brief = assembleCarryBrief(gameState);
            if (brief) gameState.ui.carryBrief = brief;
            else delete gameState.ui.carryBrief;
            markCapability('战役账本');
        } else if (gameState.ui) {
            delete gameState.ui.carryBrief;
        }
        if (r.flags && (r.flags.police_interest || r.flags.reputation_hit || r.flags.arc_pressure)) {
            markCapability('战后余波');
        }
        if (gameState.ui) delete gameState.ui.carryMode;

        let seedOpt = gameState._testModuleSeed != null ? gameState._testModuleSeed : undefined;
        if (seedOpt == null && gameState._arcLedgerSeedBias) {
            seedOpt = seedWithArcBias(Date.now(), gameState._arcLedgerSeedBias);
        }
        applyModuleSeed(gameState, { seed: seedOpt });
        delete gameState._testModuleSeed;
        delete gameState._arcLedgerSeedBias;
        if (r.flags && (r.flags.police_interest || r.flags.reputation_hit)) {
            applyReputationPressure(r, r.flags);
        }

        const sysPrompt = gameState.chatHistory.find((m) => m.role === 'system' && m.isHidden);
        gameState.chatHistory.splice(0, gameState.chatHistory.length);
        if (sysPrompt) gameState.chatHistory.push(sysPrompt);

        pushSystem(`📜 [本地剧本模式] 已载入「${scenario.title}」— 完全离线，由内置剧本驱动。`);
        if (scenario.initialLocation) gameState.currentLocation = scenario.initialLocation;
        applySetup(scenario.setup);
                // Inject scenario context into hidden system prompt
                const hidden = gameState.chatHistory.find(m => m.role === 'system' && m.isHidden);
                if (hidden && scenario && !hidden._hasScenarioContext) {
                    const ctx = [scenario.title, scenario.era, scenario.initialLocation, scenario.description]
                        .filter(Boolean).join('\n');
                    if (ctx) {
                        hidden.content = hidden.content.replace('【铁律3-判定】', ctx + '\n【铁律3-判定】');
                        hidden._hasScenarioContext = true;
                    }
                }
        pushStoryOpening(gameState, {
            force: true,
            local: true,
            scenario,
            title: scenario.title,
            subtitle: scenario.subtitle || '本地剧本',
            location: scenario.initialLocation || scenario.setup?.location || gameState.currentLocation,
            era: scenario.era,
            time: scenario.time || (scenario.era ? undefined : scenario.subtitle),
        }, scrollToBottom);

        const enterStartNode = () => {
            const live = ensureRunner();
            if (startGeneration !== scenarioStartGeneration
                || !live.active
                || live.scenarioId !== scenarioId) {
                return false;
            }
            return goToNode(scenario.startNode);
        };
        // Wait for prose bank so first node can enrich to full immersive text (not short JSON stub).
        const proseBankId = scenario.proseScenarioId || scenario.id;
        gameState.heatEventsLog = [];
        if (CoCProseBridge.hasProseBank(proseBankId)) {
            CoCProseBridge.loadProseBank(proseBankId)
                .then(enterStartNode)
                .catch(enterStartNode);
        } else {
            enterStartNode();
        }
        syncKpGameLoop();
        return true;
    };

    const stopScenario = (opts = {}) => {
        scenarioStartGeneration += 1;
        const r = ensureRunner();
        const title = r.scenarioTitle;
        GroupCheck.clearGroupCheckSession(gameState);
        clearScenarioTransients();
        gameState.scenarioRunner = defaultRunner();
        setChoices([]);
        syncKpGameLoop();
        if (!opts.silent) {
            pushSystem(title
                ? `📜 [本地剧本] 已退出「${title}」。可配置 API 后使用在线守秘人继续。`
                : '📜 [本地剧本] 已退出。');
        }
    };

    const switchToOnlineMode = () => {
        stopScenario({ silent: true });
        pushSystem('🌐 [在线模式] 已退出本地剧本驱动。请在下方输入行动，并确保设置中已配置 API 密钥。', { isAlert: false });
    };

    const selectChoice = (choiceId) => {
        const r = ensureRunner();
        if (!r.active || r.ended) return false;
        const choice = r.choices.find((c) => c.id === choiceId);
        if (!choice) return false;
        if (!checkRequires(choice)) return false;

        // Choice logged via UI button; no chat spam
        if (choice.effects) {
            applyEffects(choice.effects);
            // Clock-full may recursively goToNode — abort remaining choice navigation.
            if (checkClockFull()) return true;
        }

        let nextNode = choice.next;
        if (choice.falseLead) {
            // Keep skillCheck.next as the check/branch node; falseNext applies after success.
        } else if (choice.branchByClueQuality) {
            const clues = gameState.clueBoard?.clues || [];
            const picked = pickClueQualityBranch(choice.branchByClueQuality, clues);
            if (picked) {
                if (picked.effects) applyEffects(picked.effects);
                if (picked.next) nextNode = picked.next;
            }
        }

        if (choice.skillCheck) {
            r.pendingBranch = {
                nextNode: nextNode,
                fromChoice: choice.skillCheck.originalChoiceId || String(choice.id || '').replace(/^push:/, ''),
                isPush: !!choice.skillCheck.isPush,
                falseLead: !!choice.falseLead,
                falseNext: choice.falseNext || null
            };
            const active = GroupCheck.getActiveInvestigators(gameState);
            const skill = choice.skillCheck.skill || choice.skillCheck.skill_name || '侦查';
            if (active.length > 1 && choice.skillCheck.mode !== 'single') {
                const checkNodeId = nextNode || r.currentNodeId;
                GroupCheck.startForcedSession(gameState, {
                    skill,
                    aggregate: choice.skillCheck.aggregate || 'any',
                    pendingBranch: r.pendingBranch,
                    branchNodeId: checkNodeId,
                    choiceLabel: choice.label
                }, (cfg) => emitSkillCheckRequest({
                    ...cfg,
                    next: checkNodeId,
                    branchNodeId: checkNodeId
                }, getNode(checkNodeId)));
                pushSystem(`👥 强制检定【${skill}】：请每名调查员依次掷骰。`, { isLocalOnly: true });
                setChoices([]);
                return true;
            }
            queueSkillCheck({ ...choice.skillCheck, next: nextNode }, getNode(nextNode || r.currentNodeId));
            setChoices([]);
            return true;
        }

        // No skill check: release any gated post-judgment plot, then advance.
        flushDeferredNarrative();
        setChoices([]);
        if (nextNode) goToNode(nextNode);
        return true;
    };

    const matchChoiceFromText = (text) => {
        const r = ensureRunner();
        if (!r.choices.length) return null;
        const t = text.trim().toLowerCase();
        const exact = r.choices.find((c) => (c.label || '').toLowerCase() === t);
        if (exact) return exact;
        // Ambiguous partial input must not silently spend a different choice.
        const partial = r.choices.filter((c) => {
            const label = (c.label || '').toLowerCase();
            return label && (t.includes(label) || label.includes(t));
        });
        if (partial.length === 1) return partial[0];
        if (partial.length > 1) return null;
        const byId = r.choices.filter((c) => {
            const id = (c.id || '').toLowerCase();
            return id && (t === id || t.includes(id));
        });
        return byId.length === 1 ? byId[0] : null;
    };

    const handleInput = (text) => {
        const r = ensureRunner();
        if (!r.active || r.ended) return false;
        const trimmed = String(text || '').trim();
        if (!trimmed) return false;

        gameState.chatHistory.push({ role: 'user', content: trimmed });
        clearPlayerInput();

        const matched = matchChoiceFromText(trimmed);
        if (matched) {
            selectChoice(matched.id);
            return true;
        }

        if (/^(继续|下一步|刷新选项?)$/i.test(trimmed)) {
            if (replayCurrentChoices()) return true;
        }

        pushSystem('（本地剧本）请从下方选项中选择行动，或输入与选项完全一致的简短指令。输入「继续」可尝试恢复选项。若要自由探索请切换「在线守秘人模式」。', { isAlert: true });
        scrollToBottom();
        return true;
    };

    const clearPlayerInput = () => {
        if (State.playerInput && typeof State.playerInput === 'object' && 'value' in State.playerInput) {
            State.playerInput.value = '';
        }
    };

    const resolveSkillCheckBranch = (success, skillName, pending, opts = {}) => {
        const r = ensureRunner();

        // KP: release plot gated behind 判定 only after engine check resolves.
        flushDeferredNarrative();

        if (pending?.pendingCombat) {
            const level = (opts.rollMeta && opts.rollMeta.level)
                || (success ? '成功' : '失败');
            applyEffects({
                combat: Object.assign({}, pending.pendingCombat, {
                    pendingRoll: false,
                    _resolvePending: true,
                    preRolledAttack: {
                        success: !!success,
                        level,
                        rolledValue: opts.rollMeta && opts.rollMeta.rolledValue,
                        targetValue: opts.rollMeta && opts.rollMeta.targetValue
                    }
                })
            }, pending.target);
            replayCurrentChoices({ silent: true });
            return true;
        }

        if (pending?.nextNode) {
            let destId = pending.nextNode;
            if (success && pending.falseLead) {
                if (pending.falseNext) destId = pending.falseNext;
                pushSystem('📓 线索似乎对上了——但有些细节总在记忆边缘滑开。', { isLocalOnly: true });
                if (typeof addClue === 'function') {
                    const suspicious = addClue(
                        'false_lead_' + String(pending.fromChoice || destId || 'x'),
                        '可疑笔记',
                        '一条对得上却总觉得不对的线索——稍后也许能揭穿。',
                        'testimony'
                    );
                    if (suspicious) {
                        suspicious.quality = 'partial';
                        suspicious.status = 'investigating';
                        suspicious.meta = { falseLead: true };
                    }
                    markCapability('假线索');
                }
            }
            if (!success && pending.falseLead) {
                if (pending.fromChoice) {
                    r.spentChoiceIds = [...(r.spentChoiceIds || []), pending.fromChoice];
                }
                pushSystem(`【${skillName}】检定失败。假线索也没听清——可另选行动。`);
                replayCurrentChoices({ silent: true });
                return true;
            }
            const branchNode = getNode(destId);
            if (branchNode) {
                if (branchNode.branch) {
                    // Check emitted by landing on the node: its narrative/effects already ran in goToNode.
                    const landed = !!(pending && pending.landedOn && pending.landedOn === destId);
                    const soloPick = [{
                        charName: resolveDefaultCheckTarget(),
                        skill: skillName,
                        success,
                        option: { label: pending.fromChoice || '行动' }
                    }];
                    const soloOutcome = computeGroupSkillOutcome(soloPick, 'any');
                    const groupNarrative = branchNode.groupOutcome
                        ? buildGroupSkillNarrative(soloPick, branchNode, soloOutcome)
                        : '';
                    if (groupNarrative && !opts.afterGroupNarrative) {
                        // Some outcome texts are the node narrative verbatim (tutorial attic.allSuccess);
                        // after a landing that narrative is already on screen.
                        const alreadyShown = landed
                            && groupNarrative.trim() === String(branchNode.narrative || '').trim();
                        if (!alreadyShown) pushKp(groupNarrative);
                        if (branchNode.effects && !landed) applyEffects(branchNode.effects);
                        resolveBranch(branchNode, success, { skipLandingNarrative: true });
                        return true;
                    }
                    if (branchNode.narrative && !landed && !shouldSkipBranchSetupNarrative(branchNode, opts)) {
                        pushKp(branchNode.narrative);
                    }
                    if (branchNode.effects && !landed) applyEffects(branchNode.effects);
                    resolveBranch(branchNode, success);
                    return true;
                }
                if (!success && shouldStayOnCheckFailure(branchNode)) {
                    if (pending.fromChoice) {
                        r.spentChoiceIds = [...(r.spentChoiceIds || []), pending.fromChoice];
                    }
                    if (pending.isPush) {
                        r.spentChoiceIds = [...(r.spentChoiceIds || []), `push:${pending.fromChoice}`];
                        r.pushOffer = null;
                    } else if (typeof Engine.isPushableSkill === 'function' && Engine.isPushableSkill(skillName)) {
                        r.pushOffer = {
                            fromChoice: pending.fromChoice,
                            skill: skillName,
                            nextNode: pending.nextNode,
                            nodeId: r.currentNodeId
                        };
                    } else {
                        r.pushOffer = null;
                    }
                    pushSystem(`【${skillName}】检定失败。不可在同一情形下免费重掷；可推动则出现孤注一掷选项。`);
                    replayCurrentChoices({ silent: true });
                    return true;
                }
                if (branchNode.narrative) pushKp(branchNode.narrative);
                if (branchNode.effects) applyEffects(branchNode.effects);
                if (branchNode.end) {
                    r.currentNodeId = destId;
                    r.ended = true;
                    r.choices = [];
                    gameState._preEndUnlocked = ((gameState.arcLedger && gameState.arcLedger.chapters && gameState.arcLedger.chapters.unlocked) || []).slice();
                    exportArcLedger(gameState, { scenarioId: r.scenarioId, endingKey: destId });
                    pushEndingRecap(gameState, destId);
                    pushSystem('📜 [本地剧本] 本段剧情已结束。');
                    return true;
                }
                goToNode(destId);
                return true;
            }
        }

        const node = getNode(r.currentNodeId);
        if (node?.branch) {
            resolveBranch(node, success);
            return true;
        }

        pushSystem(`【${skillName}】检定${success ? '成功' : '失败'}。`);
        if (replayCurrentChoices({ silent: true })) return true;
        if (r.currentNodeId && goToNode(r.currentNodeId)) return true;
        return true;
    };

    const groupCheckHooks = () => ({
        pushSystem,
        pushKp,
        scrollToBottom,
        applyEffects,
        checkRequires,
        getNode,
        resolveBranch,
        addClue,
        clearPendingBranch: () => { ensureRunner().pendingBranch = null; },
        queueSkillCheckFn: (cfg) => emitSkillCheckRequest(cfg, getNode(ensureRunner().currentNodeId)),
        goToNode,
        replayChoices: replayCurrentChoices,
        getSplitEndPolicy: () => getScenario()?.splitEndPolicy || 'any',
        onForcedComplete: (groupSuccess, skill, pendingBranch, branchNodeId) => {
            const pending = {
                ...(pendingBranch || {}),
                nextNode: branchNodeId || pendingBranch?.nextNode
            };
            resolveSkillCheckBranch(groupSuccess, skill, pending, { afterGroupNarrative: true });
        }
    });

    const buildChoiceMenuForChar = (char) => {
        const r = ensureRunner();
        return buildScenarioChoiceMenu(r.choices, char, { checkRequires, Engine });
    };

    const setGroupChoiceMenuGroup = (groupId) => {
        const session = gameState.groupCheckSession;
        if (session?.mode === 'choice') session.menuGroupId = groupId || null;
    };

    const applyGroupCharChoice = (option) => GroupCheck.applyCharChoice(gameState, option, groupCheckHooks());

    const onSkillCheckResult = (success, skillName, rollMeta) => {
        const r = ensureRunner();
        if (!r.active) return false;

        if (rollMeta && rollMeta.level) {
            gameState._lastScenarioCheckLevel = rollMeta.level;
        } else if (success) {
            gameState._lastScenarioCheckLevel = '成功';
        } else {
            gameState._lastScenarioCheckLevel = '失败';
        }

        if (rollMeta && GroupCheck.handleGroupRollResult(gameState, rollMeta, groupCheckHooks())) {
            return true;
        }
        // Multi-investigator session still active — never solo-resolve branch mid-queue.
        const session = gameState.groupCheckSession;
        if (session?.mode === 'choice' && (session.pendingRoll || session.queue?.length)) {
            return true;
        }
        if (session?.mode === 'forced' && session.queue?.length) {
            return true;
        }

        const pending = r.pendingBranch;
        r.pendingBranch = null;
        return resolveSkillCheckBranch(success, skillName, pending, { rollMeta });
    };

    const isSkillCheckMessage = (msg) => !!(msg && msg._scenarioCheck);

    const isActive = () => {
        const r = ensureRunner();
        return !!(r.active && !r.ended);
    };

    const getModeLabel = () => {
        const r = ensureRunner();
        if (!r.active) return null;
        return r.ended ? `📜 本地剧本·已完结「${r.scenarioTitle}」` : `📜 本地剧本「${r.scenarioTitle}」`;
    };

    return {
        startScenario,
        stopScenario,
        switchToOnlineMode,
        selectChoice,
        applyGroupCharChoice,
        handleInput,
        onSkillCheckResult,
        isSkillCheckMessage,
        isActive,
        getModeLabel,
        goToNode,
        getScenario,
        ensureRunner,
        replayCurrentChoices,
        bindScenarioStore,
        buildChoiceMenuForChar,
        setGroupChoiceMenuGroup,
        checkRequires
    };
})((function () {
    // Window-first so Node smokes can mock CoCStateAccessor/CoCEngine before dynamic import.
    try {
        const Acc = (typeof window !== 'undefined' && window.CoCStateAccessor) || CoCStateAccessor;
        return Acc.getState();
    } catch (_e) {
        return null;
    }
})(), (typeof window !== 'undefined' && window.CoCEngine) || CoCEngine, CoCScenarioStore);
