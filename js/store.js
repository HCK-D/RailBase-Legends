/*
 * Speicher-Schicht.
 * Die Daten liegen zuerst im Browser (localStorage), damit alles sofort und auch ohne Netz geht.
 * js/online.js schickt den Spielstand danach zusätzlich in die Online-Datenbank (Supabase).
 * Die App ruft Store.laden(), Store.speichern(), Store.zuruecksetzen() und Store.ausDaten() auf.
 */
const Store = (() => {
  const SCHLUESSEL = 'sk-beta-v1';

  const STANDARD = {
    name: '',
    bild: '',          // Profilbild, Kürzel aus PROFILBILDER in js/freunde.js oder 'eigen' (leer = noch nicht gewählt)
    bildFoto: '',      // eigenes Foto aus der Galerie, klein als Bild-Text (data:image/…), gilt bei bild 'eigen'
    vorrat: {},        // Anzahl Packs pro Design, z. B. { 'standard': 2, 'gold-1': 1 }
    geoeffnet: 0,
    radDrehungen: 0,   // Gratisdrehungen für den Gold-Fortschritt; verfällt nicht
    radExtra: 0,       // zusätzliche Drehungen am Glücksrad (z. B. aus dem Beta-Code), zählen neben dem Tagesdreh
    xp: 0,             // Erfahrungspunkte für das Sammler-Level
    karten: [],        // gesammelte Karten als Karten-IDs, z. B. 'RB001' (doppelte kommen mehrfach vor)
    muenzen: 0,        // RB Coins (gold): Standardwährung, damit kauft man Basis-Packs und Rubin-Coins
    rubine: 0,         // Rubin-Coins: damit kauft man Platin-Packs
    bonusMuenzen: false, // true, sobald das Startguthaben gutgeschrieben wurde
    punkte: 0,         // Sammelpunkte von früher, werden nicht mehr gebraucht (fehlende Karten kann man nicht kaufen)
    spielerId: '',     // eigene Freunde-ID, z. B. 'RB-K7F2-M9QX' (wird beim ersten Start erzeugt)
    freunde: [],       // IDs der Freunde, die man hinzugefügt hat
    geschenkZeit: null, // Zeitpunkt (ms) des letzten verschenkten Packs (nur alle 48 Stunden)
    eingeloest: [],    // eingelöste Geschenk-Codes, damit jeder Code nur einmal gilt
    ungesehen: [],     // neu gefundene Karten, die im Album noch einen «Neu»-Sticker tragen
    ton: true,         // Töne und Vibration an
    // Tägliche Belohnungen (js/taeglich.js): Login-Serie und Tagesaufgaben. Tage als 'JJJJ-MM-TT'
    taeglich: {
      serie: 0,          // Tage in Folge abgeholt
      letzterTag: null,  // Tag der letzten abgeholten Serien-Belohnung
      gezeigt: null,     // Tag, an dem das Fenster zuletzt von selbst aufging
      tag: null,         // für diesen Tag gelten Zähler und abgeholte Aufgaben
      zaehler: {},       // Fortschritt heute, z. B. { packs: 1, rad: 1 }
      abgeholt: [],      // heute abgeholte Aufgaben (und 'bonus')
    },
    gratisZeit: null,  // Zeitpunkt (ms) des letzten Gratis-Packs
    radZeit: null,     // Zeitpunkt (ms) der letzten Drehung am Glücksrad
    // Erfolge (js/erfolge.js): Zeitpunkt (ms), wann eine Stufe geschafft und wann sie abgeholt wurde, z. B. { 'sammler-1': 1761… }
    erfolge: {
      bekannt: false,    // true nach der ersten Prüfung; danach gibt es für jeden neuen Erfolg eine Meldung
      geschafft: {},
      abgeholt: {},
      zaehler: {},       // was der Spielstand sonst nicht weiss, z. B. { verwertet: 3, gekauft: 1, serie: 7 }
    },
    wunschliste: [],   // Karten-IDs, die man sucht (Tauschen, js/tauschen.js; Freunde sehen sie beim Tauschen)
    tauschErledigt: [], // IDs der angenommenen Tausche, die in diesem Spielstand schon umgesetzt sind (js/tauschen.js)
    zeit: 0,           // Zeitpunkt (ms) der letzten Änderung: beim Verbinden mit der Datenbank gewinnt der neuere Spielstand
    konto: '',         // zu welchem Online-Konto dieser Spielstand gehört (js/online.js), leer = noch keinem
    einfuehrung: false, // kurze Einführung gesehen (js/einfuehrung.js); kommt sonst nach dem Willkommen
    // Käufe mit echtem Geld in der Handy-App (js/shop-echtgeld.js): { produkt, zeit, test } – die letzten 100
    kaeufe: [],
  };

  const textListe = (liste) => (Array.isArray(liste) ? liste.filter((k) => typeof k === 'string') : []);

  // Gespeicherte Daten (aus dem Browser oder aus der Online-Datenbank) mit den Standardwerten ergänzen
  function ausDaten(daten) {
    return {
      ...structuredClone(STANDARD),
      ...daten,
      vorrat: { ...(daten.vorrat || {}) },
      // nur Karten-IDs behalten; alte Platzhalter-Karten aus früheren Beta-Versionen fallen weg
      karten: textListe(daten.karten),
      ungesehen: textListe(daten.ungesehen),
      freunde: textListe(daten.freunde),
      taeglich: { ...structuredClone(STANDARD.taeglich), ...(daten.taeglich || {}) },
      erfolge: { ...structuredClone(STANDARD.erfolge), ...(daten.erfolge || {}) },
      eingeloest: textListe(daten.eingeloest),
      wunschliste: textListe(daten.wunschliste),
      kaeufe: Array.isArray(daten.kaeufe) ? daten.kaeufe.filter((k) => k && typeof k.produkt === 'string').slice(-100) : [],
      tauschErledigt: Array.isArray(daten.tauschErledigt) ? daten.tauschErledigt.filter((n) => Number.isInteger(n)) : [],
    };
  }

  function laden() {
    try {
      const roh = localStorage.getItem(SCHLUESSEL);
      if (!roh) return structuredClone(STANDARD);
      return ausDaten(JSON.parse(roh));
    } catch (e) {
      return structuredClone(STANDARD);
    }
  }

  function speichern(daten) {
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
      return true;
    } catch (e) {
      return false; // z. B. privates Fenster: die App läuft trotzdem weiter
    }
  }

  function zuruecksetzen() {
    try { localStorage.removeItem(SCHLUESSEL); } catch (e) { /* ignorieren */ }
  }

  return { laden, speichern, zuruecksetzen, ausDaten };
})();
