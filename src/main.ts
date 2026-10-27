import { cluster } from '@avijs/workers';
import { createApp } from './app.js';
import { Config } from './config.js';

// One process per CPU core (WORKERS=2 to choose); in development, a single process.
await cluster(
  async () => {
    const app = await createApp();
    await app.listen(app.get(Config).PORT);
    return app;
  },
  { workers: process.env['WORKERS'] ? Number(process.env['WORKERS']) : 'auto' },
);
