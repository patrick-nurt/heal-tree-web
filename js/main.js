// The Heal In Tree — standalone WebGL web version.
// Scene parity with the Flutter app (shader_planet_scene.dart +
// shaders/planet_sphere.frag), rendered through three.js for a persistent GL
// context: no Flutter pipeline, no canvas re-upload — native GPU speed on
// mobile Safari/Chrome. Backend identical: Supabase REST RPCs + GeoIP.

import * as THREE from './three.module.min.js';

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
    actButton: 'GIVE', receiveButton: 'RECEIVE',
    actsOfKindness: 'ACTS OF KINDNESS', global24h: 'IN THE LAST 24 HOURS · WORLDWIDE',
    explainLine: 'GIVE sends light to a stranger. RECEIVE brings one to you.',
    rotatePrompt: 'The Heal In Tree is made for portrait. Turn your phone upright to continue.',
    aboutTitle: 'The Heal-In Tree',
    aboutLead: [
      'We are all connected by an invisible golden thread.',
      'Heal In Tree is a place to engage anonymously with kindness, offering a feel-good experience on both sides. A simple way to give kindness and receive it, without conversation, without forms and without revealing who you are.',
    ],
    howTitle: 'How It Works',
    howSteps: [
      { t: 'GIVE', p: [
        'Tap GIVE to send a golden light across the globe to a random stranger, somewhere in the world. No identity is revealed and no message is attached.',
        'If you wish, take a moment before sending to set an intention of kindness. Let your golden light carry that intention into the world.',
      ] },
      { t: 'RECEIVE', p: [
        'Tap RECEIVE to accept a golden light from somewhere in the world. The globe gives an approximate indication of where it originated.',
        'Both actions offer a gentle pulse beneath your finger, creating a moment to feel the exchange of kindness.',
      ] },
      { t: 'The Digital Forest', p: [
        'Our digital forest is a living symbol of collective kindness. Every golden light sent adds to its meaning, representing the kindness that is always present in our world.',
      ] },
      { t: 'The Global Counter', p: [
        'The number above the globe counts the golden lights sent across the world in the last 24 hours. Everyone sees the same number, a shared reflection of kindness in motion.',
      ] },
      { t: 'Nothing Is Personal', p: [
        'No accounts, no conversations, no identities and no personal profiles. Every interaction is anonymous. No personal connection is required, and no message is attached.',
        'Kindness can be shared without needing to know who gives it or who receives it.',
      ] },
    ],
    closing: ['One person. One act. One ripple at a time.', 'We Are Mankind.'],
    about: 'About', back: '← BACK', privacyPolicy: 'Privacy Policy',
    noSignalsAvailable: 'No signals available right now',
    privacyYourPrivacy: 'Your Privacy',
    privacyLastUpdated: 'Last updated: October 2026',
    sections: [
      ['No Accounts', 'The Heal In Tree does not require you to create an account. There are no logins, no email addresses, no usernames, and no passwords.'],
      ['No Personal Data', 'We do not collect, store, or sell any personal information. The app does not ask for your name, email, location, or any identifying details.'],
      ['No Stored Messages', 'When you tap GIVE, a signal is sent through our servers to someone else. When the signal is delivered, it is instantly and permanently deleted. No history of your interactions is kept.'],
      ['Anonymous Country Detection', 'To show the golden light trail on the world map, we detect your country from your IP address. This is done at the server level — no location permission is requested from your device. Your IP address is not stored.'],
      ['No Tracking', 'We do not use cookies, analytics, or tracking pixels. We do not track your usage, behavior, or interactions within the app.'],
      ['No Third-Party Sharing', 'We do not share any information with third parties. There is no information to share.'],
      ['Children', 'The app contains no content that is inappropriate for any age. There is no user-generated content, no communication between users, and no data collection.'],
    ],
  },
  es: {
    actButton: 'DAR', receiveButton: 'RECIBIR',
    actsOfKindness: 'ACTOS DE BONDAD', global24h: 'EN LAS ÚLTIMAS 24 HORAS · TODO EL MUNDO',
    explainLine: 'DAR envía luz a un desconocido. RECIBIR te trae una a ti.',
    rotatePrompt: 'The Heal In Tree está hecha para vertical. Gira tu teléfono para continuar.',
    aboutTitle: 'The Heal-In Tree',
    aboutLead: [
      'Todos estamos conectados por un hilo dorado invisible.',
      'Heal In Tree es un lugar para relacionarte anónimamente con la bondad, ofreciendo una experiencia de bienestar en ambos lados. Una forma sencilla de dar bondad y recibirla, sin conversación, sin formularios y sin revelar quién eres.',
    ],
    howTitle: 'Cómo Funciona',
    howSteps: [
      { t: 'DAR', p: [
        'Toca DAR para enviar una luz dorada a través del planeta a un desconocido al azar, en algún lugar del mundo. No se revela ninguna identidad y no va ningún mensaje adjunto.',
        'Si lo deseas, tómate un momento antes de enviar para fijar una intención de bondad. Deja que tu luz dorada lleve esa intención al mundo.',
      ] },
      { t: 'RECIBIR', p: [
        'Toca RECIBIR para aceptar una luz dorada de algún lugar del mundo. El planeta da una indicación aproximada de dónde se originó.',
        'Ambas acciones ofrecen un pulso suave bajo tu dedo, creando un momento para sentir el intercambio de bondad.',
      ] },
      { t: 'El Bosque Digital', p: [
        'Nuestro bosque digital es un símbolo vivo de la bondad colectiva. Cada luz dorada enviada añade significado, representando la bondad que siempre está presente en nuestro mundo.',
      ] },
      { t: 'El Contador Global', p: [
        'El número sobre el planeta cuenta las luces doradas enviadas en todo el mundo en las últimas 24 horas. Todos ven el mismo número, un reflejo compartido de la bondad en movimiento.',
      ] },
      { t: 'Nada Es Personal', p: [
        'Sin cuentas, sin conversaciones, sin identidades y sin perfiles personales. Cada interacción es anónima. No se requiere ninguna conexión personal y no va ningún mensaje adjunto.',
        'La bondad puede compartirse sin necesidad de saber quién la da o quién la recibe.',
      ] },
    ],
    closing: ['Una persona. Un acto. Una onda a la vez.', 'Somos la Humanidad.'],
    about: 'Acerca de', back: '← ATRÁS', privacyPolicy: 'Política de Privacidad',
    noSignalsAvailable: 'No hay señales disponibles en este momento',
    privacyYourPrivacy: 'Tu Privacidad',
    privacyLastUpdated: 'Última actualización: Octubre 2026',
    sections: [
      ['Sin Cuentas', 'The Heal In Tree no requiere que crees una cuenta. No hay inicios de sesión, no hay correos electrónicos, no hay nombres de usuario y no hay contraseñas.'],
      ['Sin Datos Personales', 'No recopilamos, almacenamos ni vendemos ninguna información personal. La aplicación no solicita tu nombre, correo electrónico, ubicación ni ningún dato identificativo.'],
      ['Sin Mensajes Almacenados', 'Cuando tocas DAR, una señal se envía a través de nuestros servidores a otra persona. Cuando la señal se entrega, se elimina instantánea y permanentemente. No se guarda ningún historial de tus interacciones.'],
      ['Detección Anónima de País', 'Para mostrar el hilo de luz dorada en el mapa mundial, detectamos tu país a partir de tu dirección IP. Esto se hace a nivel de servidor — no se solicita permiso de ubicación en tu dispositivo. Tu dirección IP no se almacena.'],
      ['Sin Rastreo', 'No usamos cookies, análisis ni píxeles de rastreo. No rastreamos tu uso, comportamiento ni interacciones dentro de la aplicación.'],
      ['Sin Compartir con Terceros', 'No compartimos ninguna información con terceros. No hay información que compartir.'],
      ['Niños', 'La aplicación no contiene contenido inapropiado para ninguna edad. No hay contenido generado por usuarios, no hay comunicación entre usuarios y no hay recopilación de datos.'],
    ],
  },
};
const L = (navigator.language || 'en').toLowerCase().startsWith('es') ? STRINGS.es : STRINGS.en;
document.querySelectorAll('[data-i18n]').forEach(el => {
  if (L[el.dataset.i18n]) el.textContent = L[el.dataset.i18n];
});
document.documentElement.lang = navigator.language.startsWith('es') ? 'es' : 'en';
document.getElementById('privacySections').innerHTML = L.sections
  .map(([h, b]) => `<h2>${h}</h2><p>${b}</p>`)
  .join('');
// Selina's info-page copy, verbatim (Nov 16). Numbered steps, one paragraph
// per point — hers reads better as prose than as bullets.
const about = document.getElementById('aboutSheet');
about.querySelector('.about-lead').innerHTML =
  L.aboutLead.map((t) => `<p>${t}</p>`).join('');
document.getElementById('howSteps').innerHTML =
  `<h2>${L.howTitle}</h2>` +
  L.howSteps.map((st, i) => `
    <div class="step">
      <h3><span class="num">${i + 1}.</span> ${st.t}</h3>
      ${st.p.map((t) => `<p>${t}</p>`).join('')}
    </div>`).join('');
about.querySelector('.about-closing').innerHTML =
  L.closing.map((t) => `<p>${t}</p>`).join('');

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
const REDUCE_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

// ─── Zoom lock ───────────────────────────────────────────────────────────────
// A fixed full-screen experience: pinch-zoom and double-tap-zoom break the
// layout and let the user end up inside a corner of the globe. iOS Safari
// ignores `user-scalable=no`, so the gestures have to be refused directly.
// Passively-false only on our own document; scrolling inside sheets still works
// because those keep their own scroll containers with `overscroll-behavior`.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  window.addEventListener(type, (e) => e.preventDefault(), { passive: false, capture: true });
}
window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false, capture: true });
// Double-tap zoom on Safari: two quick taps with no pan between them.
let lastTouchEnd = 0;
window.addEventListener('touchend', (e) => {
  const now = performance.now();
  if (now - lastTouchEnd < 320) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false, capture: true });
// Desktop / trackpad pinch arrives as ctrl+wheel.
window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false, capture: true });
// Keyboard zoom (Cmd/Ctrl +/-/0) is intentionally left alone: it is an
// accessibility affordance and not part of the touch experience.

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
const atmoBreathe = { phase: 0 };
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
atmo.renderOrder = 3;
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
haze.renderOrder = 3; // above ghost beams, below crisp beams
world.add(haze);

// The Heal In Tree signature: ONE delicate golden thread circling the earth
// with a soft light pulse traveling it — the "invisible golden thread" made
// visible. Stationary globe; the thread alone carries the ambient motion.
const THREAD_GLOW = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,220,140,1)'); grad.addColorStop(0.55, 'rgba(212,175,55,.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
})();
const threads = new THREE.Group();
// Selina asked for "more than one circle and ball moving". Three filaments
// (a fourth reads as a wireframe scratched over the continents) carrying seven
// travelling lights at different speeds — the movement is legible without the
// globe itself having to spin fast.
// Each ring is nudged off the globe's centre (off = local offset). Kept small
// so they still cradle the sphere, but big enough that they stop crossing in
// one hard X at the middle — that read as a scratch, not a filament.
const THREAD_SPECS = [
  { tilt: 0.52, spin: 0.28, radius: 1.12, alpha: 0.42, nodes: 3, off: [0.00, 0.17, 0.00] },
  { tilt: -0.38, spin: -0.62, radius: 1.06, alpha: 0.31, nodes: 2, off: [0.15, -0.09, 0.06] },
  { tilt: 0.92, spin: 1.15, radius: 1.02, alpha: 0.26, nodes: 2, off: [-0.13, -0.11, -0.05] },
];
const sigTravelers = [];
// Filament material: the whole ring must draw (a depth-tested one gets clipped
// at the silhouette and reads as broken arcs), but the half passing behind the
// globe should dim so it still reads as passing *behind* rather than being
// painted on the surface. View-space z against the globe's centre does that
// for a few ALU ops per fragment.
const threadMats = [];
function threadMaterial(alpha) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(GOLD) },
      uAlpha: { value: alpha },
      uCentreZ: { value: -6.8 },   // globe centre in view space, updated per frame
    },
    vertexShader: /* glsl */`
      varying float vZ;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vZ = mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uAlpha; uniform float uCentreZ;
      varying float vZ;
      void main() {
        // Larger view-space z = nearer the camera. Dim the far side, but keep
        // a healthy floor and a wide transition: a low floor made the back arc
        // vanish into the background, which reads as the ring stopping dead.
        float front = smoothstep(uCentreZ - 0.75, uCentreZ + 0.60, vZ);
        gl_FragColor = vec4(uColor, uAlpha * mix(0.55, 1.0, front));
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  threadMats.push(m);
  return m;
}
for (const [ti, spec] of THREAD_SPECS.entries()) {
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(spec.radius, ti === 0 ? 0.0055 : 0.0045, 8, 160),
    threadMaterial(spec.alpha),
  );
  torus.rotation.set(spec.tilt, 0, spec.spin);
  torus.position.set(...spec.off);
  // Above the planet (0) but below the atmosphere glow (3), so the limb still
  // blooms over the rings. Needed because depthTest is off.
  torus.renderOrder = 2;
  threads.add(torus);

  for (let n = 0; n < spec.nodes; n++) {
    const holder = new THREE.Group();
    holder.rotation.set(spec.tilt, 0, spec.spin);
    holder.position.set(...spec.off);
    const node = new THREE.Sprite(new THREE.SpriteMaterial({
      map: THREAD_GLOW, color: GOLD_LIGHT, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    node.scale.setScalar(ti === 0 ? 0.14 : 0.11);
    node.position.set(spec.radius, 0, 0);
    holder.add(node);
    threads.add(holder);
    sigTravelers.push({
      holder, node,
      phase: n / spec.nodes + ti * 0.17,
      speed: 1 + ti * 0.18,
    });
  }
}
scene.add(threads);
const SIG_PERIOD = 9000; // ms per orbit — unhurried, elegant

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

// Maps a beam's camera-plane sample to world z so the strip depth-tests
// against the planet: near hemisphere renders in front (bright), far side
// slides behind the planet surface (ghost hinted through it).
function depth(i) { return DEPTH_MIN + DEPTH_SPAN * ((i / BEAM_SEGS) - 0.5) * 0; }
const DEPTH_MIN = 0.001, DEPTH_SPAN = 0;
// ─── Beams ───────────────────────────────────────────────────────────────────
// Light ribbons riding the rotation, coplanar near the camera (no distortion).
// Far side = a DISTINCT GHOST: one soft wide glow blob hovering over the
// behind-earth portion — clearly not a front arc; crisp layers simply end at
// the limb.
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
})();
const BEAM_SEGS = 44;
const BEAM_MS = 1800;
const Z_BEAM = 0.05;

function beamStrip(color, w0, b0, order) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array((BEAM_SEGS + 1) * 2 * 3);
  const col = new Float32Array((BEAM_SEGS + 1) * 2 * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
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

function glowSprite(map, color, opacity, order) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  sp.renderOrder = order;
  return sp;
}

function fireBeam(from, to, { receive = false } = {}) {
  const color = receive ? GOLD_LIGHT : GOLD;
  const group = new THREE.Group();
  const mid = beamStrip(color, 0.018, 0.40, 5);
  const core = beamStrip(color, 0.004, 1.0, 5);
  const head = glowSprite(pulseTex, color, 1, 6);
  const origin = glowSprite(ringSoftTex, color, 0, 6);
  const dest = glowSprite(ringSoftTex, color, 0, 6);
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
  group.add(mid, core, head, origin, dest, sparks);
  scene.add(group);
  const ghost = glowSprite(pulseTex, color, 0, 2.5); // under atmosphere (order 3)
  ghost.scale.setScalar(2.2);
  scene.add(ghost);
  beams.push({
    from, to, group, ghost, mid, core, head, origin, dest, sparks,
    offsets: Array.from({ length: N }, () => Math.random()),
    receive, color, start: performance.now(), durationMs: BEAM_MS,
  });
}

// Camera-plane positions (orthographic). Far-side points keep their true
// in-disc x,y — the ghost blob + layer visibility do the "behind" work.
function projectGeo(lat, lon, centerLon, r = 1.005) {
  const lam = (lon - centerLon) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  return { x: Math.cos(phi) * Math.sin(lam) * r, y: Math.sin(phi) * r };
}
function geoUnit(lat, lon, out) {
  const lam = lon * Math.PI / 180, phi = lat * Math.PI / 180;
  const v = out || new THREE.Vector3();
  return v.set(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam));
}
function setStrip(attr, i6, x, y, nx, ny, w, z) {
  attr.array[i6 + 0] = x + nx * w; attr.array[i6 + 1] = y + ny * w; attr.array[i6 + 2] = z;
  attr.array[i6 + 3] = x - nx * w; attr.array[i6 + 4] = y - ny * w; attr.array[i6 + 5] = z;
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── Perf: frame-constant tables + scratch buffers (zero allocation per frame) ──
const CAP = new Float32Array(BEAM_SEGS + 1);       // rounded-cap width envelope
const WAVE_K = new Float32Array(BEAM_SEGS + 1);    // sin(pi t) for the energy wave
const SIN = new Float32Array(BEAM_SEGS + 1);
for (let s = 0; s <= BEAM_SEGS; s++) {
  const t = s / BEAM_SEGS;
  CAP[s] = Math.pow(Math.sin(Math.PI * t), 0.7);
  WAVE_K[s] = Math.sin(Math.PI * t);
  SIN[s] = Math.sin(t * Math.PI);
}
const PTX = new Float32Array(BEAM_SEGS + 1);
const PTY = new Float32Array(BEAM_SEGS + 1);
const BR = new Float32Array(BEAM_SEGS + 1);
const U0 = new THREE.Vector3();
const U1 = new THREE.Vector3();

function beamGeo(b, centerLon) {
  const u0 = geoUnit(b.from[0], b.from[1], U0);
  const u1 = geoUnit(b.to[0], b.to[1], U1);
  const a = projectGeo(b.from[0], b.from[1], centerLon);
  const c = projectGeo(b.to[0], b.to[1], centerLon);
  const omega = u0.angleTo(u1);
  const lift = 1 + 0.16 + omega * 0.09;
  let mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
  const ml = Math.hypot(mx, my);
  if (ml < 1e-4) { mx = 0; my = lift; } else { mx *= lift; my *= lift; }

  const so = Math.sin(omega);
  const rotY = world.rotation.y;
  const cr = Math.cos(rotY), sr = Math.sin(rotY);
  for (let s = 0; s <= BEAM_SEGS; s++) {
    const t = s / BEAM_SEGS, inv = 1 - t;
    PTX[s] = inv * inv * a.x + 2 * inv * t * mx + t * t * c.x;
    PTY[s] = inv * inv * a.y + 2 * inv * t * my + t * t * c.y;
    // slerp → rotate about Y (inline; was a Vector3 alloc + applyAxisAngle per segment)
    let vx, vy, vz;
    if (so < 1e-4) {
      vx = u0.x + (u1.x - u0.x) * t;
      vy = u0.y + (u1.y - u0.y) * t;
      vz = u0.z + (u1.z - u0.z) * t;
    } else {
      const w0 = Math.sin((1 - t) * omega) / so, w1 = Math.sin(t * omega) / so;
      vx = u0.x * w0 + u1.x * w1;
      vy = u0.y * w0 + u1.y * w1;
      vz = u0.z * w0 + u1.z * w1;
    }
    const z = -vx * sr + vz * cr;             // Y-rotation: only z is needed
    const k = Math.max(0, Math.min(1, (z + 0.55) / 0.72));
    BR[s] = k * k * (3 - 2 * k);
  }
  return { a, c };
}

function updateBeams(now) {
  // Beams follow the live rotation.
  const centerLon = -(world.rotation.y * 180 / Math.PI + 90);
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    const p = Math.min((now - b.start) / b.durationMs, 1);
    const env = Math.min(p / 0.06, 1) * (p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1);
    const { a, c } = beamGeo(b, centerLon);
    if (!b._baseColor) b._baseColor = new THREE.Color(b.color);
    const base = b._baseColor;

    // ── GHOST: one soft wide glow blob over the behind-earth portion ──
    let fCount = 0, fSum = 0, gx = 0, gy = 0;
    for (let s = 0; s <= BEAM_SEGS; s++) {
      if (BR[s] < 0.35) { fCount++; fSum += (1 - BR[s]); gx += PTX[s]; gy += PTY[s]; }
    }
    if (fCount > 2) {
      b.ghost.position.set(gx / fCount, gy / fCount, Z_BEAM - 0.01);
      b.ghost.material.opacity = 0.14 * Math.min((fSum / fCount) * 1.8, 1) * env;
    } else {
      b.ghost.material.opacity = 0;
    }

    // ── crisp layers: visible only on the near side, fading at the limb ──
    for (const strip of [b.mid, b.core]) {
      const pos = strip.geometry.attributes.position;
      const arr = pos.array;
      const phase = now * 0.010;
      for (let s = 0; s <= BEAM_SEGS; s++) {
        const sPrev = s > 0 ? s - 1 : 0, sNext = s < BEAM_SEGS ? s + 1 : BEAM_SEGS;
        const dx = PTX[sNext] - PTX[sPrev], dy = PTY[sNext] - PTY[sPrev];
        const len = Math.sqrt(dx * dx + dy * dy) || 1e-4;
        const nx = -dy / len, ny = dx / len;
        const ph = s * 0.24 - phase;
        const off = WAVE_K[s] * 0.009 * (Math.sin(ph) + 0.35 * Math.sin(ph * 2.1 + 1.3));
        const vis = sstep(0.30, 0.55, BR[s]);
        const w = strip.userData.w0 * CAP[s] * vis;
        const px = PTX[s] + nx * off, py = PTY[s] + ny * off;
        const i6 = s * 6;
        arr[i6] = px + nx * w; arr[i6 + 1] = py + ny * w; arr[i6 + 2] = Z_BEAM;
        arr[i6 + 3] = px - nx * w; arr[i6 + 4] = py - ny * w; arr[i6 + 5] = Z_BEAM;
      }
      pos.needsUpdate = true;
      if (!strip.userData.colored) {
        // vertex colors are constant per layer — upload once, not every frame
        const col = strip.geometry.attributes.color;
        const lum = strip.userData.b0;
        for (let s = 0; s <= BEAM_SEGS; s++) {
          for (const o of [s * 6, s * 6 + 3]) {
            col.array[o] = base.r * lum; col.array[o + 1] = base.g * lum; col.array[o + 2] = base.b * lum;
          }
        }
        col.needsUpdate = true;
        strip.userData.colored = true;
      }
      strip.material.opacity = env;
    }

    // Head rides the arc — a whisper behind the planet.
    const hi = Math.round(p * BEAM_SEGS);
    b.head.position.set(PTX[hi], PTY[hi], Z_BEAM + 0.01);
    b.head.material.opacity = env * (0.08 + 0.92 * BR[hi]);
    b.head.scale.setScalar(Math.max((0.11 - 0.04 * (1 - BR[hi])) * env, 0.0001));

    // Origin / destination rings ride their anchors, ghosted behind.
    b.origin.position.set(a.x, a.y, Z_BEAM + 0.005);
    const oIn = Math.min(p / 0.10, 1);
    b.origin.scale.setScalar(Math.max(0.07 + 0.20 * oIn, 0.0001) * (0.55 + 0.45 * BR[0]));
    b.origin.material.opacity = (0.55 + 0.25 * oIn) * env * (0.10 + 0.90 * BR[0]);
    b.dest.position.set(c.x, c.y, Z_BEAM + 0.005);
    const dIn = Math.min(Math.max((p - 0.70) / 0.25, 0), 1);
    b.dest.scale.setScalar(Math.max(0.05 + 0.34 * dIn, 0.0001) * (0.55 + 0.45 * BR[BEAM_SEGS]));
    b.dest.material.opacity = dIn * env * (0.10 + 0.90 * BR[BEAM_SEGS]);

    // Sparks flow through the beam; dim by the path's mean visibility.
    const sp = b.sparks.geometry.attributes.position;
    const flow = (now - b.start) / 650;
    for (let k = 0; k < b.offsets.length; k++) {
      const t = (b.offsets[k] + flow) % 1;
      const s = t * BEAM_SEGS, s0 = Math.floor(s), fr = s - s0;
      const i0 = Math.min(s0, BEAM_SEGS), i1 = Math.min(s0 + 1, BEAM_SEGS);
      sp.setXYZ(k, PTX[i0] + (PTX[i1] - PTX[i0]) * fr, PTY[i0] + (PTY[i1] - PTY[i0]) * fr, Z_BEAM + 0.005);
    }
    sp.needsUpdate = true;
    let meanBr = 0;
    for (let s = 0; s <= BEAM_SEGS; s++) meanBr += BR[s];
    meanBr /= BEAM_SEGS + 1;
    b.sparks.material.opacity = 0.85 * env * (0.10 + 0.90 * meanBr);

    if (p >= 1) {
      if (BR[BEAM_SEGS] > 0.5) {
        const ring = new THREE.Sprite(new THREE.SpriteMaterial({
          map: ringTex, color: b.color, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0.9,
        }));
        ring.position.set(c.x, c.y, Z_BEAM + 0.01);
        ring.renderOrder = 7;
        scene.add(ring);
        bursts.push({ ring, start: now });
      }
      scene.remove(b.group);
      scene.remove(b.ghost);
      for (const st of [b.mid, b.core]) { st.geometry.dispose(); st.material.dispose(); }
      b.sparks.geometry.dispose(); b.sparks.material.dispose();
      for (const k of ["head", "origin", "dest", "ghost"]) b[k].material.dispose();
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
    // The counter is a true rolling 24h total, so read the RPC that recomputes
    // the window instead of the stored column — a stored value goes stale-high
    // whenever older acts age out and nobody taps.
    const res = await fetch(`${REST}/rpc/get_global_counter`, {
      method: 'POST', headers: HEADERS, body: '{}',
    });
    if (res.ok) {
      const out = await res.json();
      if (out && typeof out.count === 'number') count = out.count;
    }
    $count.textContent = count;
  } catch { /* offline: keep last value */ }
}

let DEMO_STYLE = null;

async function onAct() {
  const btn = document.getElementById('act');
  const mark = document.createElement('span');
  mark.className = 'tapmark';
  btn.querySelector('.ring').appendChild(mark);
  mark.addEventListener('animationend', () => mark.remove());
  vibrate([400, 400, 200, 400, 400]); // ≈2s firm triple-pulse — brief parity (§4)
  const continent = continentOf(userCountry);
  // Brief §2: destination anonymous and RANDOM — a random stranger's country,
  // not a fixed forest point. Backend routing (continent forest) unchanged.
  const keys = Object.keys(COUNTRY_ANCHORS).filter(k => k !== userCountry.toUpperCase() && k !== "XX");
  const dest = keys[Math.floor(Math.random() * keys.length)];
  fireBeam(anchorOf(userCountry), COUNTRY_ANCHORS[dest]);
  count += 1; $count.textContent = count; // optimistic; poll corrects
  try { await api('/rpc/create_signal', { p_sender_country: userCountry, p_continent: continent }); }
  catch { /* offline: visual only */ }
}

async function onReceive() {
  const btn = document.getElementById('receive');
  const mark = document.createElement('span');
  mark.className = 'tapmark';
  btn.querySelector('.ring').appendChild(mark);
  mark.addEventListener('animationend', () => mark.remove());
  let signal = null;
  try { signal = await api('/rpc/receive_signal', { p_receiver_country: userCountry, p_continent: continentOf(userCountry) }); }
  catch { /* offline */ }
  if (signal) {
    vibrate([30, 60, 30, 50, 30, 40, 40, 60, 30]);
    // Brief §2: the receiver watches the light travel FROM the sender's
    // country (e.g., "Dubai → Ibiza"); forest origin only if unknown.
    const origin = signal.senderCountry && signal.senderCountry !== "XX"
      ? anchorOf(signal.senderCountry)
      : (FORESTS[signal.continent] ?? FORESTS[continentOf(userCountry)]);
    fireBeam(origin, anchorOf(userCountry), { receive: true });
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


// The globe is sized and centred in the HUD's free space so it never sits on
// the words (Selina: "the wording behind the globe is obscured"). Everything is
// measured in CSS px; one world unit equals one globe radius on screen, so the
// camera's fov/offset follow directly from the measured free rect.
function freeRect() {
  const hud = document.getElementById('hud');
  const r = (sel) => hud.querySelector(sel).getBoundingClientRect();
  const headline = r('.headline'), counter = r('.counter'), explain = r('#explain'), btns = r('.buttons');
  if (innerWidth <= innerHeight) {
    // Portrait: words stack top, buttons bottom — the band between them is free.
    return { top: counter.bottom, bottom: Math.min(explain.top, btns.top), left: 0, right: innerWidth };
  }
  // Landscape/short: words sit in a left column, buttons in a right column, so
  // the globe takes the horizontal gap between them.
  return {
    top: 8, bottom: innerHeight - 8,
    left: Math.max(headline.right, counter.right) + 10, right: btns.left - 10,
  };
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const free = freeRect();
  const portrait = w <= h;
  const availW = Math.max(120, free.right - free.left - 32);
  const availH = Math.max(120, free.bottom - free.top - (portrait ? 20 : 24));
  // Radius in CSS px == min(avail)/2; solve fov from the vertical extent.
  // 0.97 ≈ perspective silhouette bulge (a sphere's outline is slightly larger
  // than its equatorial circle at z=0); keeps the disc clear of the words.
  const radiusPx = Math.min(availW, availH) / 2 * (portrait ? 0.97 : 0.9);
  camera.fov = Math.min(
    60, THREE.MathUtils.radToDeg(2 * Math.atan((h / 2) / (camera.position.z * radiusPx))),
  );
  // Shift the whole projection (globe + beams) so the disc centre lands on the
  // free rect's centre. A view offset keeps the layer alignment exact; moving
  // the camera itself would desync the camera-plane beam strips.
  const dx = (free.left + free.right) / 2 - w / 2;
  const dy = (free.top + free.bottom) / 2 - h / 2;
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    camera.setViewOffset(w, h, -dx, -dy, w, h);
  } else {
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
addEventListener('orientationchange', () => setTimeout(resize, 120));
// The HUD is measured in CSS px, so re-fit whenever its own boxes change —
// font swap (Cormorant loads late), tagline wrap, translate, safe-area inset.
if (document.fonts?.ready) document.fonts.ready.then(resize);
if ('ResizeObserver' in window) {
  const ro = new ResizeObserver(() => resize());
  const hud = document.getElementById('hud');
  for (const sel of ['.headline', '.counter', '#explain', '.buttons']) {
    const el = hud.querySelector(sel);
    if (el) ro.observe(el);
  }
}

let running = true;
// Landscape is gated by a portrait prompt, so stop rendering the covered canvas.
const portraitMQ = matchMedia('(orientation: portrait)');
let inPortrait = portraitMQ.matches;
const syncOrientation = () => {
  inPortrait = portraitMQ.matches;
  if (inPortrait && !document.hidden) { last = performance.now(); requestAnimationFrame(frame); }
  resize();
};
portraitMQ.addEventListener('change', syncOrientation);
document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) { last = performance.now(); requestAnimationFrame(frame); }
});

function frame(now) {
  if (!running || !inPortrait) return;
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  // Selina's FINAL pick — both layers move: globe drifts, threads counter-sweep.
  // Her later note: "more than one circle and ball moving… shows more movement",
  // with mixed reactions to a spinning globe. So the globe keeps an honest,
  // slow drift (60 s/rev) while the thread lattice and its travelling lights
  // carry the visible motion. Reduced-motion users get a still globe.
  if (!REDUCE_MOTION) {
    world.rotation.y += (Math.PI * 2) / 60 * dt;
    threads.rotation.y -= dt * 0.55;
  }
  atmoBreathe.phase += dt / 5.2;
  const br = 0.8 + 0.2 * Math.sin(atmoBreathe.phase * Math.PI * 2); // 0.6 … 1.0
  atmo.material.opacity = 0.8 * br;
  haze.material.opacity = 0.35 * br;
  for (const t of sigTravelers) {
    const phase = REDUCE_MOTION ? t.phase : ((now % SIG_PERIOD) / SIG_PERIOD) * t.speed + t.phase;
    t.holder.rotation.z = (phase % 1) * Math.PI * 2;
    t.node.material.opacity = 0.7 + 0.3 * Math.sin(phase * Math.PI * 6);
  }

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
  window.__dbg = { camera, renderer, scene, world, planet, latLonToVec3, anchorOf, geoUnit, projectGeo, beams, THREE, depth };
})();
