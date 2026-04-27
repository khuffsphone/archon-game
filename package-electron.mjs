/**
 * package-electron.mjs
 *
 * Builds the Archon Electron desktop app using @electron/packager.
 * Produces a self-contained folder + zip in release/ — no code signing,
 * no winCodeSign download, no symlink permission issues.
 *
 * Usage: node package-electron.mjs
 */
import { packager } from '@electron/packager';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

console.log('\n🎮  Archon — Electron Packaging\n');

const options = {
  dir:         ROOT,
  name:        'Archon',
  platform:    'win32',
  arch:        'x64',
  out:         path.join(ROOT, 'release'),
  overwrite:   true,
  icon:        path.join(ROOT, 'electron', 'icon.ico'),
  // Only bundle what the app needs at runtime
  ignore: [
    /^\/src\//,
    /^\/\.git\//,
    /^\/release\//,
    /^\/node_modules\/electron-builder/,
    /^\/node_modules\/@electron\/packager/,
    /^\/node_modules\/vitest/,
    /^\/node_modules\/typescript/,
    /^\/node_modules\/vite/,
    /^\/node_modules\/@vitejs/,
    /^\/node_modules\/@types/,
    /\/\.cache\//,
  ],
  electronVersion: '31.7.7',
  asar:            true,
};

try {
  const appPaths = await packager(options);
  console.log(`\n✅  Packaged to: ${appPaths[0]}`);

  // Report the .exe location
  const exePath = path.join(appPaths[0], 'Archon.exe');
  if (fs.existsSync(exePath)) {
    const size = (fs.statSync(exePath).size / 1024 / 1024).toFixed(1);
    console.log(`📦  Archon.exe  (${size} MB)`);
    console.log(`\n🚀  To play: double-click ${exePath}\n`);
  }
} catch (err) {
  console.error('\n❌  Packaging failed:', err.message ?? err);
  process.exit(1);
}
