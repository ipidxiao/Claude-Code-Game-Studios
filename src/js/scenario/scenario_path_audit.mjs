/**
 * Scenario path metrics — detect speedrun-prone builtin modules.
 */
import { auditScenario } from './scenario_audit.mjs';

const MIN_RECOMMENDED_HOPS = 8;
const MIN_RECOMMENDED_NODES = 22;

function collectNextIds(node) {
    const outs = [];
    if (node?.branch) {
        outs.push(node.branch.success || node.branch.onSuccess, node.branch.failure || node.branch.onFailure);
    }
    for (const c of node?.choices || []) {
        if (c?.next) outs.push(c.next);
    }
    return [...new Set(outs.filter(Boolean))];
}

/** BFS shortest hop count from start to any end node (ignores requiresFlag). */
export function shortestPathHops(scenario) {
    const nodes = scenario?.nodes || {};
    const start = scenario?.startNode;
    if (!start || !nodes[start]) return { hops: null, path: null };

    const queue = [[start, 0, [start]]];
    const best = new Map();
    let minEnd = Infinity;
    let minPath = null;

    while (queue.length) {
        const [cur, depth, path] = queue.shift();
        if (nodes[cur]?.end) {
            if (depth < minEnd) {
                minEnd = depth;
                minPath = path;
            }
            continue;
        }
        if (best.has(cur) && best.get(cur) <= depth) continue;
        best.set(cur, depth);

        for (const nx of collectNextIds(nodes[cur])) {
            if (nodes[nx]) queue.push([nx, depth + 1, [...path, nx]]);
        }
    }

    return {
        hops: minEnd === Infinity ? null : minEnd,
        path: minPath ? minPath.join(' → ') : null,
    };
}

/** Branch failures that jump directly to an ending node. */
export function failureToEndingShortcuts(scenario) {
    const nodes = scenario?.nodes || {};
    const shortcuts = [];
    for (const [id, node] of Object.entries(nodes)) {
        if (!node?.branch) continue;
        const fail = node.branch.failure || node.branch.onFailure;
        if (fail && nodes[fail]?.end) shortcuts.push(`${id} ─失败→ ${fail}`);
    }
    return shortcuts;
}

/**
 * @param {object} scenario
 * @returns {{ id: string, title: string, nodeCount: number, estimatedMinutes: number, shortestHops: number|null, shortestPath: string|null, failToEnd: string[], warnings: string[], ok: boolean }}
 */
export function auditScenarioPath(scenario) {
    const nodes = scenario?.nodes || {};
    const nodeCount = Object.keys(nodes).length;
    const { hops, path } = shortestPathHops(scenario);
    const failToEnd = failureToEndingShortcuts(scenario);
    const warnings = [];

    if (hops != null && hops < MIN_RECOMMENDED_HOPS) {
        warnings.push(`最短路径仅 ${hops} 跳（建议 ≥${MIN_RECOMMENDED_HOPS}）`);
    }
    if (nodeCount < MIN_RECOMMENDED_NODES) {
        warnings.push(`节点数 ${nodeCount}（建议 ≥${MIN_RECOMMENDED_NODES}）`);
    }
    if (failToEnd.length > 0) {
        warnings.push(`检定失败可直达结局：${failToEnd.join('；')}`);
    }

    const prose = auditScenario(scenario);
    if (!prose.ok) warnings.push(...prose.errors.slice(0, 3));

    return {
        id: scenario.id,
        title: scenario.title,
        nodeCount,
        estimatedMinutes: scenario.estimatedMinutes,
        shortestHops: hops,
        shortestPath: path,
        failToEnd,
        warnings,
        ok: warnings.length === 0,
    };
}

export function auditAllBuiltinPaths(builtins) {
    return (builtins || []).map((s) => auditScenarioPath(s));
}

export const CoCScenarioPathAudit = {
    shortestPathHops,
    failureToEndingShortcuts,
    auditScenarioPath,
    auditAllBuiltinPaths,
    MIN_RECOMMENDED_HOPS,
    MIN_RECOMMENDED_NODES,
};

if (typeof window !== 'undefined') {
    window.CoCScenarioPathAudit = CoCScenarioPathAudit;
}
