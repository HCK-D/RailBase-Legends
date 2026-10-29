# RailBase Sammelkarten – Beta

Ein Sammelkarten-Spiel im Stil von RailBase: Packs öffnen, Karten sammeln, jeden Tag ein Gratis-Pack.
Eigenes Projekt, nicht mit Railbase.ch verbunden. Name und Domain kommen später.

Das Projekt bleibt vorerst nur auf diesem Computer. Auf GitHub kommt es erst, wenn das Ergebnis gut ist.

## Vorschau öffnen

Doppelklick auf **`Vorschau starten.bat`**. Der Browser öffnet sich von selbst.

- Computer: http://localhost:8770
- Handy: Die Adresse steht im schwarzen Fenster, z. B. `http://192.168.1.115:8770`.
  Das Handy muss im gleichen WLAN sein.
- Beenden: das schwarze Fenster schliessen.

Beim ersten Start fragt Windows vielleicht, ob der Zugriff erlaubt ist. Dann nur **Private Netzwerke** wählen.

## Was schon da ist

- Gratis-Pack: 1 Standard-Pack alle 24 Stunden (ab dem Zeitpunkt, an dem man es geholt hat)
- Glücksrad: 1 Drehung alle 24 Stunden, gewinnt ein Pack oder nichts
- 7 Pack-Varianten: 1 Standard, 2 Silber, 2 Gold, 2 Platin
- Pack öffnen: Pack wackelt und reisst auf, dann kommen die 5 Karten einzeln
  (tippen = aufdecken, wischen oder tippen = nächste Karte), am Schluss alle nebeneinander
- 7 Karten-Kategorien: Common, Uncommon, Rare, Epic, Mythic, Legendary, Special
- Karten-Skizze (Platzhalter-Design) mit Nummer, Kategorie, Bild, Name und Werten
- Sammlung mit allen gezogenen Karten, Filter nach Kategorie
- Menü unten: Start, Packs, Rad, Sammlung, Konto, Mehr; roter Punkt, wenn etwas bereit ist
- Auf dem Handy nach links oder rechts wischen, um die Seite zu wechseln
- Hell und dunkel, für Handy und Computer

## Platzhalter-Chancen (werden mit dem Word-Dokument ersetzt)

Karten pro Pack-Stufe, in Prozent (`js/karten.js`, `KARTEN_CHANCEN`):

| Pack | Common | Uncommon | Rare | Epic | Mythic | Legendary | Special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Standard | 62 | 25 | 9 | 3 | 0,8 | 0,2 | 0 |
| Silber | 45 | 30 | 15 | 7 | 2 | 0,8 | 0,2 |
| Gold | 30 | 30 | 22 | 11 | 4,5 | 2 | 0,5 |
| Platin | 15 | 25 | 28 | 18 | 8 | 4,5 | 1,5 |

Glücksrad (`js/rad.js`, `FELDER`): 12 Felder – 5× Nichts, 3× Standard, 2× Silber, 1× Gold, 1× Platin.

## Was noch kommt

- Die echten Karten (Liste mit Karten und Chancen folgt als Word-Dokument)
- Das richtige Karten-Design
- Login und Online-Datenbank (eher gegen Ende des Projekts)

Bis dahin speichert die Seite alles im Browser. Jedes Gerät hat also seinen eigenen Spielstand.

## Ordner

| Ordner / Datei | Inhalt |
| --- | --- |
| `index.html` | die ganze Seite |
| `css/style.css` | Design (Farben wie RailBase.ch, Farben der Kategorien) |
| `js/app.js` | Seiten, Menü, Packs, Gratis-Pack, Sammlung, Konto |
| `js/karten.js` | Kategorien, Chancen, Karten-Skizze |
| `js/oeffnen.js` | Pack öffnen, Karten einzeln aufdecken und wegwischen |
| `js/rad.js` | Glücksrad |
| `js/store.js` | Speichern der Daten (hier kommt später die Online-Datenbank rein) |
| `assets/packs/` | Pack-Bilder gross (zum Öffnen) |
| `assets/packs/klein/` | Pack-Bilder klein (für Listen) |
| `werkzeuge/vorschau.ps1` | kleiner Webserver für die Vorschau |
| `Vorschau starten.bat` | startet die Vorschau per Doppelklick |
