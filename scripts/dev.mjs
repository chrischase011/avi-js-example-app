// Runs the API and the React app together: the StackBlitz start command.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('.env')) copyFileSync('.env.example', '.env');
if (!existsSync('web/node_modules')) {
  spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: 'web', stdio: 'inherit', shell: true });
}
const run = (cwd) => spawn('npm', ['run', 'dev'], { cwd, stdio: 'inherit', shell: true });
const children = [run('.'), run('web')];
const stop = () => {
  for (const child of children) child.kill();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
