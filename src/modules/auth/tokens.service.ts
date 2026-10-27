import { Injectable } from '@avijs/core';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Config } from '../../config.js';
import type { PublicUser } from './auth.dto.js';

interface Payload {
  user: PublicUser;
  /** Expiry, in seconds since the epoch. */
  exp: number;
}

/** Signed, expiring session tokens: base64url(payload).base64url(hmac). */
@Injectable()
export class TokenService {
  constructor(private readonly config: Config) {}

  sign(user: PublicUser, ttlSeconds = 12 * 3600): string {
    const payload: Payload = {
      user,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${this.#mac(body)}`;
  }

  verify(token: string): PublicUser | undefined {
    const [body, mac] = token.split('.');
    if (!body || !mac) return undefined;
    const expected = Buffer.from(this.#mac(body));
    const given = Buffer.from(mac);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Payload;
    return payload.exp > Date.now() / 1000 ? payload.user : undefined;
  }

  #mac(body: string): string {
    return createHmac('sha256', this.config.TOKEN_SECRET).update(body).digest('base64url');
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [salt = '', hash = ''] = stored.split(':');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 32);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
