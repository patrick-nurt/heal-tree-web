// The Heal In Tree — standalone WebGL web version.
// Scene parity with the Flutter app (shader_planet_scene.dart +
// shaders/planet_sphere.frag), rendered through three.js for a persistent GL
// context: no Flutter pipeline, no canvas re-upload — native GPU speed on
// mobile Safari/Chrome. Backend identical: Supabase REST RPCs + GeoIP.

import * as THREE from 'three';

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://xmbwpelfltzobvqdpake.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYndwZWxmbHR6b2J2cWRwYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTQ0MjQsImV4cCI6MjEwNzM5MDQyNH0.gvZyfnbvO1YnrLveeFIRJLxe5JcI_s2MQ-zAyKrVPoI';
const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// ─── i18n (from lib/l10n/*.arb) ──────────────────────────────────────────────
const STRINGS = {
  en: {
    actButton: 'ACT', receiveButton: 'RECEIVE',
    actsOfKindness: 'ACTS OF KINDNESS', global24h: '24 HOURS · GLOBAL',
    about: 'About', back: '← BACK', privacyPolicy: 'Privacy Policy',
    aboutTitle: 'The Heal In Tree',
    aboutBody: 'We are all connected by an invisible golden thread. This is a way to engage anonymously with a feel-good factor on both sides — to give kindness and to receive it, without conversation, without forms, without exposing who you are.',
    aboutDescription: 'Tap ACT to send a golden light pulse to someone, somewhere on the planet. Tap RECEIVE to accept kindness from a stranger.',
    noSignalsAvailable: 'No signals available right now',
    privacyYourPrivacy: 'Your Privacy',
    privacyLastUpdated: 'Last updated: October 2026',
    sections: [
      ['No Accounts', 'The Heal In Tree does not require you to create an account. There are no logins, no email addresses, no usernames, and no passwords.'],
      ['No Personal Data', 'We do not collect, store, or sell any personal information. The app does not ask for your name, email, location, or any identifying details.'],
      ['No Stored Messages', 'When you tap ACT, a signal is sent through our servers to someone else. When the signal is delivered, it is instantly and permanently deleted. No history of your interactions is kept.'],
      ['Anonymous Country Detection', 'To show the golden light trail on the world map, we detect your country from your IP address. This is done at the server level — no location permission is requested from your device. Your IP address is not stored.'],
      ['No Tracking', 'We do not use cookies, analytics, or tracking pixels. We do not track your usage, behavior, or interactions within the app.'],
      ['No Third-Party Sharing', 'We do not share any information with third parties. There is no information to share.'],
      ['Children', 'The app contains no content that is inappropriate for any age. There is no user-generated content, no communication between users, and no data collection.'],
    ],
  },
  es: {
    actButton: 'ACTUAR', receiveButton: 'RECIBIR',
    actsOfKindness: 'ACTOS DE BONDAD', global24h: '24 HORAS · GLOBAL',
    about: 'Acerca de', back: '← ATRÁS', privacyPolicy: 'Política de Privacidad',
    aboutTitle: 'The Heal In Tree',
    aboutBody: 'Todos estamos conectados por un hilo dorado invisible. Esta es una forma de interactuar anónimamente con un factor de bienestar en ambos lados — dar bondad y recibirla, sin conversación, sin formularios, sin exponer quién eres.',
    aboutDescription: 'Toca ACTUAR para enviar un pulso de luz dorada a alguien en algún lugar del planeta. Toca RECIBIR para aceptar la bondad de un desconocido.',
    noSignalsAvailable: 'No hay señales disponibles en este momento',
    privacyYourPrivacy: 'Tu Privacidad',
    privacyLastUpdated: 'Última actualización: Octubre 2026',
    sections: [
      ['Sin Cuentas', 'The Heal In Tree no requiere que crees una cuenta. No hay inicios de sesión, no hay correos electrónicos, no hay nombres de usuario y no hay contraseñas.'],
      ['Sin Datos Personales', 'No recopilamos, almacenamos ni vendemos ninguna información personal. La aplicación no solicita tu nombre, correo electrónico, ubicación ni ningún dato identificativo.'],
      ['Sin Mensajes Almacenados', 'Cuando tocas ACTUAR, una señal se envía a través de nuestros servidores a otra persona. Cuando la señal se entrega, se elimina instantánea y permanentemente. No se guarda ningún historial de tus interacciones.'],
      ['Detección Anónima de País', 'Para mostrar el hilo de luz dorada en el mapa mundial, detectamos tu país a partir de tu dirección IP. Esto se hace a nivel de servidor — no se solicita permiso de ubicación en tu dispositivo. Tu dirección IP no se almacena.'],
      ['Sin Rastreo', 'No usamos cookies, análisis ni píxeles de rastreo. No rastreamos tu uso, comportamiento ni interacciones dentro de la aplicación.'],
      ['Sin Compartir con Terceros', 'No compartimos ninguna información con terceros. No hay información que compartir.'],
      ['Niños', 'La aplicación no contiene contenido inapropiado para ninguna edad. No hay contenido generado por usuarios, no hay comunicación entre usuarios y no hay recopilación de datos.'],
    ],
  },
};
const L = (navigator.language || 'en').toLowerCase().startsWith('es') ? STRINGS.es : STRINGS.en;
document.querySelectorAll('[data-i18n]').forEach(el => { if (L[el.dataset.i18n]) el.textContent = L[el.dataset.i18n]; });
document.documentElement.lang = navigator.language.startsWith('es') ? 'es' : 'en';
document.getElementById('privacySections').innerHTML = L.sections
  .map(([h, b]) => `<h2>${h}</h2><p>${b}</p>`)
  .join('');

// ─── Geo tables (from planet_geo.dart + signal.dart) ─────────────────────────
const COUNTRY_ANCHORS = {
  US: [38, -97], CA: [56, -106], MX: [23, -102], GB: [54, -2], ES: [40, -3],
  FR: [46, 2], DE: [51, 10], IT: [42, 12], PT: [39, -8], AE: [24, 54],
  SA: [24, 45], JP: [36, 138], CN: [35, 105], IN: [21, 78], AU: [-25, 133],
  BR: [-10, -55], AR: [-34, -64], ZA: [-29, 24], NG: [9, 8], EG: [27, 30],
  KE: [0, 38], TR: [39, 35], RU: [61, 100], ID: [-2, 118], XX: [20, 0],
};
const CONTINENT_OF = {
  DZ:'africa',AO:'africa',BJ:'africa',BW:'africa',BF:'africa',BI:'africa',CM:'africa',CV:'africa',CF:'africa',TD:'africa',KM:'africa',CG:'africa',CD:'africa',CI:'africa',DJ:'africa',EG:'africa',GQ:'africa',ER:'africa',ET:'africa',GA:'africa',GM:'africa',GH:'africa',GN:'africa',GW:'africa',KE:'africa',LS:'africa',LR:'africa',LY:'africa',MG:'africa',MW:'africa',ML:'africa',MR:'africa',MU:'africa',MA:'africa',MZ:'africa',NA:'africa',NE:'africa',NG:'africa',RW:'africa',ST:'africa',SN:'africa',SC:'africa',SL:'africa',SO:'africa',ZA:'africa',SS:'africa',SD:'africa',SZ:'africa',TZ:'africa',TG:'africa',TN:'africa',UG:'africa',EH:'africa',ZM:'africa',ZW:'africa',
  AF:'asia',AM:'asia',AZ:'asia',BH:'asia',BD:'asia',BT:'asia',BN:'asia',KH:'asia',CN:'asia',CY:'asia',GE:'asia',IN:'asia',ID:'asia',IR:'asia',IQ:'asia',IL:'asia',JP:'asia',JO:'asia',KZ:'asia',KP:'asia',KR:'asia',KW:'asia',KG:'asia',LA:'asia',LB:'asia',MY:'asia',MV:'asia',MN:'asia',MM:'asia',NP:'asia',OM:'asia',PK:'asia',PS:'asia',PH:'asia',QA:'asia',SA:'asia',SG:'asia',LK:'asia',SY:'asia',TW:'asia',TJ:'asia',TH:'asia',TL:'asia',TR:'asia',TM:'asia',AE:'asia',UZ:'asia',VN:'asia',YE:'asia',
  AL:'europe',AD:'europe',AT:'europe',BY:'europe',BE:'europe',BA:'europe',BG:'europe',HR:'europe',CZ:'europe',DK:'europe',EE:'europe',FI:'europe',FR:'europe',DE:'europe',GR:'europe',HU:'europe',IS:'europe',IE:'europe',IT:'europe',XK:'europe',LV:'europe',LI:'europe',LT:'europe',LU:'europe',MT:'europe',MD:'europe',MC:'europe',ME:'europe',NL:'europe',MK:'europe',NO:'europe',PL:'europe',PT:'europe',RO:'europe',RU:'europe',SM:'europe',RS:'europe',SK:'europe',SI:'europe',ES:'europe',SE:'europe',CH:'europe',UA:'europe',GB:'europe',VA:'europe',
  US:'northAmerica',CA:'northAmerica',MX:'northAmerica',GT:'northAmerica',BZ:'northAmerica',SV:'northAmerica',HN:'northAmerica',NI:'northAmerica',CR:'northAmerica',PA:'northAmerica',CU:'northAmerica',DO:'northAmerica',HT:'northAmerica',JM:'northAmerica',BS:'northAmerica',BB:'northAmerica',TT:'northAmerica',GL:'northAmerica',
  AR:'southAmerica',BO:'southAmerica',BR:'southAmerica',CL:'southAmerica',CO:'southAmerica',EC:'southAmerica',GY:'southAmerica',PY:'southAmerica',PE:'southAmerica',SR:'southAmerica',UY:'southAmerica',VE:'southAmerica',
  AU:'oceania',NZ:'oceania',FJ:'oceania',PG:'oceania',SB:'oceania',VU:'oceania',WS:'oceania',TO:'oceania',KI:'oceania',MH:'oceania',FM:'oceania',PW:'oceania',NR:'oceania',TV:'oceania',CK:'oceania',NU:'oceania',
};
const FORESTS = {
  northAmerica: [48, -100], southAmerica: [-15, -60], europe: [50, 20],
  africa: [5, 20], asia: [35, 100], oceania: [-25, 135],
};
const GOLD = 0xd4af37, GOLD_LIGHT = 0xf0e6c8;
const continentOf = (c) => CONTINENT_OF[(c || 'XX').toUpperCase()] || 'europe';
const anchorOf = (c) => COUNTRY_ANCHORS[(c || 'XX').toUpperCase()] || COUNTRY_ANCHORS.XX;

// lat/lon (deg) → three.js position. Matches SphereGeometry UV layout so the
// equirectangular texture and beam anchors agree (u=0 ↔ lon −180).
function latLonToVec3(lat, lon, r = 1) {
  const phi = ((lon + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.cos(phi) * Math.sin(theta),
    r * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

// ─── Renderer / scene ────────────────────────────────────────────────────────
const canvas = document.getElementById('scene');
const webgl2 = (() => { try { return !!canvas.getContext('webgl2'); } catch { return false; } })();
if (!webgl2) {
  document.getElementById('fallback').style.display = 'flex';
  document.getElementById('fallback').textContent =
    'The Heal In Tree needs WebGL2. Please update your browser to see the golden earth.';
  throw new Error('no webgl2');
}

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: (window.devicePixelRatio || 1) < 1.5,
  powerPreference: 'high-performance',
});
renderer.setClearColor(0x0a0a0a, 1);
const DPR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);

const scene = new THREE.Scene();
const world = new THREE.Group();          // planet + beams + atmosphere
scene.add(world);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
camera.position.set(0, 0, 6.8);

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');
const texNightP = loader.loadAsync('assets/earth_night.jpg');
const texDarkP = loader.loadAsync('assets/earth_dark.jpg');

// Sphere — the gold grade is a direct port of planet_sphere.frag.
const sphereMat = new THREE.ShaderMaterial({
  uniforms: { uNight: { value: null }, uDark: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      vUv = uv;
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
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
      float la = pow(L, 1.5) * 2.0;
      col += vec3(0.945, 0.565, 0.142) * la;
      if (L > 0.55) col += vec3(1.0, 0.94, 0.745) * (L - 0.55) * 2.4;
      float z = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
      col += vec3(0.188, 0.141, 0.078) * pow(1.0 - z, 2.2);
      col *= 0.62 + 0.42 * z;
      col += vec3(1.0, 0.745, 0.372) * pow(1.0 - z, 4.5) * 1.15;
      gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
    }`,
});
const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), sphereMat);
world.add(planet);

// Atmosphere bloom — canvas radial gradient sprite, additive. Ring profile:
// transparent over the disc (the sphere supplies its own light), peaking at
// the limb, falling off outward — otherwise the sprite fogs the whole planet.
const atmo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.00, 'rgba(255,180,80,0)');
    grad.addColorStop(0.48, 'rgba(255,180,80,0)');
    grad.addColorStop(0.56, 'rgba(255,180,80,0.34)');
    grad.addColorStop(0.66, 'rgba(230,140,50,0.13)');
    grad.addColorStop(1.00, 'rgba(230,140,50,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })(),
  blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
}));
atmo.scale.setScalar(2.9);
atmo.renderOrder = -1;
world.add(atmo);

// Inner haze — parity with GlowPainter g1: additive glow over the disc,
// brightest at center, fading past the limb.
const haze = new THREE.Sprite(new THREE.SpriteMaterial({
  map: (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.00, 'rgba(255,180,80,0.30)');
    grad.addColorStop(0.60, 'rgba(255,180,80,0.16)');
    grad.addColorStop(0.78, 'rgba(230,140,50,0.05)');
    grad.addColorStop(1.00, 'rgba(230,140,50,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })(),
  blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
}));
haze.scale.setScalar(2.35);
haze.renderOrder = -1; // transparent pass: after planet, before beams
world.add(haze);

// The Golden Thread — the brief's unbroken filament circling the earth;
// sweeps independently of the globe's spin.
const threads = new THREE.Group();
for (const [rx, rz] of [[0.5, 0.35], [-0.35, -0.55]]) {
  const t = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.006, 8, 128),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  t.rotation.set(rx, 0, rz);
  threads.add(t);
}
scene.add(threads);

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner); grad.addColorStop(0.55, outer); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Stars — static (170, parity with StarfieldPainter).
{
  const n = 170, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const rnd = mulberry(7);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rnd() - 0.5) * 14; pos[i * 3 + 1] = (rnd() - 0.5) * 24; pos[i * 3 + 2] = -2 - rnd() * 6;
    const gold = rnd() < 0.18, b = 0.25 + rnd() * 0.75;
    col[i * 3] = (gold ? 0.83 : 1) * b; col[i * 3 + 1] = 0.69 * b; col[i * 3 + 2] = (gold ? 0.22 : 1) * b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.035, vertexColors: true, transparent: true, opacity: 0.9,
    depthWrite: false, map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,.4)'),
  })));
}
// Floating gold specks (20, parity with ParticlePainter).
const specks = { n: 20, pts: [], points: null };
{
  const pos = new Float32Array(specks.n * 3);
  const rnd = mulberry(11);
  for (let i = 0; i < specks.n; i++) {
    specks.pts.push({ x: (rnd() - 0.5) * 6, y: (rnd() - 0.5) * 9, v: 0.05 + rnd() * 0.12, s: 0.4 + rnd() * 0.6 });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  specks.points = new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.05, color: GOLD, transparent: true, opacity: 0.55,
    depthWrite: false, map: glowTexture('rgba(255,220,140,1)', 'rgba(212,175,55,.5)'),
    blending: THREE.AdditiveBlending,
  }));
  scene.add(specks.points);
}
function mulberry(seed) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ─── Beams ───────────────────────────────────────────────────────────────────
// Geo-anchored: endpoints are re-projected every frame so beams ride the
// rotation, always visible (far side clamps to the limb). Origin blooms in,
// destination blooms as the pulse arrives, ring burst on landing.
const beams = [];
const bursts = [];
const pulseTex = glowTexture('rgba(255,240,200,1)', 'rgba(212,175,55,.6)');
const ringTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,225,150,1)'; g.lineWidth = 6;
  g.shadowColor = 'rgba(255,200,100,1)'; g.shadowBlur = 10;
  g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const BEAM_SEGS = 44;
const BEAM_MS = 1800;
// Endpoint markers are rings (not blobs): soft donut with a bright rim.
const ringSoftTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.00, 'rgba(255,225,150,0)');
  grad.addColorStop(0.58, 'rgba(255,225,150,0)');
  grad.addColorStop(0.72, 'rgba(255,225,150,0.85)');
  grad.addColorStop(0.82, 'rgba(212,175,55,0.30)');
  grad.addColorStop(1.00, 'rgba(212,175,55,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

function beamStrip(color, width, brightness) {
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
  const c = new THREE.Color(color);
  for (let s = 0; s <= BEAM_SEGS; s++) {
    const br = brightness(s / BEAM_SEGS);
    for (const o of [s * 6, s * 6 + 3]) {
      col[o] = c.r * br; col[o + 1] = c.g * br; col[o + 2] = c.b * br;
    }
  }
  const m = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return mesh;
}

function glowSprite(map, color, opacity) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  sp.renderOrder = 6;
  return sp;
}

function fireBeam(from, to, { receive = false } = {}) {
  const color = receive ? GOLD_LIGHT : GOLD;
  const group = new THREE.Group();
  // Layered soft glow: wide faint → mid → bright hairline core. No hard edges.
  const widths = [() => 0.016, () => 0.009, () => 0.004];
  const strips = [
    beamStrip(color, widths[0], () => 0.14),
    beamStrip(color, widths[1], () => 0.40),
    beamStrip(color, widths[2], () => 1.0),
  ];
  for (const [i, st] of strips.entries()) st.geometry.userData.w = widths[i];
  const head = glowSprite(pulseTex, color, 1);
  const origin = glowSprite(ringSoftTex, color, 0);
  const dest = glowSprite(ringSoftTex, color, 0);
  // Spark stream flowing through the beam — the "energy" carriers.
  const N = 9;
  const spos = new Float32Array(N * 3);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(spos, 3).setUsage(THREE.DynamicDrawUsage));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({
    size: 0.055, map: pulseTex, color: GOLD_LIGHT, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  sparks.frustumCulled = false;
  sparks.renderOrder = 6;
  group.add(...strips, head, origin, dest, sparks);
  scene.add(group);
  beams.push({
    from, to, group, strips, head, origin, dest, sparks,
    offsets: Array.from({ length: N }, () => Math.random()),
    receive, color, start: performance.now(), durationMs: BEAM_MS,
  });
}

// Orthographic projection with limb clamp (Flutter PlanetProjection parity):
// far-side points ride the limb silhouette instead of disappearing.
function projectGeo(lat, lon, centerLon, r = 1.005) {
  const lam = (lon - centerLon) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const x = Math.cos(phi) * Math.sin(lam);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(lam);
  let px = x, py = y;
  if (z <= 0.10) {
    const m = Math.hypot(x, y);
    if (m < 1e-6) { px = 0; py = 0.97; } else { px = x / m * 0.97; py = y / m * 0.97; }
  }
  return { x: px * r, y: py * r };
}
function geoUnit(lat, lon) {
  const lam = lon * Math.PI / 180, phi = lat * Math.PI / 180;
  return new THREE.Vector3(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam));
}
function setStrip(attr, i6, x, y, nx, ny, w) {
  attr.array[i6 + 0] = x + nx * w; attr.array[i6 + 1] = y + ny * w; attr.array[i6 + 2] = 0.05;
  attr.array[i6 + 3] = x - nx * w; attr.array[i6 + 4] = y - ny * w; attr.array[i6 + 5] = 0.05;
}
function beamPoints(b, centerLon) {
  const a = projectGeo(b.from[0], b.from[1], centerLon);
  const c = projectGeo(b.to[0], b.to[1], centerLon);
  const lift = 1 + 0.16 + geoUnit(b.from[0], b.from[1]).angleTo(geoUnit(b.to[0], b.to[1])) * 0.09;
  const mid = new THREE.Vector2((a.x + c.x) / 2, (a.y + c.y) / 2);
  if (mid.length() < 1e-4) mid.set(0, lift); else mid.multiplyScalar(lift);
  const pts = [];
  for (let s = 0; s <= BEAM_SEGS; s++) {
    const t = s / BEAM_SEGS, inv = 1 - t;
    pts.push(new THREE.Vector2(
      inv * inv * a.x + 2 * inv * t * mid.x + t * t * c.x,
      inv * inv * a.y + 2 * inv * t * mid.y + t * t * c.y,
    ));
  }
  return { pts, a, c };
}

function updateBeams(now) {
  // Beams ride the live rotation: facing longitude derives from the globe.
  const centerLon = -(world.rotation.y * 180 / Math.PI + 90);
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    const p = Math.min((now - b.start) / b.durationMs, 1);
    const env = Math.min(p / 0.06, 1) * (p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1);
    const { pts, a, c } = beamPoints(b, centerLon);

    // Traveling energy wave: two layered sines flowing along the beam,
    // zero amplitude at both endpoints so the rings stay exact.
    const wob = (s) => {
      const k = Math.sin(Math.PI * s / BEAM_SEGS);
      const ph = s * 0.24 - now * 0.010;
      return k * 0.009 * (Math.sin(ph) + 0.35 * Math.sin(ph * 2.1 + 1.3));
    };

    for (const [si, strip] of b.strips.entries()) {
      const pos = strip.geometry.attributes.position;
      for (let s = 0; s <= BEAM_SEGS; s++) {
        const prev = pts[Math.max(s - 1, 0)], next = pts[Math.min(s + 1, BEAM_SEGS)];
        const dx = next.x - prev.x, dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1e-4;
        const nx = -dy / len, ny = dx / len;
        const t = s / BEAM_SEGS;
        const off = wob(s);
        // Rounded caps: full width through the middle, tapering to a point
        // over the first/last 12% so the beam never meets the rings squared.
        const cap = Math.pow(Math.sin(Math.PI * t), 0.7);
        const w0 = strip.geometry.userData.w ? strip.geometry.userData.w : 0;
        const w = (typeof w0 === "function" ? w0(t) : w0) * cap;
        setStrip(pos, s * 6, pts[s].x + nx * off, pts[s].y + ny * off, nx, ny, w);
      }
      pos.needsUpdate = true;
      strip.material.opacity = env;
    }

    // Head rides the arc.
    b.head.position.set(pts[Math.round(p * BEAM_SEGS)].x, pts[Math.round(p * BEAM_SEGS)].y, 0.06);
    b.head.scale.setScalar(Math.max(0.11 * env, 0.0001));
    b.head.material.opacity = env;

    // Origin bloom: swells in during launch, rides its anchor, fades last.
    b.origin.position.set(a.x, a.y, 0.055);
    const oIn = Math.min(p / 0.10, 1);
    b.origin.scale.setScalar(Math.max(0.07 + 0.20 * oIn, 0.0001));
    b.origin.material.opacity = (0.55 + 0.25 * oIn) * env;

    // Destination bloom: grows as the pulse approaches, holds while lit.
    b.dest.position.set(c.x, c.y, 0.055);
    const dIn = Math.min(Math.max((p - 0.70) / 0.25, 0), 1);
    b.dest.scale.setScalar(Math.max(0.05 + 0.34 * dIn, 0.0001));
    b.dest.material.opacity = dIn * env;

    // Sparks flow through the beam faster than the head — energy current.
    const sp = b.sparks.geometry.attributes.position;
    const flow = (now - b.start) / 650;
    for (let k = 0; k < b.offsets.length; k++) {
      const t = (b.offsets[k] + flow) % 1;
      const s = t * BEAM_SEGS, s0 = Math.floor(s), fr = s - s0;
      const p0 = pts[Math.min(s0, BEAM_SEGS)], p1 = pts[Math.min(s0 + 1, BEAM_SEGS)];
      sp.setXYZ(k, p0.x + (p1.x - p0.x) * fr, p0.y + (p1.y - p0.y) * fr, 0.055);
    }
    sp.needsUpdate = true;
    b.sparks.material.opacity = 0.85 * env;

    if (p >= 1) {
      // Arrival ring burst at the destination.
      const ring = new THREE.Sprite(new THREE.SpriteMaterial({
        map: ringTex, color: b.color, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0.9,
      }));
      ring.position.set(c.x, c.y, 0.06);
      ring.renderOrder = 7;
      scene.add(ring);
      bursts.push({ ring, start: now });
      scene.remove(b.group);
      for (const st of b.strips) { st.geometry.dispose(); st.material.dispose(); }
      b.sparks.geometry.dispose(); b.sparks.material.dispose();
      for (const k of ["head", "origin", "dest"]) b[k].material.dispose();
      beams.splice(i, 1);
    }
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const bu = bursts[i];
    const t = Math.min((now - bu.start) / 550, 1);
    bu.ring.scale.setScalar(0.06 + t * 0.40);
    bu.ring.material.opacity = 0.9 * (1 - t);
    if (t >= 1) { scene.remove(bu.ring); bu.ring.material.dispose(); bursts.splice(i, 1); }
  }
}

// ─── Interaction / backend ───────────────────────────────────────────────────
const $count = document.getElementById('count');
const $toast = document.getElementById('toast');
let userCountry = 'XX';
let count = 0;

async function api(path, body) {
  const res = await fetch(`${REST}${path}`, {
    method: 'POST', headers: HEADERS, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const text = await res.text();
  return text && text !== 'null' ? JSON.parse(text) : null;
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 2600);
}
const vibrate = (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* unsupported */ } };

async function detectCountry() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/geoip`, {
      headers: HEADERS, signal: AbortSignal.timeout(5000),
    });
    if (res.ok) userCountry = (await res.json()).country || 'XX';
  } catch { userCountry = 'XX'; }
}

async function pollCounter() {
  try {
    const res = await fetch(`${REST}/counter?id=eq.global&select=count`, { headers: HEADERS });
    if (res.ok) count = (await res.json())[0]?.count ?? count;
    $count.textContent = count;
  } catch { /* offline: keep last value */ }
}

let DEMO_STYLE = null;

async function onAct() {
  vibrate([400, 400, 200, 400, 400]); // ≈2s firm triple-pulse — brief parity (§4)
  const continent = continentOf(userCountry);
  fireBeam(anchorOf(userCountry), FORESTS[continent]);
  count += 1; $count.textContent = count; // optimistic; poll corrects
  try { await api('/rpc/create_signal', { p_sender_country: userCountry, p_continent: continent }); }
  catch { /* offline: visual only */ }
}

async function onReceive() {
  let signal = null;
  try { signal = await api('/rpc/receive_signal', { p_receiver_country: userCountry, p_continent: continentOf(userCountry) }); }
  catch { /* offline */ }
  if (signal) {
    vibrate([30, 60, 30, 50, 30, 40, 40, 60, 30]);
    fireBeam(FORESTS[signal.continent] ?? FORESTS[continentOf(userCountry)], anchorOf(userCountry), { receive: true });
  } else {
    vibrate(20);
    showToast(L.noSignalsAvailable);
  }
}

document.getElementById('act').addEventListener('click', onAct);
document.getElementById('receive').addEventListener('click', onReceive);

// Sheets
const aboutSheet = document.getElementById('aboutSheet');
const privacySheet = document.getElementById('privacySheet');
document.getElementById('info').addEventListener('click', () => aboutSheet.classList.add('open'));
document.getElementById('openPrivacy').addEventListener('click', () => privacySheet.classList.add('open'));
aboutSheet.querySelector('.back').addEventListener('click', () => aboutSheet.classList.remove('open'));
privacySheet.querySelector('.back').addEventListener('click', () => privacySheet.classList.remove('open'));


// ─── Frame loop ──────────────────────────────────────────────────────────────
let last = performance.now();
const ROT_SPEED = (Math.PI * 2) / 45; // 45 s / revolution — livelier

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Planet radius as a fraction of the smaller dimension: portrait 78%
  // (fits the HUD); landscape 60% — desktop windows are height-limited and
  // the globe otherwise dwarfs the counter and buttons.
  const frac = w <= h ? 0.78 : 0.60;
  const halfPx = Math.min(w, h) / 2;
  camera.fov = THREE.MathUtils.radToDeg(
    2 * Math.atan((h / 2) / (camera.position.z * frac * halfPx)),
  );
  camera.fov = Math.min(camera.fov, 60);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let running = true;
document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) { last = performance.now(); requestAnimationFrame(frame); }
});

function frame(now) {
  if (!running) return;
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  // Rotation: starts centered on the user's longitude, 90 s / revolution.
  world.rotation.y += ROT_SPEED * dt;
  atmo.material.rotation = 0;

  // Particle drift.
  const pos = specks.points.geometry.attributes.position;
  for (let i = 0; i < specks.n; i++) {
    const p = specks.pts[i];
    p.y += p.v * dt;
    if (p.y > 4.5) p.y = -4.5;
    pos.setXYZ(i, p.x, p.y, -1.5);
  }
  pos.needsUpdate = true;

  updateBeams(now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ─── Boot ────────────────────────────────────────────────────────────────────
(async () => {
  // Block rendering until textures are in — the first frame is otherwise
  // flat amber (null samplers).
  const [texNight, texDark] = await Promise.all([texNightP, texDarkP]);
  for (const t of [texNight, texDark]) {
    // NoColorSpace: sample the authored sRGB values raw — the grade math was
    // tuned in Flutter's FragmentProgram, which does no color management.
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  }
  sphereMat.uniforms.uNight.value = texNight;
  sphereMat.uniforms.uDark.value = texDark;

  await detectCountry();
  // Center the user's longitude at t=0 (parity with uLon0): facing point has
  // effective angle φ+α = 90°, φ = (lon+180)° → α = -lon - 90.
  const [, lon] = anchorOf(userCountry);
  world.rotation.y = THREE.MathUtils.degToRad(-lon - 90);
  pollCounter();
  setInterval(pollCounter, 3000);
  requestAnimationFrame(frame);
  const l = document.getElementById('loading'); if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 600); }
  window.__dbg = { camera, renderer, scene, world, planet, latLonToVec3, anchorOf };
})();
