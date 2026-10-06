/**
 * fonts-fetch.mjs — holt die Webfonts von Google und legt sie lokal ab.
 *
 *   npm run fonts:fetch
 *
 * Danach in site.config.mjs `fonts.selfHost` auf true setzen und bauen.
 * Ab dann lädt die Seite keine Schriften mehr von Google:
 *
 *   - kein Verbindungsaufbau des Besuchers zu einem Google-Server,
 *     also auch keine Übertragung seiner IP-Adresse dorthin
 *   - ein Abschnitt weniger in der Datenschutzerklärung
 *   - schneller, weil die Dateien vom selben Server kommen
 *
 * Wie es funktioniert: Google liefert unter fonts.googleapis.com ein
 * Stylesheet, dessen Inhalt vom User-Agent abhängt. Mit einer modernen
 * Browser-Kennung kommen woff2-Adressen zurück. Die werden hier ausgelesen
 * und heruntergeladen — nichts ist fest verdrahtet, denn Google ändert
 * diese Adressen regelmäßig.
 *
 * Läuft nur dort, wo fonts.googleapis.com erreichbar ist.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../site.config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const FONT_DIR = join(ROOT, "public", "assets", "fonts");
const CSS_ZIEL = join(ROOT, "public", "assets", "fonts.css");

/* Eine Kennung, die Google als modernen Browser erkennt — sonst liefert es
   alte Formate (ttf/eot) statt woff2. */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const quelle = config.fonts?.googleUrl;
if (!quelle) {
  console.error("In site.config.mjs fehlt fonts.googleUrl.");
  process.exit(1);
}

console.log("Hole das Stylesheet von Google …");
const res = await fetch(quelle, { headers: { "User-Agent": UA } });
if (!res.ok) {
  console.error(`Google antwortet mit HTTP ${res.status}.`);
  console.error("Dieses Skript braucht eine Umgebung, die fonts.googleapis.com erreicht.");
  process.exit(1);
}
let css = await res.text();

const adressen = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g) || [])];
if (!adressen.length) {
  console.error("Keine woff2-Adressen im Stylesheet gefunden.");
  process.exit(1);
}
console.log(`${adressen.length} Schriftdatei(en) gefunden.`);

await mkdir(FONT_DIR, { recursive: true });

let geladen = 0;
for (const url of adressen) {
  /* Sprechender Dateiname aus dem Pfad: .../instrumentsans/v5/xyz.woff2
     wird zu instrumentsans-v5-xyz.woff2 — eindeutig und lesbar. */
  const teile = url.split("/").slice(-3);
  const name = teile.join("-").replace(/[^A-Za-z0-9._-]/g, "-");

  const d = await fetch(url, { headers: { "User-Agent": UA } });
  if (!d.ok) {
    console.warn(`  ! ${name} — HTTP ${d.status}`);
    continue;
  }
  const buf = Buffer.from(await d.arrayBuffer());
  await writeFile(join(FONT_DIR, name), buf);
  css = css.split(url).join(`/assets/fonts/${name}`);
  console.log(`  ✓ ${name} (${Math.round(buf.length / 1024)} kB)`);
  geladen++;
}

const kopf = `/* ERZEUGT von scripts/fonts-fetch.mjs — nicht von Hand ändern.
   Quelle: ${quelle}
   Stand:  ${new Date().toISOString().slice(0, 10)}
   Die Schriftdateien liegen daneben in fonts/ und werden vom eigenen
   Server ausgeliefert. Kein Besucher baut mehr eine Verbindung zu Google auf. */

`;
await writeFile(CSS_ZIEL, kopf + css, "utf8");

console.log(`\n${geladen} Datei(en) in public/assets/fonts/`);
console.log("public/assets/fonts.css geschrieben.");
console.log("\nJetzt in site.config.mjs  fonts.selfHost: true  setzen, dann:");
console.log("  npm run build");
