/* Karten: die 7 Kategorien, Chancen pro Pack-Stufe, Ziehen und die Karten-Skizze.
   Alles hier ist Platzhalter, bis die echte Kartenliste (Word-Dokument) da ist. */

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

// Chancen in Prozent, gleiche Reihenfolge wie SELTENHEITEN. Platzhalter.
const KARTEN_CHANCEN = {
  standard: [62, 25, 9, 3, 0.8, 0.2, 0],
  silber:   [45, 30, 15, 7, 2, 0.8, 0.2],
  gold:     [30, 30, 22, 11, 4.5, 2, 0.5],
  platin:   [15, 25, 28, 18, 8, 4.5, 1.5],
};

const KARTEN_PRO_PACK = 5;
const KARTEN_IM_SET = 120; // Platzhalter für die Kartennummern #001–#120

function seltenheitVon(id) {
  return SELTENHEITEN.find((s) => s.id === id);
}

function rangVon(id) {
  return SELTENHEITEN.findIndex((s) => s.id === id);
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

// Zieht die Karten für ein Pack. Die seltenste kommt zuletzt.
function zieheKarten(stufe) {
  const karten = [];
  for (let i = 0; i < KARTEN_PRO_PACK; i++) {
    karten.push({
      nr: 1 + Math.floor(Math.random() * KARTEN_IM_SET),
      seltenheit: zieheSeltenheit(stufe),
    });
  }
  return karten.sort((a, b) => rangVon(a.seltenheit) - rangVon(b.seltenheit));
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

// Vorderseite einer Karte (Skizze). Das Design wird später noch stark geändert.
function karteHtml(karte) {
  const s = seltenheitVon(karte.seltenheit);
  const nr = String(karte.nr).padStart(3, '0');
  return `
    <article class="karte rar-${s.id}" aria-label="${s.name}, Karte Nummer ${nr}">
      <div class="k-glanz" aria-hidden="true"></div>
      <header class="k-kopf">
        <span class="k-nr">#${nr}</span>
        <span class="k-rar"><i class="rar-stein" aria-hidden="true"></i>${s.name}</span>
      </header>
      <div class="k-bild">${ZUG_SKIZZE}</div>
      <h3 class="k-name">Name folgt</h3>
      <dl class="k-werte">
        <div><dt>Vmax</dt><dd>—</dd></div>
        <div><dt>Leistung</dt><dd>—</dd></div>
        <div><dt>Baujahr</dt><dd>—</dd></div>
      </dl>
      <footer class="k-fuss">RailBase · Sammelkarten</footer>
    </article>`;
}

// Rückseite (für das Aufdecken)
function rueckseiteHtml() {
  return `
    <div class="k-rueck" aria-hidden="true">
      <svg class="k-rueck-logo" viewBox="0 0 570 270"><use href="#logo"/></svg>
    </div>`;
}
