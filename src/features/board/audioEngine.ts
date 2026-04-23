/**
 * audioEngine.ts — Archon 1.8 Sound System
 *
 * Lightweight, zero-dependency audio engine using the Web Audio API.
 * Features:
 *   - Lazy AudioContext (created on first user gesture — browser policy)
 *   - SFX pool: 4 concurrent channels per sound to prevent cutoff
 *   - Music loop with fade-in / fade-out
 *   - Master volume + mute toggle (persisted in localStorage)
 *   - All paths served from /assets/ (Vite public folder)
 *
 * Usage:
 *   import { playSound, playMusic, stopMusic, setMuted, isMuted } from './audioEngine';
 *   playSound('move');           // board piece move
 *   playSound('combat');         // contest initiated
 *   playSound('death-dark');     // dark piece defeated
 *   playSound('victory');        // game over win
 *   playMusic();                 // start battle loop
 *   stopMusic();                 // fade out
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SoundId =
  | 'move-light'
  | 'move-dark'
  | 'combat'
  | 'hit'
  | 'hit-heavy'
  | 'death-light'
  | 'death-dark'
  | 'victory'
  | 'defeat'
  | 'turn-light'
  | 'turn-dark'
  | 'magic';

// ─── Asset Map ────────────────────────────────────────────────────────────────

const SOUND_PATHS: Record<SoundId, string> = {
  'move-light'  : '/assets/sfx-teleport-light-v1.wav',
  'move-dark'   : '/assets/sfx-teleport-dark-v1.wav',
  'combat'      : '/assets/voice-battle-v1.wav',
  'hit'         : '/assets/sfx-melee-hit-v1.wav',
  'hit-heavy'   : '/assets/sfx-melee-hit-heavy-v1.wav',
  'death-light' : '/assets/sfx-death-light-v1.wav',
  'death-dark'  : '/assets/sfx-death-dark-v1.wav',
  'victory'     : '/assets/voice-victory-v1.wav',
  'defeat'      : '/assets/voice-defeat-v1.wav',
  'turn-light'  : '/assets/voice-light-turn-v1.wav',
  'turn-dark'   : '/assets/voice-dark-turn-v1.wav',
  'magic'       : '/assets/sfx-magic-bolt-v1.wav',
};

const MUSIC_PATH = '/assets/music-battle-loop-v1.mp3';

// ─── Engine State ─────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicSource: AudioBufferSourceNode | null = null;
let musicGain: GainNode | null = null;
let musicBuffer: AudioBuffer | null = null;

const bufferCache = new Map<SoundId, AudioBuffer>();

const STORAGE_KEY = 'archon-muted';
let muted = localStorage.getItem(STORAGE_KEY) === 'true';

const MASTER_VOLUME = 0.55;
const MUSIC_VOLUME  = 0.22;

// ─── Init ─────────────────────────────────────────────────────────────────────

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

async function loadBuffer(path: string): Promise<AudioBuffer> {
  const context = getCtx();
  const res = await fetch(path);
  const raw = await res.arrayBuffer();
  return context.decodeAudioData(raw);
}

async function getBuffer(id: SoundId): Promise<AudioBuffer> {
  if (bufferCache.has(id)) return bufferCache.get(id)!;
  const buf = await loadBuffer(SOUND_PATHS[id]);
  bufferCache.set(id, buf);
  return buf;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Play a one-shot sound effect. Fire-and-forget.
 * Silently ignored if muted or if the browser blocks audio.
 */
export async function playSound(id: SoundId, volume = 1.0): Promise<void> {
  try {
    const context = getCtx();
    if (!masterGain) return;
    const buffer = await getBuffer(id);

    const source = context.createBufferSource();
    source.buffer = buffer;

    const gainNode = context.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
  } catch {
    // Audio blocked or asset missing — silently skip
  }
}

/**
 * Start the battle music loop. Fades in over 1.5s.
 * If music is already playing, does nothing.
 */
export async function playMusic(): Promise<void> {
  try {
    const context = getCtx();
    if (!masterGain) return;
    if (musicSource) return; // already playing

    if (!musicBuffer) {
      musicBuffer = await loadBuffer(MUSIC_PATH);
    }

    musicGain = context.createGain();
    musicGain.gain.setValueAtTime(0, context.currentTime);
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, context.currentTime + 1.5);
    musicGain.connect(masterGain);

    musicSource = context.createBufferSource();
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    musicSource.connect(musicGain);
    musicSource.start();
  } catch {
    // Silently skip if music can't load
  }
}

/**
 * Stop the battle music. Fades out over `fadeSec` seconds.
 */
export function stopMusic(fadeSec = 1.2): void {
  try {
    if (!ctx || !musicGain || !musicSource) return;
    const now = ctx.currentTime;
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0, now + fadeSec);
    const src = musicSource;
    musicSource = null;
    setTimeout(() => { try { src.stop(); } catch { /* ignore */ } }, fadeSec * 1000 + 100);
  } catch { /* ignore */ }
}

/** Toggle mute state. Returns the new muted value. */
export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem(STORAGE_KEY, String(muted));
  if (masterGain) {
    masterGain.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, getCtx().currentTime, 0.1);
  }
  return muted;
}

/** Set mute state explicitly. */
export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem(STORAGE_KEY, String(value));
  if (masterGain) {
    masterGain.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, getCtx().currentTime, 0.1);
  }
}

/** Returns current mute state. */
export function isMuted(): boolean {
  return muted;
}

/**
 * Preload all SFX in the background so first playback is instant.
 * Call once after a user gesture (e.g. first click on the board).
 */
export async function preloadSounds(): Promise<void> {
  const ids = Object.keys(SOUND_PATHS) as SoundId[];
  await Promise.allSettled(ids.map(id => getBuffer(id)));
}
