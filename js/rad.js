/* Glücksrad: einmal alle 24 Stunden drehen. Gewinnt ein Pack – oder nichts. */

const Rad = (() => {
  // Jedes sichtbare Feld hat exakt 1/12 Chance.
  const FELDER = ['coin5','standard','coin10','coin5','silber','coin20',
    'coin5','standard','coin10','coin5','gold','coin20'];
  const BONUS_ZIEL = 30;
  const BONUS_STUFE = 'gold'; // alle BONUS_ZIEL Drehungen ein Pack dieser Stufe extra
  const PREISE = {
    coin5: { text:'5', coins:5, farbe:'#263749', schrift:'#fff' },
    coin10: { text:'10', coins:10, farbe:'#344d60', schrift:'#fff' },
    coin20: { text:'20', coins:20, farbe:'#456778', schrift:'#fff' },
    standard: { text:'Basis', farbe:'#D71920', schrift:'#fff' },
    silber: { text:'Silver', farbe:'#A7AFB7', schrift:'#17212b' },
    gold: { text:'Gold', farbe:'#D4A21A', schrift:'#17212b' }
  };
  let bonusPack = null;
  let drehung = 0;    // aktueller Winkel des Rads in Grad
  let dreht = false;

  // Tagesdreh (alle 24 Stunden) oder eine Extra-Drehung (app.daten.radExtra, z. B. aus dem Beta-Code)
  const tagesdreh = () => bereitIn(app.daten.radZeit) === 0;
  const extra = () => app.daten.radExtra || 0;

  function bereit() {
    return tagesdreh() || extra() > 0;
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
      const icon = p.coins ? 'assets/muenzen/gold-rund.png' : bildKlein(PACKS.find(p => p.stufe === preis));
      html += `<g transform="rotate(${mitte} 100 100)"><image href="${icon}" x="91" y="14" width="18" height="23" preserveAspectRatio="xMidYMid meet"/><text x="100" y="47" text-anchor="middle" style="fill:${p.schrift}" font-weight="800">${p.text}</text></g>`;
    });
    svg.innerHTML = html;
  }

  function aktualisiere() {
    const btn = $('rad-btn');
    const info = $('rad-info');
    if (dreht) return;
    const stand = (app.daten.radDrehungen || 0) % BONUS_ZIEL;
    $('rad-bonus-text').textContent = stand + ' / ' + BONUS_ZIEL + ' Drehungen';
    $('rad-bonus-balken').value = stand;
    $('rad-buehne').setAttribute('aria-disabled', String(!bereit()));
    $('rad-buehne').classList.toggle('bereit', bereit());
    if (bereit()) {
      btn.disabled = false;
      $('rad-btn-txt').textContent = 'Drehen';
      info.textContent = extra() > 0
        ? `Jeder Dreh gewinnt. Extra-Drehungen: ${extra()}${tagesdreh() ? ' plus der Gratisdreh von heute' : ''}.`
        : 'Jeder Dreh gewinnt. Ein Gratisdreh alle 24 Stunden.';
    } else {
      btn.disabled = true;
      $('rad-btn-txt').textContent = `In ${dauerText(bereitIn(app.daten.radZeit))}`;
      info.textContent = 'Du hast heute schon gedreht.';
    }
  }

  function drehe() {
    if (dreht || !bereit()) return;
    dreht = true;
    const feld = Math.floor(Math.random() * FELDER.length);
    const preis = FELDER[feld];

    // sofort speichern: Neuladen während der Drehung gibt keine zweite Chance.
    // Bei «Nochmal» bleibt das Rad bereit.
    // zuerst der Gratisdreh von heute, sonst eine Extra-Drehung
    if (tagesdreh()) app.daten.radZeit = Date.now();
    else app.daten.radExtra = extra() - 1;
    app.daten.radDrehungen = (app.daten.radDrehungen || 0) + 1;
    bonusPack = null;
    let packId = null;
    if (PREISE[preis].coins) {
      app.daten.muenzen += PREISE[preis].coins;
    } else {
      const auswahl = PACKS.filter((p) => p.stufe === preis);
      packId = auswahl[Math.floor(Math.random() * auswahl.length)].id;
      app.daten.vorrat[packId] = vorratVon(packId) + 1;
    }
    if (app.daten.radDrehungen % BONUS_ZIEL === 0) {
      const packs = PACKS.filter(p => p.stufe === BONUS_STUFE);
      bonusPack = zufall(packs).id;
      app.daten.vorrat[bonusPack] = vorratVon(bonusPack) + 1;
    }
    // Aufgaben und Gewinn zusammen vor der Animation sichern.
    Taeglich.zaehle('rad');
    speichern();

    // Mitte des Feldes unter den Zeiger oben drehen, mit etwas Zufall im Feld
    const grad = 360 / FELDER.length;
    const ziel = feld * grad + grad / 2 + (Math.random() - 0.5) * grad * 0.6;
    const aktuell = ((drehung % 360) + 360) % 360;
    const weg = 360 * 6 + ((360 - ziel - aktuell) % 360 + 360) % 360;
    drehung += weg;
    // Ein Klick pro Feld am Zeiger, langsamer werdend wie das Rad
    const reduziert = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sekunden = reduziert ? 0.15 : 4.6;
    if (!reduziert) Gefuehl.radTicks(weg, grad, sekunden);
    Gefuehl.vibriere(20);

    $('rad-btn').disabled = true;
    $('rad-btn-txt').textContent = 'Dreht …';
    $('rad-buehne').classList.remove('bereit');
    $('rad-buehne').classList.add('dreht');
    const rad = $('rad-svg');
    rad.style.transition = `transform ${sekunden}s cubic-bezier(.12,.62,.08,1)`;
    rad.style.transform = `rotate(${drehung}deg)`;

    setTimeout(() => {
      dreht = false;
      $('rad-buehne').classList.remove('dreht');
      aktualisiereAlles();
      zeigeGewinn(preis, packId);
    }, sekunden * 1000 + 150);
  }

  // ---------- Gewinn-Fenster ----------

  let gewonnenesPack = null;
  let nochmal = false;

  function zeigeGewinn(preis, packId) {
    gewonnenesPack = packId;
    nochmal = preis === 'nochmal';
    const box = $('gewinn');
    // Animation je Pack-Stufe: basis leicht, silver schön, gold mehr, platin extrem
    const stufe = packId ? packVonId(packId).stufe : null;
    box.className = `gewinn preis-${preis}${stufe ? ` stufe-${stufe}` : ''}`;
    const FUNKEN = { standard: 14, silber: 28, gold: 46, platin: 74 };
    const FUNKEN_FARBEN = {
      standard: ['#D71920', '#FFD54A'],
      silber: ['#FFFFFF', '#A7AFB7', '#8FD3FF'],
      gold: ['#FFD54A', '#FFF0A8', '#D4A21A'],
      platin: ['#FFFFFF', '#8FD3FF', '#5E7FA8', '#C9B6FF'],
    };
    const fbox = document.querySelector('#gewinn .gw-funken');
    fbox.innerHTML = '';
    if (stufe) {
      const farben = FUNKEN_FARBEN[stufe];
      for (let i = 0; i < FUNKEN[stufe]; i++) {
        const f = document.createElement('i');
        const winkel = Math.random() * Math.PI * 2;
        const weite = 90 + Math.random() * (stufe === 'platin' ? 230 : 170);
        f.style.setProperty('--x', `${(Math.cos(winkel) * weite).toFixed(0)}px`);
        f.style.setProperty('--y', `${(Math.sin(winkel) * weite).toFixed(0)}px`);
        f.style.background = farben[i % farben.length];
        f.style.animationDelay = `${(0.7 + Math.random() * 0.4).toFixed(2)}s`;
        fbox.appendChild(f);
      }
    }
    $('gw-oeffnen-icon').setAttribute('href', nochmal ? '#i-rad' : '#i-pack-hell');
    if (nochmal) {
      $('gw-img').hidden = true;
      $('gw-leer').hidden = false;
      $('gw-kicker').textContent = 'Glück gehabt!';
      $('gw-titel').textContent = 'Nochmal drehen';
      $('gw-text').textContent = 'Du darfst gleich noch einmal am Rad drehen.';
      $('gw-oeffnen-txt').textContent = 'Nochmal drehen';
      $('gw-oeffnen').hidden = false;
      $('gw-spaeter').textContent = 'Später drehen';
    } else if (packId) {
      const p = packVonId(packId);
      $('gw-img').src = bildGross(p);
      $('gw-img').alt = `${p.titel} Pack ${p.name}`;
      $('gw-img').hidden = false;
      $('gw-leer').hidden = true;
      $('gw-kicker').textContent = 'Gewonnen!';
      $('gw-titel').textContent = `${p.titel} Pack`;
      $('gw-text').textContent = `${p.name} liegt jetzt in deinem Vorrat.`;
      $('gw-oeffnen-txt').textContent = 'Jetzt öffnen';
      $('gw-oeffnen').hidden = false;
      $('gw-spaeter').textContent = 'Später öffnen';
    } else {
      $('gw-img').hidden = false;
      $('gw-img').src = 'assets/muenzen/gold-rund.png';
      $('gw-img').alt = 'Goldene RB Coins';
      $('gw-leer').hidden = true;
      $('gw-kicker').textContent = 'Gewonnen!';
      $('gw-titel').textContent = '+' + PREISE[preis].coins + ' RB Coins';
      $('gw-text').textContent = 'Die Coins sind bereits auf deinem Konto.';
      $('gw-oeffnen').hidden = true;
      $('gw-spaeter').textContent = 'OK';
    }
    if (bonusPack) $('gw-text').textContent += ` Zusätzlich: Dein ${packVonId(bonusPack).titel}-Pack für ${BONUS_ZIEL} Drehungen liegt im Vorrat!`;
    box.hidden = false;
    document.body.classList.add('op-offen');
    (packId ? $('gw-oeffnen') : $('gw-spaeter')).focus({ preventScroll: true });
    Gefuehl.ton(preis === 'nichts' ? 'nichts' : 'gewinn');
    Gefuehl.vibriere(preis === 'nichts' ? 30 : [40, 40, 90]);
    // Tagesaufgabe «Dreh am Glücksrad» (die Meldung kommt erst, wenn das Fenster zu ist)
  }

  function schliesseGewinn() {
    $('gewinn').hidden = true;
    document.body.classList.remove('op-offen');
    Taeglich.zeichne();
  }

  // ---------- Info zum Rad (kleine Schaltfläche rechts unten) ----------

  // Chancen aus den Feldern zählen, damit die Info immer zum Rad passt
  function zeigeInfo() {
    const anzahl = {};
    FELDER.forEach((f) => { anzahl[f] = (anzahl[f] || 0) + 1; });
    const n = FELDER.length;
    const name = (f) => (PREISE[f].coins ? `${PREISE[f].coins} RB Coins` : `${PACKS.find((p) => p.stufe === f).titel}-Pack`);
    // Reihenfolge wie in PREISE: erst die Coins, dann die Packs von Basis bis Gold
    $('rad-info-chancen').innerHTML = Object.keys(PREISE).filter((f) => anzahl[f]).map((f) =>
      `<li><span>${name(f)}</span><span>${anzahl[f]} von ${n} Feldern</span></li>`).join('');
    $('rad-info-fenster').hidden = false;
    document.body.classList.add('op-offen');
    $('rad-info-zu').focus({ preventScroll: true });
  }

  function schliesseInfo() {
    if ($('rad-info-fenster').hidden) return;
    $('rad-info-fenster').hidden = true;
    document.body.classList.remove('op-offen');
  }

  function init() {
    const bonus = PACKS.find((p) => p.stufe === BONUS_STUFE);
    const panel = document.createElement('div');
    panel.className = 'rad-bonus';
    panel.innerHTML = `<img src="${bildKlein(bonus)}" alt=""><div><strong>Dein Weg zu ${bonus.titel}</strong><span id="rad-bonus-text"></span><progress id="rad-bonus-balken" max="${BONUS_ZIEL}" value="0" aria-label="Fortschritt zum ${bonus.titel}-Pack"></progress><small>Alle ${BONUS_ZIEL} Drehungen ein ${bonus.titel}-Pack extra. Kein Verfall.</small></div>`;
    document.querySelector('#v-rad .rad-unten').appendChild(panel);
    const fuss = document.createElement('div');
    fuss.className = 'rad-fuss';
    fuss.innerHTML = '<button class="info-knopf" type="button" id="rad-info-knopf" aria-label="So funktioniert das Glücksrad" aria-haspopup="dialog">i</button>';
    document.querySelector('#v-rad .rad-unten').appendChild(fuss);
    $('rad-info-knopf').addEventListener('click', zeigeInfo);
    $('rad-info-zu').addEventListener('click', schliesseInfo);
    $('rad-info-fenster').addEventListener('click', (e) => { if (e.target === $('rad-info-fenster')) schliesseInfo(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseInfo(); });
    zeichneRad();
    $('rad-btn').addEventListener('click', drehe);
    // Auf das Rad drücken dreht es auch
    $('rad-buehne').addEventListener('click', drehe);
    $('rad-buehne').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      drehe();
    });
    $('gw-oeffnen').addEventListener('click', () => {
      schliesseGewinn();
      if (nochmal) setTimeout(drehe, 250); // Fenster erst zugehen lassen, dann dreht das Rad wieder
      else if (gewonnenesPack) Oeffnen.oeffne(gewonnenesPack);
    });
    $('gw-spaeter').addEventListener('click', schliesseGewinn);
    $('gewinn').addEventListener('click', (e) => { if (e.target === $('gewinn')) schliesseGewinn(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('gewinn').hidden) schliesseGewinn();
    });
  }

  return { init, aktualisiere, bereit };
})();
