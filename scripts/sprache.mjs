#!/usr/bin/env node
/**
 * sprache.mjs – eine neue Sprache für diese Website erzeugen.
 *
 *   node scripts/sprache.mjs fr          übersetzt alles, was für "fr" fehlt
 *   UEBERSETZEN_TEST=1 node scripts/…    Probelauf ohne Claude-API (Texte nur markiert)
 *
 * Was übersetzt wird (nur Fehlendes – Vorhandenes bleibt unangetastet):
 *   1. public/assets/i18n/de.json  → <code>.json        (Menü, feste Texte)
 *   2. src/**.html: <… data-lang="de">…</…>  → Geschwister-Block data-lang="<code>"
 *      (Startseite, Über, Impressum, Datenschutz, Fußzeile …)
 *   3. public/assets/*.js: Tabellen SPRACHEN / STRINGS → Eintrag <code>
 *      (Beschriftungen der Event-, Blog-, Galerie- und Newsletter-Module)
 *   4. site.config.mjs: <code> in `locales` ergänzen
 *
 * Gestartet wird es von der Redaktion (Knopf „Sprache erzeugen“) über
 * .github/workflows/sprache.yml. Gepflegt in cleebration-web/_sprache/.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { uebersetzeObjekt, uebersetzeHtml } from "./uebersetzen.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VON = "de";
const NACH = process.argv[2];
const bericht = [];
const log = (s) => { console.log(s); bericht.push(s); };

// ---------- 1. Wörterbuch ----------
async function woerterbuch() {
  const dir = join(ROOT, "public/assets/i18n");
  const quelle = join(dir, `${VON}.json`);
  if (!existsSync(quelle)) return log("Wörterbuch: de.json fehlt – übersprungen.");
  const de = JSON.parse(await readFile(quelle, "utf8"));
  const ziel = join(dir, `${NACH}.json`);
  const da = existsSync(ziel) ? JSON.parse(await readFile(ziel, "utf8")) : {};
  const fehlt = fehlende(de, da);
  if (!fehlt) return log(`Wörterbuch: ${NACH}.json ist vollständig.`);
  const neu = await uebersetzeObjekt(fehlt, VON, NACH, "website UI labels and navigation");
  await writeFile(ziel, JSON.stringify(mische(da, neu), null, 2) + "\n");
  log(`Wörterbuch: ${zaehle(fehlt)} Texte nach ${NACH}.json übersetzt.`);
}

export function fehlende(quelle, ziel) {
  if (typeof quelle !== "object" || quelle === null || Array.isArray(quelle)) return ziel === undefined ? quelle : undefined;
  const out = {};
  for (const [k, v] of Object.entries(quelle)) {
    const f = fehlende(v, ziel?.[k]);
    if (f !== undefined) out[k] = f;
  }
  return Object.keys(out).length ? out : undefined;
}
const mische = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === "object" && !Array.isArray(v) ? mische(a?.[k] || {}, v) : v;
  return out;
};
const zaehle = (o) => (o && typeof o === "object" ? Object.values(o).reduce((n, v) => n + zaehle(v), 0) : 1);

// ---------- 2. data-lang-Blöcke ----------
async function htmlDateien(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await htmlDateien(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** Ende des Elements, das bei `start` mit <tag …> beginnt (gleichnamige Tags werden gezählt). */
export function elementEnde(html, start, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, "gi");
  re.lastIndex = start;
  let tiefe = 0;
  for (let m; (m = re.exec(html));) {
    if (m[1]) tiefe--;
    else if (!m[2]) tiefe++;
    if (tiefe === 0) return re.lastIndex;
  }
  throw new Error(`Kein schließendes </${tag}> ab Position ${start}`);
}

/** Sprachgruppen finden: de-Block + direkt folgende Geschwister mit data-lang. */
export function sprachGruppen(html) {
  const gruppen = [];
  const re = /<([a-z][a-z0-9-]*)\b[^>]*\sdata-lang="de"[^>]*>/gi;
  for (let m; (m = re.exec(html));) {
    const tag = m[1];
    const start = m.index;
    const ende = elementEnde(html, start, tag);
    const codes = ["de"];
    let letztes = ende;
    for (;;) {
      const rest = html.slice(letztes);
      const n = /^\s*<([a-z][a-z0-9-]*)\b[^>]*\sdata-lang="([^"]+)"[^>]*>/i.exec(rest);
      if (!n) break;
      const s = letztes + n[0].indexOf("<");
      codes.push(n[2]);
      letztes = elementEnde(html, s, n[1]);
    }
    const zeile = html.lastIndexOf("\n", start) + 1;
    const einzug = /^[ \t]*/.exec(html.slice(zeile))[0];
    gruppen.push({ tag, start, ende, oeffner: m[0], codes, letztes, einzug });
    re.lastIndex = ende;
  }
  return gruppen;
}

async function seiten() {
  let n = 0;
  for (const datei of await htmlDateien(join(ROOT, "src"))) {
    let html = await readFile(datei, "utf8");
    const gruppen = sprachGruppen(html).filter((g) => !g.codes.includes(NACH));
    if (!gruppen.length) continue;
    // von hinten einfügen, damit die Positionen davor stimmen
    for (const g of gruppen.reverse()) {
      const innen = html.slice(g.start + g.oeffner.length, g.ende - `</${g.tag}>`.length);
      const neu = await uebersetzeHtml(innen, VON, NACH, `page ${datei.split("/src/")[1]}`);
      const oeffner = g.oeffner.replace(/data-lang="de"/, `data-lang="${NACH}"`);
      html = html.slice(0, g.letztes) + `\n${g.einzug}${oeffner}${neu}</${g.tag}>` + html.slice(g.letztes);
      n++;
    }
    await writeFile(datei, html);
  }
  log(`Seiten: ${n} Textblöcke übersetzt.`);
}

// ---------- 3. Tabellen in den Modulen ----------

/** Klammer-Ende ab `start` (zeigt auf "{"), Strings und Kommentare werden übersprungen. */
export function klammerEnde(src, start) {
  let tiefe = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
      continue;
    }
    if (c === "{") tiefe++;
    else if (c === "}" && --tiefe === 0) return i + 1;
  }
  throw new Error("Klammer nicht geschlossen");
}

/** Einträge erster Ebene einer Tabelle `{ de: {…}, en: {…} }`. */
export function tabellenEintraege(src, auf) {
  const zu = klammerEnde(src, auf);
  const eintraege = [];
  const re = /(?:^|[{,]\s*|\n\s*)(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*:\s*\{/g;
  re.lastIndex = auf + 1;
  for (let m; (m = re.exec(src)) && m.index < zu;) {
    const k = m[1] || m[2];
    const s = re.lastIndex - 1;
    const e = klammerEnde(src, s);
    eintraege.push({ key: k, start: s, ende: e });
    re.lastIndex = e;
  }
  return { zu, eintraege };
}

export async function tabelleErgaenzen(src, name, nach, uebersetze) {
  const kopf = new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=\\s*\\{`).exec(src);
  if (!kopf) return null;
  const auf = kopf.index + kopf[0].length - 1;
  const { eintraege } = tabellenEintraege(src, auf);
  if (eintraege.some((e) => e.key === nach)) return null;
  const de = eintraege.find((e) => e.key === "de");
  if (!de) return null;
  const obj = new Function(`return (${src.slice(de.start, de.ende)});`)();
  const neu = await uebersetze(obj);
  const schluessel = /^[a-z]{2}$/.test(nach) ? nach : JSON.stringify(nach);
  const text = `${schluessel}: ${JSON.stringify(neu, null, 2).replace(/\n/g, "\n  ")}`;
  const nachDe = src.slice(de.ende);
  const komma = /^\s*,/.exec(nachDe);
  return komma
    ? src.slice(0, de.ende + komma[0].length) + `\n  ${text},` + nachDe.slice(komma[0].length)
    : src.slice(0, de.ende) + `,\n  ${text}` + nachDe;
}

async function module() {
  const dir = join(ROOT, "public/assets");
  if (!existsSync(dir)) return;
  for (const name of (await readdir(dir)).filter((f) => f.endsWith(".js"))) {
    const p = join(dir, name);
    let src = await readFile(p, "utf8");
    let geaendert = false;
    for (const tab of ["SPRACHEN", "STRINGS"]) {
      const next = await tabelleErgaenzen(src, tab, NACH, (o) => uebersetzeObjekt(o, VON, NACH, `UI labels of the ${name} widget`));
      if (next) { src = next; geaendert = true; }
    }
    if (geaendert) { await writeFile(p, src); log(`Modul: ${name} um ${NACH} ergänzt.`); }
  }
}

// ---------- 4. site.config.mjs ----------
export function localeErgaenzen(text, code) {
  const m = /^(\s*)locales:\s*\[([^\]]*)\]/m.exec(text);
  if (!m) throw new Error("„locales:“ in site.config.mjs nicht gefunden");
  const liste = [...m[2].matchAll(/"([^"]+)"|'([^']+)'/g)].map((x) => x[1] || x[2]);
  if (liste.includes(code)) return text;
  liste.push(code);
  return text.replace(m[0], `${m[1]}locales: [${liste.map((c) => JSON.stringify(c)).join(", ")}]`);
}

async function konfiguration() {
  const p = join(ROOT, "site.config.mjs");
  const t = await readFile(p, "utf8");
  const n = localeErgaenzen(t, NACH);
  if (n !== t) { await writeFile(p, n); log(`site.config.mjs: ${NACH} in locales ergänzt.`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!/^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/.test(NACH || "") || NACH === VON) {
    console.error("Aufruf: node scripts/sprache.mjs <sprachcode>   (z. B. fr, it, pt-BR)");
    process.exit(1);
  }
  await konfiguration();
  await woerterbuch();
  await seiten();
  await module();
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `## Sprache ${NACH}\n\n${bericht.map((b) => `- ${b}`).join("\n")}\n`, { flag: "a" });
  }
}
