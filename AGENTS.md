# Anleitung für KI-Assistenten (Codex, Claude …)

Projekt: **RailBase Sammelkarten – Beta**. Ein Sammelkarten-Spiel als Webseite: Packs öffnen,
Karten sammeln, Gratis-Pack und Glücksrad alle 24 Stunden. Reines HTML, CSS und JavaScript,
kein Build-Schritt, keine Bibliotheken. Sprache der Seite und der Kommentare: Deutsch (Schweiz, «ss» statt «ß»).

## Vorschau

Doppelklick auf `Vorschau starten.bat` → http://localhost:8770
(oder: `powershell -ExecutionPolicy Bypass -File werkzeuge\vorschau.ps1`)

## Aufgabe Design

Das Design soll neu und schöner werden. Vorlage sind die Mockups in `design/mockups/`:

- `schwarz-start-und-packs.webp` – dunkles Design (Startseite und Packs-Seite)
- `hell-varianten.webp` – helles Design; gewählt ist die **mittlere Variante «Silber & Rot»**

Nicht übernehmen aus den Mockups: «Tagesaufgabe», «Letzter Fund», «Dein Kartenalbum» und den Menüpunkt «Aufgaben».

Zuerst die **Webseite für den Computer** gestalten. Das Handy-Layout kommt später.

## Was beim Design geändert werden darf

| Datei | Erlaubt |
| --- | --- |
| `css/style.css` | alles (Farben, Schriften, Abstände, Animationen, Layout) |
| `index.html` | Aufbau, Klassen, Texte, Icons, neue Elemente – aber **IDs und `data-*`-Attribute behalten** (siehe unten) |
| `js/karten.js` → Funktionen `karteHtml()` und `rueckseiteHtml()` | Aufbau der Karten-Vorderseite und -Rückseite |
| `assets/` | neue Bilder (am besten `.webp`) |

## Was NICHT geändert werden darf

- Die Spiel-Logik in `js/app.js`, `js/oeffnen.js`, `js/rad.js`, `js/store.js`
  (ausser reine Texte, die auf der Seite erscheinen)
- `js/daten/kartenliste.js` (die 308 Karten, Quelle: Word-Dokument des Besitzers)
- Chancen, Garantie, XP und Level in `js/karten.js` (Spielregeln, legt der Besitzer fest)
- Der Speicher-Schlüssel `sk-beta-v1` und `sk-theme` im localStorage

### IDs, die der Code braucht (müssen im HTML bleiben)

Kopf: `avatar`, `lvl`
Mehr (Sammler-Level): `level-zahl`, `xp-level`, `xp-balken`, `xp-zahl`
Start: `start-badge` (mit einem `<use>` und einem `<span>` darin), `start-btn`, `start-btn-txt`
Packs: `pk-reiter`, `pk-karussell`, `pk-zurueck`, `pk-weiter`, `pk-stelle`, `pk-punkte`,
`tk-name`, `tk-info`, `tk-garantie` (mit `<span>` darin), `tk-btn`, `tk-btn-txt`
Rad: `rad-buehne` (das Rad ist zum Drücken), `rad-svg`, `rad-btn`, `rad-btn-txt`, `rad-info`
Gewinn-Fenster vom Rad: `gewinn`, `gw-img`, `gw-leer`, `gw-kicker`, `gw-titel`, `gw-text`, `gw-oeffnen`, `gw-oeffnen-icon`, `gw-oeffnen-txt`, `gw-spaeter`
Album: `st-entdeckt`, `st-karten`, `st-geoeffnet`, `rar-liste`, `al-suche`, `al-bahn`, `al-nur-meine`,
`sam-titel`, `sam-karten`, `sam-leer`
Konto: `avatar-gross`, `profil-name`, `profil-level`, `konto-form`, `konto-name`, `reset-btn`
Pack öffnen: `opener`, `op-titel`, `op-pack`, `op-img`, `op-tipp`, `op-einzeln`, `op-zaehler`, `op-slot`,
`op-hilfe`, `op-karten`, `op-status`, `op-alle`, `op-close`
Sonstiges: `app`, `hinweis`

### Attribute und Klassen, die der Code setzt oder liest

- Seiten: `data-view="start|packs|rad|album|konto|mehr"`, Menü: `data-tab="…"` und `aria-current="page"`
- Design-Wahl: `data-design="light|dark"`; das aktive Design steht als `data-theme` auf `<html>`
  (`light` = Silber, `dark` = Schwarz)
- Menü: Klasse `punkt` = roter Punkt «etwas ist bereit»
- Start-Badge: Klasse `bereit` wenn das Gratis-Pack bereit ist
- Karussell: `li[data-index]`, CSS-Variablen `--s` (Grösse) und `--o` (Deckkraft) pro Pack
- Reiter: `button[data-stufe]` mit `aria-selected`
- Album-Kategorien: `button[data-filter]` mit `aria-pressed`
- Karten: `.karte.rar-<seltenheit>`, `.fehlt` (noch nicht gefunden), `.k-anzahl` (×2 …)
- Aufdecken: `.flip`, `.flip-innen`, `.flip-seite`, `.flip-vorne`, `.flip-rueck`, Zustände `.offen`, `.selten`, `.neu`, `.weg`, `.flip-rein`
- Pack-Animation: `.op-shake`, `.op-reisst`; Übersicht `li.neu`
- Rad: `#rad-buehne.bereit` (kann gedreht werden), `.dreht` (dreht gerade); Gewinn-Fenster: `.preis-standard|silber|gold|platin|nichts`
- Seitenwechsel: `.view`, `.von-rechts`, `.von-links`

## Die 7 Karten-Seltenheiten (Farben laut Kartenliste)

| Klasse | Name | Farbe | Gestaltung |
| --- | --- | --- | --- |
| `.rar-common` | Common | Grau | schlichte Fahrzeugkarte |
| `.rar-uncommon` | Uncommon | Grün | farbiger Rahmen |
| `.rar-rare` | Rare | Blau | Glanz und Landschaftsmotiv |
| `.rar-epic` | Epic | Violett | holografische Akzente |
| `.rar-mythic` | Mythic | Rot und Kupfer | aufwendiges eigenes Motiv |
| `.rar-legendary` | Legendary | Gold | Goldrahmen, bildfüllende Illustration |
| `.rar-special` | Special | Prismatisch und Schwarz | exklusive Komposition, besonderer Rahmen |

Jede Karte hat: Karten-ID (`RB001`, `V01`, `S01`), Fahrzeug, Beiname, Bahn, Bereich, Seltenheit.
Fahrzeugbilder gibt es noch nicht; im Moment steht eine Zug-Skizze als Platzhalter.

## Bildschirmgrössen

- Grundlayout: Handy (bis 1099 px), Menü unten
- Ab 1100 px: Computer-Layout, Menü oben in der Kopfzeile (`@media (min-width:1100px)` am Ende von `style.css`)

## Nach jeder Änderung prüfen

1. Vorschau öffnen, beide Designs prüfen (Konto → Design: Silber / Schwarz)
2. Ein Pack öffnen: Aufreissen, Karten einzeln aufdecken und wegwischen, Übersicht am Schluss
3. Album: Filter, Suche, «Nur gesammelte»
4. Glücksrad drehen
5. Browser-Konsole ohne Fehler

Zum Testen: in der Konsole `app.daten.vorrat = {'gold-1': 3}; speichern(); aktualisiereAlles();`
gibt 3 Gold-Packs. «Konto → Alles zurücksetzen» löscht den Spielstand.
