/* Offline-Speicher für die App RailBase Legends (Service Worker).
   Seite, Skripte und Styles: immer zuerst aus dem Netz laden, nur ohne Netz die zuletzt gespeicherte Kopie zeigen.
   So sieht man nach jedem Update sofort die neue Version.
   Bilder (Ordner assets/): sofort aus dem Speicher auf dem Handy, im Hintergrund wird die Kopie erneuert.
   Das spart auf dem Handy bei jedem Start Ladezeit und Datenvolumen.
   Angemeldet wird er in index.html (nur auf https). */
const SPEICHER = 'rbl-v1';

self.addEventListener('install', () => self.skipWaiting());

// alte Speicher-Versionen aufräumen
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((namen) => Promise.all(namen.filter((n) => n !== SPEICHER).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  // nur eigene Dateien (Schriften von Google und Ähnliches laufen normal übers Netz)
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;
  if (new URL(anfrage.url).pathname.includes('/assets/')) {
    // im Hintergrund erneuern (meist nur eine kurze «unverändert»-Antwort vom Server)
    const ausDemNetz = fetch(anfrage).then((antwort) => {
      if (antwort.ok) {
        const kopie = antwort.clone();
        caches.open(SPEICHER).then((c) => c.put(anfrage, kopie));
      }
      return antwort;
    });
    e.waitUntil(ausDemNetz.catch(() => {}));
    e.respondWith(caches.match(anfrage)
      .then((gespeichert) => gespeichert || ausDemNetz)
      .catch(() => Response.error()));
    return;
  }
  e.respondWith(fetch(anfrage)
    .then((antwort) => {
      if (antwort.ok) {
        const kopie = antwort.clone();
        caches.open(SPEICHER).then((c) => c.put(anfrage, kopie));
      }
      return antwort;
    })
    .catch(() => caches.match(anfrage, { ignoreSearch: true })
      .then((treffer) => treffer || (anfrage.mode === 'navigate' ? caches.match('./') : undefined))
      .then((treffer) => treffer || Response.error())));
});
