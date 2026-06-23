// main.js — boot Three.js, run game loop, handle input + scoring

(function () {
  // ── State ──
  const STATE = {
    phase: 'menu',  // 'menu' | 'playing' | 'ended'
    score: 0,
    shots: 0,
    hits: 0,
    timeLeft: 90,
    ammo: 6,
    maxAmmo: 6,
    reloading: false,
  };

  // ── Three.js setup ──
  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x6a90c0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xa8c8e8, 60, 400);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1500);
  camera.position.set(0, 4.5, 14);
  camera.lookAt(0, 8, 0);

  // ── Build world ──
  const { grillPos, cookArm } = buildWorld(scene);

  // ── Chicken manager ──
  const chickenMgr = new ChickenManager(scene, grillPos);

  // ── Effect tracking ──
  const featherBursts = [];
  const grillSizzles  = [];
  // Cook arm animation state: { timeLeft }
  let cookArmAnim = null;

  // ── Mouse-based aim (cursor-driven, classic Moorhuhn style) ──
  // Yaw / pitch follow mouse position; clamped.
  const aim = {
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
  };
  const MAX_YAW   = Math.PI * 0.6;   // ~108°
  const MAX_PITCH = Math.PI * 0.35;  // ~63°
  const PITCH_MIN = -Math.PI * 0.1;  // not too far down (player can't shoot at feet)

  window.addEventListener('mousemove', (e) => {
    aim.mouseX = e.clientX;
    aim.mouseY = e.clientY;
    if (STATE.phase !== 'playing') return;
    // Convert to -1..1
    const nx = (e.clientX / window.innerWidth)  * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    aim.targetYaw   =  nx * MAX_YAW;
    aim.targetPitch = -ny * MAX_PITCH;
    // Clamp lower bound
    if (aim.targetPitch < PITCH_MIN) aim.targetPitch = PITCH_MIN;
  });

  // ── Resize ──
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // ── Raycasting (always from center of screen since crosshair is centered) ──
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0); // NDC center

  function shoot() {
    if (STATE.phase !== 'playing') return;
    if (STATE.reloading) return;
    if (STATE.ammo <= 0) {
      // Auto-trigger reload prompt: click does nothing, just play dry-fire
      return;
    }
    STATE.ammo--;
    STATE.shots++;
    updateAmmoDisplay(STATE.ammo, STATE.maxAmmo);
    muzzleFlash();

    // Auto-reload when empty
    if (STATE.ammo === 0) {
      startReload();
    }

    // Cast ray from center of screen
    raycaster.setFromCamera(screenCenter, camera);

    const meshes = chickenMgr.getActiveMeshes();
    // For each chicken, test ray vs bounding sphere of the group
    let bestHit = null;
    let bestDist = Infinity;
    const tempSphere = new THREE.Sphere();
    for (const m of meshes) {
      const c = m.userData.chicken;
      tempSphere.center.copy(m.position);
      tempSphere.radius = c.hitRadius;
      const hitPoint = new THREE.Vector3();
      const hit = raycaster.ray.intersectSphere(tempSphere, hitPoint);
      if (hit) {
        const dist = camera.position.distanceTo(hitPoint);
        if (dist < bestDist) {
          bestDist = dist;
          bestHit = { mesh: m, point: hitPoint };
        }
      }
    }

    if (bestHit) {
      STATE.hits++;
      const points = chickenMgr.kill(bestHit.mesh, (landedMesh) => {
        // Chicken landed on grill
        grillSizzles.push(new GrillSizzle(scene, grillPos));
        // Speech bubble above grill
        const bubblePos = grillPos.clone().add(new THREE.Vector3(0, 1.8, 0));
        showSpeechBubble(camera, bubblePos, 'Grill-me baby! 🍗', 2200);
        // Start cook arm animation
        cookArmAnim = { timeLeft: 3.0 };
        // Remove landed mesh from scene after a moment
        setTimeout(() => {
          scene.remove(landedMesh);
        }, 3500);
      });
      STATE.score += points;
      updateScore();

      // Hit feedback at center of screen
      showHitMarker(points, window.innerWidth / 2, window.innerHeight / 2 - 30);

      // 3D feather burst
      const color = bestHit.mesh.userData.chicken.type.color;
      featherBursts.push(new FeatherBurst(scene, bestHit.point, color));
    } else {
      showMissMarker(window.innerWidth / 2 + 40, window.innerHeight / 2 + 40);
    }

    document.getElementById('hits-value').textContent  = STATE.hits;
    document.getElementById('shots-value').textContent = STATE.shots;
  }

  function startReload() {
    STATE.reloading = true;
    const ammoLabel = document.getElementById('ammo-label');
    if (ammoLabel) ammoLabel.textContent = 'RELOADING';
    setTimeout(() => {
      STATE.ammo = STATE.maxAmmo;
      STATE.reloading = false;
      if (ammoLabel) ammoLabel.textContent = 'AMMO';
      updateAmmoDisplay(STATE.ammo, STATE.maxAmmo);
    }, 1100);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) shoot();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && STATE.phase === 'playing' &&
        !STATE.reloading && STATE.ammo < STATE.maxAmmo) {
      startReload();
    }
  });

  // ── UI ──
  function updateScore() {
    document.getElementById('score-value').textContent = STATE.score;
  }
  function updateTimer() {
    const t = Math.ceil(STATE.timeLeft);
    const el = document.getElementById('timer-value');
    el.textContent = t;
    if (t <= 10) el.classList.add('urgent');
    else el.classList.remove('urgent');
  }

  // ── Menu / start / end ──
  const menuScreen = document.getElementById('menu-screen');
  const endScreen  = document.getElementById('end-screen');
  const hudEl      = document.getElementById('hud');
  const crosshair  = document.getElementById('crosshair');

  function setMenuMode(on) {
    document.body.classList.toggle('menu-mode', on);
    crosshair.style.display = on ? 'none' : 'block';
  }
  setMenuMode(true);

  function startGame() {
    STATE.phase = 'playing';
    STATE.score = 0; STATE.shots = 0; STATE.hits = 0;
    STATE.timeLeft = 90;
    STATE.ammo = STATE.maxAmmo;
    STATE.reloading = false;
    // Sync aim to current mouse position so there's no jump on first move
    const nx = (aim.mouseX / window.innerWidth)  * 2 - 1;
    const ny = (aim.mouseY / window.innerHeight) * 2 - 1;
    aim.targetYaw = nx * MAX_YAW;
    aim.targetPitch = Math.max(-ny * MAX_PITCH, PITCH_MIN);
    aim.yaw = aim.targetYaw;
    aim.pitch = aim.targetPitch;
    menuScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    hudEl.classList.remove('hidden');
    setMenuMode(false);
    updateScore();
    updateTimer();
    updateAmmoDisplay(STATE.ammo, STATE.maxAmmo);
    document.getElementById('hits-value').textContent = '0';
    document.getElementById('shots-value').textContent = '0';
  }

  function endGame() {
    STATE.phase = 'ended';
    hudEl.classList.add('hidden');
    setMenuMode(true);
    document.getElementById('end-score').textContent = STATE.score;
    document.getElementById('end-hits').textContent  = STATE.hits;
    document.getElementById('end-shots').textContent = STATE.shots;
    const acc = STATE.shots > 0 ? Math.round((STATE.hits / STATE.shots) * 100) : 0;
    document.getElementById('end-accuracy').textContent = acc;
    // Rank
    let rank = 'Apprentice';
    if (STATE.score >= 200)  rank = 'Hunter';
    if (STATE.score >= 500)  rank = 'Marksman';
    if (STATE.score >= 1000) rank = 'Sharpshooter';
    if (STATE.score >= 2000) rank = 'LEGEND';
    document.getElementById('end-rank').textContent = 'Hunter Rank: ' + rank;
    endScreen.classList.remove('hidden');
  }

  // Click on menu or end screen to start/restart
  menuScreen.addEventListener('mousedown', () => {
    if (STATE.phase === 'menu') startGame();
  });
  endScreen.addEventListener('mousedown', () => {
    if (STATE.phase === 'ended') startGame();
  });

  // ── Game loop ──
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Smooth camera aim
    aim.yaw   += (aim.targetYaw   - aim.yaw)   * Math.min(1, dt * 12);
    aim.pitch += (aim.targetPitch - aim.pitch) * Math.min(1, dt * 12);
    // Apply: turn camera
    const baseY = 4.5;
    camera.position.set(0, baseY, 0);
    // Compute look target
    const lookDist = 20;
    const lookX = Math.sin(aim.yaw) * Math.cos(aim.pitch) * lookDist;
    const lookY = baseY + Math.sin(aim.pitch) * lookDist;
    const lookZ = -Math.cos(aim.yaw) * Math.cos(aim.pitch) * lookDist;
    camera.lookAt(lookX, lookY, lookZ);

    if (STATE.phase === 'playing') {
      // Timer
      STATE.timeLeft -= dt;
      if (STATE.timeLeft <= 0) {
        STATE.timeLeft = 0;
        updateTimer();
        endGame();
      } else {
        updateTimer();
      }

      // Update chickens
      chickenMgr.update(dt);
    } else {
      // In menu / end: gently rotate camera for parallax
      const t = now / 4000;
      aim.targetYaw = Math.sin(t) * 0.15;
      aim.targetPitch = 0.05;
    }

    // Update feather bursts (always)
    for (let i = featherBursts.length - 1; i >= 0; i--) {
      if (featherBursts[i].update(dt)) {
        featherBursts.splice(i, 1);
      }
    }

    // Update grill sizzle effects
    for (let i = grillSizzles.length - 1; i >= 0; i--) {
      if (grillSizzles[i].update(dt)) {
        grillSizzles.splice(i, 1);
      }
    }

    // Animate cook arm
    if (cookArmAnim) {
      cookArmAnim.timeLeft -= dt;
      cookArm.rotation.x = Math.sin(cookArmAnim.timeLeft * 6) * 0.5 - 0.4;
      if (cookArmAnim.timeLeft <= 0) {
        cookArm.rotation.x = -0.4;
        cookArmAnim = null;
      }
    }

    // Sun rotation (gentle)
    // (sun is part of buildWorld result but we don't track it here — keep static for now)

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Initial UI state
  hudEl.classList.add('hidden');
  updateAmmoDisplay(STATE.ammo, STATE.maxAmmo);
})();
