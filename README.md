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
  12 Varianten und 5 Special-Karten, in `js/daten/kartenliste.js`.
  Dazu **60 Karten von 6 neuen Bahnen** (AB, AVA, BOB, TMR, TPC, TRAVYS, RB292–RB351) aus dem
  Zwischenstand von Railbase.ch (Zweig `spaeter-neue-bahnen`, noch nicht online).
  **Im Spiel sind nur die 300 Karten mit Foto** (`js/daten/kartenfotos.js`). Die 68 ohne Foto stehen
  im Word-Dokument «RailBase_Legends_Karten_ohne_Foto.docx» und kommen zurück, sobald sie ein Foto haben.
- Album mit allen Karten im Spiel: gesammelte farbig mit Anzahl, fehlende grau;
  Filter nach Kategorie und Bahn, Suche, «Nur gesammelte»
- Beim Öffnen: Name der Karte und «Neu!», wenn man sie noch nicht hatte

- Zwei Designs: **Silber** (hell) und **Schwarz** (dunkel), wählbar unter Konto
- Kopfzeile mit Konto-Knopf (Anfangsbuchstabe), Sammler-Level und XP-Balken
- **Ladebildschirm** beim Start (`js/laden.js`): drei Karten im Fächer, Logo, ein roter Zug als Ladebalken,
  was gerade lädt (Server, Anmeldung, Spielstand) und wechselnde Tipps. Er bleibt, bis man spielen oder sich
  anmelden kann; danach gehen Willkommen, Einführung oder Tagesbelohnung auf.
- **Anmelden beim Start (Pflicht)** mit E-Mail und Passwort oder mit Google (`js/online.js`, Online-Datenbank
  Supabase, Tabellen und Regeln in `werkzeuge/datenbank.sql`). Der Spielstand wird online gesichert und ist auf
  jedem Gerät gleich; ohne Netz spielt man mit dem Spielstand auf dem Gerät weiter. Bisherige Spielstände ziehen
  beim ersten Konto mit um. Im Konto: «Angemeldet als …», Online-Status und Abmelden.
  Neues Konto: Spielername, E-Mail und zweimal das Passwort (damit kein Tippfehler drin ist).
- Erster Start: Willkommens-Fenster mit allem, was man bekommt (100 RB Coins, Gratis-Pack, Startbonus,
  Glücksrad, Tagesbelohnung) und unten «Annehmen»; erst dann gibt es das Startguthaben
- Danach eine **kurze Einführung** in 5 Schritten (`js/einfuehrung.js`): Packs öffnen, Karten, Glücksrad, Album.
  Sie zeigt auf die echten Knöpfe im Menü und lässt sich unter Mehr → Kurze Einführung wiederholen.
- Start: «Dein nächster Fund.» mit Basis-Pack auf dem Podest und grossem Knopf «Pack öffnen»
- Gratis-Pack: 1 Basis-Pack alle 24 Stunden (ab dem Zeitpunkt, an dem man es geholt hat)
- Packs: «Wähle dein Pack» mit Reitern Basis/Silver/Gold/Platinum, Karussell zum Wischen
  und Ticket mit Garantie und «Pack öffnen»
- Glücksrad: 1 Drehung alle 24 Stunden, gewinnt ein Pack oder nichts
- 7 Pack-Varianten: 1 Basis, 2 Silver, 2 Gold, 2 Platinum
- Pack öffnen: Pack wackelt und reisst auf, dann kommen die 5 Karten einzeln
  (tippen = aufdecken, wischen oder tippen = nächste Karte), am Schluss alle nebeneinander
- 7 Karten-Kategorien: Common, Uncommon, Rare, Epic, Mythic, Legendary, Special
- Karten-Design nach dem Entwurf «Sammel Karten» (`css/karten.css`): Nummer und Seltenheit oben, Foto über die
  ganze Karte, unten Bahn, Name und Fahrzeug. Effekte je Seltenheit: Lichtstreifen (Uncommon, Rare),
  Holo-Schimmer und Sterne (Epic), Glut und Funken (Mythic), Gold-Glitzer (Legendary). Special bekommt später ein eigenes Design.
- Album mit allen gezogenen Karten, Filter nach Kategorie
- **Erfolge** (Mehr → Erfolge, mit roter Zahl, wenn Belohnungen bereit sind; `js/erfolge.js`): 34 Erfolge mit 61 Stufen in 6 Gruppen (Sammeln, Bahnen,
  Packs, Treue, Freunde, Geheim). Jede Stufe hat eine Belohnung (RB Coins, Rubine oder ein Pack),
  grosse Erfolge zusätzlich einen Titel, der im Konto unter dem Namen steht. Der Fortschritt kommt aus dem
  Spielstand, also zählt auch, was man vorher schon gesammelt hat. Ziele und Belohnungen sind Platzhalter.
- **Tauschen** (Mehr → Tauschen, `js/tauschen.js`): vorbereitet für die Online-Datenbank. Doppelte Karten gegen
  Karten von Freunden, gleiche Seltenheit 1 gegen 1, ohne Special. Drei Reiter: Anfragen, Tauschen, Vergangen.
  Wird ein Tausch angenommen, zeigt eine Animation über den ganzen Bildschirm, wie deine Karte das Album verlässt
  und die neue hineinfliegt. Auf der echten Seite steht «Tauschen startet mit dem Anmelden»; in der Vorschau
  spielt ein Test-Freund mit, damit man den Ablauf ausprobieren kann.
  Die **Wunschliste** geht schon: im Album eine fehlende Karte antippen (Herz).
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
- Fotos für die 68 Karten, die deshalb noch nicht im Spiel sind
- Handy-Optimierung
- «Passwort vergessen» und Bestätigungs-Mails: brauchen einen eigenen Mail-Versand (SMTP) in Supabase.
  Mit dem Gratis-Mailversand gehen Mails nur an das eigene Team; darum ist «Confirm email» für die Beta aus.

## Ordner

| Ordner / Datei | Inhalt |
| --- | --- |
| `index.html` | die ganze Seite |
| `css/style.css` | Design Silber und Schwarz, Farben der Kategorien |
| `js/app.js` | Seiten, Menü, Start, Packs-Karussell, Album, Konto, Level |
| `js/karten.js` | Kategorien, Chancen, Garantie, XP, Karten-Aussehen |
| `js/daten/kartenliste.js` | alle 368 Karten (auch die ohne Foto) |
| `js/daten/kartenfotos.js`, `assets/karten/fotos/` | Fotos von Railbase.ch auf 300 Karten, mit Fotograf und Lizenz (Bildnachweise unter «Mehr») |
| `AGENTS.md` | Regeln für Codex und andere KI-Assistenten (was beim Design geändert werden darf) |
| `design/` | Design-Vorlagen und Sicherungen, nur lokal (nicht auf GitHub) |
| `js/oeffnen.js` | Pack öffnen, Karten einzeln aufdecken und wegwischen |
| `js/enthuellung.js` | Enthüllung ab Epic: Aufladen mit Farbstufen, Knall, Strahlen, Funken und Konfetti (auf canvas gemalt) |
| `js/rad.js` | Glücksrad |
| `js/taeglich.js`, `css/taeglich.css` | Tagesbelohnung (Login-Serie) und Tagesaufgaben |
| `js/erfolge.js`, `css/erfolge.css` | Erfolge mit Belohnungen und Titeln (Liste `ERFOLGE` am Anfang der Datei) |
| `js/tauschen.js`, `css/tauschen.css` | Tauschen und Wunschliste; online prüft und entscheidet der Server (`onlineServer`) |
| `js/online.js`, `css/anmelden.css` | Anmelden, Spielstand online, Freunde-Namen, Geschenke (Supabase) |
| `werkzeuge/datenbank.sql` | Tabellen, Regeln und Server-Funktionen der Datenbank (im Supabase SQL Editor ausführen) |
| `js/einfuehrung.js`, `css/einfuehrung.css` | kurze Einführung für neue Spieler |
| `js/laden.js`, `css/laden.css` | Ladebildschirm beim Start (Tipps in `LADE_TIPPS`) |
| `js/store.js` | Speichern der Daten (hier kommt später die Online-Datenbank rein) |
| `assets/packs/` | Pack-Bilder gross (zum Öffnen) |
| `assets/packs/klein/` | Pack-Bilder klein (für Listen) |
| `manifest.webmanifest`, `assets/app/` | App: Name, Farben und Symbole (installierbar, Grundlage für die Android-APK) |
| `sw.js` | Offline-Speicher der App: immer zuerst das Netz, ohne Netz die letzte Kopie |
| `werkzeuge/vorschau.ps1` | kleiner Webserver für die Vorschau |
| `Vorschau starten.bat` | startet die Vorschau per Doppelklick |
