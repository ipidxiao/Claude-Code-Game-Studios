/**
 * Wave 1A: clue-quality ending / choice branch resolution.
 */
import { strict as assert } from 'node:assert';
import {
    bestClueQualityBranchKey,
    pickClueQualityBranch,
    hasClueQualityAtLeast
} from '../js/data/investigate_outcomes.mjs';
import { CoCScenarioMidnightMuseum } from '../js/data/scenarios/midnight_museum.mjs';
import { CoCScenarioDeepOneShadow } from '../js/data/scenarios/deep_one_shadow.mjs';

assert.equal(bestClueQualityBranchKey([]), 'weak');
assert.equal(bestClueQualityBranchKey([{ quality: 'partial' }]), 'weak');
assert.equal(bestClueQualityBranchKey([{ quality: 'solid' }]), 'solid');
assert.equal(bestClueQualityBranchKey([{ quality: 'partial' }, { quality: 'decisive' }]), 'decisive');

const map = { weak: 'a', solid: 'b', decisive: 'c' };
assert.equal(pickClueQualityBranch(map, []).next, 'a');
assert.equal(pickClueQualityBranch(map, [{ quality: 'solid' }]).next, 'b');
assert.equal(pickClueQualityBranch(map, [{ quality: 'decisive' }]).next, 'c');
assert.equal(pickClueQualityBranch({ solid: 'only' }, []).next, 'only');

assert.equal(hasClueQualityAtLeast([{ quality: 'partial' }], 'solid'), false);
assert.equal(hasClueQualityAtLeast([{ quality: 'solid' }], 'solid'), true);

const mus = CoCScenarioMidnightMuseum.nodes.ending_by_evidence;
assert.ok(mus && mus.endingsByClueQuality);
assert.equal(pickClueQualityBranch(mus.endingsByClueQuality, []).next, 'ending_win_weak');
assert.equal(pickClueQualityBranch(mus.endingsByClueQuality, [{ quality: 'solid' }]).next, 'ending_win');
assert.equal(pickClueQualityBranch(mus.endingsByClueQuality, [{ quality: 'decisive' }]).next, 'ending_win_decisive');
assert.equal(CoCScenarioMidnightMuseum.nodes.ritual_check.branch.success, 'ending_by_evidence');

const dos = CoCScenarioDeepOneShadow.nodes.ending_by_evidence;
assert.ok(dos && dos.endingsByClueQuality);
assert.equal(pickClueQualityBranch(dos.endingsByClueQuality, [{ quality: 'decisive' }]).next, 'ending_win_decisive');
assert.equal(CoCScenarioDeepOneShadow.nodes.finale_ritual.branch.success, 'ending_by_evidence');

console.log('evidence_branch_smoke: OK');
