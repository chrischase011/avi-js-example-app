import { HttpError, Injectable } from '@avijs/core';
import { Db } from '../../common/database.module.js';
import type { LoginDto, PublicUser, RegisterDto } from './auth.dto.js';
import { TokenService, checkPassword, hashPassword } from './tokens.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly tokens: TokenService,
  ) {}

  register(input: RegisterDto): { token: string; user: PublicUser } {
    if (this.db.users.find((u) => u.email === input.email)) {
      throw new HttpError(409, 'Already exists');
    }
    const user = this.db.users.insert({
      email: input.email,
      name: input.name,
      passwordHash: hashPassword(input.password),
      createdAt: new Date(),
    });
    this.db.outbox.insert({
      to: user.email,
      subject: 'Welcome to Tasks',
      body: `Hi ${user.name}, welcome aboard.`,
      createdAt: new Date(),
      sentAt: null,
    });
    return this.#session(user);
  }

  login(input: LoginDto): { token: string; user: PublicUser } {
    const user = this.db.users.find((u) => u.email === input.email);
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
