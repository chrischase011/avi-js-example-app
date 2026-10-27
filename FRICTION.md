# Friction log

Building a team task tracker on Avi.js 0.5.3 as a new user would, to find what to fix before 1.0.
Each entry: what happened, how much it hurt (high / medium / low), and a suggestion.

## Setup

- **low** `npm create avi` does not `git init` the project (NestJS's CLI does). Not a problem,
  but a fresh project is usually committed right away. Suggestion: `--git` flag, or mention
  `git init` in the "Next" steps it prints.
- **low** The printed "Next" steps say `npm install`; the CLI could offer to run it (a
  `--install` flag), as `create-vite` and NestJS do.

## Guards and routes

- **low** Guards run before validation, so a guard that needs `:teamId` parses
  `ctx.params['teamId']` itself, although the route's schema already says how. A typed way to read
  validated params in guards (or an option to run some guards after validation) would avoid the
  duplicate parsing.
- **low** Each route with a schema needs a named constant (`const addMember = { params, body,
  response } satisfies RouteSchema`) used twice: in the decorator and in `RouteContext<typeof …>`.
  Six routes means six constants at the top of the controller. It reads fine, but it is the main
  boilerplate in a controller.

- **medium** State a guard sets stays optional everywhere. `ProjectMemberGuard` always sets
  `ctx.state.project`, yet every handler behind it writes `ctx.state.project?.teamId ?? 0`: a
  dummy fallback for a case that cannot happen. A way for guards to declare what they add to
  `ctx.state`, typed for the routes they guard, would remove it (Hono's typed middleware
  variables do this).
- **low, fixed in the repo** (chapter 7 recipe) Sharing one live event stream needs care that the docs do not cover: per-project
  pub/sub with `node:events`' `on()` and an abort signal works well with `sse()`, but a recipe in
  chapter 7 would help. And in a `cluster()`, events only reach clients on the same worker
  (chapter 16 says state is per worker, but SSE is where it bites first).

## Uploads

- **low** The `accept` refusal reads "File file has type text/html; …" when the form field is
  called `file`, which is the most common name. Quote it: `File "file" has type …`.
- **low** To store an upload's size, I counted bytes with a `data` listener on `part.stream`. File
  parts could report the bytes received once the stream ends (`part.size` or a promise), as
  `readForm` already does for buffered files.
- **low** Chapter 14's streaming example does not delete the partial file when a limit stops the
  upload; the text mentions it, but the example is what gets copied.

## App setup, security and OpenAPI

- **bug, fixed in the repo** Chapter 11's Valibot setup did not compile:
  `toJsonSchema: (schema) => toJsonSchema(schema as never, …)` returns Valibot's `JsonSchema`,
  which lacks the index signature `@avijs/openapi` required. The repo's own test hid it with a
  cast. `toJsonSchema` now accepts any object.
- **medium** Serving `/openapi.json` from the app is a two-phase dance: the document needs an
  initialized app, the route must be registered before `init()`, so the route closes over a
  `let document` filled in afterwards, and `AviFactory.create` cannot be used. A built-in
  `openApiRoute({ info, … })` controller (or `generateOpenApi` usable from a handler, given the
  app) would make it one line.
- **medium** `onRequest` hooks (CORS, security headers) are created before dependency injection, so
  `cors({ origin: config.WEB_ORIGIN })` needs the config loaded by hand (`await Config.load()`)
  outside the DI graph, and it is then loaded twice. Hooks that can take injected values, or a
  module-level way to register hooks with `inject`, would keep config in one place.
- **low** With `cluster()` in `main.ts`, I moved app creation into `createApp()` so tests can reuse
  it. The template's `main.ts` builds the app inline; a template that already has `createApp()`
  would be ready for both.

## Typed client in a React (Vite) frontend

- **high, fixed in the repo** (templates emit declarations; chapter 15 shows the `dist` import; a
  CLI test type-checks a Vite-style frontend against every template) Importing the generated `Api` into a standard `npm create vite` React app fails to
  type-check: `src/api.gen.ts` points at the server's source files, so the frontend's compiler
  checks all server code under its own settings. Vite's template has `erasableSyntaxOnly` (which
  rejects the constructor parameter properties every Avi service uses) and DOM-only types (no
  `Buffer`, no `node:crypto`): 25+ errors in server files. Workaround that works: turn on
  `declaration` in the server's tsconfig and import `Api` from `dist/api.gen.js`, so the frontend
  only reads `.d.ts` files, which `skipLibCheck` skips. Suggestion: templates emit declarations,
  chapter 15 shows the `dist` import, or `avi client` writes a `.d.ts` bundle that needs no server
  source.
- **medium, fixed in the repo** (`api.events()`) Live updates with token auth: the browser's `EventSource` cannot send an
  `Authorization` header, so `api.get('/projects/:projectId/events')` (typed as `Response`) has to
  be read by hand. I wrote a 30-line stream parser. Suggestion: `api.events(path, options,
  onEvent)` in `@avijs/client`, built on `fetch`, typed from the route.
- **medium, fixed in the repo** Query schemas that transform strings to numbers make the client require strings:
  `query: { limit: '100' }`; `limit: 100` is a type error, although the client stringifies query
  values anyway. The client's query type could accept numbers and booleans wherever the schema's
  input is a string.
- **low** Naming a response type in the frontend takes
  `Awaited<ReturnType<typeof api.get<'/teams'>>>[number]`. Helper types such as
  `ResponseOf<Api, 'GET /teams'>` and `BodyOf<Api, 'POST /teams'>` would make that one line.

## Worked well (typed client)

- Once it type-checked, the types were exact end to end: a typo in a request body
  (`{ nmae: 'typo' }`) was a compile error naming the server schema's field, and response dates are
  `string` as they arrive in JSON.
- `createClient`'s `headers: () => …` option made token auth a one-liner.

## Testing

- **medium, fixed in the repo** (`avi build` empties `dist/` first; templates use it) The
  template's `npm test` (`tsc && node --test "dist/**/*.test.js"`) runs stale
  compiled tests: after deleting `src/modules/users/`, `dist/modules/users/users.test.js` was still
  run and failed. `tsc` never removes old output. Suggestion: clean `dist` in the `build` and
  `test` scripts (for example a `prebuild` that removes it), or run tests from `src` with Node's
  type stripping.
- **medium, fixed in the repo** (`client.withHeaders({ authorization })`) No default headers on
  the typed test client: every authenticated call needs
  `...auth(token)` spread in. `createClient` has a `headers` option; `createTestClient` has none, and
  switching users mid-test wants something like `client.api.as(token)` or
  `client.with({ headers })`.
- **low** `assert.equal(res.status, 201)` does not narrow the response; only `assert.ok(res.ok)`
  does, so reading the body after a status check needs `res.ok ? res.body.id : …`.
- **note** `prisma migrate reset` refuses to run for an AI agent without the user's consent, so the
  test setup deletes its own `test.db` and runs `migrate deploy` instead, which is the safer
  pattern anyway.

## Workers

- **bug, fixed in the repo** `cluster()` without a `logger` printed `… ready in 493 ms
  { workers: 2, url: …, durationMs: 493.008 }`: `console` has `info()`, so it took the
  structured-logger path. Found on the first run with `WORKERS=2`.
- **medium, docs fixed in the repo** (loud warning in chapters 7 and 16; a pubsub port is later) The live view (SSE) silently breaks under `cluster()`: a task changed through worker A
  never reaches a browser connected to worker B. The app works in development (one process) and
  breaks in production. There is no built-in way to share events between workers; a `pubsub`
  port with an in-memory and a Redis adapter would fix it, or at least a loud warning in
  chapters 7 and 16.

## Worked well

- `runWorker({ imports: [Config.module, DatabaseModule] }, …)` reused the API's modules as is;
  the email worker was 20 lines.
- `cluster()` in `main.ts` was a three-line change, and development stays one process.

- `sse()` with an async generator over `events.on(…, { signal })` streamed task changes live, and
  disconnects cleaned up through the signal.
- Validation messages from `v.check` on the whole body (`send at least one field to change`) came
  through as a clear 400.

- Response schemas stripped `passwordHash` from a database row returned as is.
- `rateLimit().guard` on one route via `@UseGuards` was obvious from chapter 12.
- Startup summary on boot: `4 modules, 4 providers, 4 routes, config validated (5 variables)`.
- Errors had the right shape and status without any extra code (409 from a unique constraint via
  the `httpError` helper copied from the Prisma example).

## Config and providers

- **medium, fixed in the repo** (`defineFactory`) Factory providers are not type-checked against `inject`: `useFactory` is typed
  `(...deps: never[])`, so `inject: [Config]` with `(config: Wrong) => …`, or tokens in the wrong
  order, compile and fail at runtime. `avi check` only covers `static inject` on classes.
  Suggestion: infer the parameters from `inject` (as `defineController` does for `routes`), e.g. a
  `factory({ provide, inject: [Config], useFactory: (config) => … })` helper, and/or check
  factories in `avi check`.
- **low, fixed in the repo** Typing an injected config needs `TokenType<typeof Config>`, which a newcomer has to look up
  (chapter 13). The generated `config.ts` could export `export type Config = TokenType<typeof
  Config>`, the same pattern the generated DTO files use.
- **low, fixed in the repo** After deleting the template's `users` module, `tsc` fails in
  `src/api.gen.ts` ("Cannot find module './modules/users/users.controller.js'"). The fix was
  `npm run client`. `avi dev` now regenerates the file on save when routes change (tried here:
  adding and removing `GET /teams/ping` updated the file and restarted, with no stale error).
- **low, docs fixed in the repo** (chapter 13 shows a config-fed factory; the example follows after the release) The Prisma example reads `process.env['DATABASE_URL']` directly instead of using
  `defineConfig`, so the docs never show config injected into a factory provider, which is the
  first thing a database module needs.
