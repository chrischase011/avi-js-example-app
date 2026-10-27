# Tasks: an Avi.js example app

A team task tracker built on Avi.js 1.0.0-rc.4. It started on 0.5.3 as a test to find friction
before 1.0; what it found is in [FRICTION.md](FRICTION.md).

- **API** (`src/`): sign-up and sign-in with signed tokens, teams with owner and member roles,
  projects, tasks with filters and paging, file attachments, live task updates (SSE), security
  headers, CORS, OpenAPI at `/openapi.json`, one process per core with `cluster()`.
- **Worker** (`src/worker.ts`): sends queued emails (logged) with `runWorker()`.
- **Frontend** (`web/`): React + Vite, calling the API through `@avijs/client` with the generated
  `Api` type.
- **Database**: Prisma 7 with SQLite.

No class has `static inject`: `avi dev` and `avi build` infer the dependency lists from
constructors into `src/inject.gen.ts`.

## Running it

```sh
npm install
cp .env.example .env        # then set TOKEN_SECRET (32 or more characters)
npx prisma migrate deploy   # creates dev.db
npx prisma generate
npm run build
PORT=3100 npm start         # the API, on every core
npm run worker              # in another terminal: sends queued emails

cd web
npm install
npm run dev                 # http://localhost:5173
```

`npm run dev` rebuilds on save and keeps `src/inject.gen.ts` and `src/api.gen.ts` up to date.
`npm test` runs the end-to-end tests against a fresh `test.db`.
