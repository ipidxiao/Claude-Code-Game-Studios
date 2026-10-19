// PROTOTYPE - NOT FOR PRODUCTION
// Question: can a relay that never reads envelope bodies still enforce ADR-0001
// (identity-bound `from`, kind/to rules, per-recipient dseq replay, epoch snapshots)?
// Date: 2026-10-16

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { WebSocketServer } from 'ws';

const REPLAY_LIMIT = 200;
const KINDS = new Set(['state', 'event', 'request', 'system']);

const newSecret = () => crypto.randomBytes(16).toString('hex');
const newRoomId = () => crypto.randomBytes(3).toString('hex').toUpperCase();

/** In-memory rooms. room → { roomKey, inviteCode, epoch, members: Map<memberId, Member> } */
const rooms = new Map();

function send(ws, obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function deliver(room, memberId, env) {
    const m = room.members.get(memberId);
    if (!m) return;
    m.dseq += 1;
    const out = { ...env, dseq: m.dseq };
    m.buffer.push(out);
    if (m.buffer.length > REPLAY_LIMIT) m.buffer.shift();
    send(m.ws, { op: 'msg', env: out });
}

function relayNotice(room, memberId, body) {
    deliver(room, memberId, { v: 1, room: room.id, epoch: room.epoch, from: 'relay', to: [memberId], kind: 'system', body });
}

function askSnapshot(room, memberId) {
    const m = room.members.get(memberId);
    if (room.members.has('keeper')) relayNotice(room, 'keeper', { type: 'snapshot_request', memberId, role: m && m.role });
}

function handleJoin(ws, msg, conn) {
    const room = rooms.get(msg.room);
    if (!room) return send(ws, { op: 'error', reason: 'no-room' });

    // Reconnect with a member token.
    if (msg.token) {
        const m = [...room.members.values()].find((x) => x.token === msg.token);
        if (!m) return send(ws, { op: 'error', reason: 'bad-token' });
        m.ws = ws;
        conn.room = room; conn.memberId = m.id;
        if (m.id === 'keeper' && msg.epoch && msg.epoch !== room.epoch) {
            // Keeper browser reloaded: old buffers are from a dead epoch.
            room.epoch = msg.epoch;
            send(ws, { op: 'joined', memberId: m.id, role: m.role, token: m.token, epoch: room.epoch });
            for (const other of room.members.values()) {
                if (other.id === 'keeper') continue;
                other.buffer = [];
                askSnapshot(room, other.id);
            }
            return;
        }
        send(ws, { op: 'joined', memberId: m.id, role: m.role, token: m.token, epoch: room.epoch });
        const last = Number(msg.lastDseq) || 0;
        const first = m.buffer.length ? m.buffer[0].dseq : m.dseq + 1;
        if (msg.epoch === room.epoch && last + 1 >= first) {
            for (const env of m.buffer) if (env.dseq > last) send(ws, { op: 'msg', env });
        } else {
            askSnapshot(room, m.id);
        }
        return;
    }

    // First join with a room key or invite code.
    let role;
    if (msg.roomKey && msg.roomKey === room.roomKey) role = 'developer';
    else if (msg.inviteCode && msg.inviteCode === room.inviteCode) role = 'guest';
    else return send(ws, { op: 'error', reason: 'bad-credential' });

    const isKeeper = role === 'developer' && !room.members.has('keeper');
    const id = isKeeper ? 'keeper' : 'm' + crypto.randomBytes(3).toString('hex');
    const m = { id, role, token: newSecret(), ws, dseq: 0, buffer: [] };
    room.members.set(id, m);
    if (isKeeper && msg.epoch) room.epoch = msg.epoch;
    conn.room = room; conn.memberId = id;
    send(ws, { op: 'joined', memberId: id, role, token: m.token, epoch: room.epoch });
    if (!isKeeper) askSnapshot(room, id);
}

function handleEnvelope(ws, msg, conn) {
    const room = conn.room;
    if (!room) return send(ws, { op: 'error', reason: 'not-joined' });
    const env = msg.env || {};
    // ADR-0001 F1: identity comes from the connection, never from the client.
    const from = conn.memberId;
    const kind = env.kind;
    const to = env.to;
    if (!KINDS.has(kind)) return send(ws, { op: 'error', reason: 'bad-kind' });
    if (from !== 'keeper') {
        if (kind !== 'request' || to !== 'keeper') return send(ws, { op: 'error', reason: 'forbidden' });
    }
    // ADR-0001 F7: broadcast only for system messages.
    if (to === 'all' && kind !== 'system') return send(ws, { op: 'error', reason: 'all-requires-system' });

    const out = { v: 1, room: room.id, epoch: room.epoch, from, to, kind, body: env.body };
    let targets;
    if (to === 'all') targets = [...room.members.keys()].filter((id) => id !== from);
    else if (to === 'keeper') targets = ['keeper'];
    else if (Array.isArray(to)) targets = to.filter((id) => room.members.has(id));
    else return send(ws, { op: 'error', reason: 'bad-to' });
    for (const id of targets) deliver(room, id, out);
}

function handleAdmin(ws, msg, conn) {
    const room = conn.room;
    const me = room && room.members.get(conn.memberId);
    if (!me || me.role !== 'developer') return send(ws, { op: 'error', reason: 'forbidden' });
    if (msg.op === 'regen_invite') {
        room.inviteCode = newSecret();
        return send(ws, { op: 'invite', inviteCode: room.inviteCode });
    }
    if (msg.op === 'kick') {
        const target = room.members.get(msg.memberId);
        if (!target || target.id === 'keeper') return send(ws, { op: 'error', reason: 'bad-target' });
        room.members.delete(target.id);
        try { target.ws && target.ws.close(4001, 'kicked'); } catch (_e) {}
        return send(ws, { op: 'kicked', memberId: target.id });
    }
}

function attach(server) {
    const wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
        const conn = { room: null, memberId: null };
        ws.on('message', (raw) => {
            let msg;
            try { msg = JSON.parse(String(raw)); } catch (_e) { return send(ws, { op: 'error', reason: 'bad-json' }); }
            if (msg.op === 'create') {
                const room = { id: newRoomId(), roomKey: newSecret(), inviteCode: newSecret(), epoch: null, members: new Map() };
                rooms.set(room.id, room);
                return send(ws, { op: 'created', room: room.id, roomKey: room.roomKey, inviteCode: room.inviteCode });
            }
            if (msg.op === 'join') return handleJoin(ws, msg, conn);
            if (msg.op === 'msg') return handleEnvelope(ws, msg, conn);
            if (msg.op === 'regen_invite' || msg.op === 'kick') return handleAdmin(ws, msg, conn);
            send(ws, { op: 'error', reason: 'bad-op' });
        });
        ws.on('close', () => {
            const m = conn.room && conn.room.members.get(conn.memberId);
            if (m && m.ws === ws) m.ws = null;
        });
    });
}

// ES modules are rejected by the browser without a JavaScript MIME type.
const MIME = {
    '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.webmanifest': 'application/manifest+json'
};

function staticHandler(root) {
    return (req, res) => {
        const rel = decodeURIComponent((req.url || '/').split('?')[0]);
        // Prototype-only test page, served next to the game.
        if (rel === '/__proto/play.html') {
            res.writeHead(200, { 'Content-Type': MIME['.html'] });
            return fs.createReadStream(new URL('./play.html', import.meta.url)).pipe(res);
        }
        const file = path.join(root, rel === '/' ? 'index.html' : rel);
        if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404); return res.end();
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    };
}

/** Self-signed cert for tier B, generated once with the openssl CLI. */
function selfSignedCert(dir) {
    const key = path.join(dir, 'key.pem');
    const cert = path.join(dir, 'cert.pem');
    if (!fs.existsSync(key)) {
        fs.mkdirSync(dir, { recursive: true });
        execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert,
            '-days', '365', '-subj', '/CN=coc-relay'], { stdio: 'ignore' });
    }
    return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

/**
 * Start the relay. Keeper page: http://localhost:<keeperPort> (same origin as `npm run serve`).
 * Players: https on httpsPort (tier A/B) and plain http on httpPort (tier C).
 */
export function startRelay({ root, keeperPort = 8080, httpPort = 8081, httpsPort = 8443, certDir }) {
    const handler = staticHandler(path.resolve(root));
    const keeper = http.createServer(handler).listen(keeperPort, '127.0.0.1');
    const plain = http.createServer(handler).listen(httpPort, '0.0.0.0');
    const secure = https.createServer(selfSignedCert(certDir), handler).listen(httpsPort, '0.0.0.0');
    for (const s of [keeper, plain, secure]) attach(s);
    return { close: () => Promise.all([keeper, plain, secure].map((s) => new Promise((r) => s.close(r)))) };
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) {
    const here = path.dirname(new URL(import.meta.url).pathname);
    startRelay({ root: path.join(here, '../../src'), certDir: path.join(here, '.cert') });
    console.log('Keeper:  http://localhost:8080   (open here to keep existing saves and AI key)');
    console.log('Players: https://<LAN-IP>:8443  (tier A mkcert / tier B self-signed)');
    console.log('Players: http://<LAN-IP>:8081   (tier C plain http)');
}
