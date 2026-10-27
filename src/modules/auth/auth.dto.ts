import * as v from 'valibot';

const Email = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('email is not valid'));
const Password = v.pipe(v.string(), v.minLength(8, 'password needs at least 8 characters'));

export const RegisterDto = v.object({
  email: Email,
  name: v.pipe(v.string(), v.trim(), v.minLength(1, 'name is required'), v.maxLength(100)),
  password: Password,
});
export type RegisterDto = v.InferOutput<typeof RegisterDto>;

export const LoginDto = v.object({ email: Email, password: v.string() });
export type LoginDto = v.InferOutput<typeof LoginDto>;

// What clients see of a user. Response schemas drop everything else, passwordHash included.
export const PublicUser = v.object({
  id: v.number(),
  email: v.string(),
  name: v.string(),
});
export type PublicUser = v.InferOutput<typeof PublicUser>;

export const Session = v.object({ token: v.string(), user: PublicUser });
