/* Wartung: Dieser Service Worker ersetzt den alten Offline-Speicher des Spiels.
   Er löscht alle gespeicherten Kopien, meldet sich ab und lädt offene Seiten neu,
   damit auf jedem Gerät die Wartungsseite erscheint statt der gespeicherten Spielversion. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.map((n) => caches.delete(n)));
    await self.registration.unregister();
    const fenster = await self.clients.matchAll({ type: 'window' });
    fenster.forEach((f) => f.navigate(f.url).catch(() => {}));
  })());
});
