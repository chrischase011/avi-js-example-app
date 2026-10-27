import { createAvi, defineHook, type AviOptions } from '@avijs/core';
import { cors, securityHeaders } from '@avijs/security';
import { AppModule } from './app.module.js';
import { Config } from './config.js';

/** The app, initialized: the HTTP entry point and the tests share it. */
export async function createApp(options: AviOptions = {}) {
  const app = createAvi({
    onRequest: [
      securityHeaders(),
      defineHook({
        inject: [Config],
        create: (config) => cors({ origin: [config.WEB_ORIGIN], credentials: true }),
      }),
    ],
    ...options,
  }).register(AppModule);
  await app.init();
  return app;
}
