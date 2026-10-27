import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { createTestClient, type TestClient } from '@avijs/testing';
import type { Api } from './api.gen.js';
import { createApp } from './app.js';

let client: TestClient<Api>;

before(async () => {
  // A fresh database file for every run, created from the migrations.
  process.env['DATABASE_URL'] = 'file:./test.db';
  rmSync('test.db', { force: true });
  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });
  const app = await createApp();
  client = await createTestClient<Api>(app);
});
after(() => client.close());

/** Registers a user and returns a client that sends their token. */
async function signUp(name: string) {
  const res = await client.api.post('/auth/register', {
    body: {
      email: `${name.toLowerCase()}@example.com`,
      name,
      password: 'a-long-password',
    },
  });
  assert.ok(res.ok, `register ${name}: ${res.status}`);
  return client.withHeaders({ authorization: `Bearer ${res.body.token}` });
}

test('a team works on a project together', async () => {
  const shiela = await signUp('Shiela');
  const grace = await signUp('Grace');

  const team = await shiela.api.post('/teams', { body: { name: 'Launch' } });
  assert.ok(team.ok);
  const teamId = team.body.id;

  // Grace cannot see the team until she is added.
  const hidden = await grace.api.get('/teams/:teamId/projects', {
    params: { teamId },
  });
  assert.equal(hidden.status, 404);

  const added = await shiela.api.post('/teams/:teamId/members', {
    params: { teamId },
    body: { email: 'grace@example.com' },
  });
  assert.equal(added.status, 201);

  const project = await grace.api.post('/teams/:teamId/projects', {
    params: { teamId },
    body: { name: 'Website' },
  });
  assert.ok(project.ok);
  const projectId = project.body.id;

  const task = await shiela.api.post('/projects/:projectId/tasks', {
    params: { projectId },
    body: {
      title: 'Design homepage',
      dueDate: '2026-11-01',
      assigneeId: added.ok ? added.body.id : 0,
    },
  });
  assert.ok(task.ok);
  // Typed from the response schema: a Date on the server, a string in JSON.
  assert.equal(typeof task.body.createdAt, 'string');

  const moved = await grace.api.patch('/tasks/:taskId', {
    params: { taskId: task.body.id },
    body: { status: 'doing' },
  });
  assert.ok(moved.ok);
  assert.equal(moved.body.status, 'doing');

  const doing = await grace.api.get('/projects/:projectId/tasks', {
    params: { projectId },
    query: { status: 'doing' },
  });
  assert.ok(doing.ok);
  assert.deepEqual(
    doing.body.items.map((t) => t.title),
    ['Design homepage'],
  );
});

test('requests without a token are refused', async () => {
  const res = await client.api.get('/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('www-authenticate'), 'Bearer');
});

test('serves its OpenAPI document, and CORS for the web origin from the config', async () => {
  const docs = await client.get('/openapi.json');
  assert.equal(docs.status, 200);
  const paths = Object.keys((docs.body as { paths: object }).paths);
  assert.ok(paths.includes('/teams'));
  assert.ok(!paths.includes('/openapi.json'));

  const preflight = await client.request('OPTIONS', '/teams', {
    headers: {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'POST',
    },
  });
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});
