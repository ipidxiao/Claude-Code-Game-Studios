/**
 * Shell Phase 3b — async view loader contract (no DOM).
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

globalThis.window = globalThis;

window.Vue = {
    // Minimal stubs — ViewStory→story_*→CoCAI→state needs reactive/ref (Phase 4b).
    reactive: (x) => x,
    ref: (x) => ({ value: x }),
    nextTick: (fn) => { if (typeof fn === 'function') return Promise.resolve(fn()); return Promise.resolve(); },
    defineAsyncComponent(opts) {
        assert.equal(typeof opts.loader, 'function');
        assert.ok(opts.loadingComponent);
        assert.ok(opts.errorComponent);
        return { __async: true, opts };
    }
};

const {
    loadViewDevLogAsync,
    loadViewCreatorAsync,
    loadViewStoryAsync,
    ASYNC_VIEW_PILOT
} = await import('../js/boot/async_views.mjs');

assert.equal(ASYNC_VIEW_PILOT.viewDevLog, true);
assert.equal(ASYNC_VIEW_PILOT.viewCreator, true);
assert.equal(ASYNC_VIEW_PILOT.viewStory, true);
assert.equal(ASYNC_VIEW_PILOT.sideEffectsEager, true);
assert.equal(ASYNC_VIEW_PILOT.storyUiDeferred, true);
assert.equal(ASYNC_VIEW_PILOT.runnerDeferred, true);

async function assertAsyncView(factory, exportHint) {
    const wrap = factory();
    assert.equal(wrap.__async, true);
    const mod = await wrap.opts.loader();
    assert.ok(mod && (mod.name || mod.template || mod.setup || mod.methods || mod.components), exportHint);
}

await assertAsyncView(loadViewDevLogAsync, 'ViewDevLog');
await assertAsyncView(loadViewCreatorAsync, 'ViewCreator');
await assertAsyncView(loadViewStoryAsync, 'ViewStory');

const appSrc = readFileSync(join(root, 'js/app.mjs'), 'utf8');
assert.ok(appSrc.includes("from './views/lobby_view.mjs'"), 'lobby stays eager');
assert.equal(appSrc.includes("from './views/dev_log_view.mjs'"), false);
assert.equal(appSrc.includes("from './views/creator_view.mjs'"), false);
assert.equal(appSrc.includes("from './views/story_view.mjs'"), false);
assert.ok(appSrc.includes('loadViewDevLogAsync'));
assert.ok(appSrc.includes('loadViewCreatorAsync'));
assert.ok(appSrc.includes('loadViewStoryAsync'));
assert.ok(appSrc.includes("import './boot/shell_side_effects.mjs'"), 'side-effects barrel stays eager');

const sw = readFileSync(join(root, 'sw.js'), 'utf8');
for (const rel of [
    'js/views/dev_log_view.mjs',
    'js/views/creator_view.mjs',
    'js/views/story_view.mjs',
    'js/views/lobby_view.mjs'
]) {
    assert.ok(sw.includes("'" + rel + "'"), rel + ' in SW ASSETS');
}

console.log('shell_async_view_smoke: OK', ASYNC_VIEW_PILOT);
