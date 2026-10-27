import { AviFactory } from '@avijs/core';
import { AppModule } from './app.module.js';
import { Config } from './config.js';

const app = await AviFactory.create(AppModule);
await app.listen(app.get(Config).PORT);

const shutdown = () => {
  void app.close().then(() => process.exit(0));
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
