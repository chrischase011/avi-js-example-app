import {
  Controller,
  Get,
  HttpError,
  Post,
  reply,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import { CreateUserDto, User, UserId, UserList } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

const findOne = { params: UserId, response: User } satisfies RouteSchema;
const create = { body: CreateUserDto, response: User } satisfies RouteSchema;

@Controller('/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('/', { schema: { response: UserList } })
  findAll() {
    return this.users.findAll();
  }

  @Get('/:id', { schema: findOne })
  findOne(ctx: RouteContext<typeof findOne>) {
    const user = this.users.findOne(ctx.input.params.id);
    if (!user) throw new HttpError(404, 'User not found');
    return user;
  }

  @Post('/', { schema: create })
  create(ctx: RouteContext<typeof create>) {
    return reply(this.users.create(ctx.input.body), { status: 201 });
  }
}
