/**
 * Built-in mjs is authority for contract effects and for story text.
 * Package twin must COVER mjs contract keys on shared nodes (pack may keep extras), and carry the
 * built-in's story text (title, subtitle, narrative, journal, groupOutcome, choice labels) on shared nodes:
 * a second, divergent copy of the prose kept the filler and meta lines the built-ins dropped
 * (phone test 2026-10-18). Each action's dice (choice skillCheck + failNext) and its failure
 * passage, which only the built-in has at first, are carried over too (author, 2026-10-18: every
 * action rolls; a twin without them would play the same scenario with no dice).
 *
 *   node scripts/audit_scenario_pack_parity.mjs
 *   node scripts/audit_scenario_pack_parity.mjs --fix
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_SCENARIOS } from '../js/data/scenarios/builtins.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = path.join(root, 'js', 'data', 'scenarios', 'packages');
const fix = process.argv.includes('--fix');

const EFFECT_KEYS = [
    'sanCheck', 'combat', 'chase', 'enchantmentId', 'dispel', 'dispelMp', 'flags', 'san'
];

function pickEffects(eff) {
    if (!eff || typeof eff !== 'object') return {};
    const out = {};
    for (const k of EFFECT_KEYS) {
        if (eff[k] == null) continue;
        if (k === 'san' && Number(eff[k]) === 0) continue;
        out[k] = eff[k];
    }
    return out;
}

function stable(v) {
    return JSON.stringify(v);
}

function missingCover(mEff, pEff) {
    const miss = {};
    for (const k of Object.keys(mEff)) {
        if (stable(mEff[k]) !== stable(pEff[k])) miss[k] = mEff[k];
    }
    return miss;
}

function mjsGates(choices) {
    return (choices || [])
        .filter((c) => c && c.requiresClueQuality)
        .map((c) => ({ next: c.next, id: c.id, requiresClueQuality: c.requiresClueQuality }));
}

function findGateChoice(choices, g) {
    const list = choices || [];
    if (g && g.id) {
        const byId = list.find((c) => c && c.id === g.id);
        if (byId) return byId;
    }
    // Fallback: a single same-target choice that ALREADY carries this gate (a renamed choice in
    // a pack variant). Never pick an ungated choice — that stamped quiet_push's gate onto
    // alley_to_asphalt's ordinary "push" (both → car_jump) and then counted it as covered.
    const byNext = list.filter((c) => c && c.next === g.next && c.requiresClueQuality === g.requiresClueQuality);
    if (byNext.length === 1) return byNext[0];
    return null;
}

function gateCovered(mGates, pChoices) {
    const missing = [];
    for (const g of mGates) {
        const hit = findGateChoice(pChoices, g);
        if (!hit || hit.requiresClueQuality !== g.requiresClueQuality) missing.push(g);
    }
    return missing;
}

const OUTCOME_KEYS = ['allSuccess', 'allFailure', 'mixed'];

/** Story fields of a shared node that differ from the built-in. */
function storyDiff(mNode, pNode) {
    const need = {};
    if (mNode.narrative != null && mNode.narrative !== pNode.narrative) need.narrative = mNode.narrative;
    // The journal line is read in the player's journal like any passage.
    const mJournal = mNode.effects && mNode.effects.journal;
    if (mJournal != null && mJournal !== (pNode.effects && pNode.effects.journal)) need.journal = mJournal;
    for (const k of OUTCOME_KEYS) {
        const mv = mNode.groupOutcome && mNode.groupOutcome[k];
        if (mv != null && mv !== (pNode.groupOutcome && pNode.groupOutcome[k])) (need.groupOutcome ||= {})[k] = mv;
    }
    const labels = {};
    for (const c of mNode.choices || []) {
        const twin = (pNode.choices || []).find((x) => x && c && (c.id ? x.id === c.id : x.next === c.next));
        if (twin && c.label && twin.label !== c.label) labels[c.id || c.next] = c.label;
    }
    if (Object.keys(labels).length) need.labels = labels;
    return need;
}

function compareNode(nodeId, mNode, pNode) {
    const diffs = [];
    const story = storyDiff(mNode, pNode);
    if (Object.keys(story).length) diffs.push({ kind: 'story', nodeId, need: story });
    const mEff = pickEffects(mNode && mNode.effects);
    const pEff = pickEffects(pNode && pNode.effects);
    const miss = missingCover(mEff, pEff);
    if (Object.keys(miss).length) {
        diffs.push({ kind: 'effects-cover', nodeId, need: miss, pack: pEff });
    }
    const mGates = mjsGates(mNode && mNode.choices);
    const uncovered = gateCovered(mGates, pNode && pNode.choices);
    if (uncovered.length) {
        diffs.push({ kind: 'gate-cover', nodeId, need: uncovered });
    }
    for (const c of (mNode && mNode.choices) || []) {
        if (!c || !c.failNext) continue;
        const twin = ((pNode && pNode.choices) || []).find((x) => x && (c.id ? x.id === c.id : x.next === c.next));
        if (!twin || twin.failNext !== c.failNext || stable(twin.skillCheck) !== stable(c.skillCheck)) {
            diffs.push({ kind: 'action-check', nodeId, need: { id: c.id, next: c.next, skillCheck: c.skillCheck, failNext: c.failNext } });
        }
    }
    return diffs;
}

/** Failure passages the built-in routes to that the twin lacks. */
function missingActionNodes(mNodes, pNodes) {
    const ids = new Set();
    for (const n of Object.values(mNodes)) for (const c of n.choices || []) if (c && c.failNext && !pNodes[c.failNext]) ids.add(c.failNext);
    return [...ids].map((id) => ({ kind: 'action-node', nodeId: id, need: JSON.parse(JSON.stringify(mNodes[id])) }));
}

function applyFix(pack, scen, diffs) {
    const pNodes = pack.nodes || {};
    const mNodes = scen.nodes || {};
    for (const d of diffs) {
        if (d.kind === 'action-node') pNodes[d.nodeId] = d.need;
    }
    for (const d of diffs) {
        const mNode = mNodes[d.nodeId];
        const pNode = pNodes[d.nodeId];
        if (!mNode || !pNode) continue;
        if (d.kind === 'action-check') {
            const twin = (pNode.choices || []).find((x) => x && (d.need.id ? x.id === d.need.id : x.next === d.need.next));
            if (twin) Object.assign(twin, { skillCheck: d.need.skillCheck, failNext: d.need.failNext });
        }
        if (d.kind === 'story') {
            if (d.need.narrative != null) pNode.narrative = d.need.narrative;
            if (d.need.journal != null) pNode.effects = Object.assign(pNode.effects || {}, { journal: d.need.journal });
            if (d.need.groupOutcome) pNode.groupOutcome = Object.assign(pNode.groupOutcome || {}, d.need.groupOutcome);
            for (const [key, label] of Object.entries(d.need.labels || {})) {
                const twin = (pNode.choices || []).find((x) => x && (x.id === key || (!x.id && x.next === key)));
                if (twin) twin.label = label;
            }
        }
        if (d.kind === 'effects-cover') {
            if (!pNode.effects || typeof pNode.effects !== 'object') pNode.effects = {};
            Object.assign(pNode.effects, JSON.parse(JSON.stringify(d.need)));
        }
        if (d.kind === 'gate-cover') {
            if (!Array.isArray(pNode.choices)) pNode.choices = [];
            for (const g of d.need) {
                let hit = findGateChoice(pNode.choices, g);
                if (!hit) {
                    // Copy the authoritative mjs choice (label, flags, branches) instead of a stub.
                    const src = (mNode.choices || []).find((c) => c && (g.id ? c.id === g.id : c.next === g.next));
                    hit = src
                        ? JSON.parse(JSON.stringify(src))
                        : { id: g.id || g.next, label: '继续（质量门）', next: g.next };
                    pNode.choices.push(hit);
                }
                hit.requiresClueQuality = g.requiresClueQuality;
            }
        }
    }
}

let pairs = 0;
let hard = 0;
for (const scen of BUILTIN_SCENARIOS) {
    const packPath = path.join(packDir, scen.id + '.json');
    if (!fs.existsSync(packPath)) {
        console.log(scen.id + ': skip (no package twin)');
        continue;
    }
    pairs++;
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const mNodes = scen.nodes || {};
    const pNodes = pack.nodes || {};
    const shared = Object.keys(mNodes).filter((id) => pNodes[id]);
    const headDiff = (pk) => ['title', 'subtitle'].filter((k) => scen[k] != null && scen[k] !== pk[k])
        .map((k) => ({ kind: 'story-head', nodeId: '(' + k + ')', need: { [k]: scen[k] } }));
    let diffs = headDiff(pack).concat(missingActionNodes(mNodes, pNodes));
    for (const id of shared) diffs.push(...compareNode(id, mNodes[id], pNodes[id]));

    if (diffs.length && fix) {
        applyFix(pack, scen, diffs);
        for (const d of diffs) if (d.kind === 'story-head') Object.assign(pack, d.need);
        fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
        diffs = headDiff(pack).concat(missingActionNodes(mNodes, pack.nodes));
        for (const id of Object.keys(mNodes).filter((n) => pack.nodes[n])) diffs.push(...compareNode(id, mNodes[id], pack.nodes[id]));
        console.log(scen.id + ': fixed → remaining ' + diffs.length);
    } else if (diffs.length) {
        console.log(scen.id + ': DRIFT ' + diffs.length);
        for (const d of diffs.slice(0, 6)) {
            console.log('  [' + d.kind + '] ' + d.nodeId + ' need=' + JSON.stringify(d.need));
        }
        if (diffs.length > 6) console.log('  … +' + (diffs.length - 6));
    } else {
        console.log(scen.id + ': OK');
    }
    hard += diffs.length;
}

console.log('pairs=' + pairs + ' uncovered=' + hard + (fix ? ' (fix)' : ''));
if (hard > 0) process.exit(1);
