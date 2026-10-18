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
    // Someone who left the party lives on only in the arc-ledger snapshot: it follows the merge too.
    const leftParty = { roster: [], arcLedger: { characterSnapshot: [{ name: ALICE, invId: idB }] } };
    reg.canonicalize(leftParty);
    assert.equal(leftParty.arcLedger.characterSnapshot[0].invId, idA, 'a snapshot-only record is canonicalized');
    assert.deepEqual(leftParty.arcLedger.characterSnapshot[0].formerInvIds, [idB]);

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
    reg.canonicalize(party);
    assert.deepEqual(party.roster.map((c) => c.invId), [idA, idB], 'both keep their ids');
    assert.equal(reg.resolve(idB), idB, 'and the merge no longer applies: one party is never one person');
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
    // A save from before the decision log (R30.3) carries formerInvIds only: the merge is still learnt.
    const r303 = JSON.parse(JSON.stringify(b.data));
    r303.roster.forEach((c) => { delete c.idDecisions; });
    const third = fresh();
    third.canonicalize(r303);
    const stale2 = legacySave('2026-02-01T00:00:00.000Z');
    stale2.data.roster[0].invId = idB;
    third.canonicalize(stale2.data);
    assert.equal(stale2.data.roster[0].invId, idA, 'a merge known only from formerInvIds still applies');
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
    reg.canonicalize(staleCopy);
    assert.equal(staleCopy.roster[0].invId, X, 'after the re-merge the old split no longer touches copies made while merged');
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

// ═══ 14. Splits travel with saves too (audit 2026-10-18 N1, N09) ═══
{
    const clock = (start) => { let t = Date.parse(start); return () => new Date(t++ * 1).toISOString(); };
    const dev1 = createIdentityRegistry({ storage: storage(), now: clock('2026-01-01T00:00:00.000Z') });
    const s1 = legacySave('2026-01-01T00:00:00.000Z'); dev1.issue(s1.data.roster, { savedAt: s1.savedAt }); dev1.observe(s1.data, { label: 'S1' });
    const s2 = legacySave('2026-02-01T00:00:00.000Z'); dev1.issue(s2.data.roster, { savedAt: s2.savedAt }); dev1.observe(s2.data, { label: 'S2' });
    const X = s1.data.roster[0].invId, Z = s2.data.roster[0].invId;
    s2.data.sceneMap.rooms[0].exploredBy = [Z];
    dev1.merge(X, Z); dev1.canonicalize(s2.data);
    const staleCopy = JSON.parse(JSON.stringify(s2.data));     // an export / other replica written while merged
    assert.equal(staleCopy.roster[0].invId, X);
    dev1.split(Z); dev1.canonicalize(s2.data);
    assert.equal(s2.data.roster[0].invId, Z);
    // Same device: the lobby scan reads the stale copy, then the split save is loaded (N09).
    dev1.observe(JSON.parse(JSON.stringify(staleCopy)), { label: 'stale' });
    const again = JSON.parse(JSON.stringify(s2.data));
    assert.equal(dev1.canonicalize(again), 0, 'a stale copy seen after a split does not undo it');
    assert.equal(again.roster[0].invId, Z);
    // Another device with an empty registry, both reading orders.
    for (const order of [['stale', 'split'], ['split', 'stale']]) {
        const dev2 = createIdentityRegistry({ storage: storage(), now: clock('2026-03-01T00:00:00.000Z') });
        const copies = { stale: JSON.parse(JSON.stringify(staleCopy)), split: JSON.parse(JSON.stringify(s2.data)) };
        for (const k of order) { dev2.canonicalize(copies[k]); dev2.observe(copies[k], { label: k }); }
        for (const k of order) dev2.canonicalize(copies[k]);
        assert.equal(copies.split.roster[0].invId, Z, `split save keeps its id on another device (${order})`);
        assert.deepEqual(copies.split.sceneMap.rooms[0].exploredBy, [Z]);
        assert.equal(copies.stale.roster[0].invId, Z, `and the stale copy follows the split (${order})`);
        assert.equal(dev2.resolve(Z), Z);
    }
}

// ═══ 15. Re-merging a split person with someone else (audit L2) ═══
{
    const reg = fresh();
    const mk = (t) => { const s = legacySave(t); reg.issue(s.data.roster, { savedAt: s.savedAt }); reg.observe(s.data, { label: t }); return s; };
    const sw = mk('2026-01-01T00:00:00.000Z'), sx = mk('2026-02-01T00:00:00.000Z'), sz = mk('2026-03-01T00:00:00.000Z');
    const W = sw.data.roster[0].invId, X = sx.data.roster[0].invId, Z = sz.data.roster[0].invId;
    reg.merge(X, Z); reg.canonicalize(sz.data);
    const stale = JSON.parse(JSON.stringify(sz.data));          // X [Z]
    reg.split(Z);
    reg.merge(W, Z);
    reg.canonicalize(stale);
    assert.equal(stale.roster[0].invId, W, 'the stale copy of Z goes to W, not stays at X');
}

// ═══ 16. A merge learnt from an imported save respects local decisions (audit L3) ═══
{
    const clock = (start) => { let t = Date.parse(start); return () => new Date(t++).toISOString(); };
    const devA = createIdentityRegistry({ storage: storage(), now: clock('2026-01-01T00:00:00.000Z') });
    const a1 = legacySave('2026-01-01T00:00:00.000Z'); devA.issue(a1.data.roster, { savedAt: a1.savedAt }); devA.observe(a1.data, { label: 'a1' });
    const a2 = legacySave('2026-02-01T00:00:00.000Z'); devA.issue(a2.data.roster, { savedAt: a2.savedAt }); devA.observe(a2.data, { label: 'a2' });
    const X = a1.data.roster[0].invId, Z = a2.data.roster[0].invId;
    devA.merge(X, Z); devA.canonicalize(a2.data);
    // Device B: the player said "not the same person" later than A's merge.
    const devB = createIdentityRegistry({ storage: storage(), now: clock('2026-06-01T00:00:00.000Z') });
    const b1 = JSON.parse(JSON.stringify(a1.data)); delete b1.roster[0].idDecisions;
    const b2 = legacySave('2026-02-01T00:00:00.000Z'); b2.data.roster[0].invId = Z;
    devB.observe(b1, { label: 'b1' }); devB.observe(b2.data, { label: 'b2' });
    devB.markDistinct(X, Z);
    const imported = JSON.parse(JSON.stringify(a2.data));        // X [Z] with A's merge decision
    devB.canonicalize(imported);
    devB.canonicalize(b2.data);
    assert.equal(b2.data.roster[0].invId, Z, 'the later "not the same person" wins over an imported earlier merge');
    assert.equal(imported.roster[0].invId, Z, 'and the imported copy is split back');
    // Two people seen in one party are never merged by a learnt decision.
    const devC = createIdentityRegistry({ storage: storage() });
    devC.observe({ roster: [{ name: ALICE, invId: X }, { name: ALICE, invId: Z }] }, { label: 'party' });
    const imp2 = JSON.parse(JSON.stringify(a2.data));
    devC.canonicalize(imp2);
    assert.equal(devC.resolve(Z), Z, 'a learnt merge of a seen-together pair does not apply');
}

// ═══ 17. The lobby scan through persistence refreshes evidence (audit L4 D18) ═══
{
    const gs = CoCStateCore.gameState;
    const api = CoCStatePersistence.create({ gameState: gs, switchScreen: () => {} }, {
        showToast: () => {}, _safeLocalStorageSetItem: (k, v) => { globalThis.localStorage.setItem(k, v); return true; },
        _pushSystemNotice: () => {}, compactChatHistory: () => {}, _formatStorageError: (_e, f) => f
    });
    const bertha = (t) => { const x = legacySave(t); x.data.roster.forEach((c) => { c.name = 'Bertha'; }); return x; };
    globalThis.localStorage.setItem('coc_save_slot2', JSON.stringify(bertha('2026-12-01T00:00:00.000Z')));
    globalThis.localStorage.setItem('coc_save_slot3', JSON.stringify(bertha('2026-12-02T00:00:00.000Z')));
    let scan = await api.scanIdentities();
    assert.equal(scan.suggestions.filter((p) => p.a.name === 'Bertha').length, 1, 'two Berthas in two slots are suggested');
    globalThis.localStorage.removeItem('coc_save_slot3');          // the player deleted slot 3
    scan = await api.scanIdentities();
    assert.equal(scan.suggestions.filter((p) => p.a.name === 'Bertha').length, 0, 'after the slot is gone, so is the suggestion');
    globalThis.localStorage.removeItem('coc_save_slot2');

    // One registry write per scan, however many saves it reads (fix list item 3).
    for (const [slot, t] of [['slot1', '2026-12-03T00:00:00.000Z'], ['slot2', '2026-12-04T00:00:00.000Z'], ['slot3', '2026-12-05T00:00:00.000Z']]) {
        globalThis.localStorage.setItem('coc_save_' + slot, JSON.stringify(bertha(t)));
    }
    const realSet = globalThis.localStorage.setItem;
    let registryWrites = 0;
    globalThis.localStorage.setItem = (k, v) => { if (k === IDENTITY_REGISTRY_KEY) registryWrites++; return realSet(k, v); };
    try { await api.scanIdentities(); } finally { globalThis.localStorage.setItem = realSet; }
    assert.equal(registryWrites, 1, 'a scan writes the registry once');

    // Sources nothing holds any more are forgotten, imports included; the open game counts (item 4).
    for (const slot of ['slot1', 'slot2', 'slot3']) globalThis.localStorage.removeItem('coc_save_' + slot);
    const imported = bertha('2026-12-06T00:00:00.000Z');
    imported.data.roster.forEach((c) => { c.name = 'Clara'; });
    api.migrateSaveData(structuredClone(imported), { label: '导入文件 clara.json' });
    const opened = bertha('2026-12-07T00:00:00.000Z');
    opened.data.roster.forEach((c) => { c.name = 'Clara'; });
    const openedSave = api.migrateSaveData(structuredClone(opened), { label: '默认模组 · 槽位 1' });
    const kept = bertha('2026-12-08T00:00:00.000Z');
    kept.data.roster.forEach((c) => { c.name = 'Clara'; });
    globalThis.localStorage.setItem('coc_save_slot3', JSON.stringify(kept));   // one Clara is really kept
    assert.equal((await api.scanIdentities()).suggestions.filter((p) => p.a.name === 'Clara').length, 0,
        'an import that was never kept and a slot that no longer exists are not evidence');
    globalThis.localStorage.removeItem('coc_save_slot3');
    gs.roster.splice(0, gs.roster.length, ...structuredClone(openedSave.data.roster));
    globalThis.localStorage.setItem('coc_save_slot2', JSON.stringify(imported));
    assert.equal((await api.scanIdentities()).suggestions.filter((p) => p.a.name === 'Clara').length, 1,
        'the game open now and a kept save are');
    gs.roster.splice(0);
    globalThis.localStorage.removeItem('coc_save_slot2');
}

// ═══ 18. Two tabs writing the registry at once lose nothing (fix list item 6) ═══
{
    const shared = storage();
    const tabA = createIdentityRegistry({ storage: shared });
    const tabB = createIdentityRegistry({ storage: shared });
    const a = legacySave('2027-01-01T00:00:00.000Z'); tabA.issue(a.data.roster, { savedAt: a.savedAt }); tabA.observe(a.data, { label: 'A' });
    const b = legacySave('2027-02-01T00:00:00.000Z'); tabA.issue(b.data.roster, { savedAt: b.savedAt }); tabA.observe(b.data, { label: 'B' });
    const c = legacySave('2027-03-01T00:00:00.000Z'); tabA.issue(c.data.roster, { savedAt: c.savedAt }); tabA.observe(c.data, { label: 'C' });
    const [A, B, C] = [a, b, c].map((x) => x.data.roster[0].invId);
    tabB.snapshot();                                              // tab B has read the registry
    tabA.merge(A, B);                                             // tab A decides; tab B has not re-read
    const d = legacySave('2027-04-01T00:00:00.000Z');
    tabB.issue(d.data.roster, { savedAt: d.savedAt });            // tab B writes from its older view
    tabB.markDistinct(A, C);
    // A true interleaving: tab C reads, tab A writes, then tab C writes from what it read.
    const staleRaw = shared.getItem(IDENTITY_REGISTRY_KEY);
    const e = legacySave('2027-05-01T00:00:00.000Z'); tabA.issue(e.data.roster, { savedAt: e.savedAt });  // A issues
    tabA.split(B);                                                                                      // and decides
    let stale = 1;                                       // C's next read sees the registry as it was before A wrote
    const lagging = { getItem: (k) => (k === IDENTITY_REGISTRY_KEY && stale > 0 && (stale--, true) ? staleRaw : shared.getItem(k)),
        setItem: (k, v) => shared.setItem(k, v), removeItem: (k) => shared.removeItem(k) };
    const tabC = createIdentityRegistry({ storage: lagging });
    const f = legacySave('2027-06-01T00:00:00.000Z');
    tabC.issue(f.data.roster, { savedAt: f.savedAt });
    const stored = createIdentityRegistry({ storage: shared }).snapshot();
    assert.equal(stored.aliases[B], undefined, 'tab A\'s split survives tab C\'s write from an older read');
    assert.ok(Object.values(stored.copies).includes(e.data.roster[0].invId), 'so does the id tab A issued');
    assert.ok(Object.values(stored.copies).includes(f.data.roster[0].invId), 'and the id tab C issued');
    assert.equal(stored.distinct[[A, C].sort().join('|')], 'user', 'tab B\'s decision is kept');
}

// ═══ 19. Decision order is causal, not each device's wall clock (audit 2026-10-18 A2) ═══
{
    // Each device: its own registry, its own storage, its own clock. A's clock runs a day fast.
    const clockAt = (start) => { let t = Date.parse(start); return { now: () => new Date(t++).toISOString(), set: (x) => { t = Date.parse(x); } }; };
    const people = (dev) => {
        const s1 = legacySave('2026-01-01T00:00:00.000Z'), s2 = legacySave('2026-02-01T00:00:00.000Z');
        for (const [s, l] of [[s1, 'S1'], [s2, 'S2']]) { dev.issue(s.data.roster, { savedAt: s.savedAt }); dev.observe(s.data, { label: l }); }
        return [s1, s2];
    };
    // 1: A (fast) merges; B, later in real time, learns it and splits.
    {
        const cA = clockAt('2026-06-02T00:00:00.000Z'), cB = clockAt('2026-06-01T00:00:00.000Z');
        const devA = createIdentityRegistry({ storage: storage(), now: cA.now });
        const [s1, s2] = people(devA);
        const X = s1.data.roster[0].invId, Z = s2.data.roster[0].invId;
        devA.merge(X, Z); devA.canonicalize(s2.data);
        const devB = createIdentityRegistry({ storage: storage(), now: cB.now });
        const onB = JSON.parse(JSON.stringify(s2.data));
        devB.canonicalize(onB); devB.observe(onB, { label: 'B' });
        assert.equal(devB.resolve(Z), X, 'fixture: B learnt A\'s merge');
        const r = devB.split(Z);
        assert.equal(r.ok, true);
        assert.equal(devB.resolve(Z), Z, 'B\'s split, made after it saw A\'s merge, takes effect though A\'s clock is ahead');
        devB.canonicalize(onB);
        assert.equal(onB.roster[0].invId, Z, 'and the save follows it');
        assert.deepEqual(devB.merges(), []);
    }
    // 2: A (fast) splits; B learns that, then merges again.
    {
        const cA = clockAt('2026-06-02T00:00:00.000Z'), cB = clockAt('2026-06-01T00:00:00.000Z');
        const devA = createIdentityRegistry({ storage: storage(), now: cA.now });
        const [s1, s2] = people(devA);
        const X = s1.data.roster[0].invId, Z = s2.data.roster[0].invId;
        devA.merge(X, Z); devA.canonicalize(s2.data); devA.split(Z); devA.canonicalize(s2.data);
        const devB = createIdentityRegistry({ storage: storage(), now: cB.now });
        const b1 = JSON.parse(JSON.stringify(s1.data)), b2 = JSON.parse(JSON.stringify(s2.data));
        for (const [d, l] of [[b1, 'b1'], [b2, 'b2']]) { devB.canonicalize(d); devB.observe(d, { label: l }); }
        assert.equal(devB.resolve(Z), Z, 'fixture: B learnt A\'s split');
        const r = devB.merge(X, Z);
        assert.equal(r.ok, true);
        assert.equal(devB.resolve(Z), X, 'B\'s merge after seeing the split takes effect');
        devB.canonicalize(b2);
        assert.equal(b2.roster[0].invId, X);
    }
    // 3: one device, its clock set back an hour between two decisions.
    {
        const c = clockAt('2026-06-01T12:00:00.000Z');
        const dev = createIdentityRegistry({ storage: storage(), now: c.now });
        const [s1, s2] = people(dev);
        const X = s1.data.roster[0].invId, Z = s2.data.roster[0].invId;
        dev.merge(X, Z);
        c.set('2026-06-01T11:00:00.000Z');
        assert.equal(dev.split(Z).ok, true);
        assert.equal(dev.resolve(Z), Z, 'a clock set back does not put the split before the merge');
        c.set('2026-06-01T10:00:00.000Z');
        dev.markDistinct(X, Z);
        assert.equal(dev.suggestions().length, 0);
        assert.equal(dev.merge(X, Z).ok, true);
        assert.equal(dev.resolve(Z), X, 'nor a merge before the "not the same person" it overrides');
        const log = dev.snapshot().log;
        assert.ok(log.every((d, i) => i === 0 || d.at !== log[i - 1].at), 'no two decisions share a time');
        // A save from a device whose clock is far ahead, its counter at six digits: decisions made
        // here afterwards still come after it (the counter compares as a number).
        const far = JSON.parse(JSON.stringify(s2.data));
        far.roster[0].invId = Z; delete far.roster[0].formerInvIds;
        far.roster[0].idDecisions = [{ id: 'd_far', op: 'split', a: Z, b: X, at: '2099-01-01T00:00:00.000Z#999999' }];
        dev.canonicalize(far);
        assert.equal(dev.resolve(Z), Z, 'fixture: the far-ahead split was learnt');
        assert.equal(dev.merge(X, Z).ok, true);
        assert.equal(dev.resolve(Z), X, 'a decision after a #999999 one still replays after it');
    }
}

// ═══ 20. Split, re-merge with a third person, split again (audit 2026-10-18 A3) ═══
{
    const reg = fresh();
    const mk = (t) => { const s = legacySave(t); reg.issue(s.data.roster, { savedAt: s.savedAt }); reg.observe(s.data, { label: t }); return s; };
    const sw = mk('2026-01-01T00:00:00.000Z'), sx = mk('2026-02-01T00:00:00.000Z'), sz = mk('2026-03-01T00:00:00.000Z');
    const W = sw.data.roster[0].invId, X = sx.data.roster[0].invId, Z = sz.data.roster[0].invId;
    const ids = (d) => [d.roster[0].invId, d.roster[0].formerInvIds || []];
    reg.merge(X, Z); reg.canonicalize(sz.data);
    const stale = JSON.parse(JSON.stringify(sz.data));
    assert.deepEqual(ids(sz.data), [X, [Z]]);
    reg.split(Z); reg.canonicalize(sz.data);
    assert.deepEqual(ids(sz.data), [Z, []]);
    reg.merge(W, Z); reg.canonicalize(sz.data);
    assert.deepEqual(ids(sz.data), [W, [Z]]);
    const settled = JSON.stringify(sz.data);
    assert.equal(reg.canonicalize(sz.data), 0, 'a second load with no new decision changes nothing');
    assert.equal(JSON.stringify(sz.data), settled);
    reg.canonicalize(stale);
    assert.deepEqual(ids(stale), [W, [Z]], 'the copy from the first merge joins the second, still splittable');
    assert.equal(reg.split(Z).ok, true);
    reg.canonicalize(sz.data); reg.canonicalize(stale);
    assert.deepEqual(ids(sz.data), [Z, []], 'the second split restores the save');
    assert.deepEqual(ids(stale), [Z, []], 'and the copy from the first merge');
}
{
    // An old split of the first id in a longer chain says nothing about the later merges.
    const reg = fresh();
    const mk = (t) => { const s = legacySave(t); reg.issue(s.data.roster, { savedAt: s.savedAt }); reg.observe(s.data, { label: t }); return s; };
    const [sp, sw, sx, sz] = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'].map((d) => mk(d + 'T00:00:00.000Z'));
    const [P, W, X, Z] = [sp, sw, sx, sz].map((s) => s.data.roster[0].invId);
    const ids = (d) => [d.roster[0].invId, d.roster[0].formerInvIds || []];
    reg.merge(X, Z); reg.split(Z);
    reg.merge(W, Z); reg.canonicalize(sz.data);
    reg.merge(P, W); reg.canonicalize(sz.data);
    assert.deepEqual(ids(sz.data), [P, [Z, W]], 'fixture: Z → W → P');
    assert.equal(reg.canonicalize(sz.data), 0, 'Z\'s split from X does not touch the chain through W');
    assert.deepEqual(ids(sz.data), [P, [Z, W]]);
    reg.split(W); reg.canonicalize(sz.data);
    assert.deepEqual(ids(sz.data), [W, [Z]], 'splitting W from P leaves Z merged into W');
}

// ═══ 21. A source forgotten by a scan stays forgotten across tabs (audit 2026-10-18 A4) ═══
{
    const shared = storage();
    const clock = (() => { let t = Date.parse('2027-01-01T00:00:00.000Z'); return () => new Date(t++).toISOString(); })();
    const tabA = createIdentityRegistry({ storage: shared, now: clock });
    const tabB = createIdentityRegistry({ storage: shared, now: clock });
    const s1 = legacySave('2026-01-01T00:00:00.000Z'), s2 = legacySave('2026-02-01T00:00:00.000Z');
    for (const [s, l] of [[s1, 'slot1'], [s2, 'slot2']]) { tabA.issue(s.data.roster, { savedAt: s.savedAt }); tabA.observe(s.data, { label: l, savedAt: s.savedAt }); }
    assert.equal(tabA.suggestions().length, 1, 'fixture: the two saves suggest a merge');
    await tabA.batch(async () => {
        tabA.forgetSources(() => true);                       // full rescan; slot2 was deleted
        tabA.observe(JSON.parse(JSON.stringify(s1.data)), { label: 'slot1', savedAt: s1.savedAt });
        // Meanwhile tab B autosaves: it writes the registry as it read it, slot2 included.
        const other = legacySave('2026-03-01T00:00:00.000Z');
        other.data.roster[0].name = 'Someone else';
        tabB.issue(other.data.roster, { savedAt: other.savedAt }); tabB.observe(other.data, { label: 'autosave', savedAt: other.savedAt });
    });
    assert.equal(tabA.suggestions().length, 0, 'the deleted slot is not evidence again after the scan');
    assert.equal(createIdentityRegistry({ storage: shared }).suggestions().length, 0, 'nor in storage');
    assert.ok(createIdentityRegistry({ storage: shared }).snapshot().people[Object.keys(tabA.snapshot().people).find((id) => tabA.snapshot().people[id].sources.autosave)],
        'tab B\'s new evidence is kept');
    // A slot written again after the scan began is new evidence, and kept.
    await tabA.batch(async () => {
        tabA.forgetSources(() => true);
        tabA.observe(JSON.parse(JSON.stringify(s1.data)), { label: 'slot1', savedAt: s1.savedAt });
        const again = JSON.parse(JSON.stringify(s2.data));
        tabB.observe(again, { label: 'slot2', savedAt: '2027-06-01T00:00:00.000Z' });
    });
    assert.equal(tabA.suggestions().length, 1, 'a slot saved after the scan started counts');
}

// ═══ 22. Two tabs issuing the same copy: the first id wins, in storage and in the copy (A7 I09) ═══
{
    const shared = storage();
    const tabA = createIdentityRegistry({ storage: shared });
    const staleRaw = shared.getItem(IDENTITY_REGISTRY_KEY);
    const copyA = legacySave('2027-08-01T00:00:00.000Z');
    tabA.issue(copyA.data.roster, { savedAt: copyA.savedAt });
    const first = copyA.data.roster[0].invId;
    let stale = 1;   // tab B reads the registry as it was before tab A issued
    const lagging = { getItem: (k) => (k === IDENTITY_REGISTRY_KEY && stale > 0 && (stale--, true) ? staleRaw : shared.getItem(k)),
        setItem: (k, v) => shared.setItem(k, v), removeItem: (k) => shared.removeItem(k) };
    const tabB = createIdentityRegistry({ storage: lagging });
    const copyB = legacySave('2027-08-01T00:00:00.000Z');    // the IndexedDB replica of the same write
    tabB.issue(copyB.data.roster, { savedAt: copyB.savedAt });
    const stored = createIdentityRegistry({ storage: shared }).snapshot();
    assert.deepEqual(Object.values(stored.copies), [first], 'the id issued first stays on the copy key');
    assert.equal(copyB.data.roster[0].invId, first, 'and the late tab\'s copy takes it: one copy, one id');
}

// ═══ 23. A registry written before the decision log (R30.3) upgrades with its decisions (A7 I16/I19/I20) ═══
{
    // Fixture: what R30.3 stored. B was merged into A and split again; C is merged into A;
    // the player said A and D are different people. No `log`; splits hold one id.
    const [A, B, C, D] = ['inv_a0000000000000a', 'inv_b0000000000000b', 'inv_c0000000000000c', 'inv_d0000000000000d'];
    const r303 = { version: 1, seq: 4, copies: {}, aliases: { [C]: A }, splits: { [B]: A },
        distinct: { [[A, D].sort().join('|')]: 'user' },
        people: Object.fromEntries([A, B, C, D].map((id, i) => [id, { order: i + 1, name: ALICE, sources: { ['s' + i]: '2026-01-01T00:00:00.000Z' } }])) };
    const store = storage();
    store.setItem(IDENTITY_REGISTRY_KEY, JSON.stringify(r303));
    const reg = createIdentityRegistry({ storage: store });
    assert.equal(reg.resolve(B), B, 'the split survives the upgrade');
    assert.equal(reg.resolve(C), A, 'so does the merge');
    assert.equal(reg.snapshot().distinct[[A, D].sort().join('|')], 'user', 'and "not the same person"');
    assert.equal(reg.snapshot().log.length, 3, 'all three became logged decisions');
    // An R30.3 copy written while B was merged: formerInvIds only, no idDecisions.
    const old = legacySave('2026-01-01T00:00:00.000Z');
    old.data.roster[0].invId = A; old.data.roster[0].formerInvIds = [B];
    reg.canonicalize(old.data);
    assert.equal(old.data.roster[0].invId, B, 'the old copy\'s implied merge is older than the split, so the split wins');
    assert.equal(reg.resolve(B), B);
    assert.equal(reg.suggestions().some((p) => [p.a.invId, p.b.invId].sort().join('|') === [A, D].sort().join('|')), false);
}

console.log('identity_registry_smoke: OK');
