/**
 * Prüft, dass der Worker die alten Wix-Adressen von linzer-kammerorchester.at
 * richtig weiterleitet, auf www. führt und /api/subscribe erreichbar ist.
 *
 *   npm test          (baut vorher, damit worker/redirects.generated.js stimmt)
 */
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert";
import worker from "../worker/index.js";

let bestanden = 0;
const ok = (bedingung, text) => { assert.ok(bedingung, text); console.log("  ✓ " + text); bestanden++; };

const BASIS = "https://www.linzer-kammerorchester.at";
async function hole(pfad, host = BASIS, init) {
  const env = { ASSETS: { fetch: async () => new Response("ASSET", { status: 200 }) } };
  return worker.fetch(new Request(host + pfad, init), env, {});
}
const ziel = (res) => (res.headers.get("location") || "").replace(BASIS, "");

console.log("\nWeiterleitungen linzer-kammerorchester.at\n");

for (const [alt, neu] of [["/blank", "/orchester"], ["/blank-1", "/newsletter"], ["/blank-2", "/impressum"], ["/blank-1-1", "/mitspielen"], ["/event-list", "/konzerte"]]) {
  const r = await hole(alt);
  ok(r.status === 301 && ziel(r) === neu, `${alt} → ${neu} (301)`);
}

/* Jeder Wix-Termin muss einen Eintrag im Events-Hub treffen. */
const roh = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
const lade = (rel, re) => { try { return new Set(readdirSync(new URL(rel, import.meta.url)).map((f) => f.replace(/\.md$/, "").replace(re, ""))); } catch { return null; } };
const evSlugs = lade("../../hubs/events-hub/content/events/", /^\d{4}-\d{2}-\d{2}-/);
const blogSlugs = lade("../../hubs/blog-hub/content/posts/", /^\d{4}-\d{2}-\d{2}-/);

const termine = roh.split("\n").filter((z) => /^\/event-details\/[^*\s]+\s+\/event\?event=/.test(z));
ok(termine.length === 8, `8 Termin-Regeln (alle Wix-Termine außer dem Entwurf), gefunden: ${termine.length}`);
for (const zeile of termine) {
  const [von, nach] = zeile.trim().split(/\s+/);
  const r = await hole(von);
  if (ziel(r) !== nach) assert.fail(`${von} führt nach ${ziel(r)} statt ${nach}`);
  const slug = new URL(nach, BASIS).searchParams.get("event");
  if (evSlugs && !evSlugs.has(slug)) assert.fail(`${von}: ${slug} gibt es im Events-Hub nicht`);
}
ok(true, `alle Termin-Adressen leiten richtig${evSlugs ? " und treffen einen Eintrag im Hub" : ""}`);
ok(ziel(await hole("/event-details/gibt-es-nicht")) === "/konzerte", "unbekannter Termin → /konzerte");

const posts = roh.split("\n").filter((z) => /^\/post\/[^*\s]+\s+\/post\?post=/.test(z));
for (const zeile of posts) {
  const [von, nach] = zeile.trim().split(/\s+/);
  const r = await hole(von);
  if (ziel(r) !== nach) assert.fail(`${von} führt nach ${ziel(r)} statt ${nach}`);
  const slug = new URL(nach, BASIS).searchParams.get("post");
  if (blogSlugs && !blogSlugs.has(slug)) assert.fail(`${von}: ${slug} gibt es im Blog-Hub nicht`);
}
ok(posts.length === 3, "3 Beitrags-Adressen leiten richtig");
ok(ziel(await hole("/post/der-fr%C3%BChling-kehrte-ein")) === "/post?post=der-fruehling-kehrte-ein", "Umlaut-Adresse (Frühling) wird erkannt");

{
  const r = await hole("/orchester", "https://linzer-kammerorchester.at");
  ok(r.status === 301 && r.headers.get("location") === BASIS + "/orchester", "ohne www → www. (301)");
  const r2 = await hole("/blank", "https://linzer-kammerorchester.at");
  ok(r2.headers.get("location") === BASIS + "/orchester", "ohne www + alte Adresse: EIN Sprung");
  const r3 = await hole("/konzerte");
  ok(r3.status === 200 && (await r3.text()) === "ASSET", "/konzerte geht an die Asset-Schicht");
  const r4 = await hole("/blog");
  ok(r4.status === 200, "/blog bleibt /blog (gleiche Adresse wie auf Wix)");
  const r5 = await hole("/api/subscribe");
  ok(r5.status === 405, "/api/subscribe nimmt nur POST an");
  const r6 = await hole("/api/subscribe", BASIS, { method: "POST", body: JSON.stringify({ email: "a@b.at", consent: true }), headers: { "Content-Type": "application/json" } });
  ok(r6.status === 500, "/api/subscribe ohne Secrets → 500 statt stiller Erfolg");
}

{
  const zweihundert = roh.split("\n").filter((z) => !z.trim().startsWith("#") && /\s2\d\d\s*$/.test(z));
  ok(zweihundert.length === 0, "keine 200er-Umschreibungen in _redirects");
  const wr = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  ok(/"run_worker_first":\s*true/.test(wr), "run_worker_first: true — der Worker entscheidet");
}

console.log(`\n${bestanden} Prüfungen bestanden\n`);
