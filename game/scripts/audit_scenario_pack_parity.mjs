/**
 * Built-in mjs is authority for contract effects.
 * Package twin must COVER mjs contract keys on shared nodes (pack may keep extras).
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

function compareNode(nodeId, mNode, pNode) {
    const diffs = [];
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
    return diffs;
}

function applyFix(pack, scen, diffs) {
    const pNodes = pack.nodes || {};
    const mNodes = scen.nodes || {};
    for (const d of diffs) {
        const mNode = mNodes[d.nodeId];
        const pNode = pNodes[d.nodeId];
        if (!mNode || !pNode) continue;
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
    let diffs = [];
    for (const id of shared) diffs.push(...compareNode(id, mNodes[id], pNodes[id]));

    if (diffs.length && fix) {
        applyFix(pack, scen, diffs);
        fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
        diffs = [];
        for (const id of shared) diffs.push(...compareNode(id, mNodes[id], pack.nodes[id]));
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
