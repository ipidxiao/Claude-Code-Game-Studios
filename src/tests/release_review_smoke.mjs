/**
 * Release-review surface: no CDN boot scripts, privacy copy, safe-area viewport.
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const indexHtml = read('index.html');
const lobby = read('js/views/lobby_view.mjs');
const css = read('css/style.css');

for (const host of ['unpkg.com', 'jsdelivr.net', 'cdnjs.cloudflare.com']) {
    assert.equal(indexHtml.includes(host), false, host);
}
// No runtime module may load code from a CDN (e.g. a pdf.js fallback when ./vendor is missing).
// dev_logs.mjs only records history as prose, so it is exempt.
const CDN_HOSTS = ['unpkg.com', 'jsdelivr.net', 'cdnjs.cloudflare.com'];
const walkJs = (dir) => readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walkJs(p);
    return /\.(mjs|js)$/.test(name) ? [p] : [];
});
for (const file of walkJs(join(root, 'js'))) {
    const rel = relative(root, file).split('\\').join('/');
    if (rel === 'js/data/dev_logs.mjs') continue;
    const src = readFileSync(file, 'utf8');
    for (const host of CDN_HOSTS) {
        assert.equal(src.includes(host), false, `${rel} must not reference ${host}`);
    }
}
// Every local file index.html points at must exist (V18.4 Audit: ghost icon-180.png).
for (const m of indexHtml.matchAll(/\b(?:src|href)\s*=\s*"([^"#?]+)"/g)) {
    const ref = m[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(ref)) continue;
    assert.ok(existsSync(join(root, ref.replace(/^\.\//, ''))), `index.html references a missing file: ${ref}`);
}
assert.ok(indexHtml.includes('viewport-fit=cover'));
assert.ok(indexHtml.includes('./vendor/vue.global.prod.js'));
assert.ok(indexHtml.includes('./vendor/chart.min.js'));
assert.ok(indexHtml.includes('./vendor/pdf.min.js'));
assert.ok(indexHtml.includes('./vendor/anime.umd.min.js'));
assert.ok(lobby.includes('行动、角色姓名和密钥会发送到接口地址中的主机'));
assert.ok(css.includes('padding-top: env(safe-area-inset-top, 0px)'));

console.log('release_review_smoke: OK');
