// Planet Compare — A: spinning globe (current) · B: globe held centered on the
// user's location while the golden thread arcs animate around it.
import * as THREE from './three.module.min.js';

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYndwZWxmbHR6b2J2cWRwYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTQ0MjQsImV4cCI6MjEwNzM5MDQyNH0.gvZyfnbvO1YnrLveeFIRJLxe5JcI_s2MQ-zAyKrVPoI';
const GOLD = 0xd4af37, GOLD_LIGHT = 0xf0e6c8;

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
  grad.addColorStop(0.48, 'rgba(255,180,80,0)');
  grad.addColorStop(0.56, 'rgba(255,180,80,0.45)');
  grad.addColorStop(0.68, 'rgba(230,140,50,0.16)');
  grad.addColorStop(1, 'rgba(230,140,50,0)');
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

const canvas = document.getElementById('cmp');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x0a0a0a, 1);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
const loader = new THREE.TextureLoader();
const texNP = loader.loadAsync('assets/earth_night.jpg');
const texDP = loader.loadAsync('assets/earth_dark.jpg');

const SOFT = glowTexture('rgba(255,220,140,1)', 'rgba(212,175,55,.5)');
const RINGT = ringTexture();

function planetMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uNight: { value: null }, uDark: { value: null } },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D uNight, uDark;
      varying vec2 vUv;
      void main() {
        vec3 night = texture2D(uNight, vUv).rgb;
        vec3 dark  = texture2D(uDark,  vUv).rgb;
        float dl   = dot(dark, vec3(0.30, 0.55, 0.15));
        float land = clamp((dl - 0.075) / 0.10, 0.0, 1.0);
        float L    = max(night.r, max(night.g, night.b));
        vec3 col = vec3(0.0157, 0.0275, 0.0627) + vec3(0.145, 0.120, 0.066) * land;
        float la = pow(L, 1.5) * 1.6;
        col += vec3(0.945, 0.565, 0.142) * la;
        if (L > 0.55) col += vec3(1.0, 0.94, 0.745) * (L - 0.55) * 2.4;
        float z = 0.9; // approximated orthographic brightness
        col += vec3(0.188, 0.141, 0.078) * pow(1.0 - z, 2.2);
        col *= 0.62 + 0.42 * z;
        gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
      }`,
  });
}
function glowSprite(tex, scale, opacity, order) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  sp.scale.setScalar(scale);
  sp.renderOrder = order;
  return sp;
}
function stars() {
  const n = 70, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const rnd = mulberry(7);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rnd() - 0.5) * 12; pos[i * 3 + 1] = (rnd() - 0.5) * 16; pos[i * 3 + 2] = -2 - rnd() * 5;
    const gold = rnd() < 0.18, b = 0.25 + rnd() * 0.7;
    col[i * 3] = (gold ? 0.83 : 1) * b; col[i * 3 + 1] = 0.69 * b; col[i * 3 + 2] = (gold ? 0.22 : 1) * b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
    map: SOFT,
  }));
}

// Thread arcs: two tilted tori + two light nodes traveling each arc.
function threads() {
  const g = new THREE.Group();
  const nodes = [];
  const TILTS = [[0.5, 0.35], [-0.35, -0.55]];
  for (const [rx, rz] of TILTS) {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.006, 8, 128),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    torus.rotation.set(rx, 0, rz);
    g.add(torus);
    for (let k = 0; k < 2; k++) {
      const holder = new THREE.Group();
      holder.rotation.set(rx, 0, rz);
      const node = glowSprite(SOFT, 0.16, 0.85, 4);
      node.position.set(1.12, 0, 0);
      holder.add(node);
      g.add(holder);
      nodes.push({ holder, speed: (0.25 + Math.random() * 0.3) * (k ? 1 : -1), theta: Math.random() * 6.28 });
    }
  }
  return { group: g, nodes };
}

const cells = [];

(async () => {
  const [texNight, texDark] = await Promise.all([texNP, texDP]);
  for (const t of [texNight, texDark]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; }

  let userLon = 0;
  try {
    const res = await fetch('https://xmbwpelfltzobvqdpake.supabase.co/functions/v1/geoip', {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }, signal: AbortSignal.timeout(5000),
    });
    if (res.ok) { const j = await res.json(); const c = j.country || 'AE'; }
    // keep it simple: the lab just centers on the geoip country via a tiny map
  } catch { /* default */ }

  // minimal country→lon for centering (same anchors as the app)
  const ANCH = { US:-97, CA:-106, MX:-102, GB:-2, ES:-3, FR:2, DE:10, IT:12, PT:-8, AE:54, SA:45, JP:138,
    CN:105, IN:78, AU:133, BR:-55, AR:-64, ZA:24, NG:8, EG:30, KE:38, TR:35, RU:100, ID:118 };
  let country = 'XX';
  try {
    const res = await fetch('https://xmbwpelfltzobvqdpake.supabase.co/functions/v1/geoip', {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }, signal: AbortSignal.timeout(5000),
    });
    if (res.ok) country = (await res.json()).country || 'XX';
  } catch { /* default */ }
  userLon = ANCH[country] ?? 0;

  for (const kind of ['A', 'B']) {
    const scene = new THREE.Scene();
    scene.add(stars());
    const mat = planetMaterial();
    mat.uniforms.uNight.value = texNight;
    mat.uniforms.uDark.value = texDark;
    const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), mat);
    const world = new THREE.Group();
    world.add(planet);
    scene.add(world);
    scene.add(glowSprite(RINGT, 2.9, 0.8, 3));
    scene.add(glowSprite(SOFT, 2.35, 0.35, 3));
    const th = threads();
    scene.add(th.group);
    cells.push({ kind, scene, world, th, userLon });
    world.rotation.y = THREE.MathUtils.degToRad(-userLon - 90);
  }

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = (innerWidth / 2) / (innerHeight);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let running = true, last = performance.now();
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const w = innerWidth, hw = Math.floor(w / 2), hh = innerHeight;
    renderer.setScissorTest(true);
    cells.forEach((cell, i) => {
      if (cell.kind === 'A') {
        cell.world.rotation.y += dt * ((Math.PI * 2) / 45); // spinning (current)
        cell.th.group.rotation.y += dt * 0.35;
        for (const n of cell.th.nodes) { n.theta += n.speed * dt; n.holder.rotation.z = n.theta; }
      } else {
        // B: globe LOCKED centered on the user — the arcs do the moving.
        cell.th.group.rotation.y += dt * 0.55;
        for (const n of cell.th.nodes) { n.theta += n.speed * dt * 1.6; n.holder.rotation.z = n.theta; }
        // gentle precess on the far thread for life
        cell.th.group.rotation.x = 0.16 * Math.sin(now * 0.00021);
      }
      const x = i * hw;
      renderer.setViewport(x, 0, hw, hh);
      renderer.setScissor(x, 0, hw, hh);
      renderer.render(cell.scene, camera);
    });
    renderer.setScissorTest(false);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__cmp = { cells };
})();