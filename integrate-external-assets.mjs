/**
 * integrate-external-assets.mjs
 * NOTE: uses jszip from archon-workshop since archon-game doesn't install it directly.
 * Wires the 8 external assets from archon-external-pack-v1 into archon-game:
 *  1. Extracts 7 missing asset files from the real ZIP → public/assets/
 *     (combat-status-stun-v1.png already present — skipped)
 *  2. Appends all 8 entries to src/combat-pack-manifest.json
 *
 * Run from: C:\Dev\archon-game
 * node integrate-external-assets.mjs
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZIP_PATH       = 'C:\\Dev\\ingest\\archon-external-pack-v1.zip';
const ASSETS_DIR     = path.join(__dirname, 'public', 'assets');
const MANIFEST_PATH  = path.join(__dirname, 'src', 'combat-pack-manifest.json');

// ── External asset definitions (from seed + knowledge of real ZIP) ────────────
const EXTERNAL_ASSETS = [
  { id: 'ui-button-hover-v1',     type: 'image', category: 'ui',     faction: 'neutral',
    zipEntry: 'images/ui-button-hover-v1.png',    filename: 'ui-button-hover-v1.png',    mime: 'image/png' },
  { id: 'spell-heal-icon-v1',     type: 'image', category: 'spell',  faction: 'light',
    zipEntry: 'images/spell-heal-icon-v1.png',    filename: 'spell-heal-icon-v1.png',    mime: 'image/png' },
  { id: 'spell-imprison-icon-v1', type: 'image', category: 'spell',  faction: 'dark',
    zipEntry: 'images/spell-imprison-icon-v1.png',filename: 'spell-imprison-icon-v1.png',mime: 'image/png' },
  { id: 'combat-status-stun-v1',  type: 'image', category: 'spell',  faction: 'neutral',
    zipEntry: 'images/combat-status-stun-v1.png', filename: 'combat-status-stun-v1.png', mime: 'image/png',
    alreadyOnDisk: true }, // 529 KB real file already in public/assets/
  { id: 'sfx-magic-bolt-v1',      type: 'audio', category: 'sfx',    faction: 'neutral',
    zipEntry: 'audio/sfx-magic-bolt-v1.wav',      filename: 'sfx-magic-bolt-v1.wav',     mime: 'audio/wav' },
  { id: 'sfx-melee-hit-heavy-v1', type: 'audio', category: 'sfx',    faction: 'neutral',
    zipEntry: 'audio/sfx-melee-hit-heavy-v1.wav', filename: 'sfx-melee-hit-heavy-v1.wav',mime: 'audio/wav' },
  { id: 'sfx-teleport-dark-v1',   type: 'audio', category: 'sfx',    faction: 'dark',
    zipEntry: 'audio/sfx-teleport-dark-v1.wav',   filename: 'sfx-teleport-dark-v1.wav',  mime: 'audio/wav' },
  { id: 'sfx-teleport-light-v1',  type: 'audio', category: 'sfx',    faction: 'light',
    zipEntry: 'audio/sfx-teleport-light-v1.wav',  filename: 'sfx-teleport-light-v1.wav', mime: 'audio/wav' },
];

// ── 1. Load ZIP ────────────────────────────────────────────────────────────────
console.log('📦 Loading ZIP:', ZIP_PATH);
if (!fs.existsSync(ZIP_PATH)) { console.error('ERROR: ZIP not found'); process.exit(1); }

const JSZip = (await import('file:///C:/Dev/archon-workshop/node_modules/jszip/dist/jszip.min.js')).default;
const zip = await JSZip.loadAsync(fs.readFileSync(ZIP_PATH));
console.log(`   ZIP entries: ${Object.keys(zip.files).length}`);

// ── 2. Extract / verify asset files ───────────────────────────────────────────
const results = [];

for (const asset of EXTERNAL_ASSETS) {
  const destPath = path.join(ASSETS_DIR, asset.filename);

  if (asset.alreadyOnDisk && fs.existsSync(destPath)) {
    const size = fs.statSync(destPath).size;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(destPath)).digest('hex');
    console.log(`  ⏭  ${asset.id} — already on disk (${size} bytes), skipping extract`);
    results.push({ ...asset, path: `/assets/${asset.filename}`, hash, size, action: 'existing' });
    continue;
  }

  const entry = zip.file(asset.zipEntry);
  if (!entry) {
    console.error(`  ❌ ${asset.id} — ZIP entry not found: ${asset.zipEntry}`);
    results.push({ ...asset, error: 'ZIP entry missing', action: 'failed' });
    continue;
  }

  const buf = await entry.async('nodebuffer');
  if (buf.length === 0) {
    console.error(`  ❌ ${asset.id} — zero-byte in ZIP`);
    results.push({ ...asset, error: 'zero-byte', action: 'failed' });
    continue;
  }

  fs.writeFileSync(destPath, buf);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  console.log(`  ✅ ${asset.id} → public/assets/${asset.filename} (${buf.length} bytes)`);
  results.push({ ...asset, path: `/assets/${asset.filename}`, hash, size: buf.length, action: 'extracted' });
}

// ── 3. Append to combat-pack-manifest.json ────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const existingIds = new Set(manifest.assets.map(a => a.id));
const priorCount = manifest.assets.length;

let appended = 0;
for (const r of results) {
  if (r.action === 'failed') continue;
  if (existingIds.has(r.id)) {
    console.log(`  ⏭  ${r.id} already in manifest, skipping`);
    continue;
  }
  manifest.assets.push({
    id:        r.id,
    category:  r.category,
    faction:   r.faction,
    type:      r.type,
    path:      r.path,
    hash:      r.hash,
    mime_type: r.mime,
    // Source tracking (informational — not used by packLoader at runtime)
    source_pack:      'archon-external-pack-v1',
    source_milestone: '0.5',
  });
  appended++;
}

// Update generated_at to reflect this integration pass
manifest.generated_at = new Date().toISOString();
manifest.tags = [...new Set([...(manifest.tags || []), 'external-v1'])];

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

// ── 4. Summary ────────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('INTEGRATION COMPLETE');
console.log(`  Manifest entries before: ${priorCount}`);
console.log(`  Appended:                ${appended}`);
console.log(`  Manifest entries after:  ${manifest.assets.length}`);
console.log(`  Failures:                ${results.filter(r=>r.action==='failed').length}`);
console.log('═══════════════════════════════════════════════════════════════');
