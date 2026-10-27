import * as v from 'valibot';

const Id = v.pipe(v.string(), v.regex(/^\d+$/, 'must be a number'), v.transform(Number));
export const TeamParams = v.object({ teamId: Id });

const Name = v.pipe(v.string(), v.trim(), v.minLength(1, 'name is required'), v.maxLength(100));
export const CreateTeamDto = v.object({ name: Name });
export const AddMemberDto = v.object({
  email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email()),
  role: v.optional(v.picklist(['owner', 'member']), 'member'),
});
export const CreateProjectDto = v.object({ name: Name });

export const Team = v.object({
  id: v.number(),
  name: v.string(),
  role: v.string(),
});
export const Member = v.object({
  id: v.number(),
  email: v.string(),
  name: v.string(),
  role: v.string(),
});
export const Project = v.object({
  id: v.number(),
  name: v.string(),
  teamId: v.number(),
});
