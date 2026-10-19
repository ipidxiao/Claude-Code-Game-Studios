/**
 * Robustness gap smoke — catalog base validation.
 */
import { strict as assert } from 'node:assert';

const mem = new Map();
globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); }
};
globalThis.window = globalThis;

const { CoCScenarioStore } = await import('../js/scenario/store.mjs');

assert.equal(CoCScenarioStore.setPublicCatalogBase('javascript:alert(1)').ok, false);
assert.equal(CoCScenarioStore.setPublicCatalogBase('http://evil.example/').ok, false);
assert.equal(CoCScenarioStore.setPublicCatalogBase('ftp://x/').ok, false);
const okHttps = CoCScenarioStore.setPublicCatalogBase('https://example.com/coc');
assert.equal(okHttps.ok, true);
assert.equal(okHttps.value, 'https://example.com/coc/');
assert.equal(CoCScenarioStore.getPublicCatalogBase(), 'https://example.com/coc/');
assert.equal(CoCScenarioStore.setPublicCatalogBase('http://localhost:8080/x').ok, true);
assert.equal(CoCScenarioStore.setPublicCatalogBase('').ok, true);
assert.equal(CoCScenarioStore.getPublicCatalogBase(), '');
assert.equal(globalThis.CoCScenarioRemoteCatalog, undefined);
const listed = CoCScenarioStore.listCatalog();
assert.ok(listed.some((entry) => entry.id === 'isolated_lab'), 'remote catalog must resolve without window');
assert.equal(globalThis.CoCScenarioPdfImport, undefined);
await assert.rejects(
    () => CoCScenarioStore.importOfficialOneClick('chaosium_quickstart_haunting', null, {
        arrayBuffer: new ArrayBuffer(0),
        forceRuleBased: true
    }),
    /PDF 数据为空/
);

console.log('robustness_gap_smoke: OK');
