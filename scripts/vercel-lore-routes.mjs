import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// The Astro Vercel adapter writes `.vercel/output/config.json` and does not
// copy headers or rewrites from a root vercel.json into that file. Patch the
// output the deploy actually uses. These routes match only `/lore`.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, '.vercel', 'output', 'config.json');
const staticRoot = join(root, '.vercel', 'output', 'static');
const loreRoot = join(staticRoot, 'lore');

const WASM_HEADER = '^/lore/.+\\.wasm$';
// Extension-less paths only, so a missing .js/.wasm/.png stays a 404
// instead of coming back as the Lore HTML shell.
const LORE_FALLBACK = '^/lore/?(?:[^./]+/?)*$';

function wasmFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) wasmFiles(path, found);
    else if (name.endsWith('.wasm')) found.push(path);
  }
  return found;
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const files = wasmFiles(loreRoot);
if (files.length === 0) {
  throw new Error('Lore was not copied into the Vercel static output (no .wasm files).');
}
if (!readFileSync(join(loreRoot, 'index.html'), 'utf8').includes('/lore/assets/')) {
  throw new Error('Vercel static output is missing Lore index.html.');
}

config.overrides ??= {};
for (const file of files) {
  const key = relative(staticRoot, file).split('\\').join('/');
  config.overrides[key] = { ...config.overrides[key], contentType: 'application/wasm' };
}

const routes = (config.routes ?? []).filter(route => route.src !== WASM_HEADER && route.src !== LORE_FALLBACK);
const filesystem = routes.findIndex(route => route.handle === 'filesystem');
if (filesystem < 0) {
  throw new Error('Vercel output config is missing the filesystem route.');
}

routes.splice(filesystem, 0, {
  src: WASM_HEADER,
  headers: { 'content-type': 'application/wasm' },
  continue: true,
});
routes.splice(filesystem + 2, 0, {
  src: LORE_FALLBACK,
  dest: '/lore/index.html',
});

config.routes = routes;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Lore routes added for ${files.length} wasm file(s).`);
