# The Heal In Tree — Web (three.js)

Standalone WebGL version of The Heal In Tree for the web — three.js renders
the golden earth natively in the browser (persistent GL context, no app
framework overhead), targeting 60 fps on mid-range phones.

- Scene ported from the Flutter app: `planet_sphere.frag` gold grade, NASA
  night textures, beams, stars, particles (see `heal-tree` repo)
- Backend: same Supabase project — REST RPCs (`create_signal`,
  `receive_signal`), counter polling, `geoip` edge function
- EN/EN-ES auto language, EN fallback; haptics via `navigator.vibrate`

Deploy: Netlify project `heal-in-tree-web` → https://heal-in-tree-web.netlify.app
Rebuild: edit + push (Netlify can be linked to this repo for auto-deploys).
The Flutter app (iOS/Android) remains the native product in the `heal-tree` repo.
