/* Sammelkarten-Beta: Seiten, Packs, Gratis-Pack, Sammlung, Konto.
   Daten über store.js, Karten in karten.js, Öffnen in oeffnen.js, Glücksrad in rad.js. */

// Die 7 Pack-Designs.
// Bilder: assets/packs/<id>.webp (gross, zum Öffnen) und assets/packs/klein/<id>.webp (Listen).
const PACKS = [
  { id: 'standard', stufe: 'standard', titel: 'Standard', name: 'Schweizer Bahn' },
  { id: 'silber-1', stufe: 'silber', titel: 'Silber', name: 'Alpenpanorama' },
  { id: 'silber-2', stufe: 'silber', titel: 'Silber', name: 'Herbsttal' },
  { id: 'gold-1', stufe: 'gold', titel: 'Gold', name: 'Schweizer Viadukt' },
  { id: 'gold-2', stufe: 'gold', titel: 'Gold', name: 'Lavaux' },
  { id: 'platin-1', stufe: 'platin', titel: 'Platin', name: 'Alpentunnel' },
  { id: 'platin-2', stufe: 'platin', titel: 'Platin', name: 'Alpenstrecke' },
];

const bildKlein = (p) => `assets/packs/klein/${p.id}.webp`;
const bildGross = (p) => `assets/packs/${p.id}.webp`;

const STUFEN = [
  { id: 'standard', titel: 'Standard', hinweis: 'Gratis alle 24 h' },
  { id: 'silber', titel: 'Silber', hinweis: 'Zwei Designs' },
  { id: 'gold', titel: 'Gold', hinweis: 'Zwei Designs' },
  { id: 'platin', titel: 'Platin', hinweis: 'Zwei Designs' },
];

// Reihenfolge der Seiten unten im Menü (auch fürs Wischen zwischen den Seiten)
const TABS = ['start', 'packs', 'rad', 'sammlung', 'konto', 'mehr'];

const TAG_MS = 24 * 60 * 60 * 1000;

const app = {
  daten: Store.laden(),
  ansicht: null,
  filter: null, // Kategorie-Filter in der Sammlung
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
    const neu = i + (dx < 0 ? 1 : -1);
    if (neu < 0 || neu >= TABS.length) return;
    geheZuTab(TABS[neu], dx < 0 ? 1 : -1);
  }, { passive: true });
}

// ---------- Anzeige ----------

function aktualisiereAlles() {
  aktualisiereGratis();
  Rad.aktualisiere();
  zeichneStufen();
  zeichnePackListe();
  zeichneSammlung();
  zeichneKonto();
  zeichnePunkte();
}

function gratisBereit() {
  return bereitIn(app.daten.gratisZeit) === 0;
}

function aktualisiereGratis() {
  const titel = $('free-titel');
  const info = $('free-info');
  const btn = $('free-btn');
  if (gratisBereit()) {
    titel.textContent = 'Dein Gratis-Pack ist bereit';
    info.textContent = 'Ein Standard-Pack, alle 24 Stunden.';
    btn.disabled = false;
    btn.textContent = 'Gratis-Pack holen';
    $('free-card').classList.add('bereit');
  } else {
    titel.textContent = 'Gratis-Pack geholt';
    info.textContent = `Nächstes Gratis-Pack in ${dauerText(bereitIn(app.daten.gratisZeit))}`;
    btn.disabled = true;
    btn.textContent = 'Schon geholt';
    $('free-card').classList.remove('bereit');
  }
}

// Roter Punkt im Menü, wenn etwas bereit ist
function zeichnePunkte() {
  document.querySelector('[data-tab="start"]').classList.toggle('punkt', gratisBereit());
  document.querySelector('[data-tab="rad"]').classList.toggle('punkt', Rad.bereit());
  document.querySelector('[data-tab="packs"]').classList.toggle('punkt', vorratGesamt() > 0);
}

function zeichneStufen() {
  const liste = $('tier-grid-start');
  liste.innerHTML = '';
  STUFEN.forEach((stufe, i) => {
    const erstes = PACKS.find((p) => p.stufe === stufe.id);
    const anzahl = PACKS.filter((p) => p.stufe === stufe.id)
      .reduce((a, p) => a + vorratVon(p.id), 0);
    const li = document.createElement('li');
    li.className = `tier tier-${stufe.id}`;
    li.style.setProperty('--i', i);
    li.innerHTML = `
      <a href="#packs">
        <img src="${bildKlein(erstes)}" alt="" loading="lazy">
        <span class="tier-txt">
          <b>${stufe.titel}</b>
          <small>${stufe.hinweis} · ${anzahl} im Vorrat</small>
        </span>
      </a>`;
    liste.appendChild(li);
  });
}

function zeichnePackListe() {
  const n = vorratGesamt();
  $('pk-anzahl').textContent = `${n} ${n === 1 ? 'Pack' : 'Packs'}`;
  const behaelter = $('pk-liste');
  behaelter.innerHTML = '';

  STUFEN.forEach((stufe) => {
    const packs = PACKS.filter((p) => p.stufe === stufe.id);
    const block = document.createElement('section');
    block.className = 'pk-block';
    block.innerHTML = `<h2 class="pk-stufe tier-${stufe.id}-txt">${stufe.titel}</h2>`;

    const liste = document.createElement('ul');
    liste.className = 'pk-grid';
    packs.forEach((p, i) => {
      const n = vorratVon(p.id);
      const li = document.createElement('li');
      li.style.setProperty('--i', i);
      li.innerHTML = `
        <button class="pk-karte" type="button" data-oeffnen="${p.id}" ${n === 0 ? 'disabled' : ''}>
          <img src="${bildKlein(p)}" alt="${p.titel} Pack ${p.name}" loading="lazy">
          ${n > 0 ? `<span class="pk-anzahl">${n}×</span>` : ''}
          <span class="pk-txt">
            <b>${p.name}</b>
            <small>${n > 0 ? 'Tippen zum Öffnen' : 'Keins im Vorrat'}</small>
          </span>
        </button>`;
      liste.appendChild(li);
    });

    block.appendChild(liste);
    behaelter.appendChild(block);
  });
}

function zeichneSammlung() {
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
  const grid = $('sam-karten');
  grid.innerHTML = gezeigt.slice(0, 60).map((k, i) => `<li style="--i:${Math.min(i, 12)}">${karteHtml(k)}</li>`).join('');
  $('sam-leer').hidden = karten.length > 0;
  $('sam-titel').hidden = karten.length === 0;
  $('sam-titel').textContent = app.filter
    ? `${seltenheitVon(app.filter).name} (${gezeigt.length})`
    : `Meine Karten (${karten.length})`;
}

function zeichneKonto() {
  const feld = $('konto-name');
  if (document.activeElement !== feld) feld.value = app.daten.name || '';
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

// ---------- Konto ----------

function speichereName(e) {
  e.preventDefault();
  app.daten.name = $('konto-name').value.trim().slice(0, 30);
  speichern();
  zeigeHinweis('Name gespeichert.');
}

function setzeAlleZurueck() {
  if (!confirm('Wirklich alles in diesem Browser löschen?')) return;
  Store.zuruecksetzen();
  app.daten = Store.laden();
  app.filter = null;
  aktualisiereAlles();
  zeigeHinweis('Alles zurückgesetzt.');
}

// ---------- Theme ----------

function wechsleTheme() {
  const jetzt = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', jetzt);
  try { localStorage.setItem('sk-theme', jetzt); } catch (e) { /* ignorieren */ }
}

// ---------- Start ----------

document.addEventListener('DOMContentLoaded', () => {
  Oeffnen.init();
  Rad.init();

  $('free-btn').addEventListener('click', holeGratisPack);
  $('konto-form').addEventListener('submit', speichereName);
  $('reset-btn').addEventListener('click', setzeAlleZurueck);
  $('theme-btn').addEventListener('click', wechsleTheme);

  $('pk-liste').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-oeffnen]');
    if (btn) Oeffnen.oeffne(btn.dataset.oeffnen);
  });

  $('rar-liste').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    app.filter = app.filter === btn.dataset.filter ? null : btn.dataset.filter;
    zeichneSammlung();
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

  // Countdowns aktualisieren
  setInterval(() => {
    aktualisiereGratis();
    Rad.aktualisiere();
    zeichnePunkte();
  }, 30000);
});
