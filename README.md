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

- Startseite mit dem täglichen Gratis-Pack (1 Standard-Pack pro Tag, neu ab Mitternacht)
- 7 Pack-Varianten: 1 Standard, 2 Silber, 2 Gold, 2 Platin
- Pack öffnen mit Animation (Pack wackelt, reisst auf, 5 Karten drehen sich auf)
- 7 Karten-Kategorien: Common, Uncommon, Rare, Epic, Mythic, Legendary, Special
- Navigation unten: Start, Packs, Sammlung, Konto, Mehr
- Hell und dunkel, für Handy und Computer

## Was noch kommt

- Die Karten selbst (Liste mit Karten und Wahrscheinlichkeiten folgt als Word-Dokument)
- Login und Online-Datenbank (eher gegen Ende des Projekts)

Bis dahin speichert die Seite alles im Browser. Jedes Gerät hat also seinen eigenen Spielstand.

## Ordner

| Ordner / Datei | Inhalt |
| --- | --- |
| `index.html` | die ganze Seite |
| `css/style.css` | Design (Farben wie RailBase.ch, Farben der Kategorien) |
| `js/app.js` | Packs, Kategorien, Gratis-Pack, Pack öffnen, Konto |
| `js/store.js` | Speichern der Daten (hier kommt später die Online-Datenbank rein) |
| `assets/packs/` | Pack-Bilder gross (zum Öffnen) |
| `assets/packs/klein/` | Pack-Bilder klein (für Listen) |
| `werkzeuge/vorschau.ps1` | kleiner Webserver für die Vorschau |
| `Vorschau starten.bat` | startet die Vorschau per Doppelklick |
