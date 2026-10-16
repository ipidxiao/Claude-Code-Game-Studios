// PROTOTYPE - NOT FOR PRODUCTION
// Loads the game page in Chromium over the keeper origin and the two LAN tiers.
// Run: LAN_IP=<non-loopback IP> node tier_check.mjs   (needs src/node_modules: cd ../../src && npm ci)
const LAN = process.env.LAN_IP;
if (!LAN) { console.error('Set LAN_IP to a non-loopback address of this machine'); process.exit(2); }
import { chromium } from '../../src/node_modules/playwright/index.mjs';
import { startRelay } from './relay.mjs';
const relay = startRelay({ root: new URL('../../src', import.meta.url).pathname, keeperPort: 18080, httpPort: 18081, httpsPort: 18443, certDir: new URL('./.cert', import.meta.url).pathname });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-proxy-server'] });
const out = {};
for (const [tier, url] of [['keeper-localhost','http://localhost:18080/'],['C-http','http://' + LAN + ':18081/'],['B-selfsigned','https://' + LAN + ':18443/']]) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(async () => ({
    secure: window.isSecureContext,
    sw: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 'unavailable',
    idb: typeof indexedDB !== 'undefined',
    clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
    lobby: document.body.innerText.includes('调查员小队') || document.body.innerText.includes('本地剧本'),
    wsOk: await new Promise(r => { const w = new WebSocket(location.origin.replace('http','ws')); w.onopen = () => { w.send(JSON.stringify({op:'create'})); }; w.onmessage = e => r(JSON.parse(e.data).op); w.onerror = () => r('ws-error'); setTimeout(()=>r('timeout'),3000); })
  }));
  await page.screenshot({ path: new URL('./evidence/tier-' + tier + '.png', import.meta.url).pathname });
  out[tier] = { ...info, errors: errors.slice(0,5) };
  await ctx.close();
}
console.log(JSON.stringify(out, null, 2));
await browser.close(); await relay.close(); process.exit(0);
