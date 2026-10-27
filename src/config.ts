import { defineConfig, type TokenType } from '@avijs/core';
import * as v from 'valibot';

// Environment variables, checked when the app starts. A .env file is read too, if present.
const env = v.object({
  PORT: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'PORT must be a number'), v.transform(Number)),
    '3000',
  ),
  // Signs session tokens. At least 32 characters.
  TOKEN_SECRET: v.pipe(v.string(), v.minLength(32, 'TOKEN_SECRET must be at least 32 characters')),
  UPLOAD_DIR: v.optional(v.string(), 'uploads'),
  // The React app during development.
  WEB_ORIGIN: v.optional(v.pipe(v.string(), v.url()), 'http://localhost:5173'),
});

export const Config = defineConfig(env, { envFile: '.env' });
export type Config = TokenType<typeof Config>;
