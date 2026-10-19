/**
 * Emit missing builtin → packages/*.json twins (tags + structural meta only if already full scenario).
 * Usage: node scripts/export_missing_builtin_packs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = path.join(root, 'js', 'data', 'scenarios', 'packages');
const missing = ['deep_one_shadow', 'abandoned_asylum', 'midnight_museum'];

for (const id of missing) {
    const out = path.join(packDir, id + '.json');
    if (fs.existsSync(out)) {
        console.log('skip (exists):', id);
        continue;
    }
    const sc = BUILTIN_BY_ID[id];
    if (!sc) {
        console.error('missing builtin:', id);
        process.exitCode = 1;
        continue;
    }
    // Strip non-JSON / function fields if any; scenarios are plain data.
    const json = JSON.stringify(sc, null, 2);
    fs.writeFileSync(out, json + '\n', 'utf8');
    console.log('wrote', id, '(' + Math.round(json.length / 1024) + ' KB)');
}
console.log('export_missing_builtin_packs: done');
