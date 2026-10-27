// Sends queued emails until stopped. Run it next to the API: npm run worker.
import { setTimeout as sleep } from 'node:timers/promises';
import { runWorker } from '@avijs/workers';
import { DatabaseModule } from './common/database.module.js';
import { Config } from './config.js';
import { PrismaClient } from './generated/prisma/client.js';

await runWorker({ imports: [Config.module, DatabaseModule] }, async (app, signal) => {
  const db = app.get(PrismaClient);
  while (!signal.aborted) {
    const batch = await db.outboxEmail.findMany({
      where: { sentAt: null },
      orderBy: { id: 'asc' },
      take: 20,
    });
    for (const email of batch) {
      // A real app calls its email provider here.
      console.log(`email to ${email.to}: ${email.subject}`);
      await db.outboxEmail.update({
        where: { id: email.id },
        data: { sentAt: new Date() },
      });
    }
    if (process.env['ONCE']) return;
    if (batch.length === 0) await sleep(1_000, undefined, { signal }).catch(() => undefined);
  }
});
