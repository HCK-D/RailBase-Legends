# RailBase Sammelkarten – Beta

Ein Sammelkarten-Spiel im Stil von RailBase: Packs öffnen, Karten sammeln, jeden Tag ein Gratis-Pack.
Der Name und die Domain kommen später.

## Was schon da ist

- Startseite mit dem täglichen Gratis-Pack (1 Standard-Pack pro Tag, neu ab Mitternacht)
- 7 Packs in 4 Stufen: 1 Standard, 2 Silber, 2 Gold, 2 Platin
- Pack öffnen mit Animation (Pack wackelt, reisst auf, 5 Karten drehen sich auf)
- Navigation unten: Start, Packs, Sammlung, Konto, Mehr
- Hell und dunkel, für Handy und Computer

Die Karten selbst fehlen noch. Im Moment zeigt ein geöffnetes Pack 5 Kartenrückseiten.

## Ordner

| Ordner / Datei | Inhalt |
| --- | --- |
| `index.html` | die ganze Seite |
| `css/style.css` | Design (Farben wie RailBase.ch) |
| `js/app.js` | Packs, Gratis-Pack, Pack öffnen, Konto |
| `js/store.js` | Speichern der Daten (hier kommt später die Online-Datenbank rein) |
| `assets/packs/` | Pack-Bilder gross (zum Öffnen) |
| `assets/packs/klein/` | Pack-Bilder klein (für Listen) |

## Speichern der Daten

In der Beta speichert die Seite alles im Browser (localStorage). Das heisst:
jedes Gerät und jeder Browser hat sein eigenes Konto.

Für die Online-Datenbank ist **Supabase** geplant (gratis Stufe, mit Login).
Dann wird nur `js/store.js` ausgetauscht, der Rest der Seite bleibt gleich.

## Online stellen (GitHub Pages)

1. Auf github.com ein neues Repository anlegen, z. B. `railbase-sammelkarten`.
2. Diesen Ordner hochladen (push).
3. Im Repository: **Settings → Pages → Branch: main, Ordner: / (root)** wählen.
4. Nach ein bis zwei Minuten ist die Beta unter `https://<dein-name>.github.io/railbase-sammelkarten/` erreichbar.

Die eigene Domain kann später unter **Settings → Pages → Custom domain** eingetragen werden.
