/*
 * Online-Datenbank (Supabase): Anmelden, Spielstand online, Namen der Freunde, Geschenke, Grundlage fürs Tauschen.
 * Anmelden ist beim Start Pflicht: mit E-Mail und Passwort oder mit Google (Fenster #anmelden).
 * Der Spielstand bleibt zusätzlich im Browser (js/store.js), damit alles sofort geht; Online.merke() schickt ihn
 * kurz nach jeder Änderung online. Wer schon angemeldet war, spielt ohne Netz mit dem Spielstand auf dem Gerät weiter.
 * Tabellen, Regeln und Server-Funktionen: werkzeuge/datenbank.sql.
 */

const ONLINE = {
  url: 'https://ilxtsqfbsejrjgfxkxdf.supabase.co',
  // Publishable key: darf öffentlich in der Webseite stehen, die Regeln in der Datenbank schützen die Daten
  schluessel: 'sb_publishable_TmIzKNvimUolL3hpX6WVTw_T3azNY9x',
  bibliothek: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.min.js',
};

const Online = (() => {
  let db = null;        // Supabase-Client
  let nutzer = null;    // angemeldetes Konto
  let bereit = false;   // angemeldet und Spieler-Eintrag ist da
  let gespielt = false; // Spiel freigegeben (Willkommen, Tagesbelohnung)
  let status = 'verbinde';
  let uhr = null;       // verzögertes Hochladen
  let kette = Promise.resolve(); // Hochladen nacheinander, damit nie ein älterer Stand einen neueren überschreibt
  let artAnmelden = 'anmelden';  // oder 'registrieren'
  let regelmaessig = false;
  const profile = new Map();     // Freunde-ID → { name, titel, level }

  const imArtefakt = () => location.hostname.includes('claude');

  // ---------- Texte ----------

  // Fehler aus Supabase auf Deutsch
  function deutsch(e) {
    const m = `${(e && e.code) || ''} ${(e && e.message) || ''}`;
    if (/invalid_credentials|Invalid login credentials/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
    if (/user_already_exists|already registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Melde dich an.';
    if (/weak_password|at least 6|Password should/i.test(m)) return 'Das Passwort braucht mindestens 6 Zeichen.';
    if (/email_not_confirmed|not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail (Link in der Mail), dann melde dich an.';
    if (/email_address_invalid|invalid.*email|validate email/i.test(m)) return 'Diese E-Mail-Adresse stimmt nicht.';
    if (/email_address_not_authorized/i.test(m)) return 'Die Bestätigungs-Mail kann nicht verschickt werden. In Supabase muss «Confirm email» aus sein.';
    if (/rate_limit|rate limit|too many/i.test(m)) return 'Zu viele Versuche. Warte kurz und versuch es dann nochmals.';
    if (/signup_disabled|Signups not allowed/i.test(m)) return 'Neue Konten sind gerade ausgeschaltet.';
    if (/fetch|network|Load failed/i.test(m)) return 'Keine Verbindung zum Server. Prüfe dein Internet.';
    return (e && e.message) || 'Das hat nicht geklappt. Versuch es nochmals.';
  }

  // Fehlertext aus den Server-Funktionen (raise exception) oder ein allgemeiner Hinweis
  const fehlerText = (e) => (e && e.message && !/fetch|network|JWT|Load failed/i.test(e.message)
    ? e.message
    : 'Gerade keine Verbindung zum Server. Versuch es gleich nochmals.');

  function setzeStatus(neu) {
    status = neu;
    const el = document.getElementById('online-status');
    if (!el) return;
    el.dataset.status = neu;
    el.textContent = {
      verbinde: 'Verbinde mit dem Server …',
      ok: 'Dein Spielstand ist online gesichert ✓',
      fehler: 'Gerade offline. Dein Spielstand wird gesichert, sobald du wieder online bist.',
      aus: 'Online-Speichern ist hier nicht möglich.',
    }[neu];
    $('konto-email').textContent = nutzer && nutzer.email ? `Angemeldet als ${nutzer.email}` : '';
    $('abmelden-btn').hidden = !nutzer;
  }

  function ladeBibliothek() {
    if (window.supabase) return Promise.resolve();
    return new Promise((fertig, fehler) => {
      const s = document.createElement('script');
      s.src = ONLINE.bibliothek;
      s.async = true;
      s.onload = fertig;
      s.onerror = () => fehler(new Error('Keine Verbindung (Bibliothek nicht geladen)'));
      document.head.appendChild(s);
    });
  }

  // ---------- Start ----------

  async function start() {
    // Im Claude-Artefakt geht kein Anmelden: dort spielt man nur auf dem Gerät
    if (imArtefakt()) {
      setzeStatus('aus');
      spielen();
      return;
    }
    setzeStatus('verbinde');
    Laden.schritt(0.35, 'Verbinde mit dem Server …');
    try {
      await ladeBibliothek();
      Laden.schritt(0.6, 'Anmeldung wird geprüft …');
      if (!db) {
        db = window.supabase.createClient(ONLINE.url, ONLINE.schluessel, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'sk-online' },
        });
        db.auth.onAuthStateChange((ereignis, sitzung) => {
          // nach dem Anmelden (auch nach der Rückkehr von Google); verzögert, damit Supabase fertig ist
          if (sitzung && (!nutzer || nutzer.id !== sitzung.user.id)) setTimeout(() => angemeldet(sitzung.user));
        });
      }
      const { data } = await db.auth.getSession();
      if (data.session) await angemeldet(data.session.user);
      else zeigeAnmelden();
    } catch (e) {
      ohneVerbindung();
    }
  }

  // Keine Verbindung: wer auf diesem Gerät schon angemeldet war, spielt mit dem Spielstand weiter
  function ohneVerbindung() {
    setzeStatus('fehler');
    if (app.daten.konto) {
      spielen();
      setTimeout(start, 60000);
    } else {
      zeigeAnmelden('Keine Verbindung zum Server. Zum ersten Anmelden braucht es Internet.', true);
    }
  }

  // Spiel freigeben: Willkommen (beim ersten Mal, danach die Einführung), sonst einmal die Einführung
  // für alle, die sie noch nicht gesehen haben, sonst die Tagesbelohnung. Fenster erst, wenn der Ladebildschirm weg ist.
  function spielen() {
    if (gespielt) return;
    gespielt = true;
    aktualisiereAlles();
    Laden.fertig().then(() => {
      if (!app.daten.bonusMuenzen) willkommenPruefen();
      else if (!app.daten.einfuehrung) setTimeout(() => Einfuehrung.starte(Taeglich.vielleichtZeigen), 400);
      else setTimeout(Taeglich.vielleichtZeigen, 400);
    });
  }

  // Supabase meldet das Anmelden manchmal doppelt (Sitzung beim Start und Ereignis): nur einmal verbinden
  let verbindung = null;
  function angemeldet(user) {
    if (nutzer && nutzer.id === user.id && (bereit || verbindung)) return verbindung;
    verbindung = verbinde(user).finally(() => { verbindung = null; });
    return verbindung;
  }

  async function verbinde(user) {
    nutzer = user;
    Laden.schritt(0.8, 'Spielstand wird geladen …');
    try {
      await verbindeSpielstand();
    } catch (e) {
      nutzer = null;
      setzeStatus('fehler');
      zeigeAnmelden('Verbindung zum Server fehlgeschlagen. Versuch es nochmals.', true);
      return;
    }
    bereit = true;
    setzeStatus('ok');
    schliesseAnmelden();
    spielen();
    aktualisiereAlles();
    await ladeProfile(app.daten.freunde);
    Tauschen.verbunden();
    await holeGeschenke();
    aktualisiereAlles();
    if (!regelmaessig) {
      regelmaessig = true;
      setInterval(pruefe, 30000);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) sichere();
        else pruefe();
      });
    }
  }

  // Spieler-Eintrag holen oder anlegen.
  // Gehört der Spielstand auf dem Gerät zu diesem Konto, gewinnt der neuere; sonst gilt der Spielstand des Kontos.
  // Ein neues Konto übernimmt den Spielstand vom Gerät, wenn er noch keinem Konto gehört (Beta-Spielstände).
  async function verbindeSpielstand() {
    const { data, error } = await db.from('spieler').select('spieler_id, stand').eq('id', nutzer.id).maybeSingle();
    if (error) throw error;
    const gleichesKonto = app.daten.konto === nutzer.id;
    if (!data) {
      if (app.daten.konto && !gleichesKonto) {
        app.daten = Store.ausDaten({});
        app.daten.spielerId = neueSpielerId();
        $('sam-karten').innerHTML = '';
      }
      const name = nutzer.user_metadata && (nutzer.user_metadata.spielername || nutzer.user_metadata.full_name);
      if (!app.daten.name && name) app.daten.name = String(name).slice(0, 30);
      app.daten.konto = nutzer.id;
      Store.speichern(app.daten);
      await anlegen();
      return;
    }
    const online = data.stand || {};
    let lokalNehmen = gleichesKonto && (app.daten.zeit || 0) > (online.zeit || 0);
    // Spielstand auf dem Gerät ohne Konto (z. B. aus der Beta vor dem Anmelden), aber das Konto hat schon einen:
    // selbst wählen, welcher bleibt
    if (!app.daten.konto && hatFortschritt(app.daten)) lokalNehmen = await waehleSpielstand(app.daten, online);
    if (!lokalNehmen && (online.zeit || 0) !== (app.daten.zeit || 0)) {
      app.daten = Store.ausDaten(online);
      $('sam-karten').innerHTML = '';
    }
    app.daten.konto = nutzer.id;
    app.daten.spielerId = data.spieler_id; // die Freunde-ID des Kontos gilt (Freunde kennen sie schon)
    Store.speichern(app.daten);
    if (lokalNehmen) await hochladen();
  }

  const hatFortschritt = (d) => (d.karten || []).length > 0 || (d.geoeffnet || 0) > 0;

  // true = den Spielstand vom Gerät ins Konto nehmen, false = der vom Konto bleibt (auch bei «Abbrechen»)
  async function waehleSpielstand(lokal, online) {
    const kurz = (d) => `${new Set(d.karten || []).size} Karten, Level ${levelVon(d.xp || 0).level}`;
    await Laden.fertig('Spielstand wählen');
    const antwort = await frage(
      `Auf diesem Gerät gibt es einen Spielstand ohne Konto (${kurz(lokal)}). Dein Konto hat schon einen `
      + `(${kurz(online)}). Welchen willst du behalten? Der andere geht verloren.`,
      'Den vom Konto',
      { text: 'Den von diesem Gerät' },
    );
    return antwort === 'extra';
  }

  // Neues Konto: Eintrag mit der Freunde-ID des Spielstands (falls sie schon vergeben ist, eine neue)
  async function anlegen() {
    for (let versuch = 0; versuch < 4; versuch++) {
      const { error } = await db.from('spieler').insert({
        id: nutzer.id,
        spieler_id: app.daten.spielerId,
        name: (app.daten.name || '').slice(0, 30),
        level: levelVon(app.daten.xp).level,
        stand: app.daten,
      });
      if (!error) return;
      if (error.code !== '23505' || !/spieler_id/.test(`${error.message} ${error.details}`)) throw error;
      app.daten.spielerId = neueSpielerId();
      Store.speichern(app.daten);
    }
    throw new Error('Keine freie Freunde-ID gefunden');
  }

  // ---------- Fenster «Anmelden» ----------

  function zeigeAnmelden(meldung = '', nochmals = false) {
    const box = $('anmelden');
    box.hidden = false;
    document.body.classList.add('op-offen');
    zeichneAnmelden();
    zeigeMeldung(meldung);
    $('am-nochmals').hidden = !nochmals;
    Laden.fertig('Bitte melde dich an');
  }

  function schliesseAnmelden() {
    if ($('anmelden').hidden) return;
    $('anmelden').hidden = true;
    document.body.classList.remove('op-offen');
  }

  function zeichneAnmelden() {
    const neu = artAnmelden === 'registrieren';
    $('am-titel').textContent = neu ? 'Neues Konto' : 'Anmelden';
    $('am-reiter').querySelectorAll('[data-art]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.art === artAnmelden)));
    $('am-name-feld').hidden = !neu;
    $('am-passwort2-feld').hidden = !neu;
    $('am-passwort').setAttribute('autocomplete', neu ? 'new-password' : 'current-password');
    $('am-los').textContent = neu ? 'Konto erstellen' : 'Anmelden';
  }

  function zeigeMeldung(text, gut = false) {
    const el = $('am-meldung');
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle('gut', gut);
  }

  async function mitEmail(e) {
    e.preventDefault();
    if (!db) return start();
    const email = $('am-email').value.trim();
    const passwort = $('am-passwort').value;
    const name = $('am-name').value.trim().slice(0, 30);
    const neu = artAnmelden === 'registrieren';
    // neues Konto: Spielername, E-Mail und zweimal dasselbe Passwort
    if (neu && !name) return zeigeMeldung('Gib deinen Spielernamen ein.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return zeigeMeldung('Gib deine E-Mail-Adresse ein.');
    if (passwort.length < 6) return zeigeMeldung('Das Passwort braucht mindestens 6 Zeichen.');
    if (neu && passwort !== $('am-passwort2').value) return zeigeMeldung('Die beiden Passwörter sind nicht gleich. Gib sie nochmals ein.');
    const knopf = $('am-los');
    knopf.disabled = true;
    zeigeMeldung('');
    try {
      if (neu) {
        const { data, error } = await db.auth.signUp({ email, password: passwort, options: { data: { spielername: name } } });
        if (error) throw error;
        app.daten.name = name;
        // mit Bestätigungs-Mail gibt es noch keine Sitzung: erst nach dem Klick auf den Link
        if (!data.session) {
          zeigeMeldung('Fast fertig: Bestätige deine E-Mail (Link in der Mail), dann melde dich hier an.', true);
          artAnmelden = 'anmelden';
          zeichneAnmelden();
        }
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password: passwort });
        if (error) throw error;
      }
      $('am-passwort').value = '';
      $('am-passwort2').value = '';
    } catch (fehler) {
      zeigeMeldung(deutsch(fehler));
    } finally {
      knopf.disabled = false;
    }
  }

  async function mitGoogle() {
    if (!db) return start();
    zeigeMeldung('');
    try {
      // ist Google in Supabase eingeschaltet? Sonst landet man auf einer Fehlerseite
      const r = await fetch(`${ONLINE.url}/auth/v1/settings`, { headers: { apikey: ONLINE.schluessel } });
      const einstellungen = await r.json();
      if (!einstellungen.external || !einstellungen.external.google) {
        zeigeMeldung('Anmelden mit Google ist noch nicht eingerichtet. Nimm vorerst E-Mail und Passwort.');
        return;
      }
      $('am-google').disabled = true;
      const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname },
      });
      if (error) throw error;
    } catch (fehler) {
      $('am-google').disabled = false;
      zeigeMeldung(deutsch(fehler));
    }
  }

  // Abmelden: Spielstand zuerst sichern, dann vom Gerät löschen (er liegt online) und neu starten
  async function abmelden() {
    if (!(await frage('Abmelden? Dein Spielstand bleibt online gespeichert. Danach meldest du dich wieder an.', 'Abmelden'))) return;
    try {
      await sichere();
      await db.auth.signOut();
    } catch (e) { /* auch ohne Netz abmelden */ }
    Store.zuruecksetzen();
    location.replace(location.pathname);
  }

  // ---------- Speichern ----------

  async function hochladen() {
    const d = app.daten;
    const { error } = await db.from('spieler').update({
      name: (d.name || '').slice(0, 30),
      titel: (d.titel || '').slice(0, 40),
      level: levelVon(d.xp).level,
      stand: d,
      geaendert: new Date().toISOString(),
    }).eq('id', nutzer.id);
    if (error) throw error;
  }

  // Nach jeder Änderung (speichern() in js/app.js) kurz warten, dann den ganzen Spielstand hochladen
  function merke() {
    if (!bereit) return;
    clearTimeout(uhr);
    uhr = setTimeout(sichere, 1500);
  }

  // Jetzt hochladen; das Promise ist erst nach dem Hochladen fertig
  function sichere() {
    clearTimeout(uhr);
    if (!bereit) return Promise.resolve();
    kette = kette.then(hochladen).then(() => setzeStatus('ok'), () => setzeStatus('fehler'));
    return kette;
  }

  // ---------- Freunde ----------

  async function ladeProfile(ids) {
    if (!db || !nutzer) return;
    const liste = [...new Set(ids)].filter(Boolean);
    if (!liste.length) return;
    const { data, error } = await db.rpc('profile_von', { ids: liste });
    if (error) return;
    data.forEach((p) => profile.set(p.spieler_id, p));
  }

  const nameVon = (id) => (profile.get(id) && profile.get(id).name) || '';
  const gibtEs = (id) => profile.has(id);

  // ---------- Geschenke ----------

  // Ein Pack einem Freund schenken. Gibt null (geschenkt) oder einen Fehlertext zurück.
  async function schenke(freund, packId) {
    try {
      await sichere();
      const { error } = await db.rpc('geschenk_senden', { freund, pack_id: packId });
      if (error) throw error;
      return null;
    } catch (e) {
      return fehlerText(e);
    }
  }

  // Geschenke von Freunden abholen: jedes genau einmal, dann liegt das Pack im Vorrat
  async function holeGeschenke() {
    if (!bereit) return;
    const { data, error } = await db.from('geschenke').select('id, von_id, pack').eq('an', nutzer.id).is('abgeholt', null);
    if (error || !data.length) return;
    await ladeProfile(data.map((g) => g.von_id));
    for (const g of data) {
      const r = await db.rpc('geschenk_abholen', { geschenk: g.id });
      if (r.error || !r.data || !r.data.id || !packVonId(g.pack)) continue;
      app.daten.vorrat[g.pack] = vorratVon(g.pack) + 1;
      Erfolge.zaehle('beschenkt');
      speichern();
      aktualisiereAlles();
      Gefuehl.ton('gewinn');
      Gefuehl.vibriere([30, 40, 80]);
      Gefuehl.konfetti(['#ffd34d', '#ff4251', '#ffffff', '#4aa3ff'], 60);
      zeigeHinweis(`Geschenk von ${nameVon(g.von_id) || g.von_id}: ${packVonId(g.pack).titel}-Pack liegt in deinem Vorrat!`);
    }
  }

  // ---------- Für js/tauschen.js ----------

  async function rpc(name, args) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw new Error(fehlerText(error));
    return data;
  }

  async function tauschAnfragen() {
    const { data, error } = await db.from('tausch_anfragen').select('*')
      .or(`von.eq.${nutzer.id},an.eq.${nutzer.id}`).order('zeit', { ascending: false }).limit(60);
    if (error) throw new Error(fehlerText(error));
    await ladeProfile(data.flatMap((a) => [a.von_id, a.an_id]));
    return data;
  }

  // Regelmässig und beim Zurückkommen in die App: Geschenke und Tausch-Anfragen
  function pruefe() {
    if (!bereit || document.hidden) return;
    holeGeschenke();
    Tauschen.lade();
  }

  function init() {
    $('am-form').addEventListener('submit', mitEmail);
    $('am-google').addEventListener('click', mitGoogle);
    $('am-nochmals').addEventListener('click', () => {
      $('am-nochmals').hidden = true;
      zeigeMeldung('');
      start();
    });
    $('am-reiter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-art]');
      if (!b) return;
      artAnmelden = b.dataset.art;
      zeigeMeldung('');
      zeichneAnmelden();
    });
    $('abmelden-btn').addEventListener('click', abmelden);
    start();
  }

  return {
    init, merke, sichere, ladeProfile, nameVon, gibtEs, schenke, rpc, tauschAnfragen,
    bereit: () => bereit,
    freigegeben: () => gespielt,
    status: () => status,
    anmeldenOffen: () => !$('anmelden').hidden,
  };
})();
