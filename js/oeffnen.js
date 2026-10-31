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

  // ab hier übernimmt js/enthuellung.js: Aufladen mit Farbstufen, Knall und Nachglühen
  const HOCH_AB = rangVon('epic');

  function oeffne(id) {
    const p = packVonId(id);
    if (!p) return;
    if (vorratVon(id) <= 0) {
      zeigeHinweis('Von diesem Pack hast du keins mehr im Vorrat.');
      return;
    }

    packId = id;
    phase = 'pack';
    Enthuellung.beenden(true);
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
    Enthuellung.beenden(true);
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
    // Vorahnung: Rare leuchtet ruhig blau um die Rückseite. Ab Epic schimmert es lila dahinter und verrät noch nicht,
    // wie selten genau: das zeigt erst das Aufladen (js/enthuellung.js).
    const seltenheit = karteVonId(k).seltenheit;
    if (rangVon(seltenheit) >= HOCH_AB) {
      flip.classList.add('hoch');
      Enthuellung.vorbereiten(slot, flip);
    } else if (rangVon(seltenheit) >= rangVon('rare')) {
      flip.classList.add('ahnung');
      flip.style.setProperty('--ahnung', FX_FARBEN[seltenheit][0]);
    }
    bindeWischen(flip);
    flip.focus({ preventScroll: true });
  }

  // Effekte bis Rare: je seltener, desto mehr Funken. Ab Epic zeichnet js/enthuellung.js alles.
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
  const FX_FUNKEN = [4, 10, 16];

  function feiereKarte(flip, seltenheit) {
    const stufe = FX_STUFE[seltenheit] ?? 0;
    const farben = FX_FARBEN[seltenheit] || FX_FARBEN.common;
    const slot = flip.parentElement;

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
  }

  // Ton, Vibration und Schriftzug: je seltener, desto grösser (Konfetti ab Legendary kommt aus js/enthuellung.js)
  function feiereMitTon(seltenheit, name) {
    const stufe = FX_STUFE[seltenheit] ?? 0;
    Gefuehl.ton(stufe >= 3 ? 'knall' : 'flip');
    setTimeout(() => Gefuehl.ton('selten', seltenheit), 120);
    if (stufe >= 5) Gefuehl.vibriere([60, 30, 40, 30, 160]);
    else if (stufe >= 3) Gefuehl.vibriere([50, 40, 80]);
    else Gefuehl.vibriere(12);
    if (stufe >= 2) Gefuehl.banner($('op-stage'), `${name}!`, FX_FARBEN[seltenheit][0]);
  }

  // Gewöhnliche Karten drehen sich zügig um. Rare hebt sich zuerst kurz und zittert (Spannung),
  // dann dreht sie sich langsamer um (Tempo im CSS: .flip.ahnung). Ab Epic lädt sie sich vorher auf (js/enthuellung.js).
  function decktAuf(flip) {
    if (flip.classList.contains('offen') || flip.classList.contains('spannung') || flip.classList.contains('laedt')) return;
    const seltenheit = karteVonId(karten[index]).seltenheit;
    if (flip.classList.contains('hoch')) {
      flip.classList.add('laedt');
      $('opener').classList.add('fx-laedt');
      setTimeout(() => dreheUm(flip), Enthuellung.aufladen(seltenheit));
      return;
    }
    if (rangVon(seltenheit) < rangVon('rare')) {
      dreheUm(flip);
      return;
    }
    flip.classList.add('spannung');
    Gefuehl.vibriere([15, 40, 15, 40, 15]);
    setTimeout(() => dreheUm(flip), 520);
  }

  function dreheUm(flip) {
    if (flip.classList.contains('offen') || phase !== 'einzeln') return;
    flip.classList.remove('spannung', 'laedt');
    $('opener').classList.remove('fx-laedt');
    flip.classList.add('offen');
    const k = karteVonId(karten[index]);
    const s = seltenheitVon(k.seltenheit);
    flip.classList.add(k.seltenheit); // für die CSS-Effekte, z. B. .flip.special
    if (neu[index]) flip.classList.add('neu');
    // ab Rare dreht die Karte langsamer: Funken, Knall und Schriftzug kommen, sobald die Vorderseite
    // herklappt (nach der ersten Hälfte, --halb in css/spielgefuehl.css)
    const hoch = flip.classList.contains('hoch');
    const warten = hoch ? 180 : flip.classList.contains('ahnung') ? 280 : 0;
    setTimeout(() => {
      if (!flip.isConnected) return;
      if (hoch) Enthuellung.knall(k.seltenheit);
      else feiereKarte(flip, k.seltenheit);
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
    Enthuellung.beenden();
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
      Enthuellung.halt();
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
    Enthuellung.beenden(true);
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
