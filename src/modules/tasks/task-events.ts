import { Injectable } from '@avijs/core';
import { EventEmitter, on } from 'node:events';

export interface TaskEvent {
  type: 'created' | 'updated' | 'deleted';
  projectId: number;
  taskId: number;
}

/**
 * Task changes per project, for the live view. In memory: with cluster(), a client only hears
 * about changes made through the same worker process.
 */
@Injectable()
export class TaskEvents {
  readonly #emitter = new EventEmitter({ captureRejections: true });

  constructor() {
    // One listener per open live view; the default limit of 10 is too low.
    this.#emitter.setMaxListeners(0);
  }

  publish(event: TaskEvent): void {
    this.#emitter.emit(`project:${String(event.projectId)}`, event);
  }

  /** Events for one project until `signal` aborts. */
  async *subscribe(projectId: number, signal: AbortSignal): AsyncGenerator<TaskEvent> {
    try {
      for await (const [event] of on(this.#emitter, `project:${String(projectId)}`, { signal })) {
        yield event as TaskEvent;
      }
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }
}
