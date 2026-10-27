import { HttpError, Injectable } from '@avijs/core';
import { Db, type Task } from '../../common/database.module.js';
import { TaskEvents } from './task-events.js';
import type { CreateTaskDto, UpdateTaskDto } from './tasks.dto.js';

interface ListOptions {
  status?: string;
  assigneeId?: number;
  limit: number;
  offset: number;
}

const byStatusThenAge = (a: Task, b: Task) =>
  a.status.localeCompare(b.status) || a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;

@Injectable()
export class TasksService {
  constructor(
    private readonly db: Db,
    private readonly events: TaskEvents,
  ) {}

  list(projectId: number, options: ListOptions) {
    const matching = this.db.tasks
      .filter(
        (t) =>
          t.projectId === projectId &&
          (options.status === undefined || t.status === options.status) &&
          (options.assigneeId === undefined || t.assigneeId === options.assigneeId),
      )
      .sort(byStatusThenAge);
    const items = matching.slice(options.offset, options.offset + options.limit);
    return { items, total: matching.length };
  }

  create(projectId: number, teamId: number, input: CreateTaskDto) {
    if (input.assigneeId != null) this.#checkMember(teamId, input.assigneeId);
    const now = new Date();
    const task = this.db.tasks.insert({
      projectId,
      title: input.title,
      description: input.description ?? null,
      status: 'todo',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigneeId: input.assigneeId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    if (task.assigneeId !== null) this.#notifyAssignee(task);
    this.events.publish({ type: 'created', projectId, taskId: task.id });
    return task;
  }

  update(taskId: number, teamId: number, input: UpdateTaskDto) {
    if (input.assigneeId != null) this.#checkMember(teamId, input.assigneeId);
    const before = this.db.tasks.get(taskId);
    if (!before) throw new HttpError(404, 'Task not found');
    const task = this.db.tasks.update(taskId, {
      ...input,
      dueDate: input.dueDate === undefined ? undefined : input.dueDate ? new Date(input.dueDate) : null,
      updatedAt: new Date(),
    }) as Task;
    if (task.assigneeId !== null && task.assigneeId !== before.assigneeId) {
      this.#notifyAssignee(task);
    }
    this.events.publish({ type: 'updated', projectId: task.projectId, taskId });
    return task;
  }

  remove(taskId: number) {
    const task = this.db.tasks.delete(taskId);
    if (!task) throw new HttpError(404, 'Task not found');
    for (const attachment of this.db.attachments.filter((a) => a.taskId === taskId)) {
      this.db.attachments.delete(attachment.id);
    }
    this.events.publish({ type: 'deleted', projectId: task.projectId, taskId });
  }

  #checkMember(teamId: number, userId: number) {
    if (!this.db.membership(userId, teamId)) {
      throw new HttpError(422, 'The assignee is not in this team');
    }
  }

  // Queued for the email loop; the request does not wait for the email.
  #notifyAssignee(task: Task) {
    const assignee = task.assigneeId === null ? undefined : this.db.users.get(task.assigneeId);
    const project = this.db.projects.get(task.projectId);
    if (!assignee || !project) return;
    this.db.outbox.insert({
      to: assignee.email,
      subject: `Assigned: ${task.title}`,
      body: `You were assigned "${task.title}" in ${project.name}.`,
      createdAt: new Date(),
      sentAt: null,
    });
  }
}
