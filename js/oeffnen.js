/* Pack öffnen: Pack aufreissen, Karten einzeln aufdecken und wegwischen, am Schluss alle nebeneinander. */

const Oeffnen = (() => {
  let packId = null;    // Pack, das gerade offen ist
  let karten = [];      // gezogene Karten (IDs)
  let neu = [];         // pro Karte: true, wenn sie neu in der Sammlung ist
  let index = 0;        // welche Karte gerade gezeigt wird
  let phase = 'zu';     // zu | pack | reisst | einzeln | uebersicht
  let xpGewinn = 0;
  let neuesLevel = null; // gesetzt, wenn dieses Pack ein Level-Aufstieg bringt
  let belohnungen = [];  // Pack-IDs, die dieser Aufstieg als Belohnung bringt
  let xpVorher = 0;      // für den XP-Balken in der Übersicht
  let besitzVorher = new Set(); // Karten vor diesem Pack, für den Bahn-Fortschritt in der Übersicht

  const SELTEN_AB = rangVon('epic'); // ab hier gibt es Glanz beim Aufdecken
  // Ab Epic lädt sich die Karte vor dem Umdrehen auf (ms): je seltener, desto länger die Spannung.
  // WUCHT: wie stark die Karte dabei zittert (1 = Epic)
  const AUFLADEN = { epic: 1100, mythic: 1400, legendary: 1700, special: 2000 };
  const WUCHT = { epic: 1, mythic: 1.1, legendary: 1.2, special: 1.3 };
  const BEWEGUNG_RUHIG = matchMedia('(prefers-reduced-motion: reduce)');

  function oeffne(id) {
    const p = packVonId(id);
    if (!p) return;
    if (vorratVon(id) <= 0) {
      zeigeHinweis('Von diesem Pack hast du keins mehr im Vorrat.');
      return;
    }

    packId = id;
    phase = 'pack';
    $('op-titel').textContent = `${p.titel} · ${p.name}`;
    // Bis das neue Bild bereit ist, bleibt das Pack unsichtbar (sonst blitzt kurz das zuletzt geöffnete Pack auf)
    const img = $('op-img');
    const quelle = bildGross(p);
    img.style.visibility = 'hidden';
    img.src = quelle;
    img.decode().catch(() => {}).finally(() => {
      if (img.getAttribute('src') === quelle) img.style.visibility = '';
    });
    img.alt = `${p.titel} Pack ${p.name}`;
    $('op-tipp').textContent = 'Tippen zum Aufreissen';
    $('op-status').textContent = '';
    $('op-pack').hidden = false;
    $('op-pack').disabled = false;
    $('op-pack').classList.remove('op-feder', 'op-shake', 'op-reisst', 'op-druck');
    // Licht und Material je Stufe (Basis weiss, Silver kühl, Gold golden, Platinum prismatisch)
    $('opener').dataset.stufe = p.stufe;
    $('opener').classList.remove('einzeln', 'fx-laedt');
    $('op-einzeln').classList.remove('stapel-rein');
    $('op-einzeln').hidden = true;
    $('op-karten').hidden = true;
    $('op-karten').innerHTML = '';
    $('op-alle').hidden = true;
    $('op-fortschritt').hidden = true;
    $('op-fortschritt').classList.remove('aufstieg');
    zeigeSchliessen('Später öffnen');
    $('opener').hidden = false;
    // pack-offen: die App dahinter ruht (css/spielgefuehl.css)
    document.body.classList.add('op-offen', 'pack-offen');
    $('op-pack').focus();
    Gefuehl.ton('auf');
  }

  function schliesse() {
    if (phase === 'reisst') return;
    // Alle Karten aus der Übersicht stellen sich in eine Reihe und fliegen dann einzeln ins Album
    // (Stelle merken, bevor das Fenster zugeht)
    const insAlbum = phase === 'uebersicht'
      ? [...$('op-karten').querySelectorAll('li')].map((li) => {
        const k = li.querySelector('.karte');
        return { html: k.outerHTML, rect: k.getBoundingClientRect(), neu: li.classList.contains('neu') };
      })
      : [];
    // Erst die App dahinter wieder zeichnen lassen, zwei Bilder später das Fenster schliessen.
    // Sonst blitzt sie auf dem Handy kurz leer oder in Stücken auf.
    document.body.classList.remove('op-offen', 'pack-offen');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (phase === 'zu') $('opener').hidden = true;
    }));
    packId = null;
    phase = 'zu';
    aktualisiereAlles();
    if (insAlbum.length) Gefuehl.insAlbum(insAlbum);
  }

  function zeigeSchliessen(text) {
    $('op-close').textContent = text;
    $('op-close').hidden = false;
  }

  function reisseAuf() {
    if (phase !== 'pack' || vorratVon(packId) <= 0) return;
    const pack = $('op-pack');
    const p = packVonId(packId);
    phase = 'reisst';
    pack.disabled = true;
    $('op-close').hidden = true;
    $('op-tipp').textContent = '';
    // 1. Das Pack federt nach dem Druck kurz zurück
    pack.classList.remove('op-druck');
    pack.classList.add('op-feder');
    Gefuehl.vibriere(15);

    // Vorrat, Zähler und Karten sofort speichern, damit beim Neuladen nichts verloren geht
    xpVorher = app.daten.xp;
    besitzVorher = new Set(app.daten.karten);
    karten = zieheKarten(p.stufe, app.daten.geoeffnet);
    // welche Karten man vorher noch nicht hatte (bei doppelten im selben Pack nur die erste)
    const besitz = new Set(app.daten.karten);
    neu = karten.map((id) => {
      const istNeu = !besitz.has(id);
      besitz.add(id);
      return istNeu;
    });
    app.daten.vorrat[packId] = vorratVon(packId) - 1;
    app.daten.geoeffnet += 1;
    // Doppelte Karten bleiben als Kopie im Besitz. Man entscheidet im Album, ob man sie verwertet.
    app.daten.karten.push(...karten);
    // Neue Karten tragen im Album einen «Neu»-Sticker, bis man das Album wieder verlässt
    karten.forEach((id, i) => { if (neu[i]) app.daten.ungesehen.push(id); });
    // Tagesaufgaben: Pack geöffnet, neue Karten, Karten ab Rare
    Taeglich.zaehle('packs');
    Taeglich.zaehle('neu', neu.filter(Boolean).length);
    Taeglich.zaehle('selten', karten.filter((id) => rangVon(karteVonId(id).seltenheit) >= rangVon('rare')).length);
    const levelVorher = levelVon(app.daten.xp).level;
    xpGewinn = xpVon(karten);
    app.daten.xp += xpGewinn;
    const levelNachher = levelVon(app.daten.xp).level;
    neuesLevel = levelNachher > levelVorher ? levelNachher : null;
    belohnungen = belohnungenFuer(levelVorher, levelNachher);
    belohnungen.forEach((id) => { app.daten.vorrat[id] = vorratVon(id) + 1; });
    speichern();

    // 2. Die Naht reisst auf (Spannung, Risslinie oben)
    setTimeout(() => {
      pack.classList.remove('op-feder');
      pack.classList.add('op-shake');
      Gefuehl.ton('schuetteln');
      Gefuehl.vibriere([20, 30, 20, 30]);
    }, 180);
    // 3. Die Hülle fällt, 4. der Kartenstapel erscheint, während die Hülle noch fällt
    setTimeout(() => {
      pack.classList.remove('op-shake');
      pack.classList.add('op-reisst');
      Gefuehl.ton('reissen');
      Gefuehl.vibriere(60);
      setTimeout(starteEinzeln, 160);
    }, 180 + 450);
  }

  // ---------- Karten einzeln ----------

  function starteEinzeln() {
    phase = 'einzeln';
    index = 0;
    // beim Aufdecken scrollt das Fenster nicht (Strahlen und Funken ragen hinaus, css/spielgefuehl.css)
    $('opener').classList.add('einzeln');
    $('op-einzeln').hidden = false;
    $('op-einzeln').classList.add('stapel-rein');
    $('op-alle').hidden = false;
    zeigeKarte(true);
    // Die fallende Hülle läuft noch kurz weiter, dann verschwindet sie
    setTimeout(() => {
      $('op-pack').hidden = true;
      $('op-pack').classList.remove('op-reisst');
    }, 340);
  }

  // Die oberste Karte liegt auf dem Stapel der restlichen Karten (Rückseiten)
  function zeigeKarte(erste = false) {
    const k = karten[index];
    $('op-zaehler').textContent = `Karte ${index + 1} von ${karten.length}`;
    $('op-hilfe').textContent = 'Tippen zum Aufdecken';

    const slot = $('op-slot');
    const rest = Math.min(karten.length - index - 1, 4);
    const stapel = Array.from({ length: rest }, (_, i) =>
      `<div class="op-stapel-karte" style="--n:${i + 1}">${rueckseiteHtml()}</div>`).reverse().join('');
    slot.innerHTML = `
      <div class="op-stapel" aria-hidden="true">${stapel}</div>
      <div class="flip" tabindex="0" role="button" aria-label="Karte aufdecken">
        <div class="flip-innen">
          <div class="flip-seite flip-rueck">${rueckseiteHtml()}</div>
          <div class="flip-seite flip-vorne">${karteHtml(k)}</div>
        </div>
      </div>`;
    const flip = slot.querySelector('.flip');
    // die erste Karte kommt mit dem Stapel, jede weitere hebt sich kurz vom Stapel ab
    flip.classList.add(erste ? 'flip-stapel' : 'flip-naechste');
    // Vorahnung: ab Rare leuchtet es um die Rückseite ruhig in der Farbe der Seltenheit
    // ab Epic atmet das Leuchten schon vor dem Tippen
    const seltenheit = karteVonId(k).seltenheit;
    if (rangVon(seltenheit) >= rangVon('rare')) {
      flip.classList.add('ahnung');
      flip.style.setProperty('--ahnung', FX_FARBEN[seltenheit][0]);
    }
    if (AUFLADEN[seltenheit]) flip.classList.add('ahnung-hoch');
    bindeWischen(flip);
    flip.focus({ preventScroll: true });
  }

  // Effekte pro Seltenheit: je seltener, desto mehr Funken, Ringe, Blitz und Beben
  const FX_STUFE = { common: 0, uncommon: 1, rare: 2, epic: 3, mythic: 4, legendary: 5, special: 6 };
  const FX_FARBEN = {
    common: ['#cfd5db'],
    uncommon: ['#3ddc84', '#9dffc0'],
    rare: ['#4aa3ff', '#bfe0ff'],
    epic: ['#b06bff', '#e2c6ff'],
    mythic: ['#ff3b3b', '#ffb07a', '#ffd6a8'],
    legendary: ['#ffd34d', '#fff0a8', '#f5a300'],
    special: ['#ff5f6d', '#ffc371', '#47e891', '#4face0', '#b06ab3'],
  };
  const FX_FUNKEN = [4, 10, 16, 24, 34, 48, 70];

  // Lichtball hinter der Karte; bei Special in allen Farben, die um die Karte kreisen
  const glutHtml = (seltenheit) =>
    `<i class="fx-glut${seltenheit === 'special' ? ' bunt' : ''}" style="--farbe:${FX_FARBEN[seltenheit][0]}"></i>`;

  // Strahlenkranz als SVG: 18 schmale Strahlen, jeder wird nach aussen durchsichtig (Verlauf statt Maske).
  // Mehrere Farben (Special) wechseln sich ab. Es gibt immer nur einen Kranz, darum feste IDs.
  // «vorab»: ab Mythic brechen die Strahlen schon beim Aufladen schwach hinter der Karte hervor
  function strahlenSvg(farben, vorab = false) {
    const verlaeufe = farben.map((f, i) => `
      <radialGradient id="fx-strahl-${i}" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${f}" stop-opacity=".8"/>
        <stop offset=".4" stop-color="${f}" stop-opacity=".4"/>
        <stop offset="1" stop-color="${f}" stop-opacity="0"/>
      </radialGradient>`).join('');
    const ANZAHL = 18;
    let strahlen = '';
    for (let i = 0; i < ANZAHL; i++) {
      const a = (i / ANZAHL) * Math.PI * 2;
      const b = a + (Math.PI * 2 / ANZAHL) * 0.32;
      const p = (w) => `${(Math.cos(w) * 100).toFixed(1)} ${(Math.sin(w) * 100).toFixed(1)}`;
      strahlen += `<path d="M0 0L${p(a)}L${p(b)}Z" fill="url(#fx-strahl-${i % farben.length})"/>`;
    }
    return `<svg class="fx-strahlen${vorab ? ' vorab' : ''}" viewBox="-100 -100 200 200" aria-hidden="true"><defs>${verlaeufe}</defs>${strahlen}</svg>`;
  }

  function feiereKarte(flip, seltenheit) {
    const stufe = FX_STUFE[seltenheit] ?? 0;
    const farben = FX_FARBEN[seltenheit] || FX_FARBEN.common;
    const slot = flip.parentElement;
    flip.classList.add(seltenheit); // für die CSS-Effekte, z. B. .flip.special
    const opener = $('opener');

    // Funken fliegen von der Mitte nach aussen
    for (let i = 0; i < FX_FUNKEN[stufe]; i++) {
      const f = document.createElement('i');
      f.className = 'fx-funke';
      const winkel = Math.random() * Math.PI * 2;
      const weite = (70 + Math.random() * 110) * (0.6 + stufe * 0.2);
      f.style.setProperty('--x', `${Math.cos(winkel) * weite}px`);
      f.style.setProperty('--y', `${Math.sin(winkel) * weite}px`);
      f.style.setProperty('--farbe', farben[i % farben.length]);
      f.style.setProperty('--dauer', `${(0.7 + Math.random() * 0.5 + stufe * 0.08).toFixed(2)}s`);
      slot.appendChild(f);
      f.addEventListener('animationend', () => f.remove());
    }

    // Leuchtring und Lichtstrahlen ab Epic (beide flach hinter der Karte, die Strahlen bleiben bis zur nächsten Karte).
    // Ab Legendary läuft ein zweiter Ring kurz danach. Der Lichtball vom Aufladen bleibt und atmet.
    if (stufe >= 3) {
      (stufe >= 5 ? [0, 1] : [0]).forEach((n) => {
        const ring = document.createElement('i');
        ring.className = 'fx-ring';
        ring.style.setProperty('--farbe', farben[n]);
        ring.style.animationDelay = `${n * 0.18}s`;
        slot.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove());
      });
      const strahlen = slot.querySelector('.fx-strahlen.vorab');
      if (strahlen) strahlen.classList.add('voll');
      else slot.insertAdjacentHTML('afterbegin', strahlenSvg(seltenheit === 'special' ? farben : [farben[0]]));
      if (!slot.querySelector('.fx-glut')) slot.insertAdjacentHTML('afterbegin', glutHtml(seltenheit));
      slot.querySelector('.fx-glut').classList.add('da');
    }

    // Blitz ab Mythic. Kein Bildschirm-Beben mehr: das liess auf Handys alles verzerrt aussehen.
    if (stufe >= 4) {
      opener.classList.remove('fx-blitz');
      void opener.offsetWidth;
      opener.classList.add('fx-blitz');
      opener.style.setProperty('--blitz', farben[0]);
      setTimeout(() => opener.classList.remove('fx-blitz'), 800);
    }
  }

  // Ton, Vibration, Schriftzug und Konfetti: je seltener, desto grösser
  function feiereMitTon(seltenheit, name) {
    const stufe = FX_STUFE[seltenheit] ?? 0;
    Gefuehl.ton('flip');
    setTimeout(() => Gefuehl.ton('selten', seltenheit), 120);
    if (stufe >= 5) Gefuehl.vibriere([40, 30, 40, 30, 140]);
    else if (stufe >= 3) Gefuehl.vibriere([30, 40, 70]);
    else Gefuehl.vibriere(12);
    if (stufe >= 2) Gefuehl.banner($('op-stage'), `${name}!`, FX_FARBEN[seltenheit][0]);
    if (stufe >= 5) Gefuehl.konfetti(FX_FARBEN[seltenheit], stufe === 6 ? 130 : 80);
  }

  // Gewöhnliche Karten drehen sich zügig um. Ab Rare hebt sich die Karte zuerst kurz und zittert (Spannung),
  // dann dreht sie sich langsamer um (Tempo im CSS: .flip.ahnung). Ab Epic lädt sie sich vorher auf.
  function decktAuf(flip) {
    if (flip.classList.contains('offen') || flip.classList.contains('spannung')) return;
    const seltenheit = karteVonId(karten[index]).seltenheit;
    if (rangVon(seltenheit) < rangVon('rare')) {
      dreheUm(flip);
      return;
    }
    flip.classList.add('spannung');
    const dauer = AUFLADEN[seltenheit];
    if (!dauer) {
      Gefuehl.vibriere([15, 40, 15, 40, 15]);
      setTimeout(() => dreheUm(flip), 520);
      return;
    }
    ladeAuf(flip, seltenheit, dauer);
    setTimeout(() => dreheUm(flip), dauer);
  }

  // Aufladen ab Epic: die Karte hebt sich und zittert immer stärker, von hinten wächst ein Lichtball,
  // Lichtpunkte fliegen zur Karte und alles andere tritt zurück. Ton und Vibration werden immer schneller.
  function ladeAuf(flip, seltenheit, dauer) {
    const farben = FX_FARBEN[seltenheit];
    const slot = flip.parentElement;
    slot.style.setProperty('--laden', `${dauer}ms`);
    slot.style.setProperty('--wucht', WUCHT[seltenheit]);
    flip.classList.add('laedt');
    $('opener').classList.add('fx-laedt');
    if (FX_STUFE[seltenheit] >= 4) slot.insertAdjacentHTML('afterbegin', strahlenSvg(seltenheit === 'special' ? farben : [farben[0]], true));
    slot.insertAdjacentHTML('afterbegin', glutHtml(seltenheit));

    // Lichtpunkte starten rund um die Karte und verschwinden hinter ihr
    if (!BEWEGUNG_RUHIG.matches) {
      const anzahl = Math.round(dauer / 60);
      const rx = slot.offsetWidth / 2;
      const ry = slot.offsetHeight / 2;
      for (let i = 0; i < anzahl; i++) {
        const p = document.createElement('i');
        p.className = 'fx-sog';
        const winkel = Math.random() * Math.PI * 2;
        const weiter = 30 + Math.random() * 70;
        p.style.setProperty('--x', `${(Math.cos(winkel) * (rx + weiter)).toFixed(0)}px`);
        p.style.setProperty('--y', `${(Math.sin(winkel) * (ry + weiter)).toFixed(0)}px`);
        p.style.setProperty('--farbe', farben[i % farben.length]);
        p.style.setProperty('--warte', `${((i / anzahl) * (dauer - 550)).toFixed(0)}ms`);
        slot.appendChild(p);
        p.addEventListener('animationend', () => p.remove());
      }
    }

    Gefuehl.ton('laden', dauer / 1000);
    // Vibration: kurze Stösse, die immer dichter kommen
    const muster = [];
    for (let zeit = 0, pause = 220; zeit < dauer - 120; zeit += 18 + pause, pause = Math.max(40, pause * 0.78)) {
      muster.push(18, Math.round(pause));
    }
    Gefuehl.vibriere(muster);
  }

  function dreheUm(flip) {
    if (flip.classList.contains('offen') || phase !== 'einzeln') return;
    flip.classList.remove('spannung', 'laedt');
    $('opener').classList.remove('fx-laedt');
    flip.classList.add('offen');
    const k = karteVonId(karten[index]);
    const s = seltenheitVon(k.seltenheit);
    if (neu[index]) flip.classList.add('neu');
    if (rangVon(k.seltenheit) >= SELTEN_AB) flip.classList.add('selten');
    // ab Rare dreht die Karte langsamer: Funken, Strahlen und Schriftzug kommen, sobald die Vorderseite
    // herklappt (nach der ersten Hälfte, --halb in css/spielgefuehl.css)
    const warten = flip.classList.contains('ahnung') ? 280 : 0;
    setTimeout(() => {
      if (!flip.isConnected) return;
      feiereKarte(flip, k.seltenheit);
      feiereMitTon(k.seltenheit, s.name);
    }, warten);
    const vermerk = neu[index] ? 'Neu! ' : 'Doppelt · ';
    const titel = `${vermerk}${s.name}: ${k.name}`;
    $('op-hilfe').textContent = index < karten.length - 1
      ? `${titel} · Wischen oder tippen für die nächste Karte`
      : `${titel} · Wischen oder tippen für die Übersicht`;
    flip.setAttribute('aria-label', 'Nächste Karte');
  }

  function weiter(flip, richtung = 1) {
    if (flip.classList.contains('weg')) return;
    flip.classList.add('weg');
    Gefuehl.ton('weg');
    flip.style.transition = 'transform .35s cubic-bezier(.4,0,.6,1), opacity .35s ease';
    flip.style.transform = `translateX(${richtung * 140}%) rotate(${richtung * 22}deg)`;
    flip.style.opacity = '0';
    setTimeout(() => {
      index += 1;
      if (index < karten.length) zeigeKarte();
      else zeigeUebersicht();
    }, 300);
  }

  // Tippen deckt auf, danach schiebt Tippen oder Wischen die Karte weg
  function bindeWischen(flip) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let zieht = false;

    flip.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      zieht = true;
      flip.setPointerCapture(e.pointerId);
      flip.style.transition = 'none';
    });

    flip.addEventListener('pointermove', (e) => {
      if (!zieht || !flip.classList.contains('offen')) return;
      dx = e.clientX - startX;
      const dy = e.clientY - startY;
      flip.style.transform = `translate(${dx}px, ${dy * 0.15}px) rotate(${dx / 14}deg)`;
    });

    const loslassen = () => {
      if (!zieht) return;
      zieht = false;
      if (!flip.classList.contains('offen')) {
        flip.style.transition = '';
        decktAuf(flip);
        return;
      }
      if (Math.abs(dx) > 70) {
        weiter(flip, Math.sign(dx));
      } else if (Math.abs(dx) < 6) {
        weiter(flip, 1);
      } else {
        flip.style.transition = 'transform .3s cubic-bezier(.34,1.45,.64,1)';
        flip.style.transform = '';
      }
    };
    flip.addEventListener('pointerup', loslassen);
    flip.addEventListener('pointercancel', loslassen);

    flip.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      if (!flip.classList.contains('offen')) decktAuf(flip);
      else weiter(flip, e.key === 'ArrowLeft' ? -1 : 1);
    });
  }

  // ---------- Übersicht ----------

  function zeigeUebersicht() {
    phase = 'uebersicht';
    $('opener').classList.remove('einzeln', 'fx-laedt');
    $('op-einzeln').hidden = true;
    $('op-alle').hidden = true;
    const liste = $('op-karten');
    liste.innerHTML = '';
    karten.forEach((id, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--i', i);
      if (neu[i]) li.className = 'neu';
      li.innerHTML = karteHtml(id) + (neu[i] ? '' : '<span class="doppelt-tag">Doppelt</span>');
      liste.appendChild(li);
    });
    liste.hidden = false;

    // Neue Karten, XP und Sammlung zeigt der Fortschritt darunter. Hier nur noch Aufstieg und Belohnung.
    $('op-status').textContent = [
      neuesLevel ? `Neues Level: ${neuesLevel}!` : '',
      ...belohnungen.map((id) => `Belohnung: ${packVonId(id).titel}-Pack`),
    ].filter(Boolean).join(' · ');
    zeigeSchliessen('Fertig');
    zeigeFortschritt();
  }

  // XP-Balken füllt sich von vorher nach nachher. Bei einem Aufstieg erst ganz voll, dann Fanfare und neues Level.
  function zeigeFortschritt() {
    const box = $('op-fortschritt');
    const balken = $('opf-balken');
    const vorher = levelVon(xpVorher);
    const nachher = levelVon(app.daten.xp);
    const anteil = (l) => `${(l.aktuell / l.noetig) * 100}%`;
    box.hidden = false;
    $('opf-level').textContent = `Sammler-Level ${vorher.level}`;
    $('opf-xp').textContent = `+${xpGewinn} XP`;
    zeigeSammlung();
    const setze = (breite, weich) => {
      if (!weich) balken.style.transition = 'none';
      balken.style.width = breite;
      void balken.offsetWidth;
      balken.style.transition = '';
    };
    setze(anteil(vorher), false);
    setTimeout(() => {
      if (phase !== 'uebersicht') return;
      if (nachher.level === vorher.level) {
        setze(anteil(nachher), true);
        return;
      }
      setze('100%', true);
      setTimeout(() => {
        if (phase !== 'uebersicht') return;
        $('opf-level').textContent = `Sammler-Level ${nachher.level}`;
        box.classList.add('aufstieg');
        Gefuehl.banner($('op-stage'), `Level ${nachher.level}!`, '#ffd34d');
        Gefuehl.ton('levelup');
        Gefuehl.vibriere([40, 40, 90]);
        Gefuehl.konfetti(['#ffd34d', '#fff0a8', '#ff4251', '#ffffff'], 60);
        setze('0%', false);
        setze(anteil(nachher), true);
      }, 900);
    }, 450);
  }

  // «3 neue Karten · SBB-Sammlung 12/40»: die Bahn mit den meisten neuen Karten (sonst die der besten Karte);
  // ihr Balken wächst von vorher nach nachher
  function zeigeSammlung() {
    const neuIds = karten.filter((_, i) => neu[i]);
    const proBahn = {};
    neuIds.forEach((id) => { const b = karteVonId(id).bahn; proBahn[b] = (proBahn[b] || 0) + 1; });
    const bahn = Object.keys(proBahn).sort((a, b) => proBahn[b] - proBahn[a])[0]
      || karteVonId(karten[karten.length - 1]).bahn;
    const alle = KARTEN.filter((k) => k.bahn === bahn);
    const nachherSet = new Set(app.daten.karten);
    const vorher = alle.filter((k) => besitzVorher.has(k.id)).length;
    const nachher = alle.filter((k) => nachherSet.has(k.id)).length;
    $('opf-neu').textContent = neuIds.length
      ? `${neuIds.length} neue Karte${neuIds.length > 1 ? 'n' : ''}`
      : 'Keine neuen Karten';
    $('opf-sammlung').textContent = `${bahn}-Sammlung ${nachher}/${alle.length}`;
    const balken = $('opf-sammel-balken');
    balken.style.transition = 'none';
    balken.style.width = `${(vorher / alle.length) * 100}%`;
    void balken.offsetWidth;
    balken.style.transition = '';
    setTimeout(() => { balken.style.width = `${(nachher / alle.length) * 100}%`; }, 700);
  }

  function alleAufdecken() {
    if (phase === 'einzeln') zeigeUebersicht();
  }

  function init() {
    $('op-pack').addEventListener('click', reisseAuf);
    // Beim Drücken gibt das Pack nach, beim Loslassen federt es zurück (dann reisst es auf)
    $('op-pack').addEventListener('pointerdown', () => { if (phase === 'pack') $('op-pack').classList.add('op-druck'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((art) =>
      $('op-pack').addEventListener(art, () => $('op-pack').classList.remove('op-druck')));
    $('op-close').addEventListener('click', schliesse);
    $('op-alle').addEventListener('click', alleAufdecken);
    $('opener').addEventListener('click', (e) => {
      if (e.target === $('opener') && !$('op-close').hidden) schliesse();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('opener').hidden && !$('op-close').hidden) schliesse();
    });
  }

  return { init, oeffne };
})();
