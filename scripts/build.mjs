import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {
  ...process.env,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''}--max-old-space-size=4096`,
};

function run(command, args) {
  const result = spawnSync(process.execPath, [command, ...args], {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('node_modules/typescript/bin/tsc', ['-b']);
run('node_modules/vite/bin/vite.js', ['build']);
