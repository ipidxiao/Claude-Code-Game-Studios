/**
 * Verify creative smoke catalog files exist on disk (Q6).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREATIVE_SMOKE_CATALOG } from '../js/data/creative_smoke_catalog.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tests = path.join(root, 'tests');
let missing = 0;

console.log('Creative smoke catalog (' + CREATIVE_SMOKE_CATALOG.length + '):');
for (const entry of CREATIVE_SMOKE_CATALOG) {
    const fp = path.join(tests, entry.id + '.mjs');
    const ok = fs.existsSync(fp);
    console.log((ok ? '  OK  ' : '  MISS') + ' [' + entry.phase + '] ' + entry.id + ' — ' + entry.covers);
    if (!ok) missing++;
}

if (missing) {
    console.error('list_creative_smokes: ' + missing + ' missing');
    process.exit(1);
}
console.log('list_creative_smokes: OK');
