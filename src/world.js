// world.js — build the 3D scene: sky, sun, ground, mountains, trees, fence

function buildWorld(scene) {
  // ── Sky (sphere gradient) ──
  const skyGeom = new THREE.SphereGeometry(800, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x4a8ec0) },
      midColor:    { value: new THREE.Color(0xfac88a) },
      bottomColor: { value: new THREE.Color(0xffb060) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor, midColor, bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 c;
        if (h > 0.0) {
          c = mix(midColor, topColor, smoothstep(0.0, 0.7, h));
        } else {
          c = mix(midColor, bottomColor, smoothstep(0.0, -0.3, h));
        }
        gl_FragColor = vec4(c, 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(skyGeom, skyMat);
  scene.add(sky);

  // ── Sun (glowing disc in sky) ──
  const sunGeom = new THREE.CircleGeometry(40, 32);
  const sunMat  = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.95 });
  const sun = new THREE.Mesh(sunGeom, sunMat);
  sun.position.set(-200, 90, -500);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  // Sun glow halo
  const haloGeom = new THREE.CircleGeometry(80, 32);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.18 });
  const halo = new THREE.Mesh(haloGeom, haloMat);
  halo.position.copy(sun.position).multiplyScalar(0.98);
  halo.lookAt(0, 0, 0);
  scene.add(halo);

  // ── Lighting ──
  const hemi = new THREE.HemisphereLight(0xc8e0ff, 0x405028, 0.65);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xfff0c0, 0.9);
  dir.position.set(-2, 4, -3);
  scene.add(dir);
  const ambient = new THREE.AmbientLight(0x404060, 0.3);
  scene.add(ambient);

  // ── Ground (large plane with grass texture) ──
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 256; groundCanvas.height = 256;
  const gctx = groundCanvas.getContext('2d');
  // Base
  gctx.fillStyle = '#3a6020'; gctx.fillRect(0, 0, 256, 256);
  // Darker patches
  for (let i = 0; i < 80; i++) {
    gctx.fillStyle = `rgba(${30+Math.random()*30}, ${60+Math.random()*30}, 20, 0.5)`;
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = 8 + Math.random() * 24;
    gctx.beginPath(); gctx.arc(x, y, r, 0, Math.PI * 2); gctx.fill();
  }
  // Grass blades (lighter)
  gctx.fillStyle = '#6aa840';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    gctx.fillRect(x, y, 1, 2 + Math.random() * 3);
  }
  // Yellow tufts
  gctx.fillStyle = '#c0c050';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    gctx.fillRect(x, y, 1, 2);
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(60, 60);
  const groundMat  = new THREE.MeshLambertMaterial({ map: groundTex });
  const groundGeom = new THREE.PlaneGeometry(1200, 1200);
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // ── Distant mountains (low-poly ring) ──
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const dist  = 500;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const h = 60 + Math.random() * 80;
    const w = 100 + Math.random() * 80;
    const mountGeom = new THREE.ConeGeometry(w, h, 4 + Math.floor(Math.random() * 3));
    const mountColor = new THREE.Color().setHSL(0.6, 0.25, 0.25 + Math.random() * 0.1);
    const mountMat = new THREE.MeshLambertMaterial({ color: mountColor, flatShading: true });
    const mount = new THREE.Mesh(mountGeom, mountMat);
    mount.position.set(x, h / 2 - 4, z);
    mount.rotation.y = Math.random() * Math.PI;
    scene.add(mount);
  }

  // ── Trees (random pine trees around the meadow) ──
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 80 + Math.random() * 250;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    addPineTree(scene, x, z);
  }

  // ── Closer scattered bushes ──
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 30 + Math.random() * 60;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    addBush(scene, x, z);
  }

  // ── Fence around the player area ──
  buildFence(scene);

  // ── A barn off in the distance for atmosphere ──
  addBarn(scene, -80, -120);

  // ── Some hay bales near the player ──
  addHayBale(scene,  18, 12);
  addHayBale(scene, -14, 16);
  addHayBale(scene,  24, -10);

  // ── Grill station in front of player ──
  const grill = buildGrillScene(scene);

  return { sun, halo, grillGroup: grill.grillGroup, grillPos: grill.grillPos, cookArm: grill.cookArm };
}

function addPineTree(scene, x, z) {
  const trunkH = 4 + Math.random() * 3;
  const trunkGeom = new THREE.CylinderGeometry(0.4, 0.6, trunkH, 6);
  const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x4a2a18 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.set(x, trunkH / 2, z);
  scene.add(trunk);

  // 3 stacked cones
  const greenH = 0.25 + Math.random() * 0.1;
  const greenS = 0.35 + Math.random() * 0.15;
  const treeMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color().setHSL(greenH, greenS, 0.25 + Math.random() * 0.1),
    flatShading: true,
  });
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const radius = 3 - i * 0.7;
    const height = 3.5 - i * 0.4;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), treeMat);
    cone.position.set(x, trunkH + i * 2.2, z);
    scene.add(cone);
  }
}

function addBush(scene, x, z) {
  const bushMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color().setHSL(0.27, 0.45, 0.3 + Math.random() * 0.1),
    flatShading: true,
  });
  for (let i = 0; i < 3; i++) {
    const r = 0.8 + Math.random() * 0.4;
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), bushMat);
    sphere.position.set(
      x + (Math.random() - 0.5) * 1.5,
      r * 0.7,
      z + (Math.random() - 0.5) * 1.5
    );
    scene.add(sphere);
  }
}

function buildFence(scene) {
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x9a6a3a });
  const postMat  = new THREE.MeshLambertMaterial({ color: 0x7a4a20 });
  const segments = 24;
  const radius   = 14;

  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    // Skip in front of player (gap centered on -Z, i.e. angle π)
    if (a1 > Math.PI * 0.75 && a1 < Math.PI * 1.25) continue;

    const x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;
    const x2 = Math.cos(a2) * radius, z2 = Math.sin(a2) * radius;

    // Post at start of segment
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), postMat);
    post.position.set(x1, 0.8, z1);
    scene.add(post);

    // Two horizontal rails
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx*dx + dz*dz);
    for (const yPos of [0.45, 1.1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.08), woodMat);
      rail.position.set((x1 + x2) / 2, yPos, (z1 + z2) / 2);
      rail.rotation.y = -Math.atan2(dz, dx);
      scene.add(rail);
    }
  }
}

function addBarn(scene, x, z) {
  const barnMat = new THREE.MeshLambertMaterial({ color: 0x903020, flatShading: true });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x402010, flatShading: true });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x301810 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 12), barnMat);
  body.position.set(x, 5, z);
  scene.add(body);
  // Roof (rotated box)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), roofMat);
  roof.position.set(x, 12.5, z);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.2, 1, 1);
  scene.add(roof);
  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.4), doorMat);
  door.position.set(x, 2.5, z + 6.1);
  scene.add(door);
}

function addHayBale(scene, x, z) {
  const hayMat = new THREE.MeshLambertMaterial({ color: 0xd0b060, flatShading: true });
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), hayMat);
  bale.rotation.z = Math.PI / 2;
  bale.position.set(x, 0.9, z);
  scene.add(bale);
  // Texture lines
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xa08040 });
  for (const offs of [-0.4, 0, 0.4]) {
    const line = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.04, 4, 12), lineMat);
    line.rotation.y = Math.PI / 2;
    line.position.set(x + offs, 0.9, z);
    scene.add(line);
  }
}

function buildGrillScene(scene) {
  const GX = 0, GZ = -6;
  const grillPos = new THREE.Vector3(GX, 1.2, GZ);
  const grillGroup = new THREE.Group();

  const metalMat  = new THREE.MeshLambertMaterial({ color: 0x444444, flatShading: true });
  const grateMat  = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
  const coalMat   = new THREE.MeshLambertMaterial({ color: 0x111111, flatShading: true });
  const glowMat   = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
  const pipeMat   = new THREE.MeshLambertMaterial({ color: 0x333333 });

  // Bowl (kettle grill body)
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
  bowl.position.y = 1.1;
  grillGroup.add(bowl);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
  lid.position.y = 1.1;
  lid.rotation.x = Math.PI;
  lid.position.y = 2.1;
  grillGroup.add(lid);

  // Grate
  const grate = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 16), grateMat);
  grate.position.y = 1.2;
  grillGroup.add(grate);

  // Coal glow inside
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 12), glowMat);
  glow.position.y = 0.75;
  grillGroup.add(glow);

  // Legs (3 legs)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 5), metalMat);
    leg.position.set(Math.cos(angle) * 0.7, 0.55, Math.sin(angle) * 0.7);
    leg.rotation.z = Math.sin(angle) * 0.18;
    leg.rotation.x = Math.cos(angle) * 0.18;
    grillGroup.add(leg);
  }

  // Smoke pipe on lid
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), pipeMat);
  pipe.position.set(0.5, 2.65, 0);
  grillGroup.add(pipe);

  grillGroup.position.set(GX, 0, GZ);
  scene.add(grillGroup);

  // ── Cook person ──
  const skinMat   = new THREE.MeshLambertMaterial({ color: 0xf0c090, flatShading: true });
  const shirtMat  = new THREE.MeshLambertMaterial({ color: 0x2255aa, flatShading: true });
  const pantsMat  = new THREE.MeshLambertMaterial({ color: 0x334466, flatShading: true });
  const hatMat    = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

  const cookGroup = new THREE.Group();

  // Legs
  for (const sx of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pantsMat);
    leg.position.set(sx, 0.35, 0);
    cookGroup.add(leg);
  }
  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirtMat);
  torso.position.y = 1.05;
  cookGroup.add(torso);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), skinMat);
  head.position.y = 1.65;
  cookGroup.add(head);
  // Chef hat
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 8), hatMat);
  hatBrim.position.y = 1.88;
  cookGroup.add(hatBrim);
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.38, 8), hatMat);
  hatTop.position.y = 2.1;
  cookGroup.add(hatTop);

  // Right arm (the grilling arm — pivots at shoulder)
  const armPivot = new THREE.Group();
  armPivot.position.set(-0.38, 1.05, 0);
  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), skinMat);
  upperArm.position.set(0, -0.22, 0);
  armPivot.add(upperArm);
  // Spatula in hand
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 5), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
  handle.position.set(0, -0.55, 0);
  armPivot.add(handle);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.14), new THREE.MeshLambertMaterial({ color: 0x888888 }));
  blade.position.set(0, -0.78, 0);
  armPivot.add(blade);
  cookGroup.add(armPivot);

  // Left arm (static, resting)
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), skinMat);
  leftArm.position.set(0.38, 0.83, 0);
  cookGroup.add(leftArm);

  cookGroup.position.set(GX + 1.8, 0, GZ);
  cookGroup.rotation.y = Math.PI * 0.4;
  scene.add(cookGroup);

  return { grillGroup, grillPos, cookArm: armPivot };
}
