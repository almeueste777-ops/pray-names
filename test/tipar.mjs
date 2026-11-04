// Probă de TIPAR în Edge headless: deschide URL-ul, așteaptă expresia JS, scoate PDF-ul exact cum îl trimite browserul la imprimantă
// (@page din CSS, margini 0, fundaluri). node test/tipar.mjs <url> <expresieJS> <iesire.pdf> [ms] [setariJSON]
// setariJSON (opțional) se pune în localStorage['pray-names-setari'] înainte de încărcare (aspectul ei: font, chenar, culori).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [url, expr, iesire, ms = '60000', setari = ''] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/edge-tipar-${port}`, '--window-size=1200,1400', 'about:blank'], { stdio: 'ignore' });
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
  if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTIE', m.params.exceptionDetails.text, m.params.exceptionDetails.exception?.description);
};
await send('Runtime.enable'); await send('Page.enable');
if (setari) {
  await send('Page.navigate', { url: new URL('./', url).href }); await sleep(1500);
  await send('Runtime.evaluate', { expression: `localStorage.setItem('pray-names-setari', ${JSON.stringify(setari)})` });
}
await send('Page.navigate', { url });
const t0 = Date.now(); let ok = false;
while (Date.now() - t0 < +ms) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.result && r.result.value) { ok = true; console.log('GATA', r.result.value, 'in', Date.now() - t0, 'ms'); break; }
  await sleep(500);
}
if (!ok) console.log('TIMEOUT dupa', ms, 'ms');
await sleep(800);
const p = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
writeFileSync(iesire, Buffer.from(p.data, 'base64'));
console.log('PDF', iesire);
ws.close(); edge.kill(); process.exit(ok ? 0 : 1);
