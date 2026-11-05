/*
 * Spielgefühl: Töne, Vibration, Konfetti, Schriftzüge, Glanz und das Neigen der Karten.
 * Nur Aussehen und Klang, keine Spielregeln. Die Töne werden im Browser erzeugt (Web Audio), es gibt keine Ton-Dateien.
 * Ein- und ausschalten: Konto → «Töne und Vibration» (app.daten.ton).
 */
const Gefuehl = (() => {
  let ctx = null;
  let master = null;
  let beruehrt = false; // Browser spielen Töne erst nach dem ersten Tippen ab
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');

  // userActivation: Chrome erlaubt Ton und Vibration erst nach einem echten Tippen
  const an = () => beruehrt && app.daten.ton !== false && navigator.userActivation?.hasBeenActive !== false;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Ein Ton: Frequenz, Start (Sekunden ab jetzt), Dauer. bis: Frequenz gleitet dorthin
  function klang(freq, start, dauer, { typ = 'sine', laut = 0.5, bis = null } = {}) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(freq, t);
    if (bis) osc.frequency.exponentialRampToValueAtTime(bis, t + dauer);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dauer + 0.02);
  }

  // Rauschen für Reissen, Wischen und Rumpeln. Der Filter gleitet von «von» nach «bis»
  function rauschen(start, dauer, { von = 800, bis = 3000, laut = 0.4, art = 'bandpass', q = 1 } = {}) {
    const t = ctx.currentTime + start;
    const n = Math.ceil(ctx.sampleRate * dauer);
    const puffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const daten = puffer.getChannelData(0);
    for (let i = 0; i < n; i++) daten[i] = Math.random() * 2 - 1;
    const quelle = ctx.createBufferSource();
    quelle.buffer = puffer;
    const filter = ctx.createBiquadFilter();
    filter.type = art;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(von, t);
    filter.frequency.exponentialRampToValueAtTime(bis, t + dauer);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + Math.min(0.03, dauer / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    quelle.connect(filter).connect(g).connect(master);
    quelle.start(t);
    quelle.stop(t + dauer + 0.02);
  }

  // Halbtöne über C5, für Fanfaren
  const note = (halbton) => 523.25 * 2 ** (halbton / 12);

  const TOENE = {
    tick: () => klang(1800, 0, 0.03, { typ: 'triangle', laut: 0.1 }),
    tipp: () => klang(660, 0, 0.06, { laut: 0.16, bis: 880 }),
    auf: () => rauschen(0, 0.35, { von: 400, bis: 2200, laut: 0.16 }),
    schuetteln: () => {
      rauschen(0, 0.7, { von: 120, bis: 900, laut: 0.28, art: 'lowpass' });
      klang(90, 0, 0.7, { typ: 'sawtooth', laut: 0.05, bis: 200 });
    },
    reissen: () => {
      rauschen(0, 0.32, { von: 1500, bis: 7000, laut: 0.55, art: 'highpass' });
      klang(220, 0.02, 0.25, { typ: 'triangle', laut: 0.14, bis: 660 });
    },
    flip: () => {
      rauschen(0, 0.12, { von: 2500, bis: 900, laut: 0.22 });
      klang(520, 0.05, 0.08, { typ: 'triangle', laut: 0.16 });
    },
    weg: () => rauschen(0, 0.22, { von: 600, bis: 2400, laut: 0.16 }),
    muenze: () => {
      klang(1320, 0, 0.18, { laut: 0.22 });
      klang(1760, 0.07, 0.3, { laut: 0.2 });
    },
    levelup: () => [0, 4, 7, 12, 16].forEach((h, i) => klang(note(h), i * 0.1, 0.55, { typ: 'triangle', laut: 0.26 })),
    gewinn: () => [0, 4, 7, 12, 16].forEach((h, i) => klang(note(h), i * 0.08, 0.45, { typ: 'triangle', laut: 0.24 })),
    nichts: () => klang(330, 0, 0.4, { typ: 'triangle', laut: 0.18, bis: 196 }),
    // Aufladen vor einer seltenen Karte: helle Glöckchen, die immer schneller und höher werden (Fünfton-Leiter),
    // darunter leise Herzschläge. Kein durchgehender Brummton.
    laden: (dauer = 1.2) => {
      const LEITER = [0, 2, 4, 7, 9];
      // das Tempo richtet sich nach der Dauer: so läuft die Leiter bei jeder Seltenheit etwa einmal ganz hoch
      for (let s = 0, n = 0, schritt = dauer * 0.18; s < dauer - 0.05; s += schritt, n++, schritt = Math.max(0.06, schritt * 0.86)) {
        const stufe = n <= 11 ? n : 10 + (n % 2); // höchstens etwa 1760 Hz, oben wechseln sich zwei Töne ab
        const halbton = LEITER[stufe % 5] + 12 * Math.floor(stufe / 5) - 5;
        klang(note(halbton), s, 0.16, { typ: 'triangle', laut: 0.08 + Math.min(n, 12) * 0.007 });
      }
      for (let s = 0, schritt = 0.36; s < dauer - 0.15; s += schritt, schritt = Math.max(0.16, schritt * 0.8)) {
        klang(70, s, 0.12, { laut: 0.18, bis: 50 });
      }
    },
    // Aufladen ab Epic: die Farbe springt eine Stufe höher (1 = Mythic, 2 = Legendary, 3 = Special).
    // Ein heller Akkord, jede Stufe eine Quarte höher, dazu ein Luftzug.
    stufe: (n = 1) => {
      [0, 7, 12].forEach((h, i) => klang(note(h + n * 5 - 5), i * 0.03, 0.45, { typ: 'triangle', laut: 0.15 }));
      rauschen(0, 0.3, { von: 700, bis: 5000, laut: 0.1 });
    },
    // Aufdecken ab Epic: tiefer Schlag und ein Luftstoss
    knall: () => {
      klang(150, 0, 0.55, { laut: 0.5, bis: 38 });
      rauschen(0, 0.55, { von: 4000, bis: 250, laut: 0.3, art: 'lowpass' });
    },
  };

  // Seltenheit: je seltener, desto mehr und hellere Töne
  const SELTEN_TOENE = {
    common: [0],
    uncommon: [0, 7],
    rare: [0, 4, 7],
    epic: [0, 4, 7, 11],
    mythic: [0, 3, 7, 10, 15],
    legendary: [0, 4, 7, 12, 16, 19],
    special: [0, 4, 7, 11, 14, 19, 24],
  };

  // wert: bei «selten» die Seltenheit, bei «laden» die Dauer in Sekunden, bei «stufe» die Farbstufe
  function ton(name, wert) {
    if (!an() || !audio()) return;
    try {
      if (name === 'selten') {
        const rang = rangVon(wert);
        (SELTEN_TOENE[wert] || SELTEN_TOENE.common).forEach((h, i) =>
          klang(note(h), i * 0.07, 0.35 + rang * 0.08, { typ: rang >= 3 ? 'triangle' : 'sine', laut: 0.2 }));
        if (rang >= 5) rauschen(0.1, 1.2, { von: 6000, bis: 9000, laut: 0.06, art: 'highpass' }); // Glitzern
        return;
      }
      TOENE[name]?.(wert);
    } catch (e) { /* Töne sind nur eine Zugabe */ }
  }

  // Glücksrad: ein Klick für jedes Feld, das am Zeiger vorbeigeht, passend zur Bremskurve des Rads
  function radTicks(weg, feld, dauer, kurve = [0.12, 0.62, 0.08, 1]) {
    if (!an() || !audio()) return;
    const [x1, y1, x2, y2] = kurve;
    const bezier = (s, a, b) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s ** 2 * b + s ** 3;
    let naechste = feld;
    try {
      for (let s = 0; s <= 1 && naechste <= weg; s += 0.0015) {
        const winkel = bezier(s, y1, y2) * weg;
        while (naechste <= winkel && naechste <= weg) {
          klang(1900, bezier(s, x1, x2) * dauer, 0.025, { typ: 'triangle', laut: 0.09 });
          naechste += feld;
        }
      }
    } catch (e) { /* Töne sind nur eine Zugabe */ }
  }

  function vibriere(muster) {
    if (!an() || !navigator.vibrate) return;
    try { navigator.vibrate(muster); } catch (e) { /* ignorieren */ }
  }

  // ---------- Bilder: Konfetti und grosse Schriftzüge ----------

  // Konfetti regnet über den ganzen Bildschirm
  function konfetti(farben, anzahl = 70) {
    if (ruhig.matches) return;
    const schicht = document.createElement('div');
    schicht.className = 'gf-konfetti';
    schicht.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < anzahl; i++) {
      const s = document.createElement('i');
      s.style.setProperty('--x', `${(Math.random() * 100).toFixed(1)}vw`);
      s.style.setProperty('--drift', `${((Math.random() - 0.5) * 180).toFixed(0)}px`);
      s.style.setProperty('--dreh', `${(Math.random() * 1080 - 540).toFixed(0)}deg`);
      s.style.setProperty('--dauer', `${(1.8 + Math.random() * 1.6).toFixed(2)}s`);
      s.style.setProperty('--warte', `${(Math.random() * 0.5).toFixed(2)}s`);
      s.style.background = farben[i % farben.length];
      schicht.appendChild(s);
    }
    document.body.appendChild(schicht);
    setTimeout(() => schicht.remove(), 4200);
  }

  // Grosser Schriftzug, z. B. «Legendary!» oder «Level 5!»
  function banner(host, text, farbe) {
    const b = document.createElement('div');
    b.className = 'gf-banner';
    b.textContent = text;
    b.style.setProperty('--farbe', farbe);
    host.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }

  // Münzen fliegen von einem Knopf zur Münz-Anzeige oben, dort blinkt der Stand
  function muenzFlug(von, bild, anzahl = 6) {
    const ziel = document.querySelector('.muenz-chip .muenze');
    if (ruhig.matches || !von || !ziel) return;
    const a = von.getBoundingClientRect();
    const b = ziel.getBoundingClientRect();
    for (let i = 0; i < anzahl; i++) {
      const m = document.createElement('img');
      m.className = 'gf-flugmuenze';
      m.src = bild;
      m.alt = '';
      m.style.left = `${a.left + a.width / 2 + (Math.random() - 0.5) * 40}px`;
      m.style.top = `${a.top + a.height / 2 + (Math.random() - 0.5) * 20}px`;
      m.style.setProperty('--dx', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
      m.style.setProperty('--dy', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
      m.style.setProperty('--bogen', `${-60 - Math.random() * 80}px`);
      m.style.animationDelay = `${i * 60}ms`;
      document.body.appendChild(m);
      m.addEventListener('animationend', () => m.remove());
    }
    setTimeout(() => ton('muenze'), 650);
  }

  // Nach «Fertig»: alle Karten des Packs stellen sich in eine Reihe in der Mitte des Bildschirms,
  // dann fliegt jede einzeln schnell zum Album-Knopf; der Knopf hüpft bei jeder Karte.
  // karten: [{ html, rect, neu }] mit der Stelle, an der die Karte in der Übersicht lag.
  function insAlbum(karten) {
    const ziel = document.querySelector('.tabbar [data-tab="album"]');
    if (ruhig.matches || !ziel || !karten.length || !document.body.animate) return;
    const z = ziel.getBoundingClientRect();
    const zx = z.left + z.width / 2;
    const zy = z.top + z.height / 2;

    // Reihe: gleich breite Karten, mittig, etwas über der Bildschirmmitte
    const n = karten.length;
    const luecke = 8;
    const breite = Math.min(76, (innerWidth - 32 - (n - 1) * luecke) / n);
    const hoehe = breite * 7 / 5;
    const startX = (innerWidth - (n * breite + (n - 1) * luecke)) / 2;
    const oben = innerHeight * 0.42 - hoehe / 2;

    const REIHE = 340;   // Karten ordnen sich zur Reihe
    const PAUSE = 160;   // kurz stehen bleiben
    const ABSTAND = 85;  // zwischen zwei Karten, die losfliegen
    const FLUG = 360;    // Flug einer Karte ins Album

    // leichter dunkler Schleier, damit die Reihe vor der Startseite hervortritt
    const gesamt = REIHE + PAUSE + (n - 1) * ABSTAND + FLUG;
    const schleier = document.createElement('div');
    schleier.className = 'gf-reihe-schleier';
    document.body.appendChild(schleier);
    schleier.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }],
      { duration: gesamt, easing: 'ease-out' }).onfinish = () => schleier.remove();

    karten.forEach(({ html, rect, neu }, i) => {
      const links = startX + i * (breite + luecke);
      const el = document.createElement('div');
      el.className = `gf-reihe${neu ? ' neu' : ''}`;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = html;
      Object.assign(el.style, { left: `${links}px`, top: `${oben}px`, width: `${breite}px`, height: `${hoehe}px` });
      document.body.appendChild(el);

      // 1. von der Stelle in der Übersicht in die Reihe
      const vonDort = `translate(${rect.left - links}px, ${rect.top - oben}px) scale(${rect.width / breite})`;
      el.animate([{ transform: vonDort }, { transform: 'none' }],
        { duration: REIHE, delay: i * 30, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });

      // 2. einzeln ins Album: die Kartenmitte landet auf dem Album-Knopf
      const klein = 0.14;
      const insZiel = `translate(${zx - links - (breite * klein) / 2}px, ${zy - oben - (hoehe * klein) / 2}px) scale(${klein}) rotate(-8deg)`;
      const flug = el.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-10px) scale(1.06)', opacity: 1, offset: 0.18 },
        { transform: insZiel, opacity: 0.5 },
      ], { duration: FLUG, delay: REIHE + PAUSE + i * ABSTAND, easing: 'cubic-bezier(.5,0,.75,.35)', fill: 'forwards' });
      flug.onfinish = () => {
        el.remove();
        ziel.classList.remove('gf-empfang');
        void ziel.offsetWidth;
        ziel.classList.add('gf-empfang');
        ton('tick');
        vibriere(8);
      };
    });
  }

  // ---------- Karten neigen sich, ein Holo-Glanz folgt ----------

  function setzeNeigung(el, e, staerke) {
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--rx', `${((0.5 - py) * staerke).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * staerke).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    el.classList.add('neigt');
  }

  function loeseNeigung(el) {
    el.classList.remove('neigt');
  }

  // Album am Computer: die Karte unter der Maus neigt sich
  function neigeBeiMaus(grid) {
    let aktiv = null;
    grid.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const karte = e.target.closest('.karte:not(.fehlt)');
      if (aktiv && aktiv !== karte) loeseNeigung(aktiv);
      aktiv = karte;
      if (karte) setzeNeigung(karte, e, 16);
    });
    grid.addEventListener('pointerleave', () => {
      if (aktiv) loeseNeigung(aktiv);
      aktiv = null;
    });
  }

  // ---------- Gross-Ansicht einer Karte ----------

  let fokusVorher = null; // nach dem Schliessen geht der Tastatur-Fokus dorthin zurück

  function zeigeKarte(id, anzahl) {
    const k = karteVonId(id);
    if (!k) return;
    fokusVorher = document.activeElement;
    const s = seltenheitVon(k.seltenheit);
    $('kv-karte').innerHTML = karteHtml(id);
    $('kv-karte').className = `kv-karte ruht rar-${s.id}`;
    zeigeVerwerten(id, anzahl);
    $('kv').hidden = false;
    document.body.classList.add('op-offen');
    ton('flip');
    vibriere(8);
    $('kv-zu').focus({ preventScroll: true });
  }

  // Knopf «Verwerten» unter der Karte: Preis immer sichtbar, aktiv erst ab 2 Stück
  function zeigeVerwerten(id, anzahl) {
    const knopf = $('kv-verwerten');
    knopf.dataset.id = id;
    knopf.classList.toggle('gesperrt', anzahl < 2);
    $('kv-verwerten-preis').textContent = `+${wertVon(id)}`;
    $('kv-verwerten-info').textContent = anzahl < 2 ? 'ab 2 Karten' : `${anzahl}× in deiner Sammlung`;
    knopf.setAttribute('aria-label', `Verwerten für ${wertVon(id)} RB Coins, ${anzahl}× in deiner Sammlung`);
  }

  function schliesseKarte() {
    if ($('kv').hidden) return;
    $('kv').hidden = true;
    // Das Pack-Fenster darunter kann noch offen sein
    if ($('opener').hidden && $('gewinn').hidden) document.body.classList.remove('op-offen');
    if (fokusVorher?.isConnected) fokusVorher.focus({ preventScroll: true });
    fokusVorher = null;
  }

  function bindeGrossAnsicht() {
    const buehne = $('kv-buehne');
    const karte = $('kv-karte');
    buehne.addEventListener('pointermove', (e) => {
      karte.classList.remove('ruht');
      setzeNeigung(karte, e, 34);
    });
    const ruhen = () => {
      loeseNeigung(karte);
      karte.classList.add('ruht');
    };
    buehne.addEventListener('pointerleave', ruhen);
    buehne.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') ruhen(); });
    buehne.addEventListener('pointercancel', ruhen);
    $('kv-zu').addEventListener('click', schliesseKarte);
    $('kv').addEventListener('click', (e) => { if (e.target === $('kv')) schliesseKarte(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseKarte(); });
  }

  // ---------- Start: Lichtpunkte steigen über den Alpen auf ----------

  function baueFunkeln() {
    const buehne = document.querySelector('#v-start .buehne');
    if (!buehne) return;
    const schicht = document.createElement('div');
    schicht.className = 'gf-funkeln';
    schicht.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--x', `${(Math.random() * 100).toFixed(1)}%`);
      p.style.setProperty('--g', `${(2 + Math.random() * 3).toFixed(1)}px`);
      p.style.setProperty('--drift', `${((Math.random() - 0.5) * 80).toFixed(0)}px`);
      p.style.setProperty('--dauer', `${(7 + Math.random() * 7).toFixed(1)}s`);
      p.style.setProperty('--warte', `${(-Math.random() * 14).toFixed(1)}s`);
      schicht.appendChild(p);
    }
    buehne.prepend(schicht);
  }

  function init() {
    const merken = () => { beruehrt = true; };
    document.addEventListener('pointerdown', merken, { once: true, capture: true });
    document.addEventListener('keydown', merken, { once: true, capture: true });
    baueFunkeln();
    bindeGrossAnsicht();
    neigeBeiMaus($('sam-karten'));
    // In der Übersicht nach dem Öffnen: Karte antippen zeigt sie gross
    $('op-karten').addEventListener('click', (e) => {
      const karte = e.target.closest('.karte');
      if (karte) zeigeKarte(karte.dataset.karte, besitz()[karte.dataset.karte] || 1);
    });
  }

  return { init, ton, radTicks, vibriere, konfetti, banner, muenzFlug, insAlbum, zeigeKarte, zeigeVerwerten };
})();
