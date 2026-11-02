/*
 * Kurze Einführung für neue Spieler: Packs und Karten, Glücksrad, Album.
 * Kommt einmal nach dem Willkommens-Fenster (js/app.js) und lässt sich unter Mehr → Kurze Einführung wiederholen.
 * Jeder Schritt zeigt mit einem hellen Rahmen auf den echten Knopf im Menü (Handy unten, Computer oben),
 * die Sprechblase steht daneben. Der Schritt «Karten» zeigt zwei Beispiel-Karten. Aussehen: css/einfuehrung.css.
 */

const EINFUEHRUNG = [
  {
    ziel: '.tabbar [data-tab="start"]',
    titel: 'Packs öffnen',
    text: 'Auf der Startseite öffnest du Packs: Tippe auf das Pack in der Mitte. In jedem Pack stecken 5 Karten, und jeden Tag gibt es ein Gratis-Pack.',
  },
  {
    karten: ['RB095', 'RB079'],
    titel: 'Deine Karten',
    text: 'Jede Karte ist ein echtes Schweizer Fahrzeug. Die Farbe zeigt, wie selten sie ist: von Common (grau) bis Legendary (gold). Seltene Karten glänzen und bringen mehr XP.',
  },
  {
    ziel: '.tabbar [data-tab="rad"]',
    titel: 'Glücksrad',
    text: 'Einmal pro Tag drehst du gratis und gewinnst Coins oder ein Pack. Nach je 30 Drehungen gibt es ein Gold-Pack dazu.',
  },
  {
    ziel: '.tabbar [data-tab="album"]',
    titel: 'Dein Album',
    text: 'Hier sind alle Karten. Gesammelte sind farbig, fehlende grau. Doppelte kannst du verwerten oder mit Freunden tauschen.',
  },
  {
    titel: 'Los geht’s!',
    text: 'Dein Gratis-Pack wartet schon auf der Startseite. Viel Spass beim Sammeln!',
  },
];

const Einfuehrung = (() => {
  let schritt = 0;
  let danach = null; // wird nach dem letzten Schritt aufgerufen (z. B. Tagesbelohnung)

  const offen = () => !$('einfuehrung').hidden;

  function starte(weiter = null) {
    danach = weiter;
    schritt = 0;
    if (location.hash.replace('#', '') !== 'start') location.hash = 'start';
    $('einfuehrung').hidden = false;
    document.body.classList.add('op-offen', 'einfuehrung-laeuft');
    Gefuehl.ton('auf');
    // kurz warten, bis die Startseite steht, dann den ersten Schritt zeigen
    setTimeout(zeige, 250);
  }

  function zeige() {
    if (!offen()) return;
    const s = EINFUEHRUNG[schritt];
    const letzter = schritt === EINFUEHRUNG.length - 1;
    $('ef-titel').textContent = s.titel;
    $('ef-text').textContent = s.text;
    $('ef-karten').innerHTML = (s.karten || []).filter((id) => karteVonId(id))
      .map((id) => `<div class="ef-karte">${karteHtml(id)}</div>`).join('');
    $('ef-karten').hidden = !s.karten;
    $('ef-weiter').textContent = letzter ? 'Los geht’s' : 'Weiter';
    $('ef-ueberspringen').hidden = letzter;
    $('ef-punkte').innerHTML = EINFUEHRUNG.map((x, i) => `<i class="${i === schritt ? 'an' : ''}"></i>`).join('');
    const blase = $('ef-blase');
    blase.classList.remove('rein');
    void blase.offsetWidth;
    blase.classList.add('rein');
    platziere();
  }

  // Heller Rahmen um den Knopf im Menü, Sprechblase darüber (Menü unten) oder darunter (Menü oben)
  function platziere() {
    if (!offen()) return;
    const s = EINFUEHRUNG[schritt];
    const ziel = s.ziel && document.querySelector(s.ziel);
    const spot = $('ef-spot');
    const blase = $('ef-blase');
    // der runde Start-Knopf ragt auf dem Handy über den Menü-Balken hinaus: Rahmen um beides
    const teile = ziel ? [ziel, ...ziel.querySelectorAll('.nav-rund')].map((el) => el.getBoundingClientRect()).filter((q) => q.width) : [];
    const r = teile.length ? {
      left: Math.min(...teile.map((q) => q.left)),
      top: Math.min(...teile.map((q) => q.top)),
      right: Math.max(...teile.map((q) => q.right)),
      bottom: Math.max(...teile.map((q) => q.bottom)),
    } : null;
    if (r) {
      r.width = r.right - r.left;
      r.height = r.bottom - r.top;
    }
    $('einfuehrung').classList.toggle('dunkel', !r || !r.width);
    if (!r || !r.width) {
      spot.hidden = true;
      blase.classList.add('mitte');
      blase.style.left = '';
      blase.style.top = '';
      return;
    }
    const rand = 6;
    spot.hidden = false;
    spot.style.left = `${r.left - rand}px`;
    spot.style.top = `${r.top - rand}px`;
    spot.style.width = `${r.width + rand * 2}px`;
    spot.style.height = `${r.height + rand * 2}px`;
    blase.classList.remove('mitte');
    const b = blase.getBoundingClientRect();
    const mitte = r.left + r.width / 2;
    const links = Math.min(Math.max(12, mitte - b.width / 2), innerWidth - b.width - 12);
    const unten = r.top > innerHeight / 2;
    blase.style.left = `${links}px`;
    blase.style.top = `${unten ? r.top - rand - 16 - b.height : r.bottom + rand + 16}px`;
    blase.dataset.pfeil = unten ? 'unten' : 'oben';
    blase.style.setProperty('--pfeil-x', `${Math.round(mitte - links)}px`);
  }

  function weiter() {
    Gefuehl.ton('tick');
    if (schritt < EINFUEHRUNG.length - 1) {
      schritt += 1;
      zeige();
    } else {
      beende();
    }
  }

  function beende() {
    if (!offen()) return;
    $('einfuehrung').hidden = true;
    document.body.classList.remove('op-offen', 'einfuehrung-laeuft');
    app.daten.einfuehrung = true;
    speichern();
    aktualisiereAlles();
    const fn = danach;
    danach = null;
    if (fn) setTimeout(fn, 500);
  }

  function init() {
    $('ef-weiter').addEventListener('click', weiter);
    $('ef-ueberspringen').addEventListener('click', beende);
    $('einfuehrung-knopf').addEventListener('click', (e) => {
      e.preventDefault();
      starte();
    });
    window.addEventListener('resize', platziere);
    document.addEventListener('keydown', (e) => {
      if (!offen()) return;
      if (e.key === 'Escape') beende();
      if (e.key === 'ArrowRight') weiter();
    });
  }

  return { init, starte, offen };
})();
