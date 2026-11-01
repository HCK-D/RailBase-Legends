# Anleitung für KI-Assistenten (Codex, Claude …)

Projekt: **RailBase Legends – Beta** (früher «RailBase Sammelkarten»; der Ordner heisst weiter sammelkarten-beta).
Ein Sammelkarten-Spiel als Webseite: Packs öffnen,
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
| `css/karten.css` | Aussehen der Karten-Vorderseite (Rahmen je Seltenheit, Laschen, Bild-Szene, Bahn-Chip, Flagge). Die Zug-Zeichnungen stehen als `<symbol>` in `js/karten.js` (`SZENE_SPRITE`), die Bahn-Farben in `BAHN_FARBE`. Klassen `.karte`, `.rar-*`, `.fehlt`, `.k-glanz`, `.k-anzahl` und `data-karte` behalten |
| `assets/` | neue Bilder (am besten `.webp`) |

## Was NICHT geändert werden darf

- Die Spiel-Logik in `js/app.js`, `js/oeffnen.js`, `js/rad.js`, `js/store.js`
  (ausser reine Texte, die auf der Seite erscheinen)
- `js/daten/kartenliste.js` (die 308 Karten, Quelle: Word-Dokument des Besitzers)
- Chancen, Garantie, XP und Level in `js/karten.js` (Spielregeln, legt der Besitzer fest)
- Der Speicher-Schlüssel `sk-beta-v1` und `sk-theme` im localStorage

### IDs, die der Code braucht (müssen im HTML bleiben)

Kopf: `avatar`, `lvl` (nur die Zahl), `lvl-balken`, `lvl-xp` (Level-Kapsel `.level-chip`, Ring über `--xp`)
Mehr (Sammler-Level): `level-zahl`, `xp-level`, `xp-balken`, `xp-zahl`
Start (mit den Packs auf derselben Seite): `start-badge` (Knopf mit einem `<use>` und einem `<span>` darin),
`pk-reiter`, `pk-karussell`, `pk-stelle`, `pk-punkte`, `tk-vorrat` (kleine Zeile unter dem Karussell: Vorrat und Garantie).
Keine Pfeile und kein «Pack öffnen»-Knopf: gewischt wird auf den Packs, das Pack in der Mitte antippen öffnet es.
Rad: `rad-buehne` (das Rad ist zum Drücken), `rad-svg`, `rad-btn`, `rad-btn-txt`, `rad-info`
Gewinn-Fenster vom Rad: `gewinn`, `gw-img`, `gw-leer`, `gw-kicker`, `gw-titel`, `gw-text`, `gw-oeffnen`, `gw-oeffnen-icon`, `gw-oeffnen-txt`, `gw-spaeter`
Album: `st-entdeckt`, `st-karten`, `st-geoeffnet`, `rar-liste`, `al-suche`, `al-bahn`, `al-nur-meine`,
`sam-titel`, `sam-karten`, `sam-leer`
Konto: `avatar-gross`, `profil-name`, `profil-level`, `konto-form`, `konto-name`, `reset-btn`
Pack öffnen: `opener`, `op-titel`, `op-pack`, `op-img`, `op-tipp`, `op-einzeln`, `op-zaehler`, `op-slot`,
`op-hilfe`, `op-karten`, `op-status`, `op-alle`, `op-close`
Sonstiges: `app`, `hinweis`

### Attribute und Klassen, die der Code setzt oder liest

- Seiten: `data-view="start|rad|album|shop|konto|freunde|mehr"`, Menü: `data-tab="…"` und `aria-current="page"`.
  Freunde und Konto erreicht man über Mehr (Freunde oben links, Konto und Design oben rechts)
- Menü-Reihenfolge: Rad, Album, Start, Shop, Mehr. Start ist `.nav-mitte` mit `.nav-kappe` (hebt den Balken an)
  und `.nav-rund` (runder Knopf über dem Balken, nur auf dem Handy)
- Design-Wahl: `data-design="light|dark"`; das aktive Design steht als `data-theme` auf `<html>`
  (`light` = Silber, `dark` = Schwarz)
- Menü: Klasse `punkt` = roter Punkt «etwas ist bereit»
- Start-Badge: Klasse `bereit` wenn das Gratis-Pack bereit ist
- Karussell: `li[data-index]`, CSS-Variablen `--s` (Grösse) und `--o` (Deckkraft) pro Pack
- Reiter: `button[data-stufe]` mit `aria-selected`
- Album-Kategorien: `button[data-filter]` mit `aria-pressed`
- Karten: `.karte.rar-<seltenheit>`, `.fehlt` (noch nicht gefunden), `.k-anzahl` (×2 …)
- Aufdecken: `.flip`, `.flip-innen`, `.flip-seite`, `.flip-vorne`, `.flip-rueck`, Zustände `.offen`, `.neu`, `.weg`,
  `.flip-stapel` (erste Karte), `.flip-naechste`, `.ahnung` (Rare), `.spannung` (kurz vor dem Umdrehen einer Rare-Karte).
  Ab Epic `.hoch` und beim Tippen `.laedt`; am `#opener` `.fx-laedt`. Licht, Strahlen, Druckwellen, Funken und Konfetti
  malt `js/enthuellung.js` (`Enthuellung`) auf die Zeichenflächen `#fx-hinten` und `#fx-vorne`: Aufladen mit Farbstufen
  Epic → Mythic → Legendary → Special, dann Knall und Nachglühen. Keine grossen Leucht-Elemente im Pack-Fenster bauen:
  auf dem Handy läuft sonst der Grafikspeicher voll und das Bild flackert.
  Während das Pack offen ist, trägt `body` die Klasse `.pack-offen` (App dahinter ausgeblendet, ihre Animationen ruhen).
  Während der Einzelkarten hat `#opener` die Klasse `.einzeln` und scrollt nicht (Effekte ragen über den Rand).
  Hinter der obersten Karte liegt der Stapel `.op-stapel` mit `.op-stapel-karte`.
- Pack-Animation als Szene: `.op-druck` (gedrückt) → `.op-feder` → `.op-shake` (Naht reisst) → `.op-reisst` (Hülle fällt) → Stapel `.stapel-rein`.
  Licht je Stufe über `data-stufe` am `#opener` und an den Karussell-`li` (`--licht`, `--staerke`). Übersicht `li.neu`, Fortschritt
  `opf-neu`, `opf-sammlung`, `opf-sammel-balken`; neue Karten fliegen beim Schliessen ins Album (`Gefuehl.insAlbum`)
- Rad: `#rad-buehne.bereit` (kann gedreht werden), `.dreht` (dreht gerade); Gewinn-Fenster: `.preis-standard|silber|gold|platin|nichts`
- Seitenwechsel: `.view`, `.von-rechts`, `.von-links`

## Spielgefühl (Töne, Vibration, Effekte)

- `js/spielgefuehl.js` (`Gefuehl`): Töne (im Browser erzeugt, keine Ton-Dateien), Vibration, Konfetti,
  grosse Schriftzüge, Neigen der Karten mit Holo-Glanz, Gross-Ansicht einer Karte
- `css/spielgefuehl.css`: das Aussehen dazu (Vorahnung auf der Kartenrückseite, Banner, Konfetti, Glanz, «Neu»-Sticker)
- Ein/aus: Konto → «Töne und Vibration» (`ton-an`, gespeichert als `app.daten.ton`)
- Neu gefundene Karten: `app.daten.ungesehen` (Sticker «Neu» und ganz oben im Album, bis man das Album verlässt)
- IDs: `kv`, `kv-buehne`, `kv-karte`, `kv-info`, `kv-zu` (Gross-Ansicht), `op-stage`, `op-fortschritt`, `opf-level`,
  `opf-xp`, `opf-balken`, `opf-sammlung` (XP-Balken nach dem Öffnen), `st-balken`, `st-prozent` (Album-Fortschritt)

## Tägliche Belohnungen

- `js/taeglich.js` (`Taeglich`): Login-Serie über 7 Tage (`SERIE_BELOHNUNGEN`) und 3 Tagesaufgaben pro Tag
  (`AUFGABEN`, die erste immer, zwei wechseln täglich), Bonus für alle Aufgaben (`AUFGABEN_BONUS`). Alle Mengen sind Platzhalter.
- Ein Tag ist ein Kalendertag auf dem Gerät. Wer einen Tag auslässt, fängt die Serie wieder bei Tag 1 an.
- Gespeichert in `app.daten.taeglich` (siehe `store.js`). Gezählt wird mit `Taeglich.zaehle('packs' | 'rad' | 'neu' | 'selten' | 'verwerten' | 'kauf')`.
- Fenster: `tb`, `tb-serie`, `tb-tage`, `tb-holen`, `tb-holen-txt`, `tb-aufgaben`, `tb-bonus`, `tb-bonus-bild`, `tb-bonus-text`,
  `tb-bonus-knopf`, `tb-neu`, `tb-zu`. Eintrag auf der Mehr-Seite: `tb-oeffnen`, `tb-eintrag-text`. Aussehen: `css/taeglich.css`.
- Das Fenster geht einmal am Tag von selbst auf, wenn die Serien-Belohnung bereit ist. Sonst: Start-Badge «Tagesbelohnung bereit» oder Mehr.

## Freunde und Geschenke

- Freunde-Seite (`#freunde`): eigene ID mit Teilen-Knopf (`id-teilen`, Teilen-Menü des Handys, sonst Kopieren),
  Freund hinzufügen, Liste der Freunde. Geschenk einlösen (`geschenk-form`, `geschenk-eingabe`) steht im Konto unter Design.
- Schenken: im Kauf-Fenster des Shops «Einem Freund schenken» (`frage-extra`), nur alle 48 Stunden (`app.daten.geschenkZeit`).
  Ohne Server entsteht ein Geschenk-Code `RBG-…` (Pack, Empfänger-ID, Absender-ID, Prüfzeichen), den man teilt.
  Nur der Empfänger kann ihn einlösen, jeden Code nur einmal (`app.daten.eingeloest`). Fenster: `geschenk`, `geschenk-text`,
  `geschenk-freunde`, `geschenk-code-box`, `geschenk-code`, `geschenk-zu`, `geschenk-teilen`.

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

### Fotos auf den Karten

243 Karten zeigen ein Foto von Railbase.ch (`assets/karten/fotos/<id>.webp`, 520 × 589 px, schon auf das Bildfeld
`.k-bild` zugeschnitten). Welche Karte ein Foto hat, und wer es gemacht hat, steht in `js/daten/kartenfotos.js`.
Karten ohne Eintrag zeigen weiter die Zug-Zeichnung (`SZENE_SPRITE`).

Die Fotos stammen fast alle aus Wikimedia Commons (CC BY, CC BY-SA, CC0, gemeinfrei). Die Lizenzen verlangen den
Namen des Fotografen und die Lizenz: darum der Nachweis unter der Grossansicht (`#kv-foto`) und die Liste unter
Mehr → Bildnachweise (`#bild-info`). **Beides muss bleiben.** Neue Fotos nur mit freier Lizenz oder vom Besitzer (HCKD).

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
