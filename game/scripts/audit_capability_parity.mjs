/**
 * CLI: capability tag↔structure parity.
 *   node scripts/audit_capability_parity.mjs
 *   node scripts/audit_capability_parity.mjs --strict-all
 *   node scripts/audit_capability_parity.mjs --strict-chapter-map
 */
import { ARC_CHAPTER_MAP } from '../js/data/arc_chapters.mjs';
import { BUILTIN_SCENARIOS, BUILTIN_BY_ID } from '../js/data/scenarios/builtins.mjs';
import { auditScenarioCapabilityParity } from '../js/data/capability_risk.mjs';

const strictAll = process.argv.includes('--strict-all');
const strictChapter = process.argv.includes('--strict-chapter-map') || strictAll;
let errors = 0;
let warnings = 0;

const list = strictAll
    ? BUILTIN_SCENARIOS
    : (process.argv.includes('--strict-chapter-map')
        ? ARC_CHAPTER_MAP.map((n) => BUILTIN_BY_ID[n.id]).filter(Boolean)
        : BUILTIN_SCENARIOS);

const strict = strictAll || process.argv.includes('--strict-chapter-map');

for (const sc of list) {
    const r = auditScenarioCapabilityParity(sc, { strict });
    if (r.errors.length) {
        errors += r.errors.length;
        console.log('ERR', sc.id);
        r.errors.forEach((e) => console.log('  ', e));
    }
    if (r.warnings.length) {
        warnings += r.warnings.length;
        console.log('WARN', sc.id);
        r.warnings.forEach((w) => console.log('  ', w));
    }
}

const mode = strictAll ? 'strict-all' : (strict ? 'strict-chapter-map' : 'soft-all');
console.log('audit_capability_parity: errors=' + errors + ' warnings=' + warnings + ' (' + mode + ')');
if (strict && errors) process.exit(1);
console.log('audit_capability_parity: OK');
