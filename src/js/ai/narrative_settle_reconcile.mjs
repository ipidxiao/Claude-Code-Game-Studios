/**
 * Online KP: narrative settlement claims must match tool calls this round.
 * Does not mutate HP/SAN — only signals reprompt.
 */

const COMBAT_CLAIM_RE = /损失.{0,12}(?:HP|生命|体力)|掉血|扣血|HP\s*[-−]\s*\d+|造成\s*\d+\s*点伤害|击杀|打倒了|敌人倒下|HP归零|结束了战斗|战斗结束/i;
const SAN_CLAIM_RE = /损失.{0,12}SAN|理智.{0,8}(?:损失|下降|降低)|SAN\s*[-−]\s*\d+/i;
const CHASE_CLAIM_RE = /追逐开始|开始了追逐|追上了|猎物逃脱/i;
const POISON_CLAIM_RE = /中毒/;
const GENERIC_CLAIM_RE = /损失.{0,12}(?:HP|生命|体力)|掉血|扣血|HP\s*[-−]\s*\d+|损失.{0,12}SAN|理智.{0,8}(?:损失|下降|降低)|SAN\s*[-−]\s*\d+|中毒|追逐开始|开始了追逐|造成\s*\d+\s*点伤害|击杀|打倒了|敌人倒下|追上了/i;

const COMBAT_TOOLS = new Set([
    'melee_attack', 'fire_weapon', 'burst_fire', 'enemy_attack',
    'apply_scenario_effects', 'update_character_status', 'reality_check'
]);
const SAN_TOOLS = new Set([
    'reality_check', 'apply_scenario_effects', 'cast_spell',
    'apply_enchantment', 'dispel_magic', 'update_character_status'
]);
const CHASE_TOOLS = new Set([
    'start_chase', 'chase_action', 'apply_scenario_effects'
]);
const POISON_TOOLS = new Set([
    'apply_poison', 'process_poison_tick', 'apply_disease',
    'apply_environmental_damage', 'apply_scenario_effects'
]);
const SETTLE_TOOLS = new Set([
    ...COMBAT_TOOLS, ...SAN_TOOLS, ...CHASE_TOOLS, ...POISON_TOOLS
]);

export function extractToolNames(toolCalls) {
    const names = [];
    (toolCalls || []).forEach((tc) => {
        const n = tc && tc.function && tc.function.name;
        if (n) names.push(n);
    });
    return names;
}

export function narrativeClaimsSettlement(content) {
    return GENERIC_CLAIM_RE.test(String(content || ''));
}

export function classifySettlementClaims(content) {
    const text = String(content || '');
    const kinds = [];
    if (COMBAT_CLAIM_RE.test(text)) kinds.push('combat');
    if (SAN_CLAIM_RE.test(text)) kinds.push('san');
    if (CHASE_CLAIM_RE.test(text)) kinds.push('chase');
    if (POISON_CLAIM_RE.test(text)) kinds.push('poison');
    return kinds;
}

export function hasSettlementTool(toolCalls) {
    return extractToolNames(toolCalls).some((n) => SETTLE_TOOLS.has(n));
}

function toolsForKind(kind) {
    if (kind === 'combat') return COMBAT_TOOLS;
    if (kind === 'san') return SAN_TOOLS;
    if (kind === 'chase') return CHASE_TOOLS;
    if (kind === 'poison') return POISON_TOOLS;
    return SETTLE_TOOLS;
}

export function hasMatchingSettlementTool(toolCalls, kinds) {
    const names = extractToolNames(toolCalls);
    if (!kinds.length) return names.some((n) => SETTLE_TOOLS.has(n));
    return kinds.every((kind) => {
        const allow = toolsForKind(kind);
        return names.some((n) => allow.has(n));
    });
}

export function buildSettlementRepromptBlock(kinds) {
    const focus = (kinds && kinds.length) ? kinds.join('/') : '伤害/SAN/中毒/追逐';
    return [
        '\n\n【结算对账·必须遵守】上一轮叙事宣称了' + focus + '等结算结果，但未调用对应类别工具。',
        '请先调用 melee_attack / fire_weapon / reality_check / apply_scenario_effects / start_chase / apply_disease / cast_spell 等结算工具，再写结果。禁止口头改数。'
    ].join('');
}

/**
 * @returns {{ needsReprompt: boolean, repromptBlock?: string, kinds?: string[] }}
 */
export function reconcileNarrativeSettlement(content, toolCalls) {
    const kinds = classifySettlementClaims(content);
    if (!kinds.length && !narrativeClaimsSettlement(content)) {
        return { needsReprompt: false };
    }
    const useKinds = kinds.length ? kinds : [];
    if (hasMatchingSettlementTool(toolCalls, useKinds)) {
        return { needsReprompt: false, kinds: useKinds };
    }
    return {
        needsReprompt: true,
        kinds: useKinds,
        repromptBlock: buildSettlementRepromptBlock(useKinds)
    };
}
