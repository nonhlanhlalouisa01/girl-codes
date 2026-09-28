import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createAppServer } from '../server.js';

async function withServer(run) {
  const server = createAppServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('serves the app with restrictive security and privacy headers', async () => {
  await withServer(async (base) => {
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /Meeting Mirror/);
  });
});

test('serves only explicitly allowed public assets', async () => {
  await withServer(async (base) => {
    for (const path of ['/src/styles.css', '/src/app.js', '/src/example.js', '/favicon.svg']) {
      assert.equal((await fetch(`${base}${path}`)).status, 200, path);
    }
    for (const path of ['/server.js', '/package.json', '/.git/config', '/README.md', '/missing', '/%2e%2e/LICENSE', '/src/%2e%2e/package.json']) {
      assert.equal((await fetch(`${base}${path}`)).status, 404, path);
    }
  });
});

test('supports HEAD without a body', async () => {
  await withServer(async (base) => {
    const response = await fetch(base, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
    assert.match(response.headers.get('content-type'), /text\/html/);
  });
});

test('does not accept transcript uploads or other mutations', async () => {
  await withServer(async (base) => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await fetch(base, { method, body: 'private conversation' });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
    }
  });
});
