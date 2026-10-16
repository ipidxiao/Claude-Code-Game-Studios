/**
 * Post-combat aftermath queue — structured follow-ups, no free HP/SAN writes.
 */

import { getKeeperStyle } from '../data/keeper_style.mjs';
import { setPressureFlag } from './pressure_bus.mjs';
import { resolveSelectedActiveChar } from './selection.mjs';
import { enqueueRuleCheck } from './rule_check.mjs';

const SAN_AFTERSHOCK_THRESHOLD = 5;

export { SAN_AFTERSHOCK_THRESHOLD };

export function sanAftershockThreshold(gameState) {
    const styleId = (gameState && gameState.keeperStyle) || 'cinematic';
    const style = getKeeperStyle(styleId);
    const d = style && style.density;
    if (d && Number.isFinite(Number(d.sanAftershockThreshold))) {
        return Number(d.sanAftershockThreshold);
    }
    return SAN_AFTERSHOCK_THRESHOLD;
}

function setFlag(gameState, key) {
    // Wave B: route flag writes through PressureBus (no HP/SAN).
    setPressureFlag(gameState, key, true);
}

function pushJournal(gameState, text) {
    if (text && gameState && gameState.chatHistory) {
        gameState.chatHistory.push({
            role: 'system', isLocalOnly: true,
            content: '📰 ' + text
        });
    }
}

export function collectAftermathItems(gameState, opts) {
    const o = opts || {};
    const items = [];
    const roster = (gameState && gameState.roster) || [];
    roster.forEach((c) => {
        if (!c) return;
        const st = c.status || {};
        if (st.hasMajorWound || st.majorWound || st.major_wound || st.dying || st.isDying) {
            items.push({
                kind: 'wound_recovery',
                roller: c.name,
                target: c.name,
                skill: '体质',
                prompt: `【战后·重伤】${c.name} 请进行体质检定以稳定伤势。`
            });
        }
    });
    const sanLost = Number(o.combatSanLoss != null
        ? o.combatSanLoss
        : (gameState && gameState.combat && gameState.combat.sanLostThisFight));
    const sanNeed = sanAftershockThreshold(gameState);
    if (Number.isFinite(sanLost) && sanLost >= sanNeed) {
        const first = resolveSelectedActiveChar(gameState) || roster.find((c) => c && c.isActive) || roster[0];
        if (first) {
            items.push({
                kind: 'san_aftershock',
                roller: first.name,
                target: first.name,
                skill: '理智',
                prompt: `【战后·余震】本场理智损失 ${sanLost}，${first.name} 请进行理智检定。`,
                sanCheck: '0/1'
            });
        }
    }
    const flags = (gameState && gameState.scenarioRunner && gameState.scenarioRunner.flags)
        || (gameState && gameState.flags)
        || {};
    if (flags.public_place || flags.witness_heat || o.forceWitness) {
        items.push({
            kind: 'witness_heat',
            flag: 'witness_attention',
            journal: '战后余波：公共场所冲突引起旁人注意。'
        });
    }
    if (flags.violent_public || flags.public_place || o.forceReputation) {
        items.push({
            kind: 'reputation_hit',
            flag: 'reputation_hit',
            journal: '战后余波：街头暴力损及声望。'
        });
    }
    if ((flags.witness_attention || flags.witness_heat || flags.public_place || o.forcePolice)
        && (o.repeatFight || flags.combat_again || flags.violent_public || o.forcePolice)) {
        items.push({
            kind: 'police_interest',
            flag: 'police_interest',
            journal: '战后余波：警方开始关注此地冲突。'
        });
    }
    const allyDown = roster.some((c) => {
        if (!c || !c.isNpc) return false;
        const st = c.status || {};
        const hp = (c.derived && c.derived.hp != null) ? c.derived.hp : c.hp;
        return st.dying || st.isDying || st.unconscious || st.isUnconscious || st.isDead || (Number(hp) === 0);
    });
    if (allyDown || o.forceAllyScar) {
        items.push({
            kind: 'ally_scar',
            flag: 'ally_scar',
            journal: '战后余波：同伴受伤留下印记。'
        });
    }
    return items;
}

const NON_DICE_KINDS = new Set([
    'witness_heat', 'reputation_hit', 'police_interest', 'ally_scar'
]);

function applyNonDiceAftermath(gameState, item) {
    if (!item) return;
    if (item.kind === 'witness_heat') {
        applyWitnessHeat(gameState, item);
        return;
    }
    const flag = item.flag || item.kind;
    setFlag(gameState, flag);
    pushJournal(gameState, item.journal || ('战后余波：' + flag));
}

/** Enqueue aftermath; promote first dice item into pendingRuleCheck when free. */
export function enqueueAftermath(gameState, items, Engine) {
    if (!gameState) return { queued: 0 };
    if (!Array.isArray(gameState.pendingAftermath)) gameState.pendingAftermath = [];
    const list = (items || []).filter(Boolean);
    const diceItems = [];
    list.forEach((it) => {
        if (NON_DICE_KINDS.has(it.kind)) applyNonDiceAftermath(gameState, it);
        else diceItems.push(it);
    });
    diceItems.forEach((it) => gameState.pendingAftermath.push(it));
    flushAftermathToRuleCheck(gameState, Engine);
    return { queued: list.length, pending: gameState.pendingAftermath.length };
}

/**
 * Move next dice-capable aftermath into rule-check queue.
 * Non-dice items resolve immediately.
 */
export function flushAftermathToRuleCheck(gameState, Engine) {
    if (!gameState) return null;
    if (!Array.isArray(gameState.pendingAftermath)) gameState.pendingAftermath = [];
    while (gameState.pendingAftermath.length) {
        const next = gameState.pendingAftermath[0];
        if (NON_DICE_KINDS.has(next.kind)) {
            gameState.pendingAftermath.shift();
            applyNonDiceAftermath(gameState, next);
            continue;
        }
        if (gameState.pendingRuleCheck) return next;
        gameState.pendingAftermath.shift();
        const spec = {
            kind: next.kind,
            skill: next.skill || '体质',
            roller: next.roller,
            target: next.target || next.roller,
            prompt: next.prompt,
            sanCheck: next.sanCheck
        };
        if (typeof enqueueRuleCheck === 'function') {
            enqueueRuleCheck(gameState, spec);
        } else {
            if (!gameState.pendingRuleChecks) gameState.pendingRuleChecks = [];
            if (gameState.pendingRuleCheck) gameState.pendingRuleChecks.push(spec);
            else gameState.pendingRuleCheck = spec;
            if (gameState.chatHistory) {
                gameState.chatHistory.push({
                    role: 'system', isLocalOnly: true, isAlert: true,
                    content: spec.prompt || '【战后余波】请完成后续检定。'
                });
            }
        }
        return spec;
    }
    return null;
}

function applyWitnessHeat(gameState, item) {
    setFlag(gameState, item.flag || 'witness_attention');
    pushJournal(gameState, item.journal);
}

export function buildCombatEndAftermath(gameState, opts) {
    return enqueueAftermath(gameState, collectAftermathItems(gameState, opts));
}

export const CoCAftermath = {
    collectAftermathItems,
    enqueueAftermath,
    flushAftermathToRuleCheck,
    buildCombatEndAftermath,
    SAN_AFTERSHOCK_THRESHOLD,
    sanAftershockThreshold
};

if (typeof window !== 'undefined') window.CoCAftermath = CoCAftermath;
