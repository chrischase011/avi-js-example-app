import { defineConfig, type TokenType } from '@avijs/core';
import * as v from 'valibot';

// Environment variables, checked when the app starts. A .env file is read too, if present.
const env = v.object({
  PORT: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'PORT must be a number'), v.transform(Number)),
    '3000',
  ),
});

export const Config = defineConfig(env, { envFile: '.env' });
// The validated values, to type an injected config: constructor(private readonly config: Config).
export type Config = TokenType<typeof Config>;
