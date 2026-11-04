/*
 * Tauschen unter Freunden, direkt in der App (Stufe 2, mit der Online-Datenbank).
 * Regeln: nur doppelte Karten (eine bleibt immer im Album), nur gleiche Seltenheit 1 gegen 1,
 * keine Special-Karten, höchstens TAUSCH_MAX_OFFEN eigene offene Anfragen, Anfragen verfallen nach 48 Stunden.
 *
 * Den Tausch selbst macht später der Server: nur er sieht die Sammlung eines Freundes und tauscht beide Karten
 * gleichzeitig. Alles, was der Server macht, steht darum in einem Server-Objekt mit immer denselben Funktionen
 * (SERVER_OHNE und testServer unten). Für die Datenbank kommt nur eine weitere Fassung dazu. Bis dahin:
 *  - auf der echten Seite: «Tauschen startet mit dem Anmelden»; die Wunschliste geht schon (lokal gespeichert),
 *  - in der Vorschau (TEST_ERLAUBT in js/app.js): ein Test-Freund im Browser, damit man alles ausprobieren kann.
 *
 * Eine Anfrage: { id, von, an, gibt (Karte von «von»), will (Karte von «an»), status, zeit }
 * status: 'offen' | 'angenommen' | 'abgelehnt' | 'zurueckgezogen' | 'abgelaufen' | 'ungueltig'
 */

const TAUSCH_MAX_OFFEN = 3;
// Lichtfarbe der Tausch-Szene je Seltenheit der neuen Karte
const TAUSCH_LICHT = {
  common: '#cfd6dd', uncommon: '#3ddc84', rare: '#4f9bff', epic: '#b06bff', mythic: '#ff6a2a', legendary: '#ffd34d',
};
const TAUSCH_DAUER = 48 * 60 * 60 * 1000;
const TEST_FREUND = 'RB-TEST-TAUS';

// Darf man diese Karte gegen jene tauschen? null = ja, sonst der Grund. anzahl: wie oft der Gebende seine Karte hat
function tauschFehler(gibt, will, anzahl) {
  const a = karteVonId(gibt);
  const b = karteVonId(will);
  if (!a || !b) return 'Diese Karte gibt es nicht mehr.';
  if (gibt === will) return 'Das ist dieselbe Karte.';
  if (a.seltenheit === 'special' || b.seltenheit === 'special') return 'Special-Karten kann man nicht tauschen.';
  if (a.seltenheit !== b.seltenheit) return 'Getauscht wird nur in der gleichen Seltenheit.';
  if (anzahl < 2) return 'Tauschen geht nur mit doppelten Karten. Eine bleibt immer im Album.';
  return null;
}

// Eigene Karten, die man tauschen kann: doppelt und keine Special-Karte
function tauschKarten() {
  const n = besitz();
  return KARTEN.filter((k) => n[k.id] >= 2 && k.seltenheit !== 'special').map((k) => k.id);
}

// ---------- Server ----------

// Echte Seite, solange es keine Datenbank gibt
const SERVER_OHNE = {
  bereit: false,
  freunde: () => [],
  sammlungVon: async () => null,
  anfragen: async () => [],
  sende: async () => { throw new Error('ohne-server'); },
  antworte: async () => { throw new Error('ohne-server'); },
  zurueckziehen: async () => { throw new Error('ohne-server'); },
};

// Nur Vorschau: ein Test-Freund im Browser spielt den Server nach (eigener Speicher sk-tausch-test).
// geaendert(anfrage) meldet, wenn der Test-Freund auf eine Anfrage geantwortet hat.
function testServer(geaendert) {
  const SCHLUESSEL = 'sk-tausch-test';
  const ich = () => app.daten.spielerId;
  const mische = (liste) => liste.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  let stand = { naechste: 1, anfragen: [], freund: null };
  try {
    const d = JSON.parse(localStorage.getItem(SCHLUESSEL));
    if (d && Array.isArray(d.anfragen)) stand = d;
  } catch (e) { /* neu anfangen */ }

  function sichern() {
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(stand)); } catch (e) { /* ignorieren */ }
  }

  // Sammlung des Test-Freunds: je Seltenheit ein paar doppelte Karten, am liebsten solche, die dir fehlen
  function freund() {
    if (stand.freund) return stand.freund;
    const n = besitz();
    const doppelte = [];
    SELTENHEITEN.filter((s) => s.id !== 'special').forEach((s) => {
      const alle = KARTEN_NACH_SELTENHEIT[s.id];
      const fehlend = alle.filter((k) => !n[k.id]);
      doppelte.push(...mische(fehlend.length >= 3 ? fehlend : alle).slice(0, s.id === 'legendary' ? 2 : 4).map((k) => k.id));
    });
    stand.freund = { doppelte, wunsch: mische(tauschKarten()).slice(0, 4) };
    sichern();
    return stand.freund;
  }

  // Ein angenommener Tausch: beide Seiten gleichzeitig (so macht es später der Server)
  function fuehreAus(a) {
    const duGibst = a.von === ich() ? a.gibt : a.will;
    const duBekommst = a.von === ich() ? a.will : a.gibt;
    const f = freund();
    const i = f.doppelte.indexOf(duBekommst);
    if (i < 0 || tauschFehler(duGibst, duBekommst, besitz()[duGibst] || 0)) return false;
    f.doppelte.splice(i, 1);
    f.wunsch = f.wunsch.filter((id) => id !== duGibst);
    const neu = !app.daten.karten.includes(duBekommst);
    app.daten.karten.splice(app.daten.karten.indexOf(duGibst), 1);
    app.daten.karten.push(duBekommst);
    if (neu) app.daten.ungesehen.push(duBekommst);
    app.daten.wunschliste = app.daten.wunschliste.filter((id) => id !== duBekommst);
    speichern();
    return true;
  }

  // Der Test-Freund schickt dir selbst eine Anfrage, wenn du die Tausch-Seite öffnest,
  // keine von ihm offen ist und seine letzte mindestens eine Minute her ist
  function vielleichtAnfrage() {
    if (app.ansicht !== 'tauschen') return;
    const vonIhm = stand.anfragen.filter((a) => a.an === ich());
    if (vonIhm.some((a) => a.status === 'offen' || Date.now() - a.zeit < 60 * 1000)) return;
    const f = freund();
    const n = besitz();
    for (const will of mische(tauschKarten())) {
      const s = karteVonId(will).seltenheit;
      const passend = f.doppelte.filter((id) => karteVonId(id) && karteVonId(id).seltenheit === s && id !== will);
      if (!passend.length) continue;
      const gibt = passend.find((id) => !n[id]) || passend[0];
      stand.anfragen.push({ id: stand.naechste++, von: TEST_FREUND, an: ich(), gibt, will, status: 'offen', zeit: Date.now() });
      return;
    }
  }

  const finde = (id) => stand.anfragen.find((a) => a.id === id);

  return {
    bereit: true,
    test: true,
    // nur der Test-Freund tauscht in der Vorschau wirklich (zuerst unter Freunde seine Anfrage annehmen)
    freunde: () => app.daten.freunde.map((id) => ({ ...freundProfil(id), bereit: id === TEST_FREUND })),
    async sammlungVon(id) {
      if (id !== TEST_FREUND) return null;
      const f = freund();
      return { doppelte: [...f.doppelte], wunschliste: [...f.wunsch] };
    },
    async anfragen() {
      stand.anfragen.forEach((a) => {
        if (a.status === 'offen' && Date.now() - a.zeit > TAUSCH_DAUER) a.status = 'abgelaufen';
      });
      vielleichtAnfrage();
      sichern();
      return stand.anfragen.map((a) => ({ ...a }));
    },
    async sende({ an, gibt, will }) {
      if (stand.anfragen.filter((a) => a.status === 'offen' && a.von === ich()).length >= TAUSCH_MAX_OFFEN) {
        throw new Error(`Du hast schon ${TAUSCH_MAX_OFFEN} offene Anfragen.`);
      }
      const fehler = tauschFehler(gibt, will, besitz()[gibt] || 0);
      if (fehler) throw new Error(fehler);
      const a = { id: stand.naechste++, von: ich(), an, gibt, will, status: 'offen', zeit: Date.now() };
      stand.anfragen.push(a);
      sichern();
      // Der Test-Freund antwortet nach ein paar Sekunden, meistens mit Ja
      setTimeout(() => {
        if (a.status !== 'offen') return;
        a.status = Math.random() < 0.85 && fuehreAus(a) ? 'angenommen' : 'abgelehnt';
        sichern();
        geaendert({ ...a });
      }, 4000);
      return { ...a };
    },
    async antworte(id, ja) {
      const a = finde(id);
      if (!a || a.status !== 'offen' || a.an !== ich()) throw new Error('Diese Anfrage ist nicht mehr offen.');
      if (ja) a.status = fuehreAus(a) ? 'angenommen' : 'ungueltig';
      else a.status = 'abgelehnt';
      sichern();
      return { ...a };
    },
    async zurueckziehen(id) {
      const a = finde(id);
      if (!a || a.status !== 'offen' || a.von !== ich()) throw new Error('Diese Anfrage ist nicht mehr offen.');
      a.status = 'zurueckgezogen';
      sichern();
      return { ...a };
    },
  };
}

// Name, Level, Titel und Profilbild eines Freundes (js/freunde.js), sonst nur die ID
function freundProfil(id) {
  const p = Freunde.profil(id);
  const level = (p && p.level) || 1;
  return {
    id,
    name: (p && p.name) || (id === TEST_FREUND ? 'Test-Freund' : id),
    level,
    titel: (p && p.titel) || titelFuerLevel(level),
    bild: (p && p.bild) || '',
  };
}

// Angenommenen Tausch im eigenen Spielstand umsetzen, genau einmal (app.daten.tauschErledigt). true = jetzt umgesetzt
function setzeTauschUm(a) {
  const erledigt = app.daten.tauschErledigt;
  if (erledigt.includes(a.id)) return false;
  const vonMir = a.von === app.daten.spielerId;
  const duGibst = vonMir ? a.gibt : a.will;
  const duBekommst = vonMir ? a.will : a.gibt;
  const i = app.daten.karten.indexOf(duGibst);
  if (i >= 0) app.daten.karten.splice(i, 1);
  if (karteVonId(duBekommst)) {
    if (!app.daten.karten.includes(duBekommst)) app.daten.ungesehen.push(duBekommst);
    app.daten.karten.push(duBekommst);
  }
  app.daten.wunschliste = app.daten.wunschliste.filter((id) => id !== duBekommst);
  erledigt.push(a.id);
  if (erledigt.length > 300) erledigt.splice(0, erledigt.length - 300);
  speichern();
  return true;
}

// Online (Supabase, js/online.js und werkzeuge/datenbank.sql): der Server prüft beide Sammlungen und entscheidet,
// jedes Spiel setzt einen angenommenen Tausch danach genau einmal um (setzeTauschUm).
// geaendert(anfrage): dein Freund hat angenommen (Szene) oder abgelehnt (Hinweis).
function onlineServer(geaendert) {
  const ich = () => app.daten.spielerId;
  let vorher = null; // Status beim letzten Laden: «abgelehnt» nur melden, wenn es seither neu ist
  const alsAnfrage = (z) => {
    const zeit = Date.parse(z.zeit);
    const status = z.status === 'offen' && Date.now() - zeit > TAUSCH_DAUER ? 'abgelaufen' : z.status;
    return { id: z.id, von: z.von_id, an: z.an_id, gibt: z.gibt, will: z.will, status, zeit };
  };

  return {
    bereit: true,
    test: false,
    freunde: () => app.daten.freunde.map((id) => ({ ...freundProfil(id), bereit: true })),
    async sammlungVon(id) {
      const r = await Online.rpc('sammlung_von', { freund: id });
      return r && { doppelte: r.doppelte || [], wunschliste: r.wunschliste || [] };
    },
    async anfragen() {
      const liste = (await Online.tauschAnfragen()).map(alsAnfrage);
      liste.forEach((a) => {
        if (a.status === 'angenommen') {
          if (setzeTauschUm(a) && a.von === ich()) geaendert(a);
        } else if (vorher && a.von === ich() && a.status === 'abgelehnt' && vorher.get(a.id) === 'offen') {
          geaendert(a);
        }
      });
      vorher = new Map(liste.map((a) => [a.id, a.status]));
      return liste;
    },
    async sende({ an, gibt, will }) {
      const fehler = tauschFehler(gibt, will, besitz()[gibt] || 0);
      if (fehler) throw new Error(fehler);
      await Online.sichere(); // der Server prüft den gespeicherten Spielstand
      return alsAnfrage(await Online.rpc('tausch_senden', { freund: an, karte_gibt: gibt, karte_will: will }));
    },
    async antworte(id, ja) {
      await Online.sichere();
      const a = alsAnfrage(await Online.rpc('tausch_antworten', { anfrage: id, annehmen: ja }));
      if (a.status === 'angenommen') setzeTauschUm(a);
      return a;
    },
    async zurueckziehen(id) {
      return alsAnfrage(await Online.rpc('tausch_zurueckziehen', { anfrage: id }));
    },
  };
}

// ---------- Tausch-Seite, Tausch-Fenster und Wunschliste ----------

const Tauschen = (() => {
  let server = SERVER_OHNE;
  let anfragen = [];      // zuletzt vom Server geladen
  let ladeNr = 0;
  let warOffen = false;   // war die Tausch-Seite beim letzten Zeichnen schon offen?
  let reiter = 'anfragen'; // Anfragen, Tauschen oder Vergangen
  let reiterGewaehlt = false; // hat man seit dem Öffnen der Seite selbst einen Reiter angetippt?
  let fenster = null;     // Tausch-Fenster: { schritt, freund, sammlung, will, gibt }

  const ich = () => app.daten.spielerId;
  const nameVon = (id) => freundProfil(id).name;
  const titelVon = (id) => kartenTitel(karteVonId(id)).gross;
  const offenFuerMich = () => anfragen.filter((a) => a.status === 'offen' && a.an === ich()).length;
  const offenVonMir = () => anfragen.filter((a) => a.status === 'offen' && a.von === ich()).length;

  function etwasBereit() {
    return offenFuerMich() > 0;
  }

  // Wie oft diese Karte in deinen offenen Anfragen steckt (so lange kann man sie nicht verwerten)
  function reserviert(id) {
    return anfragen.filter((a) => a.status === 'offen' && a.von === ich() && a.gibt === id).length;
  }

  // js/online.js ist verbunden: ab jetzt tauscht der Server (auch in der Vorschau, dort ohne Test-Freund)
  function verbunden() {
    server = onlineServer(geaendert);
    lade();
  }

  const standardReiter = () => (anfragen.some((a) => a.status === 'offen') ? 'anfragen' : 'tauschen');

  async function lade() {
    const nr = ++ladeNr;
    let liste;
    try {
      liste = await server.anfragen();
    } catch (e) {
      return; // gerade keine Verbindung: beim nächsten Mal
    }
    if (nr !== ladeNr) return;
    anfragen = liste;
    if (app.ansicht === 'tauschen' && !reiterGewaehlt) waehleReiter(standardReiter());
    zeichne();
    zeichnePunkte();
  }

  // Fehler vom Server als Hinweis zeigen; gibt das Ergebnis oder null zurück
  async function aktion(fn, knopf) {
    if (knopf) knopf.disabled = true;
    try {
      return await fn();
    } catch (e) {
      zeigeHinweis(e.message === 'ohne-server' ? 'Tauschen startet mit dem Anmelden.' : e.message);
      return null;
    } finally {
      if (knopf && knopf.isConnected) knopf.disabled = false;
    }
  }

  // Der Test-Freund (später der Server) hat auf deine Anfrage geantwortet
  function geaendert(a) {
    lade();
    if (a.status === 'angenommen') {
      aktualisiereAlles();
      spieleSzene('tausch', a);
    } else {
      zeigeHinweis(`${nameVon(a.an)} hat deinen Tausch abgelehnt.`);
    }
  }

  async function annehmen(id, knopf) {
    const a = await aktion(() => server.antworte(id, true), knopf);
    if (!a) return;
    lade();
    aktualisiereAlles();
    if (a.status === 'angenommen') spieleSzene('tausch', a);
    else zeigeHinweis('Dieser Tausch geht nicht mehr: Eine der Karten ist nicht mehr doppelt da.');
  }

  // ---------- Tausch-Szene über den ganzen Bildschirm ----------
  // «tausch»: deine Karte steigt aus dem Album-Knopf im Menü, die Karte des Freundes kommt von oben, sie tauschen
  // die Plätze, deine fliegt zum Freund, die neue in den Album-Knopf. «gesendet»: beide Karten fliegen zum Freund.
  // Das Menü bleibt dabei über der Szene sichtbar (body.tausch-laeuft, css/tauschen.css).
  // Antippen springt ans Ende. Kommen mehrere Szenen kurz nacheinander, warten sie, bis die vorige fertig ist.
  const szenen = [];
  let szene = null; // { art, uhren, ende }

  // Album-Knopf im Menü: auf dem Handy unten zwischen Rad und Start, auf dem Computer oben
  const albumKnopf = () => document.querySelector('.tabbar [data-tab="album"]');

  // Wege der Karten von der Mitte (46 % der Höhe) zum Album-Knopf und zum Freund oben, in Pixeln gemessen
  function messeWege(el) {
    const weg = (ziel) => {
      const r = ziel.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2 - innerWidth / 2);
      const y = Math.round(r.top + r.height / 2 - innerHeight * 0.46);
      return `translate(${x}px, ${y}px) scale(.12)`;
    };
    const knopf = albumKnopf();
    el.style.setProperty('--ts-album', weg(knopf.querySelector('svg') || knopf));
    el.style.setProperty('--ts-freund', weg($('ts-avatar')));
  }

  // Der Album-Knopf hüpft, wenn eine Karte herauskommt oder hineinfliegt
  function knopfHops() {
    const knopf = albumKnopf();
    knopf.classList.remove('ts-hops');
    void knopf.offsetWidth;
    knopf.classList.add('ts-hops');
  }

  function spieleSzene(art, a) {
    szenen.push({ art, a });
    naechsteSzene();
  }

  const fensterOffen = () => !$('opener').hidden || !$('gewinn').hidden || !$('kv').hidden || !$('tausch-fenster').hidden;

  function naechsteSzene() {
    if (szene || !szenen.length) return;
    if (fensterOffen()) {
      setTimeout(naechsteSzene, 800);
      return;
    }
    const { art, a } = szenen.shift();
    const vonMir = a.von === ich();
    const gibst = vonMir ? a.gibt : a.will;
    const bekommst = vonMir ? a.will : a.gibt;
    const wer = nameVon(vonMir ? a.an : a.von);
    const neu = art === 'tausch' && besitz()[bekommst] === 1 && app.daten.ungesehen.includes(bekommst);
    const el = $('tausch-szene');
    $('ts-gibst').innerHTML = karteHtml(gibst);
    $('ts-bekommst').innerHTML = karteHtml(bekommst);
    $('ts-freund-name').textContent = wer;
    // Profilbild des Freundes (js/freunde.js), sonst sein Anfangsbuchstabe
    const bild = profilbildVon(freundProfil(vonMir ? a.an : a.von).bild);
    $('ts-avatar').textContent = bild ? bild.zeichen : wer.replace(/^RB-/, '').charAt(0);
    $('ts-avatar').classList.toggle('mit-bild', !!bild);
    $('ts-avatar').style.setProperty('--pb', bild ? bild.farbe : '');
    el.dataset.art = art;
    el.dataset.phase = 'start';
    const farbe = TAUSCH_LICHT[karteVonId(bekommst).seltenheit] || '#ffd34d';
    el.style.setProperty('--licht', farbe);
    $('ts-text').textContent = '';
    $('ts-weiter').hidden = true;
    el.hidden = false;
    document.body.classList.add('op-offen', 'tausch-laeuft');
    albumKnopf().style.setProperty('--licht', farbe);
    messeWege(el);
    // Fotos schon laden, bevor die Karten ins Bild fliegen
    el.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });

    const phase = (name, text, ton) => {
      el.dataset.phase = name;
      if (text) $('ts-text').textContent = text;
      if (ton) Gefuehl.ton(ton);
    };
    const ende = () => {
      szene.uhren.forEach(clearTimeout);
      szene.uhren = [];
      if (art === 'gesendet') return schliesseSzene();
      phase('fertig', `${titelVon(bekommst)} ist jetzt in deinem Album.${neu ? ' Neu in deiner Sammlung!' : ''}`);
      // Album-Knopf im Menü: hüpft, leuchtet und zeigt «+1»
      const knopf = albumKnopf();
      knopfHops();
      knopf.classList.add('ts-leuchtet');
      if (!knopf.querySelector('.ts-plus')) knopf.insertAdjacentHTML('beforeend', '<span class="ts-plus" aria-hidden="true">+1</span>');
      $('ts-weiter').hidden = false;
      $('ts-weiter').focus({ preventScroll: true });
    };
    // etwas kürzer als früher, damit Tauschen schneller geht (Übergänge in css/tauschen.css dauern höchstens 1 s)
    const schritte = art === 'tausch'
      ? [
        [120, () => { phase('raus', `Du gibst ${titelVon(gibst)}`, 'weg'); knopfHops(); }],
        [1050, () => phase('treffen', `${wer} gibt dir ${titelVon(bekommst)}`, 'flip')],
        [2050, () => {
          phase('tausch', neu ? 'Neu für dich!' : 'Getauscht!', 'gewinn');
          Gefuehl.vibriere([30, 40, 80]);
          Gefuehl.konfetti([farbe, '#ffd34d', '#ffffff', '#4aa3ff'], 70);
        }],
        [3300, () => { messeWege(el); phase('rein', `${titelVon(bekommst)} kommt in dein Album`, 'weg'); }],
        [4150, () => { Gefuehl.ton('muenze'); Gefuehl.vibriere(20); ende(); }],
      ]
      : [
        [120, () => { phase('zeigen', `Du bietest ${titelVon(gibst)} für ${titelVon(bekommst)}`, 'tipp'); knopfHops(); }],
        [1150, () => phase('senden', `Anfrage an ${wer} gesendet`, 'weg')],
        [2150, ende],
      ];
    szene = { art, ende, uhren: schritte.map(([zeit, fn]) => setTimeout(fn, zeit)) };
  }

  function schliesseSzene() {
    if (!szene) return;
    szene.uhren.forEach(clearTimeout);
    szene = null;
    $('tausch-szene').hidden = true;
    document.body.classList.remove('tausch-laeuft');
    if (!fensterOffen()) document.body.classList.remove('op-offen');
    const knopf = albumKnopf();
    knopf.classList.remove('ts-hops', 'ts-leuchtet');
    knopf.querySelectorAll('.ts-plus').forEach((p) => p.remove());
    aktualisiereAlles();
    setTimeout(naechsteSzene, 300);
  }

  async function ablehnen(id, knopf) {
    if (await aktion(() => server.antworte(id, false), knopf)) lade();
  }

  async function zurueckziehen(id, knopf) {
    if (await aktion(() => server.zurueckziehen(id), knopf)) {
      zeigeHinweis('Anfrage zurückgezogen.');
      lade();
    }
  }

  // Fehlende Karte auf die Wunschliste setzen oder wieder entfernen (Album und Tausch-Seite)
  function wuensche(id) {
    const k = karteVonId(id);
    if (!k) return;
    const liste = app.daten.wunschliste;
    const i = liste.indexOf(id);
    if (i >= 0) liste.splice(i, 1);
    else liste.push(id);
    speichern();
    Gefuehl.ton('tipp');
    Gefuehl.vibriere(10);
    zeigeHinweis(i >= 0 ? `${titelVon(id)} ist nicht mehr auf deiner Wunschliste.` : `${titelVon(id)} ist jetzt auf deiner Wunschliste ♥`);
    aktualisiereAlles();
  }

  // ---------- Tausch-Seite ----------

  function zeitText(a) {
    if (a.status !== 'offen') return '';
    return `noch ${dauerText(Math.max(0, TAUSCH_DAUER - (Date.now() - a.zeit)))}`;
  }

  // Offene Anfrage: an dich (Annehmen, Ablehnen) oder von dir (Zurückziehen)
  function anfrageHtml(a) {
    const eingehend = a.an === ich();
    const wer = nameVon(eingehend ? a.von : a.an);
    const duGibst = eingehend ? a.will : a.gibt;
    const duBekommst = eingehend ? a.gibt : a.will;
    const knoepfe = eingehend
      ? `<button class="btn ghost" type="button" data-ablehnen="${a.id}">Ablehnen</button>
        <button class="btn" type="button" data-annehmen="${a.id}">Annehmen</button>`
      : `<button class="btn ghost" type="button" data-zurueck="${a.id}">Zurückziehen</button>`;
    const neu = !besitz()[duBekommst] ? ' · neu für dich' : '';
    return `
      <li class="tausch-anfrage${eingehend ? ' eingehend' : ''}" data-anfrage="${a.id}">
        <p class="ta-kopf"><b>${esc(eingehend ? `${wer} möchte mit dir tauschen` : `Wartet auf ${wer}`)}</b><small>${zeitText(a)}</small></p>
        <div class="ta-karten">
          <figure class="ta-gibst"><div class="ta-karte">${karteHtml(duGibst)}</div><figcaption>Du gibst</figcaption></figure>
          <span class="ta-pfeil" aria-hidden="true">⇄</span>
          <figure class="ta-bekommst"><div class="ta-karte">${karteHtml(duBekommst)}</div><figcaption>Du bekommst${neu}</figcaption></figure>
        </div>
        <div class="ta-knoepfe">${knoepfe}</div>
      </li>`;
  }

  // Vergangene Anfrage: nur eine kurze Zeile, ohne Karten-Bilder
  function vergangenHtml(a) {
    const eingehend = a.an === ich();
    const wer = nameVon(eingehend ? a.von : a.an);
    const text = {
      angenommen: `Getauscht mit ${wer}`,
      abgelehnt: eingehend ? `Anfrage von ${wer} abgelehnt` : `${wer} hat abgelehnt`,
      zurueckgezogen: `Anfrage an ${wer} zurückgezogen`,
      abgelaufen: `Anfrage ${eingehend ? 'von' : 'an'} ${wer} abgelaufen`,
      ungueltig: `Tausch mit ${wer} war nicht mehr möglich`,
    }[a.status] || wer;
    const gegeben = eingehend ? a.will : a.gibt;
    const bekommen = eingehend ? a.gibt : a.will;
    const karten = a.status === 'angenommen' ? ` · ${esc(titelVon(gegeben))} ⇄ ${esc(titelVon(bekommen))}` : '';
    return `<li class="tv-zeile ${a.status}"><b>${esc(text)}</b><small>${new Date(a.zeit).toLocaleDateString('de-CH')}${karten}</small></li>`;
  }

  function waehleReiter(name) {
    reiter = name;
    document.querySelectorAll('#tausch-reiter [data-reiter]').forEach((b) =>
      b.setAttribute('aria-selected', String(b.dataset.reiter === name)));
    document.querySelectorAll('#v-tauschen [data-teil]').forEach((t) => { t.hidden = t.dataset.teil !== name; });
  }

  // Liste nur neu aufbauen, wenn sich der Inhalt geändert hat (sonst laden die Fotos neu und es flackert)
  function setzeListe(el, schluessel, html) {
    if (el.dataset.inhalt === schluessel) return;
    el.dataset.inhalt = schluessel;
    el.innerHTML = html;
  }

  function zeichneSeite() {
    const status = !server.bereit ? 'ohne' : server.test ? 'test' : 'online';
    $('tausch-status').dataset.status = status;
    $('tausch-status-titel').textContent = {
      ohne: 'Tauschen startet mit dem Anmelden',
      test: 'Testmodus',
      online: 'Tausche mit deinen Freunden',
    }[status];
    $('tausch-status-text').textContent = {
      ohne: 'Schon jetzt kannst du unter «Tauschen» deine Wunschliste füllen.',
      test: 'Nur in der Vorschau spielt ein Test-Freund mit. Nimm zuerst unter Freunde seine Anfrage an.',
      online: '',
    }[status];
    $('tausch-status').hidden = status === 'online';
    $('tausch-neu').hidden = status === 'ohne';

    // Reiter «Anfragen»: zuerst die an dich, dann deine eigenen; rote Zahl = Anfragen an dich
    const offen = anfragen.filter((a) => a.status === 'offen')
      .sort((a, b) => (b.an === ich()) - (a.an === ich()) || b.zeit - a.zeit);
    setzeListe($('tausch-anfragen'), offen.map((a) => `${a.id}:${zeitText(a)}`).join(','), offen.map(anfrageHtml).join(''));
    $('tausch-anfragen-leer').hidden = offen.length > 0;
    const zahl = offenFuerMich();
    $('tausch-reiter-zahl').textContent = zahl;
    $('tausch-reiter-zahl').hidden = !zahl;

    // Reiter «Vergangen»: die letzten 20, nur als kurze Zeilen
    const vergangen = anfragen.filter((a) => a.status !== 'offen').sort((a, b) => b.zeit - a.zeit).slice(0, 20);
    setzeListe($('tausch-vergangen'), vergangen.map((a) => `${a.id}:${a.status}`).join(','), vergangen.map(vergangenHtml).join(''));
    $('tausch-vergangen-leer').hidden = vergangen.length > 0;

    // Wunschliste: nur Karten, die noch fehlen
    const n = besitz();
    const wunsch = app.daten.wunschliste.filter((id) => karteVonId(id) && !n[id]);
    setzeListe($('tausch-wunsch'), wunsch.join(','), wunsch.map((id) => `
      <li class="ist-wunsch">${karteHtml(id, { fehlt: true })}
        <button class="kauf-knopf verwerten" type="button" data-wunsch-weg="${id}">Von der Wunschliste nehmen</button>
      </li>`).join(''));
    $('tausch-wunsch-leer').hidden = wunsch.length > 0;

    // Eigene Tausch-Karten
    const doppelte = tauschKarten();
    setzeListe($('tausch-doppelte'), doppelte.map((id) => `${id}${n[id]}`).join(','),
      doppelte.map((id) => `<li>${karteHtml(id, { anzahl: n[id] })}</li>`).join(''));
    $('tausch-doppelte-leer').hidden = doppelte.length > 0;
  }

  // Wird von aktualisiereAlles aufgerufen: rote Zahl bei «Tauschen» unter Mehr und die Seite selbst
  function zeichne() {
    const zahl = $('tausch-zahl');
    const n = offenFuerMich();
    if (zahl.textContent !== String(n)) {
      zahl.textContent = n;
      zahl.classList.remove('neu');
      void zahl.offsetWidth;
      if (n) zahl.classList.add('neu');
    }
    zahl.hidden = !n;
    $('tausch-oeffnen').setAttribute('aria-label', n ? `Tauschen, ${n} Anfrage${n > 1 ? 'n' : ''} an dich` : 'Tauschen');
    const offen = app.ansicht === 'tauschen';
    if (offen && !warOffen) {
      // beim Öffnen der Seite neu vom Server holen; Reiter: Anfragen, wenn welche offen sind, sonst Tauschen
      reiterGewaehlt = false;
      waehleReiter(standardReiter());
      lade();
    }
    warOffen = offen;
    if (offen) zeichneSeite();
  }

  // ---------- Tausch-Fenster: Freund → Karte, die du willst → Karte, die du gibst → senden ----------

  // freund: direkt mit diesem Freund (Knopf «Tauschen» in der Freundesliste), dann geht es gleich bei Schritt 2 los
  function oeffneFenster(freund) {
    if (!server.bereit) return zeigeHinweis('Tauschen startet mit dem Anmelden.');
    if (offenVonMir() >= TAUSCH_MAX_OFFEN) {
      return zeigeHinweis(`Du hast schon ${TAUSCH_MAX_OFFEN} offene Anfragen. Warte auf eine Antwort oder ziehe eine zurück.`);
    }
    if (!tauschKarten().length) return zeigeHinweis('Du brauchst zuerst eine doppelte Karte zum Tauschen.');
    if (typeof freund === 'string') {
      const fr = server.freunde().find((x) => x.id === freund);
      if (!fr || !fr.bereit) return zeigeHinweis(server.test ? 'In der Vorschau tauscht nur der Test-Freund.' : 'Tauschen geht nur mit deinen Freunden.');
      fenster = { schritt: 2, freund, direkt: true, sammlung: null };
    } else {
      fenster = { schritt: 1 };
    }
    $('tausch-fenster').hidden = false;
    document.body.classList.add('op-offen');
    Gefuehl.ton('auf');
    zeichneFenster();
  }

  function schliesseFenster() {
    if ($('tausch-fenster').hidden) return;
    $('tausch-fenster').hidden = true;
    document.body.classList.remove('op-offen');
    fenster = null;
  }

  // Karten zur Auswahl; info(id) gibt { tag, gesperrt } zurück
  function wahlHtml(liste, info) {
    return `<ul class="tausch-wahl">${liste.map((id) => {
      const { tag, gesperrt } = info(id);
      return `<li><button class="tausch-karte" type="button" data-wahl="${id}"${gesperrt ? ' disabled' : ''}>
        ${karteHtml(id)}${tag ? `<span class="tw-tag">${tag}</span>` : ''}</button></li>`;
    }).join('')}</ul>`;
  }

  async function zeichneFenster() {
    const f = fenster;
    if (!f) return;
    const name = f.freund ? nameVon(f.freund) : '';
    // direkt vom Freund aus: nur 3 Schritte (der Freund ist schon gewählt)
    $('tausch-schritt').textContent = f.direkt ? `Schritt ${f.schritt - 1} von 3 · mit ${name}` : `Schritt ${f.schritt} von 4`;
    $('tausch-zurueck').textContent = f.schritt === 1 || (f.direkt && f.schritt === 2) ? 'Abbrechen' : 'Zurück';
    $('tausch-senden').hidden = f.schritt !== 4;
    const titel = $('tausch-titel');
    const text = $('tausch-text');
    const inhalt = $('tausch-inhalt');
    inhalt.scrollTop = 0;

    if (f.schritt === 1) {
      const freunde = server.freunde();
      titel.textContent = 'Mit wem tauschst du?';
      text.textContent = freunde.length ? 'Wähle einen Freund.' : 'Füge zuerst unter Mehr → Freunde einen Freund hinzu.';
      inhalt.innerHTML = `<ul class="tausch-freunde">${freunde.map((fr) => `
        <li><button class="tausch-freund mit-bild" type="button" data-freund="${esc(fr.id)}"${fr.bereit ? '' : ' disabled'}>
          ${profilbildHtml(fr.bild, fr.name)}
          <b>${esc(fr.name)}</b><small>${fr.bereit
    ? `Level ${fr.level} · ${esc(fr.titel)}${fr.id === TEST_FREUND ? ' · spielt nur in der Vorschau mit' : ''}`
    : 'erst mit dem Anmelden'}</small>
        </button></li>`).join('')}</ul>`;
      return;
    }

    if (f.schritt === 2) {
      titel.textContent = 'Welche Karte möchtest du?';
      if (!f.sammlung) {
        text.textContent = '';
        inhalt.innerHTML = '<p class="tausch-laedt">Lädt …</p>';
        let fehler = '';
        try {
          f.sammlung = await server.sammlungVon(f.freund);
        } catch (e) {
          fehler = e.message;
        }
        if (fenster !== f) return;
        if (fehler || !f.sammlung) {
          text.textContent = fehler || `${name} ist noch nicht online. Dein Freund muss das Spiel zuerst einmal öffnen.`;
          inhalt.innerHTML = '';
          f.sammlung = null;
          return;
        }
      }
      const n = besitz();
      const wunsch = new Set(app.daten.wunschliste);
      const kannGeben = new Set(tauschKarten().map((id) => karteVonId(id).seltenheit));
      const rang = (id) => (wunsch.has(id) ? 0 : !n[id] ? 1 : 2);
      const liste = (f.sammlung ? f.sammlung.doppelte : []).filter((id) => karteVonId(id))
        .sort((a, b) => rang(a) - rang(b) || rangVon(karteVonId(b).seltenheit) - rangVon(karteVonId(a).seltenheit));
      text.textContent = liste.length
        ? `Die doppelten Karten von ${name}. Grau: Dafür hast du keine doppelte Karte in der gleichen Seltenheit.`
        : `${name} hat gerade keine doppelten Karten.`;
      inhalt.innerHTML = wahlHtml(liste, (id) => ({
        tag: wunsch.has(id) ? '♥ Wunsch' : !n[id] ? 'Neu für dich' : '',
        gesperrt: !kannGeben.has(karteVonId(id).seltenheit),
      }));
      return;
    }

    if (f.schritt === 3) {
      const s = seltenheitVon(karteVonId(f.will).seltenheit);
      const sucht = new Set(f.sammlung ? f.sammlung.wunschliste : []);
      const liste = tauschKarten().filter((id) => karteVonId(id).seltenheit === s.id && id !== f.will)
        .sort((a, b) => sucht.has(b) - sucht.has(a));
      titel.textContent = 'Was gibst du dafür?';
      text.textContent = `Eine deiner doppelten ${s.name}-Karten. Mit ♥ markiert: Die sucht ${name}.`;
      inhalt.innerHTML = wahlHtml(liste, (id) => ({ tag: sucht.has(id) ? `♥ sucht ${esc(name)}` : '', gesperrt: false }));
      return;
    }

    titel.textContent = 'Alles richtig?';
    text.textContent = `${name} bekommt deine Anfrage. Nimmt ${name} an, tauscht ihr sofort. Nach 48 Stunden verfällt sie.`;
    inhalt.innerHTML = `
      <div class="ta-karten tausch-paar">
        <figure class="ta-gibst"><div class="ta-karte">${karteHtml(f.gibt)}</div><figcaption>Du gibst</figcaption></figure>
        <span class="ta-pfeil" aria-hidden="true">⇄</span>
        <figure class="ta-bekommst"><div class="ta-karte">${karteHtml(f.will)}</div><figcaption>Du bekommst</figcaption></figure>
      </div>`;
  }

  function waehle(e) {
    const f = fenster;
    if (!f) return;
    const freund = e.target.closest('[data-freund]');
    const wahl = e.target.closest('[data-wahl]');
    if (f.schritt === 1 && freund && !freund.disabled) {
      f.freund = freund.dataset.freund;
      f.sammlung = null;
      f.schritt = 2;
    } else if (f.schritt === 2 && wahl && !wahl.disabled) {
      f.will = wahl.dataset.wahl;
      // passt nur eine deiner Karten, gleich zum Bestätigen (ein Schritt weniger)
      const s = karteVonId(f.will).seltenheit;
      const passend = tauschKarten().filter((id) => karteVonId(id).seltenheit === s && id !== f.will);
      if (passend.length === 1) {
        f.gibt = passend[0];
        f.schritt = 4;
      } else {
        f.schritt = 3;
      }
    } else if (f.schritt === 3 && wahl && !wahl.disabled) {
      f.gibt = wahl.dataset.wahl;
      f.schritt = 4;
    } else {
      return;
    }
    Gefuehl.ton('tick');
    zeichneFenster();
  }

  function zurueck() {
    const f = fenster;
    if (!f) return;
    if (f.schritt === 1 || (f.direkt && f.schritt === 2)) return schliesseFenster();
    f.schritt -= 1;
    // war Schritt 3 übersprungen (nur eine passende Karte), zurück zur Wahl der Karte des Freundes
    if (f.schritt === 3) {
      const s = karteVonId(f.will).seltenheit;
      if (tauschKarten().filter((id) => karteVonId(id).seltenheit === s && id !== f.will).length === 1) f.schritt = 2;
    }
    zeichneFenster();
  }

  async function senden(e) {
    const f = fenster;
    if (!f || f.schritt !== 4) return;
    const a = await aktion(() => server.sende({ an: f.freund, gibt: f.gibt, will: f.will }), e.currentTarget);
    if (!a) return;
    schliesseFenster();
    reiterGewaehlt = false;
    lade();
    spieleSzene('gesendet', a);
  }

  function init() {
    server = TEST_ERLAUBT ? testServer(geaendert) : SERVER_OHNE;
    $('tausch-neu').addEventListener('click', oeffneFenster);
    $('tausch-anfragen').addEventListener('click', (e) => {
      const b = e.target.closest('[data-annehmen], [data-ablehnen], [data-zurueck]');
      if (!b) return;
      const id = Number(b.dataset.annehmen || b.dataset.ablehnen || b.dataset.zurueck);
      if (b.dataset.annehmen) annehmen(id, b);
      else if (b.dataset.ablehnen) ablehnen(id, b);
      else zurueckziehen(id, b);
    });
    $('tausch-wunsch').addEventListener('click', (e) => {
      const b = e.target.closest('[data-wunsch-weg]');
      if (b) wuensche(b.dataset.wunschWeg);
    });
    $('tausch-doppelte').addEventListener('click', (e) => {
      const k = e.target.closest('.karte');
      if (k) Gefuehl.zeigeKarte(k.dataset.karte, besitz()[k.dataset.karte] || 0);
    });
    $('tausch-reiter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-reiter]');
      if (!b) return;
      reiterGewaehlt = true;
      waehleReiter(b.dataset.reiter);
      Gefuehl.ton('tick');
    });
    // Szene: antippen springt ans Ende, «Super!» schliesst
    $('tausch-szene').addEventListener('click', (e) => {
      if (!szene) return;
      if (e.target.closest('#ts-weiter')) schliesseSzene();
      else if ($('tausch-szene').dataset.phase !== 'fertig') szene.ende();
    });
    $('tausch-inhalt').addEventListener('click', waehle);
    $('tausch-zurueck').addEventListener('click', zurueck);
    $('tausch-senden').addEventListener('click', senden);
    $('tausch-fenster').addEventListener('click', (e) => { if (e.target === $('tausch-fenster')) schliesseFenster(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (szene && $('tausch-szene').dataset.phase === 'fertig') schliesseSzene();
      else if (szene) szene.ende();
      else schliesseFenster();
    });
    lade();
  }

  return { init, zeichne, etwasBereit, wuensche, lade, verbunden, reserviert, offenFuerMich, mitFreund: oeffneFenster };
})();
