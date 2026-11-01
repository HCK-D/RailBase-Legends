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
    freunde: () => [
      { id: TEST_FREUND, name: 'Test-Freund', bereit: true },
      ...app.daten.freunde.map((id) => ({ id, name: id, bereit: false })),
    ],
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
      }, 2500);
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

// ---------- Tausch-Seite, Tausch-Fenster und Wunschliste ----------

const Tauschen = (() => {
  let server = SERVER_OHNE;
  let anfragen = [];      // zuletzt vom Server geladen
  let ladeNr = 0;
  let warOffen = false;   // war die Tausch-Seite beim letzten Zeichnen schon offen?
  let fenster = null;     // Tausch-Fenster: { schritt, freund, sammlung, will, gibt }

  const ich = () => app.daten.spielerId;
  const nameVon = (id) => (id === TEST_FREUND ? 'Test-Freund' : id);
  const titelVon = (id) => kartenTitel(karteVonId(id)).gross;
  const offenFuerMich = () => anfragen.filter((a) => a.status === 'offen' && a.an === ich()).length;
  const offenVonMir = () => anfragen.filter((a) => a.status === 'offen' && a.von === ich()).length;

  function etwasBereit() {
    return offenFuerMich() > 0;
  }

  async function lade() {
    const nr = ++ladeNr;
    const liste = await server.anfragen();
    if (nr !== ladeNr) return;
    anfragen = liste;
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

  // Die beiden Karten tauschen in der Anfrage die Plätze, danach neu laden
  function feiereTausch(id, text) {
    Gefuehl.ton('gewinn');
    Gefuehl.vibriere([30, 40, 80]);
    Gefuehl.konfetti(['#ffd34d', '#ff4251', '#ffffff', '#4aa3ff'], 60);
    zeigeHinweis(text);
    const li = app.ansicht === 'tauschen' && document.querySelector(`[data-anfrage="${id}"]`);
    if (li) li.classList.add('tauscht');
    setTimeout(() => { lade(); aktualisiereAlles(); }, li ? 1000 : 0);
  }

  // Der Test-Freund hat auf deine Anfrage geantwortet
  function geaendert(a) {
    if (a.status === 'angenommen') {
      feiereTausch(a.id, `${nameVon(a.an)} hat angenommen: ${titelVon(a.will)} ist jetzt in deinem Album!`);
    } else {
      zeigeHinweis(`${nameVon(a.an)} hat deinen Tausch abgelehnt.`);
      lade();
    }
  }

  async function annehmen(id, knopf) {
    const a = await aktion(() => server.antworte(id, true), knopf);
    if (!a) return;
    if (a.status === 'angenommen') feiereTausch(id, `Getauscht! ${titelVon(a.gibt)} ist jetzt in deinem Album.`);
    else {
      zeigeHinweis('Dieser Tausch geht nicht mehr: Eine der Karten ist nicht mehr doppelt da.');
      lade();
    }
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

  const STATUS_TEXT = {
    angenommen: 'Getauscht!',
    zurueckgezogen: 'Zurückgezogen',
    abgelaufen: 'Abgelaufen (nach 48 Stunden)',
    ungueltig: 'Nicht mehr möglich: Eine Karte war nicht mehr doppelt da',
  };

  function anfrageHtml(a) {
    const eingehend = a.an === ich();
    const wer = nameVon(eingehend ? a.von : a.an);
    const duGibst = eingehend ? a.will : a.gibt;
    const duBekommst = eingehend ? a.gibt : a.will;
    let text = STATUS_TEXT[a.status] || '';
    if (a.status === 'offen') text = eingehend ? `${wer} möchte mit dir tauschen` : `Wartet auf ${wer}`;
    if (a.status === 'abgelehnt') text = eingehend ? 'Abgelehnt' : `${wer} hat abgelehnt`;
    let knoepfe = '';
    if (a.status === 'offen' && eingehend) {
      knoepfe = `<button class="btn ghost" type="button" data-ablehnen="${a.id}">Ablehnen</button>
        <button class="btn" type="button" data-annehmen="${a.id}">Annehmen</button>`;
    } else if (a.status === 'offen') {
      knoepfe = `<button class="btn ghost" type="button" data-zurueck="${a.id}">Zurückziehen</button>`;
    }
    const neu = !besitz()[duBekommst] && a.status === 'offen' ? ' · neu für dich' : '';
    return `
      <li class="tausch-anfrage ${a.status}${eingehend ? ' eingehend' : ''}" data-anfrage="${a.id}">
        <p class="ta-kopf"><b>${esc(text)}</b><small>${zeitText(a)}</small></p>
        <div class="ta-karten">
          <figure class="ta-gibst"><div class="ta-karte">${karteHtml(duGibst)}</div><figcaption>Du gibst</figcaption></figure>
          <span class="ta-pfeil" aria-hidden="true">⇄</span>
          <figure class="ta-bekommst"><div class="ta-karte">${karteHtml(duBekommst)}</div><figcaption>Du bekommst${neu}</figcaption></figure>
        </div>
        ${knoepfe ? `<div class="ta-knoepfe">${knoepfe}</div>` : ''}
      </li>`;
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
      ohne: 'Sobald es Konten gibt, schickst du Freunden hier Tausch-Anfragen. Schon jetzt kannst du deine Wunschliste füllen.',
      test: 'Nur in der Vorschau: Ein Test-Freund spielt mit, so kannst du den Tausch ausprobieren. Auf der echten Seite startet Tauschen mit dem Anmelden.',
      online: 'Wähle einen Freund, eine Karte von ihm und eine doppelte Karte von dir.',
    }[status];
    $('tausch-neu').hidden = status === 'ohne';

    // Anfragen: zuerst die an dich, dann deine eigenen, dann die letzten erledigten
    const offen = anfragen.filter((a) => a.status === 'offen')
      .sort((a, b) => (b.an === ich()) - (a.an === ich()) || b.zeit - a.zeit);
    const erledigt = anfragen.filter((a) => a.status !== 'offen').sort((a, b) => b.zeit - a.zeit).slice(0, 5);
    const liste = [...offen, ...erledigt];
    setzeListe($('tausch-anfragen'), liste.map((a) => `${a.id}:${a.status}:${zeitText(a)}`).join(','),
      liste.map(anfrageHtml).join(''));
    $('tausch-anfragen-leer').hidden = liste.length > 0;

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
    if (offen && !warOffen) lade(); // beim Öffnen der Seite neu vom Server holen
    warOffen = offen;
    if (offen) zeichneSeite();
  }

  // ---------- Tausch-Fenster: Freund → Karte, die du willst → Karte, die du gibst → senden ----------

  function oeffneFenster() {
    if (!server.bereit) return zeigeHinweis('Tauschen startet mit dem Anmelden.');
    if (offenVonMir() >= TAUSCH_MAX_OFFEN) {
      return zeigeHinweis(`Du hast schon ${TAUSCH_MAX_OFFEN} offene Anfragen. Warte auf eine Antwort oder ziehe eine zurück.`);
    }
    if (!tauschKarten().length) return zeigeHinweis('Du brauchst zuerst eine doppelte Karte zum Tauschen.');
    fenster = { schritt: 1 };
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
    $('tausch-schritt').textContent = `Schritt ${f.schritt} von 4`;
    $('tausch-zurueck').textContent = f.schritt === 1 ? 'Abbrechen' : 'Zurück';
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
        <li><button class="tausch-freund" type="button" data-freund="${esc(fr.id)}"${fr.bereit ? '' : ' disabled'}>
          <b>${esc(fr.name)}</b><small>${fr.bereit ? (fr.id === TEST_FREUND ? 'spielt nur in der Vorschau mit' : '') : 'erst mit dem Anmelden'}</small>
        </button></li>`).join('')}</ul>`;
      return;
    }

    if (f.schritt === 2) {
      titel.textContent = 'Welche Karte möchtest du?';
      if (!f.sammlung) {
        text.textContent = '';
        inhalt.innerHTML = '<p class="tausch-laedt">Lädt …</p>';
        f.sammlung = await server.sammlungVon(f.freund);
        if (fenster !== f) return;
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
      f.schritt = 3;
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
    if (!fenster) return;
    if (fenster.schritt === 1) return schliesseFenster();
    fenster.schritt -= 1;
    zeichneFenster();
  }

  async function senden(e) {
    const f = fenster;
    if (!f || f.schritt !== 4) return;
    const a = await aktion(() => server.sende({ an: f.freund, gibt: f.gibt, will: f.will }), e.currentTarget);
    if (!a) return;
    schliesseFenster();
    Gefuehl.ton('muenze');
    zeigeHinweis(`Anfrage an ${nameVon(f.freund)} gesendet.`);
    lade();
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
    $('tausch-inhalt').addEventListener('click', waehle);
    $('tausch-zurueck').addEventListener('click', zurueck);
    $('tausch-senden').addEventListener('click', senden);
    $('tausch-fenster').addEventListener('click', (e) => { if (e.target === $('tausch-fenster')) schliesseFenster(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseFenster(); });
    lade();
  }

  return { init, zeichne, etwasBereit, wuensche };
})();
