/**
 * The relay over real sockets (design/gdd/server-and-room.md Acceptance Criteria 1–3, 8, and §1).
 */
import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { WebSocket } from 'ws';
import { startRelay } from '../relay.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'relay-test-'));
const interfaces = {
    lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
    eth0: [{ address: '192.168.1.20', family: 'IPv4', internal: false }],
    tailscale0: [{ address: '100.101.1.2', family: 'IPv4', internal: false }]
};
const cfg = () => ({ KEEPER_PORT: 0, HTTP_PORT: 0, HTTPS_PORT: 0, STATIC_ROOT: join(here, '..', '..', 'src'),
    DATA_DIR: join(tmp, 'data'), CERT_DIR: join(tmp, 'cert') });
let relay;
before(async () => { relay = await startRelay(cfg(), { log: () => {}, interfaces }); });
after(async () => { await relay.close(); rmSync(tmp, { recursive: true, force: true }); });

/** Raw GET: unlike fetch, the path is sent as written (no `..` normalisation). */
const get = (port, path) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', text }));
    }).on('error', reject);
});
const open = (url, opts = {}) => new Promise((resolve, reject) => {
    const ws = new WebSocket(url, opts);
    ws.inbox = [];
    ws.on('message', (d) => ws.inbox.push(JSON.parse(d.toString())));
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
});
const waitFor = async (ws, pred, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        const hit = ws.inbox.find(pred);
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error('timed out waiting for message; inbox: ' + JSON.stringify(ws.inbox).slice(0, 400));
};

test('the game is served with JavaScript MIME types; paths cannot escape or reach dev folders', async () => {
    const index = await get(relay.ports.keeper, '/');
    assert.equal(index.status, 200);
    assert.match(index.type, /text\/html/);
    const mod = await get(relay.ports.http, '/js/app.mjs');
    assert.equal(mod.status, 200);
    assert.match(mod.type, /text\/javascript/, 'ES modules need a JavaScript Content-Type');
    for (const p of ['/../package.json', '/%2e%2e/package.json', '/node_modules/.package-lock.json', '/tests/visibility_leak_smoke.mjs', '/.gitignore']) {
        assert.equal((await get(relay.ports.http, p)).status, 404, p);
    }
});

test('/__relay/info gives player addresses to the keeper port only, never localhost', async () => {
    const info = await get(relay.ports.keeper, '/__relay/info');
    assert.equal(info.status, 200);
    const body = JSON.parse(info.text);
    assert.deepEqual(body.lan, ['192.168.1.20']);
    assert.deepEqual(body.tailscale, ['100.101.1.2']);
    assert.ok(!info.text.includes('localhost') && !info.text.includes('127.0.0.1'));
    assert.equal(body.ports.http, relay.ports.http);
    assert.equal((await get(relay.ports.http, '/__relay/info')).status, 404, 'not exposed to players');
});

test('three tiers join one room; a create from a player port is refused; restart keeps the room', async () => {
    assert.equal(relay.certTier, 'self-signed', 'openssl generated a self-signed pair');
    const keeper = await open(`ws://127.0.0.1:${relay.ports.keeper}/__relay/ws`);
    keeper.send(JSON.stringify({ op: 'create', epoch: 'e1' }));
    const created = await waitFor(keeper, (m) => m.op === 'joined');

    const lanCreate = await open(`ws://127.0.0.1:${relay.ports.http}/__relay/ws`);
    lanCreate.send(JSON.stringify({ op: 'create' }));
    assert.equal((await waitFor(lanCreate, (m) => m.op === 'error')).code, 'keeper_port_only');
    lanCreate.close();

    const httpGuest = await open(`ws://127.0.0.1:${relay.ports.http}/__relay/ws`);
    httpGuest.send(JSON.stringify({ op: 'join', credential: created.invite, name: 'http' }));
    const g1 = await waitFor(httpGuest, (m) => m.op === 'joined');
    const httpsGuest = await open(`wss://127.0.0.1:${relay.ports.https}/__relay/ws`, { rejectUnauthorized: false });
    httpsGuest.send(JSON.stringify({ op: 'join', credential: created.invite, name: 'https' }));
    const g2 = await waitFor(httpsGuest, (m) => m.op === 'joined');
    assert.equal(g1.role, 'guest');
    assert.equal(g2.role, 'guest');

    keeper.send(JSON.stringify({ v: 1, epoch: 'e1', kind: 'state', to: [g1.memberId, g2.memberId], body: { scene: '码头' } }));
    assert.equal((await waitFor(httpGuest, (m) => m.kind === 'state')).body.scene, '码头');
    assert.equal((await waitFor(httpsGuest, (m) => m.kind === 'state')).body.scene, '码头');
    for (const ws of [keeper, httpGuest, httpsGuest]) ws.close();

    await relay.close();
    relay = await startRelay(cfg(), { log: () => {}, interfaces });
    const back = await open(`ws://127.0.0.1:${relay.ports.http}/__relay/ws`);
    back.send(JSON.stringify({ op: 'join', token: g1.token }));
    const rejoined = await waitFor(back, (m) => m.op === 'joined' || m.op === 'error');
    assert.equal(rejoined.memberId, g1.memberId, 'the player link and token survive a relay restart');
    assert.notEqual(rejoined.boot, g1.boot, 'clients learn the relay restarted');
    back.close();
});

test('release layout: the relay inside the game folder never serves its own files; the self-test page is on every port', async () => {
    const game = join(tmp, 'release-game');
    const srv = join(game, 'server');
    mkdirSync(join(srv, 'public'), { recursive: true });
    mkdirSync(join(srv, 'data'), { recursive: true });
    writeFileSync(join(game, 'index.html'), '<!doctype html><title>game</title>');
    writeFileSync(join(srv, 'data', 'room.json'), '{"secret":"x"}');
    copyFileSync(join(here, '..', 'public', 'selftest.html'), join(srv, 'public', 'selftest.html'));
    const r = await startRelay({ KEEPER_PORT: 0, HTTP_PORT: 0, HTTPS_PORT: 0, STATIC_ROOT: game, SERVER_DIR: srv,
        DATA_DIR: join(tmp, 'data2'), CERT_DIR: join(tmp, 'cert') }, { log: () => {}, interfaces });
    try {
        assert.equal((await get(r.ports.http, '/index.html')).status, 200, 'the game is served');
        for (const p of ['/server/data/room.json', '/server/public/selftest.html', '/server/relay.mjs']) {
            assert.equal((await get(r.ports.http, p)).status, 404, p + ' is not served');
        }
        for (const port of [r.ports.keeper, r.ports.http]) {
            const page = await get(port, '/__relay/selftest?invite=abc');
            assert.equal(page.status, 200);
            assert.match(page.type, /text\/html/);
            assert.ok(page.text.includes('联机连接自检'));
        }
    } finally { await r.close(); }
});
