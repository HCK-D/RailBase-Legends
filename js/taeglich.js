/*
 * Tägliche Belohnungen: Login-Serie (7 Tage) und Tagesaufgaben.
 * Ein Tag ist ein Kalendertag auf dem Gerät (ab Mitternacht gibt es Neues).
 * Gespeichert in app.daten.taeglich (siehe store.js).
 */

// Login-Serie: Belohnung pro Tag. Wer einen Tag auslässt, fängt wieder bei Tag 1 an (Platzhalter).
const SERIE_BELOHNUNGEN = [
  { muenzen: 20 },
  { muenzen: 30 },
  { pack: 'standard' },
  { muenzen: 50 },
  { rubine: 1 },
  { muenzen: 80 },
  { pack: 'silber-1' },
];

// Tagesaufgaben: die erste gibt es jeden Tag, dazu zwei weitere, die täglich wechseln (Platzhalter)
const AUFGABEN = [
  { id: 'packs', text: 'Öffne 2 Packs', ziel: 2, belohnung: { muenzen: 15 } },
  { id: 'rad', text: 'Dreh am Glücksrad', ziel: 1, belohnung: { muenzen: 10 } },
  { id: 'neu', text: 'Finde 1 neue Karte', ziel: 1, belohnung: { muenzen: 20 } },
  { id: 'selten', text: 'Finde 2 Karten ab Rare', ziel: 2, belohnung: { muenzen: 25 } },
  { id: 'verwerten', text: 'Verwerte 1 doppelte Karte', ziel: 1, belohnung: { muenzen: 10 } },
  { id: 'kauf', text: 'Kaufe 1 Pack im Shop', ziel: 1, belohnung: { muenzen: 10 } },
];

// Bonus, wenn alle Aufgaben des Tages abgeholt sind (Platzhalter)
const AUFGABEN_BONUS = { pack: 'standard' };

const Taeglich = (() => {
  let meldung = null; // «Aufgabe geschafft», wartet, bis kein Fenster mehr offen ist

  // ---------- Datum ----------

  const datum = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const heute = () => datum(new Date());

  function tagVorher(tag) {
    const [j, m, t] = tag.split('-').map(Number);
    return datum(new Date(j, m - 1, t - 1));
  }

  function bisMitternacht() {
    const jetzt = new Date();
    return new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1) - jetzt;
  }

  // ---------- Belohnungen ----------

  function belohnungText(b) {
    if (b.muenzen) return `${b.muenzen} RB Coins`;
    if (b.rubine) return `${b.rubine} Rubin-Coin${b.rubine > 1 ? 's' : ''}`;
    return `${packVonId(b.pack).titel}-Pack`;
  }

  function belohnungKurz(b) {
    if (b.muenzen) return `${b.muenzen}`;
    if (b.rubine) return `${b.rubine} Rubin`;
    return packVonId(b.pack).titel;
  }

  function belohnungBild(b) {
    if (b.muenzen) return 'assets/muenzen/gold-rund.webp';
    if (b.rubine) return 'assets/muenzen/rubin-rund.webp';
    return bildKlein(packVonId(b.pack));
  }

  // Gibt die Belohnung und lässt sie vom Knopf zur Anzeige oben fliegen
  function gib(b, von) {
    if (b.muenzen) app.daten.muenzen += b.muenzen;
    if (b.rubine) app.daten.rubine += b.rubine;
    if (b.pack) app.daten.vorrat[b.pack] = vorratVon(b.pack) + 1;
    if (von && (b.muenzen || b.rubine)) Gefuehl.muenzFlug(von, belohnungBild(b), b.muenzen ? Math.min(10, 3 + Math.round(b.muenzen / 10)) : 4);
  }

  // ---------- Login-Serie ----------

  // bereit: heute noch nicht abgeholt. index: welcher der 7 Tage heute dran ist (oder heute abgeholt wurde)
  function serieStand() {
    const t = app.daten.taeglich;
    const h = heute();
    if (t.letzterTag === h) return { bereit: false, serie: t.serie, index: (t.serie - 1) % SERIE_BELOHNUNGEN.length, unterbrochen: false };
    const weiter = t.letzterTag === tagVorher(h);
    const serie = weiter ? t.serie : 0;
    return { bereit: true, serie, index: serie % SERIE_BELOHNUNGEN.length, unterbrochen: !weiter && t.serie > 0 };
  }

  function holeSerie() {
    const s = serieStand();
    if (!s.bereit) return;
    const t = app.daten.taeglich;
    const b = SERIE_BELOHNUNGEN[s.index];
    t.serie = s.serie + 1;
    t.letzterTag = heute();
    gib(b, $('tb-holen'));
    speichern();
    aktualisiereAlles();
    zeichneFenster(s.index);
    Gefuehl.ton('gewinn');
    Gefuehl.vibriere([30, 40, 60]);
    if (s.index === SERIE_BELOHNUNGEN.length - 1) Gefuehl.konfetti(['#ffd34d', '#fff0a8', '#ff4251', '#ffffff'], 90);
    zeigeHinweis(`Tag ${s.index + 1}: ${belohnungText(b)}${b.pack ? ' liegt in deinem Vorrat' : ''}!`);
  }

  // ---------- Tagesaufgaben ----------

  // Jeden Tag die gleichen drei Aufgaben für alle: «Packs» plus zwei, die das Datum auswählt
  function aufgabenFuer(tag) {
    let s = [...tag].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
    const rest = AUFGABEN.slice(1);
    const gewaehlt = [];
    while (gewaehlt.length < 2) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const a = rest[(s >>> 8) % rest.length];
      if (!gewaehlt.includes(a)) gewaehlt.push(a);
    }
    return [AUFGABEN[0], ...gewaehlt];
  }

  // Neuer Tag: Zähler und abgeholte Aufgaben zurücksetzen
  function pruefeTag() {
    const t = app.daten.taeglich;
    const h = heute();
    if (t.tag === h) return;
    t.tag = h;
    t.zaehler = {};
    t.abgeholt = [];
    speichern();
  }

  const stand = (a) => Math.min(app.daten.taeglich.zaehler[a.id] || 0, a.ziel);
  const geschafft = (a) => stand(a) >= a.ziel;
  const abgeholt = (id) => app.daten.taeglich.abgeholt.includes(id);

  function bonusBereit() {
    return aufgabenFuer(heute()).every((a) => abgeholt(a.id)) && !abgeholt('bonus');
  }

  // Etwas zum Abholen da? (Serie, geschaffte Aufgabe oder Bonus)
  function etwasBereit() {
    pruefeTag();
    return serieStand().bereit
      || aufgabenFuer(heute()).some((a) => geschafft(a) && !abgeholt(a.id))
      || bonusBereit();
  }

  // Zählt einen Fortschritt, z. B. zaehle('packs') nach dem Öffnen eines Packs
  function zaehle(art, n = 1) {
    if (n <= 0) return;
    pruefeTag();
    const t = app.daten.taeglich;
    const aufgabe = aufgabenFuer(heute()).find((a) => a.id === art);
    const vorher = aufgabe ? geschafft(aufgabe) : true;
    t.zaehler[art] = (t.zaehler[art] || 0) + n;
    speichern();
    if (aufgabe && !vorher && geschafft(aufgabe)) {
      meldung = `Aufgabe geschafft: ${aufgabe.text}. Hol dir ${belohnungText(aufgabe.belohnung)} unter Mehr ab!`;
      meldeWennFrei();
    }
  }

  // Meldung erst zeigen, wenn kein Pack offen ist und das Rad nicht dreht
  function meldeWennFrei() {
    if (!meldung) return;
    const frei = $('opener').hidden && $('gewinn').hidden && !$('rad-buehne').classList.contains('dreht');
    if (!frei) return;
    zeigeHinweis(meldung);
    Gefuehl.ton('muenze');
    Gefuehl.vibriere([20, 30, 20]);
    meldung = null;
  }

  function holeAufgabe(id, knopf) {
    const a = aufgabenFuer(heute()).find((x) => x.id === id);
    if (!a || !geschafft(a) || abgeholt(id)) return;
    app.daten.taeglich.abgeholt.push(id);
    gib(a.belohnung, knopf);
    speichern();
    aktualisiereAlles();
    zeichneFenster();
    Gefuehl.ton('muenze');
    Gefuehl.vibriere(20);
  }

  function holeBonus() {
    if (!bonusBereit()) return;
    app.daten.taeglich.abgeholt.push('bonus');
    gib(AUFGABEN_BONUS, $('tb-bonus-knopf'));
    speichern();
    aktualisiereAlles();
    zeichneFenster();
    Gefuehl.ton('levelup');
    Gefuehl.vibriere([30, 40, 80]);
    Gefuehl.konfetti(['#ffd34d', '#ff4251', '#ffffff', '#4aa3ff'], 60);
    zeigeHinweis(`Alle Aufgaben geschafft: ${belohnungText(AUFGABEN_BONUS)} liegt in deinem Vorrat!`);
  }

  // ---------- Fenster ----------

  // geradeGeholt: Index des Tages, der eben abgeholt wurde (für die Animation)
  function zeichneFenster(geradeGeholt = null) {
    pruefeTag();
    const s = serieStand();

    $('tb-serie').textContent = s.bereit
      ? (s.serie > 0 ? `Serie: ${s.serie} Tag${s.serie > 1 ? 'e' : ''}. Heute wartet Tag ${s.index + 1}!`
        : (s.unterbrochen ? 'Deine Serie ist unterbrochen. Starte heute neu!' : 'Starte heute deine Serie!'))
      : `Serie: ${s.serie} Tag${s.serie > 1 ? 'e' : ''}. Komm morgen wieder!`;

    $('tb-tage').innerHTML = SERIE_BELOHNUNGEN.map((b, i) => {
      let zustand = 'kommt';
      if (i < s.index || (!s.bereit && i === s.index)) zustand = 'geholt';
      if (s.bereit && i === s.index) zustand = 'heute';
      const neu = i === geradeGeholt ? ' eben' : '';
      return `
        <li class="tb-tag ${zustand}${neu}${b.pack ? ' ist-pack' : ''}">
          <span class="tb-tag-nr">Tag ${i + 1}</span>
          <img src="${belohnungBild(b)}" alt="" draggable="false">
          <b>${belohnungKurz(b)}</b>
        </li>`;
    }).join('');

    const holen = $('tb-holen');
    holen.disabled = !s.bereit;
    const naechste = SERIE_BELOHNUNGEN[s.bereit ? s.index : (s.index + 1) % SERIE_BELOHNUNGEN.length];
    $('tb-holen-txt').textContent = s.bereit ? `Tag ${s.index + 1} abholen` : `Morgen: ${belohnungText(naechste)}`;

    const aufgaben = aufgabenFuer(heute());
    $('tb-aufgaben').innerHTML = aufgaben.map((a) => {
      const fertig = geschafft(a);
      const geholt = abgeholt(a.id);
      let knopf = `<span class="tb-stand">${stand(a)} / ${a.ziel}</span>`;
      if (fertig && !geholt) knopf = `<button class="tb-abholen" type="button" data-aufgabe="${a.id}">Abholen</button>`;
      if (geholt) knopf = '<span class="tb-erledigt">Erledigt</span>';
      return `
        <li class="${geholt ? 'geholt' : fertig ? 'fertig' : ''}">
          <div class="tb-aufgabe">
            <b>${a.text}</b>
            <span class="tb-balken" aria-hidden="true"><i style="width:${(stand(a) / a.ziel) * 100}%"></i></span>
          </div>
          <span class="tb-lohn"><img src="${belohnungBild(a.belohnung)}" alt="">${belohnungKurz(a.belohnung)}</span>
          ${knopf}
        </li>`;
    }).join('');

    const alleGeholt = aufgaben.every((a) => abgeholt(a.id));
    const bonus = $('tb-bonus');
    bonus.classList.toggle('bereit', bonusBereit());
    bonus.classList.toggle('geholt', abgeholt('bonus'));
    $('tb-bonus-text').textContent = abgeholt('bonus')
      ? `Bonus abgeholt: ${belohnungText(AUFGABEN_BONUS)}`
      : `Alle ${aufgaben.length} Aufgaben: ${belohnungText(AUFGABEN_BONUS)}`;
    $('tb-bonus-knopf').hidden = !alleGeholt || abgeholt('bonus');
    $('tb-bonus-bild').src = belohnungBild(AUFGABEN_BONUS);

    $('tb-neu').textContent = `Neue Aufgaben in ${dauerText(bisMitternacht())}`;
  }

  function zeige() {
    zeichneFenster();
    $('tb').hidden = false;
    document.body.classList.add('op-offen');
    app.daten.taeglich.gezeigt = heute();
    speichern();
    Gefuehl.ton('auf');
    $('tb-holen').focus({ preventScroll: true });
  }

  function schliesse() {
    if ($('tb').hidden) return;
    $('tb').hidden = true;
    if ($('opener').hidden && $('gewinn').hidden) document.body.classList.remove('op-offen');
    aktualisiereAlles();
  }

  // Mehr-Seite, Start-Badge und roter Punkt (wird von aktualisiereAlles aufgerufen)
  function zeichne() {
    const s = serieStand();
    const offen = aufgabenFuer(heute()).filter((a) => !abgeholt(a.id)).length;
    const bereit = etwasBereit();
    $('tb-eintrag-text').textContent = bereit
      ? 'Belohnung bereit zum Abholen!'
      : `Serie: ${s.serie} Tag${s.serie === 1 ? '' : 'e'} · ${offen ? `${offen} Aufgabe${offen > 1 ? 'n' : ''} offen` : 'alle Aufgaben erledigt'}`;
    $('tb-oeffnen').classList.toggle('bereit', bereit);
    if (!$('tb').hidden) zeichneFenster();
    meldeWennFrei();
  }

  // Einmal am Tag öffnet sich das Fenster von selbst, wenn die Serie-Belohnung bereit ist
  function vielleichtZeigen() {
    const t = app.daten.taeglich;
    if (t.gezeigt === heute() || !serieStand().bereit) return;
    // erst wenn das Spiel nach dem Anmelden freigegeben ist (js/online.js ruft es dann selbst auf)
    if (!Online.freigegeben()) return;
    // nicht über einem anderen Fenster (Pack, Glücksrad, Anmelden, Willkommen);
    // nach dem Anmelden und nach «Annehmen» wird es nochmals aufgerufen
    if (!$('opener').hidden || !$('gewinn').hidden || !$('willkommen').hidden || !$('anmelden').hidden
      || !$('einfuehrung').hidden || !$('profilbild').hidden) return;
    zeige();
  }

  function init() {
    pruefeTag();
    $('tb-holen').addEventListener('click', holeSerie);
    $('tb-bonus-knopf').addEventListener('click', holeBonus);
    $('tb-aufgaben').addEventListener('click', (e) => {
      const b = e.target.closest('[data-aufgabe]');
      if (b) holeAufgabe(b.dataset.aufgabe, b);
    });
    $('tb-zu').addEventListener('click', schliesse);
    $('tb').addEventListener('click', (e) => { if (e.target === $('tb')) schliesse(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesse(); });
    $('tb-oeffnen').addEventListener('click', zeige);
    // Zurück in die App (z. B. am nächsten Morgen): neuer Tag, neue Belohnung
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      aktualisiereAlles();
      vielleichtZeigen();
    });
    setTimeout(vielleichtZeigen, 900);
  }

  // gib und die belohnung…-Helfer braucht auch js/erfolge.js
  return { init, zaehle, zeige, zeichne, etwasBereit, vielleichtZeigen, gib, belohnungText, belohnungKurz, belohnungBild };
})();
