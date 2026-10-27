import { HttpError, type Context } from '@avijs/core';
import { Db } from '../../common/database.module.js';

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
  constructor(private readonly db: Db) {}

  canActivate(ctx: Context): boolean {
    const userId = ctx.need('user').id;
    const projectId = this.#projectId(ctx);
    const project = projectId === undefined ? undefined : this.db.projects.get(projectId);
    if (!project || !this.db.membership(userId, project.teamId)) {
      throw new HttpError(404, ctx.params['taskId'] ? 'Task not found' : 'Project not found');
    }
    ctx.state.project = { id: project.id, teamId: project.teamId };
    return true;
  }

  #projectId(ctx: Context): number | undefined {
    const raw = ctx.params['projectId'];
    if (raw !== undefined) return /^\d+$/.test(raw) ? Number(raw) : undefined;
    const taskId = ctx.params['taskId'];
    if (taskId === undefined || !/^\d+$/.test(taskId)) return undefined;
    return this.db.tasks.get(Number(taskId))?.projectId;
  }
}
