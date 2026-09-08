import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostname, networkInterfaces } from 'node:os';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.xml': 'application/xml',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.geojson': 'application/geo+json',
};

export async function startServer({ root = defaultRoot, host = '127.0.0.1', port = 3000 } = {}) {
  const base = await realpath(root);
  await stat(path.join(base, 'index.html'));
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    const fail = (code, message) => {
      res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : message);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return fail(405, 'Method not allowed');
    }
    try {
      const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) {
        return fail(403, 'Forbidden');
      }
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const filename = await realpath(path.join(base, relative));
      const within = path.relative(base, filename);
      if (within.startsWith('..' + path.sep) || within === '..' || path.isAbsolute(within)) {
        return fail(403, 'Forbidden');
      }
      const info = await stat(filename);
      if (!info.isFile()) return fail(404, 'Not found');
      res.writeHead(200, {
        'Content-Type': mime[path.extname(filename)] || 'application/octet-stream',
        'Content-Length': info.size,
      });
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(filename);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      fail(error instanceof URIError ? 400 : 404, 'Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    return index < 0 ? fallback : args[index + 1];
  };
  const host = option('--host', '127.0.0.1');
  const port = Number(option('--port', '3000'));
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Usage: node scripts/serve.mjs [--host 127.0.0.1] [--port 3000]');
    process.exit(1);
  }
  try {
    await startServer({ host, port });
    console.log(`\nSystemsAnalysisTool is running: http://localhost:${port}`);
    if (host === '0.0.0.0') {
      console.log(`Intranet: http://${hostname()}:${port}`);
      for (const address of Object.values(networkInterfaces()).flat()) {
        if (address?.family === 'IPv4' && !address.internal) console.log(`          http://${address.address}:${port}`);
      }
    }
    console.log('Keep this window open. Press Ctrl+C to stop.\n');
  } catch (error) {
    console.error(error.code === 'ENOENT' ? 'Build missing. Run npm.cmd run build first.' : error.message);
    process.exitCode = 1;
  }
}
