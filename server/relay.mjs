/**
 * CoC Engine relay (ADR-0001, design/gdd/server-and-room.md). Hosts the game, runs one room and
 * forwards envelopes by recipient. It never runs rules, calls an AI or reads a message body.
 *
 *   npm start      → keeper: http://localhost:8080   players: printed LAN / Tailscale addresses
 */
import http from 'node:http';
import https from 'node:https';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { loadConfig } from './config.mjs';
import { createRoom } from './lib/room.mjs';
import { staticHandler } from './lib/static.mjs';
import { loadCertificates } from './lib/certs.mjs';
import { playerAddresses } from './lib/addresses.mjs';
import { fileStore } from './lib/store.mjs';

const WS_PATH = '/__relay/ws';
const INFO_PATH = '/__relay/info';
const SELFTEST_PATH = '/__relay/selftest';
const isLoopback = (addr) => addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';

const listen = (server, port, host) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => { server.off('error', reject); resolve(server.address().port); });
});

/**
 * Start the relay.
 * @param {Object} [overrides] config overrides (tests use port 0 and temp dirs)
 * @param {{log?:Function, interfaces?:Object}} [opts]
 * @returns {Promise<{ports:{keeper:number,http:number,https:number|null}, certTier:string, room:Object, info:Function, close:Function}>}
 */
export async function startRelay(overrides = {}, opts = {}) {
    const config = loadConfig(overrides);
    const log = opts.log || ((m) => console.log('[relay] ' + m));
    const root = realpathSync(config.STATIC_ROOT);
    const room = createRoom({ config, store: fileStore(config.DATA_DIR, log), log });
    const serverDir = realpathSync(config.SERVER_DIR);
    const serveGame = staticHandler(root, [serverDir]);
    // The connection self-test page (server/public/selftest.html) is served on every port.
    const selftest = readFileSync(join(serverDir, 'public', 'selftest.html'));
    const serveFiles = (req, res) => {
        if ((req.url || '').split('?')[0] === SELFTEST_PATH) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(selftest);
            return;
        }
        serveGame(req, res);
    };
    const addresses = () => playerAddresses(opts.interfaces);
    const certs = loadCertificates(config.CERT_DIR, { hosts: [...addresses().lan, ...addresses().tailscale] });
    if (certs.tier === 'none') log(certs.reason);

    const ports = { keeper: 0, http: 0, https: null };
    const info = () => ({
        room: room.roomId, state: room.state, certTier: certs.tier,
        ports: { http: ports.http, https: ports.https },
        lan: addresses().lan, tailscale: addresses().tailscale
    });

    const keeperHandler = (req, res) => {
        if ((req.url || '').split('?')[0] === INFO_PATH) {
            if (!isLoopback(req.socket.remoteAddress)) { res.writeHead(403).end(); return; }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(info()));
            return;
        }
        serveFiles(req, res);
    };

    const sockets = new Set();
    const wss = new WebSocketServer({ noServer: true, maxPayload: config.MAX_MESSAGE_BYTES * 2 });
    wss.on('connection', (ws, viaKeeperPort) => {
        const conn = { viaKeeperPort, send: (t) => ws.send(t), close: () => ws.close() };
        ws.lastPong = Date.now();
        sockets.add(ws);
        ws.on('pong', () => { ws.lastPong = Date.now(); });
        ws.on('message', (data, isBinary) => room.handle(conn, isBinary ? '' : data.toString('utf8')));
        ws.on('close', () => { sockets.delete(ws); room.leave(conn); });
        ws.on('error', () => { /* close follows */ });
    });
    const upgrade = (viaKeeperPort) => (req, socket, head) => {
        if ((req.url || '').split('?')[0] !== WS_PATH) { socket.destroy(); return; }
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, viaKeeperPort));
    };

    const servers = [];
    const keeperServer = http.createServer(keeperHandler);
    keeperServer.on('upgrade', upgrade(true));
    ports.keeper = await listen(keeperServer, config.KEEPER_PORT, '127.0.0.1');
    servers.push(keeperServer);

    const httpServer = http.createServer(serveFiles);
    httpServer.on('upgrade', upgrade(false));
    ports.http = await listen(httpServer, config.HTTP_PORT, '0.0.0.0');
    servers.push(httpServer);

    if (certs.tier !== 'none') {
        const httpsServer = https.createServer({ key: certs.key, cert: certs.cert }, serveFiles);
        httpsServer.on('upgrade', upgrade(false));
        ports.https = await listen(httpsServer, config.HTTPS_PORT, '0.0.0.0');
        servers.push(httpsServer);
    }

    // Heartbeat: a connection silent for PING_INTERVAL + PONG_TIMEOUT is treated as gone.
    const heartbeat = setInterval(() => {
        const limit = config.PING_INTERVAL_MS + config.PONG_TIMEOUT_MS;
        for (const ws of sockets) {
            if (Date.now() - ws.lastPong > limit) { ws.terminate(); continue; }
            try { ws.ping(); } catch (_e) { /* closing */ }
        }
    }, config.PING_INTERVAL_MS);
    heartbeat.unref();

    return {
        ports, certTier: certs.tier, room, info,
        close: async () => {
            clearInterval(heartbeat);
            for (const ws of sockets) ws.terminate();
            await Promise.all(servers.map((s) => new Promise((r) => s.close(() => r()))));
        }
    };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
    try {
        const relay = await startRelay();
        const i = relay.info();
        console.log(`守秘人（本机）：http://localhost:${relay.ports.keeper}`);
        console.log(`连接自检（在本机打开，开房间后把链接发给手机）：http://localhost:${relay.ports.keeper}${SELFTEST_PATH}`);
        for (const ip of [...i.lan, ...i.tailscale]) {
            if (relay.ports.https) console.log(`玩家 https（${relay.certTier === 'mkcert' ? 'A 档' : 'B 档，提示不安全时点"继续访问"'}）：https://${ip}:${relay.ports.https}`);
            console.log(`玩家 http（C 档）：http://${ip}:${relay.ports.http}`);
        }
        if (!i.lan.length && !i.tailscale.length) console.log('没有找到局域网地址：请连接热点 / Wi-Fi，或启动 Tailscale。');
    } catch (e) {
        if (e && e.code === 'EADDRINUSE') {
            console.error(`端口 ${e.port} 已被占用。关闭占用它的程序（例如 python -m http.server），或用环境变量 KEEPER_PORT / HTTP_PORT / HTTPS_PORT 改端口。`);
            process.exit(1);
        }
        throw e;
    }
}
