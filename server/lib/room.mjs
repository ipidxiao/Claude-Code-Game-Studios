/**
 * The room: identities, delivery rules, per-recipient sequence numbers and replay
 * (design/gdd/server-and-room.md §2–§4, ADR-0001). Pure logic — no sockets, no files:
 * connections and storage are injected so every rule is unit-testable.
 *
 * The relay never reads `body`. It looks only at the envelope (`v`, `kind`, `to`) and at the
 * identity the connection joined with.
 *
 * Connection interface: { viaKeeperPort: boolean, send(text: string): void, close(): void }
 * Store interface:      { load(): object|null, save(object): void, remove(): void }
 */
import crypto from 'node:crypto';

export const PROTOCOL_VERSION = 1;
const KINDS = new Set(['state', 'event', 'request', 'system']);
const KEEPER = 'keeper';

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const sameHash = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * @param {{config:Object, store:Object, randomBytes?:Function, log?:Function}} deps
 */
export function createRoom({ config, store, randomBytes = crypto.randomBytes, log = () => {} }) {
    const secret = () => randomBytes(16).toString('hex');            // 128-bit credentials
    const bootId = randomBytes(8).toString('hex');                    // clients reset dseq tracking when it changes

    /** Persisted part: ids and hashes only. */
    let saved = null;
    /** memberId → runtime { id, name, role, tokenHash, conn, dseq, buffer: [{dseq,text}] } */
    const members = new Map();
    const connMember = new Map();                                     // conn → memberId
    let epoch = null;                                                 // the keeper browser's current page load

    const persist = () => {
        if (!saved) return;
        saved.members = [...members.values()].map((m) => ({ id: m.id, name: m.name, role: m.role, tokenHash: m.tokenHash }));
        store.save(saved);
    };

    const restore = () => {
        let data = null;
        try { data = store.load(); } catch (e) { log('room store unreadable: ' + e.message); data = null; }
        if (!data || !data.roomId || !data.keyHash || !data.inviteHash) return;
        saved = { roomId: data.roomId, keyHash: data.keyHash, inviteHash: data.inviteHash, createdAt: data.createdAt, members: [] };
        for (const m of Array.isArray(data.members) ? data.members : []) {
            if (!m || !m.id || !m.tokenHash || (m.role !== 'developer' && m.role !== 'guest')) continue;
            members.set(m.id, { id: m.id, name: m.name || '', role: m.role, tokenHash: m.tokenHash, conn: null, dseq: 0, buffer: [] });
        }
    };
    restore();

    const send = (conn, obj) => { try { conn.send(JSON.stringify(obj)); } catch (_e) { /* socket gone */ } };
    const keeper = () => members.get(KEEPER);
    const online = (m) => !!(m && m.conn);

    /** Deliver one envelope text to one member: assign its dseq, keep it for replay, send if online. */
    const deliver = (m, envelope) => {
        m.dseq += 1;
        const text = JSON.stringify(Object.assign({}, envelope, { dseq: m.dseq }));
        m.buffer.push({ dseq: m.dseq, text });
        if (m.buffer.length > config.REPLAY_LIMIT) m.buffer.shift();
        if (m.conn) { try { m.conn.send(text); } catch (_e) { /* socket gone */ } }
    };

    /** Relay-originated system message. */
    const systemTo = (recipients, body) => {
        const env = { v: PROTOCOL_VERSION, room: saved && saved.roomId, epoch, from: 'relay', to: 'all', kind: 'system', body };
        for (const m of recipients) deliver(m, env);
    };
    const roster = () => [...members.values()].map((m) => ({ memberId: m.id, name: m.name, role: m.role, online: online(m) }));
    const broadcastRoster = () => systemTo([...members.values()], { type: 'members', members: roster() });
    const askSnapshot = (memberIds) => {
        const k = keeper();
        if (online(k) && memberIds.length) systemTo([k], { type: 'snapshot_needed', memberIds });
    };

    const joinedReply = (m, extra = {}) => Object.assign({
        op: 'joined', room: saved.roomId, memberId: m.id, role: m.role, boot: bootId, members: roster()
    }, extra);

    const attach = (conn, m) => {
        if (m.conn && m.conn !== conn) {
            send(m.conn, { op: 'replaced' });
            const old = m.conn;
            connMember.delete(old);
            try { old.close(); } catch (_e) { /* already closed */ }
        }
        m.conn = conn;
        connMember.set(conn, m.id);
    };

    /** Replay missed messages, or ask the keeper for a snapshot when replay cannot cover the gap. */
    const resume = (m, req) => {
        const last = Number(req.lastDseq);
        const sameBoot = req.boot === bootId;
        const sameEpoch = epoch && req.epoch === epoch;
        const first = m.buffer.length ? m.buffer[0].dseq : m.dseq + 1;
        if (sameBoot && sameEpoch && Number.isInteger(last) && last >= first - 1 && last <= m.dseq) {
            for (const item of m.buffer) if (item.dseq > last) { try { m.conn.send(item.text); } catch (_e) { /* gone */ } }
            return;
        }
        if (m.id !== KEEPER) askSnapshot([m.id]);
    };

    const api = {
        bootId,
        /** 'none' | 'waiting' (room exists, keeper offline) | 'live' */
        get state() { return !saved ? 'none' : online(keeper()) ? 'live' : 'waiting'; },
        get roomId() { return saved ? saved.roomId : null; },

        /** Open a room. Only a page served from the keeper port (localhost) may do this. */
        create(conn, { name = '守秘人', epoch: ep } = {}) {
            if (!conn.viaKeeperPort) return send(conn, { op: 'error', code: 'keeper_port_only' });
            if (saved) return send(conn, { op: 'error', code: 'room_exists' });
            const roomKey = secret(), invite = secret(), token = secret();
            saved = { roomId: randomBytes(3).toString('hex').toUpperCase(), keyHash: sha256(roomKey), inviteHash: sha256(invite), createdAt: new Date().toISOString(), members: [] };
            const m = { id: KEEPER, name, role: 'developer', tokenHash: sha256(token), conn: null, dseq: 0, buffer: [] };
            members.set(KEEPER, m);
            attach(conn, m);
            if (ep) epoch = String(ep);
            persist();
            send(conn, joinedReply(m, { token, roomKey, invite }));
            broadcastRoster();
        },

        /**
         * Join or rejoin. `token` rejoins an existing member; otherwise `credential` is the room key
         * (developer; the first one while there is no keeper becomes the keeper) or the invite (guest).
         */
        join(conn, req = {}) {
            if (!saved) return send(conn, { op: 'error', code: 'no_room' });
            if (req.token) {
                const h = sha256(req.token);
                const m = [...members.values()].find((x) => sameHash(x.tokenHash, h));
                if (!m) return send(conn, { op: 'error', code: 'removed' });
                attach(conn, m);
                if (m.id === KEEPER && req.epoch && String(req.epoch) !== epoch) {
                    epoch = String(req.epoch);                       // keeper page reloaded: everyone needs a snapshot
                    send(conn, joinedReply(m));
                    broadcastRoster();
                    askSnapshot([...members.values()].filter((x) => x.id !== KEEPER).map((x) => x.id));
                    return;
                }
                send(conn, joinedReply(m));
                resume(m, req);
                broadcastRoster();
                return;
            }
            const h = sha256(req.credential || '');
            let role = null;
            if (sameHash(saved.keyHash, h)) role = 'developer';
            else if (sameHash(saved.inviteHash, h)) role = 'guest';
            if (!role) return send(conn, { op: 'error', code: 'bad_credential' });
            const k = keeper();
            if (role === 'developer' && conn.viaKeeperPort && k && !online(k)) {
                // The keeper's browser lost its token. Only someone at the server machine (localhost)
                // may reclaim the seat; remote developers never replace the keeper.
                const token = secret();
                k.tokenHash = sha256(token);
                attach(conn, k);
                if (req.epoch) epoch = String(req.epoch);
                persist();
                send(conn, joinedReply(k, { token }));
                broadcastRoster();
                askSnapshot([...members.values()].filter((x) => x.id !== KEEPER).map((x) => x.id));
                return;
            }
            if (members.size >= config.MAX_MEMBERS) return send(conn, { op: 'error', code: 'room_full' });
            const id = 'm' + randomBytes(4).toString('hex');
            const token = secret();
            const m = { id, name: String(req.name || '').slice(0, 40), role, tokenHash: sha256(token), conn: null, dseq: 0, buffer: [] };
            members.set(id, m);
            attach(conn, m);
            persist();
            send(conn, joinedReply(m, { token }));
            broadcastRoster();
            askSnapshot([id]);
        },

        /** A connection closed. The member stays (token valid) and is shown offline. */
        leave(conn) {
            const id = connMember.get(conn);
            connMember.delete(conn);
            const m = id && members.get(id);
            if (m && m.conn === conn) { m.conn = null; broadcastRoster(); }
        },

        /** Handle one raw text frame from a connection. */
        handle(conn, text) {
            if (typeof text !== 'string') text = String(text);
            if (Buffer.byteLength(text) > config.MAX_MESSAGE_BYTES) return send(conn, { op: 'error', code: 'too_large' });
            let msg;
            try { msg = JSON.parse(text); } catch (_e) { return send(conn, { op: 'error', code: 'bad_json' }); }
            if (!msg || typeof msg !== 'object') return send(conn, { op: 'error', code: 'bad_message' });
            if (msg.op === 'create') return api.create(conn, msg);
            if (msg.op === 'join') return api.join(conn, msg);
            const id = connMember.get(conn);
            const me = id && members.get(id);
            if (!me) return send(conn, { op: 'error', code: 'not_joined' });
            if (msg.op) return api.admin(me, conn, msg);
            return api.route(me, conn, msg);
        },

        /** Developer-only room management. */
        admin(me, conn, msg) {
            if (me.role !== 'developer') return send(conn, { op: 'error', code: 'forbidden' });
            if (msg.op === 'rotate_invite') {
                const invite = secret();
                saved.inviteHash = sha256(invite);
                persist();
                return send(conn, { op: 'invite', invite });
            }
            if (msg.op === 'remove') {
                const target = members.get(msg.memberId);
                if (!target || target.id === KEEPER) return send(conn, { op: 'error', code: 'cannot_remove' });
                members.delete(target.id);
                if (target.conn) { send(target.conn, { op: 'error', code: 'removed' }); connMember.delete(target.conn); try { target.conn.close(); } catch (_e) { /* gone */ } }
                persist();
                broadcastRoster();
                return send(conn, { op: 'removed', memberId: target.id });
            }
            if (msg.op === 'close') {
                for (const m of members.values()) {
                    if (m.conn) { send(m.conn, { op: 'closed' }); connMember.delete(m.conn); try { m.conn.close(); } catch (_e) { /* gone */ } }
                }
                members.clear();
                saved = null;
                epoch = null;
                store.remove();
                return;
            }
            return send(conn, { op: 'error', code: 'unknown_op' });
        },

        /** Apply the delivery rules to one envelope. `body` is never read. */
        route(me, conn, env) {
            const reject = (code) => { log(`rejected ${code} from ${me.id} kind=${env.kind}`); };
            if (env.v !== PROTOCOL_VERSION || !KINDS.has(env.kind)) return reject('bad_envelope');
            const isKeeper = me.id === KEEPER;
            const to = env.to;
            if (!isKeeper) {
                if (env.kind !== 'request' || to !== KEEPER) return reject('not_keeper');
                if (!online(keeper())) return send(conn, { op: 'error', code: 'keeper_offline' });
            } else if (to === 'all' && env.kind !== 'system') {
                return reject('all_only_system');
            }
            if (isKeeper && env.epoch && String(env.epoch) !== epoch) epoch = String(env.epoch);
            let recipients;
            if (to === 'all') recipients = [...members.values()].filter((m) => m.id !== me.id);
            else if (to === KEEPER) recipients = isKeeper ? [] : [keeper()];
            else if (Array.isArray(to)) recipients = to.map((x) => members.get(x)).filter((m) => m && m.id !== me.id);
            else return reject('bad_to');
            const out = { v: PROTOCOL_VERSION, room: saved.roomId, epoch: env.epoch === undefined ? epoch : env.epoch,
                from: me.id, to, kind: env.kind, body: env.body };
            for (const m of recipients) deliver(m, out);
        },

        /** For /__relay/info and tests. */
        members: () => roster()
    };
    return api;
}
