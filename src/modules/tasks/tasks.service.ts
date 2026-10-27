import { HttpError, Injectable } from '@avijs/core';
import { PrismaClient } from '../../generated/prisma/client.js';
import { TaskEvents } from './task-events.js';
import type { CreateTaskDto, UpdateTaskDto } from './tasks.dto.js';

interface ListOptions {
  status?: string;
  assigneeId?: number;
  limit: number;
  offset: number;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly db: PrismaClient,
    private readonly events: TaskEvents,
  ) {}

  async list(projectId: number, options: ListOptions) {
    const where = {
      projectId,
      status: options.status,
      assigneeId: options.assigneeId,
    };
    const [items, total] = await Promise.all([
      this.db.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        take: options.limit,
        skip: options.offset,
      }),
      this.db.task.count({ where }),
    ]);
    return { items, total };
  }

  async create(projectId: number, teamId: number, input: CreateTaskDto) {
    if (input.assigneeId != null) await this.#checkMember(teamId, input.assigneeId);
    const task = await this.db.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assigneeId: input.assigneeId ?? null,
      },
    });
    if (task.assigneeId !== null) await this.#notifyAssignee(task.id);
    this.events.publish({ type: 'created', projectId, taskId: task.id });
    return task;
  }

  async update(taskId: number, teamId: number, input: UpdateTaskDto) {
    if (input.assigneeId != null) await this.#checkMember(teamId, input.assigneeId);
    const before = await this.db.task.findUniqueOrThrow({
      where: { id: taskId },
    });
    const task = await this.db.task.update({
      where: { id: taskId },
      data: {
        ...input,
        dueDate: input.dueDate === undefined ? undefined : input.dueDate && new Date(input.dueDate),
      },
    });
    if (task.assigneeId !== null && task.assigneeId !== before.assigneeId) {
      await this.#notifyAssignee(task.id);
    }
    this.events.publish({ type: 'updated', projectId: task.projectId, taskId });
    return task;
  }

  async remove(taskId: number) {
    const task = await this.db.task.delete({ where: { id: taskId } });
    this.events.publish({ type: 'deleted', projectId: task.projectId, taskId });
  }

  async #checkMember(teamId: number, userId: number) {
    const member = await this.db.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!member) throw new HttpError(422, 'The assignee is not in this team');
  }

  // Queued for the worker; the request does not wait for the email.
  async #notifyAssignee(taskId: number) {
    const task = await this.db.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { assignee: true, project: true },
    });
    if (!task.assignee) return;
    await this.db.outboxEmail.create({
      data: {
        to: task.assignee.email,
        subject: `Assigned: ${task.title}`,
        body: `You were assigned "${task.title}" in ${task.project.name}.`,
      },
    });
  }
}
