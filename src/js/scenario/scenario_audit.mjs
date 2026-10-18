/**
 * Static audit for built-in local scenario modules — branch narration, groupOutcome, checkpoints.
 */
import { isDryNarrative } from '../data/narrative_prose.mjs';
import { auditScenarioEffects } from './effects_apply.mjs';

const GROUP_OUTCOME_KEYS = ['allSuccess', 'allFailure', 'mixed'];
// Floors, not targets. They were 100 characters (14 for a choice label), and modules were padded with
// template filler to reach them; story quality is guarded by narrative_immersion_smoke instead.
const MIN_NODE_NARRATIVE = 40;
const MIN_BRANCH_NARRATIVE = 40;
const MIN_GROUP_OUTCOME = 40;
const MIN_ENDING_NARRATIVE = 40;
const MIN_CHOICE_LABEL = 2;
const DRY = { minChars: MIN_NODE_NARRATIVE };
const MIN_CHECKPOINTS = 2;
const CHOICE_CLUE_QUALITY_TOKENS = new Set(['none', 'partial', 'solid', 'decisive', 'seed']);

/** Body length excluding outcome markers for audit. */
export function proseBodyLength(text) {
    return String(text || '')
        .replace(/【结局[^】]*】[\s\S]*/g, '')
        .replace(/【教程[^】]*】[\s\S]*/g, '')
        .trim()
        .length;
}

/** @returns {Set<string>} node ids targeted by choices with skillCheck */
export function collectSkillCheckTargets(scenario) {
    const targets = new Set();
    if (!scenario?.nodes) return targets;
    for (const node of Object.values(scenario.nodes)) {
        for (const c of node.choices || []) {
            if (c?.skillCheck && c.next) targets.add(c.next);
        }
    }
    return targets;
}

/** @returns {string[]} node ids that declare branch routing */
export function collectBranchNodes(scenario) {
    if (!scenario?.nodes) return [];
    return Object.entries(scenario.nodes)
        .filter(([, n]) => n && n.branch && typeof n.branch === 'object')
        .map(([id]) => id);
}

function validateGroupOutcome(nodeId, go, errors) {
    if (!go || typeof go !== 'object') {
        errors.push(`${nodeId}: branch node missing groupOutcome`);
        return;
    }
    for (const k of GROUP_OUTCOME_KEYS) {
        const text = go[k];
        const len = proseBodyLength(text);
        if (!text || typeof text !== 'string' || len < MIN_GROUP_OUTCOME) {
            errors.push(`${nodeId}: groupOutcome.${k} missing or too short (min ${MIN_GROUP_OUTCOME}, got ${len})`);
        }
    }
}

/**
 * @param {object} scenario
 * @param {{ strict?: boolean }} [opts]
 * @returns {{ ok: boolean, errors: string[], warnings: string[], branchNodes: string[], checkpoints: string[] }}
 */
export function auditScenario(scenario, opts = {}) {
    const errors = [];
    const warnings = [];
    if (!scenario?.nodes || typeof scenario.nodes !== 'object') {
        return { ok: false, errors: ['missing nodes'], warnings, branchNodes: [], checkpoints: [] };
    }

    const branchNodes = collectBranchNodes(scenario);
    const skillTargets = collectSkillCheckTargets(scenario);

    for (const nodeId of branchNodes) {
        const node = scenario.nodes[nodeId];
        const narrative = node.narrative || '';
        const nLen = proseBodyLength(narrative);
        if (!narrative || nLen < MIN_BRANCH_NARRATIVE) {
            errors.push(`${nodeId}: branch node needs setup narrative (min ${MIN_BRANCH_NARRATIVE} chars, got ${nLen})`);
        } else if (isDryNarrative(narrative, DRY)) {
            errors.push(`${nodeId}: branch narrative is dry/summary prose`);
        }
        validateGroupOutcome(nodeId, node.groupOutcome, errors);
        if (skillTargets.has(nodeId) && !node.branch) {
            errors.push(`${nodeId}: skillCheck target missing branch`);
        }
    }

    const checkpoints = [];
    for (const [nodeId, node] of Object.entries(scenario.nodes)) {
        if (node?.checkpoint) checkpoints.push(nodeId);

        const choices = Array.isArray(node?.choices) ? node.choices : [];
        for (const ch of choices) {
            if (ch && ch.requiresClueQuality != null) {
                const quality = String(ch.requiresClueQuality).trim().toLowerCase();
                if (!CHOICE_CLUE_QUALITY_TOKENS.has(quality)) {
                    errors.push(`${nodeId}: invalid requiresClueQuality "${ch.requiresClueQuality}" (choice ${ch.id || '?'})`);
                }
            }
            if (!ch || ch.next == null || ch.next === '') continue;
            const nextId = String(ch.next);
            if (!scenario.nodes[nextId]) {
                errors.push(`${nodeId}: dangling choice.next → ${nextId} (choice ${ch.id || '?'})`);
            }
            if (ch.falseNext != null && ch.falseNext !== '' && !scenario.nodes[String(ch.falseNext)]) {
                errors.push(`${nodeId}: dangling choice.falseNext → ${ch.falseNext} (choice ${ch.id || '?'})`);
            }
        }

        const narrative = node?.narrative || '';
        if (narrative && !node.end && !branchNodes.includes(nodeId)) {
            const nLen = proseBodyLength(narrative);
            if (nLen < MIN_NODE_NARRATIVE) {
                errors.push(`${nodeId}: narrative too short (min ${MIN_NODE_NARRATIVE}, got ${nLen})`);
            } else if (isDryNarrative(narrative, DRY)) {
                errors.push(`${nodeId}: narrative is dry/summary prose`);
            }
        }

        for (const c of node?.choices || []) {
            const label = String(c?.label || '');
            if (label.length < MIN_CHOICE_LABEL) {
                errors.push(`${nodeId}: choice "${c?.id || '?'}" label too short (min ${MIN_CHOICE_LABEL}, got ${label.length})`);
            }
        }

        if (node?.end) {
            const text = node.narrative || '';
            const eLen = proseBodyLength(text);
            if (eLen < MIN_ENDING_NARRATIVE) {
                errors.push(`${nodeId}: ending narrative too short (min ${MIN_ENDING_NARRATIVE}, got ${eLen})`);
            }
            if (!/【结局[:：]|【教程/.test(text)) {
                errors.push(`${nodeId}: ending missing 【结局】 or 【教程】 marker`);
            }
        }
    }

    if (checkpoints.length < MIN_CHECKPOINTS) {
        errors.push(`${scenario.id || 'scenario'}: need at least ${MIN_CHECKPOINTS} checkpoint nodes (has ${checkpoints.length})`);
    }

    if (scenario.startNode && !scenario.nodes[scenario.startNode]) {
        errors.push('startNode not in nodes');
    }

    const effectAudit = auditScenarioEffects(scenario);
    errors.push(...effectAudit.errors);
    warnings.push(...effectAudit.warnings);

    for (const nodeId of branchNodes) {
        const b = scenario.nodes[nodeId].branch;
        for (const key of ['success', 'onSuccess', 'failure', 'onFailure']) {
            const next = b[key];
            if (next && !scenario.nodes[next]) {
                warnings.push(`${nodeId}.branch.${key} -> missing node "${next}"`);
            }
        }
    }

    const ok = errors.length === 0;
    return { ok, errors, warnings, branchNodes, checkpoints };
}

export function auditAllBuiltins(builtins) {
    const results = [];
    for (const scenario of builtins || []) {
        const report = auditScenario(scenario);
        results.push({ id: scenario.id, title: scenario.title, ...report });
    }
    const failed = results.filter((r) => !r.ok);
    return { ok: failed.length === 0, results, failed };
}

export const CoCScenarioAudit = {
    auditScenario,
    auditAllBuiltins,
    collectBranchNodes,
    collectSkillCheckTargets,
    proseBodyLength,
    MIN_NODE_NARRATIVE,
    MIN_CHOICE_LABEL,
};

if (typeof window !== 'undefined') {
    window.CoCScenarioAudit = CoCScenarioAudit;
}
