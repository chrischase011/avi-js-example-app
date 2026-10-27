import {
  Controller,
  Get,
  Post,
  UseGuards,
  reply,
  type Context,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import * as v from 'valibot';
import { AuthGuard } from '../auth/auth.guard.js';
import { TeamMemberGuard, requireTeamRole } from './team.guard.js';
import {
  AddMemberDto,
  CreateProjectDto,
  CreateTeamDto,
  Member,
  Project,
  Team,
  TeamParams,
} from './teams.dto.js';
import { TeamsService } from './teams.service.js';

const create = { body: CreateTeamDto, response: Team } satisfies RouteSchema;
const members = {
  params: TeamParams,
  response: v.array(Member),
} satisfies RouteSchema;
const addMember = {
  params: TeamParams,
  body: AddMemberDto,
  response: Member,
} satisfies RouteSchema;
const projects = {
  params: TeamParams,
  response: v.array(Project),
} satisfies RouteSchema;
const createProject = {
  params: TeamParams,
  body: CreateProjectDto,
  response: Project,
} satisfies RouteSchema;

@Controller('/teams')
@UseGuards(AuthGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get('/', { schema: { response: v.array(Team) } })
  list(ctx: Context) {
    return this.teams.listFor(ctx.need('user').id);
  }

  @Post('/', { schema: create })
  async create(ctx: RouteContext<typeof create>) {
    return reply(await this.teams.create(ctx.need('user').id, ctx.input.body.name), {
      status: 201,
    });
  }

  @Get('/:teamId/members', { schema: members })
  @UseGuards(TeamMemberGuard)
  members(ctx: RouteContext<typeof members>) {
    return this.teams.members(ctx.input.params.teamId);
  }

  @Post('/:teamId/members', { schema: addMember })
  @UseGuards(TeamMemberGuard, requireTeamRole('owner'))
  async addMember(ctx: RouteContext<typeof addMember>) {
    const { email, role } = ctx.input.body;
    return reply(await this.teams.addMember(ctx.input.params.teamId, email, role), { status: 201 });
  }

  @Get('/:teamId/projects', { schema: projects })
  @UseGuards(TeamMemberGuard)
  projects(ctx: RouteContext<typeof projects>) {
    return this.teams.projects(ctx.input.params.teamId);
  }

  @Post('/:teamId/projects', { schema: createProject })
  @UseGuards(TeamMemberGuard)
  async createProject(ctx: RouteContext<typeof createProject>) {
    const project = await this.teams.createProject(ctx.input.params.teamId, ctx.input.body.name);
    return reply(project, { status: 201 });
  }
}
