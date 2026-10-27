import * as v from 'valibot';

const Id = v.pipe(v.string(), v.regex(/^\d+$/, 'must be a number'), v.transform(Number));
export const ProjectParams = v.object({ projectId: Id });
export const TaskParams = v.object({ taskId: Id });

const Status = v.picklist(['todo', 'doing', 'done']);
const Title = v.pipe(v.string(), v.trim(), v.minLength(1, 'title is required'), v.maxLength(200));
const Description = v.nullable(v.pipe(v.string(), v.maxLength(5000)));
const DueDate = v.nullable(v.pipe(v.string(), v.isoDate('dueDate must be YYYY-MM-DD')));
const AssigneeId = v.nullable(v.pipe(v.number(), v.integer()));

export const ListQuery = v.object({
  status: v.optional(Status),
  assigneeId: v.optional(Id),
  limit: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/), v.transform(Number), v.minValue(1), v.maxValue(100)),
    '20',
  ),
  offset: v.optional(v.pipe(v.string(), v.regex(/^\d+$/), v.transform(Number)), '0'),
});

export const CreateTaskDto = v.object({
  title: Title,
  description: v.optional(Description),
  dueDate: v.optional(DueDate),
  assigneeId: v.optional(AssigneeId),
});
export type CreateTaskDto = v.InferOutput<typeof CreateTaskDto>;

export const UpdateTaskDto = v.pipe(
  v.partial(
    v.object({
      title: Title,
      description: Description,
      status: Status,
      dueDate: DueDate,
      assigneeId: AssigneeId,
    }),
  ),
  v.check((input) => Object.keys(input).length > 0, 'send at least one field to change'),
);
export type UpdateTaskDto = v.InferOutput<typeof UpdateTaskDto>;

export const Task = v.object({
  id: v.number(),
  title: v.string(),
  description: v.nullable(v.string()),
  status: v.string(),
  dueDate: v.nullable(v.date()),
  projectId: v.number(),
  assigneeId: v.nullable(v.number()),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export const TaskPage = v.object({ items: v.array(Task), total: v.number() });
