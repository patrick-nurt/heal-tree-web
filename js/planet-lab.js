import * as THREE from './three.module.min.js';

// Planet Design Lab — four globe directions in one WebGL canvas (scissor viewports).
// 1 GOLDEN EARTH (current) · 2 ECLIPSE · 3 AMBER · 4 CONSTELLATION

const SUPABASE_URL = 'https://xmbwpelfltzobvqdpake.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYndwZWxmbHR6b2J2cWRwYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTQ0MjQsImV4cCI6MjEwNzM5MDQyNH0.gvZyfnbvO1YnrLveeFIRJLxe5JcI_s2MQ-zAyKrVPoI';

const GOLD = 0xd4af37, GOLD_LIGHT = 0xf0e6c8;
const ANCHORS = {
  US:[38,-97], CA:[56,-106], MX:[23,-102], GB:[54,-2], ES:[40,-3], FR:[46,2], DE:[51,10],
  IT:[42,12], PT:[39,-8], AE:[24,54], SA:[24,45], JP:[36,138], CN:[35,105], IN:[21,78],
  AU:[-25,133], BR:[-10,-55], AR:[-34,-64], ZA:[-29,24], NG:[9,8], EG:[27,30], KE:[0,38],
  TR:[39,35], RU:[61,100], ID:[-2,118],
};

const canvas = document.getElementById('lab');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x0a0a0a, 1);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner); grad.addColorStop(0.55, outer); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}
function ringTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0.00, 'rgba(255,180,80,0)');
  grad.addColorStop(0.48, 'rgba(255,180,80,0)');
  grad.addColorStop(0.56, 'rgba(255,180,80,0.45)');
  grad.addColorStop(0.68, 'rgba(230,140,50,0.16)');
  grad.addColorStop(1.00, 'rgba(230,140,50,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}
function ll(lat, lon, r = 1) {
  const phi = ((lon + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}
function mulberry(seed) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const loader = new THREE.TextureLoader();
const texNightP = loader.loadAsync('assets/earth_night.jpg');
const texDarkP = loader.loadAsync('assets/earth_dark.jpg');

// Parameterized planet material (one shader, per-variant uniforms).
function planetMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uNight: { value: null }, uDark: { value: null },
      uLand: { value: u.land }, uLights: { value: u.lights },
      uBase: { value: u.base }, uRim: { value: u.rim }, uAmb: { value: u.amb },
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D uNight, uDark;
      uniform float uLand, uLights, uBase, uRim, uAmb;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 night = texture2D(uNight, vUv).rgb;
        vec3 dark  = texture2D(uDark,  vUv).rgb;
        float dl   = dot(dark, vec3(0.30, 0.55, 0.15));
        float land = clamp((dl - 0.075) / 0.10, 0.0, 1.0) * uLand;
        float L    = max(night.r, max(night.g, night.b));
        vec3 col = vec3(0.0157, 0.0275, 0.0627) * uBase + vec3(0.118, 0.098, 0.055) * land;
        float la = pow(L, 1.5) * 1.6 * uLights;
        col += vec3(0.945, 0.565, 0.142) * la;
        if (L > 0.55) col += vec3(1.0, 0.94, 0.745) * (L - 0.55) * 2.4 * uLights;
        float z = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        col += vec3(0.188, 0.141, 0.078) * pow(1.0 - z, 2.2);
        col *= (0.62 + 0.42 * z) * uAmb;
        col += vec3(1.0, 0.745, 0.372) * pow(1.0 - z, 4.5) * uRim;
        gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
      }`,
  });
}

function glowSprite(tex, scale, opacity) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  sp.scale.setScalar(scale);
  sp.renderOrder = -1;
  return sp;
}

function makeStars() {
  const n = 90, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const rnd = mulberry(7);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rnd() - 0.5) * 12; pos[i * 3 + 1] = (rnd() - 0.5) * 18; pos[i * 3 + 2] = -2 - rnd() * 5;
    const gold = rnd() < 0.18, b = 0.25 + rnd() * 0.7;
    col[i * 3] = (gold ? 0.83 : 1) * b; col[i * 3 + 1] = 0.69 * b; col[i * 3 + 2] = (gold ? 0.22 : 1) * b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
    map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,.4)'),
  }));
}

const RING = ringTexture();
const SOFT = glowTexture('rgba(255,220,140,1)', 'rgba(212,175,55,.5)');

const VARIANTS = [
  { name: '1 · GOLDEN EARTH', vibe: 'current — night lights, gold grade',
    u: { land: 1, lights: 1, base: 1, rim: 1.15, amb: 1 },
    dress: (scene) => {
      scene.add(glowSprite(RING, 2.9, 0.8));
      scene.add(glowSprite(SOFT, 2.35, 0.35));
    } },
  { name: '2 · ECLIPSE', vibe: 'black disc, brilliant corona rim',
    u: { land: 0.18, lights: 0.85, base: 0.35, rim: 2.6, amb: 0.72 },
    dress: (scene) => {
      scene.add(glowSprite(RING, 2.75, 1.0));
      scene.add(glowSprite(SOFT, 3.3, 0.22));
    } },
  { name: '3 · AMBER', vibe: 'bright warm amber, glowing land',
    u: { land: 1.8, lights: 1.7, base: 1.25, rim: 1.5, amb: 1.3 },
    dress: (scene) => {
      scene.add(glowSprite(SOFT, 2.6, 0.5));
      scene.add(glowSprite(RING, 2.5, 0.45));
    } },
  { name: '4 · CONSTELLATION', vibe: 'dark sphere, graticule + anchor stars',
    u: { land: 0.4, lights: 1.25, base: 0.45, rim: 1.2, amb: 0.85 },
    dress: (scene) => {
      scene.add(glowSprite(RING, 2.6, 0.4));  // placeholder anchor for splice
      scene.add(glowSprite(RING, 2.6, 0.4));
      const pts = [];
      for (const [lat, lon] of Object.values(ANCHORS)) { const v = ll(lat, lon, 1.008); pts.push(v.x, v.y, v.z); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      const stars = new THREE.Points(g, new THREE.PointsMaterial({
        size: 0.06, map: SOFT, color: GOLD_LIGHT, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      stars.name = 'anchors';
      scene.add(stars);
      const linePts = [];
      const R = 1.004;
      for (let lat = -75; lat <= 75; lat += 15)
        for (let lon = -180; lon < 180; lon += 5) {
          const a = ll(lat, lon, R), b = ll(lat, lon + 5, R);
          linePts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      for (let lon = -180; lon < 180; lon += 15)
        for (let lat = -90; lat < 90; lat += 5) {
          const a = ll(lat, lon, R), b = ll(lat + 5, lon, R);
          linePts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePts), 3));
      const grid = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
        color: GOLD, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      scene.add(grid);
    } },
  { name: '5 · CONNECTED HANDS', vibe: 'brief: two golden lines cradle the globe',
    u: { land: 0.9, lights: 1.1, base: 0.6, rim: 1.5, amb: 0.82 },
    dress: (scene) => {
      scene.add(glowSprite(RING, 2.8, 0.7));
      // Brief "Connected Hands": elegant golden lines loop up from the
      // bottom corners, cradling the circle. Camera-space — the hands hold
      // the world while it turns.
      for (const s of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(1.18 * s, -1.88, 0.5),
          new THREE.Vector3(0.86 * s, -1.42, 0.3),
          new THREE.Vector3(0.55 * s, -1.16, 0.12),
          new THREE.Vector3(0.30 * s, -1.05, 0.05),
        ]);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 40, 0.030, 8, false),
          new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85,
            blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }),
        );
        tube.renderOrder = 4;
        scene.add(tube);
        const palm = glowSprite(SOFT, 0.9, 0.5);
        palm.position.set(0.5 * s, -1.1, 0.1);
        scene.add(palm);
      }
    } },
  { name: '6 · EARTH AT NIGHT', vibe: 'photographic — city lights on black',
    u: { land: 0.25, lights: 1.9, base: 0.5, rim: 1.0, amb: 0.75 },
    dress: (scene) => { scene.add(glowSprite(RING, 2.6, 0.5)); } },
  { name: '7 · GOLDEN SPROUT', vibe: 'brief: seed of light, two leaf arcs',
    u: { land: 0.8, lights: 1.05, base: 0.55, rim: 1.3, amb: 0.8 },
    dress: (scene) => {
      scene.add(glowSprite(SOFT, 2.2, 0.3));
      const seed = glowSprite(SOFT, 0.85, 0.55);
      seed.position.set(0, 1.1, 0);
      scene.add(seed);
      for (const s of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 1.02, 0),
          new THREE.Vector3(0.22 * s, 1.22, 0.08),
          new THREE.Vector3(0.38 * s, 1.38, 0.12),
        ]);
        const leaf = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.016, 6, false),
          new THREE.MeshBasicMaterial({ color: GOLD_LIGHT, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false }));
        scene.add(leaf);
      }
    } },
  { name: '8 · THE GOLDEN THREAD', vibe: 'shipped — softened for country legibility',
    u: { land: 0.9, lights: 1.0, base: 0.65, rim: 1.05, amb: 0.9 },
    dress: (scene, cell) => {
      scene.add(glowSprite(RING, 2.7, 0.55));
      const threadGroup = new THREE.Group();
      for (const [rx, rz] of [[0.5, 0.35], [-0.35, -0.55]]) {
        const t = new THREE.Mesh(
          new THREE.TorusGeometry(1.12, 0.006, 8, 128),
          new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        t.rotation.x = rx; t.rotation.z = rz;
        threadGroup.add(t);
      }
      scene.add(threadGroup);
      cell.thread = threadGroup;
    },
    animate: (cell, dt) => { if (cell.thread) cell.thread.rotation.y += dt * 0.35; } },
];


const cells = [];

(async () => {
  const [texNight, texDark] = await Promise.all([texNightP, texDarkP]);
  for (const t of [texNight, texDark]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; }

  for (const v of VARIANTS) {
    const scene = new THREE.Scene();
    scene.add(makeStars());
    const mat = planetMaterial(v.u);
    mat.uniforms.uNight.value = texNight;
    mat.uniforms.uDark.value = texDark;
    const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), mat);
    const world = new THREE.Group();
    world.add(planet);
    scene.add(world);
    const cell = { scene, world, planet, starsRef: null, animate: v.animate };
    v.dress(scene, cell);
    cell.starsRef = scene.getObjectByName('anchors');
    cells.push(cell);
    world.rotation.y = THREE.MathUtils.degToRad(20 - 90);
  }

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = (innerWidth / 4) / (innerHeight / 2); // cell aspect (4 cols × 2 rows)
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  let last = performance.now();
  const ROT = (Math.PI * 2) / 75;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const w = innerWidth, h = innerHeight, hw = Math.floor(w / 4), hh = Math.floor(h / 2);
    renderer.setScissorTest(true);
    cells.forEach((cell, i) => {
      cell.world.rotation.y += ROT * dt;
      if (cell.animate) cell.animate(cell, dt);
      const x = (i % 4) * hw, y = i < 4 ? hh : 0; // three viewport origin = bottom-left
      renderer.setViewport(x, y, hw, hh);
      renderer.setScissor(x, y, hw, hh);
      renderer.render(cell.scene, camera);
    });
    renderer.setScissorTest(false);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__lab = { cells };
})();
