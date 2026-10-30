import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Lore is a separate Vite app (https://github.com/mlescaille/lore) whose
// production base is already `/lore/`. This site builds that pinned commit
// with Lore's own npm scripts and copies the static output into public/lore
// before Astro runs, so one Vercel deploy serves both.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rev = readFileSync(join(root, 'lore.rev'), 'utf8')
  .split('\n')
  .map(line => line.trim())
  .find(line => /^[0-9a-f]{40}$/.test(line));

if (!rev) {
  throw new Error('lore.rev must contain the full 40-character Lore commit SHA.');
}

const src = join(root, '.lore');
const dest = join(root, 'public', 'lore');
const marker = join(src, '.built-rev');
const distIndex = join(src, 'dist', 'index.html');

function run(command, args) {
  execFileSync(command, args, { cwd: src, stdio: 'inherit', env: process.env });
}

const cached = existsSync(marker)
  && readFileSync(marker, 'utf8').trim() === rev
  && existsSync(distIndex)
  && existsSync(join(src, 'node_modules'));

if (!cached) {
  rmSync(src, { recursive: true, force: true });
  mkdirSync(src);
  run('git', ['init', '-b', 'main']);
  run('git', ['remote', 'add', 'origin', 'https://github.com/mlescaille/lore.git']);
  run('git', ['fetch', '--depth', '1', 'origin', rev]);
  run('git', ['checkout', '--detach', 'FETCH_HEAD']);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: src, encoding: 'utf8' }).trim();
  if (head !== rev) {
    throw new Error(`Lore checkout is ${head}, expected ${rev}.`);
  }
  // Native postinstalls (onnxruntime-node, sharp) are for Node tests only.
  // The browser bundle does not need them, and they fail on some build images.
  run('npm', ['ci', '--ignore-scripts']);
  run('npm', ['run', 'build']);
  writeFileSync(marker, `${rev}\n`);
}

const index = readFileSync(distIndex, 'utf8');
if (!index.includes('/lore/assets/')) {
  throw new Error('Lore build did not emit asset URLs under /lore/. Refusing to publish it.');
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(join(src, 'dist'), dest, { recursive: true });
console.log(`Lore ${rev.slice(0, 12)} copied to public/lore`);
