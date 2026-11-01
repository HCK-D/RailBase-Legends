/* Sammelkarten-Beta: Seiten, Start, Packs-Karussell, Album, Konto, Level.
   Daten über store.js, Karten in karten.js, Öffnen in oeffnen.js, Glücksrad in rad.js. */

// Die 7 Pack-Designs.
// Bilder: assets/packs/<id>.webp (gross, zum Öffnen) und assets/packs/klein/<id>.webp (Listen).
const PACKS = [
  { id: 'standard', stufe: 'standard', titel: 'Basis', name: 'Schweizer Bahn' },
  { id: 'silber-1', stufe: 'silber', titel: 'Silver', name: 'Alpenpanorama' },
  { id: 'silber-2', stufe: 'silber', titel: 'Silver', name: 'Historischer Bahnhof' },
  { id: 'gold-1', stufe: 'gold', titel: 'Gold', name: 'Schweizer Viadukt' },
  { id: 'gold-2', stufe: 'gold', titel: 'Gold', name: 'Lavaux' },
  { id: 'platin-1', stufe: 'platin', titel: 'Platinum', name: 'Alpentunnel' },
  { id: 'platin-2', stufe: 'platin', titel: 'Platinum', name: 'Alpenstrecke' },
];

// Im Shop gibt es je Stufe nur ein Design. Die anderen Designs bekommt man beim Sammeln.
const SHOP_PACKS = PACKS.filter((p) => ['standard', 'silber-1', 'gold-1', 'platin-1'].includes(p.id));

const bildKlein = (p) => `assets/packs/klein/${p.id}.webp`;
const bildGross = (p) => `assets/packs/${p.id}.webp`;

const STUFEN = [
  { id: 'standard', titel: 'Basis' },
  { id: 'silber', titel: 'Silver' },
  { id: 'gold', titel: 'Gold' },
  { id: 'platin', titel: 'Platinum' },
];

// Reihenfolge der Seiten unten im Menü (auch fürs Wischen zwischen den Seiten)
// Start (mit den Packs) steht in der Mitte
const TABS = ['rad', 'album', 'start', 'shop', 'mehr'];

const TAG_MS = 24 * 60 * 60 * 1000;

// Shop: Preis je Pack und die Währung, in der bezahlt wird. muenzen = RB Coins (gold), rubine = Rubin-Coins.
const PACK_PREISE = {
  standard: { waehrung: 'muenzen', preis: 35 },
  'silber-1': { waehrung: 'muenzen', preis: 80 },
  'gold-1': { waehrung: 'muenzen', preis: 200 },
  'platin-1': { waehrung: 'rubine', preis: 25 },
};
const WAEHRUNG_NAME = { muenzen: 'RB Coins', rubine: 'Rubin-Coins' };
const RUBIN_PREIS = 80; // RB Coins je Rubin-Coin
const START_MUENZEN = 100; // Startguthaben in RB Coins

const app = {
  daten: Store.laden(),
  ansicht: null,
  filter: null,    // Kategorie-Filter im Album
  packIndex: 0,    // welches Pack im Karussell in der Mitte ist
};

const $ = (id) => document.getElementById(id);

// ---------- Hilfen ----------

function packVonId(id) {
  return PACKS.find((p) => p.id === id);
}

function vorratVon(id) {
  return app.daten.vorrat[id] || 0;
}

function vorratGesamt() {
  return Object.values(app.daten.vorrat).reduce((a, b) => a + b, 0);
}

function speichern() {
  Store.speichern(app.daten);
}

// Freunde-ID: RB-XXXX-XXXX, ohne leicht verwechselbare Zeichen (0, 1, I, O)
const ID_ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_MUSTER = new RegExp(`^RB-[${ID_ZEICHEN}]{4}-[${ID_ZEICHEN}]{4}$`);

function neueSpielerId() {
  const teil = () => Array.from({ length: 4 }, () => ID_ZEICHEN[Math.floor(Math.random() * ID_ZEICHEN.length)]).join('');
  return `RB-${teil()}-${teil()}`;
}

function sichereSpielerId() {
  if (app.daten.spielerId) return;
  app.daten.spielerId = neueSpielerId();
  speichern();
}

// Wie lange es noch dauert, bis wieder 24 Stunden vorbei sind (0 = jetzt bereit)
function bereitIn(zeit) {
  if (!zeit) return 0;
  return Math.max(0, zeit + TAG_MS - Date.now());
}

// z. B. "5 Std. 12 Min."
function dauerText(ms) {
  const min = Math.max(1, Math.ceil(ms / 60000));
  const std = Math.floor(min / 60);
  const rest = min % 60;
  return std > 0 ? `${std} Std. ${rest} Min.` : `${rest} Min.`;
}

const tausender = (n) => n.toLocaleString('de-CH').replace(/[’']/g, ' ');

let hinweisTimer = null;
function zeigeHinweis(text) {
  const el = $('hinweis');
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('sichtbar');
  void el.offsetWidth;
  el.classList.add('sichtbar');
  clearTimeout(hinweisTimer);
  hinweisTimer = setTimeout(() => { el.classList.remove('sichtbar'); }, 2600);
}

// Eigene Rückfrage statt confirm(): confirm() ist in eingebetteten Seiten (z. B. im Artefakt) gesperrt
// und gibt dort sofort «Nein» zurück. Liefert true (ja) oder false (abbrechen).
// extra: dritte Wahl unter den Knöpfen, z. B. { text: 'Einem Freund schenken', gesperrt: false } → liefert 'extra'
function frage(text, ja = 'Ja', extra = null) {
  return new Promise((fertig) => {
    const box = $('frage');
    $('frage-text').textContent = text;
    $('frage-ja').textContent = ja;
    const extraKnopf = $('frage-extra');
    extraKnopf.hidden = !extra;
    if (extra) {
      extraKnopf.textContent = extra.text;
      extraKnopf.disabled = !!extra.gesperrt;
    }
    box.hidden = false;
    const taste = (e) => { if (e.key === 'Escape') schliessen(false); };
    const schliessen = (antwort) => {
      box.hidden = true;
      $('frage-ja').onclick = null;
      $('frage-nein').onclick = null;
      extraKnopf.onclick = null;
      box.onclick = null;
      document.removeEventListener('keydown', taste);
      fertig(antwort);
    };
    $('frage-ja').onclick = () => schliessen(true);
    $('frage-nein').onclick = () => schliessen(false);
    extraKnopf.onclick = () => schliessen('extra');
    box.onclick = (e) => { if (e.target === box) schliessen(false); };
    document.addEventListener('keydown', taste);
    $('frage-ja').focus({ preventScroll: true });
  });
}

// ---------- Seiten (Hash-Routing) ----------

function zeigeAnsicht(name, richtung = 0) {
  const ziel = document.querySelector(`[data-view="${name}"]`);
  if (!ziel) return zeigeAnsicht('start');

  // Wer das Album verlässt, hat die neuen Karten gesehen: die «Neu»-Sticker gehen weg
  if (app.ansicht === 'album' && name !== 'album' && app.daten.ungesehen.length) {
    app.daten.ungesehen = [];
    speichern();
  }

  document.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v !== ziel; });
  document.querySelectorAll('.tabbar [data-tab]').forEach((a) => {
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  app.ansicht = name;
  ziel.classList.remove('view', 'von-rechts', 'von-links');
  void ziel.offsetWidth; // Animation neu starten
  ziel.classList.add('view');
  if (richtung > 0) ziel.classList.add('von-rechts');
  if (richtung < 0) ziel.classList.add('von-links');
  window.scrollTo({ top: 0, behavior: 'instant' });
  aktualisiereAlles();
  if (name === 'start') {
    zeigePack(app.packIndex, false);
    karussellBeimScrollen();
  }
}

let naechsteRichtung = 0;
function aktuelleAnsichtAusHash() {
  const name = location.hash.replace('#', '') || 'start';
  zeigeAnsicht(name, naechsteRichtung);
  naechsteRichtung = 0;
}

function geheZuTab(name, richtung) {
  naechsteRichtung = richtung;
  location.hash = name;
}

// Echte Höhe von Kopfzeile und Menü unten messen, damit Start und Rad genau
// in den Bildschirm passen (CSS-Variablen --kopf-h und --nav-h, siehe Ende von style.css)
function misseRahmen() {
  const kopf = document.querySelector('.topbar');
  const nav = document.querySelector('.tabbar');
  const navRect = nav.getBoundingClientRect();
  // Menü unten (Handy, schwebend) zählt mit samt Abstand zum Rand, Menü oben in der Kopfzeile (Computer) nicht
  const navUnten = navRect.top > window.innerHeight / 2;
  // Die Kappe über dem Start-Knopf ragt über den Balken hinaus: ihre Oberkante zählt mit (nur auf dem Handy sichtbar)
  const kappe = nav.querySelector('.nav-kappe').getBoundingClientRect();
  const oben = kappe.height ? Math.min(navRect.top, kappe.top) : navRect.top;
  document.documentElement.style.setProperty('--kopf-h', `${Math.round(kopf.getBoundingClientRect().height)}px`);
  document.documentElement.style.setProperty('--nav-h', navUnten ? `${Math.round(window.innerHeight - oben + 8)}px` : '0px');
}

// Liegt der Finger in einer Liste, die selbst seitlich scrollt (z. B. die Kategorien im Album)?
// Dort wischt man durch die Liste, nicht zur nächsten Seite.
function seitlichScrollbar(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (e.scrollWidth > e.clientWidth + 2) {
      const ox = getComputedStyle(e).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}

// Auf dem Handy: nach links oder rechts wischen wechselt die Seite. Die Seite folgt dem Finger;
// beim Loslassen gleitet sie weiter (weit genug oder schnell genug) oder federt zurück.
// Nicht in Eingabefeldern, nicht auf [data-kein-wischen] (Packs-Karussell) und nicht in seitlich scrollenden Listen.
function bindeSeitenWischen() {
  const main = $('app');
  let start = null;     // { x, y, zeit } beim Aufsetzen des Fingers
  let richtung = null;  // 'h' = seitlich (Seite wechseln), 'v' = nach oben/unten (normal scrollen)
  let seite = null;
  let dx = 0;

  const zuruecksetzen = (el) => {
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
  };

  main.addEventListener('touchstart', (e) => {
    start = null;
    if (e.touches.length !== 1) return;
    if (e.target.closest('input, textarea, select, [data-kein-wischen]') || seitlichScrollbar(e.target)) return;
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, zeit: performance.now() };
    richtung = null;
    dx = 0;
    seite = document.querySelector(`[data-view="${app.ansicht}"]`);
  }, { passive: true });

  main.addEventListener('touchmove', (e) => {
    if (!start || !seite || e.touches.length !== 1) return;
    const t = e.touches[0];
    const x = t.clientX - start.x;
    const y = t.clientY - start.y;
    if (!richtung) {
      if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
      richtung = Math.abs(x) > Math.abs(y) * 1.2 ? 'h' : 'v';
      if (richtung === 'h') seite.style.transition = 'none';
    }
    if (richtung !== 'h') return;
    const i = TABS.indexOf(app.ansicht);
    const gibtEs = i >= 0 && TABS[i + (x < 0 ? 1 : -1)];
    dx = gibtEs ? x : x * 0.25; // am Rand (Rad ganz links, Mehr ganz rechts): nur ein kleiner Widerstand
    seite.style.transform = `translateX(${dx}px)`;
    seite.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.35));
  }, { passive: true });

  const loslassen = () => {
    if (!start || !seite || richtung !== 'h') {
      start = null;
      return;
    }
    const el = seite;
    const tempo = Math.abs(dx) / Math.max(1, performance.now() - start.zeit); // Pixel pro Millisekunde
    start = null;
    const i = TABS.indexOf(app.ansicht);
    const neu = i + (dx < 0 ? 1 : -1);
    const genug = Math.abs(dx) > 60 || (Math.abs(dx) > 25 && tempo > 0.35);
    if (i < 0 || neu < 0 || neu >= TABS.length || !genug) {
      el.style.transition = 'transform .3s cubic-bezier(.34,1.45,.64,1), opacity .2s ease';
      el.style.transform = '';
      el.style.opacity = '';
      setTimeout(() => { el.style.transition = ''; }, 320);
      return;
    }
    // Die Seite gleitet in Wischrichtung hinaus, dann kommt die neue von der anderen Seite herein
    el.style.transition = 'transform .15s ease-in, opacity .15s ease-in';
    el.style.transform = `translateX(${dx < 0 ? -40 : 40}%)`;
    el.style.opacity = '0';
    Gefuehl.ton('tick');
    Gefuehl.vibriere(6);
    setTimeout(() => {
      // erst zurücksetzen, wenn die alte Seite versteckt ist, sonst blitzt sie kurz auf
      window.addEventListener('hashchange', () => setTimeout(() => zuruecksetzen(el)), { once: true });
      geheZuTab(TABS[neu], dx < 0 ? 1 : -1);
    }, 140);
  };
  main.addEventListener('touchend', loslassen, { passive: true });
  main.addEventListener('touchcancel', loslassen, { passive: true });
}

// ---------- Anzeige ----------

function aktualisiereAlles() {
  zeichneKopf();
  zeichneStart();
  Rad.aktualisiere();
  zeichnePackDaten();
  if (app.ansicht === 'album') zeichneAlbum(); // 308 Karten: nur zeichnen, wenn das Album offen ist
  zeichneKonto();
  zeichneShop();
  Taeglich.zeichne();
  Erfolge.zeichne();
  Tauschen.zeichne();
  zeichnePunkte();
}

// Kopfzeile: Konto-Knopf mit Anfangsbuchstabe, Level und XP-Balken
// Letzter Münzstand, damit der Münzstand nur blinkt, wenn er sich wirklich ändert
let letzteMuenzen = null;

function blinkeMuenzstand() {
  const chip = document.querySelector('.muenz-chip');
  chip.classList.remove('stoss');
  void chip.offsetWidth; // startet die Animation auch bei zwei Änderungen direkt hintereinander neu
  chip.classList.add('stoss');
}

function zeichneKopf() {
  const { level, aktuell, noetig } = levelVon(app.daten.xp);
  const buchstabe = (app.daten.name || 'K').trim().charAt(0).toUpperCase() || 'K';
  $('avatar').textContent = buchstabe;
  $('muenz-zahl').textContent = tausender(app.daten.muenzen);
  if (letzteMuenzen !== null && letzteMuenzen !== app.daten.muenzen) blinkeMuenzstand();
  letzteMuenzen = app.daten.muenzen;
  // Level oben: Zahl, Balken, XP und der rote Ring um den Avatar (--xp)
  const anteil = `${Math.round((aktuell / noetig) * 100)}%`;
  $('lvl').textContent = level;
  $('lvl-balken').style.width = anteil;
  $('lvl-xp').textContent = `${tausender(aktuell)} / ${tausender(noetig)} XP`;
  document.querySelector('.level-chip').style.setProperty('--xp', anteil);
  $('level-zahl').textContent = level;
  $('xp-level').textContent = `Sammler-Level ${level}`;
  $('xp-zahl').textContent = `${tausender(aktuell)} / ${tausender(noetig)} XP`;
  $('xp-balken').style.width = `${Math.round((aktuell / noetig) * 100)}%`;
}

function gratisBereit() {
  return bereitIn(app.daten.gratisZeit) === 0;
}

// Start: was die Badge unter den Packs anzeigt und was beim Drücken passiert
function startZustand() {
  if (gratisBereit()) return { art: 'gratis', badge: 'Gratis-Pack bereit', icon: 'i-gift', label: 'Gratis-Pack öffnen' };
  if (Taeglich.etwasBereit()) return { art: 'taeglich', badge: 'Tagesbelohnung bereit', icon: 'i-gift', label: 'Tagesbelohnung öffnen' };
  const basis = vorratVon('standard');
  if (basis > 0) return { art: 'basis', badge: `${basis} Basis-Pack${basis > 1 ? 's' : ''} im Vorrat`, icon: 'i-pack-voll', label: 'Basis-Pack öffnen' };
  const alle = vorratGesamt();
  if (alle > 0) return { art: 'packs', badge: `${alle} Pack${alle > 1 ? 's' : ''} im Vorrat`, icon: 'i-pack-voll', label: 'Pack mit Vorrat zeigen' };
  const warten = `Gratis-Pack in ${dauerText(bereitIn(app.daten.gratisZeit))}`;
  if (Rad.bereit()) return { art: 'rad', badge: warten, icon: 'i-uhr', label: 'Zum Glücksrad' };
  return { art: 'warten', badge: warten, icon: 'i-uhr', label: warten };
}

function zeichneStart() {
  const z = startZustand();
  const badge = $('start-badge');
  badge.querySelector('use').setAttribute('href', `#${z.icon}`);
  badge.querySelector('span').textContent = z.badge;
  badge.classList.toggle('bereit', z.art === 'gratis' || z.art === 'taeglich');
  badge.disabled = z.art === 'warten';
  badge.setAttribute('aria-label', z.label);
  // Vorrat steht schon in der Zeile unter dem Pack: die Badge zeigt ihn nicht noch einmal
  badge.hidden = z.art === 'basis' || z.art === 'packs';
  // Bei der Wartezeit füllt sich ein Balken bis zum nächsten Gratis-Pack
  const wartet = z.art === 'rad' || z.art === 'warten';
  badge.classList.toggle('wartet', wartet);
  if (wartet) badge.style.setProperty('--fortschritt', `${Math.round((1 - bereitIn(app.daten.gratisZeit) / TAG_MS) * 100)}%`);
}

function startKnopf() {
  const z = startZustand();
  if (z.art === 'gratis') holeGratisPack();
  else if (z.art === 'taeglich') Taeglich.zeige();
  else if (z.art === 'basis') Oeffnen.oeffne('standard');
  else if (z.art === 'packs') zeigePack(PACKS.findIndex((p) => vorratVon(p.id) > 0));
  else if (z.art === 'rad') geheZuTab('rad', -1);
}

// Roter Punkt im Menü, wenn etwas bereit ist
function zeichnePunkte() {
  document.querySelector('[data-tab="start"]').classList.toggle('punkt', gratisBereit() || vorratGesamt() > 0);
  document.querySelector('[data-tab="rad"]').classList.toggle('punkt', Rad.bereit());
  document.querySelector('[data-tab="album"]').classList.toggle('punkt', app.daten.ungesehen.length > 0);
  document.querySelector('[data-tab="mehr"]').classList.toggle('punkt',
    Taeglich.etwasBereit() || Erfolge.etwasBereit() || Tauschen.etwasBereit());
}

// ---------- Packs: Reiter, Karussell, Ticket ----------

function baueKarussell() {
  $('pk-reiter').innerHTML = STUFEN.map((s) =>
    `<button type="button" role="tab" data-stufe="${s.id}" aria-selected="false">${s.titel}</button>`).join('');
  // pk-bild: Rahmen um das Pack-Bild für Glanz und Leuchten. --bild ist die Form für den Glanz (volle Adresse,
  // sonst sucht CSS das Bild im Ordner css/)
  $('pk-karussell').innerHTML = PACKS.map((p, i) => `
    <li data-index="${i}" data-stufe="${p.stufe}">
      <span class="pk-bild" style="--bild:url('${new URL(bildKlein(p), location.href).href}')">
        <img src="${bildKlein(p)}" alt="${p.titel} Pack ${p.name}" draggable="false">
      </span>
    </li>`).join('');
  $('pk-punkte').innerHTML = PACKS.map(() => '<i></i>').join('');
}

// Schiebt Pack Nummer i in die Mitte
function zeigePack(i, weich = true) {
  const liste = $('pk-karussell');
  const li = liste.children[i];
  if (!li) return;
  const ziel = li.offsetLeft - (liste.clientWidth - li.clientWidth) / 2;
  if (weich) {
    // Während des Gleitens das Einrasten ausschalten, sonst ruckelt die Bewegung
    liste.style.scrollSnapType = 'none';
    liste.scrollTo({ left: ziel, behavior: 'smooth' });
    const fertig = () => { liste.style.scrollSnapType = ''; liste.removeEventListener('scrollend', fertig); };
    liste.addEventListener('scrollend', fertig);
    // Sicherheit, falls scrollend nicht kommt. Bewusst lang: wird das Einrasten zu früh wieder aktiv,
    // zieht es das Pack mitten im Gleiten zurück zur alten Stelle.
    setTimeout(fertig, 2500);
  } else {
    liste.scrollTo({ left: ziel, behavior: 'instant' });
  }
  setzePackIndex(i);
}

function setzePackIndex(i) {
  app.packIndex = i;
  const p = PACKS[i];
  $('pk-stelle').textContent = `${i + 1} / ${PACKS.length}`;
  [...$('pk-punkte').children].forEach((el, j) => el.classList.toggle('an', j === i));
  [...$('pk-karussell').children].forEach((li, j) => li.classList.toggle('aktiv', j === i));
  $('pk-reiter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.stufe === p.stufe));
  zeichneTicket();
}

// Fokus auf das Pack in der Mitte, stufenlos beim Wischen:
// --s Grösse, --o Deckkraft, --f Fokus (1 = in der Mitte, 0 = daneben). Davon hängen im CSS auch
// Helligkeit, Höhe (weiter hinten), Leuchten und Schatten ab. Am Podest: --podest (wie genau ein Pack darauf steht)
function karussellBeimScrollen() {
  const liste = $('pk-karussell');
  const mitte = liste.scrollLeft + liste.clientWidth / 2;
  // Erst alle Masse lesen, dann schreiben: sonst berechnet der Browser bei jedem Schreiben das Layout neu
  const messung = [...liste.children].map((li) => ({
    li,
    abstand: Math.abs(li.offsetLeft + li.clientWidth / 2 - mitte) / li.clientWidth,
  }));
  let naechstes = 0;
  let kleinster = Infinity;
  const setze = (el, name, wert) => {
    if (el.dataset[name] === wert) return; // nur schreiben, wenn sich der Wert ändert: spart Arbeit beim Gleiten
    el.style.setProperty(`--${name}`, wert);
    el.dataset[name] = wert;
  };
  messung.forEach(({ li, abstand }, i) => {
    const d = Math.min(abstand, 1);
    setze(li, 's', (1 - d * 0.36).toFixed(3));
    setze(li, 'o', (1 - d * 0.25).toFixed(3));
    setze(li, 'f', (1 - d).toFixed(3));
    if (abstand < kleinster) { kleinster = abstand; naechstes = i; }
  });
  // Podestlicht: voll, wenn ein Pack genau in der Mitte steht, schwach mitten im Wischen; Farbe der Stufe
  const bereich = liste.parentElement;
  setze(bereich, 'podest', Math.max(0, 1 - kleinster * 2).toFixed(3));
  if (bereich.dataset.stufe !== PACKS[naechstes].stufe) bereich.dataset.stufe = PACKS[naechstes].stufe;
  if (naechstes !== app.packIndex) {
    setzePackIndex(naechstes);
    Gefuehl.ton('tick');
    Gefuehl.vibriere(5);
  }
}

function zeichnePackDaten() {
  [...$('pk-karussell').children].forEach((li, i) => {
    const n = vorratVon(PACKS[i].id);
    // kann: dieses Pack lässt sich jetzt öffnen (Vorrat oder Gratis-Pack), es leuchtet in der Farbe seiner Stufe
    li.classList.toggle('kann', n > 0 || (PACKS[i].id === 'standard' && gratisBereit()));
  });
  zeichneTicket();
}

// Die einzige Vorrat-Anzeige: Name, Anzahl und Garantie des Packs in der Mitte
function zeichneTicket() {
  const p = PACKS[app.packIndex];
  const n = vorratVon(p.id);
  const garantie = anfaengerBonusAktiv(app.daten.geoeffnet) ? 'rare' : KARTEN_GARANTIE[p.stufe];
  const teile = [p.name, n > 0 ? `${n}× im Vorrat` : 'keins im Vorrat'];
  if (garantie) teile.push(`Startbonus: mind. 1 ${seltenheitVon(garantie).name} oder höher (${ANFAENGER_PACKS - app.daten.geoeffnet} Packs übrig)`);
  $('tk-vorrat').textContent = teile.join(' · ');
  $('tk-vorrat').classList.toggle('hat', n > 0);
}

// ---------- Album ----------

// Wie oft man jede Karte hat, z. B. { RB001: 2 }
function besitz() {
  const anzahl = {};
  app.daten.karten.forEach((id) => { anzahl[id] = (anzahl[id] || 0) + 1; });
  return anzahl;
}

function zeichneAlbum() {
  const anzahl = besitz();
  const entdeckt = Object.keys(anzahl).length;
  $('st-entdeckt').textContent = `${entdeckt} / ${KARTEN.length}`;
  $('st-karten').textContent = app.daten.karten.length;
  $('st-geoeffnet').textContent = app.daten.geoeffnet;
  const prozent = Math.floor((entdeckt / KARTEN.length) * 100);
  $('st-balken').style.width = `${(entdeckt / KARTEN.length) * 100}%`;
  $('st-prozent').textContent = `${prozent} %`;

  const liste = $('rar-liste');
  liste.innerHTML = '';
  SELTENHEITEN.forEach((s, i) => {
    const alle = KARTEN_NACH_SELTENHEIT[s.id];
    const gefunden = alle.filter((k) => anzahl[k.id]).length;
    const li = document.createElement('li');
    li.style.setProperty('--i', i);
    li.innerHTML = `
      <button class="rar rar-${s.id}" type="button" data-filter="${s.id}" aria-pressed="${app.filter === s.id}">
        <span class="rar-stein" aria-hidden="true"></span>
        <b>${s.name}</b>
        <small>${gefunden} / ${alle.length} entdeckt · Wert ${SAMMELWERT[i]}</small>
        <span class="rar-balken" aria-hidden="true"><i style="width:${(gefunden / alle.length) * 100}%"></i></span>
      </button>`;
    liste.appendChild(li);
  });

  // Filter: Kategorie, Bahn, nur gesammelte, Suche nach Name oder ID
  const suche = $('al-suche').value.trim().toLowerCase();
  const bahn = $('al-bahn').value;
  const nurMeine = $('al-nur-meine').checked;
  const passt = (k) =>
    (!app.filter || k.seltenheit === app.filter)
    && (!bahn || k.bahn === bahn)
    && (!nurMeine || anzahl[k.id])
    && (!suche || `${k.id} ${k.name} ${k.zusatz || ''} ${k.bahn}`.toLowerCase().includes(suche));

  // Alle Karten stehen einmal im Album; neu gezeichnet wird nur eine Karte, deren Anzahl sich geändert hat.
  // Filter blenden nur ein und aus, damit die Suche beim Tippen nicht ruckelt.
  const grid = $('sam-karten');
  if (!grid.children.length) grid.innerHTML = KARTEN.map((k) => `<li data-id="${k.id}"></li>`).join('');
  // Reihenfolge: zuerst die neu gefundenen Karten, dann alle gesammelten, je Seltenheit,
  // dann die noch fehlenden, je Seltenheit
  const seltenheitNr = (k) => SELTENHEITEN.findIndex((s) => s.id === k.seltenheit);
  const ungesehen = new Set(app.daten.ungesehen);
  const reihenfolge = [...KARTEN].sort((a, b) =>
    (ungesehen.has(b.id) ? 1 : 0) - (ungesehen.has(a.id) ? 1 : 0)
    || (anzahl[b.id] ? 1 : 0) - (anzahl[a.id] ? 1 : 0) || seltenheitNr(a) - seltenheitNr(b));
  const schluessel = reihenfolge.map((k) => k.id).join(',');
  if (grid.dataset.reihe !== schluessel) {
    const lis = new Map([...grid.children].map((li) => [li.dataset.id, li]));
    reihenfolge.forEach((k) => grid.appendChild(lis.get(k.id)));
    grid.dataset.reihe = schluessel;
  }

  let gezeigt = 0;
  let gefundenHier = 0;
  const wunsch = new Set(app.daten.wunschliste);
  [...grid.children].forEach((li) => {
    const k = karteVonId(li.dataset.id);
    const n = anzahl[k.id] || 0;
    li.classList.toggle('ist-neu', ungesehen.has(k.id));
    // fehlende Karte auf der Wunschliste (antippen setzt oder entfernt sie, js/tauschen.js): Herz-Sticker
    li.classList.toggle('ist-wunsch', n === 0 && wunsch.has(k.id));
    const schluessel = String(n);
    if (li.dataset.n !== schluessel) {
      // Doppelte Karte verwerten: das entscheidet die Person selbst. Fehlende Karten haben keinen Knopf.
      const knopf = n > 1
        ? `<button class="kauf-knopf verwerten" type="button" data-verwerten="${k.id}">Verwerten · +${wertVon(k.id)} Coins</button>`
        : '';
      li.innerHTML = karteHtml(k.id, { anzahl: n, fehlt: n === 0 }) + knopf;
      li.dataset.n = schluessel;
    }
    li.hidden = !passt(k);
    if (!li.hidden) {
      gezeigt += 1;
      // Reihenfolge beim Einblenden: die Karten gleiten nacheinander ins Bild (CSS in bewegung.css)
      li.style.setProperty('--i', gezeigt);
      if (n) gefundenHier += 1;
    }
  });
  $('sam-leer').hidden = gezeigt > 0;
  $('sam-titel').textContent = `${app.filter ? seltenheitVon(app.filter).name : 'Alle Karten'} · ${gefundenHier} / ${gezeigt}`;
}

// Eine doppelte Karte verwerten: eine Kopie geht weg, dafür gibt es RB Coins.
// knopf: von dort fliegen die Münzen zur Anzeige oben. Gibt true zurück, wenn verwertet wurde.
async function verwerteDoppelte(id, knopf) {
  const k = karteVonId(id);
  const preis = wertVon(id);
  const zweiOderMehr = () => app.daten.karten.filter((x) => x === id).length >= 2;
  if (!zweiOderMehr()) return false;
  const frageText = `Doppelte Karte „${k.name}“ verwerten und dafür ${preis} RB Coins bekommen? Eine Karte bleibt in deinem Album.`;
  if (!(await frage(frageText, `+${preis} RB Coins`))) return false;
  if (!zweiOderMehr()) return false;
  app.daten.karten.splice(app.daten.karten.indexOf(id), 1);
  app.daten.muenzen += preis;
  if (knopf && knopf.isConnected) Gefuehl.muenzFlug(knopf, MUENZ_BILD.muenzen, Math.min(8, 2 + Math.ceil(preis / 10)));
  speichern();
  Taeglich.zaehle('verwerten');
  Erfolge.zaehle('verwertet');
  aktualisiereAlles();
  zeigeHinweis(`+${preis} RB Coins für ${k.name}.`);
  return true;
}

// ---------- Shop ----------

const MUENZ_BILD = { muenzen: 'assets/muenzen/gold-rund.png', rubine: 'assets/muenzen/rubin-rund.png' };
const muenzeHtml = (waehrung, klein) => `<img class="muenze${klein ? ' klein' : ''}" src="${MUENZ_BILD[waehrung]}" alt="" aria-hidden="true">`;

// Startguthaben in RB Coins, einmal pro Konto (auch für Sammler, die schon gespielt haben)
function muenzenBonusPruefen() {
  if (app.daten.bonusMuenzen) return;
  app.daten.bonusMuenzen = true;
  app.daten.muenzen += START_MUENZEN;
  speichern();
  zeigeHinweis(app.daten.geoeffnet === 0
    ? `Willkommen! Du hast ${START_MUENZEN} RB Coins geschenkt bekommen.`
    : `Start-Bonus: ${START_MUENZEN} RB Coins für dich.`);
}

// Die Liste mit allen Packs wird einmal aufgebaut, Preise und Knöpfe werden danach aktualisiert
function baueShop() {
  $('shop-liste').innerHTML = SHOP_PACKS.map((p) => `
    <li data-stufe="${p.stufe}">
      <img src="${bildKlein(p)}" alt="" draggable="false">
      <div class="shop-text">
        <b>${p.titel}</b>
        <span class="shop-name">${p.name}</span>
        <span class="shop-vorrat" data-vorrat="${p.id}" hidden></span>
        <div class="shop-kauf">
          <span class="shop-preis" data-preis="${p.id}"></span>
          <button class="btn" type="button" data-kaufen="${p.id}">Kaufen</button>
        </div>
      </div>
    </li>`).join('');
}

// Kleines Karten-Symbol vor «im Vorrat»
const VORRAT_SYMBOL = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="12" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

function zeichneShop() {
  $('shop-muenzen').textContent = tausender(app.daten.muenzen);
  $('shop-rubine').textContent = tausender(app.daten.rubine);
  $('rubin-kaufen').disabled = app.daten.muenzen < RUBIN_PREIS;
  const liste = $('shop-liste');
  if (!liste.children.length) return;
  SHOP_PACKS.forEach((p) => {
    const kosten = PACK_PREISE[p.id];
    // Vorrat nur zeigen, wenn man welche hat
    const vorrat = liste.querySelector(`[data-vorrat="${p.id}"]`);
    vorrat.innerHTML = `${VORRAT_SYMBOL}${vorratVon(p.id)} im Vorrat`;
    vorrat.hidden = vorratVon(p.id) === 0;
    liste.querySelector(`[data-preis="${p.id}"]`).innerHTML = kosten
      ? `${muenzeHtml(kosten.waehrung, true)}<span><b>${kosten.preis}</b><small>${WAEHRUNG_NAME[kosten.waehrung]}</small></span>`
      : '';
    liste.querySelector(`[data-kaufen="${p.id}"]`).disabled = !kosten || app.daten[kosten.waehrung] < kosten.preis;
  });
}

async function kaufePack(id) {
  const p = packVonId(id);
  const kosten = PACK_PREISE[id];
  if (!p || !kosten) return;
  const { waehrung, preis } = kosten;
  const name = WAEHRUNG_NAME[waehrung];
  if (app.daten[waehrung] < preis) {
    zeigeHinweis(`Dir fehlen ${tausender(preis - app.daten[waehrung])} ${name}.`);
    return;
  }
  // Unter Abbrechen und Kaufen: «Einem Freund schenken» (nur alle 48 Stunden)
  const warten = schenkenIn();
  const antwort = await frage(`${p.titel} Pack „${p.name}“ für ${preis} ${name} kaufen?`, 'Kaufen', {
    text: warten ? `Einem Freund schenken (wieder in ${dauerText(warten)})` : 'Einem Freund schenken',
    gesperrt: warten > 0,
  });
  if (antwort === 'extra') {
    verschenkePack(id);
    return;
  }
  if (!antwort) return;
  if (app.daten[waehrung] < preis) return;
  app.daten[waehrung] -= preis;
  app.daten.vorrat[id] = vorratVon(id) + 1;
  speichern();
  Taeglich.zaehle('kauf');
  Erfolge.zaehle('gekauft');
  aktualisiereAlles();
  Gefuehl.ton('muenze');
  Gefuehl.vibriere(15);
  zeigeHinweis(`${p.titel} Pack ist in deinem Vorrat.`);
}

// 1 Rubin-Coin kostet RUBIN_PREIS RB Coins
async function kaufeRubin() {
  if (app.daten.muenzen < RUBIN_PREIS) {
    zeigeHinweis(`Dir fehlen ${tausender(RUBIN_PREIS - app.daten.muenzen)} RB Coins.`);
    return;
  }
  if (!(await frage(`1 Rubin-Coin für ${RUBIN_PREIS} RB Coins kaufen?`, 'Kaufen'))) return;
  if (app.daten.muenzen < RUBIN_PREIS) return;
  app.daten.muenzen -= RUBIN_PREIS;
  app.daten.rubine += 1;
  speichern();
  aktualisiereAlles();
  Gefuehl.ton('muenze');
  Gefuehl.vibriere(15);
  zeigeHinweis('Du hast 1 Rubin-Coin dazubekommen.');
}

// ---------- Freunde ----------

function fuegeFreundHinzu(e) {
  e.preventDefault();
  const id = $('freund-id').value.trim().toUpperCase();
  if (!ID_MUSTER.test(id)) {
    zeigeHinweis('Die ID sieht so aus: RB-XXXX-XXXX');
    return;
  }
  if (id === app.daten.spielerId) {
    zeigeHinweis('Das ist deine eigene ID.');
    return;
  }
  if (app.daten.freunde.includes(id)) {
    zeigeHinweis('Diese ID ist schon in deiner Liste.');
    return;
  }
  app.daten.freunde.push(id);
  speichern();
  $('freund-id').value = '';
  aktualisiereAlles();
  zeigeHinweis('Freund hinzugefügt.');
}

function entferneFreund(id) {
  app.daten.freunde = app.daten.freunde.filter((f) => f !== id);
  speichern();
  aktualisiereAlles();
}

// Teilen: zuerst das Teilen-Menü des Handys (alle Chats und Apps). Das gibt es nur auf einer echten https-Seite;
// im Artefakt und in der Vorschau übers WLAN ist es gesperrt. Dann öffnet sich «Teilen über …» mit WhatsApp & Co.
async function teile(text, titel) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titel, text });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // selbst abgebrochen
    }
  }
  zeigeTeilenFenster(text, titel);
}

function zeigeTeilenFenster(text, titel) {
  const t = encodeURIComponent(text);
  $('teilen-wa').href = `https://wa.me/?text=${t}`;
  $('teilen-tg').href = `https://t.me/share/url?url=${t}`;
  $('teilen-sms').href = `sms:?&body=${t}`;
  $('teilen-mail').href = `mailto:?subject=${encodeURIComponent(titel)}&body=${t}`;
  $('teilen-text').textContent = text;
  $('teilen').hidden = false;
  $('teilen-kopieren').onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      zeigeHinweis('Kopiert. Füge es in einen Chat ein.');
    } catch (e) {
      // Kopieren gesperrt: Text markieren, dann «Kopieren» im Menü des Handys wählen
      getSelection().selectAllChildren($('teilen-text'));
      zeigeHinweis('Text ist markiert. Halte ihn gedrückt und wähle «Kopieren».');
    }
  };
  const zu = () => { $('teilen').hidden = true; };
  $('teilen-zu').onclick = zu;
  $('teilen').onclick = (e) => { if (e.target === $('teilen')) zu(); };
  // nach dem Antippen einer App schliesst das Fenster
  document.querySelectorAll('#teilen a.teilen-ziel').forEach((a) => { a.onclick = () => setTimeout(zu, 300); });
}

function teileId() {
  teile(`Sammle mit mir bei RailBase Legends! Meine Freunde-ID: ${app.daten.spielerId}`, 'Meine RailBase-ID');
}

// ---------- Geschenke ----------
// Ohne Server kommt ein Pack nicht von selbst beim Freund an. Darum gibt es einen Geschenk-Code:
// RBG-<Pack><Zufall>-<Empfänger-ID>-<Absender-ID>-<Prüfzeichen>. Nur der Empfänger kann ihn einlösen, jeden nur einmal.
// (In der Beta ohne Server lässt sich das nicht fälschungssicher machen.)

const GESCHENK_PAUSE = 48 * 60 * 60 * 1000;
const GESCHENK_MUSTER = new RegExp(`RBG-([${ID_ZEICHEN}])([${ID_ZEICHEN}]{4})-([${ID_ZEICHEN}]{8})-([${ID_ZEICHEN}]{8})-([${ID_ZEICHEN}]{2})`);

// Wie lange es noch dauert, bis man wieder schenken darf (0 = jetzt)
function schenkenIn() {
  if (!app.daten.geschenkZeit) return 0;
  return Math.max(0, app.daten.geschenkZeit + GESCHENK_PAUSE - Date.now());
}

const idTeil = (id) => id.replace(/^RB-/, '').replace('-', '');
const idAusTeil = (teil) => `RB-${teil.slice(0, 4)}-${teil.slice(4)}`;

function pruefzeichen(kern) {
  const h = [...kern].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  return ID_ZEICHEN[h % 32] + ID_ZEICHEN[(h >>> 5) % 32];
}

function geschenkCode(packId, freund) {
  const pack = ID_ZEICHEN[PACKS.findIndex((p) => p.id === packId)];
  const zufall = Array.from({ length: 4 }, () => ID_ZEICHEN[Math.floor(Math.random() * ID_ZEICHEN.length)]).join('');
  const kern = `${pack}${zufall}-${idTeil(freund)}-${idTeil(app.daten.spielerId)}`;
  return `RBG-${kern}-${pruefzeichen(kern)}`;
}

// Fenster «Pack verschenken»: Schritt 1 Freund wählen (liefert die ID oder null)
function waehleFreund(text) {
  return new Promise((fertig) => {
    const box = $('geschenk');
    $('geschenk-text').textContent = text;
    $('geschenk-freunde').hidden = false;
    $('geschenk-freunde').innerHTML = app.daten.freunde.map((id) =>
      `<li><button class="btn ghost" type="button" data-freund="${esc(id)}">${esc(id)}</button></li>`).join('');
    $('geschenk-code-box').hidden = true;
    $('geschenk-teilen').hidden = true;
    $('geschenk-zu').textContent = 'Abbrechen';
    box.hidden = false;
    const schliessen = (id) => {
      box.hidden = true;
      $('geschenk-freunde').onclick = null;
      $('geschenk-zu').onclick = null;
      box.onclick = null;
      fertig(id);
    };
    $('geschenk-freunde').onclick = (e) => {
      const b = e.target.closest('[data-freund]');
      if (b) schliessen(b.dataset.freund);
    };
    $('geschenk-zu').onclick = () => schliessen(null);
    box.onclick = (e) => { if (e.target === box) schliessen(null); };
  });
}

// Schritt 2: der Code zum Teilen
function zeigeGeschenkCode(code, p, freund) {
  const box = $('geschenk');
  $('geschenk-text').textContent = `Geschenk bereit! Schick ${freund} diesen Code für das ${p.titel} Pack:`;
  $('geschenk-freunde').hidden = true;
  $('geschenk-code').textContent = code;
  $('geschenk-code-box').hidden = false;
  $('geschenk-teilen').hidden = false;
  $('geschenk-zu').textContent = 'Fertig';
  box.hidden = false;
  const text = `Ich schenke dir ein ${p.titel} Pack in RailBase Legends! Löse den Code unter Mehr → Konto und Design → Geschenk einlösen ein: ${code}`;
  $('geschenk-teilen').onclick = () => teile(text, 'RailBase-Geschenk');
  $('geschenk-zu').onclick = () => { box.hidden = true; };
  box.onclick = null;
}

async function verschenkePack(id) {
  const p = packVonId(id);
  const { waehrung, preis } = PACK_PREISE[id];
  const name = WAEHRUNG_NAME[waehrung];
  if (schenkenIn() > 0) return;
  if (!app.daten.freunde.length) {
    zeigeHinweis('Füge zuerst unter Mehr → Freunde einen Freund hinzu.');
    return;
  }
  const freund = await waehleFreund(`${p.titel} Pack „${p.name}“ für ${preis} ${name} verschenken. An wen?`);
  if (!freund || app.daten[waehrung] < preis || schenkenIn() > 0) return;
  app.daten[waehrung] -= preis;
  app.daten.geschenkZeit = Date.now();
  const code = geschenkCode(id, freund);
  speichern();
  Erfolge.zaehle('geschenkt');
  aktualisiereAlles();
  Gefuehl.ton('gewinn');
  Gefuehl.vibriere([30, 40, 60]);
  zeigeGeschenkCode(code, p, freund);
}

// Beta-Code zum Testen: einmal pro Gerät 10 Packs von jeder Sorte, 1000 RB Coins und 30 Extra-Drehungen am Rad
const BETA_CODE = 'HCKD-BETA';

function loeseBetaCodeEin() {
  if (app.daten.eingeloest.includes(BETA_CODE)) return zeigeHinweis('Den Beta-Code hast du auf diesem Gerät schon eingelöst.');
  app.daten.eingeloest.push(BETA_CODE);
  PACKS.forEach((p) => { app.daten.vorrat[p.id] = vorratVon(p.id) + 10; });
  app.daten.muenzen += 1000;
  app.daten.radExtra = (app.daten.radExtra || 0) + 30;
  speichern();
  $('geschenk-eingabe').value = '';
  aktualisiereAlles();
  Gefuehl.ton('gewinn');
  Gefuehl.vibriere([30, 40, 80]);
  Gefuehl.konfetti(['#ffd34d', '#ff4251', '#ffffff', '#4aa3ff'], 80);
  Gefuehl.muenzFlug($('geschenk-form'), MUENZ_BILD.muenzen, 8);
  zeigeHinweis('Beta-Code eingelöst: 10 Packs von jeder Sorte, 1000 RB Coins und 30 Drehungen am Glücksrad!');
}

// Geschenk einlösen: der Code darf auch mitten in der geteilten Nachricht stehen
function loeseGeschenkEin(e) {
  e.preventDefault();
  if ($('geschenk-eingabe').value.trim().toUpperCase() === BETA_CODE) return loeseBetaCodeEin();
  const treffer = $('geschenk-eingabe').value.toUpperCase().match(GESCHENK_MUSTER);
  const ungueltig = () => zeigeHinweis('Das ist kein gültiger Geschenk-Code.');
  if (!treffer) return ungueltig();
  const [code, pack, zufall, empfaenger, absender, pruef] = treffer;
  const p = PACKS[ID_ZEICHEN.indexOf(pack)];
  if (!p || pruefzeichen(`${pack}${zufall}-${empfaenger}-${absender}`) !== pruef) return ungueltig();
  if (empfaenger !== idTeil(app.daten.spielerId)) return zeigeHinweis('Dieses Geschenk ist für eine andere ID.');
  if (app.daten.eingeloest.includes(code)) return zeigeHinweis('Dieses Geschenk hast du schon eingelöst.');
  app.daten.eingeloest.push(code);
  app.daten.vorrat[p.id] = vorratVon(p.id) + 1;
  speichern();
  $('geschenk-eingabe').value = '';
  aktualisiereAlles();
  Gefuehl.ton('gewinn');
  Gefuehl.vibriere([30, 40, 80]);
  Gefuehl.konfetti(['#ffd34d', '#ff4251', '#ffffff', '#4aa3ff'], 60);
  zeigeHinweis(`Geschenk von ${idAusTeil(absender)}: ${p.titel}-Pack liegt in deinem Vorrat!`);
}

// ---------- Test-Paket (nur zum Ausprobieren) ----------
// Sichtbar nur in der Vorschau auf dem Computer (localhost, Heimnetz) und im Claude-Artefakt,
// nie auf einer echten Webseite. Gibt 500 RB Coins und füllt jedes Pack auf 10 Stück auf.
const TEST_ERLAUBT = (() => {
  const h = location.hostname;
  return h === '' || h === 'localhost' || /^(127\.|10\.|192\.168\.)/.test(h) || h.includes('claude');
})();

function holeTestPaket() {
  app.daten.muenzen += 500;
  PACKS.forEach((p) => { app.daten.vorrat[p.id] = Math.max(vorratVon(p.id), 10); });
  speichern();
  aktualisiereAlles();
  Gefuehl.ton('gewinn');
  Gefuehl.muenzFlug($('test-paket-knopf'), MUENZ_BILD.muenzen, 8);
  zeigeHinweis('Test-Paket: +500 RB Coins und 10 Packs von jeder Sorte.');
}

function zeichneFreunde() {
  $('spieler-id').textContent = app.daten.spielerId;
  $('freund-liste').innerHTML = app.daten.freunde.map((id) =>
    `<li><code>${esc(id)}</code><button class="btn ghost" type="button" data-entfernen="${esc(id)}">Entfernen</button></li>`).join('');
  $('freund-leer').hidden = app.daten.freunde.length > 0;
}

// ---------- Konto ----------

function zeichneKonto() {
  const feld = $('konto-name');
  if (document.activeElement !== feld) feld.value = app.daten.name || '';
  $('avatar-gross').textContent = $('avatar').textContent;
  $('profil-name').textContent = app.daten.name || 'Sammler';
  const { level } = levelVon(app.daten.xp);
  $('profil-level').textContent = `Sammler-Level ${level} · ${tausender(app.daten.xp)} XP gesamt`;
  zeichneFreunde();
  const theme = document.documentElement.getAttribute('data-theme');
  document.querySelectorAll('[data-design]').forEach((b) => b.setAttribute('aria-checked', b.dataset.design === theme));
  $('ton-an').checked = app.daten.ton !== false;
}

function speichereName(e) {
  e.preventDefault();
  app.daten.name = $('konto-name').value.trim().slice(0, 30);
  speichern();
  aktualisiereAlles();
  zeigeHinweis('Name gespeichert.');
}

async function setzeAlleZurueck() {
  if (!(await frage('Wirklich alles auf diesem Gerät löschen? Packs, Karten, Level und Coins gehen verloren.', 'Alles löschen'))) return;
  Store.zuruecksetzen();
  app.daten = Store.laden();
  sichereSpielerId();
  muenzenBonusPruefen();
  app.filter = null;
  $('sam-karten').innerHTML = '';
  aktualisiereAlles();
  zeigeHinweis('Alles zurückgesetzt.');
}

function waehleDesign(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#121315' : '#E4E7EA');
  try { localStorage.setItem('sk-theme', theme); } catch (e) { /* ignorieren */ }
  zeichneKonto();
}

// ---------- Gratis-Pack ----------

function holeGratisPack() {
  if (!gratisBereit()) return;
  app.daten.vorrat.standard = vorratVon('standard') + 1;
  app.daten.gratisZeit = Date.now();
  speichern();
  aktualisiereAlles();
  Oeffnen.oeffne('standard');
}

// ---------- Start ----------

document.addEventListener('DOMContentLoaded', () => {
  // Karten-IDs, die es im Spiel nicht (mehr) gibt, aus dem Spielstand entfernen.
  // Karten ohne Foto (noch in ALLE_KARTEN) gibt es dabei zum Verwerten-Wert in RB Coins zurück.
  const weg = app.daten.karten.filter((id) => !karteVonId(id));
  if (weg.length) {
    const ersatz = weg.reduce((summe, id) => {
      const k = ALLE_KARTEN.find((x) => x.id === id);
      return summe + (k ? SAMMELWERT[rangVon(k.seltenheit)] : 0);
    }, 0);
    app.daten.karten = app.daten.karten.filter((id) => karteVonId(id));
    app.daten.ungesehen = app.daten.ungesehen.filter((id) => karteVonId(id));
    app.daten.muenzen += ersatz;
    speichern();
    if (ersatz) setTimeout(() => zeigeHinweis(`+${ersatz} RB Coins für ${weg.length} entfernte Karten`), 1500);
  }

  muenzenBonusPruefen();

  sichereSpielerId();
  baueKarussell();
  baueShop();
  Oeffnen.init();
  Rad.init();
  Gefuehl.init();
  Taeglich.init();
  Erfolge.init();
  Tauschen.init();

  $('start-badge').addEventListener('click', startKnopf);
  $('konto-form').addEventListener('submit', speichereName);
  $('freund-form').addEventListener('submit', fuegeFreundHinzu);
  $('freund-liste').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-entfernen]');
    if (btn) entferneFreund(btn.dataset.entfernen);
  });
  $('id-teilen').addEventListener('click', teileId);
  $('geschenk-form').addEventListener('submit', loeseGeschenkEin);
  $('sam-karten').addEventListener('click', (e) => {
    const verwerten = e.target.closest('[data-verwerten]');
    if (verwerten) verwerteDoppelte(verwerten.dataset.verwerten, verwerten);
    // Gesammelte Karte antippen: gross ansehen und mit dem Finger neigen
    const karte = !e.target.closest('button') && e.target.closest('.karte:not(.fehlt)');
    if (karte) Gefuehl.zeigeKarte(karte.dataset.karte, besitz()[karte.dataset.karte] || 0);
    // Fehlende Karte antippen: auf die Wunschliste setzen oder wieder entfernen
    const fehlt = !e.target.closest('button') && e.target.closest('.karte.fehlt');
    if (fehlt) Tauschen.wuensche(fehlt.dataset.karte);
  });
  // Grossansicht: Knopf «Verwerten» (ab 2 gleichen Karten, sonst nur ein Hinweis)
  $('kv-verwerten').addEventListener('click', async (e) => {
    const knopf = e.currentTarget;
    const id = knopf.dataset.id;
    if ((besitz()[id] || 0) < 2) {
      zeigeHinweis('Verwerten geht erst ab 2 gleichen Karten.');
      return;
    }
    if (await verwerteDoppelte(id, knopf)) Gefuehl.zeigeVerwerten(id, besitz()[id] || 0);
  });
  // Album: kleine Info-Schaltfläche neben dem Titel öffnet die Erklärung
  const albumInfoZu = () => {
    if ($('album-info').hidden) return;
    $('album-info').hidden = true;
    document.body.classList.remove('op-offen');
  };
  $('album-info-knopf').addEventListener('click', () => {
    $('album-info-werte').textContent = SELTENHEITEN.map((s, i) => `${s.name} ${SAMMELWERT[i]}`).join(', ');
    $('album-info-anzahl').textContent = KARTEN.length;
    $('album-info-bahnen').textContent = new Set(KARTEN.map((k) => k.bahn)).size;
    $('album-info').hidden = false;
    document.body.classList.add('op-offen');
    $('album-info-zu').focus({ preventScroll: true });
  });
  $('album-info-zu').addEventListener('click', albumInfoZu);
  $('album-info').addEventListener('click', (e) => { if (e.target === $('album-info')) albumInfoZu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') albumInfoZu(); });
  // Mehr → Bildnachweise: Fotograf und Lizenz jedes Kartenfotos (die Liste entsteht erst beim Öffnen)
  const bildInfoZu = () => {
    if ($('bild-info').hidden) return;
    $('bild-info').hidden = true;
    document.body.classList.remove('op-offen');
  };
  $('bild-info-knopf').addEventListener('click', (e) => {
    e.preventDefault();
    if (!$('bild-liste').childElementCount) {
      $('bild-liste').innerHTML = KARTEN.filter((k) => fotoVon(k.id))
        .map((k) => `<li><b>${k.id} ${esc(k.name)}</b><span>${fotoNachweisHtml(k.id)}</span></li>`).join('');
    }
    $('bild-info').hidden = false;
    document.body.classList.add('op-offen');
    $('bild-info-zu').focus({ preventScroll: true });
  });
  $('bild-info-zu').addEventListener('click', bildInfoZu);
  $('bild-info').addEventListener('click', (e) => { if (e.target === $('bild-info')) bildInfoZu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') bildInfoZu(); });
  $('ton-an').addEventListener('change', (e) => {
    app.daten.ton = e.target.checked;
    speichern();
    Gefuehl.ton('tipp');
    Gefuehl.vibriere(10);
  });
  $('shop-liste').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-kaufen]');
    if (btn && !btn.disabled) kaufePack(btn.dataset.kaufen);
  });
  $('rubin-kaufen').addEventListener('click', kaufeRubin);
  $('reset-btn').addEventListener('click', setzeAlleZurueck);
  $('test-paket').hidden = !TEST_ERLAUBT;
  // App-Knopf unter «Mehr»: die APK gibt es nur für Android; auf dem iPhone der Weg über Safari
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    $('app-laden').removeAttribute('href');
    $('app-laden').removeAttribute('download');
    $('app-laden').querySelector('b').textContent = 'Als App auf dem iPhone';
    $('app-laden-text').textContent = 'In Safari: Teilen → Zum Home-Bildschirm';
  }
  $('test-paket-knopf').addEventListener('click', holeTestPaket);
  document.querySelectorAll('[data-design]').forEach((b) => b.addEventListener('click', () => waehleDesign(b.dataset.design)));
  waehleDesign(document.documentElement.getAttribute('data-theme'));

  // Karussell: wischen, Reiter, Tippen auf ein Pack (keine Pfeile mehr)
  const karussell = $('pk-karussell');
  let scrollRahmen = 0;
  karussell.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollRahmen);
    scrollRahmen = requestAnimationFrame(karussellBeimScrollen);
  }, { passive: true });
  $('pk-reiter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-stufe]');
    if (b) zeigePack(PACKS.findIndex((p) => p.stufe === b.dataset.stufe));
  });
  // Pack daneben antippen: in die Mitte holen. Pack in der Mitte antippen: öffnen
  // (Basis-Pack: zuerst das Gratis-Pack, wenn es bereit ist)
  karussell.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-index]');
    if (!li) return;
    const i = Number(li.dataset.index);
    const id = PACKS[i].id;
    if (i !== app.packIndex) zeigePack(i);
    else if (id === 'standard' && gratisBereit()) holeGratisPack();
    else if (vorratVon(id) > 0) Oeffnen.oeffne(id);
    else zeigeHinweis('Keins im Vorrat. Im Shop gibt es Packs.');
  });

  $('rar-liste').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    app.filter = app.filter === btn.dataset.filter ? null : btn.dataset.filter;
    zeichneAlbum();
  });
  $('al-bahn').insertAdjacentHTML('beforeend', BAHNEN.map((b) => `<option value="${b}">${b}</option>`).join(''));
  $('al-suche').addEventListener('input', zeichneAlbum);
  $('al-bahn').addEventListener('change', zeichneAlbum);
  $('al-nur-meine').addEventListener('change', zeichneAlbum);

  // Menü unten: Richtung merken, damit die neue Seite von der richtigen Seite hereingleitet
  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const a = e.target.closest('[data-tab]');
    if (!a) return;
    naechsteRichtung = Math.sign(TABS.indexOf(a.dataset.tab) - TABS.indexOf(app.ansicht));
    Gefuehl.ton('tick');
    Gefuehl.vibriere(6);
  });

  misseRahmen();
  new ResizeObserver(misseRahmen).observe(document.querySelector('.topbar'));
  window.addEventListener('resize', misseRahmen);
  document.fonts.ready.then(misseRahmen);

  window.addEventListener('hashchange', aktuelleAnsichtAusHash);
  bindeSeitenWischen();
  aktuelleAnsichtAusHash();
  karussellBeimScrollen();

  // Countdowns aktualisieren
  setInterval(() => {
    zeichneStart();
    Rad.aktualisiere();
    zeichnePunkte();
  }, 30000);
});
