#!/usr/bin/env node
/**
 * build_browser.mjs — Sync index.html boot tags + sw.js ASSETS/CACHE_NAME from asset_manifest.
 * ESM single-source: no mjs→js generation.
 *
 * Usage:
 *   node scripts/build_browser.mjs          — write sw.js + index.html boot block
 *   node scripts/build_browser.mjs --check  — exit 1 on drift (CI)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
    ROOT,
    ESM_ENTRY,
    ESM_MODULE_PATHS,
    LEGACY_SCRIPTS,
    getCacheName,
    formatIndexScriptBlock,
    formatSwAssetsArray,
    discoverUnlistedMjs,
} from './asset_manifest.mjs';

const INDEX_MARKER_START = '<!-- @generated script-tags — do not edit; run: npm run build:assets -->';
const INDEX_MARKER_END = '<!-- @generated-end script-tags -->';

function syncSwJs(checkOnly) {
    const swPath = path.join(ROOT, 'sw.js');
    let sw = fs.readFileSync(swPath, 'utf8');
    const cacheName = getCacheName();
    const cacheLine = `const CACHE_NAME = '${cacheName}';`;
    const assetsBody = formatSwAssetsArray();
    const assetsBlock = `const ASSETS = [\n${assetsBody}\n];`;

    const nextCache = sw.replace(/const CACHE_NAME = '[^']+';/, cacheLine);
    const next = nextCache.replace(/const ASSETS = \[[\s\S]*?\];/, assetsBlock);

    if (next !== sw) {
        if (!checkOnly) {
            fs.writeFileSync(swPath, next, 'utf8');
            const assetCount = (next.match(/const ASSETS = \[([\s\S]*?)\];/)?.[1].match(/'/g) || []).length;
            console.log(`WROTE sw.js (CACHE_NAME=${cacheName}, ${assetCount} quoted paths)`);
        } else {
            console.log('DRIFT sw.js');
        }
        return true;
    }
    return false;
}

function syncIndexHtml(checkOnly) {
    const indexPath = path.join(ROOT, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    if (!html.includes(INDEX_MARKER_START) || !html.includes(INDEX_MARKER_END)) {
        console.warn('WARN index.html missing @generated script-tags markers — skipping sync');
        return false;
    }
    const block = `${INDEX_MARKER_START}\n${formatIndexScriptBlock()}\n    ${INDEX_MARKER_END}`;
    const pattern = new RegExp(
        `${INDEX_MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${INDEX_MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
    );
    const next = html.replace(pattern, block);
    if (next !== html) {
        if (!checkOnly) {
            fs.writeFileSync(indexPath, next, 'utf8');
            console.log('WROTE index.html script-tags (ESM boot)');
        } else {
            console.log('DRIFT index.html');
        }
        return true;
    }
    return false;
}

function verifyEsmManifest() {
    let missing = 0;
    for (const rel of [...ESM_MODULE_PATHS, ESM_ENTRY, ...LEGACY_SCRIPTS]) {
        const full = path.join(ROOT, rel);
        if (!fs.existsSync(full)) {
            console.log(`MISSING ${rel}`);
            missing++;
        }
    }
    return missing;
}

const checkOnly = process.argv.includes('--check');
let changed = 0;

if (syncIndexHtml(checkOnly)) changed++;
if (syncSwJs(checkOnly)) changed++;

const missing = verifyEsmManifest();
if (missing > 0) {
    console.error(`build_browser: ${missing} manifest file(s) missing`);
    process.exit(1);
}

const unlisted = discoverUnlistedMjs();
if (unlisted.length) {
    console.warn(`WARN unlisted .mjs (not in ESM_MODULE_PATHS): ${unlisted.join(', ')}`);
}

console.log(`\nbuild_browser: ESM manifest ${ESM_MODULE_PATHS.length} modules, ${changed} ${checkOnly ? 'drifted' : 'written'}`);
if (checkOnly && changed > 0) process.exit(1);
