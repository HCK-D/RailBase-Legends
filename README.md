# RailBase Legends – Beta

Ein Sammelkarten-Spiel im Stil von RailBase: Packs öffnen, Karten sammeln, jeden Tag ein Gratis-Pack.
Eigenes Projekt, nicht mit Railbase.ch verbunden. Der Name ist «RailBase Legends» (Logo: assets/logo/railbase-legends*.png).

Online über GitHub Pages unter **https://railbase-legends.ch** (Datei `CNAME`). Jeder Push auf `main` geht sofort live.
Sicherungen und Design-Vorlagen (`design/`) bleiben nur auf dem Computer (`.gitignore`).

## Vorschau öffnen

Doppelklick auf **`Vorschau starten.bat`**. Der Browser öffnet sich von selbst.

- Computer: http://localhost:8770
- Handy: Die Adresse steht im schwarzen Fenster, z. B. `http://192.168.1.115:8770`.
  Das Handy muss im gleichen WLAN sein.
- Beenden: das schwarze Fenster schliessen.

Beim ersten Start fragt Windows vielleicht, ob der Zugriff erlaubt ist. Dann nur **Private Netzwerke** wählen.

## Was schon da ist

Zuerst wird die Webseite für den Computer fertig gemacht, das Handy kommt später.
Ab 1100 px Breite steht das Menü oben, darunter (Handy) unten.

- **308 echte Karten** aus `RailBase_Karten_Seltenheiten.docx` (Stand 29. Oktober 2026):
  291 Basiskarten aus 8 Bahnen (SBB, BLS, RhB, SOB, Zentralbahn, TPF, MOB, transN),
  12 Varianten und 5 Special-Karten, in `js/daten/kartenliste.js`
- Album mit allen 308 Karten: gesammelte farbig mit Anzahl, fehlende grau;
  Filter nach Kategorie und Bahn, Suche, «Nur gesammelte»
- Beim Öffnen: Name der Karte und «Neu!», wenn man sie noch nicht hatte

- Zwei Designs: **Silber** (hell) und **Schwarz** (dunkel), wählbar unter Konto
- Kopfzeile mit Konto-Knopf (Anfangsbuchstabe), Sammler-Level und XP-Balken
- Start: «Dein nächster Fund.» mit Basis-Pack auf dem Podest und grossem Knopf «Pack öffnen»
- Gratis-Pack: 1 Basis-Pack alle 24 Stunden (ab dem Zeitpunkt, an dem man es geholt hat)
- Packs: «Wähle dein Pack» mit Reitern Basis/Silver/Gold/Platinum, Karussell zum Wischen
  und Ticket mit Garantie und «Pack öffnen»
- Glücksrad: 1 Drehung alle 24 Stunden, gewinnt ein Pack oder nichts
- 7 Pack-Varianten: 1 Basis, 2 Silver, 2 Gold, 2 Platinum
- Pack öffnen: Pack wackelt und reisst auf, dann kommen die 5 Karten einzeln
  (tippen = aufdecken, wischen oder tippen = nächste Karte), am Schluss alle nebeneinander
- 7 Karten-Kategorien: Common, Uncommon, Rare, Epic, Mythic, Legendary, Special
- Karten-Skizze (Platzhalter-Design) mit Nummer, Kategorie, Bild, Name und Werten
- Album mit allen gezogenen Karten, Filter nach Kategorie
- Menü unten: Start, Packs, Rad, Album, Mehr; roter Punkt, wenn etwas bereit ist
- Auf dem Handy nach links oder rechts wischen, um die Seite zu wechseln

## Platzhalter-Werte (werden mit dem Word-Dokument ersetzt)

Karten pro Pack-Stufe, in Prozent (`js/karten.js`, `KARTEN_CHANCEN`):

| Pack | Common | Uncommon | Rare | Epic | Mythic | Legendary | Special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Basis | 62 | 25 | 9 | 3 | 0,8 | 0,2 | 0 |
| Silver | 45 | 30 | 15 | 7 | 2 | 0,8 | 0,2 |
| Gold | 30 | 30 | 22 | 11 | 4,5 | 2 | 0,5 |
| Platinum | 15 | 25 | 28 | 18 | 8 | 4,5 | 1,5 |

Garantie pro Pack (`KARTEN_GARANTIE`): Silver mind. 1 Uncommon, Gold mind. 1 Rare, Platinum mind. 1 Epic.
Wird die Garantie gebraucht, ersetzt eine zufällige Karte der Mindest-Kategorie die schwächste Karte
(Karten werden nie umbenannt oder hochgestuft, wie in der Kartenliste verlangt).

XP pro Karte (`XP_PRO_KARTE`): Common 5, Uncommon 10, Rare 20, Epic 40, Mythic 80, Legendary 150, Special 250.
Level: Level 1 braucht 100 XP, jedes weitere Level 100 XP mehr (`levelVon`).

Glücksrad (`js/rad.js`, `FELDER`): 12 Felder – 4× 5 Coins, 2× 10 Coins, 2× 20 Coins, 2× Basis, 1× Silver, 1× Gold.
Alle 30 Drehungen gibt es zusätzlich ein Gold-Pack.

## Was noch kommt

- Chancen pro Pack festlegen (die Kartenliste legt nur die Seltenheit fest, nicht die Chancen)
- Das richtige Design (Anleitung für Codex: `AGENTS.md`, Mockups in `design/mockups/`)
- Fahrzeugbilder auf den Karten
- Handy-Optimierung
- Login und Online-Datenbank (eher gegen Ende des Projekts)

Bis dahin speichert die Seite alles im Browser. Jedes Gerät hat also seinen eigenen Spielstand.

## Ordner

| Ordner / Datei | Inhalt |
| --- | --- |
| `index.html` | die ganze Seite |
| `css/style.css` | Design Silber und Schwarz, Farben der Kategorien |
| `js/app.js` | Seiten, Menü, Start, Packs-Karussell, Album, Konto, Level |
| `js/karten.js` | Kategorien, Chancen, Garantie, XP, Karten-Aussehen |
| `js/daten/kartenliste.js` | alle 308 Karten |
| `AGENTS.md` | Regeln für Codex und andere KI-Assistenten (was beim Design geändert werden darf) |
| `design/` | Design-Vorlagen und Sicherungen, nur lokal (nicht auf GitHub) |
| `js/oeffnen.js` | Pack öffnen, Karten einzeln aufdecken und wegwischen |
| `js/enthuellung.js` | Enthüllung ab Epic: Aufladen mit Farbstufen, Knall, Strahlen, Funken und Konfetti (auf canvas gemalt) |
| `js/rad.js` | Glücksrad |
| `js/store.js` | Speichern der Daten (hier kommt später die Online-Datenbank rein) |
| `assets/packs/` | Pack-Bilder gross (zum Öffnen) |
| `assets/packs/klein/` | Pack-Bilder klein (für Listen) |
| `manifest.webmanifest`, `assets/app/` | App: Name, Farben und Symbole (installierbar, Grundlage für die Android-APK) |
| `sw.js` | Offline-Speicher der App: immer zuerst das Netz, ohne Netz die letzte Kopie |
| `werkzeuge/vorschau.ps1` | kleiner Webserver für die Vorschau |
| `Vorschau starten.bat` | startet die Vorschau per Doppelklick |
