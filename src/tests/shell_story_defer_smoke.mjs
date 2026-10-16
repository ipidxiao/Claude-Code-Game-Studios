/**
 * Shell R29.11 — story deferral: runner not on eager barrel; ensure_runner lazy-loads.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STORY_SIDE_EFFECTS } from '../js/boot/shell_side_effects_story.mjs';
import {
    ensureScenarioRunner,
    getScenarioRunner,
    startScenarioById
} from '../js/scenario/ensure_runner.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storyBarrel = readFileSync(join(root, 'js/boot/shell_side_effects_story.mjs'), 'utf8');
const ensureSrc = readFileSync(join(root, 'js/scenario/ensure_runner.mjs'), 'utf8');
const lobbySrc = readFileSync(join(root, 'js/views/lobby_view.mjs'), 'utf8');
const creatorSrc = readFileSync(join(root, 'js/components/char_creator.mjs'), 'utf8');
const appSide = readFileSync(join(root, 'js/boot/shell_side_effects.mjs'), 'utf8');
const aiSrc = readFileSync(join(root, 'js/ai_logic.mjs'), 'utf8');

assert.equal(STORY_SIDE_EFFECTS.runnerEager, false);
assert.equal(STORY_SIDE_EFFECTS.runnerDeferred, true);
assert.equal(STORY_SIDE_EFFECTS.storyUiDeferred, true);

assert.ok(!storyBarrel.includes("import '../scenario/runner.mjs'"));
assert.ok(!storyBarrel.includes("import '../campaign/group_check.mjs'"));
assert.ok(ensureSrc.includes("import('./runner.mjs')"));
assert.ok(!ensureSrc.includes("import './runner.mjs'")); // no static
assert.ok(!ensureSrc.includes('window.CoCScenarioRunner'));
const runnerModSrc = readFileSync(join(root, 'js/scenario/runner.mjs'), 'utf8');
assert.ok(!runnerModSrc.includes('window.CoCScenarioRunner'));

assert.ok(lobbySrc.includes('startScenarioById'));
assert.ok(!lobbySrc.includes('window.CoCScenarioRunner'));
assert.ok(creatorSrc.includes('startScenarioById'));
assert.ok(!creatorSrc.includes('window.CoCScenarioRunner'));
assert.ok(aiSrc.includes('getScenarioRunner'));
assert.ok(!aiSrc.includes("from './scenario/runner.mjs'"));
assert.ok(!aiSrc.includes("from './campaign/group_check.mjs'"));
assert.ok(aiSrc.includes("import('./campaign/group_check.mjs')"));
assert.ok(appSide.includes('shell_side_effects_story.mjs'));

// Sync peek is null before ensure (no window mount in this smoke)
assert.equal(getScenarioRunner(), null);

// Dynamic import path works (runner IIFE may return empty without Vue State — still loads module)
const runner = await ensureScenarioRunner();
assert.ok(runner === null || typeof runner === 'object');
// Module graph: second call returns same promise cache
const runner2 = await ensureScenarioRunner();
assert.equal(runner, runner2);

// startScenarioById with bogus id should not throw
const started = await startScenarioById('__smoke_missing_scenario__');
assert.equal(typeof started, 'boolean');

console.log('shell_story_defer_smoke: OK', STORY_SIDE_EFFECTS, {
    runnerLoaded: !!runner,
    startedBogus: started
});
