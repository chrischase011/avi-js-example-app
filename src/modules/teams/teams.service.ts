import { HttpError, Injectable } from '@avijs/core';
import { Db } from '../../common/database.module.js';
import type { TeamRole } from './team.guard.js';

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

@Injectable()
export class TeamsService {
  constructor(private readonly db: Db) {}

  listFor(userId: number) {
    return this.db.memberships
      .filter((m) => m.userId === userId)
      .flatMap((m) => {
        const team = this.db.teams.get(m.teamId);
        return team ? [{ id: team.id, name: team.name, role: m.role }] : [];
      })
      .sort(byName);
  }

  create(userId: number, name: string) {
    const team = this.db.teams.insert({ name, createdAt: new Date() });
    this.db.memberships.push({ userId, teamId: team.id, role: 'owner' });
    return { id: team.id, name: team.name, role: 'owner' };
  }

  members(teamId: number) {
    return this.db.memberships
      .filter((m) => m.teamId === teamId)
      .flatMap((m) => {
        const user = this.db.users.get(m.userId);
        return user ? [{ ...user, role: m.role }] : [];
      })
      .sort(byName);
  }

  addMember(teamId: number, email: string, role: TeamRole) {
    const user = this.db.users.find((u) => u.email === email);
    if (!user) throw new HttpError(404, 'No user with that email');
    if (!this.db.teams.get(teamId)) throw new HttpError(404, 'Team not found');
    if (this.db.membership(user.id, teamId)) throw new HttpError(409, 'Already exists');
    this.db.memberships.push({ userId: user.id, teamId, role });
    return { ...user, role };
  }

  projects(teamId: number) {
    return this.db.projects.filter((p) => p.teamId === teamId).sort(byName);
  }

  createProject(teamId: number, name: string) {
    return this.db.projects.insert({ teamId, name, createdAt: new Date() });
  }
}
