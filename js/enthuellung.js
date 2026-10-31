/*
 * Enthüllung ab Epic. Licht, Strahlen, Druckwellen, Funken und Konfetti werden auf zwei Zeichenflächen (canvas)
 * gemalt statt mit vielen grossen, leuchtenden Elementen. So bleibt es auch auf dem Handy flüssig: der Browser
 * bewegt nur zwei Bilder und die Karte selbst.
 *
 * Ablauf (gesteuert aus js/oeffnen.js):
 * 1. vorbereiten: liegt eine Karte ab Epic oben, schimmert es lila hinter ihr und Lichtpunkte steigen auf.
 * 2. aufladen: nach dem Tippen steigt die Farbe Stufe um Stufe: Epic lila → Mythic rot → Legendary gold →
 *    Special Regenbogen. Man sieht erst am Schluss, wie weit es geht. Die Karte hebt sich und zittert immer stärker.
 * 3. knall: beim Umdrehen Blitz, Druckwellen, Funken, Strahlen und ab Legendary Konfetti.
 * 4. Nachglühen, bis die Karte weggewischt wird (beenden).
 */
const Enthuellung = (() => {
  const FOLGE = ['epic', 'mythic', 'legendary', 'special'];
  const FARBEN = {
    epic: ['#b06bff', '#e2c6ff'],
    mythic: ['#ff3b3b', '#ff9a5a', '#ffd6a8'],
    legendary: ['#ffd34d', '#fff0a8', '#f5a300'],
    special: ['#ff5f6d', '#ffc371', '#47e891', '#4face0', '#b06ab3'],
  };
  // Aufladen: die erste Stufe dauert ERSTE ms, jede weitere Farbstufe STUFE ms (Epic 0,8 s bis Special 2,75 s)
  const ERSTE = 800;
  const STUFE = 650;
  // je Seltenheit (Epic, Mythic, Legendary, Special)
  const FUNKEN = [45, 65, 85, 110];
  const KONFETTI = [0, 0, 110, 160];
  const BLITZ = [0.4, 0.55, 0.7, 0.8];
  const SCHWEBEN = [5, 9, 9, 13]; // aufsteigende Lichtpunkte pro Sekunde beim Nachglühen
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');

  let hinten = null; // Licht, Strahlen, Druckwellen, Lichtpunkte (hinter der Karte)
  let vorne = null; // Funken, Blitz und Konfetti (vor der Karte)
  let gh = null;
  let gv = null;
  let dpr = 1;
  let breite = 0;
  let hoehe = 0;
  let vorneBenutzt = false;
  let laeuft = false;
  let letzte = 0;
  let s = null; // Zustand der Karte, die gerade oben liegt

  const rgb = {};
  function rgba(hex, a) {
    if (!rgb[hex]) rgb[hex] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
    return `rgba(${rgb[hex]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }
  const zufall = (a, b) => a + Math.random() * (b - a);
  const wahl = (liste) => liste[Math.floor(Math.random() * liste.length)];
  const jetzt = () => performance.now() / 1000;
  const raus = (p) => 1 - (1 - p) ** 3; // schnell los, weich aus
  const rein = (p) => p * p;
  const nach = (wert, ziel, tempo, dt) => wert + (ziel - wert) * Math.min(1, dt * tempo);
  const farbenVon = (stufe) => FARBEN[FOLGE[stufe]];

  // Zeichenflächen so gross wie das Fenster. Höchstens 1,5 Bildpunkte pro Punkt: Licht darf weich sein, das spart Speicher.
  function groesse() {
    const opener = $('opener');
    const w = opener.clientWidth;
    const h = opener.clientHeight;
    if (w === breite && h === hoehe && hinten.width) return;
    breite = w;
    hoehe = h;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    [[hinten, gh], [vorne, gv]].forEach(([c, g]) => {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  // Mitte und Grösse der Karte. Gemessen am Platz der Karte, so stört das Zittern der Karte nicht.
  function messe() {
    const r = s.slot.getBoundingClientRect();
    s.x = r.left + r.width / 2;
    s.y = r.top + r.height / 2;
    s.w = r.width;
    s.h = r.height;
  }

  // ---------- Ablauf ----------

  function vorbereiten(slot, flip) {
    if (!hinten) {
      hinten = $('fx-hinten');
      vorne = $('fx-vorne');
      gh = hinten.getContext('2d');
      gv = vorne.getContext('2d');
    }
    s = {
      slot, flip,
      modus: 'ahnung', t0: jetzt(), stufe: 0, stufen: [], ende: 0, rang: 0,
      glut: 0, glutGross: 0, dunkel: 0, strahlen: 0, winkel: Math.random() * 6.3, drehen: 0.3,
      blitz: 0, blitzVorne: 0, sicht: 1, quelle: 0, hebung: 0, pop: null, steuertKarte: false,
      teile: [], ringe: [], funken: [], konfetti: [],
      x: 0, y: 0, w: 0, h: 0,
    };
    if (laeuft) return;
    laeuft = true;
    letzte = jetzt();
    requestAnimationFrame(bild);
  }

  // Nach dem Tippen: gibt zurück, nach wie vielen ms die Karte umdrehen soll
  function aufladen(seltenheit) {
    if (!s) return 0;
    const bis = Math.max(0, FOLGE.indexOf(seltenheit));
    s.modus = 'laden';
    s.t0 = jetzt();
    s.stufe = 0;
    s.rang = bis;
    if (ruhig.matches) {
      s.stufe = bis;
      s.ende = 0.3;
      return 300;
    }
    // Zeitpunkte, an denen die Farbe eine Stufe höher springt
    s.stufen = Array.from({ length: bis }, (_, i) => (ERSTE + i * STUFE) / 1000);
    s.ende = (ERSTE + bis * STUFE) / 1000;
    s.steuertKarte = true;
    s.flip.style.transition = 'none';
    Gefuehl.ton('laden', s.ende);
    Gefuehl.vibriere(20);
    return s.ende * 1000;
  }

  // Die Farbe springt eine Stufe höher: Druckwelle, Lichtstoss, heller Ton
  function naechsteStufe() {
    s.stufe += 1;
    const farben = farbenVon(s.stufe);
    ring(farben[0], 0, 0.6, Math.max(s.w, s.h) * 1.15, 10);
    s.blitz = 0.22;
    for (let i = 0; i < 16; i++) sog(farben, 0.25, 0.45);
    Gefuehl.ton('stufe', s.stufe);
    Gefuehl.vibriere(35);
  }

  // Die Vorderseite ist da
  function knall(seltenheit) {
    if (!s) return;
    const rang = Math.max(0, FOLGE.indexOf(seltenheit));
    const farben = FARBEN[seltenheit];
    s.modus = 'glanz';
    s.t0 = jetzt();
    s.stufe = rang;
    s.rang = rang;
    s.teile = s.teile.filter((t) => t.art !== 'sog');
    if (ruhig.matches) return;
    s.blitz = BLITZ[rang];
    s.blitzVorne = BLITZ[rang] * 0.8;
    s.strahlen = 0.2;
    s.glutGross = 0.45;
    const gross = Math.max(s.w, s.h);
    for (let i = 0; i <= Math.min(rang, 2); i++) ring(farben[i % farben.length], i * 0.13, 0.75 + i * 0.1, gross * (1.7 + i * 0.25), 16);
    for (let i = 0; i < FUNKEN[rang]; i++) funke(farben);
    for (let i = 0; i < KONFETTI[rang]; i++) konfetto(farben);
    s.pop = { t0: s.t0, hebung: s.hebung };
  }

  // Finger auf der Karte: das Skript lässt die Karte los (Wischen hat Vorrang)
  function halt() {
    if (s && s.modus === 'glanz') {
      s.pop = null;
      s.steuertKarte = false;
    }
  }

  // Karte weg oder Fenster zu: kurz ausblenden (sofort: gleich aufhören)
  function beenden(sofort = false) {
    if (!s) return;
    s.pop = null;
    s.steuertKarte = false;
    s.modus = 'aus';
    if (sofort) stoppe();
  }

  function stoppe() {
    laeuft = false;
    s = null;
    if (!hinten) return;
    // Speicher freigeben, bis die nächste besondere Karte kommt
    [hinten, vorne].forEach((c) => { c.width = 0; c.height = 0; });
    breite = 0;
    hoehe = 0;
    vorneBenutzt = false;
  }

  // ---------- Teilchen ----------

  // Lichtpunkt, der von aussen in die Karte gesogen wird
  function sog(farben, minDauer = 0.5, maxDauer = 0.85) {
    const w = Math.random() * Math.PI * 2;
    const weite = zufall(30, 130);
    s.teile.push({
      art: 'sog', t0: jetzt(), dauer: zufall(minDauer, maxDauer), farbe: wahl(farben), r: zufall(1.6, 3),
      dx: Math.cos(w) * (s.w * 0.55 + weite), dy: Math.sin(w) * (s.h * 0.55 + weite),
    });
  }

  // Lichtpunkt, der am Kartenrand langsam aufsteigt (Mythic: schneller, wie Glut)
  function schweben(farben, schnell = false) {
    const w = Math.random() * Math.PI * 2;
    s.teile.push({
      art: 'schweben', t0: jetzt(), dauer: zufall(1.5, 2.6), farbe: wahl(farben), r: zufall(1.4, 2.8),
      dx: Math.cos(w) * s.w * zufall(0.45, 0.7), dy: Math.sin(w) * s.h * zufall(0.4, 0.62),
      vy: schnell ? -zufall(60, 110) : -zufall(18, 45), phase: Math.random() * 6.3,
    });
  }

  function ring(farbe, warte, dauer, bis, dicke) {
    s.ringe.push({ t0: jetzt() + warte, dauer, farbe, von: Math.max(s.w, s.h) * 0.42, bis, dicke });
  }

  // Funke, der aus der Karte schiesst und mit Schweif nach unten fällt
  function funke(farben) {
    const w = Math.random() * Math.PI * 2;
    const v = zufall(260, 760);
    s.funken.push({
      t0: jetzt(), dauer: zufall(0.6, 1.15), farbe: wahl(farben),
      x: s.x + Math.cos(w) * s.w * 0.2, y: s.y + Math.sin(w) * s.h * 0.2, vx: Math.cos(w) * v, vy: Math.sin(w) * v - 120,
    });
  }

  // Konfetti aus einer Kanone hinter der Karte: steigt hoch und flattert herab
  function konfetto(farben) {
    s.konfetti.push({
      t0: jetzt() + zufall(0, 0.25), farbe: wahl(farben),
      x: s.x + zufall(-s.w, s.w) * 0.3, y: s.y - s.h * 0.1,
      vx: zufall(-420, 420), vy: -zufall(520, 1050),
      dreh: Math.random() * 6.3, vdreh: zufall(-9, 9), kipp: Math.random() * 6.3, vkipp: zufall(5, 13),
      b: zufall(7, 11), h: zufall(10, 15), phase: Math.random() * 6.3,
    });
  }

  // ---------- Bild für Bild ----------

  function bild() {
    if (!laeuft) return;
    const t = jetzt();
    const dt = Math.min(0.05, t - letzte);
    letzte = t;
    if (!s || $('opener').hidden || !s.slot.isConnected) {
      stoppe();
      return;
    }
    groesse();
    messe();
    rechne(t, dt);
    if (!laeuft) return;
    male(t);
    requestAnimationFrame(bild);
  }

  function rechne(t, dt) {
    const e = t - s.t0;
    const ganz = !ruhig.matches;
    let glut = 0;
    let gross = 0;
    let dunkel = 0;
    let strahlen = 0;
    let quelle = 0; // neue Lichtpunkte pro Sekunde

    if (s.modus === 'ahnung') {
      glut = 0.6 + 0.18 * Math.sin(t * 2.4);
      gross = 0.05;
      quelle = 4;
    } else if (s.modus === 'laden') {
      while (s.stufe < s.stufen.length && e >= s.stufen[s.stufe]) naechsteStufe();
      const q = Math.min(1, e / s.ende);
      glut = 0.85 + 0.15 * s.stufe + 0.25 * q;
      gross = 0.1 + 0.1 * s.stufe + 0.15 * q;
      dunkel = 0.2 + 0.35 * q;
      strahlen = s.stufe ? 0.12 + 0.1 * s.stufe : 0;
      s.drehen = 0.4 + 0.35 * s.stufe;
      quelle = 26 + 16 * s.stufe;
      if (s.steuertKarte && ganz) zittern(e, q);
    } else if (s.modus === 'glanz') {
      glut = 0.9 + 0.15 * Math.sin(e * 2.6);
      gross = 0.3 + 0.05 * Math.sin(e * 2.6);
      dunkel = 0.35;
      strahlen = s.rang ? 0.7 : 0.45;
      s.drehen = nach(s.drehen, 0.22, 1.5, dt);
      quelle = SCHWEBEN[s.rang];
      if (s.pop) pop(e);
    } else {
      s.sicht -= dt / 0.25;
      if (s.sicht <= 0) {
        stoppe();
        return;
      }
    }

    if (s.modus !== 'aus') {
      s.glut = nach(s.glut, glut, s.modus === 'glanz' ? 3 : 5, dt);
      s.glutGross = nach(s.glutGross, gross, 3, dt);
      s.dunkel = nach(s.dunkel, dunkel, 3, dt);
      s.strahlen = nach(s.strahlen, strahlen, s.modus === 'glanz' ? 2.5 : 3, dt);
    }
    s.winkel += s.drehen * dt;
    s.blitz *= 0.0004 ** dt;
    s.blitzVorne *= 0.0002 ** dt;

    // neue Lichtpunkte
    if (ganz && s.modus !== 'aus') {
      s.quelle += quelle * dt;
      const farben = s.modus === 'glanz' ? FARBEN[FOLGE[s.rang]] : farbenVon(s.stufe);
      while (s.quelle >= 1) {
        s.quelle -= 1;
        if (s.modus === 'laden') sog(farben);
        else schweben(farben, s.modus === 'glanz' && s.rang === 1);
      }
    }
    s.teile = s.teile.filter((p) => t - p.t0 < p.dauer);
    s.ringe = s.ringe.filter((r) => t - r.t0 < r.dauer);

    // Funken: Luftwiderstand und Schwerkraft
    s.funken = s.funken.filter((f) => t - f.t0 < f.dauer);
    const bremse = 0.2 ** dt;
    s.funken.forEach((f) => {
      f.vx *= bremse;
      f.vy = f.vy * bremse + 900 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    });

    // Konfetti: steigt hoch, wird von der Luft gebremst und flattert hin und her nach unten
    const luft = 0.08 ** dt;
    s.konfetti = s.konfetti.filter((k) => k.y < hoehe + 30 && t - k.t0 < 7);
    s.konfetti.forEach((k) => {
      if (t < k.t0) return;
      const alter = t - k.t0;
      k.vx = k.vx * luft + Math.sin(alter * 5 + k.phase) * 160 * dt;
      k.vy = k.vy * luft + 700 * dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.dreh += k.vdreh * dt;
      k.kipp += k.vkipp * dt;
    });
  }

  // Aufladen: die Karte hebt sich und zittert, je höher die Stufe, desto stärker.
  // Kurz vor dem Umdrehen zieht sie sich zusammen (Luft holen).
  function zittern(e, q) {
    const n = s.stufe;
    const luftholen = Math.max(0, Math.min(1, (e - (s.ende - 0.22)) / 0.22));
    s.hebung = -(10 + 3 * n) * raus(Math.min(1, e / 0.3));
    const groesser = 1.04 + 0.015 * n - 0.05 * luftholen;
    const staerke = (0.4 + 0.35 * n + 0.6 * q) * (1 + 0.5 * luftholen);
    const drehung = (Math.sin(e * 47) * 0.6 + Math.sin(e * 71) * 0.4) * staerke;
    const x = Math.sin(e * 59) * staerke * 0.8;
    const y = Math.cos(e * 53) * staerke * 0.6;
    s.flip.style.transform = `translate(${x.toFixed(2)}px,${(s.hebung + y).toFixed(2)}px) rotate(${drehung.toFixed(2)}deg) scale(${groesser.toFixed(3)})`;
  }

  // Nach dem Knall: die Karte springt nach vorne und federt zurück an ihren Platz
  function pop(e) {
    const p = Math.min(1, e / 0.7);
    let groesse;
    if (p < 0.16) groesse = 0.97 + 0.17 * raus(p / 0.16);
    else {
      const x = (p - 0.16) / 0.84;
      groesse = 1 + 0.14 * Math.exp(-5 * x) * Math.cos(9 * x);
    }
    const hebung = s.pop.hebung * (1 - raus(p));
    s.flip.style.transform = `translateY(${hebung.toFixed(2)}px) scale(${groesse.toFixed(3)})`;
    if (p >= 1) {
      s.flip.style.transform = '';
      s.flip.style.transition = '';
      s.pop = null;
      s.steuertKarte = false;
    }
  }

  // ---------- Malen ----------

  function male(t) {
    const g = gh;
    const sicht = s.sicht;
    const gross = Math.max(s.w, s.h);
    const farbe = s.modus === 'glanz' || s.modus === 'aus' ? FOLGE[s.rang] : FOLGE[s.stufe];
    g.clearRect(0, 0, breite, hoehe);
    if (s.dunkel > 0.01) {
      g.fillStyle = `rgba(2,4,9,${(s.dunkel * sicht).toFixed(3)})`;
      g.fillRect(0, 0, breite, hoehe);
    }
    g.globalCompositeOperation = 'lighter';
    if (s.strahlen > 0.01) strahlenKranz(g, gross * 1.3, farbe, s.strahlen * sicht);
    if (s.glut > 0.01) glut(g, gross * (0.78 + s.glutGross), farbe, s.glut * sicht, t);
    s.ringe.forEach((r) => {
      const p = (t - r.t0) / r.dauer;
      if (p < 0) return;
      const radius = r.von + (r.bis - r.von) * raus(p);
      const a = (1 - p) ** 1.5 * sicht;
      const f = farbe === 'special' ? FARBEN.special[Math.floor(p * 10) % 5] : r.farbe;
      g.beginPath();
      g.arc(s.x, s.y, radius, 0, Math.PI * 2);
      g.lineWidth = r.dicke * 2.6 * (1 - p * 0.6);
      g.strokeStyle = rgba(f, a * 0.25);
      g.stroke();
      g.lineWidth = r.dicke * 0.55 * (1 - p * 0.7);
      g.strokeStyle = rgba('#ffffff', a * 0.85);
      g.stroke();
    });
    s.teile.forEach((p) => {
      const alter = t - p.t0;
      const q = alter / p.dauer;
      let x;
      let y;
      let a;
      if (p.art === 'sog') {
        const k = 1 - rein(q);
        x = s.x + p.dx * k;
        y = s.y + p.dy * k;
        a = Math.min(1, q / 0.2);
      } else {
        x = s.x + p.dx + Math.sin(p.phase + alter * 2) * 6;
        y = s.y + p.dy + p.vy * alter;
        a = Math.sin(Math.PI * q);
      }
      a *= sicht;
      g.fillStyle = rgba(p.farbe, a * 0.3);
      g.beginPath();
      g.arc(x, y, p.r * 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = rgba('#ffffff', a * 0.9);
      g.beginPath();
      g.arc(x, y, p.r, 0, Math.PI * 2);
      g.fill();
    });
    if (s.blitz > 0.01) {
      g.fillStyle = `rgba(255,255,255,${(s.blitz * sicht).toFixed(3)})`;
      g.fillRect(0, 0, breite, hoehe);
    }
    g.globalCompositeOperation = 'source-over';

    // vorne: nur zeichnen, wenn dort etwas ist (oder eben noch war)
    const vorneJetzt = s.funken.length > 0 || s.konfetti.length > 0 || s.blitzVorne > 0.01;
    if (!vorneJetzt && !vorneBenutzt) return;
    vorneBenutzt = vorneJetzt;
    const v = gv;
    v.clearRect(0, 0, breite, hoehe);
    if (s.blitzVorne > 0.01) {
      const r = gross * 1.1;
      const verlauf = v.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      verlauf.addColorStop(0, `rgba(255,255,255,${(s.blitzVorne * sicht).toFixed(3)})`);
      verlauf.addColorStop(1, 'rgba(255,255,255,0)');
      v.fillStyle = verlauf;
      v.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    }
    v.globalCompositeOperation = 'lighter';
    v.lineCap = 'round';
    s.funken.forEach((f) => {
      const a = (1 - (t - f.t0) / f.dauer) * sicht;
      v.lineWidth = 2.4;
      v.strokeStyle = rgba(f.farbe, a);
      v.beginPath();
      v.moveTo(f.x - f.vx * 0.03, f.y - f.vy * 0.03);
      v.lineTo(f.x, f.y);
      v.stroke();
    });
    v.globalCompositeOperation = 'source-over';
    // Konfetti: jedes Stück dreht sich und kippt (die Höhe schrumpft mit dem Kippen, das sieht nach 3D aus)
    s.konfetti.forEach((k) => {
      if (t < k.t0) return;
      const c = Math.cos(k.dreh);
      const sn = Math.sin(k.dreh);
      const kipp = Math.cos(k.kipp);
      v.setTransform(dpr * c, dpr * sn, -dpr * sn * kipp, dpr * c * kipp, dpr * k.x, dpr * k.y);
      v.fillStyle = rgba(k.farbe, sicht * (0.75 + 0.25 * Math.abs(kipp)));
      v.fillRect(-k.b / 2, -k.h / 2, k.b, k.h);
    });
    v.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Leuchten hinter der Karte. Special: fünf Farbflecken, die um die Karte kreisen.
  function glut(g, r, farbe, a, t) {
    if (farbe === 'special') {
      FARBEN.special.forEach((f, i) => {
        const w = t * 1.3 + i * (Math.PI * 2 / 5);
        fleck(g, s.x + Math.cos(w) * r * 0.3, s.y + Math.sin(w) * r * 0.3, r * 0.75, f, a * 0.6);
      });
      return;
    }
    fleck(g, s.x, s.y, r, FARBEN[farbe][0], a);
  }

  function fleck(g, x, y, r, farbe, a) {
    const v = g.createRadialGradient(x, y, 0, x, y, r);
    v.addColorStop(0, rgba(farbe, a));
    v.addColorStop(0.5, rgba(farbe, a * 0.6));
    v.addColorStop(1, rgba(farbe, 0));
    g.fillStyle = v;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Strahlenkranz: 16 Strahlen, abwechselnd lang und kurz, die nach aussen durchsichtig werden
  function strahlenKranz(g, laenge, farbe, a) {
    const farben = farbe === 'special' ? FARBEN.special : [FARBEN[farbe][0]];
    const verlaeufe = farben.map((f) => {
      const v = g.createRadialGradient(0, 0, 0, 0, 0, laenge);
      v.addColorStop(0, rgba(f, a * 0.7));
      v.addColorStop(0.45, rgba(f, a * 0.3));
      v.addColorStop(1, rgba(f, 0));
      return v;
    });
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.winkel);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const w0 = (i / n) * Math.PI * 2;
      const w1 = w0 + 0.13;
      const l = i % 2 ? laenge * 0.72 : laenge;
      g.fillStyle = verlaeufe[i % verlaeufe.length];
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(w0) * l, Math.sin(w0) * l);
      g.lineTo(Math.cos(w1) * l, Math.sin(w1) * l);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  return { vorbereiten, aufladen, knall, halt, beenden };
})();
