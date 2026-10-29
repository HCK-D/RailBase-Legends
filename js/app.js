/* Sammelkarten-Beta: Oberfläche, Packs, Gratis-Pack, Konto. Die Daten holt sich die App über store.js. */

// Die 7 Pack-Designs. Karten kommen später dazu (pro Pack ein Kartenpool).
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
  { id: 'standard', titel: 'Standard', hinweis: 'Gratis jeden Tag' },
  { id: 'silber', titel: 'Silber', hinweis: 'Zwei Designs' },
  { id: 'gold', titel: 'Gold', hinweis: 'Zwei Designs' },
  { id: 'platin', titel: 'Platin', hinweis: 'Zwei Designs' },
];

// Anzahl Karten pro geöffnetem Pack. Platzhalter, bis die Karten fertig sind.
const KARTEN_PRO_PACK = 5;

const app = {
  daten: Store.laden(),
  ansicht: null,
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

function gratisHeuteSchonGeholt() {
  return app.daten.gratisTag === Store.heute();
}

// Zeit bis Mitternacht, z. B. "5 Std. 12 Min."
function bisMitternacht() {
  const jetzt = new Date();
  const mitternacht = new Date(jetzt);
  mitternacht.setHours(24, 0, 0, 0);
  const min = Math.max(0, Math.round((mitternacht - jetzt) / 60000));
  const std = Math.floor(min / 60);
  const rest = min % 60;
  return std > 0 ? `${std} Std. ${rest} Min.` : `${rest} Min.`;
}

// ---------- Ansichten (Hash-Routing) ----------

function zeigeAnsicht(name) {
  const ziel = document.querySelector(`[data-view="${name}"]`);
  if (!ziel) return zeigeAnsicht('start');

  document.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v !== ziel; });
  document.querySelectorAll('.tabbar [data-tab]').forEach((a) => {
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  app.ansicht = name;
  ziel.classList.remove('view');
  void ziel.offsetWidth; // Animation neu starten
  ziel.classList.add('view');
  window.scrollTo({ top: 0, behavior: 'instant' });
  aktualisiereAlles();
}

function aktuelleAnsichtAusHash() {
  const name = location.hash.replace('#', '') || 'start';
  zeigeAnsicht(name);
}

// ---------- Anzeige ----------

function aktualisiereAlles() {
  aktualisiereGratis();
  zeichneStufen();
  zeichnePackListe();
  zeichneSammlung();
  zeichneKonto();
}

function aktualisiereGratis() {
  const titel = $('free-titel');
  const info = $('free-info');
  const btn = $('free-btn');
  if (gratisHeuteSchonGeholt()) {
    titel.textContent = 'Gratis-Pack geholt';
    info.textContent = `Das nächste Gratis-Pack gibt es in ${bisMitternacht()}`;
    btn.disabled = true;
    btn.textContent = 'Heute schon geholt';
  } else {
    titel.textContent = 'Dein Gratis-Pack ist bereit';
    info.textContent = 'Ein Standard-Pack für heute.';
    btn.disabled = false;
    btn.textContent = 'Gratis-Pack holen';
  }
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
          <span class="pk-txt">
            <b>${p.name}</b>
            <small>Vorrat: ${n}</small>
          </span>
        </button>`;
      liste.appendChild(li);
    });

    block.appendChild(liste);
    behaelter.appendChild(block);
  });
}

function zeichneSammlung() {
  $('st-geoeffnet').textContent = app.daten.geoeffnet;
  $('st-vorrat').textContent = vorratGesamt();
}

function zeichneKonto() {
  const feld = $('konto-name');
  if (document.activeElement !== feld) feld.value = app.daten.name || '';
}

// ---------- Gratis-Pack ----------

function holeGratisPack() {
  if (gratisHeuteSchonGeholt()) return;
  app.daten.vorrat.standard = vorratVon('standard') + 1;
  app.daten.gratisTag = Store.heute();
  speichern();
  aktualisiereAlles();
  oeffneOverlay('standard');
}

// ---------- Pack öffnen ----------

let oeffnet = null; // Pack-ID, die gerade geöffnet wird

function oeffneOverlay(id) {
  const p = packVonId(id);
  if (!p) return;
  if (vorratVon(id) <= 0) {
    alert('Von diesem Pack hast du keins mehr im Vorrat.');
    return;
  }

  oeffnet = id;
  $('op-titel').textContent = `${p.titel} · ${p.name}`;
  $('op-img').src = bildGross(p);
  $('op-img').alt = `${p.titel} Pack ${p.name}`;
  $('op-tipp').textContent = 'Tippen zum Aufreissen';
  $('op-status').textContent = '';
  $('op-karten').hidden = true;
  $('op-karten').innerHTML = '';
  $('op-close').textContent = 'Später öffnen';
  $('op-close').hidden = false;
  $('op-pack').hidden = false;
  $('op-pack').disabled = false;
  $('op-pack').classList.remove('op-shake', 'op-reisst');
  $('opener').hidden = false;
  document.body.classList.add('op-offen');
  $('op-pack').focus();
}

function schliesseOverlay() {
  $('opener').hidden = true;
  document.body.classList.remove('op-offen');
  oeffnet = null;
  aktualisiereAlles();
}

function oeffnePack() {
  const id = oeffnet;
  if (!id) return;
  const pack = $('op-pack');
  if (pack.disabled) return;
  if (vorratVon(id) <= 0) {
    $('op-status').textContent = 'Kein Pack mehr im Vorrat.';
    return;
  }

  pack.disabled = true;
  $('op-close').hidden = true;
  $('op-tipp').textContent = '';
  pack.classList.add('op-shake');

  setTimeout(() => {
    pack.classList.remove('op-shake');
    pack.classList.add('op-reisst');

    // Vorrat und Zähler erst beim Öffnen ändern, damit ein Abbruch nichts verliert
    app.daten.vorrat[id] = vorratVon(id) - 1;
    app.daten.geoeffnet += 1;
    speichern();

    setTimeout(() => zeichneKarten(), 480);
  }, 700);
}

function zeichneKarten() {
  $('op-pack').hidden = true;
  const liste = $('op-karten');
  liste.innerHTML = '';
  for (let i = 0; i < KARTEN_PRO_PACK; i++) {
    const li = document.createElement('li');
    li.className = 'op-karte';
    li.style.setProperty('--i', i);
    li.innerHTML = `
      <div class="op-flip">
        <div class="op-rueck" aria-hidden="true"><span>RB</span></div>
      </div>`;
    liste.appendChild(li);
  }
  liste.hidden = false;
  $('op-status').textContent = 'Deine Karten sind noch im Aufbau. Die Packs zählen aber schon.';
  $('op-close').textContent = 'Schliessen';
  $('op-close').hidden = false;
  requestAnimationFrame(() => {
    liste.querySelectorAll('.op-karte').forEach((k, i) => {
      setTimeout(() => k.classList.add('gedreht'), 180 + i * 140);
    });
  });
}

// ---------- Konto ----------

function speichereName(e) {
  e.preventDefault();
  app.daten.name = $('konto-name').value.trim().slice(0, 30);
  speichern();
  $('konto-msg').textContent = 'Gespeichert.';
  setTimeout(() => { $('konto-msg').textContent = ''; }, 2000);
}

function setzeAlleZurueck() {
  if (!confirm('Wirklich alles in diesem Browser löschen?')) return;
  Store.zuruecksetzen();
  app.daten = Store.laden();
  aktualisiereAlles();
}

// ---------- Theme ----------

function wechsleTheme() {
  const jetzt = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', jetzt);
  try { localStorage.setItem('sk-theme', jetzt); } catch (e) { /* ignorieren */ }
}

// ---------- Start ----------

document.addEventListener('DOMContentLoaded', () => {
  $('free-btn').addEventListener('click', holeGratisPack);
  $('op-pack').addEventListener('click', oeffnePack);
  $('op-close').addEventListener('click', schliesseOverlay);
  $('konto-form').addEventListener('submit', speichereName);
  $('reset-btn').addEventListener('click', setzeAlleZurueck);
  $('theme-btn').addEventListener('click', wechsleTheme);

  $('pk-liste').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-oeffnen]');
    if (btn) oeffneOverlay(btn.dataset.oeffnen);
  });

  $('opener').addEventListener('click', (e) => {
    // Klick auf den dunklen Hintergrund schliesst nicht, solange das Pack gerade aufreisst
    if (e.target === $('opener') && !$('op-close').hidden) schliesseOverlay();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('opener').hidden && !$('op-close').hidden) schliesseOverlay();
  });

  window.addEventListener('hashchange', aktuelleAnsichtAusHash);
  aktuelleAnsichtAusHash();

  // Countdown bis zum nächsten Gratis-Pack aktualisieren
  setInterval(() => {
    if (app.ansicht === 'start') aktualisiereGratis();
  }, 30000);
});
