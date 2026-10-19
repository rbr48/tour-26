import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameAudio } from './gameAudio';

describe('gameAudio engine', () => {
  const store = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    global.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    };
  });

  it('initializes and manages mute state correctly', () => {
    gameAudio.isMuted = false;
    expect(gameAudio.getMuted()).toBe(false);

    const muted = gameAudio.toggleMute();
    expect(muted).toBe(true);
    expect(gameAudio.getMuted()).toBe(true);
    expect(localStorage.getItem('game_audio_muted')).toBe('true');

    gameAudio.toggleMute();
    expect(gameAudio.getMuted()).toBe(false);
  });

  it('safely handles audio calls in node/test environment without crashing', () => {
    expect(() => {
      gameAudio.playCard();
      gameAudio.playDice();
      gameAudio.playCapture();
      gameAudio.playTurn();
      gameAudio.playCheck();
      gameAudio.playWin();
    }).not.toThrow();
  });
});
