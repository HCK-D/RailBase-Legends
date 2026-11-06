/*
 * Shop: Käufe mit echtem Geld (nur in der Handy-App) und die Seite «Regeln und Chancen» (unter Mehr).
 *
 * Die Handy-App (Ordner railbase-legends-app, Expo) zeigt dieses Spiel in einer WebView und stellt
 * window.RailBaseApp bereit: kaufe(id) und preise([ids]) laufen dort über RevenueCat (App Store / Google Play).
 * Auf der Webseite gibt es kein window.RailBaseApp: dann bleibt der Shop wie bisher (nur RB Coins und Rubine).
 *
 * In der App:
 *  - Packs: neben «Kaufen» (Coins) ein grüner Knopf mit dem Preis in Geld. Vor dem Kauf eine kurze Rückfrage.
 *  - Rubin-Coins und RB Coins: grüner Knopf «Kaufen» öffnet ein Fenster, dort wählt man das Paket.
 *
 * CHANCEN_ZEIGEN: Der Besitzer will die Chancen nirgends zeigen (06.11.2026), darum aus.
 * Achtung: Apple und Google verlangen, dass die Chancen von Zufalls-Packs vor einem Kauf mit Geld einsehbar sind.
 * Vor dem Einreichen im App Store / Play Store auf true stellen, dann gibt es wieder Mehr → «Regeln und Chancen»
 * und den kleinen Link «Chancen» in der Rückfrage.
 *
 * ECHTGELD_PRODUKTE: Produkt-IDs wie im App Store / Google Play / RevenueCat und was man dafür bekommt.
 * Mengen und Preise legt der Besitzer fest (Stand 06.11.2026). Der echte Preis kommt aus dem Store;
 * `preis` ist nur der geplante Preis zum Einrichten im Store und für den Test-Modus (?app-test).
 * Gutschrift: Packs in den Vorrat, Rubine und RB Coins aufs Guthaben, Eintrag in app.daten.kaeufe.
 * Später sollte der Server jeden Kauf bestätigen (RevenueCat-Webhook → Supabase).
 */

const ECHTGELD_PRODUKTE = [
  // ein Pack in den Vorrat (gleiche Packs wie im Shop)
  { id: 'rbl_pack_standard', art: 'pack', pack: 'standard', menge: 1, preis: 'CHF 0.69' },
  { id: 'rbl_pack_silber', art: 'pack', pack: 'silber-1', menge: 1, preis: 'CHF 1.50' },
  { id: 'rbl_pack_gold', art: 'pack', pack: 'gold-1', menge: 1, preis: 'CHF 3.50' },
  { id: 'rbl_pack_platin', art: 'pack', pack: 'platin-1', menge: 1, preis: 'CHF 20.00' },
  // Rubin-Coins
  { id: 'rbl_rubin_1', art: 'rubine', menge: 1, preis: 'CHF 0.80' },
  { id: 'rbl_rubin_5', art: 'rubine', menge: 5, preis: 'CHF 4.00' },
  { id: 'rbl_rubin_10', art: 'rubine', menge: 10, preis: 'CHF 8.00' },
  { id: 'rbl_rubin_25', art: 'rubine', menge: 25, preis: 'CHF 20.00' },
  { id: 'rbl_rubin_50', art: 'rubine', menge: 50, preis: 'CHF 40.00' },
  // RB Coins
  { id: 'rbl_coins_500', art: 'muenzen', menge: 500, preis: 'CHF 5.00' },
  { id: 'rbl_coins_1500', art: 'muenzen', menge: 1500, preis: 'CHF 15.00' },
  { id: 'rbl_coins_4000', art: 'muenzen', menge: 4000, preis: 'CHF 40.00' },
];

const CHANCEN_ZEIGEN = false;

const Echtgeld = (() => {
  let preise = {};       // { produkt-id: 'CHF 2.00' } aus dem Store
  let laeuft = false;    // gerade ein Kauf offen (Knöpfe gesperrt)
  let gebaut = false;

  const inApp = () => typeof window.RailBaseApp === 'object' && window.RailBaseApp !== null;
  const produkt = (id) => ECHTGELD_PRODUKTE.find((p) => p.id === id);
  const MUENZ_BILD = { rubine: 'assets/muenzen/rubin-rund.png', muenzen: 'assets/muenzen/gold-rund.png' };
  const NAME = { rubine: 'Rubin-Coins', muenzen: 'RB Coins' };
  // Einzahl/Mehrzahl: «1 Rubin-Coin», «2 Rubin-Coins»
  const mengeName = (art, menge) => (art === 'rubine' && menge === 1 ? 'Rubin-Coin' : NAME[art]);
  const preisText = (id) => {
    const p = preise[id];
    return p && p !== 'Test' ? p : p === 'Test' ? 'Test-Kauf' : 'Kaufen';
  };

  // ---------- Fenster (gleicher Aufbau wie die anderen Info-Fenster) ----------

  function fenster() {
    let f = $('se-fenster');
    if (f) return f;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="info-fenster se-fenster" id="se-fenster" hidden role="dialog" aria-modal="true" aria-labelledby="se-titel">
        <div class="info-box" id="se-box"></div>
      </div>`);
    f = $('se-fenster');
    f.addEventListener('click', (e) => {
      if (e.target === f || e.target.closest('[data-se="zu"]')) schliesse();
      const wahl = e.target.closest('[data-se-kauf]');
      if (wahl && !wahl.disabled) { schliesse(); kaufe(wahl.dataset.seKauf); }
      const chancen = e.target.closest('[data-se="chancen"]');
      if (chancen) {
        const liste = $('se-box').querySelector('.se-chancen');
        liste.hidden = !liste.hidden;
        chancen.setAttribute('aria-expanded', String(!liste.hidden));
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesse(); });
    return f;
  }

  function oeffne(html) {
    const f = fenster();
    $('se-box').innerHTML = html;
    f.hidden = false;
    document.body.classList.add('op-offen');
    const erster = $('se-box').querySelector('[data-se-kauf], button');
    if (erster) erster.focus({ preventScroll: true });
  }

  function schliesse() {
    const f = $('se-fenster');
    if (!f || f.hidden) return;
    f.hidden = true;
    document.body.classList.remove('op-offen');
  }

  // ---------- Chancen ----------

  // Chancen einer Pack-Stufe pro Karte in Prozent (KARTEN_CHANCEN in js/karten.js)
  function chancenListe(stufe) {
    const werte = KARTEN_CHANCEN[stufe] || KARTEN_CHANCEN.standard;
    const summe = werte.reduce((a, b) => a + b, 0) || 1;
    return `<ul class="se-chancen-liste">${SELTENHEITEN.map((s, i) => {
      const prozent = (werte[i] / summe) * 100;
      return `<li class="rar-${s.id}"><span class="sc-stein" aria-hidden="true"></span><span>${s.name}</span>
        <b>${prozent ? `${prozent.toLocaleString('de-CH', { maximumFractionDigits: 1 })} %` : '–'}</b></li>`;
    }).join('')}</ul>`;
  }

  const CHANCEN_REGEL = `Chance pro Karte, ${KARTEN_PRO_PACK} Karten pro Pack. Doppelte Karten sind möglich. Die ersten vier geöffneten Packs haben einen Anfängerbonus.`;

  // Mehr → «Regeln und Chancen»: alle Pack-Stufen
  function zeigeRegeln() {
    oeffne(`
      <h2 id="se-titel">Regeln und Chancen</h2>
      <p class="se-info">${CHANCEN_REGEL}</p>
      ${STUFEN.map((s) => `<section class="se-stufe"><b>${s.titel} Pack</b>${chancenListe(s.id)}</section>`).join('')}
      <button class="btn" type="button" data-se="zu">Schliessen</button>`);
  }

  // ---------- Käufe mit echtem Geld (nur in der App) ----------

  function baueEchtgeld() {
    if (gebaut || !inApp()) return;
    gebaut = true;
    document.documentElement.classList.add('in-app');
    // Packs: Geld-Knopf direkt neben «Kaufen»
    ECHTGELD_PRODUKTE.filter((p) => p.art === 'pack').forEach((p) => {
      const knopf = document.querySelector(`#shop-liste [data-kaufen="${p.pack}"]`);
      if (!knopf) return;
      knopf.insertAdjacentHTML('afterend', `<button class="btn btn-echtgeld" type="button" data-echtgeld-pack="${p.id}">Kaufen</button>`);
    });
    // Rubin-Coins: Geld-Knopf neben «1 kaufen»
    $('rubin-kaufen').insertAdjacentHTML('afterend', '<button class="btn btn-echtgeld" type="button" data-echtgeld-wahl="rubine" aria-label="Rubin-Coins mit echtem Geld kaufen">Kaufen</button>');
    // RB Coins: eigene Zeile unter den Rubin-Coins (gibt es nur mit Geld)
    $('rubin-liste').insertAdjacentHTML('beforeend', `
      <li class="shop-rubin se-coins">
        <img class="muenze" src="${MUENZ_BILD.muenzen}" alt="" draggable="false">
        <div class="shop-text">
          <b>RB Coins</b>
          <div class="shop-kauf"><span class="shop-preis"><span><small>3 Pakete zur Auswahl</small></span></span>
            <button class="btn btn-echtgeld" type="button" data-echtgeld-wahl="muenzen" aria-label="RB Coins mit echtem Geld kaufen">Kaufen</button></div>
        </div>
      </li>`);
    document.addEventListener('click', (e) => {
      const pack = e.target.closest('[data-echtgeld-pack]');
      if (pack && !pack.disabled) frageNachPack(pack.dataset.echtgeldPack);
      const wahl = e.target.closest('[data-echtgeld-wahl]');
      if (wahl && !wahl.disabled) zeigeWahl(wahl.dataset.echtgeldWahl);
    });
    ladePreise();
  }

  async function ladePreise() {
    try {
      preise = (await window.RailBaseApp.preise(ECHTGELD_PRODUKTE.map((p) => p.id))) || {};
    } catch (e) {
      preise = {};
    }
    zeichne();
  }

  // Pack mit Geld: kurze Rückfrage (mit CHANCEN_ZEIGEN darin klein der Link «Chancen»)
  function frageNachPack(id) {
    const p = produkt(id);
    const pack = packVonId(p.pack);
    const preis = preise[id] && preise[id] !== 'Test' ? ` für ${preise[id]}` : '';
    const chancen = CHANCEN_ZEIGEN ? `
      <button class="se-link" type="button" data-se="chancen" aria-expanded="false">Chancen</button>
      <div class="se-chancen" hidden><p class="se-info">${CHANCEN_REGEL}</p>${chancenListe(pack.stufe)}</div>` : '';
    oeffne(`
      <h2 id="se-titel">${pack.titel} Pack kaufen</h2>
      <p class="se-info">«${pack.name}»${preis}. Das Pack landet sofort in deinem Vorrat.</p>${chancen}
      <div class="se-knoepfe">
        <button class="btn ghost" type="button" data-se="zu">Abbrechen</button>
        <button class="btn btn-echtgeld" type="button" data-se-kauf="${id}">${preisText(id)}</button>
      </div>`);
  }

  // Rubin-Coins oder RB Coins: Paket auswählen
  function zeigeWahl(art) {
    const pakete = ECHTGELD_PRODUKTE.filter((p) => p.art === art);
    oeffne(`
      <h2 id="se-titel">${NAME[art]} kaufen</h2>
      <p class="se-info">Wähle ein Paket. Bezahlt wird über den ${window.RailBaseApp.plattform === 'ios' ? 'App Store' : 'Google Play Store'}.</p>
      <ul class="se-pakete">${pakete.map((p) => `
        <li><button class="se-paket" type="button" data-se-kauf="${p.id}">
          <img class="muenze" src="${MUENZ_BILD[art]}" alt="" aria-hidden="true">
          <span class="se-menge"><b>${tausender(p.menge)}</b><small>${mengeName(art, p.menge)}</small></span>
          <span class="se-preis">${preisText(p.id)}</span>
        </button></li>`).join('')}</ul>
      <button class="btn ghost" type="button" data-se="zu">Abbrechen</button>`);
  }

  // Knöpfe im Shop: Preis aus dem Store; gesperrt, solange ein Kauf läuft
  function zeichne() {
    if (!gebaut) return;
    document.querySelectorAll('[data-echtgeld-pack]').forEach((b) => {
      b.textContent = preisText(b.dataset.echtgeldPack);
      b.disabled = laeuft;
      const p = produkt(b.dataset.echtgeldPack);
      b.setAttribute('aria-label', `1 ${packVonId(p.pack).titel} Pack mit Geld kaufen`);
    });
    document.querySelectorAll('[data-echtgeld-wahl]').forEach((b) => { b.disabled = laeuft; });
  }

  async function kaufe(id) {
    const p = produkt(id);
    if (!p || laeuft) return;
    laeuft = true;
    zeichne();
    let ergebnis;
    try {
      ergebnis = await window.RailBaseApp.kaufe(id);
    } catch (e) {
      ergebnis = { ok: false, grund: 'fehler' };
    }
    laeuft = false;
    zeichne();
    if (ergebnis && ergebnis.ok) {
      schreibeGut(p, !!ergebnis.test);
    } else if (ergebnis && ergebnis.grund === 'nicht-eingerichtet') {
      zeigeHinweis('Käufe sind in dieser App-Version noch nicht eingerichtet.');
    } else if (ergebnis && ergebnis.grund === 'fehler') {
      zeigeHinweis('Der Kauf hat nicht geklappt. Es wurde nichts abgebucht.');
    }
  }

  function schreibeGut(p, test) {
    let text;
    if (p.art === 'pack') {
      app.daten.vorrat[p.pack] = vorratVon(p.pack) + p.menge;
      text = `${packVonId(p.pack).titel} Pack ist in deinem Vorrat.`;
    } else {
      app.daten[p.art] = (app.daten[p.art] || 0) + p.menge;
      text = `+${tausender(p.menge)} ${mengeName(p.art, p.menge)}`;
    }
    app.daten.kaeufe = [...(Array.isArray(app.daten.kaeufe) ? app.daten.kaeufe : []),
      { produkt: p.id, zeit: Date.now(), test }].slice(-100);
    speichern();
    Taeglich.zaehle('kauf');
    Erfolge.zaehle('gekauft');
    aktualisiereAlles();
    Gefuehl.ton('muenze');
    Gefuehl.vibriere([15, 40, 15]);
    zeigeHinweis(test ? `${text} (Test-Kauf)` : text);
  }

  // Vorschau am PC: mit «?app-test» in der Adresse so tun, als liefe das Spiel in der Handy-App
  // (Test-Käufe ohne Geld, Test-Preise). Nur auf dem eigenen PC (localhost), nie auf der Webseite.
  function vorschauTestApp() {
    const lokal = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!lokal || !new URLSearchParams(location.search).has('app-test') || inApp()) return;
    window.RailBaseApp = {
      plattform: 'android',
      // geplante Preise aus ECHTGELD_PRODUKTE (in der echten App kommen sie aus dem Store)
      preise: async (ids) => Object.fromEntries(ids.map((id) => [id, (produkt(id) || {}).preis || 'Test'])),
      kaufe: async (id) => ({ ok: true, produkt: id, test: true }),
    };
  }

  function init() {
    vorschauTestApp();
    const regeln = $('chancen-knopf');
    if (regeln && CHANCEN_ZEIGEN) {
      regeln.closest('li').hidden = false;
      regeln.addEventListener('click', (e) => { e.preventDefault(); zeigeRegeln(); });
    }
    // Die App stellt RailBaseApp vor dem Laden bereit; zur Sicherheit auch auf das Ereignis hören
    if (inApp()) baueEchtgeld();
    else window.addEventListener('railbaseapp', baueEchtgeld, { once: true });
  }

  return { init, zeichne };
})();
