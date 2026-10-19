/**
 * Package graph guard (R29.58 / R29.64 class): a scenario fix made only in the ESM file leaves
 * the packages/*.json twin on the old graph (e.g. asylum lost "seal_entrance" → ending_seal
 * unreachable). audit:pack-parity only compares effects, not routing, so drift went unseen.
 *
 * 1) Every package: no dangling route target, valid startNode, a reachable ending.
 * 2) Twins that are full exports of a built-in (same title + license): identical choice routing
 *    to the ESM scenario and no unreachable node.
 * 3) No divergent variants: a package named after a built-in must be a full export (R29.67 removed
 *    the five old twins). KNOWN_VARIANTS stays empty.
 */
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packDir = join(root, 'js/data/scenarios/packages');

// R29.67: the old divergent twins (tutorial, coastal_festival, carnival_of_masks, missing_child,
// train_to_nowhere) were deleted. A package named after a built-in must be a full export of it.
const KNOWN_VARIANTS = new Set();

const nodeMap = (sc) => (Array.isArray(sc.nodes) ? Object.fromEntries(sc.nodes.map((n) => [n.id, n])) : sc.nodes || {});
const qualityTargets = (map) => (map && typeof map === 'object')
    ? Object.values(map).map((v) => (typeof v === 'string' ? v : v && v.next)).filter(Boolean)
    : [];

function routes(nodes, id) {
    const n = nodes[id] || {};
    const out = [];
    for (const c of n.choices || []) {
        if (!c) continue;
        out.push(c.next, c.falseNext, c.failNext, ...qualityTargets(c.branchByClueQuality));
    }
    if (n.branch) out.push(n.branch.success, n.branch.onSuccess, n.branch.failure, n.branch.onFailure);
    out.push(...qualityTargets(n.endingsByClueQuality));
    return out.filter((t) => t != null && t !== '').map(String);
}

function graphReport(sc) {
    const nodes = nodeMap(sc);
    const ids = new Set(Object.keys(nodes));
    const dangling = [];
    for (const id of ids) for (const t of routes(nodes, id)) if (!ids.has(t)) dangling.push(`${id}->${t}`);
    for (const [k, hit] of Object.entries(sc.onClockFull || {})) {
        if (hit && hit.next && !ids.has(String(hit.next))) dangling.push(`onClockFull.${k}->${hit.next}`);
    }
    const seen = new Set();
    const stack = [String(sc.startNode)].concat(Object.values(sc.onClockFull || {}).map((h) => h && h.next && String(h.next)))
        .filter((x) => x && ids.has(x));
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const t of routes(nodes, cur)) if (ids.has(t)) stack.push(t);
    }
    return {
        dangling,
        startOk: ids.has(String(sc.startNode)),
        unreachable: [...ids].filter((id) => !seen.has(id)),
        endingReachable: [...seen].some((id) => nodes[id] && nodes[id].end)
    };
}

const routingSignature = (sc) => {
    const nodes = nodeMap(sc);
    return Object.keys(nodes).sort().map((id) => id + ':' + (nodes[id].choices || [])
        .map((c) => `${c && c.id}>${c && c.next}`).sort().join(',')).join('\n');
};

const actualVariants = new Set();
let twins = 0;
for (const file of readdirSync(packDir).filter((f) => f.endsWith('.json')).sort()) {
    const pack = JSON.parse(readFileSync(join(packDir, file), 'utf8'));
    const id = pack.id || file.replace(/\.json$/, '');
    const r = graphReport(pack);
    assert.deepEqual(r.dangling, [], `${file}: dangling route targets`);
    assert.ok(r.startOk, `${file}: startNode "${pack.startNode}" missing`);
    assert.ok(r.endingReachable, `${file}: no ending reachable from startNode`);

    const esm = BUILTIN_BY_ID[id];
    if (!esm) continue; // downloadable community pack: (1) is all we can check
    const isFullExport = pack.title === esm.title && pack.license === esm.license;
    if (!isFullExport) {
        actualVariants.add(id);
        continue;
    }
    twins++;
    assert.deepEqual(r.unreachable, [], `${file}: unreachable nodes in a full-export twin`);
    assert.equal(routingSignature(pack), routingSignature(esm),
        `${file}: choice routing drifted from js/data/scenarios/${id}.mjs — re-export the twin's nodes from ESM`);
}

assert.deepEqual([...actualVariants].sort(), [...KNOWN_VARIANTS].sort(),
    'variant list out of date: remove ids that are now full exports, or decide on new divergent ones');
assert.ok(twins >= 3, 'expected at least the deep_one / asylum / museum full-export twins');

console.log('pack_graph_smoke: OK', { twins, variants: actualVariants.size });
