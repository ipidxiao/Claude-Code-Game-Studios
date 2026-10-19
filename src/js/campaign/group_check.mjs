/**

 * Multi-investigator skill check orchestration.

 * - forced: same skill, each active investigator rolls in sequence

 * - choice: each investigator picks from scenario node choices (skill L1 → action L2)

 */



import {

    buildScenarioChoiceMenu,

    getMenuSubOptions,

    mapScenarioChoice

} from '../scenario/choice_menu.mjs';

import { pickClueQualityBranch } from '../data/investigate_outcomes.mjs';
import { markExplored } from '../state/visibility.mjs';
import { resolveInvId } from '../state/char_record.mjs';

import {
    computeGroupSkillOutcome,

    buildGroupSkillNarrative,

    shouldSkipBranchSetupNarrative,

    buildGroupSplitActionNarrative,

    resolveSkillAggregate,

    mapForcedResultsToSkillPicks,

} from '../scenario/group_outcome.mjs';



export function getActiveInvestigators(gameState) {

    if (!gameState || !Array.isArray(gameState.roster)) return [];

    return gameState.roster.filter((c) => c && c.isActive);

}



export function clearGroupCheckSession(gameState) {

    if (gameState) gameState.groupCheckSession = null;

}



function ensureSession(gameState) {

    return gameState?.groupCheckSession || null;

}



/** Scenario node choices for one investigator (split-path or unified session). */

function getNodeChoicesForChar(session, charName, hooks) {

    if (session?.splitPaths && session.charNodes?.[charName] && hooks?.getNode) {

        const node = hooks.getNode(session.charNodes[charName]);

        if (node?.choices?.length) return node.choices;

    }

    return session?.scenarioChoices || [];

}



function isOptionAllowedForChar(session, charName, scenarioOption, hooks) {

    const source = getNodeChoicesForChar(session, charName, hooks);

    if (!source?.length || !scenarioOption?.id) return false;

    return source.some((c) => c.id === scenarioOption.id);

}



function resolveSplitEndPolicy(gameState, hooks) {

    return hooks?.getSplitEndPolicy?.()

        || gameState?.scenarioRunner?.splitEndPolicy

        || 'any';

}



/** Update header map/location to the investigator currently choosing (split paths). */

export function syncSplitDisplayLocation(gameState) {

    const session = gameState?.groupCheckSession;

    if (!session?.splitPaths || !session.charLocations) return;

    const activeName = session.queue?.[0];

    const entry = activeName && session.charLocations[activeName];

    if (!entry) return;

    if (entry.location) gameState.currentLocation = entry.location;

    if (entry.mapRoom && gameState.sceneMap?.rooms?.length) {

        const room = gameState.sceneMap.rooms.find((rm) => rm.id === entry.mapRoom);

        if (room) {

            gameState.sceneMap.rooms.forEach((rm) => {

                if (rm.status === 'current' && rm.id !== room.id) rm.status = 'explored';

            });

            room.status = 'current';
            // Split paths: only the investigator whose turn this is stands in the room.
            const movingInvId = resolveInvId(activeName, gameState.roster);
            if (movingInvId) markExplored(gameState, room.id, [movingInvId]);

            gameState.sceneMap.currentRoomId = room.id;

            if (room.name) gameState.currentLocation = room.name;
            if (!Array.isArray(gameState.knownLocations)) gameState.knownLocations = [];
            if (room.name && !gameState.knownLocations.includes(room.name)) {
                gameState.knownLocations.push(room.name);
            }

        }

    }

}



function seedCharLocationsFromNodes(gameState, charNodes, hooks) {

    const session = ensureSession(gameState);

    if (!session) return;

    session.charLocations = session.charLocations || {};

    const fallbackLoc = gameState.currentLocation;

    const fallbackRoom = gameState.sceneMap?.currentRoomId;

    for (const [charName, nodeId] of Object.entries(charNodes || {})) {

        const node = hooks?.getNode?.(nodeId);

        const existing = session.charLocations[charName] || {};

        session.charLocations[charName] = {

            location: existing.location || node?.effects?.location || fallbackLoc,

            mapRoom: existing.mapRoom || node?.effects?.mapRoom || fallbackRoom,

        };

    }

    syncSplitDisplayLocation(gameState);

}



export function getSplitLocationSummary(gameState) {

    const session = gameState?.groupCheckSession;

    if (!session?.splitPaths || !session.charLocations) return null;

    const active = getActiveInvestigators(gameState);

    const parts = active.map((c) => {

        const loc = session.charLocations[c.name]?.location || '未知';

        return `${c.name}·${loc}`;

    }).filter(Boolean);

    return parts.length ? parts.join(' / ') : null;

}



function applyFalseLeadSuccess(p, hooks) {

    if (!p?.option?.falseLead || !p.success) return null;

    hooks?.pushSystem?.('📓 线索似乎对上了——但有些细节总在记忆边缘滑开。', { isLocalOnly: true });

    if (typeof hooks?.addClue === 'function') {

        const suspicious = hooks.addClue(

            'false_lead_' + String(p.option.id || p.option.next || 'x'),

            '可疑笔记',

            '一条对得上却总觉得不对的线索——稍后也许能揭穿。',

            'testimony'

        );

        if (suspicious) {

            suspicious.quality = 'partial';

            suspicious.status = 'investigating';

            suspicious.meta = { falseLead: true };

        }

    }

    return p.option.falseNext || p.option.next || null;

}



function resolveFalseLeadDest(p) {

    if (p?.option?.falseLead && p.success && p.option.falseNext) return p.option.falseNext;

    return p?.option?.next || null;

}



function resolveSingleSkillBranchPick(p, hooks) {

    if (p?.option?.falseLead && !p.success) {

        hooks?.pushSystem?.('【检定失败】假线索也没听清——可另选行动。', { isLocalOnly: true });

        return null;

    }

    const falseDest = applyFalseLeadSuccess(p, hooks);

    if (falseDest) return falseDest;

    const node = hooks?.getNode?.(p.option.next);

    if (!node?.branch) return p.option.next;

    const outcome = computeGroupSkillOutcome([p], 'any');

    const groupNarrative = buildGroupSkillNarrative([p], node, outcome);

    if (groupNarrative) {

        hooks?.pushKp?.(groupNarrative);

    } else if (node.narrative) {

        hooks?.pushKp?.(`${p.charName}：${node.narrative}`);

    } else {

        const skill = p.skill || '检定';

        const action = p.option?.label || '行动';

        if (p.success) {

            hooks?.pushKp?.(`${p.charName}完成「${action}」，【${skill}】检定成功——局势暂时向你们倾斜。`);

        } else {

            hooks?.pushKp?.(`${p.charName}尝试「${action}」，【${skill}】失手——代价立刻写在眼前。`);

        }

    }

    const nextId = p.success

        ? (node.branch.success || node.branch.onSuccess)

        : (node.branch.failure || node.branch.onFailure);

    const target = hooks?.getNode?.(nextId);

    if (target?.effects && hooks?.applyEffects) hooks.applyEffects(target.effects, p.charName);

    if (target?.narrative) hooks?.pushKp?.(`${p.charName}：${target.narrative}`);

    return nextId || p.option.next;

}



export function startSplitChoiceSession(gameState, charNodes, hooks, charLocations = null) {

    resolveScenarioCheckMessages(gameState);

    const active = getActiveInvestigators(gameState);

    const prevLocs = charLocations || gameState.groupCheckSession?.charLocations || null;

    const nodeKeys = Object.keys(charNodes || {}).filter((n) => n && charNodes[n]);

    const queueNames = nodeKeys.length

        ? active.map((c) => c.name).filter((n) => nodeKeys.includes(n))

        : active.map((c) => c.name);

    gameState.groupCheckSession = {

        mode: 'choice',

        splitPaths: true,

        charNodes: { ...charNodes },

        charLocations: prevLocs ? { ...prevLocs } : {},

        queue: queueNames,

        totalCount: queueNames.length,

        picks: [],

        pendingRoll: null,

        menuGroupId: null,

        scenarioChoices: [],

        nodeId: null,

    };

    seedCharLocationsFromNodes(gameState, charNodes, hooks);

    hooks?.pushSystem?.('👥 分头行动中：每名调查员请根据当前所处位置选择行动。', { isLocalOnly: true });

}



function setChoiceMenuGroup(gameState, groupId) {

    const session = ensureSession(gameState);

    if (session?.mode === 'choice') session.menuGroupId = groupId || null;

}



export function getChoicePanel(gameState, hooks = {}) {

    const session = ensureSession(gameState);

    if (!session || session.mode !== 'choice' || !session.queue?.length) return null;

    if (session.pendingRoll) return null;



    const charName = session.queue[0];

    const char = (gameState.roster || []).find((c) => c && c.name === charName);

    if (!char) return null;



    const choiceSource = getNodeChoicesForChar(session, charName, hooks);

    const menu = buildScenarioChoiceMenu(choiceSource, char, {

        checkRequires: hooks.checkRequires,

        Engine: hooks.Engine

    });



    const total = session.totalCount || session.queue.length + (session.picks?.length || 0);

    const index = total - session.queue.length + 1;



    return {

        charName,

        char,

        menu,

        menuGroupId: session.menuGroupId || null,

        subOptions: getMenuSubOptions(menu, session.menuGroupId),

        index,

        total

    };

}



export function getForcedRollTarget(gameState) {

    const session = ensureSession(gameState);

    if (!session || session.mode !== 'forced' || !session.queue?.length) return null;

    return session.queue[0];

}



export function getForcedProgress(gameState) {

    const session = ensureSession(gameState);

    if (!session || session.mode !== 'forced') return null;

    const done = session.results?.length || 0;

    const total = done + (session.queue?.length || 0);

    return { done, total, current: session.queue[0] || null, skill: session.skill };

}



export function getGroupChoicePendingRoll(gameState) {

    const session = ensureSession(gameState);

    if (session?.mode !== 'choice' || !session.pendingRoll) return null;

    return session.pendingRoll;

}



/** Mark matching scenario skill-check assistant messages as resolved (prevents UI stall). */

export function resolveScenarioCheckMessages(gameState, charName, skillName) {

    const history = gameState?.chatHistory;

    if (!Array.isArray(history)) return;

    for (let i = history.length - 1; i >= 0; i--) {

        const msg = history[i];

        if (!msg?._scenarioCheck || !msg.tool_calls || msg.isResolved) continue;

        for (const tool of msg.tool_calls) {

            if (!tool || tool.isResolved) continue;

            const fn = tool.function?.name;

            if (fn !== 'request_skill_check' && fn !== 'push_skill_check') continue;

            const matchTarget = !charName || tool.target_name === charName;

            const matchSkill = !skillName || tool.skill_name === skillName;

            if (matchTarget && matchSkill) {

                tool.isResolved = true;

                if (msg.tool_calls.every((t) => t && t.isResolved)) msg.isResolved = true;

                if (charName || skillName) return;

            }

        }

    }

}



export function startForcedSession(gameState, config, queueSkillCheckFn) {

    const active = getActiveInvestigators(gameState);

    if (active.length <= 1) return false;



    const skill = config.skill || '侦查';

    gameState.groupCheckSession = {

        mode: 'forced',

        skill,

        queue: active.map((c) => c.name),

        results: [],

        aggregate: config.aggregate || 'any',

        pendingBranch: config.pendingBranch || null,

        branchNodeId: config.branchNodeId || null,

        choiceLabel: config.choiceLabel || null,

        queueSkillCheckFn

    };



    queueNextForcedRoll(gameState);

    return true;

}



function queueNextForcedRoll(gameState) {

    const session = ensureSession(gameState);

    if (!session || session.mode !== 'forced' || !session.queueSkillCheckFn) return;

    const target = session.queue[0];

    if (!target) return;

    session.queueSkillCheckFn({

        skill: session.skill,

        target_name: target,

        mode: 'single',

        groupCheck: true

    });

}



export function startChoiceSession(gameState, config) {

    resolveScenarioCheckMessages(gameState);

    const active = getActiveInvestigators(gameState);

    if (active.length <= 1) return false;



    gameState.groupCheckSession = {

        mode: 'choice',

        scenarioChoices: config.scenarioChoices || [],

        nodeId: config.nodeId || null,

        queue: active.map((c) => c.name),

        totalCount: active.length,

        picks: [],

        pendingRoll: null,

        menuGroupId: null

    };

    return true;

}



/** Build action-wheel payload for current group-choice investigator. */

export function getGroupWheelContext(gameState, hooks = {}) {

    const session = ensureSession(gameState);

    if (!session || session.mode !== 'choice' || !session.queue?.length) return null;

    if (session.pendingRoll) return null;



    const panel = getChoicePanel(gameState, hooks);

    const charName = session.queue[0];

    const char = (gameState.roster || []).find((c) => c && c.name === charName);

    let actions = panel?.menu?.available || [];



    if (!actions.length && char && session.scenarioChoices?.length) {

        const choiceSource = getNodeChoicesForChar(session, charName, hooks);

        const menu = buildScenarioChoiceMenu(choiceSource, char, {

            checkRequires: hooks.checkRequires,

            Engine: hooks.Engine,

        });

        actions = menu.available || [];

    }



    if (!actions.length) {

        const choiceSource = getNodeChoicesForChar(session, charName, hooks);

        if (choiceSource.length) actions = choiceSource.map((c) => mapScenarioChoice(c));

    }



    if (!actions.length) return null;



    const total = session.totalCount || session.queue.length + (session.picks?.length || 0);

    const index = total - session.queue.length + 1;



    return {

        title: panel ? `${panel.charName} 的行动（${panel.index}/${panel.total}）` : `${charName} 的行动（${index}/${total}）`,

        actions,

        charName,

        mode: 'group',

    };

}



export function applyCharChoice(gameState, option, hooks) {

    const session = ensureSession(gameState);

    if (!session || session.mode !== 'choice' || !session.queue?.length || session.pendingRoll) return false;



    const charName = session.queue[0];

    const char = (gameState.roster || []).find((c) => c && c.name === charName);

    if (!char) return false;



    const scenarioOption = option.kind === 'scenario' ? option : mapScenarioChoice(option);

    if (scenarioOption.requiresFlag && hooks?.checkRequires && !hooks.checkRequires(scenarioOption)) {

        return false;

    }

    if (!isOptionAllowedForChar(session, charName, scenarioOption, hooks)) {

        hooks?.pushSystem?.(`⚠️ [${charName}] 当前位置无法选择该行动。`, { isLocalOnly: true, isAlert: true });

        return false;

    }



    hooks?.pushSystem?.(`▸ [${charName}] ${scenarioOption.label}`, { isLocalOnly: true });

    if (scenarioOption.effects && hooks?.applyEffects) hooks.applyEffects(scenarioOption.effects, charName);

    if (scenarioOption.branchByClueQuality) {
        const clues = gameState.clueBoard?.clues || [];
        const picked = pickClueQualityBranch(scenarioOption.branchByClueQuality, clues);
        if (picked) {
            if (picked.effects && hooks?.applyEffects) hooks.applyEffects(picked.effects, charName);
            if (picked.next) scenarioOption.next = picked.next;
        }
    }



    const skill = scenarioOption.skillCheck?.skill || scenarioOption.skillCheck?.skill_name || null;

    const needsRoll = !!(skill && scenarioOption.skillCheck);



    if (needsRoll) {

        session.pendingRoll = { charName, option: scenarioOption, skill };

        session.activeRollOption = scenarioOption;

        session.queueSkillCheckFn = hooks.queueSkillCheckFn;

        hooks.queueSkillCheckFn({

            skill,

            target_name: charName,

            mode: 'single',

            groupCheck: true,

            choiceOption: scenarioOption

        });

        return true;

    }



    session.picks.push({ charName, option: scenarioOption, success: true, skill: null });

    session.queue.shift();

    session.menuGroupId = null;

    return advanceChoiceSession(gameState, hooks);

}



function advanceChoiceSession(gameState, hooks) {

    const session = ensureSession(gameState);

    if (!session || session.mode !== 'choice') return false;



    if (session.queue.length > 0) {

        session.menuGroupId = null;

        syncSplitDisplayLocation(gameState);

        hooks?.pushSystem?.(`👥 请下一名调查员选择行动（剩余 ${session.queue.length} 人）`, { isLocalOnly: true });

        hooks?.scrollToBottom?.();

        return true;

    }



    return finishChoiceSession(gameState, hooks);

}



function finishChoiceSession(gameState, hooks) {

    const session = ensureSession(gameState);

    if (!session) return false;



    const picks = session.picks || [];

    const lines = picks.map((p) => {

        const ok = p.success ? '成功' : '失败';

        const sk = p.skill ? `【${p.skill}】` : '';

        return `${p.charName}：${p.option.label}${sk ? ` ${sk}${ok}` : ''}`;

    });

    if (lines.length) {

        hooks?.pushSystem?.(`👥 [小队行动汇总]\n${lines.join('\n')}`, { isLocalOnly: true });

    }



    const splitNarrative = buildGroupSplitActionNarrative(picks);

    if (splitNarrative) hooks?.pushKp?.(splitNarrative);



    const skillPicks = picks.filter((p) => p.skill && p.option?.next);

    const navigable = picks.filter((p) => p.option?.next);

    const uniqueNext = new Set(navigable.map((p) => p.option.next));

    const splitNextIds = uniqueNext.size > 1 ? new Set(navigable.map((p) => p.option?.next).filter(Boolean)) : null;

    const skillPickIds = new Set(skillPicks.map((p) => `${p.charName}:${p.option?.id}`));



    if (uniqueNext.size > 1) {

        session.splitPaths = true;

        session.charLocations = session.charLocations || {};

        for (const p of navigable) {

            if (skillPickIds.has(`${p.charName}:${p.option?.id}`)) continue;

            const sideNode = hooks?.getNode?.(p.option.next);

            if (sideNode?.skipSplitSide) continue;

            if (p.option?.effects && hooks?.applyEffects) hooks.applyEffects(p.option.effects, p.charName);

            if (sideNode?.effects && hooks?.applyEffects) hooks.applyEffects(sideNode.effects, p.charName);

            if (sideNode?.narrative && sideNode.id !== 'arrival') {

                hooks?.pushKp?.(`${p.charName}：${sideNode.narrative}`);

            }

        }

    }



    if (uniqueNext.size > 1) {

        const charNodes = {};

        for (const p of picks) {

            const nextId = p.option?.next;

            if (!nextId) continue;

            const node = hooks?.getNode?.(nextId);

            if (p.option?.falseLead && !p.success) {

                continue;

            }

            if (p.option?.falseLead && p.success) {

                charNodes[p.charName] = applyFalseLeadSuccess(p, hooks) || nextId;

            } else if (p.skill && node?.branch) {

                charNodes[p.charName] = resolveSingleSkillBranchPick(p, hooks);

            } else {

                charNodes[p.charName] = nextId;

            }

        }

        const savedCharLocations = { ...(session.charLocations || {}) };

        const endPolicy = resolveSplitEndPolicy(gameState, hooks);

        const pickNames = picks.map((p) => p.charName).filter(Boolean);

        const endedNames = pickNames.filter((name) => hooks?.getNode?.(charNodes[name])?.end);

        const shouldEnd = endPolicy === 'all'

            ? endedNames.length > 0 && endedNames.length === pickNames.length

            : endedNames.length > 0;

        if (shouldEnd && hooks?.goToNode) {

            const endNodeId = charNodes[endedNames[0]] || Object.values(charNodes).find((id) => hooks?.getNode?.(id)?.end);

            clearGroupCheckSession(gameState);

            hooks?.clearPendingBranch?.();

            hooks.goToNode(endNodeId, { skipNarrative: true });

            hooks?.scrollToBottom?.();

            return true;

        }

        clearGroupCheckSession(gameState);

        hooks?.clearPendingBranch?.();

        const uniqueNodes = new Set(Object.values(charNodes));

        if (uniqueNodes.size === 1 && hooks?.goToNode) {

            const nodeId = [...uniqueNodes][0];

            hooks.goToNode(nodeId, { skipNarrative: true });

            hooks?.scrollToBottom?.();

            return true;

        }

        startSplitChoiceSession(gameState, charNodes, hooks, savedCharLocations);

        hooks?.scrollToBottom?.();

        return true;

    }



    clearGroupCheckSession(gameState);

    hooks?.clearPendingBranch?.();



    const skillActor = skillPicks.find((p) => p.success)?.charName || skillPicks[0]?.charName || null;

    if (skillActor) gameState._scenarioEffectActor = skillActor;



    try {

    if (skillPicks.length > 0) {

        const falseFail = skillPicks.some((p) => p.option?.falseLead && !p.success);

        const falseOk = skillPicks.filter((p) => p.option?.falseLead && p.success);

        if (falseFail && !falseOk.length) {

            if (hooks?.replayChoices) hooks.replayChoices({ silent: true });

            hooks?.scrollToBottom?.();

            return true;

        }

        falseOk.forEach((p) => applyFalseLeadSuccess(p, hooks));

        const nextNode = pickPlurality(skillPicks.map((p) => resolveFalseLeadDest(p) || p.option.next));

        const aggregate = resolveSkillAggregate(skillPicks);

        const outcome = computeGroupSkillOutcome(skillPicks, aggregate);

        const node = hooks?.getNode?.(nextNode);

        const groupNarrative = buildGroupSkillNarrative(skillPicks, node, outcome);

        if (groupNarrative) {

            hooks?.pushKp?.(groupNarrative);

        } else if (node?.narrative) {

            hooks?.pushKp?.(node.narrative);

        }



        if (node) {

            if (node.effects) hooks.applyEffects(node.effects);

            if (node.branch) {

                hooks.resolveBranch(node, outcome.pass);

                hooks?.scrollToBottom?.();

                return true;

            }

        }

        if (nextNode && hooks?.goToNode) {

            hooks.goToNode(nextNode);

            hooks?.scrollToBottom?.();

            return true;

        }

    }



    const nextNode = pickNavigationTarget(navigable, skillPicks, hooks?.getNode);

    if (nextNode && hooks?.goToNode) {

        const node = hooks?.getNode?.(nextNode);

        const skipNarrative = splitNextIds?.has(nextNode);

        if (node?.branch && !node?.choices?.length) {

            const branchPick = navigable.find((p) => p.option?.next === nextNode);

            const pass = branchPick ? !!branchPick.success : true;

            hooks.resolveBranch(node, pass);

        } else {

            hooks.goToNode(nextNode, skipNarrative ? { skipNarrative: true } : undefined);

        }

        hooks?.scrollToBottom?.();

        return true;

    }

    if (hooks?.replayChoices) hooks.replayChoices();

    hooks?.scrollToBottom?.();

    return true;

    } finally {

        delete gameState._scenarioEffectActor;

    }

}



function pickPlurality(items) {

    if (!items.length) return null;

    const counts = new Map();

    for (const id of items) counts.set(id, (counts.get(id) || 0) + 1);

    let best = null;

    let bestN = 0;

    for (const [id, n] of counts) {

        if (n > bestN) { best = id; bestN = n; }

    }

    return best;

}



/** Prefer nodes with choices/end; skip branch-only targets unless skill outcome will resolve them. */

function pickNavigationTarget(navigable, skillPicks, getNode) {

    if (skillPicks?.length) {

        return pickPlurality(skillPicks.map((p) => p.option.next));

    }

    const nextIds = navigable.map((p) => p.option?.next).filter(Boolean);

    if (!nextIds.length) return null;



    const ready = nextIds.filter((id) => {

        const n = getNode?.(id);

        return n && (n.choices?.length || n.end || !n.branch);

    });

    if (ready.length) return pickPlurality(ready);



    return pickPlurality(nextIds);

}



/**

 * Called after a single roll completes while groupCheckSession is active.

 * Returns true if consumed (caller should skip default branch handling).

 */

export function handleGroupRollResult(gameState, rollResult, hooks) {

    const session = ensureSession(gameState);

    if (!session) return false;



    const { charName, skill, success, level, rolledValue, targetValue } = rollResult;



    if (session.mode === 'forced') {

        session.results.push({ charName, skill, success, level, rolledValue, targetValue });

        if (session.queue[0] === charName) session.queue.shift();



        if (session.queue.length > 0) {

            resolveScenarioCheckMessages(gameState, charName, skill);

            hooks?.pushSystem?.(`⏭ 下一名调查员进行【${session.skill}】检定（${session.results.length + 1}/${session.results.length + session.queue.length}）`, { isLocalOnly: true });

            queueNextForcedRoll(gameState);

            hooks?.scrollToBottom?.();

            return true;

        }



        resolveScenarioCheckMessages(gameState, null, skill);



        const aggregate = session.aggregate || 'any';

        const pendingBranch = session.pendingBranch;

        const branchNodeId = session.branchNodeId;



        const summary = session.results

            .map((r) => `${r.charName}：${r.level}（${r.rolledValue}/${r.targetValue}）`)

            .join('；');

        hooks?.pushSystem?.(`👥 [强制检定·${session.skill}] ${summary}`, { isLocalOnly: true });



        // Prefer the check node (branchNodeId); fall back if it lacks groupOutcome.
        let branchNode = hooks?.getNode?.(branchNodeId) || null;
        const pendingNode = hooks?.getNode?.(pendingBranch?.nextNode) || null;
        if (!branchNode?.groupOutcome && pendingNode?.groupOutcome) branchNode = pendingNode;
        if (!branchNode) branchNode = pendingNode;

        const forcedPicks = mapForcedResultsToSkillPicks(session.results, session.skill, session.choiceLabel);

        const forcedOutcome = computeGroupSkillOutcome(forcedPicks, aggregate);

        const forcedNarrative = buildGroupSkillNarrative(forcedPicks, branchNode, forcedOutcome);

        if (forcedNarrative) hooks?.pushKp?.(forcedNarrative);



        clearGroupCheckSession(gameState);

        hooks?.clearPendingBranch?.();



        if (hooks?.onForcedComplete) {

            hooks.onForcedComplete(forcedOutcome.pass, session.skill, pendingBranch, branchNodeId);

        }

        return true;

    }



    if (session.mode === 'choice') {

        let pending = session.pendingRoll;

        if (!pending && rollResult?.charName && session.queue?.[0] === rollResult.charName && session.activeRollOption) {

            pending = {

                charName: rollResult.charName,

                option: session.activeRollOption,

                skill: rollResult.skill || session.activeRollOption.skillCheck?.skill

            };

        }

        if (!pending) return false;



        session.picks.push({

            charName: pending.charName,

            option: pending.option,

            skill: pending.skill,

            success,

            level,

            rolledValue,

            targetValue

        });

        session.pendingRoll = null;

        session.activeRollOption = null;

        resolveScenarioCheckMessages(gameState, pending.charName, pending.skill);

        hooks?.clearPendingBranch?.();

        if (session.queue[0] === pending.charName) session.queue.shift();

        session.menuGroupId = null;

        advanceChoiceSession(gameState, hooks);

        return true;

    }



    return false;

}



export const CoCGroupCheck = {

    getActiveInvestigators,

    clearGroupCheckSession,

    setChoiceMenuGroup,

    getChoicePanel,

    getForcedRollTarget,

    getForcedProgress,

    getGroupChoicePendingRoll,

    resolveScenarioCheckMessages,

    getGroupWheelContext,

    startForcedSession,

    startChoiceSession,

    startSplitChoiceSession,

    syncSplitDisplayLocation,

    getSplitLocationSummary,

    applyCharChoice,

    handleGroupRollResult

};
