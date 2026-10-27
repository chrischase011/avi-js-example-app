import { Injectable } from '@avijs/core';
import type { CreateUserDto, User } from './dto/user.dto.js';

@Injectable()
export class UsersService {
  readonly #users: User[] = [{ id: 1, name: 'Shiela' }];

  findAll(): User[] {
    return this.#users;
  }

  findOne(id: number): User | undefined {
    return this.#users.find((user) => user.id === id);
  }

  create(dto: CreateUserDto): User {
    const user = { id: this.#users.length + 1, name: dto.name };
    this.#users.push(user);
    return user;
  }
}
