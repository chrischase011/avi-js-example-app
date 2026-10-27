import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createTestClient, type TestClient } from '@avijs/testing';
import type { Api } from '../../api.gen.js';
import { AppModule } from '../../app.module.js';

let client: TestClient<Api>;
before(async () => {
  client = await createTestClient<Api>(AppModule);
});
// client is unset when before() failed; that error is the one to read.
after(() => client?.close());

test('lists users', async () => {
  // client.api is typed from src/api.gen.ts: paths, params, bodies and responses.
  const res = await client.api.get('/users');
  assert.ok(res.ok);
  assert.equal(res.body[0]?.name, 'Shiela');
});

test('creates a user', async () => {
  const res = await client.post('/users', { name: '  Grace  ', role: 'admin' });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { id: 2, name: 'Grace' });
});

test('rejects a user without a name', async () => {
  const res = await client.post('/users', {});
  assert.equal(res.status, 400);
  const body = res.body as { details: { issues: { in: string; path: string[] }[] } };
  assert.deepEqual(
    body.details.issues.map((issue) => `${issue.in}.${issue.path.join('.')}`),
    ['body.name'],
  );
});
