/*
 * Erfolge: Ziele, die bleiben (anders als die Tagesaufgaben, die jeden Tag neu beginnen).
 * Jede Stufe bringt eine Belohnung, grosse Erfolge zusätzlich einen Titel fürs Konto.
 * Der Fortschritt kommt meist aus dem Spielstand (Karten, Packs, Level, Freunde): Was man schon vor den
 * Erfolgen gesammelt hat, zählt mit. Was der Spielstand nicht weiss, zählt Erfolge.zaehle(…).
 * Gespeichert in app.daten.erfolge (siehe store.js). Ziele und Belohnungen sind Platzhalter.
 */

const ERFOLG_GRUPPEN = [
  { id: 'sammeln', name: 'Sammeln' },
  { id: 'bahnen', name: 'Bahnen' },
  { id: 'packs', name: 'Packs' },
  { id: 'treue', name: 'Treue' },
  { id: 'freunde', name: 'Freunde' },
  { id: 'geheim', name: 'Geheim' },
];

// Name und Farbe der Stufen, wenn ein Erfolg mehrere hat
const ERFOLG_STUFEN = ['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Legende'];
const ERFOLG_STUFEN_FARBE = ['#B8733A', '#9AA3AD', '#D4A21A', '#4FB3D6', '#A77BF0', '#E3262E'];
// Farben der Seltenheiten wie in css/style.css (.rar-*), Special in Prisma-Blau statt Schwarz
const ERFOLG_RAR_FARBE = { epic: '#8A3FD1', mythic: '#C2402A', legendary: '#D4A017', special: '#4FACFE' };

const ANZAHL_BAHNEN = new Set(KARTEN.map((k) => k.bahn)).size;

// Ein Erfolg: wert(l) liest den Fortschritt aus der Lage (siehe lage() unten), stufen von leicht nach schwer.
// Belohnung wie bei den Tagesaufgaben: { muenzen }, { rubine } oder { pack }. Packs sind die zweiten Designs
// (silber-2, gold-2, platin-2), die es im Shop nicht gibt. album/seite: wohin ein Tipp auf den Erfolg führt.
const ERFOLGE = [
  // ---------- Sammeln ----------
  {
    id: 'sammler', gruppe: 'sammeln', name: 'Sammler', icon: 'i-album', album: {},
    text: (z) => (z === KARTEN.length ? `Sammle alle ${z} Karten` : `Sammle ${z} verschiedene Karten`),
    wert: (l) => l.verschieden,
    stufen: [
      { ziel: 10, belohnung: { muenzen: 25 } },
      { ziel: 50, belohnung: { muenzen: 75 } },
      { ziel: 100, belohnung: { rubine: 1 } },
      { ziel: 150, belohnung: { pack: 'silber-2' } },
      { ziel: 200, belohnung: { pack: 'gold-2' } },
      { ziel: KARTEN.length, belohnung: { pack: 'platin-2' }, titel: 'Komplett-Sammler' },
    ],
  },
  ...[['epic', { muenzen: 30 }], ['mythic', { muenzen: 60 }], ['legendary', { rubine: 1 }], ['special', { rubine: 2 }]]
    .map(([s, belohnung]) => ({
      id: `erste-${s}`, gruppe: 'sammeln', name: `Erste ${seltenheitVon(s).name}-Karte`, rar: s, album: { filter: s },
      text: () => `Finde eine ${seltenheitVon(s).name}-Karte`,
      wert: (l) => l.seltenheit[s] || 0,
      stufen: [{ ziel: 1, belohnung }],
    })),
  ...[['mythic', { pack: 'gold-2' }, 'Mythen-Sammler'], ['legendary', { pack: 'platin-2' }, 'Legenden-Jäger']]
    .map(([s, belohnung, titel]) => ({
      id: `alle-${s}`, gruppe: 'sammeln', name: `Alle ${seltenheitVon(s).name}`, rar: s, album: { filter: s },
      text: (z) => `Sammle alle ${z} ${seltenheitVon(s).name}-Karten`,
      wert: (l) => l.seltenheit[s] || 0,
      stufen: [{ ziel: KARTEN_NACH_SELTENHEIT[s].length, belohnung, titel }],
    })),
  {
    id: 'verwerter', gruppe: 'sammeln', name: 'Verwerter', bild: 'assets/muenzen/gold-rund.png', album: {},
    text: (z) => (z === 1 ? 'Verwerte eine doppelte Karte' : `Verwerte ${z} doppelte Karten`),
    wert: (l) => l.z.verwertet || 0,
    stufen: [
      { ziel: 1, belohnung: { muenzen: 10 } },
      { ziel: 25, belohnung: { muenzen: 50 } },
      { ziel: 100, belohnung: { pack: 'silber-2' } },
    ],
  },
  // ---------- Bahnen ----------
  {
    id: 'rundreise', gruppe: 'bahnen', name: 'Rundreise', icon: 'logo', album: {},
    text: (z) => (z === ANZAHL_BAHNEN ? `Finde eine Karte von jeder der ${z} Bahnen` : `Finde Karten von ${z} verschiedenen Bahnen`),
    wert: (l) => l.bahnen,
    stufen: [
      { ziel: 3, belohnung: { muenzen: 20 } },
      { ziel: 7, belohnung: { muenzen: 50 } },
      { ziel: ANZAHL_BAHNEN, belohnung: { pack: 'gold-2' }, titel: 'GA-Besitzer' },
    ],
  },
  // Jede Bahn komplett: je mehr Karten die Bahn hat, desto besser das Pack
  ...BAHNEN.filter((b) => KARTEN.some((k) => k.bahn === b)).map((b) => {
    const n = KARTEN.filter((k) => k.bahn === b).length;
    return {
      id: `bahn-${b.toLowerCase()}`, gruppe: 'bahnen', name: `${b} komplett`, bahn: b, album: { bahn: b },
      text: (z) => `Sammle alle ${z} Karten der ${b}`,
      wert: (l) => l.proBahn[b] || 0,
      stufen: [{ ziel: n, belohnung: { pack: n <= 8 ? 'silber-2' : n <= 25 ? 'gold-2' : 'platin-2' }, titel: `${b}-Kenner` }],
    };
  }),
  // ---------- Packs ----------
  {
    id: 'packs', gruppe: 'packs', name: 'Pack-Öffner', icon: 'i-pack-voll', seite: 'start',
    text: (z) => (z === 1 ? 'Öffne dein erstes Pack' : `Öffne ${z} Packs`),
    wert: (l) => l.geoeffnet,
    stufen: [
      { ziel: 1, belohnung: { muenzen: 10 } },
      { ziel: 10, belohnung: { muenzen: 30 } },
      { ziel: 50, belohnung: { rubine: 1 } },
      { ziel: 100, belohnung: { pack: 'gold-2' } },
      { ziel: 250, belohnung: { pack: 'platin-2' }, titel: 'Pack-Profi' },
    ],
  },
  {
    id: 'kunde', gruppe: 'packs', name: 'Stammkunde', icon: 'i-shop', seite: 'shop',
    text: (z) => (z === 1 ? 'Kaufe dein erstes Pack im Shop' : `Kaufe ${z} Packs im Shop`),
    wert: (l) => l.z.gekauft || 0,
    stufen: [
      { ziel: 1, belohnung: { muenzen: 15 } },
      { ziel: 10, belohnung: { muenzen: 50 } },
      { ziel: 50, belohnung: { rubine: 2 } },
    ],
  },
  {
    id: 'rad', gruppe: 'packs', name: 'Glücksrad', icon: 'i-rad', seite: 'rad',
    text: (z) => (z === 1 ? 'Dreh zum ersten Mal am Glücksrad' : `Dreh ${z}-mal am Glücksrad`),
    wert: (l) => l.rad,
    stufen: [
      { ziel: 1, belohnung: { muenzen: 10 } },
      { ziel: 10, belohnung: { muenzen: 25 } },
      { ziel: 50, belohnung: { rubine: 1 } },
      { ziel: 100, belohnung: { pack: 'gold-2' }, titel: 'Glücksritter' },
    ],
  },
  // ---------- Treue ----------
  {
    id: 'level', gruppe: 'treue', name: 'Sammler-Level', icon: 'i-stern', seite: 'konto',
    text: (z) => `Erreiche Sammler-Level ${z}`,
    wert: (l) => l.level,
    stufen: [
      { ziel: 5, belohnung: { muenzen: 50 } },
      { ziel: 10, belohnung: { pack: 'silber-2' } },
      { ziel: 15, belohnung: { pack: 'gold-2' } },
      { ziel: 20, belohnung: { pack: 'platin-2' }, titel: 'Lokführer' },
    ],
  },
  {
    id: 'serie', gruppe: 'treue', name: 'Treue Serie', icon: 'i-uhr',
    text: (z) => `Hol ${z} Tage in Folge die Tagesbelohnung ab`,
    wert: (l) => l.serie,
    stufen: [
      { ziel: 3, belohnung: { muenzen: 20 } },
      { ziel: 7, belohnung: { rubine: 1 } },
      { ziel: 14, belohnung: { pack: 'gold-2' } },
      { ziel: 30, belohnung: { pack: 'platin-2' }, titel: 'Stammgast' },
    ],
  },
  // ---------- Freunde ----------
  {
    id: 'freunde', gruppe: 'freunde', name: 'Freundeskreis', icon: 'i-teilen', seite: 'freunde',
    text: (z) => (z === 1 ? 'Füge einen Freund hinzu' : `Füge ${z} Freunde hinzu`),
    wert: (l) => l.freunde,
    stufen: [
      { ziel: 1, belohnung: { muenzen: 20 } },
      { ziel: 3, belohnung: { muenzen: 50 } },
      { ziel: 5, belohnung: { rubine: 1 } },
    ],
  },
  {
    id: 'schenken', gruppe: 'freunde', name: 'Grosszügig', icon: 'i-gift', seite: 'shop',
    text: (z) => (z === 1 ? 'Schenke einem Freund ein Pack' : `Schenke Freunden ${z} Packs`),
    wert: (l) => l.z.geschenkt || 0,
    stufen: [
      { ziel: 1, belohnung: { muenzen: 30 } },
      { ziel: 5, belohnung: { rubine: 2 } },
    ],
  },
  {
    id: 'beschenkt', gruppe: 'freunde', name: 'Beschenkt', icon: 'i-gift', seite: 'konto',
    text: () => 'Löse ein Geschenk von einem Freund ein',
    wert: (l) => l.beschenkt,
    stufen: [{ ziel: 1, belohnung: { muenzen: 30 } }],
  },
  // ---------- Geheim: was man tun muss, steht erst da, wenn man es geschafft hat ----------
  {
    id: 'doppelt', gruppe: 'geheim', geheim: true, name: 'Doppelt hält besser', icon: 'i-album',
    text: () => 'Zwei gleiche Karten in einem Pack',
    wert: (l) => l.z.doppeltImPack || 0,
    stufen: [{ ziel: 1, belohnung: { muenzen: 25 } }],
  },
  {
    id: 'volltreffer', gruppe: 'geheim', geheim: true, name: 'Volltreffer', icon: 'i-stern',
    text: () => 'Eine Legendary-Karte aus einem Basis-Pack',
    wert: (l) => l.z.legendaryBasis || 0,
    stufen: [{ ziel: 1, belohnung: { rubine: 2 } }],
  },
  {
    id: 'nachtzug', gruppe: 'geheim', geheim: true, name: 'Nachtzug', icon: 'i-uhr',
    text: () => 'Ein Pack zwischen Mitternacht und 5 Uhr öffnen',
    wert: (l) => l.z.nachtzug || 0,
    stufen: [{ ziel: 1, belohnung: { muenzen: 40 } }],
  },
];

const Erfolge = (() => {
  let gruppe = null;        // Filter oben auf der Seite (null = alle)
  let wartend = [];         // eben geschaffte Stufen, die noch gemeldet werden
  let ersteMeldung = false; // beim ersten Start: eine gemeinsame Meldung für alles, was man schon geschafft hat
  let wiederholen = null;

  const daten = () => app.daten.erfolge;
  const schluessel = (e, i) => `${e.id}-${i + 1}`;
  const ALLE_STUFEN = ERFOLGE.flatMap((e) => e.stufen.map((s, i) => ({ e, s, i, key: schluessel(e, i) })));
  const geschafft = (key) => !!daten().geschafft[key];
  const abgeholt = (key) => !!daten().abgeholt[key];
  const bereit = (key) => geschafft(key) && !abgeholt(key);
  const stufenName = (e, i) => (e.stufen.length > 1 ? `${e.name} · ${ERFOLG_STUFEN[i]}` : e.name);
  const datum = (ms) => new Date(ms).toLocaleDateString('de-CH');

  // Was der Spielstand über den Fortschritt weiss (einmal pro Prüfung ausgerechnet)
  function lage() {
    const proBahn = {};
    const seltenheit = {};
    const verschieden = new Set(app.daten.karten.filter((id) => karteVonId(id)));
    verschieden.forEach((id) => {
      const k = karteVonId(id);
      proBahn[k.bahn] = (proBahn[k.bahn] || 0) + 1;
      seltenheit[k.seltenheit] = (seltenheit[k.seltenheit] || 0) + 1;
    });
    return {
      verschieden: verschieden.size,
      proBahn,
      bahnen: Object.keys(proBahn).length,
      seltenheit,
      geoeffnet: app.daten.geoeffnet,
      rad: app.daten.radDrehungen || 0,
      level: levelVon(app.daten.xp).level,
      serie: daten().zaehler.serie || 0,
      freunde: app.daten.freunde.length,
      beschenkt: app.daten.eingeloest.filter((c) => c.startsWith('RBG-')).length,
      z: daten().zaehler,
    };
  }

  // Zählt, was der Spielstand nicht weiss, z. B. zaehle('verwertet') nach dem Verwerten einer Karte
  function zaehle(art, n = 1) {
    if (n <= 0) return;
    daten().zaehler[art] = (daten().zaehler[art] || 0) + n;
    speichern();
  }

  // Neu erreichte Stufen als geschafft merken. Das bleibt, auch wenn der Wert später sinkt (z. B. Freund entfernt).
  function pruefe() {
    const d = daten();
    // beste Serie und ein Geschenk von vor den Erfolgen aus dem Spielstand übernehmen
    d.zaehler.serie = Math.max(d.zaehler.serie || 0, app.daten.taeglich.serie || 0);
    if (app.daten.geschenkZeit && !d.zaehler.geschenkt) d.zaehler.geschenkt = 1;
    const l = lage();
    const neu = ALLE_STUFEN.filter((x) => !geschafft(x.key) && x.e.wert(l) >= x.s.ziel);
    if (!neu.length && d.bekannt) return;
    const jetzt = Date.now();
    neu.forEach((x) => { d.geschafft[x.key] = jetzt; });
    if (!d.bekannt) {
      d.bekannt = true;
      ersteMeldung = neu.length > 0;
    }
    wartend.push(...neu);
    speichern();
    meldeWennFrei();
  }

  // Meldung erst zeigen, wenn kein Pack offen ist, das Rad nicht dreht und kein anderer Hinweis läuft
  function meldeWennFrei() {
    clearTimeout(wiederholen);
    if (!wartend.length) return;
    const frei = $('opener').hidden && $('gewinn').hidden && !$('rad-buehne').classList.contains('dreht')
      && !$('hinweis').classList.contains('sichtbar');
    if (!frei) {
      wiederholen = setTimeout(meldeWennFrei, 800);
      return;
    }
    const x = wartend[0];
    let text = `Erfolg geschafft: ${stufenName(x.e, x.i)}! Hol dir ${Taeglich.belohnungText(x.s.belohnung)} unter Mehr → Erfolge ab.`;
    if (wartend.length > 1) text = `${wartend.length} Erfolge geschafft! Hol dir die Belohnungen unter Mehr → Erfolge ab.`;
    if (ersteMeldung) text = `Du hast schon ${wartend.length} Erfolg${wartend.length > 1 ? 'e' : ''} geschafft! Hol dir die Belohnungen unter Mehr → Erfolge ab.`;
    zeigeHinweis(text);
    Gefuehl.ton('gewinn');
    Gefuehl.vibriere([30, 40, 60]);
    wartend = [];
    ersteMeldung = false;
  }

  function etwasBereit() {
    return ALLE_STUFEN.some((x) => bereit(x.key));
  }

  // Belohnung einer geschafften Stufe abholen. knopf: von dort fliegen die Münzen zur Anzeige oben
  function hole(key, knopf) {
    const x = ALLE_STUFEN.find((y) => y.key === key);
    if (!x || !bereit(key)) return;
    const { belohnung, titel } = x.s;
    daten().abgeholt[key] = Date.now();
    Taeglich.gib(belohnung, knopf);
    if (titel) app.daten.titel = titel;
    speichern();
    aktualisiereAlles();
    const gross = !!(titel || belohnung.pack);
    Gefuehl.ton(gross ? 'levelup' : 'muenze');
    Gefuehl.vibriere(gross ? [30, 40, 80] : 20);
    if (gross) Gefuehl.konfetti(['#ffd34d', '#ff4251', '#ffffff', '#4aa3ff'], titel ? 80 : 50);
    zeigeHinweis(`${stufenName(x.e, x.i)}: ${Taeglich.belohnungText(belohnung)}${belohnung.pack ? ' liegt in deinem Vorrat' : ''}`
      + `${titel ? `. Neuer Titel: ${titel}` : ''}!`);
  }

  // Tipp auf einen Erfolg: zum Album (mit passendem Filter) oder zur Seite, auf der man ihn schafft
  function oeffneZiel(id) {
    const e = ERFOLGE.find((x) => x.id === id);
    if (!e) return;
    if (e.album) {
      app.filter = e.album.filter || null;
      $('al-bahn').value = e.album.bahn || '';
      $('al-suche').value = '';
      $('al-nur-meine').checked = false;
      location.hash = 'album';
    } else if (e.seite) {
      location.hash = e.seite;
    }
  }

  // ---------- Anzeige ----------

  // Eine Zeile pro Erfolg; bei mehreren Stufen zählt die erste, die noch nicht abgeholt ist
  function zeile(e, l) {
    const offen = e.stufen.findIndex((s, i) => !abgeholt(schluessel(e, i)));
    const nr = offen < 0 ? e.stufen.length - 1 : offen;
    const s = e.stufen[nr];
    const key = schluessel(e, nr);
    let zustand = 'offen';
    if (offen < 0) zustand = 'fertig';
    else if (bereit(key)) zustand = 'bereit';
    else if (e.geheim) zustand = 'geheim';
    return { e, s, nr, key, zustand, wert: Math.min(e.wert(l), s.ziel) };
  }

  function zeileHtml({ e, s, nr, key, zustand, wert }) {
    const mehrere = e.stufen.length > 1;
    let farbe = '#D4A21A';
    if (e.bahn) farbe = BAHN_FARBE[e.bahn] || farbe;
    else if (e.rar) farbe = ERFOLG_RAR_FARBE[e.rar];
    else if (mehrere) farbe = ERFOLG_STUFEN_FARBE[nr];

    let medaille = `<svg width="24" height="24"><use href="#${e.icon || 'i-stern'}"/></svg>`;
    if (zustand === 'geheim') medaille = '<b>?</b>';
    else if (e.bahn) medaille = `<b class="${e.bahn.length > 4 ? 'lang' : ''}">${e.bahn === 'Zentralbahn' ? 'zb' : e.bahn}</b>`;
    else if (e.bild) medaille = `<img src="${e.bild}" alt="">`;

    const geheim = zustand === 'geheim';
    const name = geheim ? 'Geheimer Erfolg' : stufenName(e, nr);
    let text = e.text(s.ziel);
    if (geheim) text = 'Wird verraten, sobald du ihn schaffst';
    if (zustand === 'fertig') text = mehrere ? 'Alle Stufen geschafft' : `Geschafft am ${datum(daten().geschafft[key])}`;
    const stufen = mehrere
      ? `<span class="erf-stufen" aria-label="Stufe ${nr + 1} von ${e.stufen.length}">${e.stufen.map((x, j) =>
        `<i class="${abgeholt(schluessel(e, j)) ? 'an' : ''}"></i>`).join('')}</span>`
      : '';
    const titel = s.titel && !geheim && zustand !== 'fertig' ? `<small class="erf-titel">+ Titel «${s.titel}»</small>` : '';
    const balken = zustand === 'offen'
      ? `<span class="tb-balken" aria-hidden="true"><i style="width:${(wert / s.ziel) * 100}%"></i></span>`
      : '';
    const inneres = `<b>${name}</b>${stufen}<small>${text}</small>${titel}${balken}`;
    const mitte = (e.album || e.seite) && !geheim
      ? `<button class="erf-text" type="button" data-ziel="${e.id}">${inneres}</button>`
      : `<div class="erf-text">${inneres}</div>`;

    let rechts = '<span class="tb-erledigt">Erledigt</span>';
    if (zustand === 'bereit') rechts = `<button class="tb-abholen" type="button" data-abholen="${key}">Abholen</button>`;
    if (zustand === 'offen') rechts = `<span class="tb-stand">${tausender(wert)} / ${tausender(s.ziel)}</span>`;
    if (geheim) rechts = '';
    const b = s.belohnung;
    const lohn = zustand === 'fertig' ? ''
      : `<span class="tb-lohn"><img class="${b.pack ? 'ist-pack' : ''}" src="${Taeglich.belohnungBild(b)}" alt="">${Taeglich.belohnungKurz(b)}</span>`;

    return `
      <li class="erf ${zustand}" style="--erf:${farbe}">
        <span class="erf-medaille" aria-hidden="true">${medaille}</span>
        ${mitte}
        <div class="erf-rechts">${lohn}${rechts}</div>
      </li>`;
  }

  function zeichneSeite(anzahl, offen) {
    $('erf-anzahl').textContent = `${anzahl} von ${ALLE_STUFEN.length} geschafft`;
    $('erf-balken').style.width = `${(anzahl / ALLE_STUFEN.length) * 100}%`;
    $('erf-bereit').textContent = offen
      ? `${offen} Belohnung${offen > 1 ? 'en' : ''} bereit`
      : 'Spiel weiter, der Fortschritt zählt von selbst.';
    $('erf-filter').querySelectorAll('[data-gruppe]').forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.gruppe || null) === gruppe)));
    // Reihenfolge: zuerst zum Abholen, dann in Arbeit, dann geheim, zuletzt erledigt
    const ORDNUNG = { bereit: 0, offen: 1, geheim: 2, fertig: 3 };
    const l = lage();
    $('erf-liste').innerHTML = ERFOLGE.filter((e) => !gruppe || e.gruppe === gruppe)
      .map((e) => zeile(e, l))
      .sort((a, b) => ORDNUNG[a.zustand] - ORDNUNG[b.zustand])
      .map(zeileHtml).join('');
  }

  // Konto: der gewählte Titel unter dem Namen, zur Wahl stehen alle abgeholten Titel
  function zeichneTitel() {
    const titel = ALLE_STUFEN.filter((x) => x.s.titel && abgeholt(x.key)).map((x) => x.s.titel);
    const aktiv = titel.includes(app.daten.titel) ? app.daten.titel : '';
    $('profil-titel').textContent = aktiv ? `«${aktiv}»` : '';
    $('profil-titel').hidden = !aktiv;
    $('titel-wahl').hidden = !titel.length;
    const wahl = $('konto-titel');
    const liste = ['', ...titel];
    if (wahl.dataset.liste !== liste.join('|')) {
      wahl.innerHTML = liste.map((t) => `<option value="${esc(t)}">${t ? esc(t) : 'Kein Titel'}</option>`).join('');
      wahl.dataset.liste = liste.join('|');
    }
    wahl.value = aktiv;
  }

  // Wird von aktualisiereAlles aufgerufen: prüft neue Erfolge, Eintrag auf der Mehr-Seite, Seite und Konto
  function zeichne() {
    pruefe();
    const anzahl = ALLE_STUFEN.filter((x) => geschafft(x.key)).length;
    const offen = ALLE_STUFEN.filter((x) => bereit(x.key)).length;
    // Mehr-Seite: rote Zahl neben «Erfolge», sobald etwas zum Abholen bereit ist
    const zahl = $('erf-eintrag-text');
    if (zahl.textContent !== String(offen)) {
      zahl.textContent = offen;
      zahl.classList.remove('neu');
      void zahl.offsetWidth; // Hüpfer neu starten, wenn die Zahl wächst
      if (offen) zahl.classList.add('neu');
    }
    zahl.hidden = !offen;
    $('erf-oeffnen').setAttribute('aria-label', offen
      ? `Erfolge, ${offen} Belohnung${offen > 1 ? 'en' : ''} bereit`
      : `Erfolge, ${anzahl} von ${ALLE_STUFEN.length} geschafft`);
    zeichneTitel();
    if (app.ansicht === 'erfolge') zeichneSeite(anzahl, offen);
  }

  function init() {
    $('erf-filter').innerHTML = [{ id: '', name: 'Alle' }, ...ERFOLG_GRUPPEN].map((g) =>
      `<button type="button" data-gruppe="${g.id}" aria-pressed="false">${g.name}</button>`).join('');
    $('erf-filter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-gruppe]');
      if (!b) return;
      gruppe = b.dataset.gruppe || null;
      Gefuehl.ton('tick');
      zeichne();
    });
    $('erf-liste').addEventListener('click', (e) => {
      const abholen = e.target.closest('[data-abholen]');
      if (abholen) return hole(abholen.dataset.abholen, abholen);
      const ziel = e.target.closest('[data-ziel]');
      if (ziel) oeffneZiel(ziel.dataset.ziel);
    });
    $('konto-titel').addEventListener('change', (e) => {
      app.daten.titel = e.target.value;
      speichern();
      zeichneTitel();
    });
  }

  return { init, zaehle, zeichne, etwasBereit };
})();
