# lko-site — www.linzer-kammerorchester.at

Website des **Linzer Kammerorchesters**, gebaut wie babowalls.com / cleebration.com:
ein kleines Node-Skript setzt die Seiten aus Bausteinen zusammen, die Inhalte kommen
zur Laufzeit aus **zwei Feeds der cleebration-Hubs** (`sites: [kammerorchester]`).
Angelegt 06.10.2026 (Claude, Projekt „Music LKO“). Theme: tiefes Blau, Logo weinrot.

| Adresse | Inhalt | Quelle |
|---|---|---|
| `/` | nächster Auftritt, „Wer wir sind“ (Wix-Text), 4 Kacheln, 3 Neuigkeiten | Events- + Blog-Hub |
| `/konzerte` · `/event?event=<slug>` | kommende + vergangene Konzerte | Events-Hub |
| `/blog` · `/post?post=<slug>` | Neuigkeiten | Blog-Hub |
| `/orchester` | Text + Ensemble (Wix-Seite „Orchester“) | hier |
| `/newsletter` | Anmeldung → `/api/subscribe` → EmailOctopus (eigenes Konto) | Worker |
| `/mitspielen` | vorbereitete E-Mail statt Wix-Formular | hier |
| `/impressum` · `/datenschutz` | Wix-Impressum · Datenschutz von cleebration angepasst | hier |

Alte Wix-Adressen (`/blank…`, `/event-details/…`, `/post/…`) leitet der Worker weiter
(`public/_redirects`, geprüft in `test/redirects.test.mjs`).

## Einmalig

```bash
npm install
npm run fonts:fetch                       # nur falls public/assets/fonts fehlt
npx wrangler secret put EMAILOCTOPUS_API_KEY
npx wrangler secret put EMAILOCTOPUS_LIST_ID
```

In EmailOctopus an der Liste **Double-Opt-in einschalten** (sonst stimmt die Datenschutzerklärung nicht).

## Befehle

```bash
npm test             # baut und prüft Weiterleitungen + Module
npm run preflight    # vor dem Livegang: Feeds erreichbar? Bilder noch bei Wix?
npm run deploy       # baut und lädt zu Cloudflare (lko-site.<konto>.workers.dev)
```

`routes` in `wrangler.jsonc` erst in Schritt 2 des Umzugs einkommentieren
(nicht vor dem Herbstkonzert am 05.11.2026). Ablauf: `1! claude/05 Projekte/Music LKO/Output/LKO-Umzug.md`.
