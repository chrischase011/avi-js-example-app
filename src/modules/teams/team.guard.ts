import { HttpError, type Context, type Guard } from '@avijs/core';
import { Db } from '../../common/database.module.js';

export type TeamRole = 'owner' | 'member';

declare module '@avijs/core' {
  interface AviState {
    team?: { id: number; role: TeamRole };
  }
}

/**
 * Lets members of the team in `:teamId` through and puts their role on `ctx.state.team`.
 * Runs before validation, so it parses the id itself. Use after AuthGuard.
 */
export class TeamMemberGuard {
  constructor(private readonly db: Db) {}

  canActivate(ctx: Context): boolean {
    const teamId = Number(ctx.params['teamId']);
    if (!Number.isInteger(teamId)) throw new HttpError(404, 'Team not found');
    const membership = this.db.membership(ctx.need('user').id, teamId);
    // Not a member looks the same as no such team, so ids do not reveal which teams exist.
    if (!membership) throw new HttpError(404, 'Team not found');
    ctx.state.team = { id: teamId, role: membership.role as TeamRole };
    return true;
  }
}

/** Requires one of `roles` in the team. Use after TeamMemberGuard. */
export function requireTeamRole(...roles: TeamRole[]): Guard {
  return (ctx) => {
    if (ctx.state.team && roles.includes(ctx.state.team.role)) return true;
    throw new HttpError(403, `Only team ${roles.join(' or ')}s can do this`);
  };
}
