import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { ResponseOf } from '@avijs/client';
import type { Api } from '../../dist/api.gen.js';
import { api, hasToken, messageOf, setToken, subscribe } from './api';

type Team = ResponseOf<Api, 'GET /teams'>[number];
type Project = ResponseOf<Api, 'GET /teams/:teamId/projects'>[number];
type Task = ResponseOf<Api, 'GET /projects/:projectId/tasks'>['items'][number];
type Status = 'todo' | 'doing' | 'done';

const COLUMNS: { status: Status; title: string }[] = [
  { status: 'todo', title: 'To do' },
  { status: 'doing', title: 'Doing' },
  { status: 'done', title: 'Done' },
];

export default function App() {
  const [signedIn, setSignedIn] = useState(hasToken());
  return signedIn ? (
    <Board
      onSignOut={() => {
        setToken(undefined);
        setSignedIn(false);
      }}
    />
  ) : (
    <SignIn onSignedIn={() => setSignedIn(true)} />
  );
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    try {
      const session =
        mode === 'login'
          ? await api.post('/auth/login', { body: { email, password } })
          : await api.post('/auth/register', {
              body: { email, password, name: String(form.get('name')) },
            });
      setToken(session.token);
      onSignedIn();
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>Tasks</h1>
      {mode === 'register' && <input name="name" placeholder="Name" required />}
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {error && <p className="error">{error}</p>}
      <button type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <button
        type="button"
        className="link"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </form>
  );
}

function Board({ onSignOut }: { onSignOut: () => void }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teams').then(
      async (list) => {
        setTeams(list);
        const first = list[0];
        if (first) {
          setProjects(
            await api.get('/teams/:teamId/projects', {
              params: { teamId: first.id },
            }),
          );
        }
      },
      (e: unknown) => setError(messageOf(e)),
    );
  }, []);

  const load = useCallback(async () => {
    if (!project) return;
    const page = await api.get('/projects/:projectId/tasks', {
      params: { projectId: project.id },
      query: { limit: 100 },
    });
    setTasks(page.items);
  }, [project]);

  // Reload whenever anyone changes a task in this project.
  useEffect(() => {
    if (!project) return;
    void load();
    return subscribe(project.id, () => void load());
  }, [project, load]);

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = event.currentTarget;
    const title = String(new FormData(form).get('title'));
    try {
      await api.post('/projects/:projectId/tasks', {
        params: { projectId: project.id },
        body: { title },
      });
      form.reset();
    } catch (e) {
      setError(messageOf(e));
    }
  }

  async function move(task: Task, status: Status) {
    await api
      .patch('/tasks/:taskId', {
        params: { taskId: task.id },
        body: { status },
      })
      .catch((e: unknown) => setError(messageOf(e)));
  }

  return (
    <main>
      <header>
        <h1>Tasks</h1>
        <span>{teams.map((t) => t.name).join(', ') || 'No team yet'}</span>
        <button className="link" onClick={onSignOut}>
          Sign out
        </button>
      </header>
      {error && <p className="error">{error}</p>}
      <nav>
        {projects.map((p) => (
          <button
            key={p.id}
            className={p.id === project?.id ? 'active' : ''}
            onClick={() => setProject(p)}
          >
            {p.name}
          </button>
        ))}
      </nav>
      {project && (
        <>
          <form className="add" onSubmit={addTask}>
            <input name="title" placeholder="New task" required />
            <button type="submit">Add</button>
          </form>
          <section className="columns">
            {COLUMNS.map((column) => (
              <div key={column.status} className="column">
                <h2>{column.title}</h2>
                {tasks
                  .filter((t) => t.status === column.status)
                  .map((task) => (
                    <article key={task.id} className="task">
                      <strong>{task.title}</strong>
                      {task.dueDate && <small>due {task.dueDate.slice(0, 10)}</small>}
                      <div>
                        {COLUMNS.filter((c) => c.status !== task.status).map((c) => (
                          <button key={c.status} onClick={() => void move(task, c.status)}>
                            {c.title}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
