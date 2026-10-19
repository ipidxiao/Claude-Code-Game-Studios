// PROTOTYPE - NOT FOR PRODUCTION
// Three desktop browser windows play through play.html: keeper (localhost), guest (plain http), developer (self-signed https).
// Run: LAN_IP=<non-loopback IP> [CHROMIUM_PATH=...] node browser_play.mjs   (needs src/node_modules: cd ../../src && npm ci)

import { chromium } from '../../src/node_modules/playwright/index.mjs';
import { startRelay } from './relay.mjs';

const LAN = process.env.LAN_IP;
if (!LAN) { console.error('Set LAN_IP to a non-loopback address of this machine'); process.exit(2); }
const shot = (name) => new URL('./evidence/play-' + name + '.png', import.meta.url).pathname;
const relay = startRelay({ root: new URL('../../src', import.meta.url).pathname, keeperPort: 18080, httpPort: 18081, httpsPort: 18443, certDir: new URL('./.cert', import.meta.url).pathname });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-proxy-server'] });
const open = async (url) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 640, height: 640 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('pageerror', url, e.message));
    await page.goto(url);
    return page;
};
const text = (p) => p.locator('#log').innerText();
const results = [];
const check = (name, ok) => results.push([name, ok]);

try {
    const keeper = await open('http://localhost:18080/__proto/play.html?role=keeper');
    await keeper.waitForFunction(() => window.__creds);
    const c = await keeper.evaluate(() => window.__creds);
    const guest = await open(`http://${LAN}:18081/__proto/play.html?room=${c.room}&invite=${c.inviteCode}`);
    const dev = await open(`https://${LAN}:18443/__proto/play.html?room=${c.room}&key=${c.roomKey}`);
    await keeper.waitForTimeout(800);

    await guest.getByRole('button', { name: '请求：检查门锁' }).click();
    await keeper.waitForTimeout(300);
    await keeper.getByRole('button', { name: '暗骰「侦查」' }).click();
    await keeper.waitForTimeout(300);
    await keeper.getByRole('button', { name: '公开检定「聆听」' }).click();
    await keeper.waitForTimeout(300);
    await guest.getByRole('button', { name: '伪造守秘人广播' }).click();
    await keeper.waitForTimeout(800);

    const [k, g, d] = [await text(keeper), await text(guest), await text(dev)];
    const secret = (k.match(/暗骰「侦查」：(\d+)/) || [])[1];
    check('三个窗口都加入了房间（守秘人 localhost / 游客 http / 开发者自签 https）',
        /已连接/.test(k) && /已连接/.test(g) && /已连接/.test(d));
    check('玩家加入后收到守秘人发来的当前场景', /雾锁灯塔/.test(g) && /雾锁灯塔/.test(d));
    check('游客的请求出现在守秘人窗口', /请求：检查门锁/.test(k));
    check(`开发者账号看到暗骰数值 ${secret}`, !!secret && d.includes('暗骰「侦查」：' + secret));
    check('游客只看到"守秘人进行了一次暗骰"，看不到数值', /守秘人进行了一次暗骰/.test(g) && !g.includes('侦查」：' + secret));
    check('公开检定三方都看到同一个数值', (() => {
        const v = (k.match(/公开检定「聆听」：(\d+)/) || [])[1];
        return !!v && g.includes('聆听」：' + v) && d.includes('聆听」：' + v);
    })());
    check('游客伪造守秘人广播被服务程序拒绝，开发者窗口没有收到', /拒绝：forbidden/.test(g) && !/"hp"/.test(d));

    await keeper.screenshot({ path: shot('keeper') });
    await guest.screenshot({ path: shot('guest-http') });
    await dev.screenshot({ path: shot('developer-https') });
} finally {
    let failed = 0;
    for (const [name, ok] of results) { console.log(ok ? 'PASS' : 'FAIL', name); if (!ok) failed++; }
    console.log(`\n${results.length - failed}/${results.length} passed`);
    await browser.close();
    await relay.close();
    process.exit(failed || !results.length ? 1 : 0);
}
