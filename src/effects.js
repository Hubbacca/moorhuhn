// effects.js — visual effects: muzzle flash, feather burst, hit text

const muzzleEl = () => document.getElementById('muzzle-flash');

function muzzleFlash() {
  const el = muzzleEl();
  if (!el) return;
  el.style.opacity = '1';
  el.style.transition = 'none';
  setTimeout(() => {
    el.style.transition = 'opacity 0.18s ease-out';
    el.style.opacity = '0';
  }, 30);
}

function showHitMarker(points, x, y) {
  const div = document.createElement('div');
  div.className = 'hit-marker';
  div.textContent = '+' + points;
  div.style.left = x + 'px';
  div.style.top  = y + 'px';
  div.style.color = points >= 100 ? '#ffd700' : points >= 30 ? '#80ff80' : '#fff';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1000);
}

function showMissMarker(x, y) {
  const div = document.createElement('div');
  div.className = 'hit-marker';
  div.textContent = 'MISS';
  div.style.left = x + 'px';
  div.style.top  = y + 'px';
  div.style.color = '#ff6060';
  div.style.fontSize = '24px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 800);
}

// ── Feather burst at hit position (3D particles) ──
class FeatherBurst {
  constructor(scene, position, color) {
    this.scene = scene;
    this.feathers = [];
    const num = 14;
    for (let i = 0; i < num; i++) {
      const featherGeom = new THREE.PlaneGeometry(0.25, 0.5);
      const featherMat  = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 1, side: THREE.DoubleSide
      });
      const f = new THREE.Mesh(featherGeom, featherMat);
      f.position.copy(position);
      // Random outward velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      f.userData.vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        4 + Math.random() * 3,
        Math.sin(angle) * speed
      );
      f.userData.rotVel = new THREE.Vector3(
        Math.random() * 6 - 3,
        Math.random() * 6 - 3,
        Math.random() * 6 - 3
      );
      f.userData.life = 0;
      this.scene.add(f);
      this.feathers.push(f);
    }
    this.startTime = performance.now();
  }

  update(dt) {
    const totalElapsed = (performance.now() - this.startTime) / 1000;
    const done = [];
    for (let i = 0; i < this.feathers.length; i++) {
      const f = this.feathers[i];
      f.userData.life += dt;
      // Gravity
      f.userData.vel.y -= 9.8 * dt;
      // Move
      f.position.addScaledVector(f.userData.vel, dt);
      // Rotate
      f.rotation.x += f.userData.rotVel.x * dt;
      f.rotation.y += f.userData.rotVel.y * dt;
      f.rotation.z += f.userData.rotVel.z * dt;
      // Air drag
      f.userData.vel.multiplyScalar(0.98);
      // Fade after 1.5s
      if (f.userData.life > 1.5) {
        f.material.opacity = Math.max(0, 1 - (f.userData.life - 1.5) / 0.8);
      }
      if (f.userData.life > 2.3 || f.position.y < 0) {
        done.push(i);
      }
    }
    // Remove finished
    for (let i = done.length - 1; i >= 0; i--) {
      const f = this.feathers[done[i]];
      this.scene.remove(f);
      f.geometry.dispose();
      f.material.dispose();
      this.feathers.splice(done[i], 1);
    }
    return this.feathers.length === 0;
  }
}

// ── HUD ammo display ──
function updateAmmoDisplay(ammo, max) {
  const ammoEl = document.getElementById('ammo-value');
  if (!ammoEl) return;
  ammoEl.textContent = '● '.repeat(ammo) + '○ '.repeat(max - ammo);
  ammoEl.className = ammo === 0 ? 'empty' : '';
}

// ── Speech bubble that tracks a 3D world position ──
function showSpeechBubble(camera, worldPos, text, durationMs) {
  durationMs = durationMs || 2200;
  const div = document.createElement('div');
  div.className = 'speech-bubble';
  div.textContent = text;
  document.body.appendChild(div);

  const startTime = performance.now();
  const pos = worldPos.clone();

  const tick = () => {
    const elapsed = performance.now() - startTime;
    if (elapsed >= durationMs) {
      div.remove();
      return;
    }
    // Project world position to NDC then to CSS pixels
    const ndc = pos.clone().project(camera);
    const x = ( ndc.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight;
    // Fade out in last 400ms
    const fade = elapsed > durationMs - 400
      ? 1 - (elapsed - (durationMs - 400)) / 400
      : 1;
    div.style.left = x + 'px';
    div.style.top  = y + 'px';
    div.style.opacity = fade;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Smoke / sizzle particles rising from grill ──
class GrillSizzle {
  constructor(scene, grillPos) {
    this.scene = scene;
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.12;
    this.totalLife = 0;
    this.maxLife = 4.5;
    this.origin = grillPos.clone();
  }

  update(dt) {
    this.totalLife += dt;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.totalLife < this.maxLife - 0.5) {
      this.spawnTimer = this.spawnInterval * (0.8 + Math.random() * 0.5);
      const puffs = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < puffs; i++) {
        const r = 0.06 + Math.random() * 0.1;
        const mat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0xcccccc : 0xffffff,
          transparent: true,
          opacity: 0.55,
        });
        const p = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), mat);
        p.position.set(
          this.origin.x + (Math.random() - 0.5) * 0.6,
          this.origin.y + 0.3,
          this.origin.z + (Math.random() - 0.5) * 0.6
        );
        p.userData.vel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          1.2 + Math.random() * 0.8,
          (Math.random() - 0.5) * 0.4
        );
        p.userData.life = 0;
        p.userData.maxLife = 1.6 + Math.random() * 1.2;
        this.scene.add(p);
        this.particles.push(p);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life += dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.vel.multiplyScalar(0.97);
      p.scale.addScalar(dt * 0.3);
      const lifeRatio = p.userData.life / p.userData.maxLife;
      p.material.opacity = 0.55 * (1 - lifeRatio);
      if (p.userData.life >= p.userData.maxLife) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    return this.totalLife >= this.maxLife && this.particles.length === 0;
  }
}
