# Abike Music — iPhone web / PWA

A static, dependency-free web version of Abike Music you can open on iPhone right now. It has a live branded boot animation, a YouTube-only sign-in gate, and a player shell with Search, Library, Offline and Settings sections. No build step, no framework, no account storage.

**Live URL:** https://bigopeforce-bit.github.io/abikemusic-iphone/

## Files

- `index.html` — markup for boot, sign-in gate and all four sections
- `styles.css` — branding, 3D gate, per-section animations, safe-area/touch support, reduced-motion handling
- `app.js` — boot sequence, gate, link parsing, YouTube embed, navigation, service-worker registration
- `manifest.webmanifest` + `sw.js` — Home Screen install metadata and offline app-shell cache
- `assets/` — the supplied `abike-logo.jpg` plus PNG icons derived from it

## Open it on iPhone

1. Upload this `web` folder as the root of any static host (GitHub Pages, Netlify, or any HTTPS web server).
2. Open the resulting URL in Safari on the iPhone.
3. For a quick local test: in this folder run `python3 -m http.server 8000`, then open `http://<computer-ip>:8000` on the iPhone (same Wi‑Fi). Service-worker install needs HTTPS or localhost; the player itself still works over plain HTTP.

## Add to Home Screen

In Safari, tap **Share** → **Add to Home Screen** → **Add**. Launch from the Home Screen icon for the standalone branded experience. The app shell (screens, styles, logo) is cached by the service worker after the first HTTPS load.

## Limitations (by design)

- The gate opens Google's own YouTube sign-in page in a new tab. This web app has no OAuth client credentials, so it **cannot verify a Google session**; after opening the tab it continues into a local player shell. No password, cookie, token or session is collected or stored — everything is in memory and clears on reload.
- Playback uses `youtube-nocookie.com/embed`. Some tracks are blocked from embedding by their rights holders; use the YouTube Music buttons in that case. iOS may require you to tap play in the embed even when autoplay is requested.
- A web player **cannot download songs**. The "Open in YouTube Music to download offline" button opens the track in YouTube Music, where downloads may require the app and a Premium subscription. The app shell itself can work offline.
- Library is a short in-memory list of tracks played during this app session; it does not sync your real YouTube Music library.
- Search buttons open YouTube Music in a new tab rather than using an API key.

## Development notes

Edit the four static files and reload; there is nothing to compile. Validate with `node --check app.js` and `node --check sw.js`.
