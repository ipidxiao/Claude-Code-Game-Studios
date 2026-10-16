/**
 * Align ALL builtin tags with structural capabilities (strict parity prep).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BUILTIN_SCENARIOS } from '../js/data/scenarios/builtins.mjs';
import { detectStructuralCapabilities } from '../js/data/capability_risk.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = new Set(['追逐', '证据分叉', '神话热度', '战后余波', '战役账本', '双时钟', '假线索']);

function uniqTags(tags) {
    const seen = new Set();
    const out = [];
    for (const t of tags) {
        if (CAP.has(t)) {
            if (seen.has(t)) continue;
            seen.add(t);
        }
        out.push(t);
    }
    return out;
}

function formatTagsJs(tags) {
    return '[' + tags.map((t) => "'" + String(t).replace(/'/g, "\\'") + "'").join(', ') + ']';
}

let changed = 0;
for (const sc of BUILTIN_SCENARIOS) {
    const structural = detectStructuralCapabilities(sc).filter((id) => id !== '神话热度');
    if (!structural.length) continue;
    const next = uniqTags([...(sc.tags || []), ...structural]);
    const same = JSON.stringify(sc.tags || []) === JSON.stringify(next);
    if (same) continue;

    const mjsPath = path.join(root, 'js', 'data', 'scenarios', sc.id + '.mjs');
    let raw = fs.readFileSync(mjsPath, 'utf8');
    const m = raw.match(/"?tags"?\s*:\s*\[[\s\S]*?\]/);
    if (!m) {
        console.warn('skip (no tags block):', sc.id);
        continue;
    }
    const useDouble = m[0].includes('"tags"');
    const replacement = useDouble
        ? '"tags": ' + JSON.stringify(next)
        : 'tags: ' + formatTagsJs(next);
    raw = raw.replace(m[0], replacement);
    fs.writeFileSync(mjsPath, raw);

    const packPath = path.join(root, 'js', 'data', 'scenarios', 'packages', sc.id + '.json');
    if (fs.existsSync(packPath)) {
        const j = JSON.parse(fs.readFileSync(packPath, 'utf8'));
        j.tags = next;
        fs.writeFileSync(packPath, JSON.stringify(j, null, 2) + '\n');
    }
    changed++;
    console.log(sc.id, '→', next.filter((t) => CAP.has(t)).join(' · '));
}

console.log('align_builtin_capability_tags: changed=' + changed);
