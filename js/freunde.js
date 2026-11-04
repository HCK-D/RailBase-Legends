/*
 * Freunde und Profilbild.
 *  - Freundes-Anfragen: Wer eine ID hinzufügt, schickt eine Anfrage. Erst wenn der andere Spieler annimmt,
 *    seid ihr Freunde (Datenbank: werkzeuge/datenbank.sql, freunde_liste, freund_anfragen, freund_antworten,
 *    freund_entfernen). app.daten.freunde enthält danach nur bestätigte Freunde (für Geschenke und Tauschen).
 *  - Deine Freunde: Profilbild, Name, Level und Titel, dazu direkt «Tauschen».
 *  - Profilbild: wird beim ersten Start gewählt und lässt sich im Konto ändern (app.daten.bild).
 * In der Vorschau ohne Anmelden (TEST_ERLAUBT in js/app.js) spielt ein Test-Freund im Browser mit.
 */

// Profilbilder: Kürzel (geht so in die Datenbank), Zeichen, Hintergrundfarbe, Name zum Vorlesen
const PROFILBILDER = [
  { id: 'dampflok', zeichen: '🚂', farbe: '#d93a33', name: 'Dampflok' },
  { id: 'regio', zeichen: '🚆', farbe: '#2f6fe0', name: 'Regionalzug' },
  { id: 'schnellzug', zeichen: '🚄', farbe: '#6d7a88', name: 'Schnellzug' },
  { id: 'hochgeschw', zeichen: '🚅', farbe: '#24356b', name: 'Hochgeschwindigkeitszug' },
  { id: 'tram', zeichen: '🚋', farbe: '#e8a300', name: 'Tram' },
  { id: 'bergbahn', zeichen: '🚞', farbe: '#2a9d63', name: 'Bergbahn' },
  { id: 'einschiene', zeichen: '🚝', farbe: '#1499ad', name: 'Einschienenbahn' },
  { id: 'wagen', zeichen: '🚃', farbe: '#c0661d', name: 'Wagen' },
  { id: 'seilbahn', zeichen: '🚠', farbe: '#8550cf', name: 'Seilbahn' },
  { id: 'berge', zeichen: '🏔️', farbe: '#4f86b8', name: 'Berge' },
  { id: 'signal', zeichen: '🚦', farbe: '#39424d', name: 'Signal' },
  { id: 'billett', zeichen: '🎫', farbe: '#d6407e', name: 'Billett' },
];

const profilbildVon = (id) => PROFILBILDER.find((b) => b.id === id) || null;

// Titel nach Level: ab diesem Level gilt dieser Titel
const TITEL_STUFEN = [
  [1, 'Neuling'], [5, 'Pendler'], [10, 'Sammler'], [15, 'Lokführer'],
  [20, 'Streckenkenner'], [30, 'Bahnprofi'], [40, 'Legende'],
];

function titelFuerLevel(level) {
  let titel = TITEL_STUFEN[0][1];
  TITEL_STUFEN.forEach(([ab, name]) => { if (level >= ab) titel = name; });
  return titel;
}

// Rundes Profilbild als HTML; ohne Bild der erste Buchstabe des Namens
function profilbildHtml(bild, name = '', klasse = '') {
  const b = profilbildVon(bild);
  if (b) return `<span class="pb ${klasse}" style="--pb:${b.farbe}" aria-hidden="true">${b.zeichen}</span>`;
  const buchstabe = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return `<span class="pb pb-leer ${klasse}" aria-hidden="true">${esc(buchstabe)}</span>`;
}

const Freunde = (() => {
  // Ein Eintrag: { anfrage, id, name, titel, level, bild, art: 'freund' | 'eingehend' | 'ausgehend', zeit }
  let liste = [];
  let quelle = null;  // online (Datenbank) oder test (Vorschau)
  let ladeNr = 0;
  let geladen = false;       // Liste mindestens einmal geladen
  let meldeNeue = false;     // ab dem zweiten Laden: neue Anfragen an dich als Hinweis melden
  let warOffen = false;      // war die Freunde-Seite beim letzten Zeichnen schon offen?

  // ---------- Quellen ----------

  // Online über die Datenbank (js/online.js ist verbunden)
  const ONLINE_QUELLE = {
    async liste() {
      const daten = await Online.rpc('freunde_liste', {});
      return (daten || []).map((r) => ({
        anfrage: r.anfrage, id: r.spieler_id, name: r.name || '', titel: r.titel || '', level: r.level || 1,
        bild: r.bild || '', art: r.art, zeit: Date.parse(r.zeit),
      }));
    },
    anfragen: (id) => Online.rpc('freund_anfragen', { freund: id }),
    antworten: (anfrage, ja) => Online.rpc('freund_antworten', { anfrage, annehmen: ja }),
    entfernen: (id) => Online.rpc('freund_entfernen', { freund: id }),
  };

  // Nur Vorschau: alles im Browser (Speicher sk-freunde-test). Der Test-Freund schickt dir zuerst eine Anfrage;
  // wen du hinzufügst, nimmt nach ein paar Sekunden an.
  function testQuelle() {
    const SCHLUESSEL = 'sk-freunde-test';
    let stand = null;
    try { stand = JSON.parse(localStorage.getItem(SCHLUESSEL)); } catch (e) { /* neu anfangen */ }
    if (!stand || !Array.isArray(stand.liste)) {
      stand = {
        naechste: 2,
        liste: [{ anfrage: 1, id: TEST_FREUND, name: 'Test-Freund', titel: '', level: 12, bild: 'bergbahn', art: 'eingehend', zeit: Date.now() }],
      };
    }
    const sichern = () => { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(stand)); } catch (e) { /* ignorieren */ } };
    sichern();
    const finde = (id) => stand.liste.find((f) => f.id === id);
    return {
      async liste() { return stand.liste.map((f) => ({ ...f })); },
      async anfragen(id) {
        const f = finde(id);
        if (f && f.art === 'freund') throw new Error('Ihr seid schon Freunde.');
        if (f && f.art === 'ausgehend') throw new Error('Du hast schon eine Anfrage geschickt. Warte, bis sie angenommen wird.');
        if (f) {
          f.art = 'freund';
          sichern();
          return 'angenommen';
        }
        const zufall = PROFILBILDER[Math.floor(Math.random() * PROFILBILDER.length)].id;
        const neu = { anfrage: stand.naechste++, id, name: `Spieler ${id.slice(3, 7)}`, titel: '', level: 1 + Math.floor(Math.random() * 30), bild: zufall, art: 'ausgehend', zeit: Date.now() };
        stand.liste.unshift(neu);
        sichern();
        setTimeout(() => {
          const f2 = finde(id);
          if (!f2 || f2.art !== 'ausgehend') return;
          f2.art = 'freund';
          sichern();
          lade().then(() => zeigeHinweis(`${f2.name} hat deine Freundes-Anfrage angenommen.`));
        }, 4000);
        return 'gesendet';
      },
      async antworten(anfrage, ja) {
        const f = stand.liste.find((x) => x.anfrage === anfrage && x.art === 'eingehend');
        if (!f) throw new Error('Diese Anfrage gibt es nicht mehr.');
        if (ja) f.art = 'freund';
        else stand.liste = stand.liste.filter((x) => x !== f);
        sichern();
        return ja ? 'angenommen' : 'abgelehnt';
      },
      async entfernen(id) {
        stand.liste = stand.liste.filter((f) => f.id !== id);
        sichern();
      },
    };
  }

  // ---------- Laden ----------

  // Liste übernehmen: bestätigte Freunde in den Spielstand, Namen und Bilder für die anderen Teile (js/online.js)
  function uebernimm(neu) {
    liste = neu.map((f) => ({ ...f, titel: f.titel || titelFuerLevel(f.level || 1) }));
    geladen = true;
    Online.merkeProfile(liste);
    const ids = liste.filter((f) => f.art === 'freund').map((f) => f.id);
    if (ids.join() !== app.daten.freunde.join()) {
      app.daten.freunde = ids;
      speichern();
    }
  }

  async function lade() {
    if (!quelle) return;
    const nr = ++ladeNr;
    let neu;
    try {
      neu = await quelle.liste();
    } catch (e) {
      return; // gerade keine Verbindung: beim nächsten Mal
    }
    if (nr !== ladeNr) return;
    const vorher = new Set(liste.filter((f) => f.art === 'eingehend').map((f) => f.anfrage));
    uebernimm(neu);
    // neue Anfrage an dich: kurzer Hinweis (nicht beim ersten Laden)
    const neueAnfrage = liste.find((f) => f.art === 'eingehend' && !vorher.has(f.anfrage));
    if (neueAnfrage && meldeNeue) {
      zeigeHinweis(`${neueAnfrage.name || neueAnfrage.id} möchte mit dir befreundet sein.`);
      Gefuehl.ton('tipp');
    }
    meldeNeue = true;
    aktualisiereAlles();
  }

  // js/online.js ist verbunden: ab jetzt über die Datenbank
  function verbunden() {
    quelle = ONLINE_QUELLE;
    meldeNeue = false;
    return lade();
  }

  // ---------- Aktionen ----------

  async function aktion(fn, knopf) {
    if (!quelle) {
      zeigeHinweis('Freunde hinzufügen geht nur, wenn du online angemeldet bist.');
      return null;
    }
    if (knopf) knopf.disabled = true;
    try {
      return await fn();
    } catch (e) {
      zeigeHinweis(e.message);
      return null;
    } finally {
      if (knopf && knopf.isConnected) knopf.disabled = false;
    }
  }

  async function hinzufuegen(e) {
    e.preventDefault();
    const feld = $('freund-id');
    const id = feld.value.trim().toUpperCase();
    if (!ID_MUSTER.test(id)) return zeigeHinweis('Die ID sieht so aus: RB-XXXX-XXXX');
    if (id === app.daten.spielerId) return zeigeHinweis('Das ist deine eigene ID.');
    const f = liste.find((x) => x.id === id);
    if (f && f.art === 'freund') return zeigeHinweis(`${f.name || id} ist schon dein Freund.`);
    const ergebnis = await aktion(() => quelle.anfragen(id), e.submitter || $('freund-form').querySelector('button'));
    if (!ergebnis) return;
    feld.value = '';
    Gefuehl.ton('tipp');
    await lade();
    const wer = (liste.find((x) => x.id === id) || {}).name || id;
    zeigeHinweis(ergebnis === 'angenommen'
      ? `Ihr seid jetzt Freunde: ${wer} hatte dir schon eine Anfrage geschickt.`
      : `Anfrage an ${wer} gesendet. Sobald ${wer} annimmt, seid ihr Freunde.`);
  }

  async function antworten(anfrage, ja, knopf) {
    const f = liste.find((x) => x.anfrage === anfrage);
    if (!(await aktion(() => quelle.antworten(anfrage, ja), knopf))) return;
    if (ja) {
      Gefuehl.ton('gewinn');
      Gefuehl.vibriere([20, 30, 60]);
      Gefuehl.konfetti(['#ffd34d', '#ff4251', '#ffffff', '#4aa3ff'], 40);
    }
    await lade();
    if (f) zeigeHinweis(ja ? `${f.name || f.id} ist jetzt dein Freund.` : `Anfrage von ${f.name || f.id} abgelehnt.`);
  }

  async function entfernen(id, knopf) {
    const f = liste.find((x) => x.id === id);
    const wer = (f && f.name) || id;
    const frageText = f && f.art === 'ausgehend'
      ? `Anfrage an ${wer} zurückziehen?`
      : `${wer} aus deinen Freunden entfernen? Offene Tausch-Anfragen zwischen euch werden zurückgezogen.`;
    if (!(await frage(frageText, f && f.art === 'ausgehend' ? 'Zurückziehen' : 'Entfernen'))) return;
    // freund_entfernen gibt nichts zurück: Erfolg erkennt man daran, dass kein Fehler kam
    const ok = await aktion(async () => { await quelle.entfernen(id); return true; }, knopf);
    if (!ok) return;
    await lade();
    Tauschen.lade();
  }

  // ---------- Anzeige ----------

  const unterzeile = (f) => `Level ${f.level || 1} · ${esc(f.titel || titelFuerLevel(f.level || 1))}`;

  // Freunde-Seite: Anfragen an dich, deine Freunde (mit Tauschen) und gesendete Anfragen
  function zeichne() {
    $('spieler-id').textContent = app.daten.spielerId;
    const eingehend = liste.filter((f) => f.art === 'eingehend');
    const freunde = liste.filter((f) => f.art === 'freund')
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, 'de'));
    const ausgehend = liste.filter((f) => f.art === 'ausgehend');

    // Mehr → Freunde: rote Zahl = Anfragen an dich
    const zahl = $('freund-zahl');
    zahl.textContent = eingehend.length;
    zahl.hidden = !eingehend.length;

    const offen = app.ansicht === 'freunde';
    if (offen && !warOffen) lade(); // beim Öffnen der Seite frisch vom Server holen
    warOffen = offen;
    if (!offen) return;

    $('freund-anfragen-box').hidden = !eingehend.length;
    $('freund-anfragen').innerHTML = eingehend.map((f) => `
      <li class="freund-karte eingehend">
        ${profilbildHtml(f.bild, f.name)}
        <span class="freund-wer"><b>${esc(f.name || f.id)}</b><small>${unterzeile(f)}</small></span>
        <span class="freund-knoepfe">
          <button class="btn ghost" type="button" data-ablehnen="${f.anfrage}">Ablehnen</button>
          <button class="btn" type="button" data-annehmen="${f.anfrage}">Annehmen</button>
        </span>
      </li>`).join('');

    // ohne Verbindung (z. B. offline): die gespeicherten Freunde mit ihrer ID
    const zeigen = geladen ? freunde : app.daten.freunde.map((id) => ({ id, name: Online.nameVon(id), level: 1, art: 'freund' }));
    $('freund-liste').innerHTML = zeigen.map((f) => `
      <li class="freund-karte">
        ${profilbildHtml(f.bild, f.name || f.id)}
        <span class="freund-wer"><b>${esc(f.name || f.id)}</b><small>${unterzeile(f)}</small></span>
        <span class="freund-knoepfe">
          <button class="btn freund-tauschen" type="button" data-tauschen="${esc(f.id)}">
            <svg width="16" height="16" aria-hidden="true"><use href="#i-teilen"/></svg>Tauschen</button>
          <button class="freund-weg" type="button" data-entfernen="${esc(f.id)}" aria-label="${esc(f.name || f.id)} entfernen" title="Entfernen">×</button>
        </span>
      </li>`).join('');
    $('freund-leer').hidden = zeigen.length > 0;

    $('freund-gesendet-box').hidden = !ausgehend.length;
    $('freund-gesendet').innerHTML = ausgehend.map((f) => `
      <li class="freund-karte klein">
        ${profilbildHtml(f.bild, f.name)}
        <span class="freund-wer"><b>${esc(f.name || f.id)}</b><small>wartet auf Antwort</small></span>
        <button class="btn ghost" type="button" data-entfernen="${esc(f.id)}">Zurückziehen</button>
      </li>`).join('');

    // Tausch-Anfragen an dich: Abkürzung zur Tausch-Seite
    const tausche = Tauschen.offenFuerMich();
    $('freund-tausch-zahl').textContent = tausche ? `${tausche} offen` : '';
    $('freund-tausch-zahl').hidden = !tausche;
  }

  // Profil eines Spielers für andere Teile (Tausch-Fenster, Tausch-Szene)
  function profil(id) {
    const f = liste.find((x) => x.id === id);
    if (f) return f;
    const p = Online.profilVon(id);
    return p ? { id, name: p.name, level: p.level || 1, titel: p.titel || titelFuerLevel(p.level || 1), bild: p.bild || '' } : null;
  }

  const etwasBereit = () => liste.some((f) => f.art === 'eingehend');

  // ---------- Profilbild wählen ----------
  // zwang: beim ersten Start (ohne Abbrechen). Das Promise ist fertig, wenn das Fenster zu ist.
  function waehleBild(zwang = false) {
    return new Promise((fertig) => {
      const box = $('profilbild');
      let wahl = app.daten.bild || '';
      const zeichneWahl = () => {
        $('pb-raster').innerHTML = PROFILBILDER.map((b) => `
          <li><button type="button" class="pb-knopf" data-bild="${b.id}" aria-pressed="${b.id === wahl}" aria-label="${b.name}">
            ${profilbildHtml(b.id, '', 'gross')}</button></li>`).join('');
        $('pb-fertig').disabled = !wahl;
      };
      const zu = (ok) => {
        box.hidden = true;
        document.body.classList.remove('op-offen');
        $('pb-raster').onclick = null;
        $('pb-fertig').onclick = null;
        $('pb-abbrechen').onclick = null;
        if (ok && wahl && wahl !== app.daten.bild) {
          app.daten.bild = wahl;
          speichern();
          aktualisiereAlles();
          Gefuehl.ton('gewinn');
          if (!zwang) zeigeHinweis('Profilbild gespeichert.');
        }
        fertig();
      };
      $('pb-titel').textContent = zwang ? 'Wähle dein Profilbild' : 'Profilbild ändern';
      $('pb-text').textContent = zwang
        ? 'So sehen dich deine Freunde. Du kannst es später im Konto ändern.'
        : 'So sehen dich deine Freunde.';
      $('pb-abbrechen').hidden = zwang;
      zeichneWahl();
      $('pb-raster').onclick = (e) => {
        const b = e.target.closest('[data-bild]');
        if (!b) return;
        wahl = b.dataset.bild;
        Gefuehl.ton('tick');
        zeichneWahl();
        $('pb-fertig').focus({ preventScroll: true });
      };
      $('pb-fertig').onclick = () => zu(true);
      $('pb-abbrechen').onclick = () => zu(false);
      box.hidden = false;
      document.body.classList.add('op-offen');
      Gefuehl.ton('auf');
    });
  }

  function init() {
    if (TEST_ERLAUBT) quelle = testQuelle();
    $('freund-form').addEventListener('submit', hinzufuegen);
    $('v-freunde').addEventListener('click', (e) => {
      const b = e.target.closest('[data-annehmen], [data-ablehnen], [data-entfernen], [data-tauschen]');
      if (!b) return;
      if (b.dataset.annehmen) antworten(Number(b.dataset.annehmen), true, b);
      else if (b.dataset.ablehnen) antworten(Number(b.dataset.ablehnen), false, b);
      else if (b.dataset.entfernen) entfernen(b.dataset.entfernen, b);
      else Tauschen.mitFreund(b.dataset.tauschen);
    });
    $('id-teilen').addEventListener('click', teileId);
    lade();
  }

  return { init, lade, verbunden, zeichne, profil, etwasBereit, waehleBild, geladen: () => geladen };
})();
