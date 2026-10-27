import { HttpError, type Context } from '@avijs/core';
import type { PublicUser } from './auth.dto.js';
import { TokenService } from './tokens.service.js';

declare module '@avijs/core' {
  interface AviState {
    user?: PublicUser;
  }
}

/** Requires `Authorization: Bearer <token>` and puts the user on `ctx.state.user`. */
export class AuthGuard {
  constructor(private readonly tokens: TokenService) {}

  canActivate(ctx: Context): boolean {
    const header = ctx.headers.authorization;
    const user = header?.startsWith('Bearer ') ? this.tokens.verify(header.slice(7)) : undefined;
    if (!user) {
      throw new HttpError(401, 'Sign in first', {
        headers: { 'www-authenticate': 'Bearer' },
      });
    }
    ctx.state.user = user;
    return true;
  }
}
