/**
 * Machine-check pressure write inventory (display / aftermath guards).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditPressureWriteGuards } from '../js/data/capability_risk.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = auditPressureWriteGuards({
    readFile: (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
});
if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exit(1);
}
console.log('audit_pressure_write_guards: OK');
