/**
 * Export/patch package JSON contract effects from built-in mjs (authority).
 * Only patches effects contract keys + requiresClueQuality on shared nodes.
 * Does not rewrite narrative prose.
 *
 *   node scripts/export_scenario_pack.mjs
 *   node scripts/export_scenario_pack.mjs tutorial
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit = path.join(root, 'scripts', 'audit_scenario_pack_parity.mjs');
const filter = process.argv[2];

const r = spawnSync(process.execPath, [audit, '--fix'], {
    cwd: root,
    encoding: 'utf8',
    env: process.env
});
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');

if (filter) {
    const lines = String(r.stdout || '').split(/\r?\n/).filter((l) => l.startsWith(filter + ':'));
    console.log('filter ' + filter + ':\n' + (lines.join('\n') || '(no twin / no output)'));
}

if (r.status) process.exit(r.status);
console.log('export_scenario_pack: OK (mjs → packages contract merge)');
