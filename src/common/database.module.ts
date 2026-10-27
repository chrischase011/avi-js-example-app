import { Injectable, Module } from '@avijs/core';

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}
export interface Team {
  id: number;
  name: string;
  createdAt: Date;
}
/** role: "owner" or "member" */
export interface Membership {
  userId: number;
  teamId: number;
  role: string;
}
export interface Project {
  id: number;
  name: string;
  teamId: number;
  createdAt: Date;
}
/** status: "todo", "doing" or "done" */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  projectId: number;
  assigneeId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface Attachment {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  storedAs: string;
  taskId: number;
  createdAt: Date;
}
export interface OutboxEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  createdAt: Date;
  sentAt: Date | null;
}

/** Rows with an auto-increment id. Reads return copies, as a database would. */
export class Table<T extends { id: number }> {
  #rows = new Map<number, T>();
  #next = 1;

  insert(data: Omit<T, 'id'>): T {
    const row = { ...data, id: this.#next++ } as T;
    this.#rows.set(row.id, row);
    return { ...row };
  }

  get(id: number): T | undefined {
    const row = this.#rows.get(id);
    return row && { ...row };
  }

  find(match: (row: T) => boolean): T | undefined {
    return this.filter(match)[0];
  }

  filter(match: (row: T) => boolean = () => true): T[] {
    return [...this.#rows.values()].filter(match).map((row) => ({ ...row }));
  }

  /** Changes the fields given; undefined ones are left as they are. */
  update(id: number, changes: Partial<Omit<T, 'id'>>): T | undefined {
    const row = this.#rows.get(id);
    if (!row) return undefined;
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) (row as Record<string, unknown>)[key] = value;
    }
    return { ...row };
  }

  delete(id: number): T | undefined {
    const row = this.#rows.get(id);
    this.#rows.delete(id);
    return row;
  }
}

/**
 * The app's data, kept in memory so it runs where Prisma's native engines cannot, such as
 * StackBlitz. Everything is gone when the process restarts. Each app gets its own.
 */
@Injectable()
export class Db {
  readonly users = new Table<User>();
  readonly teams = new Table<Team>();
  readonly projects = new Table<Project>();
  readonly tasks = new Table<Task>();
  readonly attachments = new Table<Attachment>();
  readonly outbox = new Table<OutboxEmail>();
  readonly memberships: Membership[] = [];

  membership(userId: number, teamId: number): Membership | undefined {
    return this.memberships.find((m) => m.userId === userId && m.teamId === teamId);
  }
}

@Module({ providers: [Db], exports: [Db] })
export class DatabaseModule {}
