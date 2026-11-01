/* Karten: die 7 Kategorien, Chancen pro Pack-Stufe, Ziehen, XP und die Karten-Skizze.
   Die Karten selbst stehen in js/daten/kartenliste.js (ALLE_KARTEN). */

// Im Spiel sind nur Karten mit Foto (js/daten/kartenfotos.js). Die übrigen bleiben in der Kartenliste
// und kommen zurück, sobald es ein Foto gibt. Liste für den Besitzer: Word-Dokument «Karten ohne Foto».
const KARTEN = ALLE_KARTEN.filter((k) => KARTEN_FOTOS[k.id]);

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

// Chancen pro einzelner Karte in Prozent laut Wahrscheinlichkeits-System vom 30.10.2026.
// Fünf Ziehungen pro Pack; doppelte Karten sind möglich. Ausnahme: Anfängerbonus.
const KARTEN_CHANCEN = {
  standard: [50, 45, 3, 2, 0, 0, 0],
  silber:   [35, 40, 15, 8, 2, 0, 0],
  gold:     [24, 24, 20, 10, 12, 8, 2],
  platin:   [2, 3, 24, 24, 24, 16, 7],
};

// Keine dauerhafte Pack-Garantie; nur die ersten vier Öffnungen haben einen Anfängerbonus.
const KARTEN_GARANTIE = {
  standard: null,
  silber: null,
  gold: null,
  platin: null,
};

// Erfahrungspunkte pro Karte, gleiche Reihenfolge wie SELTENHEITEN (Platzhalter)
const XP_PRO_KARTE = [5, 10, 20, 40, 80, 150, 250];

const KARTEN_PRO_PACK = 5;

const BAHNEN = ['SBB', 'BLS', 'RhB', 'SOB', 'Zentralbahn', 'TPF', 'MOB', 'transN', 'AB', 'AVA', 'BOB', 'TMR', 'TPC', 'TRAVYS'];

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
  const wurf = Math.random();
  let grenze = 0;
  for (let i = 0; i < chancen.length; i++) {
    grenze += chancen[i];
    if (wurf < grenze / summe) return SELTENHEITEN[i].id;
  }
  return SELTENHEITEN[0].id;
}

// Zieht die Karten für ein Pack (Liste von Karten-IDs). Die seltenste kommt zuletzt.
const ANFAENGER_PACKS = 4;

function anfaengerBonusAktiv(geoeffnet) {
  return Number.isInteger(geoeffnet) && geoeffnet >= 0 && geoeffnet < ANFAENGER_PACKS;
}

function zieheKarten(stufe, geoeffnet = ANFAENGER_PACKS) {
  const gezogen = [];
  for (let i = 0; i < KARTEN_PRO_PACK; i++) {
    gezogen.push(zufall(KARTEN_NACH_SELTENHEIT[zieheSeltenheit(stufe)]));
  }
  // Nur wenn Rare oder höher fehlt, eine schwache Karte durch eine echte Rare ersetzen.
  // Der gespeicherte Gesamtzähler gilt über alle Pack-Stufen und Browser-Neustarts hinweg.
  if (anfaengerBonusAktiv(geoeffnet) && !gezogen.some((k) => rangVon(k.seltenheit) >= rangVon('rare'))) {
    gezogen[0] = zufall(KARTEN_NACH_SELTENHEIT.rare);
  }
  gezogen.sort((a, b) => rangVon(a.seltenheit) - rangVon(b.seltenheit));

  return gezogen.map((k) => k.id);
}

function xpVon(ids) {
  return ids.reduce((summe, id) => summe + XP_PRO_KARTE[rangVon(karteVonId(id).seltenheit)], 0);
}

// Wert pro Karte, gleiche Reihenfolge wie SELTENHEITEN (Platzhalter).
// Eine doppelte Karte verwerten gibt so viele RB Coins.
const SAMMELWERT = [3, 3, 8, 20, 50, 150, 500];

function wertVon(id) {
  return SAMMELWERT[rangVon(karteVonId(id).seltenheit)];
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

// Level-Belohnungen: alle 5 Level ein Silver-Pack, alle 10 Level ein Gold-Pack (Platzhalter).
// Gibt die Pack-IDs zurück, die beim Aufstieg von vonLevel auf bisLevel dazukommen.
function belohnungenFuer(vonLevel, bisLevel) {
  const packs = [];
  for (let l = vonLevel + 1; l <= bisLevel; l++) {
    if (l % 10 === 0) packs.push('gold-1');
    else if (l % 5 === 0) packs.push('silber-1');
  }
  return packs;
}

// Farbtöne für den Bahn-Chip und den gezeichneten Zug (Platzhalter, keine offiziellen Logos)
const BAHN_FARBE = {
  SBB: '#E2001A', BLS: '#1B9447', RhB: '#B70E1E', SOB: '#2B4593',
  Zentralbahn: '#4A5560', TPF: '#0F6FB6', MOB: '#1D2D5C', transN: '#E4572E',
  AB: '#C8102E', AVA: '#E98300', BOB: '#0B4EA2', TMR: '#9B1B30', TPC: '#2E8B3A', TRAVYS: '#0090C8',
};

// Welcher gezeichnete Zug ins Kartenbild kommt, je nach Bereich
const ZUG_ART = {
  Personen: 'triebzug', Variante: 'triebzug', Special: 'triebzug', Spezial: 'triebzug',
  Cargo: 'lok', Historisch: 'lok', Infra: 'rangier', Rangier: 'rangier',
};

// Die Fahrzeug-Bezeichnung verrät oft mehr als der Bereich:
// ein Grossbuchstabe plus e/m ist eine Lok (Re 460, Ae 6/6, HGe 4/4),
// mehrere Grossbuchstaben plus e ein Triebzug (RABe 501, RCe 2/4)
function zugArt(k) {
  const art = ZUG_ART[k.bereich] || 'triebzug';
  if (art === 'rangier') return art;
  if (/^(HG|[A-Z])[em][a-z]*\s/.test(k.name)) return 'lok';
  if (/^[A-Z]{2,}[a-z]*e\s/.test(k.name)) return 'triebzug';
  return art;
}

// Schwellen unter der Schiene (einmal berechnet)
const SCHWELLEN = Array.from({ length: 26 }, (_, i) => `M${i * 8 - 2} 158h4.5v2.4h-4.5z`).join('');

// Kartenbild als Zeichnung: Bahndamm, Fahrleitung und Zug vor dem Alpen-Foto.
// Die drei Züge stehen einmal als <symbol> im Dokument, jede Karte holt sie mit <use>.
// Farben kommen aus CSS: --zug (Wagenkasten) und --bahn (Streifen).
const SZENE_SPRITE = `
  <svg class="k-sprite" aria-hidden="true" width="0" height="0" style="position:absolute">
    <symbol id="k-szene">
      <path d="M0 146 C50 139 150 139 200 146 V200 H0 Z" fill="#4f7c36"/>
      <path d="M-4 147 q5-11 14-5 q6-8 13-1 q6-4 9 4 Z M150 145 q4-9 12-4 q7-9 14 0 q6-3 10 4 Z" fill="#3c6629"/>
      <path d="M0 176 C60 170 140 172 200 168 V200 H0 Z" fill="#3a6128"/>
      <path d="M14 178 l2-6 l2 6 M60 181 l2-7 l2 7 M118 177 l2-6 l2 6 M170 179 l2-7 l2 7" fill="none" stroke="#5f8f42" stroke-width="1.2"/>
      <path d="M0 157 H200 V171 H0 Z" fill="#9b9285"/>
      <path d="M0 157 H200 V160 H0 Z" fill="#b8b0a2"/>
      <path d="${SCHWELLEN}" fill="#5b4a3a"/>
      <rect x="0" y="154" width="200" height="3.4" fill="#454a50"/>
      <rect x="0" y="154" width="200" height="1" fill="#dfe3e6"/>
      <g fill="#6d7882">
        <rect x="7" y="50" width="4.4" height="108"/><rect x="11" y="58" width="24" height="2.4"/>
        <rect x="189" y="50" width="4.4" height="108"/><rect x="165" y="58" width="24" height="2.4"/>
      </g>
      <g fill="none" stroke="#2a3036" stroke-width="1.1">
        <path d="M0 55 Q100 66 200 55"/><path d="M0 70 H200"/>
        <path d="M40 59 V70 M70 62.5 V70 M100 63.7 V70 M130 62.5 V70 M160 59 V70" stroke-width=".7"/>
        <path d="M13 70 L33 60 M187 70 L167 60" stroke="#6d7882" stroke-width="1.6"/>
      </g>
    </symbol>
    <symbol id="k-triebzug">
      <rect x="-6" y="153" width="192" height="6" rx="3" fill="#000" opacity=".22"/>
      <path d="M96 96 L108 82 L98 71" fill="none" stroke="#2f353b" stroke-width="1.6"/>
      <path d="M90 70.4 H108" stroke="#2f353b" stroke-width="2"/>
      <rect x="88" y="95" width="22" height="4" rx="1" fill="#555c63"/>
      <path d="M-6 99 H146 C166 99 178 111 184 129 L186 146 H-6 Z" style="fill:var(--zug)"/>
      <rect x="-6" y="98" width="152" height="4" rx="2" fill="#000" opacity=".12"/>
      <rect x="-6" y="108" width="150" height="14" rx="2" fill="#24303c"/>
      <g style="fill:var(--zug)">
        <rect x="12" y="107" width="3" height="16"/><rect x="36" y="107" width="3" height="16"/>
        <rect x="66" y="107" width="3" height="16"/><rect x="90" y="107" width="3" height="16"/>
        <rect x="120" y="107" width="3" height="16"/>
      </g>
      <path d="M150 106 C163 107 172 114 177 126 H150 Z" fill="#1c2630"/>
      <g fill="none" stroke="#000" stroke-opacity=".22" stroke-width="1">
        <rect x="48" y="105" width="13" height="35" rx="1"/><rect x="102" y="105" width="13" height="35" rx="1"/>
      </g>
      <path d="M-6 132 H183 L184.6 137 H-6 Z" style="fill:var(--bahn)"/>
      <rect x="-6" y="140" width="192" height="6" fill="#30363d"/>
      <circle cx="181" cy="141" r="1.8" fill="#fff4c2"/>
      <g fill="#20252b">
        <rect x="6" y="145" width="34" height="6" rx="2"/><rect x="138" y="145" width="34" height="6" rx="2"/>
        <circle cx="14" cy="150" r="5"/><circle cx="32" cy="150" r="5"/>
        <circle cx="146" cy="150" r="5"/><circle cx="164" cy="150" r="5"/>
      </g>
    </symbol>
    <symbol id="k-lok">
      <rect x="34" y="153" width="148" height="6" rx="3" fill="#000" opacity=".22"/>
      <g style="display:var(--fracht)">
        <rect x="-12" y="153" width="46" height="6" rx="3" fill="#000" opacity=".22"/>
        <path d="M-12 106 H28 V129 H-12 Z" fill="#c8702e"/>
        <path d="M-8 108 V127 M-1 108 V127 M6 108 V127 M13 108 V127 M20 108 V127" stroke="#000" stroke-opacity=".2" stroke-width="1.4"/>
        <rect x="-12" y="129" width="42" height="12" fill="#3c4249"/>
        <g fill="#20252b"><circle cx="2" cy="148" r="6"/><circle cx="18" cy="148" r="6"/></g>
        <rect x="28" y="137" width="10" height="2.4" fill="#20252b"/>
      </g>
      <g fill="none" stroke="#2f353b" stroke-width="1.5">
        <path d="M66 98 L78 84 L68 72"/><path d="M146 98 L134 84 L144 72"/>
      </g>
      <path d="M60 71.4 H78 M134 71.4 H152" stroke="#2f353b" stroke-width="2"/>
      <path d="M44 99 H168 Q173 99 175 104 L178 124 V142 H36 V124 L39 104 Q41 99 44 99 Z" style="fill:var(--zug)"/>
      <rect x="40" y="99" width="134" height="4" fill="#000" opacity=".15"/>
      <path d="M41 107 H55 V118 H39 Z M159 107 H173 L175 118 H159 Z" fill="#1c2630"/>
      <rect x="64" y="107" width="86" height="12" rx="1.5" fill="#000" opacity=".22"/>
      <path d="M70 107 V119 M78 107 V119 M86 107 V119 M94 107 V119 M102 107 V119 M110 107 V119 M118 107 V119 M126 107 V119 M134 107 V119 M142 107 V119" stroke="#000" stroke-opacity=".25" stroke-width="1"/>
      <rect x="36" y="127" width="142" height="3" fill="#fff" opacity=".8"/>
      <rect x="34" y="140" width="146" height="6" fill="#30363d"/>
      <g fill="#20252b">
        <rect x="44" y="145" width="38" height="6" rx="2"/><rect x="132" y="145" width="38" height="6" rx="2"/>
        <circle cx="53" cy="150" r="5.4"/><circle cx="73" cy="150" r="5.4"/>
        <circle cx="141" cy="150" r="5.4"/><circle cx="161" cy="150" r="5.4"/>
      </g>
      <circle cx="176" cy="135" r="1.8" fill="#fff4c2"/>
    </symbol>
    <symbol id="k-rangier"><g transform="translate(18 0)">
      <rect x="-14" y="153" width="178" height="6" rx="3" fill="#000" opacity=".22"/>
      <path d="M-12 118 H46 V131 H-12 Z" fill="#8a6a48"/>
      <path d="M-12 122.5 H46 M-12 127 H46" stroke="#000" stroke-opacity=".25" stroke-width="1"/>
      <path d="M-6 118 V112 M40 118 V112" stroke="#30363d" stroke-width="2"/>
      <rect x="-14" y="131" width="62" height="10" fill="#4a5058"/>
      <g fill="#20252b"><circle cx="4" cy="148" r="6"/><circle cx="30" cy="148" r="6"/></g>
      <rect x="48" y="137" width="7" height="2.4" fill="#20252b"/>
      <rect x="58" y="92" width="42" height="4" rx="1.5" fill="#30363d"/>
      <rect x="76" y="87" width="6" height="5" rx="1" fill="#ff9f1a"/>
      <path d="M62 96 H96 V146 H62 Z" style="fill:var(--zug)"/>
      <rect x="67" y="102" width="24" height="15" rx="1.5" fill="#1c2630"/>
      <path d="M96 114 H150 Q154 114 154 118 V146 H96 Z" style="fill:var(--zug)"/>
      <path d="M106 120 V138 M112 120 V138 M118 120 V138 M124 120 V138" stroke="#000" stroke-opacity=".22" stroke-width="1.4"/>
      <rect x="136" y="107" width="5" height="7" fill="#30363d"/>
      <path d="M62 132 H154 V135 H62 Z" style="fill:var(--bahn)"/>
      <rect x="54" y="139" width="106" height="7" fill="#30363d"/>
      <path d="M54 139 h5 l-5 7 z M160 139 h-5 l5 7 z" fill="#f2c230"/>
      <g fill="#20252b">
        <circle cx="74" cy="149" r="6"/><circle cx="104" cy="149" r="6"/><circle cx="134" cy="149" r="6"/>
      </g>
      <circle cx="152" cy="128" r="1.8" fill="#fff4c2"/>
    </g></symbol>
  </svg>`;
document.body.insertAdjacentHTML('afterbegin', SZENE_SPRITE);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Grosser Name: der Beiname, wenn er kurz und ein echter Name ist (z. B. "Giruno"),
// sonst die Fahrzeug-Bezeichnung. Die Zeile darunter zeigt das andere.
function kartenTitel(k) {
  const z = k.zusatz;
  const beiname = z && z.length <= 14 && /^[A-ZÄÖÜ0-9]/.test(z) && !/,| und /.test(z);
  return beiname ? { gross: z, klein: k.name } : { gross: k.name, klein: z || k.bereich };
}

// Jede Karte zeigt einen anderen Ausschnitt des Alpen-Fotos, und etwa jeder zweite Zug
// fährt nach links (fest pro Karte, damit die Karte immer gleich aussieht)
function bildWahl(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return { bx: h % 101, spiegel: Math.floor(h / 7) % 2 === 1 };
}

// Foto von Railbase.ch (js/daten/kartenfotos.js), null = Karte zeigt die Zeichnung
function fotoVon(id) {
  return KARTEN_FOTOS[id] ? `assets/karten/fotos/${id.toLowerCase()}.webp` : null;
}

// Fotonachweis als HTML: «Foto: Name · CC BY-SA 4.0», Name verlinkt auf das Original, Lizenz auf den Lizenztext
function fotoNachweisHtml(id) {
  const f = KARTEN_FOTOS[id];
  if (!f) return '';
  const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));
  if (f.erlaubnis) return `Foto: ${esc(f.foto)} · mit Erlaubnis`;
  if (!f.lizenz) return `Foto: ${esc(f.foto)} (eigenes Foto)`;
  return `Foto: ${link(f.quelle, f.foto)} · ${link(f.lizenzUrl, f.lizenz)} · zugeschnitten`;
}

// Vorderseite einer Karte (Design «Sammel Karten», css/karten.css): Rahmen mit schrägen Ecken in der Farbe
// der Seltenheit, Foto über die ganze Karte, oben links die Nummer, oben rechts die Seltenheit,
// unten ein schräges Feld mit Bahn, Name und Fahrzeug, rechts unten die Schweizer Flagge.
// k-fx: Effekte der Seltenheit (Lichtstreifen, Funkeln, Glut), nur CSS.
// optionen.anzahl: wie oft man die Karte hat (Album), optionen.fehlt: noch nicht gefunden
function karteHtml(id, optionen = {}) {
  const k = karteVonId(id);
  const s = seltenheitVon(k.seltenheit);
  const art = zugArt(k);
  const klassen = ['karte', `rar-${s.id}`, `zug-${art}`];
  if (k.bereich === 'Historisch') klassen.push('k-alt');
  if (k.bereich === 'Cargo') klassen.push('k-cargo');
  if (optionen.fehlt) klassen.push('fehlt');
  const bild = bildWahl(k.id);
  if (bild.spiegel) klassen.push('k-spiegel');
  const foto = fotoVon(k.id);
  if (foto) klassen.push('k-mit-foto');
  // lange Namen werden kleiner (--zeichen in css/karten.css), sehr lange bekommen zwei Zeilen
  const titel = kartenTitel(k);
  const lang = titel.gross.length > 26 ? ' sehr-lang' : '';
  const hinweis = k.status ? `<span class="k-status">${k.status}</span>` : '';
  return `
    <article class="${klassen.join(' ')}" data-karte="${k.id}" aria-label="${esc(k.name)}, ${s.name}, ${k.bahn}"
      style="--bahn:${BAHN_FARBE[k.bahn] || '#4A5560'};--bx:${bild.bx}%;--zeichen:${titel.gross.length}">
      <div class="k-flaeche">
        <div class="k-bild">
          ${foto
            ? `<img class="k-foto" src="${foto}" alt="" loading="lazy" decoding="async" draggable="false">`
            : `<svg class="k-szene" viewBox="0 -14 200 200" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
            <use href="#k-szene"/><use href="#k-${art}"/>
          </svg>`}
          ${optionen.anzahl > 1 ? `<span class="k-anzahl">×${optionen.anzahl}</span>` : ''}
        </div>
        <span class="k-lasche k-lasche-l"><span class="k-nr">${k.id}</span></span>
        <span class="k-lasche k-lasche-r"><span class="k-rar"><i class="rar-stein" aria-hidden="true"></i>${s.name}</span></span>
        <div class="k-text">
          <div class="k-chips"><span class="k-bahn">${esc(k.bahn)}</span>${hinweis}</div>
          <h3 class="k-name${lang}">${esc(titel.gross)}</h3>
          <p class="k-unter">${esc(titel.klein)}</p>
        </div>
        <span class="k-flagge" aria-hidden="true"></span>
        <span class="k-fx" aria-hidden="true"><i></i></span>
      </div>
      <div class="k-glanz" aria-hidden="true"></div>
    </article>`;
}

// Rückseite (für das Aufdecken): Bild «Graphit mit Logo», Rahmen per CSS (css/karten.css)
function rueckseiteHtml() {
  return '<div class="k-rueck" aria-hidden="true"></div>';
}
