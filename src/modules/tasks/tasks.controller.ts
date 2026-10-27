import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
  reply,
  sse,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import { AuthGuard } from '../auth/auth.guard.js';
import { ProjectMemberGuard } from './project.guard.js';
import { TaskEvents } from './task-events.js';
import {
  CreateTaskDto,
  ListQuery,
  ProjectParams,
  Task,
  TaskPage,
  TaskParams,
  UpdateTaskDto,
} from './tasks.dto.js';
import { TasksService } from './tasks.service.js';

const list = {
  params: ProjectParams,
  query: ListQuery,
  response: TaskPage,
} satisfies RouteSchema;
const create = {
  params: ProjectParams,
  body: CreateTaskDto,
  response: Task,
} satisfies RouteSchema;
const events = { params: ProjectParams } satisfies RouteSchema;
const update = {
  params: TaskParams,
  body: UpdateTaskDto,
  response: Task,
} satisfies RouteSchema;
const remove = { params: TaskParams } satisfies RouteSchema;

@Controller('/projects/:projectId')
@UseGuards(AuthGuard, ProjectMemberGuard)
export class ProjectTasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly taskEvents: TaskEvents,
  ) {}

  @Get('/tasks', { schema: list })
  list(ctx: RouteContext<typeof list>) {
    return this.tasks.list(ctx.input.params.projectId, ctx.input.query);
  }

  @Post('/tasks', { schema: create })
  create(ctx: RouteContext<typeof create>) {
    const teamId = ctx.need('project').teamId;
    const task = this.tasks.create(ctx.input.params.projectId, teamId, ctx.input.body);
    return reply(task, { status: 201 });
  }

  /** Live task changes for this project, as server-sent events. */
  @Get('/events', { schema: events })
  events(ctx: RouteContext<typeof events>) {
    const projectId = ctx.input.params.projectId;
    return sse(ctx, (signal) => this.#events(projectId, signal));
  }

  async *#events(projectId: number, signal: AbortSignal) {
    for await (const event of this.taskEvents.subscribe(projectId, signal)) {
      yield { event: event.type, data: event };
    }
  }
}

@Controller('/tasks/:taskId')
@UseGuards(AuthGuard, ProjectMemberGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Patch('', { schema: update })
  update(ctx: RouteContext<typeof update>) {
    return this.tasks.update(ctx.input.params.taskId, ctx.need('project').teamId, ctx.input.body);
  }

  @Delete('', { schema: remove })
  remove(ctx: RouteContext<typeof remove>) {
    this.tasks.remove(ctx.input.params.taskId);
  }
}
