#!/usr/bin/env node
/**
 * CI coverage gates: core intact + catalog/fill thresholds from meta.gates.
 */
import { loadCoverage, validateCoverage } from '../js/data/coverage/load_coverage.mjs';

const cov = loadCoverage();
const v = validateCoverage(cov);
if (!v.ok) {
    console.error('coverage_gate: FAILED (' + v.errors.length + ')');
    for (const e of v.errors.slice(0, 40)) console.error('  -', e);
    if (v.errors.length > 40) console.error('  ... +' + (v.errors.length - 40) + ' more');
    process.exit(1);
}
console.log(
    'coverage_gate: OK (toc=' + cov.toc.length +
    ', fill=' + (v.fill.rate * 100).toFixed(1) + '% target=' +
    ((cov.gates.fillTarget || 0) * 100).toFixed(1) + '%)'
);
