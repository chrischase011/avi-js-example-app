import * as v from 'valibot';

export const UserId = v.object({
  id: v.pipe(v.string(), v.regex(/^\d+$/, 'id must be a number'), v.transform(Number)),
});

export const CreateUserDto = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, 'name is required'), v.maxLength(100)),
});
export type CreateUserDto = v.InferOutput<typeof CreateUserDto>;

// Responses are checked against these and lose any field not listed, so internals cannot leak.
export const User = v.object({
  id: v.number(),
  name: v.string(),
});
export type User = v.InferOutput<typeof User>;

export const UserList = v.array(User);
