// Pure game logic — no DOM, no Three.js. Imported by tests and main.js.

export const CHICKEN_TYPE_DEFS = {
  small:  { scale: 0.7, points: 30,  speed: 14, hp: 1, weight: 50, color: 0xfff0d0 },
  medium: { scale: 1.0, points: 20,  speed: 11, hp: 1, weight: 35, color: 0xffe0a0 },
  large:  { scale: 1.4, points: 10,  speed: 8,  hp: 1, weight: 25, color: 0xf0c060 },
  golden: { scale: 1.0, points: 100, speed: 18, hp: 1, weight: 6,  color: 0xffd700, metallic: true },
};

export function pickChickenType(random = Math.random) {
  const entries = Object.entries(CHICKEN_TYPE_DEFS);
  const totalW = entries.reduce((s, [, t]) => s + t.weight, 0);
  let r = random() * totalW;
  for (const [name, type] of entries) {
    r -= type.weight;
    if (r <= 0) return { name, ...type };
  }
  return { name: 'medium', ...CHICKEN_TYPE_DEFS.medium };
}

export function calcAccuracy(hits, shots) {
  if (shots === 0) return 0;
  return Math.round((hits / shots) * 100);
}

export function calcRank(score) {
  if (score >= 2000) return 'LEGEND';
  if (score >= 1000) return 'Sharpshooter';
  if (score >= 500)  return 'Marksman';
  if (score >= 200)  return 'Hunter';
  return 'Apprentice';
}

export function createGameState(maxAmmo = 6) {
  return {
    phase: 'menu',
    score: 0,
    shots: 0,
    hits: 0,
    timeLeft: 90,
    ammo: maxAmmo,
    maxAmmo,
    reloading: false,
  };
}

export function applyHit(state, points) {
  return { ...state, hits: state.hits + 1, score: state.score + points };
}

export function applyShot(state) {
  const next = { ...state, shots: state.shots + 1, ammo: state.ammo - 1 };
  return next;
}

// ── Grill helpers ──

// Linear interpolation between two numbers
export function lerpToward(from, to, t) {
  return from + (to - from) * t;
}

// Returns a 2D point lerped from (x1,z1) toward (x2,z2) by t
export function lerpPos2D(x1, z1, x2, z2, t) {
  return { x: lerpToward(x1, x2, t), z: lerpToward(z1, z2, t) };
}

// Parabolic fall height: starts at startY, ends at targetY, with a slight arc
export function fallHeight(startY, targetY, t) {
  const drop = startY - targetY;
  return startY - drop * t - drop * t * t * (1 - t) * 2;
}

// Project a 3D NDC vector {x,y,z} to screen pixel coords given viewport size
export function ndcToScreen(ndc, viewportW, viewportH) {
  return {
    x:  (ndc.x * 0.5 + 0.5) * viewportW,
    y: (-ndc.y * 0.5 + 0.5) * viewportH,
  };
}
