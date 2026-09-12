import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out');
const textExt = new Set(['.html', '.js', '.css', '.txt', '.json']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!textExt.has(path.extname(entry.name))) {
      continue;
    }
    const before = fs.readFileSync(full, 'utf8');
    const after = before
      .replaceAll('/_next/', './_next/')
      .replaceAll('/favicon.ico', './favicon.ico')
      .replaceAll('/next.svg', './next.svg')
      .replaceAll('/vercel.svg', './vercel.svg')
      .replaceAll('.//_next/', './_next/');
    if (after !== before) {
      fs.writeFileSync(full, after);
    }
  }
}

walk(outDir);

fs.copyFileSync(path.join(root, 'scripts', 'static-server.cjs'), path.join(outDir, 'server.cjs'));
fs.writeFileSync(
  path.join(outDir, '打开.bat'),
  [
    '@echo off',
    'cd /d "%~dp0"',
    'where node >nul 2>nul',
    'if errorlevel 1 (',
    '  echo 双击 index.html 无法运行 Next 静态包，请先安装 Node.js',
    '  pause',
    '  exit /b 1',
    ')',
    'node server.cjs',
    'pause',
    '',
  ].join('\r\n')
);

console.log('Static paths rewritten; double-click out/打开.bat to preview.');
