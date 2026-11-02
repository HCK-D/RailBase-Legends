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
| `css/karten.css` | Aussehen der Karten-Vorderseite nach dem Entwurf «Sammel Karten» (Rahmen mit schrägen Ecken, Nummer- und Seltenheits-Lasche, Foto über die ganze Karte, schräges Feld mit Bahn, Name und Fahrzeug, Flaggen-Ecke) und die Effekte je Seltenheit (`.k-fx`). Farben je Seltenheit über `--rahmen`, `--k-akzent`, `--k-lasche`, `--k-feld`, `--k-name`, `--k-unter`. Die Bahn-Farben stehen in `BAHN_FARBE` (`js/karten.js`). Klassen `.karte`, `.rar-*`, `.fehlt`, `.k-glanz`, `.k-anzahl` und `data-karte` behalten |
| `assets/` | neue Bilder (am besten `.webp`) |

## Was NICHT geändert werden darf

- Die Spiel-Logik in `js/app.js`, `js/oeffnen.js`, `js/rad.js`, `js/store.js`
  (ausser reine Texte, die auf der Seite erscheinen)
- `js/daten/kartenliste.js` (308 Karten aus dem Word-Dokument des Besitzers und 60 Karten der 6 neuen Bahnen)
- Chancen, Garantie, XP und Level in `js/karten.js` (Spielregeln, legt der Besitzer fest)
- Der Speicher-Schlüssel `sk-beta-v1` und `sk-theme` im localStorage

### IDs, die der Code braucht (müssen im HTML bleiben)

Kopf: `avatar`, `lvl` (nur die Zahl), `lvl-balken`, `lvl-xp` (Level-Kapsel `.level-chip`, Ring über `--xp`)
Mehr (Sammler-Level): `level-zahl`, `xp-level`, `xp-balken`, `xp-zahl`
Start (mit den Packs auf derselben Seite): `start-badge` (Knopf mit einem `<use>` und einem `<span>` darin),
`pk-reiter`, `pk-karussell`, `pk-stelle`, `pk-punkte`, `tk-vorrat` (kleine Zeile unter dem Karussell: Name und Vorrat;
den Startbonus zeigt das Willkommens-Fenster).
Willkommen beim ersten Start (`js/app.js`, `zeigeWillkommen`, Aussehen in `css/taeglich.css`): `willkommen`, `wk-liste`,
`wk-annehmen`. Erst «Annehmen» schreibt das Startguthaben gut (`app.daten.bonusMuenzen`); danach kann die Tagesbelohnung aufgehen.
Keine Pfeile und kein «Pack öffnen»-Knopf: gewischt wird auf den Packs, das Pack in der Mitte antippen öffnet es.
Rad: `rad-buehne` (das Rad ist zum Drücken), `rad-svg`, `rad-btn`, `rad-btn-txt`, `rad-info`
Gewinn-Fenster vom Rad: `gewinn`, `gw-img`, `gw-leer`, `gw-kicker`, `gw-titel`, `gw-text`, `gw-oeffnen`, `gw-oeffnen-icon`, `gw-oeffnen-txt`, `gw-spaeter`
Album: `st-entdeckt`, `st-karten`, `st-geoeffnet`, `rar-liste`, `al-suche`, `al-bahn`, `al-nur-meine`,
`sam-titel`, `sam-karten`, `sam-leer`
Konto: `avatar-gross`, `profil-name`, `profil-titel`, `profil-level`, `konto-form`, `konto-name`, `titel-wahl`, `konto-titel`, `reset-btn`
Pack öffnen: `opener`, `op-titel`, `op-pack`, `op-img`, `op-tipp`, `op-einzeln`, `op-zaehler`, `op-slot`,
`op-hilfe`, `op-karten`, `op-status`, `op-alle`, `op-close`
Sonstiges: `app`, `hinweis`

### Attribute und Klassen, die der Code setzt oder liest

- Seiten: `data-view="start|rad|album|shop|konto|freunde|tauschen|erfolge|mehr"`, Menü: `data-tab="…"` und `aria-current="page"`.
  Freunde, Tauschen, Erfolge und Konto erreicht man über Mehr
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
- IDs: `kv`, `kv-buehne`, `kv-karte`, `kv-verwerten`, `kv-verwerten-info`, `kv-verwerten-preis`, `kv-zu` (Gross-Ansicht), `op-stage`, `op-fortschritt`, `opf-level`,
  `opf-xp`, `opf-balken`, `opf-sammlung` (XP-Balken nach dem Öffnen), `st-balken`, `st-prozent` (Album-Fortschritt)

## Tägliche Belohnungen

- `js/taeglich.js` (`Taeglich`): Login-Serie über 7 Tage (`SERIE_BELOHNUNGEN`) und 3 Tagesaufgaben pro Tag
  (`AUFGABEN`, die erste immer, zwei wechseln täglich), Bonus für alle Aufgaben (`AUFGABEN_BONUS`). Alle Mengen sind Platzhalter.
- Ein Tag ist ein Kalendertag auf dem Gerät. Wer einen Tag auslässt, fängt die Serie wieder bei Tag 1 an.
- Gespeichert in `app.daten.taeglich` (siehe `store.js`). Gezählt wird mit `Taeglich.zaehle('packs' | 'rad' | 'neu' | 'selten' | 'verwerten' | 'kauf')`.
- Fenster: `tb`, `tb-serie`, `tb-tage`, `tb-holen`, `tb-holen-txt`, `tb-aufgaben`, `tb-bonus`, `tb-bonus-bild`, `tb-bonus-text`,
  `tb-bonus-knopf`, `tb-neu`, `tb-zu`. Eintrag auf der Mehr-Seite: `tb-oeffnen`, `tb-eintrag-text`. Aussehen: `css/taeglich.css`.
- Das Fenster geht einmal am Tag von selbst auf, wenn die Serien-Belohnung bereit ist. Sonst: Start-Badge «Tagesbelohnung bereit» oder Mehr.

## Erfolge

- `js/erfolge.js` (`Erfolge`): Liste `ERFOLGE` (Gruppen in `ERFOLG_GRUPPEN`). Jeder Erfolg hat Stufen mit Ziel,
  Belohnung (`{ muenzen }`, `{ rubine }` oder `{ pack }`) und manchmal einem Titel. Alle Mengen sind Platzhalter.
- Der Fortschritt kommt meist aus dem Spielstand (Karten, Packs, Level, Freunde). Was dort fehlt, zählt
  `Erfolge.zaehle('verwertet' | 'gekauft' | 'geschenkt' | 'doppeltImPack' | 'legendaryBasis' | 'nachtzug')`.
- Gespeichert in `app.daten.erfolge` (`geschafft`, `abgeholt`, `zaehler`, siehe `store.js`), der gewählte Titel in `app.daten.titel`.
  Eine geschaffte Stufe bleibt geschafft, auch wenn der Wert später sinkt.
- Seite `#erfolge`: `erf-anzahl`, `erf-bereit`, `erf-balken`, `erf-filter` (`button[data-gruppe]` mit `aria-pressed`),
  `erf-liste` (`li.erf.bereit|offen|geheim|fertig`, `[data-abholen]`, `[data-ziel]`). Eintrag in der Liste der Mehr-Seite
  (nach «Rangliste»): `erf-oeffnen`, daneben die rote Zahl `erf-eintrag-text` (Belohnungen zum Abholen, Klasse `neu` = Hüpfer).
  Aussehen: `css/erfolge.css`.

## Tauschen (vorbereitet für die Online-Datenbank)

- `js/tauschen.js` (`Tauschen`), Aussehen `css/tauschen.css`. Regeln: nur doppelte Karten, gleiche Seltenheit 1 gegen 1,
  keine Special-Karten, höchstens 3 eigene offene Anfragen (`TAUSCH_MAX_OFFEN`), Anfragen verfallen nach 48 Stunden.
  Die Prüfung steht in `tauschFehler()`; der Server muss dieselben Regeln noch einmal prüfen.
- Alles, was später die Datenbank macht, läuft über ein Server-Objekt mit denselben Funktionen:
  `bereit`, `freunde()`, `sammlungVon(id)`, `anfragen()`, `sende({ an, gibt, will })`, `antworte(id, ja)`, `zurueckziehen(id)`.
  Heute gibt es zwei Fassungen: `SERVER_OHNE` (echte Seite: «Tauschen startet mit dem Anmelden») und `testServer()`
  (nur Vorschau, `TEST_ERLAUBT`: ein Test-Freund im Browser, Speicher `sk-tausch-test`). Für die Datenbank kommt eine
  dritte Fassung dazu; sonst muss am Tauschen nichts geändert werden.
- Was die Datenbank dafür braucht: Tabelle der Spieler (Freunde-ID, Name, Karten, Wunschliste), Tabelle der Anfragen
  (`id, von, an, gibt, will, status, zeit`) und eine Server-Funktion «annehmen», die in einem Schritt prüft und beide
  Karten tauscht (nie im Browser). Die Wunschliste (`app.daten.wunschliste`) wird dann für Freunde sichtbar.
- Seite `#tauschen`: kurzer Hinweis `tausch-status` (`data-status="ohne|test|online"`, `tausch-status-titel`, `tausch-status-text`),
  drei Reiter `tausch-reiter` (`button[data-reiter="anfragen|tauschen|vergangen"]` mit `aria-selected`, rote Zahl `tausch-reiter-zahl`)
  und die Teile `[data-teil]`: Anfragen `tausch-anfragen` (nur offene, `li.tausch-anfrage`, `.eingehend`; Knöpfe `[data-annehmen]`,
  `[data-ablehnen]`, `[data-zurueck]`), `tausch-anfragen-leer`; Tauschen `tausch-neu`, `tausch-wunsch` (`[data-wunsch-weg]`),
  `tausch-wunsch-leer`, `tausch-doppelte`, `tausch-doppelte-leer`; Vergangen `tausch-vergangen` (kurze Zeilen `li.tv-zeile.<status>`),
  `tausch-vergangen-leer`.
- Tausch-Szene über den ganzen Bildschirm (`tausch-szene`, `data-art="tausch|gesendet"`, `data-phase`): beim Tausch
  `raus` (deine Karte steigt aus dem Album-Knopf im Menü) → `treffen` (die Karte des Freundes kommt von oben) → `tausch`
  (Plätze tauschen, Licht in der Farbe der neuen Karte, `--licht`) → `rein` (neue Karte fliegt in den Album-Knopf) → `fertig`
  (Album-Knopf hüpft, leuchtet `.ts-leuchtet` und zeigt `.ts-plus` «+1»); beim Senden `zeigen` → `senden`.
  Das Menü bleibt dabei über der Szene sichtbar (`body.tausch-laeuft`); die Wege `--ts-album` und `--ts-freund` misst
  `messeWege()` am echten Album-Knopf (Handy unten, Computer oben).
  IDs: `ts-gibst`, `ts-bekommst`, `ts-avatar`, `ts-freund-name`, `ts-text`, `ts-weiter`. Antippen springt ans Ende.
  Fenster: `tausch-fenster`, `tausch-schritt`, `tausch-titel`, `tausch-text`, `tausch-inhalt` (`[data-freund]`, `[data-wahl]`),
  `tausch-zurueck`, `tausch-senden`. Unter Mehr: `tausch-oeffnen` mit roter Zahl `tausch-zahl` (Anfragen an dich).
- Wunschliste im Album: fehlende Karte antippen setzt oder entfernt sie (`Tauschen.wuensche(id)`), Sticker `li.ist-wunsch`.

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
| `.rar-common` | Common | Grau | Silberrahmen, helles Feld, keine Effekte |
| `.rar-uncommon` | Uncommon | Grün | grünes Feld, sanfter Lichtstreifen |
| `.rar-rare` | Rare | Blau | dunkelblaues Feld, blauer Lichtstreifen, Lichtpunkte |
| `.rar-epic` | Epic | Violett | dunkles Feld, Holo-Streifen, violetter Schimmer, funkelnde Sterne |
| `.rar-mythic` | Mythic | Rot und Kupfer | schwarzes Feld, atmende Glut am Rand, aufsteigende Funken |
| `.rar-legendary` | Legendary | Gold | Goldrahmen mit wanderndem Licht, helles Feld, Gold-Streifen, Gold-Glitzer |
| `.rar-special` | Special | Prismatisch und Schwarz | vorerst Regenbogen-Rahmen und Regenbogen-Streifen; eigenes Design kommt später |

Jede Karte hat: Karten-ID (`RB001`, `V01`, `S01`), Fahrzeug, Beiname, Bahn, Bereich, Seltenheit.

### Fotos auf den Karten

Im Spiel sind nur Karten mit Foto von Railbase.ch, im Moment 300 von 368 (`assets/karten/fotos/<id>.webp`,
520 × 589 px, schon auf das Bildfeld `.k-bild` zugeschnitten). Welche Karte ein Foto hat, und wer es gemacht hat,
steht in `js/daten/kartenfotos.js`; `KARTEN` in `js/karten.js` filtert `ALLE_KARTEN` danach. Gesammelte Karten,
die nicht mehr im Spiel sind, werden beim Start in RB Coins umgewandelt (`js/app.js`, Start).

Die Fotos stammen fast alle aus Wikimedia Commons (CC BY, CC BY-SA, CC0, gemeinfrei). Die Lizenzen verlangen den
Namen des Fotografen und die Lizenz: darum die Liste unter Mehr → Bildnachweise (`#bild-info`).
**Sie muss bleiben** (unter der Karte selbst steht auf Wunsch des Besitzers kein Nachweis mehr). Neue Fotos nur mit freier Lizenz, vom Besitzer (HCKD)
oder mit seiner Erlaubnis (`erlaubnis: true`, bisher Domino, Re 460, Re 420, Re 620 und Re 193).

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
