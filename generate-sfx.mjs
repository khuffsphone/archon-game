/**
 * generate-sfx.mjs — Archon SFX Synthesizer
 * 
 * Generates replacement WAV files for the 4 zero-byte SFX stubs using
 * pure Node.js (no dependencies). Writes 16-bit mono PCM WAV files.
 *
 * Usage: node generate-sfx.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, 'public', 'assets');

const SAMPLE_RATE = 44100;

// ─── WAV writer ──────────────────────────────────────────────────────────────

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buf = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buf.write('RIFF', offset); offset += 4;
  buf.writeUInt32LE(fileSize, offset); offset += 4;
  buf.write('WAVE', offset); offset += 4;

  // fmt chunk
  buf.write('fmt ', offset); offset += 4;
  buf.writeUInt32LE(16, offset); offset += 4;           // chunk size
  buf.writeUInt16LE(1, offset); offset += 2;            // PCM format
  buf.writeUInt16LE(numChannels, offset); offset += 2;
  buf.writeUInt32LE(SAMPLE_RATE, offset); offset += 4;
  buf.writeUInt32LE(byteRate, offset); offset += 4;
  buf.writeUInt16LE(blockAlign, offset); offset += 2;
  buf.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buf.write('data', offset); offset += 4;
  buf.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), offset);
    offset += 2;
  }

  const path = join(ASSETS_DIR, filename);
  writeFileSync(path, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`  ✓ ${filename} (${kb}KB)`);
}

// ─── Synthesis helpers ───────────────────────────────────────────────────────

/** Envelope: attack-decay-sustain-release */
function adsr(t, dur, a, d, s, r) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  return s * (1 - (t - (dur - r)) / r);
}

/** Sine wave oscillator */
const sine = (t, freq) => Math.sin(2 * Math.PI * freq * t);

/** Sawtooth wave */
const saw = (t, freq) => {
  const phase = (t * freq) % 1;
  return 2 * phase - 1;
};

/** White noise */
const noise = () => Math.random() * 2 - 1;

/** Frequency modulation */
const fm = (t, carrier, modFreq, modDepth) =>
  Math.sin(2 * Math.PI * carrier * t + modDepth * Math.sin(2 * Math.PI * modFreq * t));

// ─── Sound Definitions ───────────────────────────────────────────────────────

function makeTeleportLight() {
  // Upward sparkle sweep: rising sine + sparkle noise + harmonics
  const dur = 0.55;
  const n = Math.ceil(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / dur;
    // Rising frequency 600Hz → 2400Hz
    const freq = 600 + 1800 * progress * progress;
    const env = adsr(t, dur, 0.02, 0.05, 0.6, 0.25) * (1 - progress * 0.4);
    // Main sweep tone
    const sweep = sine(t, freq) * 0.5;
    // Shimmer harmonics
    const shimmer = (sine(t, freq * 2) * 0.2 + sine(t, freq * 3) * 0.1) * progress;
    // Soft sparkle noise fading in
    const sparkle = noise() * 0.08 * progress;
    samples[i] = (sweep + shimmer + sparkle) * env;
  }
  return samples;
}

function makeTeleportDark() {
  // Downward ominous sweep: descending FM tone + dark rumble
  const dur = 0.65;
  const n = Math.ceil(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / dur;
    // Descending frequency 2200Hz → 180Hz
    const freq = 2200 * Math.pow(180 / 2200, progress);
    const env = adsr(t, dur, 0.01, 0.1, 0.5, 0.35) * (1 - progress * 0.2);
    // Dark FM sweep
    const sweep = fm(t, freq, freq * 0.5, 1.5) * 0.45;
    // Low rumble
    const rumble = sine(t, 55 + 30 * (1 - progress)) * 0.2 * progress;
    // Dark noise
    const darkNoise = noise() * 0.06 * (1 - progress);
    samples[i] = (sweep + rumble + darkNoise) * env;
  }
  return samples;
}

function makeMagicBolt() {
  // Sharp electric zap: quick frequency burst + crackle
  const dur = 0.38;
  const n = Math.ceil(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / dur;
    // Sharp attack, fast decay
    const env = Math.exp(-progress * 8) * (1 - Math.exp(-t * 120));
    // Electric buzz: sawtooth at 180Hz modulated
    const buzz = saw(t, 180 + 40 * Math.sin(t * 45)) * 0.3;
    // Zap tone: FM with fast modulation
    const zap = fm(t, 1200 - 900 * progress, 80, 3) * 0.35;
    // Crackle
    const crackle = noise() * 0.25 * Math.exp(-progress * 12);
    samples[i] = (buzz + zap + crackle) * env;
  }
  return samples;
}

function makeMeleeHitHeavy() {
  // Deep thudding impact: low thump + body + click transient
  const dur = 0.55;
  const n = Math.ceil(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / dur;
    // Sub-bass thump: sine at 60Hz decaying
    const thump = sine(t, 60 * Math.exp(-t * 6)) * Math.exp(-t * 9) * 0.6;
    // Body impact: mid noise burst
    const body = noise() * Math.exp(-t * 14) * 0.35;
    // Click transient: high-freq pop at start
    const click = sine(t, 800) * Math.exp(-t * 60) * 0.3;
    // Slight metallic ring
    const ring = sine(t, 320) * Math.exp(-t * 20) * 0.15;
    samples[i] = thump + body + click + ring;
  }
  return samples;
}

// ─── Run ────────────────────────────────────────────────────────────────────

console.log('\n  🔊 Archon SFX Generator\n');

writeWav('sfx-teleport-light-v1.wav', makeTeleportLight());
writeWav('sfx-teleport-dark-v1.wav',  makeTeleportDark());
writeWav('sfx-magic-bolt-v1.wav',     makeMagicBolt());
writeWav('sfx-melee-hit-heavy-v1.wav', makeMeleeHitHeavy());

console.log('\n  ✅ All SFX written to public/assets/\n');
