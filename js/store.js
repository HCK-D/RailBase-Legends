/*
 * Speicher-Schicht.
 * Im Moment liegen die Daten im Browser (localStorage). Später wird nur dieser Teil
 * gegen eine Online-Datenbank ausgetauscht. Die App ruft nur Store.laden(),
 * Store.speichern() und Store.zuruecksetzen() auf.
 */
const Store = (() => {
  const SCHLUESSEL = 'sk-beta-v1';

  const STANDARD = {
    name: '',
    vorrat: {},        // Anzahl Packs pro Design, z. B. { 'standard': 2, 'gold-1': 1 }
    geoeffnet: 0,
    radDrehungen: 0,   // Gratisdrehungen für den Gold-Fortschritt; verfällt nicht
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
  };

  function laden() {
    try {
      const roh = localStorage.getItem(SCHLUESSEL);
      if (!roh) return structuredClone(STANDARD);
      const daten = JSON.parse(roh);
      return {
        ...structuredClone(STANDARD),
        ...daten,
        vorrat: { ...(daten.vorrat || {}) },
        // nur Karten-IDs behalten; alte Platzhalter-Karten aus früheren Beta-Versionen fallen weg
        karten: Array.isArray(daten.karten) ? daten.karten.filter((k) => typeof k === 'string') : [],
        ungesehen: Array.isArray(daten.ungesehen) ? daten.ungesehen.filter((k) => typeof k === 'string') : [],
        taeglich: { ...structuredClone(STANDARD.taeglich), ...(daten.taeglich || {}) },
        eingeloest: Array.isArray(daten.eingeloest) ? daten.eingeloest.filter((k) => typeof k === 'string') : [],
      };
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

  return { laden, speichern, zuruecksetzen };
})();
