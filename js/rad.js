/* Glücksrad: einmal alle 24 Stunden drehen. Gewinnt ein Pack – oder nichts. */

const Rad = (() => {
  // 12 gleich grosse Felder. Die Anzahl Felder pro Preis ist die Chance (Platzhalter):
  // Nichts 5/12, Standard 3/12, Silber 2/12, Gold 1/12, Platin 1/12
  const FELDER = ['nichts', 'standard', 'silber', 'nichts', 'standard', 'gold',
                  'nichts', 'standard', 'silber', 'nichts', 'platin', 'nichts'];

  const PREISE = {
    nichts:   { text: 'Nichts', farbe: 'var(--rad-nichts)', schrift: 'var(--fg-2)' },
    standard: { text: 'Standard', farbe: 'var(--t-standard)', schrift: '#FFFFFF' },
    silber:   { text: 'Silber', farbe: '#A7AFB7', schrift: '#202326' },
    gold:     { text: 'Gold', farbe: '#D4A21A', schrift: '#202326' },
    platin:   { text: 'Platin', farbe: '#2F4A6E', schrift: '#FFFFFF' },
  };

  let drehung = 0;    // aktueller Winkel des Rads in Grad
  let dreht = false;

  function bereit() {
    return bereitIn(app.daten.radZeit) === 0;
  }

  function zeichneRad() {
    const svg = $('rad-svg');
    const n = FELDER.length;
    const r = 100;
    let html = '';
    FELDER.forEach((preis, i) => {
      const a1 = (i / n) * 2 * Math.PI - Math.PI / 2;
      const a2 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const x1 = 100 + r * Math.cos(a1), y1 = 100 + r * Math.sin(a1);
      const x2 = 100 + r * Math.cos(a2), y2 = 100 + r * Math.sin(a2);
      const mitte = ((i + 0.5) / n) * 360;
      const p = PREISE[preis];
      html += `<path d="M100 100 L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" style="fill:${p.farbe};stroke:var(--surface)" stroke-width="1.5"/>`;
      // Schrift läuft von innen nach aussen, damit auch "Standard" ins schmale Feld passt
      html += `<text x="191" y="100" transform="rotate(${mitte - 90} 100 100)" text-anchor="end" dominant-baseline="central" style="fill:${p.schrift}" font-size="11" font-weight="800">${p.text}</text>`;
    });
    html += '<circle cx="100" cy="100" r="18" style="fill:var(--surface);stroke:var(--line)" stroke-width="2"/>';
    html += '<svg x="86" y="93" width="28" height="14" viewBox="0 0 570 270"><use href="#logo"/></svg>';
    svg.innerHTML = html;
  }

  function aktualisiere() {
    const btn = $('rad-btn');
    const info = $('rad-info');
    if (dreht) return;
    if (bereit()) {
      btn.disabled = false;
      btn.textContent = 'Drehen';
      info.textContent = 'Einmal alle 24 Stunden. Vielleicht gewinnst du ein Pack.';
    } else {
      btn.disabled = true;
      btn.textContent = 'Schon gedreht';
      info.textContent = `Nächste Drehung in ${dauerText(bereitIn(app.daten.radZeit))}`;
    }
    const startInfo = $('rad-start-info');
    if (startInfo) startInfo.textContent = bereit() ? 'Bereit zum Drehen' : `Wieder in ${dauerText(bereitIn(app.daten.radZeit))}`;
  }

  function drehe() {
    if (dreht || !bereit()) return;
    dreht = true;
    const feld = Math.floor(Math.random() * FELDER.length);
    const preis = FELDER[feld];

    // sofort speichern: Neuladen während der Drehung gibt keine zweite Chance
    app.daten.radZeit = Date.now();
    let packId = null;
    if (preis !== 'nichts') {
      const auswahl = PACKS.filter((p) => p.stufe === preis);
      packId = auswahl[Math.floor(Math.random() * auswahl.length)].id;
      app.daten.vorrat[packId] = vorratVon(packId) + 1;
    }
    speichern();

    // Mitte des Feldes unter den Zeiger oben drehen, mit etwas Zufall im Feld
    const grad = 360 / FELDER.length;
    const ziel = feld * grad + grad / 2 + (Math.random() - 0.5) * grad * 0.6;
    const aktuell = ((drehung % 360) + 360) % 360;
    drehung += 360 * 6 + ((360 - ziel - aktuell) % 360 + 360) % 360;

    $('rad-btn').disabled = true;
    $('rad-btn').textContent = 'Dreht …';
    $('rad-ergebnis').hidden = true;
    const rad = $('rad-svg');
    rad.style.transition = 'transform 4.6s cubic-bezier(.12,.62,.08,1)';
    rad.style.transform = `rotate(${drehung}deg)`;

    setTimeout(() => {
      dreht = false;
      zeigeErgebnis(preis, packId);
      aktualisiereAlles();
    }, 4750);
  }

  function zeigeErgebnis(preis, packId) {
    const box = $('rad-ergebnis');
    box.hidden = false;
    box.className = `rad-ergebnis preis-${preis}`;
    if (!packId) {
      box.innerHTML = '<b>Leider nichts.</b><span>Morgen hast du eine neue Chance.</span>';
      return;
    }
    const p = packVonId(packId);
    box.innerHTML = `
      <img src="${bildKlein(p)}" alt="">
      <div><b>Gewonnen: ${p.titel}-Pack!</b><span>${p.name} liegt jetzt in deinem Vorrat.</span></div>
      <button class="btn" type="button" data-oeffnen="${p.id}">Jetzt öffnen</button>`;
  }

  function init() {
    zeichneRad();
    $('rad-btn').addEventListener('click', drehe);
    $('rad-ergebnis').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-oeffnen]');
      if (btn) Oeffnen.oeffne(btn.dataset.oeffnen);
    });
  }

  return { init, aktualisiere, bereit };
})();
