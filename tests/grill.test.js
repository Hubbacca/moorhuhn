import { describe, it, expect } from 'vitest';
import { lerpToward, lerpPos2D, fallHeight, ndcToScreen } from '../src/game-logic.js';

describe('lerpToward', () => {
  it('returns from at t=0', () => expect(lerpToward(0, 10, 0)).toBe(0));
  it('returns to at t=1', () => expect(lerpToward(0, 10, 1)).toBe(10));
  it('returns midpoint at t=0.5', () => expect(lerpToward(0, 10, 0.5)).toBe(5));
  it('works with negative values', () => expect(lerpToward(-10, 10, 0.5)).toBe(0));
  it('works with from > to', () => expect(lerpToward(20, 0, 0.25)).toBe(15));
});

describe('lerpPos2D', () => {
  it('stays at start at t=0', () => {
    const p = lerpPos2D(1, 2, 5, 8, 0);
    expect(p.x).toBe(1);
    expect(p.z).toBe(2);
  });

  it('reaches target at t=1', () => {
    const p = lerpPos2D(1, 2, 5, 8, 1);
    expect(p.x).toBe(5);
    expect(p.z).toBe(8);
  });

  it('midpoint is correct', () => {
    const p = lerpPos2D(0, 0, 10, 20, 0.5);
    expect(p.x).toBe(5);
    expect(p.z).toBe(10);
  });
});

describe('fallHeight', () => {
  it('starts at startY when t=0', () => {
    expect(fallHeight(20, 1.2, 0)).toBeCloseTo(20, 5);
  });

  it('lands at targetY when t=1', () => {
    expect(fallHeight(20, 1.2, 1)).toBeCloseTo(1.2, 5);
  });

  it('is above targetY in the middle of the arc', () => {
    const mid = fallHeight(20, 1.2, 0.5);
    // With the arc formula, midpoint should be between start and end (may overshoot slightly)
    expect(mid).toBeGreaterThan(1.2);
  });

  it('handles startY === targetY (flat)', () => {
    expect(fallHeight(5, 5, 0.5)).toBeCloseTo(5, 5);
  });
});

describe('ndcToScreen', () => {
  it('maps NDC (0,0) to screen center', () => {
    const p = ndcToScreen({ x: 0, y: 0 }, 1920, 1080);
    expect(p.x).toBe(960);
    expect(p.y).toBe(540);
  });

  it('maps NDC (-1,1) to top-left corner', () => {
    const p = ndcToScreen({ x: -1, y: 1 }, 1920, 1080);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it('maps NDC (1,-1) to bottom-right corner', () => {
    const p = ndcToScreen({ x: 1, y: -1 }, 1920, 1080);
    expect(p.x).toBe(1920);
    expect(p.y).toBe(1080);
  });

  it('works with a non-standard viewport', () => {
    const p = ndcToScreen({ x: 1, y: 1 }, 800, 600);
    expect(p.x).toBe(800);
    expect(p.y).toBe(0);
  });
});
