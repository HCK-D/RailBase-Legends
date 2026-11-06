/*
 * Shop: Chancen der Packs (für alle) und Käufe mit echtem Geld (nur in der Handy-App).
 *
 * Die Handy-App (Ordner railbase-legends-app, Expo) zeigt dieses Spiel in einer WebView und stellt
 * window.RailBaseApp bereit: kaufe(id) und preise([ids]) laufen dort über RevenueCat (App Store / Google Play).
 * Auf der Webseite gibt es kein window.RailBaseApp: dann bleibt der Shop wie bisher (nur RB Coins und Rubine).
 *
 * ECHTGELD_PRODUKTE: Produkt-IDs wie im App Store / Google Play / RevenueCat und was man dafür bekommt.
 * Die Mengen sind PLATZHALTER (legt der Besitzer fest). Die Preise stehen NICHT hier, sie kommen aus dem Store
 * (in der Landeswährung, z. B. «CHF 2.00»).
 *
 * Gutschrift im Spielstand (app.daten): Packs in den Vorrat, Rubine und RB Coins aufs Guthaben, dazu ein
 * Eintrag in app.daten.kaeufe. Später sollte der Server jeden Kauf bestätigen (RevenueCat-Webhook → Supabase).
 */

const ECHTGELD_PRODUKTE = [
  // ein Pack in den Vorrat (gleiche Packs wie im Shop)
  { id: 'rbl_pack_standard', art: 'pack', pack: 'standard', menge: 1 },
  { id: 'rbl_pack_silber', art: 'pack', pack: 'silber-1', menge: 1 },
  { id: 'rbl_pack_gold', art: 'pack', pack: 'gold-1', menge: 1 },
  { id: 'rbl_pack_platin', art: 'pack', pack: 'platin-1', menge: 1 },
  // Rubin-Coins (Platzhalter-Mengen)
  { id: 'rbl_rubine_10', art: 'rubine', menge: 10 },
  { id: 'rbl_rubine_50', art: 'rubine', menge: 50 },
  { id: 'rbl_rubine_120', art: 'rubine', menge: 120 },
  // RB Coins (Platzhalter-Mengen)
  { id: 'rbl_coins_500', art: 'muenzen', menge: 500 },
  { id: 'rbl_coins_1500', art: 'muenzen', menge: 1500 },
  { id: 'rbl_coins_4000', art: 'muenzen', menge: 4000 },
];

const Echtgeld = (() => {
  let preise = {};       // { produkt-id: 'CHF 2.00' } aus dem Store
  let laeuft = false;    // gerade ein Kauf offen (Knöpfe gesperrt)
  let gebaut = false;

  const inApp = () => typeof window.RailBaseApp === 'object' && window.RailBaseApp !== null;
  const produkt = (id) => ECHTGELD_PRODUKTE.find((p) => p.id === id);
  const MUENZ_BILD = { rubine: 'assets/muenzen/rubin-rund.png', muenzen: 'assets/muenzen/gold-rund.png' };
  const NAME = { rubine: 'Rubin-Coins', muenzen: 'RB Coins' };

  // ---------- Chancen (für alle, auch auf der Webseite) ----------

  // Chancen einer Pack-Stufe pro Karte in Prozent (KARTEN_CHANCEN in js/karten.js)
  function chancenHtml(stufe) {
    const werte = KARTEN_CHANCEN[stufe] || KARTEN_CHANCEN.standard;
    const summe = werte.reduce((a, b) => a + b, 0) || 1;
    const zeilen = SELTENHEITEN.map((s, i) => {
      const prozent = (werte[i] / summe) * 100;
      return `<li class="rar-${s.id}"><span class="sc-stein" aria-hidden="true"></span><span>${s.name}</span>
        <b>${prozent ? `${prozent.toLocaleString('de-CH', { maximumFractionDigits: 1 })} %` : '–'}</b></li>`;
    }).join('');
    return `<details class="shop-chancen"><summary>Chancen ansehen</summary>
      <p>Pro Karte, ${KARTEN_PRO_PACK} Karten pro Pack. Doppelte Karten sind möglich. Die ersten vier geöffneten Packs haben einen Anfängerbonus.</p>
      <ul>${zeilen}</ul></details>`;
  }

  function baueChancen() {
    document.querySelectorAll('#shop-liste li[data-stufe]').forEach((li) => {
      if (li.querySelector('.shop-chancen')) return;
      li.querySelector('.shop-text').insertAdjacentHTML('beforeend', chancenHtml(li.dataset.stufe));
    });
  }

  // ---------- Käufe mit echtem Geld (nur in der App) ----------

  function baueEchtgeld() {
    if (gebaut || !inApp()) return;
    gebaut = true;
    document.documentElement.classList.add('in-app');
    // zweiter Knopf bei jedem Pack
    ECHTGELD_PRODUKTE.filter((p) => p.art === 'pack').forEach((p) => {
      const knopf = document.querySelector(`#shop-liste [data-kaufen="${p.pack}"]`);
      if (!knopf) return;
      knopf.insertAdjacentHTML('afterend', `<button class="btn btn-echtgeld" type="button" data-echtgeld="${p.id}" aria-label="Mit Geld kaufen">…</button>`);
    });
    // eigener Bereich für Rubine und RB Coins
    const pakete = ECHTGELD_PRODUKTE.filter((p) => p.art !== 'pack');
    $('shop-liste').insertAdjacentHTML('afterend', `
      <section class="shop-echtgeld" aria-labelledby="se-titel">
        <h2 id="se-titel">Mit echtem Geld</h2>
        <p class="se-info">Bezahlt wird über den ${window.RailBaseApp.plattform === 'ios' ? 'App Store' : 'Google Play Store'}. Der Kauf landet sofort in deinem Spielstand.</p>
        <ul class="shop-liste se-liste">
          ${pakete.map((p) => `
            <li class="se-paket">
              <img class="muenze" src="${MUENZ_BILD[p.art]}" alt="" draggable="false">
              <div class="shop-text">
                <b>${tausender(p.menge)} ${NAME[p.art]}</b>
                <div class="shop-kauf"><button class="btn btn-echtgeld" type="button" data-echtgeld="${p.id}">…</button></div>
              </div>
            </li>`).join('')}
        </ul>
      </section>`);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-echtgeld]');
      if (b && !b.disabled) kaufe(b.dataset.echtgeld);
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

  // Knöpfe: Preis aus dem Store, sonst «Kaufen»; gesperrt, solange ein Kauf läuft
  function zeichne() {
    if (!gebaut) return;
    document.querySelectorAll('[data-echtgeld]').forEach((b) => {
      const p = produkt(b.dataset.echtgeld);
      const preis = preise[b.dataset.echtgeld];
      b.textContent = preis && preis !== 'Test' ? preis : preis === 'Test' ? 'Test-Kauf' : 'Kaufen';
      b.disabled = laeuft;
      const was = p.art === 'pack' ? `1 ${packVonId(p.pack).titel} Pack` : `${tausender(p.menge)} ${NAME[p.art]}`;
      b.setAttribute('aria-label', `${was} mit Geld kaufen${preis && preis !== 'Test' ? ` für ${preis}` : ''}`);
    });
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
      text = `+${tausender(p.menge)} ${NAME[p.art]}`;
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

  function init() {
    baueChancen();
    // Die App stellt RailBaseApp vor dem Laden bereit; zur Sicherheit auch auf das Ereignis hören
    if (inApp()) baueEchtgeld();
    else window.addEventListener('railbaseapp', baueEchtgeld, { once: true });
  }

  return { init, zeichne };
})();
