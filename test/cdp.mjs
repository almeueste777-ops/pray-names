// Probă Edge headless prin CDP: deschide URL-ul, adună consola, așteaptă o expresie JS adevărată, face poză.
// node cdp.mjs <url> <expresieJS> <poza.png> [ms]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [url, expr, poza, ms = '60000', W = '1200', H = '1400'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/edge-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = t => new Promise(r => setTimeout(r, t));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise(res => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })); });
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m.error); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') console.log('CONSOLE', m.params.type, m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTIE', m.params.exceptionDetails.text, m.params.exceptionDetails.exception?.description);
  if (m.method === 'Log.entryAdded') console.log('LOG', m.params.entry.level, m.params.entry.text, m.params.entry.url || '');
};
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 700 });
await send('Page.navigate', { url });
const t0 = Date.now(); let ok = false;
while (Date.now() - t0 < +ms) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.result && r.result.value) { ok = true; console.log('GATA', r.result.value, 'in', Date.now() - t0, 'ms'); break; }
  await sleep(500);
}
if (!ok) console.log('TIMEOUT dupa', ms, 'ms');
const s = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(poza, Buffer.from(s.data, 'base64'));
ws.close(); edge.kill(); process.exit(ok ? 0 : 1);
