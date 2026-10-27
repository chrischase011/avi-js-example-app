import type { Db } from './common/database.module.js';

/** Sends queued emails. A real app calls its email provider here. */
export function sendQueuedEmails(db: Db): void {
  for (const email of db.outbox.filter((e) => e.sentAt === null)) {
    console.log(`email to ${email.to}: ${email.subject}`);
    db.outbox.update(email.id, { sentAt: new Date() });
  }
}
