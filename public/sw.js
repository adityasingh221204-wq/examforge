// EXAMFORGE — offline shell.
// Caches the whole app — HTML, JS, CSS, icons — on the first online visit, so the Study
// Book opens on a train with no signal. All subject content lives inside the JS bundle,
// so caching these few files is enough to make every page work offline.

const CACHE = 'examforge-v3';
const SHELL = new URL('./', self.location).href;

/** Read the built HTML and precache every same-origin asset it references. */
async function precache() {
  const cache = await caches.open(CACHE);
  const response = await fetch(new Request(SHELL, { cache: 'reload' }));
  if (!response.ok) throw new Error(`shell ${response.status}`);
  await cache.put(SHELL, response.clone());

  const html = await response.text();
  const urls = new Set();
  const ref = /(?:src|href)="([^"]+)"/g;
  let match;
  while ((match = ref.exec(html)) !== null) {
    const raw = match[1];
    if (raw.startsWith('data:') || raw.startsWith('http')) continue; // third-party assets stay online-only
    try {
      urls.add(new URL(raw, SHELL).href);
    } catch {
      /* ignore unparseable references */
    }
  }
  urls.delete(SHELL);
  await Promise.all([...urls].map((url) => cache.add(url).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precache()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App shell: network first so a new deploy is picked up, cache when there is no signal.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit ?? caches.match(request))),
    );
    return;
  }

  // Built assets are content-hashed, so cache-first is safe and instant offline.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return response;
          })
          .catch(() => hit),
    ),
  );
});
