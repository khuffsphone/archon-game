import { useState, useCallback, useRef, useEffect } from 'react';
import type { CombatState, CombatPackManifest } from '../../lib/types';
import { makeInitialState, processAttack, startBattle, resetBattle } from './CombatEngine';
import type { CombatInitOverrides } from './CombatEngine';
import { getAssetUrl } from '../../lib/packLoader';

interface UseCombatOptions {
  pack: CombatPackManifest;
  audioEnabled: boolean;
  /** Optional HP + first-turn overrides from the board layer */
  initialOverrides?: CombatInitOverrides;
}

export function useCombat({ pack, audioEnabled, initialOverrides }: UseCombatOptions) {
  const [state, setState] = useState<CombatState>(() => makeInitialState(initialOverrides));
  const [animating, setAnimating] = useState(false);
  const battleMusicRef = useRef<HTMLAudioElement | null>(null);

  // Setup battle music
  useEffect(() => {
    const url = getAssetUrl(pack, 'music-battle-loop');
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.45;
    battleMusicRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, [pack]);

  useEffect(() => {
    if (!battleMusicRef.current) return;
    if (state.phase === 'battle' && audioEnabled) {
      battleMusicRef.current.play().catch(() => {/* autoplay blocked */});
    } else {
      battleMusicRef.current.pause();
    }
  }, [state.phase, audioEnabled]);

  const playSound = useCallback((assetId: string) => {
    if (!audioEnabled) return;
    const url = getAssetUrl(pack, assetId);
    if (!url) return;
    const a = new Audio(url);
    a.volume = 0.7;
    a.play().catch(() => {});
  }, [pack, audioEnabled]);

  const handleStartBattle = useCallback(() => {
    setState(s => startBattle(s));
    playSound('voice-battle');
  }, [playSound]);

  const handleAttack = useCallback(() => {
    if (animating || state.phase !== 'battle') return;
    setAnimating(true);

    const next = processAttack(state);

    // Play appropriate sounds
    if (next.lastEvent === 'death') {
      const sfxId = next.lastEventFaction === 'light' ? 'sfx-death-light' : 'sfx-death-dark';
      playSound(sfxId);
      setTimeout(() => {
        playSound(next.winner === 'light' ? 'voice-victory' : 'voice-defeat');
      }, 600);
    } else {
      playSound('sfx-melee-hit');
    }

    setState(next);
    setTimeout(() => setAnimating(false), 500);
  }, [state, animating, playSound]);

  const handleReset = useCallback(() => {
    setState(resetBattle());
    if (battleMusicRef.current) battleMusicRef.current.pause();
  }, []);

  const handleTurnVoice = useCallback(() => {
    const id = state.turnFaction === 'light' ? 'voice-light-turn' : 'voice-dark-turn';
    playSound(id);
  }, [state.turnFaction, playSound]);

  return {
    state,
    animating,
    handleStartBattle,
    handleAttack,
    handleReset,
    handleTurnVoice,
  };
}
