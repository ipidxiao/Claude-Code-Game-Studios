/**
 * Room rules (design/gdd/server-and-room.md §2–§4, Acceptance Criteria 4–10) on fake connections.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createRoom } from '../lib/room.mjs';
import { loadConfig } from '../config.mjs';

const memoryStore = () => {
    let data = null;
    return { load: () => (data ? JSON.parse(data) : null), save: (o) => { data = JSON.stringify(o); }, remove: () => { data = null; }, raw: () => data };
};
const conn = (viaKeeperPort = false) => {
    const c = { viaKeeperPort, inbox: [], closed: false };
    c.send = (t) => c.inbox.push(JSON.parse(t));
    c.close = () => { c.closed = true; };
    c.last = (op) => [...c.inbox].reverse().find((m) => m.op === op);
    c.envelopes = (pred = () => true) => c.inbox.filter((m) => m.v === 1 && pred(m));
    return c;
};
const setup = (cfg = {}) => {
    const store = memoryStore();
    const config = loadConfig(Object.assign({ REPLAY_LIMIT: 5, MAX_MEMBERS: 8, MAX_MESSAGE_BYTES: 1024 }, cfg));
    const room = createRoom({ config, store });
    const k = conn(true);
    room.handle(k, JSON.stringify({ op: 'create', epoch: 'e1' }));
    const created = k.last('joined');
    const join = (credential, extra = {}, via = false) => {
        const c = conn(via);
        room.handle(c, JSON.stringify(Object.assign({ op: 'join', credential, name: 'p' }, extra)));
        return c;
    };
    return { store, config, room, k, created, join };
};
const env = (o) => JSON.stringify(Object.assign({ v: 1, epoch: 'e1', body: { x: 1 } }, o));

test('only a keeper-port page can open a room; the creator is the keeper', () => {
    const store = memoryStore();
    const room = createRoom({ config: loadConfig(), store });
    const lan = conn(false);
    room.handle(lan, JSON.stringify({ op: 'create' }));
    assert.equal(lan.last('error').code, 'keeper_port_only');
    const { created } = setup();
    assert.equal(created.memberId, 'keeper');
    assert.match(created.roomKey, /^[0-9a-f]{32}$/, '128-bit room key');
    assert.match(created.invite, /^[0-9a-f]{32}$/);
    assert.notEqual(created.roomKey, created.invite);
});

test('invite joins as guest, room key as developer; secrets are stored only as hashes', () => {
    const { created, join, store } = setup();
    const g = join(created.invite);
    const d = join(created.roomKey);
    assert.equal(g.last('joined').role, 'guest');
    assert.equal(d.last('joined').role, 'developer');
    assert.notEqual(d.last('joined').memberId, 'keeper', 'a remote room-key join is not the keeper');
    const raw = store.raw();
    for (const s of [created.roomKey, created.invite, created.token, g.last('joined').token, d.last('joined').token]) {
        assert.ok(!raw.includes(s), 'no plaintext credential in room.json');
    }
    assert.equal(join('nope').last('error').code, 'bad_credential');
});

test('from is overwritten and guests may only send requests to the keeper', () => {
    const { room, k, created, join } = setup();
    const g = join(created.invite);
    const other = join(created.invite);
    const gid = g.last('joined').memberId;
    const otherId = other.last('joined').memberId;
    g.inbox.length = 0; other.inbox.length = 0; k.inbox.length = 0;
    room_send(g, { kind: 'state', from: 'keeper', to: 'all' });
    room_send(g, { kind: 'request', to: [otherId] });
    room_send(g, { kind: 'event', to: 'keeper' });
    assert.equal(other.envelopes().length, 0, 'forged / direct messages reach nobody');
    assert.equal(k.envelopes().length, 0);
    room_send(g, { kind: 'request', from: 'keeper', to: 'keeper' });
    const got = k.envelopes();
    assert.equal(got.length, 1);
    assert.equal(got[0].from, gid, 'from is the connection identity');
    function room_send(c, o) { room.handle(c, env(o)); }
});

test('to:all is for system messages only; keeper content goes per recipient', () => {
    const { room, k, created, join } = setup();
    const a = join(created.invite), b = join(created.invite);
    const aid = a.last('joined').memberId;
    a.inbox.length = 0; b.inbox.length = 0;
    room.handle(k, env({ kind: 'state', to: 'all' }));
    assert.equal(a.envelopes().length + b.envelopes().length, 0, 'narration to all is rejected');
    room.handle(k, env({ kind: 'state', to: [aid], body: { secret: 88 } }));
    assert.equal(a.envelopes((m) => m.kind === 'state').length, 1);
    assert.equal(b.envelopes((m) => m.kind === 'state').length, 0, 'only the addressee receives it');
    room.handle(k, env({ kind: 'system', to: 'all', body: { type: 'vote' } }));
    assert.equal(b.envelopes((m) => m.kind === 'system' && m.body.type === 'vote').length, 1);
});

test('the body is never read: binary garbage in body is forwarded unchanged', () => {
    const { room, k, created, join } = setup();
    const a = join(created.invite);
    const aid = a.last('joined').memberId;
    const body = '\u0000￿{not json';
    room.handle(k, env({ kind: 'event', to: [aid], body }));
    assert.equal(a.envelopes((m) => m.kind === 'event')[0].body, body);
});

test('dseq is continuous per recipient and replay covers a short disconnect', () => {
    const { room, k, created, join } = setup();
    const a = join(created.invite);
    const j = a.last('joined');
    const aid = j.memberId;
    room.handle(k, env({ kind: 'event', to: [aid], body: 1 }));
    const seen = a.envelopes().map((m) => m.dseq);
    assert.deepEqual(seen, seen.map((_, i) => seen[0] + i), 'continuous');
    const lastDseq = seen[seen.length - 1];
    room.leave(a);
    room.handle(k, env({ kind: 'event', to: [aid], body: 2 }));
    room.handle(k, env({ kind: 'event', to: [aid], body: 3 }));
    const a2 = conn(false);
    room.handle(a2, JSON.stringify({ op: 'join', token: j.token, boot: j.boot, epoch: 'e1', lastDseq }));
    const replayed = a2.envelopes((m) => m.kind === 'event').map((m) => m.body);
    assert.deepEqual(replayed, [2, 3], 'missed messages are replayed');
    const all = a2.envelopes().map((m) => m.dseq);
    assert.equal(all[0], lastDseq + 1, 'and continue the sequence');
});

test('a gap the buffer cannot cover, a new epoch or a new boot asks the keeper for a snapshot', () => {
    const { room, k, created, join } = setup({ REPLAY_LIMIT: 2 });
    const a = join(created.invite);
    const j = a.last('joined');
    room.leave(a);
    for (let i = 0; i < 6; i++) room.handle(k, env({ kind: 'event', to: [j.memberId], body: i }));
    k.inbox.length = 0;
    const a2 = conn(false);
    room.handle(a2, JSON.stringify({ op: 'join', token: j.token, boot: j.boot, epoch: 'e1', lastDseq: 1 }));
    assert.ok(k.envelopes((m) => m.body && m.body.type === 'snapshot_needed' && m.body.memberIds.includes(j.memberId)).length, 'buffer gap');
    k.inbox.length = 0;
    const a3 = conn(false);
    room.handle(a3, JSON.stringify({ op: 'join', token: j.token, boot: 'other', epoch: 'e1', lastDseq: 1 }));
    assert.ok(k.envelopes((m) => m.body && m.body.type === 'snapshot_needed').length, 'relay restarted');
    // keeper reload: new epoch → snapshot for everyone
    k.inbox.length = 0;
    const k2 = conn(true);
    room.handle(k2, JSON.stringify({ op: 'join', token: created.token, epoch: 'e2' }));
    assert.equal(k2.last('joined').memberId, 'keeper');
    assert.ok(k2.envelopes((m) => m.body && m.body.type === 'snapshot_needed' && m.body.memberIds.includes(j.memberId)).length);
});

test('a new member triggers a snapshot request', () => {
    const { k, created, join } = setup();
    const a = join(created.invite);
    assert.ok(k.envelopes((m) => m.body && m.body.type === 'snapshot_needed' && m.body.memberIds[0] === a.last('joined').memberId).length);
});

test('keeper offline: requests are refused, remote developers cannot take the seat, localhost can reclaim it', () => {
    const { room, k, created, join } = setup();
    const g = join(created.invite);
    room.leave(k);
    assert.equal(room.state, 'waiting');
    room.handle(g, env({ kind: 'request', to: 'keeper' }));
    assert.equal(g.last('error').code, 'keeper_offline');
    const remote = join(created.roomKey);
    assert.equal(remote.last('joined').memberId !== 'keeper', true);
    assert.equal(room.state, 'waiting', 'a remote developer does not become the keeper');
    const local = join(created.roomKey, {}, true);
    assert.equal(local.last('joined').memberId, 'keeper', 'the person at the server machine reclaims the seat');
    assert.equal(room.state, 'live');
    const stale = conn(true);
    room.handle(stale, JSON.stringify({ op: 'join', token: created.token }));
    assert.equal(stale.last('error').code, 'removed', 'the lost keeper token no longer works');
});

test('a second connection with the same token replaces the first', () => {
    const { room, created } = setup();
    const k2 = conn(true);
    room.handle(k2, JSON.stringify({ op: 'join', token: created.token }));
    assert.equal(k2.last('joined').memberId, 'keeper');
});

test('rotating the invite and removing a member revoke access', () => {
    const { room, k, created, join } = setup();
    const g = join(created.invite);
    const gj = g.last('joined');
    room.handle(k, JSON.stringify({ op: 'rotate_invite' }));
    const fresh = k.last('invite').invite;
    assert.equal(join(created.invite).last('error').code, 'bad_credential', 'old invite is dead');
    assert.equal(join(fresh).last('joined').role, 'guest');
    room.handle(k, JSON.stringify({ op: 'remove', memberId: gj.memberId }));
    assert.equal(g.closed, true);
    const back = conn(false);
    room.handle(back, JSON.stringify({ op: 'join', token: gj.token }));
    assert.equal(back.last('error').code, 'removed');
    room.handle(g, JSON.stringify({ op: 'rotate_invite' }));
    const guest2 = join(fresh);
    room.handle(guest2, JSON.stringify({ op: 'rotate_invite' }));
    assert.equal(guest2.last('error').code, 'forbidden', 'guests cannot manage the room');
});

test('oversized messages are refused with too_large', () => {
    const { room, k, created, join } = setup({ MAX_MESSAGE_BYTES: 200 });
    const a = join(created.invite);
    room.handle(k, env({ kind: 'event', to: [a.last('joined').memberId], body: 'x'.repeat(500) }));
    assert.equal(k.last('error').code, 'too_large');
    assert.equal(a.envelopes((m) => m.kind === 'event').length, 0);
});

test('room survives a restart from the store; closing removes it', () => {
    const { store, config, created, room, k } = setup();
    const g = conn(false);
    room.handle(g, JSON.stringify({ op: 'join', credential: created.invite }));
    const gj = g.last('joined');
    const again = createRoom({ config, store });
    assert.equal(again.roomId, created.room);
    assert.equal(again.state, 'waiting');
    const g2 = conn(false);
    again.handle(g2, JSON.stringify({ op: 'join', token: gj.token }));
    assert.equal(g2.last('joined').memberId, gj.memberId, 'tokens survive the restart');
    room.handle(k, JSON.stringify({ op: 'close' }));
    assert.equal(store.raw(), null);
    assert.equal(room.state, 'none');
});

test('a full room refuses new members', () => {
    const { created, join } = setup({ MAX_MEMBERS: 2 });
    join(created.invite);
    assert.equal(join(created.invite).last('error').code, 'room_full');
});
