// Planet Compare — four motion directions, beams firing live in each.
// A SPINNING (current): globe rotates.
// B HOLD STEADY: globe locked on user; threads precess.
// C SPIN + ARCS: globe rotates; threads sweep the opposite way (dual motion).
// D STILL + PULSE: static globe; threads breathe/pulse; all focus on beams.
import * as THREE from './three.module.min.js';

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYndwZWxmbHR6b2J2cWRwYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTQ0MjQsImV4cCI6MjEwNzM5MDQyNH0.gvZyfnbvO1YnrLveeFIRJLxe5JcI_s2MQ-zAyKrVPoI';
const GOLD = 0xd4af37, GOLD_LIGHT = 0xf0e6c8;
const REST = 'https://xmbwpelfltzobvqdpake.supabase.co/rest/v1';
const HEADERS = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };

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
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

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
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
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
        float z = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        col += vec3(0.188, 0.141, 0.078) * pow(1.0 - z, 2.2);
        col *= 0.62 + 0.42 * z;
        col += vec3(1.0, 0.745, 0.372) * pow(1.0 - z, 4.5) * 1.15;
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
  const n = 60, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
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
    size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, map: SOFT,
  }));
}
function threads() {
  const g = new THREE.Group();
  const nodes = [];
  for (const [rx, rz] of [[0.42, 0.30], [-0.30, -0.48]]) {
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

// ─── Beams (simplified for the lab — same visual language) ───────────────────
const BEAM_SEGS = 36, BEAM_MS = 1800;
function makeBeamSys(scene, worldRef) {
  const beams = [];
  const bursts = [];
  function beamStrip(color, w0, b0, order) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array((BEAM_SEGS + 1) * 2 * 3);
    const col = new Float32Array((BEAM_SEGS + 1) * 2 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const idx = [];
    for (let i = 0; i < BEAM_SEGS; i++) {
      const a = i * 2, b = i * 2 + 1;
      idx.push(a, b, a + 2, b, b + 2, a + 2);
    }
    g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    mesh.userData = { w0, b0 };
    return mesh;
  }
  function fireBeam(from, to, colorNow) {
    const color = colorNow ?? GOLD;
    const group = new THREE.Group();
    const mid = beamStrip(color, 0.018, 0.40, 5);
    const core = beamStrip(color, 0.004, 1.0, 5);
    const head = (() => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
      sp.renderOrder = 6; return sp;
    })();
    group.add(mid, core, head);
    scene.add(group);
    beams.push({ from, to, group, mid, core, head, start: performance.now(), rotRef: worldRef });
  }
  function projectGeo(lat, lon, centerLon, r = 1.005) {
    const lam = (lon - centerLon) * Math.PI / 180;
    const phi = lat * Math.PI / 180;
    return { x: Math.cos(phi) * Math.sin(lam) * r, y: Math.sin(phi) * r };
  }
  function geoUnit(lat, lon) {
    const lam = lon * Math.PI / 180, phi = lat * Math.PI / 180;
    return new THREE.Vector3(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam));
  }
  function setStrip(attr, i6, x, y, nx, ny, w) {
    attr.array[i6 + 0] = x + nx * w; attr.array[i6 + 1] = y + ny * w; attr.array[i6 + 2] = 0.05;
    attr.array[i6 + 3] = x - nx * w; attr.array[i6 + 4] = y - ny * w; attr.array[i6 + 5] = 0.05;
  }
  function update(now, centerLon) {
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      const p = Math.min((now - b.start) / BEAM_MS, 1);
      const env = Math.min(p / 0.06, 1) * (p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1);
      const u0 = geoUnit(b.from[0], b.from[1]);
      const u1 = geoUnit(b.to[0], b.to[1]);
      const a = projectGeo(b.from[0], b.from[1], centerLon);
      const c = projectGeo(b.to[0], b.to[1], centerLon);
      const lift = 1 + 0.16 + u0.angleTo(u1) * 0.09;
      const mid = new THREE.Vector2((a.x + c.x) / 2, (a.y + c.y) / 2);
      if (mid.length() < 1e-4) mid.set(0, lift); else mid.multiplyScalar(lift);
      const omega = u0.angleTo(u1), so = Math.sin(omega);
      const tmp = new THREE.Vector3();
      const pts = [], br = [];
      for (let s = 0; s <= BEAM_SEGS; s++) {
        const t = s / BEAM_SEGS, inv = 1 - t;
        pts.push(new THREE.Vector2(
          inv * inv * a.x + 2 * inv * t * mid.x + t * t * c.x,
          inv * inv * a.y + 2 * inv * t * mid.y + t * t * c.y,
        ));
        // exact great-circle slerp, rotated by the panel's CURRENT globe rotation
        let v;
        if (so < 1e-4) v = tmp.copy(u0).lerp(u1, t);
        else v = tmp.copy(u0).multiplyScalar(Math.sin((1 - t) * omega) / so)
          .addScaledVector(u1, Math.sin(t * omega) / so);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), b.rotRef.rotation.y);
        const z = v.z;
        const k = Math.max(0, Math.min(1, (z + 0.15) / 0.45));
        br.push(k);
      }
      const base = new THREE.Color(GOLD);
      for (const strip of [b.mid, b.core]) {
        const pos = strip.geometry.attributes.position;
        const col = strip.geometry.attributes.color;
        for (let s = 0; s <= BEAM_SEGS; s++) {
          const t = s / BEAM_SEGS;
          const prev = pts[Math.max(s - 1, 0)], next = pts[Math.min(s + 1, BEAM_SEGS)];
          const dx = next.x - prev.x, dy = next.y - prev.y;
          const len = Math.hypot(dx, dy) || 1e-4;
          const nx = -dy / len, ny = dx / len;
          const cap = Math.pow(Math.sin(Math.PI * t), 0.7);
          const vis = sstep(0.3, 0.55, br[s]);
          setStrip(pos, s * 6, pts[s].x, pts[s].y, nx, ny, strip.userData.w0 * cap * vis);
          for (const o of [s * 6, s * 6 + 3]) {
            col.array[o] = base.r * strip.userData.b0; col.array[o + 1] = base.g * strip.userData.b0; col.array[o + 2] = base.b * strip.userData.b0;
          }
        }
        pos.needsUpdate = true;
        col.needsUpdate = true;
        strip.material.opacity = env;
      }
      const hi = Math.round(p * BEAM_SEGS);
      b.head.position.set(pts[hi].x, pts[hi].y, 0.06);
      b.head.material.opacity = env * (0.08 + 0.92 * br[hi]);
      if (p >= 1) {
        scene.remove(b.group);
        for (const st of [b.mid, b.core]) { st.geometry.dispose(); st.material.dispose(); }
        b.head.material.dispose();
        beams.splice(i, 1);
      }
    }
  }
  return { fireBeam, update, beams };
}

const ANCH = { US:[38,-97], CA:[56,-106], MX:[23,-102], GB:[54,-2], ES:[40,-3], FR:[46,2], DE:[51,10],
  IT:[42,12], PT:[39,-8], AE:[24,54], SA:[24,45], JP:[36,138], CN:[35,105], IN:[21,78], AU:[-25,133],
  BR:[-10,-55], AR:[-34,-64], ZA:[-29,24], NG:[9,8], EG:[27,30], KE:[0,38], TR:[39,35], RU:[61,100], ID:[-2,118] };

const cells = [];
(async () => {
  const [texNight, texDark] = await Promise.all([texNP, texDP]);
  for (const t of [texNight, texDark]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; }

  let country = 'XX';
  try {
    const res = await fetch('https://xmbwpelfltzobvqdpake.supabase.co/functions/v1/geoip', {
      headers: HEADERS, signal: AbortSignal.timeout(5000),
    });
    if (res.ok) country = (await res.json()).country || 'XX';
  } catch { /* default */ }
  const userLat = country === 'XX' ? 20 : (ANCH[country] ? ANCH[country] - ANCH[country] + 20 : 20);
  const userLon = ANCH[country] ?? 0;
  void userLat;

  for (const kind of ['A', 'B', 'C', 'D']) {
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
    const beamSys = makeBeamSys(scene, world);
    world.rotation.y = THREE.MathUtils.degToRad(-userLon - 90);
    cells.push({ kind, scene, world, th, beamSys, baseRotY: world.rotation.y });
  }

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = (innerWidth / 2) / (innerHeight / 2);
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
    const w = innerWidth, h = innerHeight, hw = Math.floor(w / 2), hh = Math.floor(h / 2);
    renderer.setScissorTest(true);
    cells.forEach((cell, i) => {
      // Motion per variant (thread group: yaw drift only; tilt FIXED at build)
      if (cell.kind === 'A') cell.world.rotation.y += dt * (Math.PI * 2) / 45;
      if (cell.kind === 'C') cell.world.rotation.y += dt * (Math.PI * 2) / 60;
      if (cell.kind === 'B') cell.th.group.rotation.y += dt * 0.30;
      if (cell.kind === 'D') cell.th.group.rotation.y += dt * 0.12;
      if (cell.kind === 'A') cell.th.group.rotation.y += dt * 0.20;
      if (cell.kind === 'C') cell.th.group.rotation.y += dt * -0.45;
      if (cell.kind === 'B' || cell.kind === 'D') {
        cell.th.group.rotation.x = 0.06 * Math.sin(now * 0.00021); // faint sway only
      }
      for (const n of cell.th.nodes) {
        n.theta += n.speed * dt * (cell.kind === 'B' || cell.kind === 'D' ? 1.3 : 1);
        n.holder.rotation.z = n.theta;
      }

      const centerLon = -(cell.world.rotation.y * 180 / Math.PI + 90);
      cell.beamSys.update(now, centerLon);

      // auto-fire: beam every ~4s per panel, riding that panel's rotation
      if (now - (cell.lastFire || 0) > 4000) {
        cell.lastFire = now;
        const keys = Object.keys(ANCH);
        const a = keys[Math.floor(Math.random() * keys.length)];
        let b = keys[Math.floor(Math.random() * keys.length)];
        if (b === a) b = keys[(keys.indexOf(a) + 3) % keys.length];
        cell.beamSys.fireBeam(ANCH[a], ANCH[b], GOLD, cell.world.rotation.y, cell.world);
      }

      const x = (i % 2) * hw, y = i < 2 ? hh : 0;
      renderer.setViewport(x, y, hw, hh);
      renderer.setScissor(x, y, hw, hh);
      renderer.render(cell.scene, camera);
    });
    renderer.setScissorTest(false);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__cmp = { cells };
})();