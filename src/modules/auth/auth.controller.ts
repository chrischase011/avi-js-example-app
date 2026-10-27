import {
  Controller,
  Get,
  Post,
  UseGuards,
  reply,
  type Context,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import { rateLimit } from '@avijs/security';
import { LoginDto, PublicUser, RegisterDto, Session } from './auth.dto.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

const register = { body: RegisterDto, response: Session } satisfies RouteSchema;
const login = { body: LoginDto, response: Session } satisfies RouteSchema;

// 10 sign-in attempts per 15 minutes per address.
const loginLimit = rateLimit({ limit: 10, window: 15 * 60_000 });

@Controller('/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('/register', { schema: register })
  register(ctx: RouteContext<typeof register>) {
    return reply(this.auth.register(ctx.input.body), { status: 201 });
  }

  @Post('/login', { schema: login })
  @UseGuards(loginLimit.guard)
  login(ctx: RouteContext<typeof login>) {
    return this.auth.login(ctx.input.body);
  }

  @Get('/me', { schema: { response: PublicUser } })
  @UseGuards(AuthGuard)
  me(ctx: Context) {
    return ctx.need('user');
  }
}
