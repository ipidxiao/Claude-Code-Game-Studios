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
    assert.deepEqual(m, { ok: true, saved: true, canonical: idA, merged: idB }, 'the identity seen first stays canonical');
    assert.equal(reg.suggestions().length, 0, 'a merged pair is no longer suggested');
    assert.equal(reg.canonicalize(b.data), 2, 'roster record and ledger snapshot change id');
    assert.equal(b.data.roster[0].invId, idA);
    assert.deepEqual(b.data.roster[0].formerInvIds, [idB], 'the former id is kept so the merge can be split');
    assert.deepEqual(b.data.sceneMap.rooms[0].exploredBy, [idA], 'exploredBy follows');
    assert.deepEqual(b.data.journalLog[0].vis.to, [idA], 'vis.to follows');
    assert.equal(b.data.arcLedger.characterSnapshot[0].invId, idA, 'the ledger snapshot follows');
    assert.equal(reg.canonicalize(b.data), 0, 'canonicalize is idempotent');

    assert.deepEqual(reg.split(idB), { ok: true, saved: true });
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
    assert.deepEqual(reg.markDistinct(a.data.roster[0].invId, b.data.roster[0].invId), { ok: true, saved: true });
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

// ═══ 9. A lost registry never undoes a merge; the save teaches it back (review F1) ═══
{
    const reg = fresh();
    const a = legacySave('2026-01-01T00:00:00.000Z'); reg.issue(a.data.roster, { savedAt: a.savedAt }); reg.observe(a.data, { label: 'A' });
    const b = legacySave('2026-02-01T00:00:00.000Z'); reg.issue(b.data.roster, { savedAt: b.savedAt }); reg.observe(b.data, { label: 'B' });
    const idA = a.data.roster[0].invId, idB = b.data.roster[0].invId;
    b.data.sceneMap.rooms[0].exploredBy = [idB];
    reg.merge(idA, idB);
    reg.canonicalize(b.data);                                   // written back: idA, formerInvIds [idB]
    const writtenBack = JSON.parse(JSON.stringify(b.data));
    const other = fresh();                                      // another device / cleared browser data
    assert.equal(other.canonicalize(writtenBack), 0, 'an empty registry changes nothing');
    assert.equal(writtenBack.roster[0].invId, idA, 'the merged id stays');
    assert.deepEqual(writtenBack.sceneMap.rooms[0].exploredBy, [idA], 'and so do its references');
    other.observe(writtenBack, { label: 'B' });
    assert.equal(other.resolve(idB), idA, 'the merge is learnt from the save');
    const stale = legacySave('2026-02-01T00:00:00.000Z');       // an unloaded copy of the old id on that device
    stale.data.roster[0].invId = idB;
    assert.equal(other.canonicalize(stale.data), 1);
    assert.equal(stale.data.roster[0].invId, idA, 'other copies of the merged person follow');
}

// ═══ 10. Splits inside a chain of merges (review F5) ═══
{
    const reg = fresh();
    const mk = (t) => { const s = legacySave(t); reg.issue(s.data.roster, { savedAt: s.savedAt }); reg.observe(s.data, { label: t }); return s; };
    const sx = mk('2026-01-01T00:00:00.000Z'), sy = mk('2026-02-01T00:00:00.000Z'), sz = mk('2026-03-01T00:00:00.000Z');
    const X = sx.data.roster[0].invId, Y = sy.data.roster[0].invId, Z = sz.data.roster[0].invId;
    reg.merge(Y, Z);  reg.canonicalize(sz.data);               // Z → Y, saveZ former [Z]
    reg.merge(X, Y);  reg.canonicalize(sz.data); reg.canonicalize(sy.data);   // saveZ former [Z, Y], saveY former [Y]
    assert.equal(sz.data.roster[0].invId, X);
    assert.deepEqual(sz.data.roster[0].formerInvIds, [Z, Y]);
    const staleCopy = JSON.parse(JSON.stringify(sz.data));      // e.g. an export made while merged
    assert.equal(reg.split(Z).ok, true);
    reg.canonicalize(sz.data); reg.canonicalize(sy.data);
    assert.equal(sz.data.roster[0].invId, Z, 'splitting the first link restores that save');
    assert.equal(sz.data.roster[0].formerInvIds, undefined);
    assert.equal(sy.data.roster[0].invId, X, 'the rest of the chain stays merged');
    assert.ok(!reg.suggestions().some((p) => [p.a.invId, p.b.invId].includes(Z)), 'the split person is not suggested again');
    assert.equal(reg.merge(X, Z).ok, true, 'and can be merged again later');
    reg.canonicalize(sz.data);
    assert.equal(sz.data.roster[0].invId, X);
    assert.equal(reg.canonicalize(staleCopy), 0, 'after the re-merge the old split no longer touches copies made while merged');
    assert.deepEqual(staleCopy.roster[0].formerInvIds, [Z, Y]);
}

// ═══ 11. Storage full, corrupt or missing (review F4) ═══
{
    const full = storage();
    const reg = createIdentityRegistry({ storage: full });
    const earlier = legacySave('2026-05-01T00:00:00.000Z'); reg.issue(earlier.data.roster, { savedAt: earlier.savedAt });
    assert.ok(full.getItem(IDENTITY_REGISTRY_KEY), 'fixture: storage holds an older registry');
    full.setItem = () => { throw new Error('QuotaExceededError'); };
    const r1 = legacySave('2026-06-01T00:00:00.000Z'), r2 = legacySave('2026-06-01T00:00:00.000Z');
    reg.issue(r1.data.roster, { savedAt: r1.savedAt });
    reg.issue(r2.data.roster, { savedAt: r2.savedAt });
    assert.equal(r2.data.roster[0].invId, r1.data.roster[0].invId, 'with storage full, replicas of one write still share an id');
    const o = legacySave('2026-07-01T00:00:00.000Z'); reg.issue(o.data.roster, { savedAt: o.savedAt }); reg.observe(o.data, { label: 'O' });
    reg.observe(r1.data, { label: 'R' });
    assert.equal(reg.merge(r1.data.roster[0].invId, o.data.roster[0].invId).saved, false, 'the panel learns the merge was not stored');

    const bad = storage();
    bad.setItem(IDENTITY_REGISTRY_KEY, '{corrupt');
    const reg2 = createIdentityRegistry({ storage: bad });
    const c = legacySave('2026-08-01T00:00:00.000Z'); reg2.issue(c.data.roster, { savedAt: c.savedAt });
    const copies = [...bad._m.keys()].filter((k) => k.startsWith(IDENTITY_REGISTRY_KEY + '.bad-'));
    assert.equal(copies.length, 1, 'a corrupt registry is copied aside before it is rebuilt');
    assert.equal(bad.getItem(copies[0]), '{corrupt');
}

// ═══ 12. Identical records in one roster, and saves without savedAt (review F7: R9, R15) ═══
{
    const reg = fresh();
    const twin = () => { const s = legacySave('2026-09-01T00:00:00.000Z'); s.data.roster.push(structuredClone(s.data.roster[0])); return s; };
    const p1 = twin(), p2 = twin();
    reg.issue(p1.data.roster, { savedAt: p1.savedAt });
    reg.issue(p2.data.roster, { savedAt: p2.savedAt });
    assert.notEqual(p1.data.roster[0].invId, p1.data.roster[1].invId, 'two identical records are two people');
    assert.deepEqual(p2.data.roster.map((c) => c.invId), p1.data.roster.map((c) => c.invId), 'and keep their own ids in the other replica');
    const n1 = legacySave(undefined), n2 = legacySave(undefined);
    delete n1.savedAt; delete n2.savedAt;
    reg.issue(n1.data.roster, {}); reg.issue(n2.data.roster, {});
    assert.notEqual(n1.data.roster[0].invId, n2.data.roster[0].invId, 'without a write stamp, identical content is not proof of one person');
}

// ═══ 13. Merging while a game is open; stale sources are forgotten (review F7 R11/12/20, F8) ═══
{
    const gs = CoCStateCore.gameState;
    const api = CoCStatePersistence.create({ gameState: gs, switchScreen: () => {} }, {
        showToast: () => {}, _safeLocalStorageSetItem: () => true, _pushSystemNotice: () => {},
        compactChatHistory: () => {}, _formatStorageError: (_e, f) => f
    });
    const s1 = api.migrateSaveData(legacySave('2026-10-01T00:00:00.000Z'), { label: '默认模组 · 槽位 1' });
    const s2 = api.migrateSaveData(legacySave('2026-10-02T00:00:00.000Z'), { label: '默认模组 · 槽位 2' });
    const id1 = s1.data.roster[0].invId, id2 = s2.data.roster[0].invId;
    gs.roster.splice(0, gs.roster.length, ...structuredClone(s2.data.roster));
    gs.sceneMap = { title: 't', rooms: [{ id: 'r1', status: 'explored', exploredBy: [id2] }], currentRoomId: 'r1' };
    assert.equal(api.mergeIdentities(id1, id2).ok, true);
    assert.equal(gs.roster[0].invId, id1, 'the open game is rewritten at once');
    assert.deepEqual(gs.sceneMap.rooms[0].exploredBy, [id1]);
    assert.equal(api.splitIdentity(id2).ok, true);
    assert.equal(gs.roster[0].invId, id2, 'and a split applies at once too');
    gs.roster.splice(0);
}
{
    const reg = fresh();
    const a = legacySave('2026-11-01T00:00:00.000Z'); reg.issue(a.data.roster, { savedAt: a.savedAt }); reg.observe(a.data, { label: '默认模组 · 槽位 1' });
    const b = legacySave('2026-11-02T00:00:00.000Z'); reg.issue(b.data.roster, { savedAt: b.savedAt }); reg.observe(b.data, { label: '默认模组 · 槽位 2' });
    assert.equal(reg.suggestions().length, 1);
    reg.forgetSources((l) => l.endsWith('槽位 2'));             // slot 2 was overwritten; the scan did not see her again
    assert.equal(reg.suggestions().length, 0, 'a person no save contains any more is not suggested');
}

console.log('identity_registry_smoke: OK');
