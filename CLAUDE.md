# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                # run all tests (Vitest)
npm run lint            # lint src/**/*.js (ESLint)
npm run lint:fix        # auto-fix lint errors
npm run test:watch      # re-run tests on file change
npm run test:coverage   # generate coverage report
```

Run a single test file:
```bash
npx vitest run tests/game-logic.test.js
```

## Architecture

Vanilla JS browser game — no bundler. Scripts are loaded via `<script>` tags in `index.html` in dependency order: `world.js` → `chickens.js` → `effects.js` → `main.js`. All game objects are globals in `sourceType: script` scope.

**`src/game-logic.js`** — the only ES module (`sourceType: module`, uses `export`). Contains pure, DOM/Three.js-free functions: `createGameState`, `applyShot`, `applyHit`, `calcAccuracy`, `calcRank`, `pickChickenType`. This is the only file covered by tests.

**`src/main.js`** — single IIFE that owns all mutable game state (`STATE` object), the Three.js scene/camera/renderer, the game loop (`requestAnimationFrame`), and all input handlers. Calls into the other globals.

**`src/chickens.js`** — defines `CHICKEN_TYPES` config, `buildChickenMesh()` (Three.js geometry builder), and `ChickenManager` (spawner + update loop + hit/kill logic). Hit detection uses bounding-sphere raycasting (`THREE.Raycaster` + `THREE.Sphere`).

**`src/world.js`** — `buildWorld(scene)` builds the static scene geometry (terrain, sky, props).

**`src/effects.js`** — DOM effects (`muzzleFlash`, `showHitMarker`, `showMissMarker`) and the 3D `FeatherBurst` particle class.

## Key mechanics

- Aim: mouse position maps to camera yaw/pitch (clamped ±108° / -10°..63°). Camera stays fixed at `(0, 4.5, 0)` and only rotates.
- Shooting: ray always cast from NDC center `(0,0)` — crosshair is cosmetic. Hits are resolved against bounding spheres (`hitRadius = 1.2 * scale`).
- Chickens spawn from 4 sides, fly in straight lines with a sinusoidal vertical bob, and despawn after 20 s or when `|x|` or `|z|` > 100.
- Ammo: 6 shots, 1.1 s reload. Timer: 90 s.

## Linting notes

The game source files (`chickens.js`, `effects.js`, `world.js`, `main.js`) use `no-redeclare: off` and `no-unused-vars: off` because they define globals consumed across script-tag boundaries. Only `game-logic.js` is held to stricter rules. The pre-commit hook runs `lint-staged` (ESLint on staged `src/**/*.js`) then `npm test`.
