/**
 * asset_manifest.mjs — Single source of truth for browser asset lists (V18.4).
 *
 * Policy:
 *   - Runtime is native ESM only (index.html → js/app.mjs). No mjs→js transpile.
 *   - npm run build:js / build:assets syncs sw.js + index.html boot tags from this file.
 *   - ESM_MODULE_PATHS is discovered by walking js/ for .mjs so new modules are not forgotten.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..');

/** Read package.json version for SW cache busting. */
export function getPackageVersion() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    return String(pkg.version || '0.0.0');
}

/** Short hash of bundled asset sources — busts SW when content changes. */
export function getManifestContentHash() {
    const hash = crypto.createHash('sha256');
    const addFile = (rel) => {
        const full = path.join(ROOT, rel.replace(/^\//, ''));
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            hash.update(fs.readFileSync(full));
            hash.update('\0');
        }
    };
    for (const rel of ESM_MODULE_PATHS) addFile(rel);
    for (const rel of LEGACY_SCRIPTS) addFile(rel);
    addFile(ESM_ENTRY);
    addFile('css/style.css');
    addFile('index.html');
    for (const url of SW_STATIC_EXTRAS) {
        if (url.startsWith('vendor/')) addFile(url);
    }
    return hash.digest('hex').slice(0, 8);
}

/** Service Worker cache bucket — version + content hash. */
export function getCacheName() {
    return `coc-engine-v${getPackageVersion()}-${getManifestContentHash()}`;
}

/** Legacy IIFE scripts loaded via defer before ESM entry. */
export const LEGACY_SCRIPTS = [
    'js/audio/sfx.js',
];

/** ESM browser entry — sole application bootstrap. */
export const ESM_ENTRY = 'js/app.mjs';

function walkMjs(dir, out) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules') continue;
        const full = path.join(dir, ent.name);
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        if (ent.isDirectory()) walkMjs(full, out);
        else if (ent.name.endsWith('.mjs')) out.push(rel);
    }
}

/**
 * All runtime .mjs under js/ except the ESM entry (listed separately).
 * Audit helpers are included — catalog.mjs dynamic-imports them.
 */
export function collectEsmModulePaths() {
    const found = [];
    walkMjs(path.join(ROOT, 'js'), found);
    return found
        .filter((rel) => rel !== ESM_ENTRY)
        .sort();
}

export const ESM_MODULE_PATHS = collectEsmModulePaths();

/** Static paths cached by SW but not emitted as index.html script tags. */
export const SW_STATIC_EXTRAS = [
    'index.html',
    'manifest.json',
    'favicon.svg',
    'css/icons.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-512-maskable.png',
    'sw.js',
    'css/style.css',
    'vendor/vue.global.prod.js',
    'vendor/bootstrap.min.css',
    'vendor/chart.min.js',
    'vendor/pdf.min.js',
    'vendor/pdf.worker.min.js',
    'vendor/anime.umd.min.js',
    'js/data/scenarios/packages/isolated_lab.json',
    'js/data/scenarios/packages/haunted_inheritance.json',
    'js/data/scenarios/packages/cc_asylum_whispers.json',
    'js/data/scenarios/packages/cc_lighthouse_log.json',
    'js/data/scenarios/packages/cc_museum_night.json',
    'js/data/scenarios/packages/cc_green_vicar.json',
    'js/data/scenarios/packages/cc_white_widow_reef.json',
    'js/data/scenarios/packages/cc_mayvale_blizzard.json',
];

/** Build ordered SW ASSETS list (deduped, stable order). */
export function getSwAssets() {
    const preload = [
        ...SW_STATIC_EXTRAS,
        ...LEGACY_SCRIPTS,
        ESM_ENTRY,
        ...ESM_MODULE_PATHS,
    ];
    const seen = new Set();
    const out = [];
    for (const url of preload) {
        const norm = url.replace(/\\/g, '/');
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push(norm);
    }
    return out;
}

/** Format index.html boot script block (ESM + legacy defer). */
export function formatIndexScriptBlock() {
    const lines = [
        ...LEGACY_SCRIPTS.map((p) => `    <script defer src="./${p}"></script>`),
        `    <script type="module" src="./${ESM_ENTRY}"></script>`,
    ];
    return lines.join('\n');
}

/** Format sw.js ASSETS array body. */
export function formatSwAssetsArray() {
    return getSwAssets().map((u) => `    '${u}',`).join('\n');
}

/**
 * Discover .mjs files under js/ not listed in ESM_MODULE_PATHS (should be empty with auto-walk).
 * @returns {string[]} relative paths
 */
export function discoverUnlistedMjs() {
    const listed = new Set([...ESM_MODULE_PATHS, ESM_ENTRY].map((p) => p.replace(/\\/g, '/')));
    const found = [];
    walkMjs(path.join(ROOT, 'js'), found);
    return found.filter((rel) => !listed.has(rel)).sort();
}
