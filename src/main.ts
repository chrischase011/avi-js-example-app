import { createApp } from './app.js';
import { Db } from './common/database.module.js';
import { Config } from './config.js';
import { sendQueuedEmails } from './outbox.js';

// One process: the data lives in its memory, which cluster() workers and a separate email worker
// could not share. The main branch runs both, on a database.
const app = await createApp();
await app.listen(app.get(Config).PORT);
const emails = setInterval(() => sendQueuedEmails(app.get(Db)), 1_000);

const shutdown = () => {
  clearInterval(emails);
  void app.close().then(() => process.exit(0));
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
