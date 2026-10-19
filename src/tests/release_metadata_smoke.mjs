import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { DevLogs } from '../js/data/dev_logs.mjs';
import { STATE_CONTRACT_VERSION } from '../js/state/state_contract.mjs';

const rootUrl = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', rootUrl), 'utf8'));
const indexHtml = await readFile(new URL('index.html', rootUrl), 'utf8');
const changelog = await readFile(new URL('CHANGELOG.md', rootUrl), 'utf8');

const productVersion = String(packageJson.version);
const displayVersion = `V${productVersion.split('.').slice(0, 2).join('.')}`;
assert.equal(STATE_CONTRACT_VERSION, productVersion, 'state contract must match package version');
assert.match(indexHtml, new RegExp(`${displayVersion.replace('.', '\\.')} · CoC 7th Engine`));

const latestLog = DevLogs[0];
assert.ok(latestLog, 'developer log must have a latest entry');
assert.ok(String(latestLog.version).startsWith(displayVersion + ' R'));
const latestRevision = String(latestLog.version).match(/\bR\d+(?:\.\d+)?\b/)?.[0];
assert.ok(latestRevision, 'latest developer log must include an R revision');

const firstHeading = changelog.match(/^##\s+(.+)$/m)?.[1] || '';
assert.ok(firstHeading.includes(displayVersion + '-ParadoxFree'));
assert.ok(firstHeading.includes(latestRevision), 'CHANGELOG and developer log revisions must match');

console.log('release_metadata_smoke: OK', {
    productVersion,
    latestRevision
});
