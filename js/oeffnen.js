/* Pack öffnen: Pack aufreissen, Karten einzeln aufdecken und wegwischen, am Schluss alle nebeneinander. */

const Oeffnen = (() => {
  let packId = null;    // Pack, das gerade offen ist
  let karten = [];      // gezogene Karten (IDs)
  let neu = [];         // pro Karte: true, wenn sie neu in der Sammlung ist
  let index = 0;        // welche Karte gerade gezeigt wird
  let phase = 'zu';     // zu | pack | reisst | einzeln | uebersicht
  let xpGewinn = 0;
  let neuesLevel = null; // gesetzt, wenn dieses Pack ein Level-Aufstieg bringt

  const SELTEN_AB = rangVon('epic'); // ab hier gibt es Glanz beim Aufdecken

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
    $('op-img').src = bildGross(p);
    $('op-img').alt = `${p.titel} Pack ${p.name}`;
    $('op-tipp').textContent = 'Tippen zum Aufreissen';
    $('op-status').textContent = '';
    $('op-pack').hidden = false;
    $('op-pack').disabled = false;
    $('op-pack').classList.remove('op-shake', 'op-reisst');
    $('op-einzeln').hidden = true;
    $('op-karten').hidden = true;
    $('op-karten').innerHTML = '';
    $('op-alle').hidden = true;
    zeigeSchliessen('Später öffnen');
    $('opener').hidden = false;
    document.body.classList.add('op-offen');
    $('op-pack').focus();
  }

  function schliesse() {
    if (phase === 'reisst') return;
    $('opener').hidden = true;
    document.body.classList.remove('op-offen');
    packId = null;
    phase = 'zu';
    aktualisiereAlles();
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
    pack.classList.add('op-shake');

    // Vorrat, Zähler und Karten sofort speichern, damit beim Neuladen nichts verloren geht
    karten = zieheKarten(p.stufe);
    // welche Karten man vorher noch nicht hatte (bei doppelten im selben Pack nur die erste)
    const besitz = new Set(app.daten.karten);
    neu = karten.map((id) => {
      const istNeu = !besitz.has(id);
      besitz.add(id);
      return istNeu;
    });
    app.daten.vorrat[packId] = vorratVon(packId) - 1;
    app.daten.geoeffnet += 1;
    app.daten.karten.push(...karten);
    const levelVorher = levelVon(app.daten.xp).level;
    xpGewinn = xpVon(karten);
    app.daten.xp += xpGewinn;
    const levelNachher = levelVon(app.daten.xp).level;
    neuesLevel = levelNachher > levelVorher ? levelNachher : null;
    speichern();

    setTimeout(() => {
      pack.classList.remove('op-shake');
      pack.classList.add('op-reisst');
      setTimeout(starteEinzeln, 480);
    }, 700);
  }

  // ---------- Karten einzeln ----------

  function starteEinzeln() {
    phase = 'einzeln';
    index = 0;
    $('op-pack').hidden = true;
    $('op-einzeln').hidden = false;
    $('op-alle').hidden = false;
    zeigeKarte();
  }

  function zeigeKarte() {
    const k = karten[index];
    $('op-zaehler').textContent = `Karte ${index + 1} von ${karten.length}`;
    $('op-hilfe').textContent = 'Tippen zum Aufdecken';

    const slot = $('op-slot');
    slot.innerHTML = `
      <div class="flip" tabindex="0" role="button" aria-label="Karte aufdecken">
        <div class="flip-innen">
          <div class="flip-seite flip-rueck">${rueckseiteHtml()}</div>
          <div class="flip-seite flip-vorne">${karteHtml(k)}</div>
        </div>
      </div>`;
    const flip = slot.firstElementChild;
    flip.classList.add('flip-rein');
    bindeWischen(flip);
    flip.focus({ preventScroll: true });
  }

  function decktAuf(flip) {
    if (flip.classList.contains('offen')) return;
    flip.classList.add('offen');
    const k = karteVonId(karten[index]);
    const s = seltenheitVon(k.seltenheit);
    if (neu[index]) flip.classList.add('neu');
    if (rangVon(k.seltenheit) >= SELTEN_AB) flip.classList.add('selten');
    const titel = `${neu[index] ? 'Neu! ' : ''}${s.name}: ${k.name}`;
    $('op-hilfe').textContent = index < karten.length - 1
      ? `${titel} · Wischen oder tippen für die nächste Karte`
      : `${titel} · Wischen oder tippen für die Übersicht`;
    flip.setAttribute('aria-label', 'Nächste Karte');
  }

  function weiter(flip, richtung = 1) {
    if (flip.classList.contains('weg')) return;
    flip.classList.add('weg');
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
    $('op-einzeln').hidden = true;
    $('op-alle').hidden = true;
    const liste = $('op-karten');
    liste.innerHTML = '';
    karten.forEach((id, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--i', i);
      if (neu[i]) li.className = 'neu';
      li.innerHTML = karteHtml(id);
      liste.appendChild(li);
    });
    liste.hidden = false;

    const bestes = seltenheitVon(karteVonId(karten[karten.length - 1]).seltenheit);
    const anzahlNeu = neu.filter(Boolean).length;
    $('op-status').textContent = `Beste Karte: ${bestes.name} · ${anzahlNeu} neu · +${xpGewinn} XP`
      + (neuesLevel ? ` · Neues Level: ${neuesLevel}!` : '');
    zeigeSchliessen('Fertig');
  }

  function alleAufdecken() {
    if (phase === 'einzeln') zeigeUebersicht();
  }

  function init() {
    $('op-pack').addEventListener('click', reisseAuf);
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
