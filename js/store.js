/*
 * Speicher-Schicht.
 * Im Moment liegen die Daten im Browser (localStorage). Später wird nur dieser Teil
 * gegen eine Online-Datenbank (z. B. Supabase) ausgetauscht. Die App ruft nur
 * Store.laden(), Store.speichern() und Store.heute() auf.
 */
const Store = (() => {
  const SCHLUESSEL = 'sk-beta-v1';

  const STANDARD = {
    name: '',
    vorrat: {},        // Anzahl Packs pro Design, z. B. { 'standard': 2, 'gold-1': 1 }
    geoeffnet: 0,
    karten: [],        // gesammelte Karten, z. B. { id: 'k-001', seltenheit: 'rare' } (kommt später)
    gratisTag: null,   // Datum (YYYY-MM-DD) des letzten Gratis-Packs
  };

  function heute() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const t = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${t}`;
  }

  function laden() {
    try {
      const roh = localStorage.getItem(SCHLUESSEL);
      if (!roh) return structuredClone(STANDARD);
      const daten = JSON.parse(roh);
      return {
        ...structuredClone(STANDARD),
        ...daten,
        vorrat: { ...(daten.vorrat || {}) },
        karten: Array.isArray(daten.karten) ? daten.karten : [],
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

  return { laden, speichern, zuruecksetzen, heute };
})();
