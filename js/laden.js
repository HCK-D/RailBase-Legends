/*
 * Ladebildschirm beim Start (#laden, css/laden.css): bleibt, bis die Anmeldung geprüft und der Spielstand da ist.
 * js/online.js meldet die Schritte (Laden.schritt) und ruft Laden.fertig(), sobald man spielen kann oder sich
 * anmelden muss. Er bleibt mindestens kurz stehen, damit nichts aufblitzt; nach 15 Sekunden geht er auf jeden Fall weg
 * (und falls das Skript gar nicht läuft, blendet ihn das CSS nach 20 Sekunden aus).
 */

const LADE_TIPPS = [
  'Jeden Tag gibt es ein Gratis-Pack und eine Gratis-Drehung am Glücksrad.',
  'Doppelte Karten kannst du verwerten oder mit Freunden tauschen.',
  'Komm 7 Tage in Folge vorbei: Die Tagesbelohnung wird jeden Tag grösser.',
  'Erfolge bringen Belohnungen. Du findest sie unter Mehr → Erfolge.',
  'Fehlt dir eine Karte? Tipp sie im Album an, dann kommt sie auf deine Wunschliste.',
  'Ab Epic lädt sich die Karte beim Aufdecken mit Farben auf. Je mehr Farben, desto seltener.',
];

const Laden = (() => {
  const box = document.getElementById('laden');
  const beginn = performance.now();
  const MINDESTENS = 1600; // ms, damit man die Karten und das Logo kurz sieht
  const warte = (ms) => new Promise((weiter) => setTimeout(weiter, ms));
  let stand = 0;
  let ende = null;   // Promise, sobald fertig() aufgerufen wurde
  let tippUhr = null;
  let tippNr = Math.floor(Math.random() * LADE_TIPPS.length);

  function schritt(anteil, text) {
    if (!box || ende) return;
    stand = Math.max(stand, anteil);
    document.getElementById('ld-balken').style.width = `${Math.round(8 + stand * 92)}%`;
    if (text) document.getElementById('ld-text').textContent = text;
  }

  function zeigeTipp() {
    const el = document.getElementById('ld-tipp');
    el.classList.add('wechsel');
    setTimeout(() => {
      tippNr = (tippNr + 1) % LADE_TIPPS.length;
      el.textContent = `Tipp: ${LADE_TIPPS[tippNr]}`;
      el.classList.remove('wechsel');
    }, 250);
  }

  // Ladebildschirm ausblenden; das Promise ist erfüllt, wenn er weg ist (danach dürfen Fenster aufgehen)
  function fertig(text = 'Los geht’s!') {
    if (!box) return Promise.resolve();
    if (ende) return ende;
    schritt(1, text);
    ende = (async () => {
      // Schriften abwarten (höchstens kurz), damit danach nichts mehr springt
      if (document.fonts) await Promise.race([document.fonts.ready, warte(1500)]);
      const rest = MINDESTENS - (performance.now() - beginn);
      await warte(Math.max(350, rest)); // der volle Balken soll kurz zu sehen sein
      box.classList.add('weg');
      box.setAttribute('aria-busy', 'false');
      await warte(560);
      box.hidden = true;
      clearInterval(tippUhr);
    })();
    return ende;
  }

  if (box) {
    document.getElementById('ld-tipp').textContent = `Tipp: ${LADE_TIPPS[tippNr]}`;
    tippUhr = setInterval(zeigeTipp, 3400);
    schritt(0.1, 'Karten werden gemischt …');
    setTimeout(() => fertig(), 15000);
  }

  return { schritt, fertig, offen: () => !!box && !box.hidden };
})();
