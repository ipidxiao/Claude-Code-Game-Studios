// PROTOTYPE - NOT FOR PRODUCTION
// Drives keeper / guests / a second developer through the relay and checks ADR-0001's rules.
// Run: npm test   (from prototypes/multiplayer-relay)

import { strict as assert } from 'node:assert';
import path from 'node:path';
import WebSocket from 'ws';
import { startRelay } from './relay.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const KEEPER = 'ws://localhost:18080';
const PLAIN = 'ws://127.0.0.1:18081';
const SECURE = 'wss://127.0.0.1:18443';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal test client: records every frame it receives. */
async function client(url) {
    const ws = new WebSocket(url, { rejectUnauthorized: false }); // tier B: self-signed, user clicked "continue"
    // lastDseq survives drain(), like a real client that remembers its position.
    const c = { ws, inbox: [], raw: [], lastDseq: 0 };
    ws.on('message', (d) => {
        const m = JSON.parse(String(d));
        if (m.op === 'msg' && m.env.dseq > c.lastDseq) c.lastDseq = m.env.dseq;
        c.raw.push(String(d)); c.inbox.push(m);
    });
    await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
    c.send = (obj) => ws.send(JSON.stringify(obj));
    c.next = async (op) => {
        for (let i = 0; i < 100; i++) {
            const idx = c.inbox.findIndex((m) => m.op === op);
            if (idx >= 0) return c.inbox.splice(idx, 1)[0];
            await sleep(10);
        }
        throw new Error('timeout waiting for ' + op);
    };
    c.msgs = () => c.inbox.filter((m) => m.op === 'msg').map((m) => m.env);
    c.drain = () => { c.inbox.length = 0; c.raw.length = 0; };
    c.close = () => new Promise((r) => { ws.once('close', r); ws.close(); });
    return c;
}

const relay = startRelay({ root: path.join(here, '../../src'), keeperPort: 18080, httpPort: 18081, httpsPort: 18443, certDir: path.join(here, '.cert') });
const results = [];
// Evaluate immediately: later steps drain the inboxes these checks read.
const check = (name, fn) => {
    try { fn(); results.push([name, null]); } catch (e) { results.push([name, e]); }
};

try {
    // Setup: keeper creates a room on the localhost origin.
    const keeper = await client(KEEPER);
    keeper.send({ op: 'create' });
    const { room, roomKey, inviteCode } = await keeper.next('created');
    keeper.send({ op: 'join', room, roomKey, epoch: 'E1' });
    const kj = await keeper.next('joined');
    assert.equal(kj.memberId, 'keeper');

    // Guest A over self-signed https (tier B), guest B over plain http (tier C), dev D with the room key.
    const a = await client(SECURE);
    a.send({ op: 'join', room, inviteCode });
    const aj = await a.next('joined');
    const b = await client(PLAIN);
    b.send({ op: 'join', room, inviteCode });
    const bj = await b.next('joined');
    const d = await client(PLAIN);
    d.send({ op: 'join', room, roomKey });
    const dj = await d.next('joined');
    await sleep(50);

    check('三档连接都能加入：A 走自签 https、B 走普通 http，角色均为 guest；D 凭房间密钥为 developer', () => {
        assert.equal(aj.role, 'guest'); assert.equal(bj.role, 'guest'); assert.equal(dj.role, 'developer');
    });
    check('新成员加入时，服务程序请守秘人浏览器为其生成快照', () => {
        const reqs = keeper.msgs().filter((e) => e.body && e.body.type === 'snapshot_request').map((e) => e.body.memberId);
        assert.deepEqual(reqs.sort(), [aj.memberId, bj.memberId, dj.memberId].sort());
    });
    keeper.drain(); a.drain(); b.drain(); d.drain();

    // Dark roll: keeper browser filters before sending (one envelope per audience).
    keeper.send({ op: 'msg', env: { kind: 'event', to: [dj.memberId], body: { type: 'dark_roll', skill: '侦查', value: 37 } } });
    keeper.send({ op: 'msg', env: { kind: 'event', to: [aj.memberId, bj.memberId], body: { type: 'dark_roll', hidden: true } } });
    await sleep(50);
    check('暗骰：开发者 D 收到数值 37，游客 A、B 只收到占位，原始字节里也没有数值', () => {
        assert.equal(d.msgs()[0].body.value, 37);
        for (const g of [a, b]) {
            assert.equal(g.msgs()[0].body.hidden, true);
            assert.ok(!/"value"|:37\b/.test(g.raw.join('')), 'guest received the value');
        }
    });

    // F1: guest forges from:'keeper' and tries to broadcast state.
    a.drain(); b.drain(); d.drain(); keeper.drain();
    a.send({ op: 'msg', env: { from: 'keeper', kind: 'state', to: 'all', body: { hp: 0 } } });
    await sleep(50);
    check('防冒充：游客伪造 from:keeper 发 state，被拒绝，其他人什么也没收到', () => {
        assert.equal((a.inbox.find((m) => m.op === 'error') || {}).reason, 'forbidden');
        assert.equal(b.msgs().length + d.msgs().length + keeper.msgs().length, 0);
    });

    a.drain();
    a.send({ op: 'msg', env: { from: 'keeper', kind: 'request', to: 'keeper', body: { action: '检查门锁' } } });
    await sleep(50);
    check('游客的请求送达守秘人，from 被服务程序改写为游客自己的 memberId', () => {
        const env = keeper.msgs()[0];
        assert.equal(env.from, aj.memberId); assert.equal(env.body.action, '检查门锁');
    });

    a.drain(); b.drain();
    a.send({ op: 'msg', env: { kind: 'request', to: [bj.memberId], body: { note: '私下传话' } } });
    await sleep(50);
    check('玩家不能直接发消息给其他玩家', () => {
        assert.equal((a.inbox.find((m) => m.op === 'error') || {}).reason, 'forbidden');
        assert.equal(b.msgs().length, 0);
    });

    keeper.drain();
    keeper.send({ op: 'msg', env: { kind: 'event', to: 'all', body: { narration: '门开了' } } });
    await sleep(50);
    check('F7：守秘人用 to:all 发叙述被拒绝（to:all 只允许 system）', () => {
        assert.equal((keeper.inbox.find((m) => m.op === 'error') || {}).reason, 'all-requires-system');
    });

    // F3: guest A drops, keeper sends two events, A reconnects and gets exactly those two.
    const aToken = aj.token;
    const aLast = a.lastDseq;
    await a.close();
    keeper.send({ op: 'msg', env: { kind: 'event', to: [aj.memberId], body: { n: 1 } } });
    keeper.send({ op: 'msg', env: { kind: 'event', to: [aj.memberId], body: { n: 2 } } });
    await sleep(50);
    const a2 = await client(SECURE);
    a2.send({ op: 'join', room, token: aToken, lastDseq: aLast, epoch: 'E1' });
    await a2.next('joined');
    await sleep(50);
    check('断线重连：服务程序补发错过的 2 条，dseq 连续', () => {
        const got = a2.msgs();
        assert.deepEqual(got.map((e) => e.body.n), [1, 2]);
        assert.deepEqual(got.map((e) => e.dseq), [aLast + 1, aLast + 2]);
    });

    // Keeper browser reload: new epoch → relay asks for fresh snapshots for everyone.
    keeper.drain();
    const kToken = kj.token;
    await keeper.close();
    const keeper2 = await client(KEEPER);
    keeper2.send({ op: 'join', room, token: kToken, epoch: 'E2' });
    await keeper2.next('joined');
    await sleep(50);
    check('守秘人刷新（新 epoch）：服务程序为所有成员请求新快照', () => {
        const reqs = keeper2.msgs().filter((e) => e.body.type === 'snapshot_request').map((e) => e.body.memberId);
        assert.deepEqual(reqs.sort(), [aj.memberId, bj.memberId, dj.memberId].sort());
    });

    // Admin: regenerate invite, kick B.
    d.drain();
    d.send({ op: 'regen_invite' });
    const { inviteCode: newInvite } = await d.next('invite');
    const late = await client(PLAIN);
    late.send({ op: 'join', room, inviteCode });
    const lateErr = await late.next('error');
    d.send({ op: 'kick', memberId: bj.memberId });
    await d.next('kicked');
    const b2 = await client(PLAIN);
    b2.send({ op: 'join', room, token: bj.token });
    const b2Err = await b2.next('error');
    check('开发者重新生成邀请码后旧码失效；被移出的成员令牌失效', () => {
        assert.notEqual(newInvite, inviteCode);
        assert.equal(lateErr.reason, 'bad-credential');
        assert.equal(b2Err.reason, 'bad-token');
    });

    a2.drain();
    a2.send({ op: 'kick', memberId: dj.memberId });
    const guestKick = await a2.next('error');
    check('游客不能使用管理操作', () => assert.equal(guestKick.reason, 'forbidden'));

    for (const c of [keeper2, a2, d, late, b2]) c.ws.terminate();
} finally {
    let failed = 0;
    for (const [name, err] of results) {
        if (!err) console.log('PASS', name);
        else { failed++; console.log('FAIL', name, '\n    ', err.message); }
    }
    console.log(`\n${results.length - failed}/${results.length} passed`);
    await relay.close();
    process.exit(failed ? 1 : 0);
}
