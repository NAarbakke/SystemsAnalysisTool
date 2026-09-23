// Screenshots every view in both colour modes from the built app, for before/after visual review.
// Usage: npm run build && node scripts/screenshots.mjs [width] [height]
// Needs Chrome or Edge; set BROWSER to its path if it is not in the usual place.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const [width = 1440, height = 900] = process.argv.slice(2).map(Number);
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'outputs/screenshots');
const browser = [process.env.BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(candidate => candidate && existsSync(candidate));
if (!browser) throw new Error('No Chrome or Edge found. Set BROWSER to its executable path.');

const server = await startServer({ root: path.join(root, 'dist'), port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(path.join(tmpdir(), 'screenshots-'));
const chrome = spawn(browser, ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    await wait(200);
    page = await fetch('http://127.0.0.1:9333/json/list').then(r => r.json()).then(list => list.find(t => t.type === 'page')).catch(() => undefined);
  }
  if (!page) throw new Error('The browser did not start.');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let next = 0; const pending = new Map(); const errors = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const job = pending.get(message.id); pending.delete(message.id); message.error ? job.reject(new Error(message.error.message)) : job.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = expression => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then(r => r.result.value);

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  await mkdir(out, { recursive: true });
  for (const theme of ['dark', 'light']) {
    for (const [view, settle] of [['assembly', 2500], ['engines', 1500], ['telemetry', 2500], ['flyover', 20000]]) {
      await send('Page.navigate', { url: `${origin}/index.html` }); await wait(300);
      await evaluate(`localStorage.setItem('viewer-appearance', '${theme}')`);
      await send('Page.navigate', { url: `${origin}/index.html?view=${view}` });
      await wait(settle);
      await evaluate('document.fonts.ready.then(() => true)');
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const file = path.join(out, `${view}-${theme}-${width}.png`);
      await writeFile(file, Buffer.from(shot.data, 'base64'));
      console.log(file);
    }
  }
  if (errors.length) console.log('Page errors:\n' + [...new Set(errors)].join('\n'));
  socket.close();
} finally {
  chrome.kill(); server.close();
  await wait(500); await rm(profile, { recursive: true, force: true }).catch(() => {});
}
