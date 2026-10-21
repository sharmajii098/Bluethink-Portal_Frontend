import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const problems = [];
for (const name of ['@mui/material', '@mui/icons-material', 'typescript']) {
  const folder = path.join(root, 'node_modules', name);
  const manifest = path.join(folder, 'package.json');
  if (!existsSync(manifest)) {
    problems.push(`${name} is not installed.`);
    continue;
  }
  const installed = JSON.parse(readFileSync(manifest, 'utf8'));
  const expected = lock.packages[`node_modules/${name}`].version;
  if (installed.version !== expected) {
    problems.push(`${name}: installed ${installed.version}, lockfile requires ${expected}.`);
  }
  if (name === '@mui/icons-material') {
    for (const file of ['index.d.ts', 'esm/index.d.ts', 'MenuRounded.d.ts', 'esm/MenuRounded.d.ts']) {
      if (!existsSync(path.join(folder, file))) problems.push(`${name}/${file} is missing.`);
    }
  }
}

if (problems.length) {
  console.error('\nBluethink dependency check failed:\n- ' + problems.join('\n- '));
  console.error('\nStop Vite, then run npm ci in the frontend folder. Keep package-lock.json.');
  console.error('On Windows you can run: powershell -ExecutionPolicy Bypass -File .\\REPAIR_FRONTEND.ps1\n');
  process.exitCode = 1;
} else {
  console.log('Bluethink dependencies and MUI icon declarations match the lockfile.');
}
