/* Karten: die 7 Kategorien, Chancen pro Pack-Stufe, Ziehen, XP und die Karten-Skizze.
   Die Karten selbst stehen in js/daten/kartenliste.js (KARTEN). */

// Die 7 Karten-Kategorien, von häufig bis selten. Farben stehen in css/style.css (.rar-<id>).
const SELTENHEITEN = [
  { id: 'common', name: 'Common' },
  { id: 'uncommon', name: 'Uncommon' },
  { id: 'rare', name: 'Rare' },
  { id: 'epic', name: 'Epic' },
  { id: 'mythic', name: 'Mythic' },
  { id: 'legendary', name: 'Legendary' },
  { id: 'special', name: 'Special' },
];

// Chancen in Prozent, gleiche Reihenfolge wie SELTENHEITEN. Platzhalter, bis die Chancen festgelegt sind.
const KARTEN_CHANCEN = {
  standard: [62, 25, 9, 3, 0.8, 0.2, 0],
  silber:   [45, 30, 15, 7, 2, 0.8, 0.2],
  gold:     [30, 30, 22, 11, 4.5, 2, 0.5],
  platin:   [15, 25, 28, 18, 8, 4.5, 1.5],
};

// Garantie: mindestens eine Karte dieser Kategorie pro Pack (Platzhalter)
const KARTEN_GARANTIE = {
  standard: null,
  silber: 'uncommon',
  gold: 'rare',
  platin: 'epic',
};

// Erfahrungspunkte pro Karte, gleiche Reihenfolge wie SELTENHEITEN (Platzhalter)
const XP_PRO_KARTE = [5, 10, 20, 40, 80, 150, 250];

const KARTEN_PRO_PACK = 5;

const BAHNEN = ['SBB', 'BLS', 'RhB', 'SOB', 'Zentralbahn', 'TPF', 'MOB', 'transN'];

// Schneller Zugriff: Karte nach ID und alle Karten pro Kategorie
const KARTE_NACH_ID = new Map(KARTEN.map((k) => [k.id, k]));
const KARTEN_NACH_SELTENHEIT = Object.fromEntries(
  SELTENHEITEN.map((s) => [s.id, KARTEN.filter((k) => k.seltenheit === s.id)]));

function karteVonId(id) {
  return KARTE_NACH_ID.get(id);
}

function seltenheitVon(id) {
  return SELTENHEITEN.find((s) => s.id === id);
}

function rangVon(id) {
  return SELTENHEITEN.findIndex((s) => s.id === id);
}

function zufall(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

function zieheSeltenheit(stufe) {
  const chancen = KARTEN_CHANCEN[stufe] || KARTEN_CHANCEN.standard;
  const summe = chancen.reduce((a, b) => a + b, 0);
  let wurf = Math.random() * summe;
  for (let i = 0; i < chancen.length; i++) {
    wurf -= chancen[i];
    if (wurf < 0) return SELTENHEITEN[i].id;
  }
  return SELTENHEITEN[0].id;
}

// Zieht die Karten für ein Pack (Liste von Karten-IDs). Die seltenste kommt zuletzt.
function zieheKarten(stufe) {
  const gezogen = [];
  for (let i = 0; i < KARTEN_PRO_PACK; i++) {
    gezogen.push(zufall(KARTEN_NACH_SELTENHEIT[zieheSeltenheit(stufe)]));
  }
  gezogen.sort((a, b) => rangVon(a.seltenheit) - rangVon(b.seltenheit));

  // Garantie: ist die beste Karte zu schwach, wird die schwächste Karte durch eine
  // zufällige Karte der Mindest-Kategorie ersetzt (Karten werden nie umbenannt oder hochgestuft)
  const mindestens = KARTEN_GARANTIE[stufe];
  if (mindestens && rangVon(gezogen[gezogen.length - 1].seltenheit) < rangVon(mindestens)) {
    gezogen.shift();
    gezogen.push(zufall(KARTEN_NACH_SELTENHEIT[mindestens]));
  }
  return gezogen.map((k) => k.id);
}

function xpVon(ids) {
  return ids.reduce((summe, id) => summe + XP_PRO_KARTE[rangVon(karteVonId(id).seltenheit)], 0);
}

// Level aus allen XP: Level 1 braucht 100 XP, jedes weitere Level 100 mehr (Platzhalter)
function levelVon(xp) {
  let level = 1;
  let rest = xp;
  while (rest >= level * 100) {
    rest -= level * 100;
    level += 1;
  }
  return { level, aktuell: rest, noetig: level * 100 };
}

// Skizze eines Zugs als Platzhalter-Bild
const ZUG_SKIZZE = `
  <svg class="k-zug" viewBox="0 0 160 74" aria-hidden="true">
    <path d="M58 12 L72 2 L86 12 M64 12 h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 18 H124 Q146 18 152 40 L154 52 H10 V24 Q10 18 14 18 Z" fill="currentColor"/>
    <g style="fill:var(--k-glas)">
      <path d="M136 24 Q146 26 149 40 H134 Z"/>
      <rect x="22" y="26" width="16" height="11" rx="2"/>
      <rect x="46" y="26" width="16" height="11" rx="2"/>
      <rect x="70" y="26" width="16" height="11" rx="2"/>
      <rect x="94" y="26" width="16" height="11" rx="2"/>
      <rect x="10" y="43" width="144" height="3" opacity=".6"/>
    </g>
    <circle cx="30" cy="58" r="6" fill="currentColor"/><circle cx="46" cy="58" r="6" fill="currentColor"/>
    <circle cx="118" cy="58" r="6" fill="currentColor"/><circle cx="134" cy="58" r="6" fill="currentColor"/>
    <path d="M2 68 H158" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Vorderseite einer Karte (Skizze). Das Design wird später noch stark geändert.
// optionen.anzahl: wie oft man die Karte hat (Album), optionen.fehlt: noch nicht gefunden
function karteHtml(id, optionen = {}) {
  const k = karteVonId(id);
  const s = seltenheitVon(k.seltenheit);
  const klassen = ['karte', `rar-${s.id}`];
  if (optionen.fehlt) klassen.push('fehlt');
  const zusatz = k.zusatz ? `<span class="k-zusatz">${esc(k.zusatz)}</span>` : '';
  const hinweis = k.status ? `<span class="k-status">${k.status}</span>` : '';
  return `
    <article class="${klassen.join(' ')}" data-karte="${k.id}" aria-label="${esc(k.name)}, ${s.name}, ${k.bahn}">
      <div class="k-glanz" aria-hidden="true"></div>
      <header class="k-kopf">
        <span class="k-nr">${k.id}</span>
        <span class="k-rar"><i class="rar-stein" aria-hidden="true"></i>${s.name}</span>
      </header>
      <div class="k-bild">${ZUG_SKIZZE}${hinweis}</div>
      <h3 class="k-name">${esc(k.name)}</h3>
      ${zusatz}
      <dl class="k-werte">
        <div><dt>Bahn</dt><dd>${k.bahn}</dd></div>
        <div><dt>Bereich</dt><dd>${k.bereich}</dd></div>
      </dl>
      ${optionen.anzahl > 1 ? `<span class="k-anzahl">×${optionen.anzahl}</span>` : ''}
    </article>`;
}

// Rückseite (für das Aufdecken)
function rueckseiteHtml() {
  return `
    <div class="k-rueck" aria-hidden="true">
      <svg class="k-rueck-logo" viewBox="0 0 570 270"><use href="#logo"/></svg>
    </div>`;
}
