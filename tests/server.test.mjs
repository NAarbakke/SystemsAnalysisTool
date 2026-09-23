import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer } from '../scripts/serve.mjs';

test('local server serves static assets and confines requests to its build folder', async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'server-test-'));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'dist');
  await mkdir(root);
  await writeFile(path.join(root, 'index.html'), '<!doctype html><title>Local viewer</title>');
  await writeFile(path.join(root, 'app.js'), 'export const local = true;');
  await writeFile(path.join(root, 'map.jpg'), 'map fixture');
  await writeFile(path.join(root, 'worker.wasm'), 'wasm fixture');
  await writeFile(path.join(fixture, 'private.txt'), 'outside build');
  const server = await startServer({ root, port: 0 });
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  const port = server.address().port;
  const request = (pathname, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
  assert.match((await request('/')).body, /Local viewer/);
  const js = await request('/app.js');
  assert.equal(js.status, 200);
  assert.match(js.headers['content-type'], /javascript/);
  assert.equal((await request('/map.jpg')).headers['content-type'], 'image/jpeg');
  assert.equal((await request('/worker.wasm')).headers['content-type'], 'application/wasm');
  assert.equal((await request('/app.js', 'HEAD')).body, '');
  assert.equal((await request('/missing.js')).status, 404);
  assert.equal((await request('/package.json')).status, 404);
  assert.equal((await request('/../private.txt')).status, 403);
  assert.equal((await request('/%2e%2e/private.txt')).status, 403);
  assert.equal((await request('/..%5cprivate.txt')).status, 403);
  assert.equal((await request('/%ZZ')).status, 400);
  assert.equal((await request('/', 'POST')).status, 405);
});
