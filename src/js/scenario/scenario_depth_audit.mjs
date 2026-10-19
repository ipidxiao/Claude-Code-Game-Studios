/**
 * Scenario pacing audit — shortest path to ending, failure skips, finale aggregate.
 */
const MIN_RECOMMENDED_DEPTH = 7;
const MIN_NODES = 16;

function collectNext(node) {
    const next = new Set();
    if (!node || node.end) return next;
    for (const c of node.choices || []) {
        if (c.next) next.add(c.next);
    }
    if (node.branch) {
        for (const k of ['success', 'failure', 'onSuccess', 'onFailure']) {
            if (node.branch[k]) next.add(node.branch[k]);
        }
    }
    return next;
}

function mergeFlags(base, add) {
    if (!add) return base;
    return { ...base, ...add };
}

function flagsFromNode(node) {
    return node?.effects?.flags ? { ...node.effects.flags } : {};
}

function canTakeChoice(choice, flags) {
    if (!choice.requiresFlag) return true;
    return !!flags[choice.requiresFlag];
}

/** BFS shortest path from startNode to any end node (respects requiresFlag + effects.flags). */
export function shortestPathToEnding(scenario) {
    const nodes = scenario?.nodes;
    const start = scenario?.startNode;
    if (!nodes || !start) return null;

    const q = [[start, 0, [start], {}]];
    const bestDepth = new Map();
    let best = null;

    const stateKey = (id, flags) => `${id}:${JSON.stringify(flags)}`;

    while (q.length) {
        const [id, depth, path, flags] = q.shift();
        const sk = stateKey(id, flags);
        if (bestDepth.has(sk) && bestDepth.get(sk) <= depth) continue;
        bestDepth.set(sk, depth);

        const n = nodes[id];
        if (!n) continue;

        let nextFlags = mergeFlags(flags, flagsFromNode(n));

        if (n.end) {
            if (!best || depth < best.depth) best = { depth, path, endId: id };
            continue;
        }

        for (const c of n.choices || []) {
            if (!c.next || !canTakeChoice(c, nextFlags)) continue;
            q.push([c.next, depth + 1, path.concat(c.next), nextFlags]);
        }

        if (n.branch) {
            for (const k of ['success', 'failure', 'onSuccess', 'onFailure']) {
                const nx = n.branch[k];
                if (nx) q.push([nx, depth + 1, path.concat(nx), nextFlags]);
            }
        }
    }
    return best;
}

/** Branch failure edges that skip investigation hubs (not intentional bad endings). */
export function collectFailureSkips(scenario) {
    const skips = [];
    const nodes = scenario?.nodes || {};
    const endingIds = new Set(
        Object.entries(nodes)
            .filter(([, n]) => n?.end)
            .map(([id]) => id)
    );
    const lateHub = /^(finale|vault|cave|basement|top|backstage|tent|study_check|finale_ritual|reef_path)$/;

    for (const [id, node] of Object.entries(nodes)) {
        if (!node?.branch) continue;
        const fail = node.branch.failure || node.branch.onFailure;
        if (!fail || endingIds.has(fail)) continue;
        if (lateHub.test(fail)) {
            skips.push({ from: id, to: fail });
        }
    }
    return skips;
}

/** Finale skill choices that use aggregate any (one success wins). */
export function collectWeakFinaleAggregates(scenario) {
    const weak = [];
    const nodes = scenario?.nodes || {};
    for (const [nodeId, node] of Object.entries(nodes)) {
        for (const c of node.choices || []) {
            if (!c.skillCheck || !c.next) continue;
            const target = nodes[c.next];
            if (!target?.branch) continue;
            const leadsEnding = [target.branch.success, target.branch.failure, target.branch.onSuccess, target.branch.onFailure]
                .some((n) => n && (/ending/.test(n) || nodes[n]?.end));
            if (!leadsEnding) continue;
            const agg = c.skillCheck.aggregate || 'any';
            if (agg !== 'all') {
                weak.push({ nodeId, label: c.label, checkNode: c.next, aggregate: agg });
            }
        }
    }
    return weak;
}

/**
 * @param {object} scenario
 * @returns {{ ok: boolean, warnings: string[], errors: string[], shortest: object|null, nodeCount: number }}
 */
export function auditScenarioDepth(scenario) {
    const warnings = [];
    const errors = [];
    const nodeCount = Object.keys(scenario?.nodes || {}).length;
    const shortest = shortestPathToEnding(scenario);

    if (nodeCount < MIN_NODES) {
        warnings.push(`only ${nodeCount} nodes (recommend >= ${MIN_NODES})`);
    }
    if (shortest && shortest.depth < MIN_RECOMMENDED_DEPTH) {
        warnings.push(`shortest path to ending is ${shortest.depth} hops: ${shortest.path.join(' → ')}`);
    }

    for (const s of collectFailureSkips(scenario)) {
        warnings.push(`failure skip: ${s.from} → ${s.to}`);
    }
    for (const w of collectWeakFinaleAggregates(scenario)) {
        warnings.push(`finale uses aggregate "${w.aggregate}" at ${w.nodeId}/${w.label}`);
    }

    const ok = errors.length === 0;
    return { ok, warnings, errors, shortest, nodeCount };
}

export function auditAllBuiltinsDepth(builtins) {
    return (builtins || []).map((s) => ({
        id: s.id,
        title: s.title,
        ...auditScenarioDepth(s),
    }));
}

export const CoCScenarioDepthAudit = {
    shortestPathToEnding,
    collectFailureSkips,
    collectWeakFinaleAggregates,
    auditScenarioDepth,
    auditAllBuiltinsDepth,
    MIN_RECOMMENDED_DEPTH,
    MIN_NODES,
};

if (typeof window !== 'undefined') {
    window.CoCScenarioDepthAudit = CoCScenarioDepthAudit;
}
