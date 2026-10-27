# Tasks: an Avi.js example app (in-memory, for StackBlitz)

This branch is the [main branch's](https://github.com/chrischase011/avi-js-example-app) team task
tracker with its data in memory instead of Prisma and SQLite, whose native engines cannot run in
StackBlitz. [Open it on StackBlitz](https://stackblitz.com/github/chrischase011/avi-js-example-app/tree/in-memory).

- **API** (`src/`): sign-up and sign-in with signed tokens, teams with owner and member roles,
  projects, tasks with filters and paging, file attachments, live task updates (SSE), security
  headers, CORS, OpenAPI at `/openapi.json`.
- **Emails** (`src/outbox.ts`): queued emails are sent (logged) every second, in the API process.
- **Frontend** (`web/`): React + Vite, calling the API through `@avijs/client` with the generated
  `Api` type. Vite forwards `/api` to the API.
- **Data** (`src/common/database.module.ts`): an in-memory `Db` provider. It is empty on every
  start.

Differences from main: one process (main runs one per core with `cluster()`, and the email worker
on its own with `runWorker()`), since processes cannot share memory.

No class has `static inject`: `avi dev` and `avi build` infer the dependency lists from
constructors into `src/inject.gen.ts`.

## Running it

```sh
npm install && npm run dev:all   # the API on :3000, the React app on :5173
```

`dev:all` creates `.env` from `.env.example` when there is none (change `TOKEN_SECRET` outside a
demo) and installs `web/`. `npm run dev` runs the API alone; `npm test` runs the end-to-end tests.

## Linking

```md
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/chrischase011/avi-js-example-app/tree/in-memory?file=src/modules/tasks/tasks.service.ts)
```

An inline `<iframe>` embed only runs on pages served with cross-origin isolation headers, which
GitHub Pages cannot send, so link to it instead.
