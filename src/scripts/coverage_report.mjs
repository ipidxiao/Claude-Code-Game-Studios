#!/usr/bin/env node
/**
 * Print Keeper coverage report (catalog + fill rate).
 */
import { loadCoverage, coverageStats, validateCoverage } from '../js/data/coverage/load_coverage.mjs';

const cov = loadCoverage();
const stats = coverageStats(cov);
const v = validateCoverage(cov);

console.log('=== CoC Coverage Report (Keeper 7e) ===');
console.log('schemaVersion:', cov.schemaVersion, 'book:', cov.book);
console.log('tocLeaves:', stats.tocLeaves, 'coreEntries:', stats.coreEntries);
console.log('gates:', JSON.stringify(stats.gates));
console.log('fill settle+table:', stats.fill.done + '/' + stats.fill.total,
    '(' + (stats.fill.rate * 100).toFixed(1) + '%)',
    'target', ((stats.gates.fillTarget || 0) * 100).toFixed(1) + '%');
console.log('byKind:', JSON.stringify(stats.byKind));
console.log('byStatus:', JSON.stringify(stats.byStatus));
console.log('byChapter:', JSON.stringify(stats.byChapter));
if (Object.keys(stats.fill.byChapter).length) {
    console.log('fillByChapter:');
    for (const [ch, row] of Object.entries(stats.fill.byChapter)) {
        const pct = row.total ? ((row.done / row.total) * 100).toFixed(0) : '100';
        console.log('  ', ch + ':', row.done + '/' + row.total, '(' + pct + '%)');
    }
}
if (!v.ok) {
    console.log('validation: FAIL (' + v.errors.length + ')');
    for (const e of v.errors.slice(0, 20)) console.log('  -', e);
    if (v.errors.length > 20) console.log('  ... +' + (v.errors.length - 20) + ' more');
    process.exitCode = 1;
} else {
    console.log('validation: OK');
}
