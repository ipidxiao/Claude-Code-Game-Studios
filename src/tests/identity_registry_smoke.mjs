/**
 * ADR-0003 §1.1 investigator identity registry.
 *
 * The defect this guards: one investigator stored in several copies that carry no invId (old
 * saves, their localStorage / IndexedDB replicas, exports) was issued a different id in each copy.
 * Copies of one write must get one id automatically; copies of different writes get one id only
 * when the player confirms the merge, and a merge can be split again.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

const storage = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
};
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
globalThis.window = globalThis.window || {};
globalThis.window.Vue = { reactive: (o) => o, ref: (v) => ({ value: v }), nextTick: (fn) => fn && fn() };

const { createIdentityRegistry, remapInvIds, IDENTITY_REGISTRY_KEY } = await import('../js/state/identity_registry.mjs');
const { CoCStateCore } = await import('../js/state/core.mjs');
const { CoCStatePersistence } = await import('../js/state/persistence.mjs');

const fixture = JSON.parse(await readFile(new URL('./fixtures/r29_17_save.json', import.meta.url), 'utf8'));
const legacySave = (savedAt, extra = {}) => {
    const s = structuredClone(fixture);
    s.savedAt = savedAt;
    s.data.roster.forEach((c) => { delete c.invId; Object.assign(c, extra); });
    s.data.sceneMap = { title: 't', rooms: [{ id: 'r1', status: 'explored' }], currentRoomId: 'r1' };
    return s;
};
const ALICE = fixture.data.roster[0].name;
const fresh = () => createIdentityRegistry({ storage: storage(), now: (() => { let t = 0; return () => new Date(Date.UTC(2026, 0, 1, 0, 0, t++)).toISOString(); })() });

// ═══ 1. Copies of one write share one id — automatically, across registry instances ═══
{
    const store = storage();
    const regA = createIdentityRegistry({ storage: store });
    const localReplica = legacySave('2026-01-01T00:00:00.000Z');
    const idbReplica = legacySave('2026-01-01T00:00:00.000Z');
    assert.equal(regA.issue(localReplica.data.roster, { savedAt: localReplica.savedAt }), 1, 'the legacy record is issued an id');
    const regB = createIdentityRegistry({ storage: store });   // e.g. after a page reload
    regB.issue(idbReplica.data.roster, { savedAt: idbReplica.savedAt });
    assert.match(localReplica.data.roster[0].invId, /^inv_/);
    assert.equal(idbReplica.data.roster[0].invId, localReplica.data.roster[0].invId,
        'the other replica of the same write gets the id issued to the first');
    const exported = JSON.parse(JSON.stringify(legacySave('2026-01-01T00:00:00.000Z')));
    regB.issue(exported.data.roster, { savedAt: exported.savedAt });
    assert.equal(exported.data.roster[0].invId, localReplica.data.roster[0].invId, 'so does an exported copy');
}

// ═══ 2. Different writes are never merged by guess ═══
{
    const reg = fresh();
    const a = legacySave('2026-01-01T00:00:00.000Z');
    const b = legacySave('2026-02-01T00:00:00.000Z', { jobName: '记者' });
    reg.issue(a.data.roster, { savedAt: a.savedAt }); reg.observe(a.data, { label: 'A', savedAt: a.savedAt });
    reg.issue(b.data.roster, { savedAt: b.savedAt }); reg.observe(b.data, { label: 'B', savedAt: b.savedAt });
    assert.notEqual(a.data.roster[0].invId, b.data.roster[0].invId, 'same name in two unrelated saves is not assumed to be one person');
    const sug = reg.suggestions();
    assert.equal(sug.length, 1, 'but the pair is put to the player');
    assert.deepEqual([sug[0].a.name, sug[0].b.name], [ALICE, ALICE]);
    assert.ok(sug[0].a.sources && sug[0].b.sources, 'with the sources each was seen in');
}

// ═══ 3. Merge rewrites every reference; split restores them ═══
{
    const reg = fresh();
    const a = legacySave('2026-01-01T00:00:00.000Z');
    const b = legacySave('2026-02-01T00:00:00.000Z');
    reg.issue(a.data.roster, { savedAt: a.savedAt }); reg.observe(a.data, { label: 'A' });
    reg.issue(b.data.roster, { savedAt: b.savedAt }); reg.observe(b.data, { label: 'B' });
    const idA = a.data.roster[0].invId, idB = b.data.roster[0].invId;
    b.data.sceneMap.rooms[0].exploredBy = [idB];
    b.data.journalLog = [{ type: 'note', text: 'x', vis: { to: [idB] } }];
    b.data.arcLedger = { characterSnapshot: [{ name: ALICE, invId: idB }] };
    const m = reg.merge(idA, idB);
    assert.deepEqual(m, { ok: true, canonical: idA, merged: idB }, 'the identity seen first stays canonical');
    assert.equal(reg.suggestions().length, 0, 'a merged pair is no longer suggested');
    assert.equal(reg.canonicalize(b.data), 2, 'roster record and ledger snapshot change id');
    assert.equal(b.data.roster[0].invId, idA);
    assert.deepEqual(b.data.roster[0].formerInvIds, [idB], 'the former id is kept so the merge can be split');
    assert.deepEqual(b.data.sceneMap.rooms[0].exploredBy, [idA], 'exploredBy follows');
    assert.deepEqual(b.data.journalLog[0].vis.to, [idA], 'vis.to follows');
    assert.equal(b.data.arcLedger.characterSnapshot[0].invId, idA, 'the ledger snapshot follows');
    assert.equal(reg.canonicalize(b.data), 0, 'canonicalize is idempotent');

    assert.equal(reg.split(idB), true);
    assert.equal(reg.canonicalize(b.data), 2, 'after a split the save gets its own id back');
    assert.equal(b.data.roster[0].invId, idB);
    assert.equal(b.data.roster[0].formerInvIds, undefined);
    assert.deepEqual(b.data.sceneMap.rooms[0].exploredBy, [idB]);
    assert.deepEqual(b.data.journalLog[0].vis.to, [idB]);
    assert.equal(reg.suggestions().length, 0, 'a split pair is not suggested again');
}

// ═══ 4. Two people in one party are never one person ═══
{
    const reg = fresh();
    const s = legacySave('2026-03-01T00:00:00.000Z');
    s.data.roster.push(Object.assign(structuredClone(s.data.roster[0]), { player: 'twin' }));
    reg.issue(s.data.roster, { savedAt: s.savedAt }); reg.observe(s.data, { label: 'S' });
    const [x, y] = s.data.roster.map((c) => c.invId);
    assert.notEqual(x, y);
    assert.equal(reg.suggestions().length, 0, 'same-name party members are not suggested');
    assert.deepEqual(reg.merge(x, y), { ok: false, reason: 'seen-together' }, 'and cannot be merged');
}

// ═══ 5. "Not the same person" is remembered ═══
{
    const reg = fresh();
    const a = legacySave('2026-01-01T00:00:00.000Z'); reg.issue(a.data.roster, { savedAt: a.savedAt }); reg.observe(a.data, {});
    const b = legacySave('2026-02-01T00:00:00.000Z'); reg.issue(b.data.roster, { savedAt: b.savedAt }); reg.observe(b.data, {});
    assert.equal(reg.markDistinct(a.data.roster[0].invId, b.data.roster[0].invId), true);
    assert.equal(reg.suggestions().length, 0);
}

// ═══ 6. A merge never collapses two records of one roster ═══
{
    const reg = fresh();
    const a = legacySave('2026-01-01T00:00:00.000Z'); reg.issue(a.data.roster, { savedAt: a.savedAt }); reg.observe(a.data, {});
    const b = legacySave('2026-02-01T00:00:00.000Z'); reg.issue(b.data.roster, { savedAt: b.savedAt }); reg.observe(b.data, {});
    const idA = a.data.roster[0].invId, idB = b.data.roster[0].invId;
    reg.merge(idA, idB);
    const party = { roster: [{ name: ALICE, invId: idA }, { name: ALICE + '2', invId: idB }] };
    assert.equal(reg.canonicalize(party), 0);
    assert.deepEqual(party.roster.map((c) => c.invId), [idA, idB], 'both keep their ids');
}

// ═══ 7. remapInvIds covers fields it was not told about ═══
{
    const d = { x: { y: [{ invId: 'old' }] }, formerInvIds: ['old'] };
    assert.equal(remapInvIds(d, new Map([['old', 'new']])), 1);
    assert.equal(d.x.y[0].invId, 'new');
    assert.deepEqual(d.formerInvIds, ['old'], 'formerInvIds is history and is not rewritten');
}

// ═══ 8. End to end through persistence: decode, merge, reload ═══
{
    const gs = CoCStateCore.gameState;
    const notices = [];
    const api = CoCStatePersistence.create({ gameState: gs, switchScreen: () => {} }, {
        showToast: () => {}, _safeLocalStorageSetItem: () => true, _pushSystemNotice: (t) => notices.push(t),
        compactChatHistory: () => {}, _formatStorageError: (_e, f) => f
    });
    const slot1 = legacySave('2026-04-01T00:00:00.000Z');
    const slot2 = legacySave('2026-05-01T00:00:00.000Z');
    const m1 = api.migrateSaveData(structuredClone(slot1), { label: '默认模组 · 槽位 1' });
    const m1again = api.migrateSaveData(structuredClone(slot1), { label: '默认模组 · 槽位 1' });
    assert.equal(m1again.data.roster[0].invId, m1.data.roster[0].invId, 'decoding the unsaved legacy copy twice gives one id');
    const m2 = api.migrateSaveData(structuredClone(slot2), { label: '默认模组 · 槽位 2' });
    assert.ok(m2._idsChanged > 0);
    const id1 = m1.data.roster[0].invId, id2 = m2.data.roster[0].invId;
    assert.notEqual(id1, id2);
    const stored = JSON.parse(globalThis.localStorage.getItem(IDENTITY_REGISTRY_KEY));
    assert.ok(stored && stored.people[id1] && stored.people[id2], 'the device registry holds both');
    assert.ok(Object.keys(stored.people[id2].sources).includes('默认模组 · 槽位 2'), 'with where each was seen');

    const res = api.mergeIdentities(id2, id1);
    assert.equal(res.ok, true);
    assert.equal(res.canonical, id1, 'first seen stays canonical whichever order the player picks');
    const reloaded = api.migrateSaveData(JSON.parse(JSON.stringify(m2)), { label: '默认模组 · 槽位 2' });
    assert.equal(reloaded.data.roster[0].invId, id1, 'the next load of slot 2 reads the merged id');
    assert.ok(reloaded._idsChanged > 0, 'and reports a change, so loadGame writes it back');
    assert.deepEqual(reloaded.data.sceneMap.rooms[0].exploredBy, [id1]);
    assert.equal(notices.length, 0);
}

console.log('identity_registry_smoke: OK');
