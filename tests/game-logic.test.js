import { describe, it, expect } from 'vitest';
import {
  pickChickenType,
  calcAccuracy,
  calcRank,
  createGameState,
  applyHit,
  applyShot,
  CHICKEN_TYPE_DEFS,
} from '../src/game-logic.js';

describe('pickChickenType', () => {
  it('returns a valid chicken type', () => {
    const type = pickChickenType();
    expect(Object.keys(CHICKEN_TYPE_DEFS)).toContain(type.name);
  });

  it('returns golden when random forces the last bucket', () => {
    // golden weight=6, total=116; set r just above 110
    const type = pickChickenType(() => 110.5 / 116);
    expect(type.name).toBe('golden');
  });

  it('returns small when random is near 0', () => {
    const type = pickChickenType(() => 0);
    expect(type.name).toBe('small');
  });

  it('distributes types over many samples', () => {
    const counts = {};
    for (let i = 0; i < 10000; i++) {
      const t = pickChickenType();
      counts[t.name] = (counts[t.name] || 0) + 1;
    }
    // All 4 types should appear
    expect(Object.keys(counts).length).toBe(4);
    // Small should be most common (weight 50 vs golden 6)
    expect(counts.small).toBeGreaterThan(counts.golden);
  });
});

describe('calcAccuracy', () => {
  it('returns 0 for 0 shots', () => expect(calcAccuracy(0, 0)).toBe(0));
  it('returns 100 for all hits', () => expect(calcAccuracy(5, 5)).toBe(100));
  it('returns 50 for half hits', () => expect(calcAccuracy(3, 6)).toBe(50));
  it('rounds correctly', () => expect(calcAccuracy(1, 3)).toBe(33));
});

describe('calcRank', () => {
  it('Apprentice below 200', () => expect(calcRank(199)).toBe('Apprentice'));
  it('Hunter at 200', () => expect(calcRank(200)).toBe('Hunter'));
  it('Marksman at 500', () => expect(calcRank(500)).toBe('Marksman'));
  it('Sharpshooter at 1000', () => expect(calcRank(1000)).toBe('Sharpshooter'));
  it('LEGEND at 2000', () => expect(calcRank(2000)).toBe('LEGEND'));
});

describe('createGameState', () => {
  it('starts in menu phase', () => {
    const s = createGameState();
    expect(s.phase).toBe('menu');
  });

  it('starts with full ammo', () => {
    const s = createGameState(6);
    expect(s.ammo).toBe(6);
    expect(s.maxAmmo).toBe(6);
  });

  it('respects custom maxAmmo', () => {
    const s = createGameState(12);
    expect(s.ammo).toBe(12);
  });
});

describe('applyShot + applyHit', () => {
  it('shot decrements ammo and increments shots', () => {
    const s = applyShot(createGameState(6));
    expect(s.ammo).toBe(5);
    expect(s.shots).toBe(1);
  });

  it('hit increments hits and score', () => {
    const s = applyHit(createGameState(), 30);
    expect(s.hits).toBe(1);
    expect(s.score).toBe(30);
  });

  it('multiple shots and hits accumulate correctly', () => {
    let s = createGameState(6);
    s = applyShot(s); s = applyHit(s, 20);
    s = applyShot(s); s = applyHit(s, 30);
    s = applyShot(s); // miss
    expect(s.shots).toBe(3);
    expect(s.hits).toBe(2);
    expect(s.score).toBe(50);
    expect(s.ammo).toBe(3);
  });

  it('state is immutable (original unchanged)', () => {
    const orig = createGameState(6);
    applyShot(orig);
    expect(orig.shots).toBe(0);
    expect(orig.ammo).toBe(6);
  });
});
