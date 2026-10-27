import { HttpError, Injectable } from '@avijs/core';
import { httpError } from '../../common/database.module.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { TeamRole } from './team.guard.js';

@Injectable()
export class TeamsService {
  constructor(private readonly db: PrismaClient) {}

  async listFor(userId: number) {
    const memberships = await this.db.membership.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { team: { name: 'asc' } },
    });
    return memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      role: m.role,
    }));
  }

  async create(userId: number, name: string) {
    const team = await this.db.team.create({
      data: { name, members: { create: { userId, role: 'owner' } } },
    });
    return { id: team.id, name: team.name, role: 'owner' };
  }

  async members(teamId: number) {
    const memberships = await this.db.membership.findMany({
      where: { teamId },
      include: { user: true },
      orderBy: { user: { name: 'asc' } },
    });
    return memberships.map((m) => ({ ...m.user, role: m.role }));
  }

  async addMember(teamId: number, email: string, role: TeamRole) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(404, 'No user with that email');
    await this.db.membership
      .create({ data: { teamId, userId: user.id, role } })
      .catch((e: unknown) => {
        throw httpError(e, 'Team not found');
      });
    return { ...user, role };
  }

  projects(teamId: number) {
    return this.db.project.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
    });
  }

  createProject(teamId: number, name: string) {
    return this.db.project.create({ data: { teamId, name } });
  }
}
