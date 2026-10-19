#!/usr/bin/env node
/**
 * audit_write_paths.mjs — Fail if HP/SAN are mutated outside Kernel allowlist.
 * Supports the unified-pipeline invariant (P0).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS_ROOT = path.join(ROOT, 'js');

/** Relative paths (posix) allowed to assign derived.hp / derived.sanity. */
const ALLOWLIST = new Set([
    'js/engines/damage.mjs',
    'js/engines/sanity.mjs',
    'js/engines/healing.mjs',
    'js/engines/wound.mjs',
    'js/engines/mythos.mjs',
    'js/engines/poison.mjs',
    'js/engines/environmental.mjs',
    'js/engines/conditions.mjs',
    'js/engines/attributes.mjs',
    'js/state/char_record.mjs',
    'js/state/persistence.mjs',
    'js/components/char_creator.mjs',
    'js/tools/handlers/character.mjs', // null-coalesce init mirrors only; mutations must still call Engine
    'js/state/arc_ledger.mjs', // desk reset: heal-to-max on carry wipe (no scenario damage path)
    'js/state/gameplay.mjs' // aging CON/SIZ maxHp clamp after syncHp (not combat damage)
]);

/** Assignment only — not == / === / != */
const ASSIGN_HP = /derived\.hp\s*=(?!=)/;
const ASSIGN_SAN = /derived\.sanity\s*=(?!=)/;

function walk(dir, out) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules') continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full, out);
        else if (ent.name.endsWith('.mjs') || ent.name.endsWith('.js')) out.push(full);
    }
}

function relPosix(full) {
    return path.relative(ROOT, full).replace(/\\/g, '/');
}

const files = [];
walk(JS_ROOT, files);
const violations = [];

for (const full of files) {
    const rel = relPosix(full);
    if (ALLOWLIST.has(rel)) continue;
    if (rel.startsWith('js/data/')) continue;
    const text = fs.readFileSync(full, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
        if (ASSIGN_HP.test(line)) {
            violations.push({ file: rel, line: i + 1, id: 'derived.hp_assign', text: line.trim() });
        }
        if (ASSIGN_SAN.test(line)) {
            violations.push({ file: rel, line: i + 1, id: 'derived.sanity_assign', text: line.trim() });
        }
    }
}

if (violations.length) {
    console.error('audit_write_paths: FAILED (' + violations.length + ' hits)');
    for (const v of violations.slice(0, 40)) {
        console.error('  ' + v.file + ':' + v.line + ' [' + v.id + '] ' + v.text);
    }
    if (violations.length > 40) console.error('  ... +' + (violations.length - 40) + ' more');
    process.exit(1);
}

console.log('audit_write_paths: OK (allowlist ' + ALLOWLIST.size + ' files)');
