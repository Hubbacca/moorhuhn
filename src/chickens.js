// chickens.js — chicken model + flight behavior + spawner

const CHICKEN_TYPES = {
  small:  { scale: 0.7, points: 30,  speed: 14, hp: 1, weight: 50, color: 0xfff0d0 },
  medium: { scale: 1.0, points: 20,  speed: 11, hp: 1, weight: 35, color: 0xffe0a0 },
  large:  { scale: 1.4, points: 10,  speed: 8,  hp: 1, weight: 25, color: 0xf0c060 },
  golden: { scale: 1.0, points: 100, speed: 18, hp: 1, weight: 6,  color: 0xffd700,
            metallic: true },
};

function buildChickenMesh(typeData) {
  const group = new THREE.Group();

  const matBody = new THREE.MeshLambertMaterial({
    color: typeData.color,
    emissive: typeData.metallic ? 0x553300 : 0x000000,
    flatShading: true,
  });
  const matBeak  = new THREE.MeshLambertMaterial({ color: 0xff8800, flatShading: true });
  const matComb  = new THREE.MeshLambertMaterial({ color: 0xd00000, flatShading: true });
  const matEye   = new THREE.MeshLambertMaterial({ color: 0x000000 });
  const matWing  = new THREE.MeshLambertMaterial({
    color: typeData.metallic ? 0xe0b020 : 0xc09060,
    flatShading: true,
  });
  const matLeg   = new THREE.MeshLambertMaterial({ color: 0xd06010, flatShading: true });

  // Body (egg-shaped)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), matBody);
  body.scale.set(1.0, 0.85, 1.3);
  group.add(body);

  // Tail feathers (a few cones angled back)
  for (let i = -1; i <= 1; i++) {
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 5), matWing);
    feather.position.set(i * 0.18, 0.15, -0.85);
    feather.rotation.x = Math.PI / 2 + 0.3;
    feather.rotation.z = i * 0.3;
    group.add(feather);
  }

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), matBody);
  head.position.set(0, 0.45, 0.78);
  group.add(head);

  // Beak (cone forward)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 6), matBeak);
  beak.position.set(0, 0.4, 1.18);
  beak.rotation.x = Math.PI / 2;
  group.add(beak);

  // Comb (small red bumps on top of head)
  for (let i = 0; i < 3; i++) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), matComb);
    bump.position.set(0, 0.78 - i * 0.02, 0.62 + i * 0.1);
    bump.scale.set(0.6, 1.2, 0.8);
    group.add(bump);
  }
  // Wattle (under beak)
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), matComb);
  wattle.position.set(0, 0.25, 1.05);
  wattle.scale.set(0.7, 1.2, 0.7);
  group.add(wattle);

  // Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), matEye);
  eyeL.position.set(-0.22, 0.5, 1.05);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), matEye);
  eyeR.position.set( 0.22, 0.5, 1.05);
  group.add(eyeR);
  // Eye whites
  const eyeWMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeWL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyeWMat);
  eyeWL.position.set(-0.22, 0.5, 1.02); group.add(eyeWL);
  const eyeWR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyeWMat);
  eyeWR.position.set( 0.22, 0.5, 1.02); group.add(eyeWR);
  // Re-add pupils on top
  group.remove(eyeL); group.remove(eyeR);
  group.add(eyeL); group.add(eyeR);

  // Wings — store on group for animation
  const wingGeom = new THREE.BoxGeometry(0.1, 0.7, 0.9);
  const wingL = new THREE.Mesh(wingGeom, matWing);
  wingL.position.set(-0.65, 0.1, 0);
  group.add(wingL);
  const wingR = new THREE.Mesh(wingGeom, matWing);
  wingR.position.set(0.65, 0.1, 0);
  group.add(wingR);

  // Legs (tucked up — only visible when chicken stands, but we keep them subtle)
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), matLeg);
  legL.position.set(-0.18, -0.55, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), matLeg);
  legR.position.set(0.18, -0.55, 0);
  group.add(legR);

  group.userData.wings = [wingL, wingR];
  group.scale.setScalar(typeData.scale);
  return group;
}

// ── Spawner / manager ─────────────────────────────────────────
class ChickenManager {
  constructor(scene, grillPos) {
    this.scene = scene;
    this.grillPos = grillPos || new THREE.Vector3(0, 1.2, 6);
    this.chickens = [];          // active chicken objects
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;    // seconds between spawns
    this.minChickensAlive = 3;
  }

  // Pick a random type weighted
  pickType() {
    const totalW = Object.values(CHICKEN_TYPES).reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalW;
    for (const [name, type] of Object.entries(CHICKEN_TYPES)) {
      r -= type.weight;
      if (r <= 0) return { name, ...type };
    }
    return { name: 'medium', ...CHICKEN_TYPES.medium };
  }

  spawn() {
    const type = this.pickType();
    const mesh = buildChickenMesh(type);

    // Spawn from one of 4 directions, fly across the player area
    const side = Math.floor(Math.random() * 4);
    const spawnDist = 80;
    const height = 6 + Math.random() * 18;
    let start, target;
    if (side === 0) {        // left → right
      start  = new THREE.Vector3(-spawnDist, height, -20 + Math.random() * 40);
      target = new THREE.Vector3( spawnDist, height + (Math.random()-0.5)*8, -20 + Math.random() * 40);
    } else if (side === 1) { // right → left
      start  = new THREE.Vector3( spawnDist, height, -20 + Math.random() * 40);
      target = new THREE.Vector3(-spawnDist, height + (Math.random()-0.5)*8, -20 + Math.random() * 40);
    } else if (side === 2) { // back → front
      start  = new THREE.Vector3(-30 + Math.random() * 60, height, -spawnDist);
      target = new THREE.Vector3(-30 + Math.random() * 60, height + (Math.random()-0.5)*8,  spawnDist);
    } else {                 // front-back diagonal
      start  = new THREE.Vector3(-spawnDist, height + 4, -spawnDist * 0.4);
      target = new THREE.Vector3( spawnDist, height + 4,  spawnDist * 0.4);
    }

    mesh.position.copy(start);
    // Velocity vector aimed at target
    const dir = target.clone().sub(start).normalize();
    const speed = type.speed * (0.9 + Math.random() * 0.3);

    // Make chicken face flight direction
    mesh.lookAt(target);
    // Add wobble parameters
    mesh.userData.chicken = {
      type, speed, dir, target,
      flapPhase: Math.random() * Math.PI * 2,
      bobPhase:  Math.random() * Math.PI * 2,
      alive: true,
      points: type.points,
      hitRadius: 1.2 * type.scale,
      lifeTime: 0,
    };

    this.scene.add(mesh);
    this.chickens.push(mesh);
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 || this.chickens.length < this.minChickensAlive) {
      this.spawn();
      this.spawnTimer = this.spawnInterval * (0.7 + Math.random() * 0.6);
    }

    // Update each chicken
    for (let i = this.chickens.length - 1; i >= 0; i--) {
      const mesh = this.chickens[i];
      const c = mesh.userData.chicken;
      if (!c.alive) continue;

      c.lifeTime += dt;

      // Move forward
      mesh.position.addScaledVector(c.dir, c.speed * dt);

      // Wing flap
      c.flapPhase += dt * 18;
      const flap = Math.sin(c.flapPhase) * 0.7;
      mesh.userData.wings[0].rotation.z =  flap;
      mesh.userData.wings[1].rotation.z = -flap;

      // Bob up and down slightly
      c.bobPhase += dt * 4;
      mesh.position.y += Math.sin(c.bobPhase) * 0.04;

      // Despawn when far away
      const dx = mesh.position.x, dz = mesh.position.z;
      if (Math.abs(dx) > 100 || Math.abs(dz) > 100 || c.lifeTime > 20) {
        this.removeChicken(i);
      }
    }
  }

  removeChicken(index) {
    const mesh = this.chickens[index];
    this.scene.remove(mesh);
    this.disposeMesh(mesh);
    this.chickens.splice(index, 1);
  }

  disposeMesh(mesh) {
    mesh.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }

  // For hit detection — return all currently alive chicken meshes
  getActiveMeshes() {
    return this.chickens.filter(c => c.userData.chicken.alive);
  }

  // Called when a chicken is hit; arcs toward grillPos then calls onLanded
  kill(mesh, onLanded) {
    const c = mesh.userData.chicken;
    if (!c.alive) return 0;
    c.alive = false;
    const points = c.points;

    const fallStart = performance.now();
    const fallDuration = 1400;
    const startX = mesh.position.x;
    const startY = mesh.position.y;
    const startZ = mesh.position.z;
    const gp = this.grillPos;

    const animate = () => {
      const t = Math.min((performance.now() - fallStart) / fallDuration, 1.0);
      // Lateral lerp toward grill
      mesh.position.x = startX + (gp.x - startX) * t;
      mesh.position.z = startZ + (gp.z - startZ) * t;
      // Parabolic drop: starts at startY, lands at gp.y
      const drop = startY - gp.y;
      mesh.position.y = startY - drop * t - (startY - gp.y) * t * t * (1 - t) * 2;
      // tumble
      mesh.rotation.x += 0.15;
      mesh.rotation.z += 0.18;

      if (t >= 1.0) {
        // Snap to grill surface
        mesh.position.set(gp.x, gp.y, gp.z);
        mesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
        if (onLanded) onLanded(mesh);
        return;
      }
      requestAnimationFrame(animate);
    };
    animate();

    return points;
  }
}
