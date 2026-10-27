import { HttpError, Injectable } from '@avijs/core';
import { httpError } from '../../common/database.module.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { LoginDto, PublicUser, RegisterDto } from './auth.dto.js';
import { TokenService, checkPassword, hashPassword } from './tokens.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterDto): Promise<{ token: string; user: PublicUser }> {
    const user = await this.db.user
      .create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: hashPassword(input.password),
        },
      })
      .catch((error: unknown) => {
        throw httpError(error, 'User not found');
      });
    await this.db.outboxEmail.create({
      data: {
        to: user.email,
        subject: 'Welcome to Tasks',
        body: `Hi ${user.name}, welcome aboard.`,
      },
    });
    return this.#session(user);
  }

  async login(input: LoginDto): Promise<{ token: string; user: PublicUser }> {
    const user = await this.db.user.findUnique({
      where: { email: input.email },
    });
    // Same answer for an unknown email and a wrong password.
    if (!user || !checkPassword(input.password, user.passwordHash)) {
      throw new HttpError(401, 'Wrong email or password');
    }
    return this.#session(user);
  }

  #session(user: PublicUser) {
    const publicUser = { id: user.id, email: user.email, name: user.name };
    return { token: this.tokens.sign(publicUser), user: publicUser };
  }
}
