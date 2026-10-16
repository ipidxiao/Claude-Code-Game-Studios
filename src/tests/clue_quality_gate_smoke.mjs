/**
 * Clue quality gate — uses shared investigate_outcomes helper.
 */
import { strict as assert } from 'node:assert';
import { hasClueQualityAtLeast } from '../js/data/investigate_outcomes.mjs';

assert.equal(hasClueQualityAtLeast([], 'solid'), false);
assert.equal(hasClueQualityAtLeast([{ quality: 'partial' }], 'solid'), false);
assert.equal(hasClueQualityAtLeast([{ quality: 'solid' }], 'solid'), true);
assert.equal(hasClueQualityAtLeast([{ quality: 'decisive' }], 'solid'), true);
assert.equal(hasClueQualityAtLeast([{ quality: 'partial' }], null), true);
assert.equal(hasClueQualityAtLeast([{ quality: 'partial' }], 'partial'), true);
assert.equal(hasClueQualityAtLeast([], 'none'), true);
assert.equal(hasClueQualityAtLeast([{ quality: 'solid' }], 'SOLID'), true);
assert.equal(hasClueQualityAtLeast([{ quality: 'decisive' }], 'decisve'), false);
assert.equal(hasClueQualityAtLeast([], 'unknown'), false);

console.log('clue_quality_gate_smoke: OK');
