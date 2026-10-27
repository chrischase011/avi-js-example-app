import { AviClientError, createClient } from '@avijs/client';
import type { Api } from '../../dist/api.gen.js';

let token: string | undefined = localStorage.getItem('token') ?? undefined;

export function setToken(value: string | undefined): void {
  token = value;
  if (value) localStorage.setItem('token', value);
  else localStorage.removeItem('token');
}

export const hasToken = () => token !== undefined;

export const api = createClient<Api>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3100',
  headers: (): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {}),
});

/** The server's message for a failed call, or a generic one. */
export function messageOf(error: unknown): string {
  if (error instanceof AviClientError) {
    const body = error.body as {
      message?: string;
      details?: { issues?: { message: string }[] };
    };
    return body.details?.issues?.map((i) => i.message).join(', ') ?? body.message ?? error.message;
  }
  return 'Something went wrong';
}

export interface TaskEvent {
  type: string;
  taskId: number;
}

/** Live task events for a project, read with the client so the token goes along. */
export function subscribe(projectId: number, onEvent: (event: TaskEvent) => void): () => void {
  const controller = new AbortController();
  void (async () => {
    const events = api.events('/projects/:projectId/events', {
      params: { projectId },
      signal: controller.signal,
    });
    for await (const message of events) onEvent(JSON.parse(message.data) as TaskEvent);
  })().catch(() => undefined);
  return () => controller.abort();
}
