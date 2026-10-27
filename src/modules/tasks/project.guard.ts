import { HttpError, type Context } from '@avijs/core';
import { PrismaClient } from '../../generated/prisma/client.js';

declare module '@avijs/core' {
  interface AviState {
    project?: { id: number; teamId: number };
  }
}

/**
 * Lets members of the project's team through, for routes with `:projectId` or `:taskId`, and puts
 * the project on `ctx.state.project`. Use after AuthGuard.
 */
export class ProjectMemberGuard {
  constructor(private readonly db: PrismaClient) {}

  async canActivate(ctx: Context): Promise<boolean> {
    const userId = ctx.need('user').id;
    const projectId = await this.#projectId(ctx);
    const project =
      projectId === undefined
        ? null
        : await this.db.project.findFirst({
            where: { id: projectId, team: { members: { some: { userId } } } },
          });
    if (!project) {
      throw new HttpError(404, ctx.params['taskId'] ? 'Task not found' : 'Project not found');
    }
    ctx.state.project = { id: project.id, teamId: project.teamId };
    return true;
  }

  async #projectId(ctx: Context): Promise<number | undefined> {
    const raw = ctx.params['projectId'];
    if (raw !== undefined) return /^\d+$/.test(raw) ? Number(raw) : undefined;
    const taskId = ctx.params['taskId'];
    if (taskId === undefined || !/^\d+$/.test(taskId)) return undefined;
    const task = await this.db.task.findUnique({
      where: { id: Number(taskId) },
    });
    return task?.projectId;
  }
}
