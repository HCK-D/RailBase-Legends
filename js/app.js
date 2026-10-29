/* Sammelkarten-Beta: Seiten, Start, Packs-Karussell, Album, Konto, Level.
   Daten über store.js, Karten in karten.js, Öffnen in oeffnen.js, Glücksrad in rad.js. */

// Die 7 Pack-Designs.
// Bilder: assets/packs/<id>.webp (gross, zum Öffnen) und assets/packs/klein/<id>.webp (Listen).
const PACKS = [
  { id: 'standard', stufe: 'standard', titel: 'Basis', name: 'Schweizer Bahn' },
  { id: 'silber-1', stufe: 'silber', titel: 'Silver', name: 'Alpenpanorama' },
  { id: 'silber-2', stufe: 'silber', titel: 'Silver', name: 'Herbsttal' },
  { id: 'gold-1', stufe: 'gold', titel: 'Gold', name: 'Schweizer Viadukt' },
  { id: 'gold-2', stufe: 'gold', titel: 'Gold', name: 'Lavaux' },
  { id: 'platin-1', stufe: 'platin', titel: 'Platinum', name: 'Alpentunnel' },
  { id: 'platin-2', stufe: 'platin', titel: 'Platinum', name: 'Alpenstrecke' },
];

const bildKlein = (p) => `assets/packs/klein/${p.id}.webp`;
const bildGross = (p) => `assets/packs/${p.id}.webp`;

const STUFEN = [
  { id: 'standard', titel: 'Basis' },
  { id: 'silber', titel: 'Silver' },
  { id: 'gold', titel: 'Gold' },
  { id: 'platin', titel: 'Platinum' },
];

// Reihenfolge der Seiten unten im Menü (auch fürs Wischen zwischen den Seiten)
const TABS = ['start', 'packs', 'rad', 'album', 'mehr'];

const TAG_MS = 24 * 60 * 60 * 1000;

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

// ---------- Seiten (Hash-Routing) ----------

function zeigeAnsicht(name, richtung = 0) {
  const ziel = document.querySelector(`[data-view="${name}"]`);
  if (!ziel) return zeigeAnsicht('start');

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
  if (name === 'packs') zeigePack(app.packIndex, false);
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

// Auf dem Handy: nach links oder rechts wischen wechselt die Seite
function bindeSeitenWischen() {
  let x0 = 0;
  let y0 = 0;
  let aktiv = false;
  const main = $('app');

  main.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    aktiv = e.touches.length === 1 && !e.target.closest('input, textarea, select, [data-kein-wischen]');
    x0 = t.clientX;
    y0 = t.clientY;
  }, { passive: true });

  main.addEventListener('touchend', (e) => {
    if (!aktiv) return;
    aktiv = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const i = TABS.indexOf(app.ansicht);
    if (i < 0) return;
    const neu = i + (dx < 0 ? 1 : -1);
    if (neu < 0 || neu >= TABS.length) return;
    geheZuTab(TABS[neu], dx < 0 ? 1 : -1);
  }, { passive: true });
}

// ---------- Anzeige ----------

function aktualisiereAlles() {
  zeichneKopf();
  zeichneStart();
  Rad.aktualisiere();
  zeichnePackDaten();
  zeichneAlbum();
  zeichneKonto();
  zeichnePunkte();
}

// Kopfzeile: Konto-Knopf mit Anfangsbuchstabe, Level und XP-Balken
function zeichneKopf() {
  const { level, aktuell, noetig } = levelVon(app.daten.xp);
  const buchstabe = (app.daten.name || 'K').trim().charAt(0).toUpperCase() || 'K';
  $('avatar').textContent = buchstabe;
  $('lvl').textContent = `LVL ${level}`;
  $('xp-level').textContent = `Sammler-Level ${level}`;
  $('xp-zahl').textContent = `${tausender(aktuell)} / ${tausender(noetig)} XP`;
  $('xp-balken').style.width = `${Math.round((aktuell / noetig) * 100)}%`;
}

function gratisBereit() {
  return bereitIn(app.daten.gratisZeit) === 0;
}

// Start: was der grosse Knopf gerade tut
function startZustand() {
  if (gratisBereit()) return { art: 'gratis', badge: 'Gratis-Pack bereit', icon: 'i-gift', knopf: 'Pack öffnen' };
  const basis = vorratVon('standard');
  if (basis > 0) return { art: 'basis', badge: `${basis} Basis-Pack${basis > 1 ? 's' : ''} im Vorrat`, icon: 'i-pack-voll', knopf: 'Pack öffnen' };
  const alle = vorratGesamt();
  if (alle > 0) return { art: 'packs', badge: `${alle} Pack${alle > 1 ? 's' : ''} im Vorrat`, icon: 'i-pack-voll', knopf: 'Zu den Packs' };
  if (Rad.bereit()) return { art: 'rad', badge: `Gratis-Pack in ${dauerText(bereitIn(app.daten.gratisZeit))}`, icon: 'i-uhr', knopf: 'Glücksrad drehen' };
  return { art: 'warten', badge: `Gratis-Pack in ${dauerText(bereitIn(app.daten.gratisZeit))}`, icon: 'i-uhr', knopf: 'Morgen wieder' };
}

function zeichneStart() {
  const z = startZustand();
  const badge = $('start-badge');
  badge.querySelector('use').setAttribute('href', `#${z.icon}`);
  badge.querySelector('span').textContent = z.badge;
  badge.classList.toggle('bereit', z.art === 'gratis');
  $('start-btn-txt').textContent = z.knopf;
  $('start-btn').disabled = z.art === 'warten';
}

function startKnopf() {
  const z = startZustand();
  if (z.art === 'gratis') holeGratisPack();
  else if (z.art === 'basis') Oeffnen.oeffne('standard');
  else if (z.art === 'packs') geheZuTab('packs', 1);
  else if (z.art === 'rad') geheZuTab('rad', 1);
}

// Roter Punkt im Menü, wenn etwas bereit ist
function zeichnePunkte() {
  document.querySelector('[data-tab="start"]').classList.toggle('punkt', gratisBereit());
  document.querySelector('[data-tab="rad"]').classList.toggle('punkt', Rad.bereit());
  document.querySelector('[data-tab="packs"]').classList.toggle('punkt', vorratGesamt() > 0);
}

// ---------- Packs: Reiter, Karussell, Ticket ----------

function baueKarussell() {
  $('pk-reiter').innerHTML = STUFEN.map((s) =>
    `<button type="button" role="tab" data-stufe="${s.id}" aria-selected="false">${s.titel}</button>`).join('');
  $('pk-karussell').innerHTML = PACKS.map((p, i) => `
    <li data-index="${i}">
      <img src="${bildKlein(p)}" alt="${p.titel} Pack ${p.name}" draggable="false">
      <span class="vorrat"></span>
    </li>`).join('');
  $('pk-punkte').innerHTML = PACKS.map(() => '<i></i>').join('');
}

// Schiebt Pack Nummer i in die Mitte
function zeigePack(i, weich = true) {
  const liste = $('pk-karussell');
  const li = liste.children[i];
  if (!li) return;
  liste.scrollTo({ left: li.offsetLeft - (liste.clientWidth - li.clientWidth) / 2, behavior: weich ? 'smooth' : 'instant' });
  setzePackIndex(i);
}

function setzePackIndex(i) {
  app.packIndex = i;
  const p = PACKS[i];
  $('pk-stelle').textContent = `${i + 1} / ${PACKS.length}`;
  [...$('pk-punkte').children].forEach((el, j) => el.classList.toggle('an', j === i));
  $('pk-reiter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.stufe === p.stufe));
  zeichneTicket();
}

// Grösse und Helligkeit je nach Abstand zur Mitte
function karussellBeimScrollen() {
  const liste = $('pk-karussell');
  const mitte = liste.scrollLeft + liste.clientWidth / 2;
  let naechstes = 0;
  let kleinster = Infinity;
  [...liste.children].forEach((li, i) => {
    const abstand = Math.abs(li.offsetLeft + li.clientWidth / 2 - mitte) / li.clientWidth;
    const d = Math.min(abstand, 1);
    li.style.setProperty('--s', (1 - d * 0.22).toFixed(3));
    li.style.setProperty('--o', (1 - d * 0.45).toFixed(3));
    if (abstand < kleinster) { kleinster = abstand; naechstes = i; }
  });
  if (naechstes !== app.packIndex) setzePackIndex(naechstes);
}

function zeichnePackDaten() {
  [...$('pk-karussell').children].forEach((li, i) => {
    const n = vorratVon(PACKS[i].id);
    const el = li.querySelector('.vorrat');
    el.textContent = n > 0 ? `${PACKS[i].name} · ${n}×` : PACKS[i].name;
    el.classList.toggle('hat', n > 0);
  });
  zeichneTicket();
}

function zeichneTicket() {
  const p = PACKS[app.packIndex];
  const n = vorratVon(p.id);
  const garantie = KARTEN_GARANTIE[p.stufe];
  $('tk-name').textContent = `${p.titel} Pack`;
  $('tk-info').textContent = `${KARTEN_PRO_PACK} Karten`;
  const g = $('tk-garantie');
  if (garantie) {
    g.hidden = false;
    g.querySelector('span').textContent = `Mind. 1 ${seltenheitVon(garantie).name}`;
    g.title = `Mindestens 1 ${seltenheitVon(garantie).name}-Karte pro Pack`;
  } else if (p.stufe === 'standard') {
    g.hidden = false;
    g.querySelector('span').textContent = 'Gratis alle 24 h';
  } else {
    g.hidden = true;
  }
  $('tk-btn').disabled = n === 0;
  $('tk-btn-txt').textContent = n > 0 ? 'Pack öffnen' : 'Keins im Vorrat';
}

// ---------- Album ----------

function zeichneAlbum() {
  const karten = app.daten.karten;
  $('st-karten').textContent = karten.length;
  $('st-geoeffnet').textContent = app.daten.geoeffnet;
  $('st-vorrat').textContent = vorratGesamt();

  const liste = $('rar-liste');
  liste.innerHTML = '';
  SELTENHEITEN.forEach((s, i) => {
    const n = karten.filter((k) => k.seltenheit === s.id).length;
    const li = document.createElement('li');
    li.style.setProperty('--i', i);
    li.innerHTML = `
      <button class="rar rar-${s.id}" type="button" data-filter="${s.id}" aria-pressed="${app.filter === s.id}">
        <span class="rar-stein" aria-hidden="true"></span>
        <b>${s.name}</b>
        <small>${n} ${n === 1 ? 'Karte' : 'Karten'}</small>
      </button>`;
    liste.appendChild(li);
  });

  // Karten, seltenste zuerst; mit Filter nur eine Kategorie
  const gezeigt = karten
    .filter((k) => !app.filter || k.seltenheit === app.filter)
    .slice()
    .sort((a, b) => rangVon(b.seltenheit) - rangVon(a.seltenheit) || a.nr - b.nr);
  $('sam-karten').innerHTML = gezeigt.slice(0, 60).map((k, i) => `<li style="--i:${Math.min(i, 12)}">${karteHtml(k)}</li>`).join('');
  $('sam-leer').hidden = karten.length > 0;
  $('sam-titel').hidden = karten.length === 0;
  $('sam-titel').textContent = app.filter
    ? `${seltenheitVon(app.filter).name} (${gezeigt.length})`
    : `Meine Karten (${karten.length})`;
}

// ---------- Konto ----------

function zeichneKonto() {
  const feld = $('konto-name');
  if (document.activeElement !== feld) feld.value = app.daten.name || '';
  $('avatar-gross').textContent = $('avatar').textContent;
  $('profil-name').textContent = app.daten.name || 'Sammler';
  const { level } = levelVon(app.daten.xp);
  $('profil-level').textContent = `Sammler-Level ${level} · ${tausender(app.daten.xp)} XP gesamt`;
  const theme = document.documentElement.getAttribute('data-theme');
  document.querySelectorAll('[data-design]').forEach((b) => b.setAttribute('aria-checked', b.dataset.design === theme));
}

function speichereName(e) {
  e.preventDefault();
  app.daten.name = $('konto-name').value.trim().slice(0, 30);
  speichern();
  aktualisiereAlles();
  zeigeHinweis('Name gespeichert.');
}

function setzeAlleZurueck() {
  if (!confirm('Wirklich alles auf diesem Gerät löschen?')) return;
  Store.zuruecksetzen();
  app.daten = Store.laden();
  app.filter = null;
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
  baueKarussell();
  Oeffnen.init();
  Rad.init();

  $('start-btn').addEventListener('click', startKnopf);
  $('tk-btn').addEventListener('click', () => Oeffnen.oeffne(PACKS[app.packIndex].id));
  $('konto-form').addEventListener('submit', speichereName);
  $('reset-btn').addEventListener('click', setzeAlleZurueck);
  document.querySelectorAll('[data-design]').forEach((b) => b.addEventListener('click', () => waehleDesign(b.dataset.design)));
  waehleDesign(document.documentElement.getAttribute('data-theme'));

  // Karussell: wischen, Pfeile, Reiter, Tippen auf ein Pack
  const karussell = $('pk-karussell');
  let scrollRahmen = 0;
  karussell.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollRahmen);
    scrollRahmen = requestAnimationFrame(karussellBeimScrollen);
  }, { passive: true });
  $('pk-zurueck').addEventListener('click', () => zeigePack(Math.max(0, app.packIndex - 1)));
  $('pk-weiter').addEventListener('click', () => zeigePack(Math.min(PACKS.length - 1, app.packIndex + 1)));
  $('pk-reiter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-stufe]');
    if (b) zeigePack(PACKS.findIndex((p) => p.stufe === b.dataset.stufe));
  });
  karussell.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-index]');
    if (!li) return;
    const i = Number(li.dataset.index);
    if (i !== app.packIndex) zeigePack(i);
    else if (vorratVon(PACKS[i].id) > 0) Oeffnen.oeffne(PACKS[i].id);
  });

  $('rar-liste').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    app.filter = app.filter === btn.dataset.filter ? null : btn.dataset.filter;
    zeichneAlbum();
  });

  // Menü unten: Richtung merken, damit die neue Seite von der richtigen Seite hereingleitet
  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const a = e.target.closest('[data-tab]');
    if (!a) return;
    naechsteRichtung = Math.sign(TABS.indexOf(a.dataset.tab) - TABS.indexOf(app.ansicht));
  });

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
