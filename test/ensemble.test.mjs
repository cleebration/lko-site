/**
 * Prüft den Ensemble-Teil der Seite /orchester (scripts/ensemble.mjs + src/data/ensemble.json).
 *  - Startdaten ergeben genau die Liste, die bis 08.10.2026 fest im HTML stand
 *  - inaktive Personen, leere Felder und leere Abschnitte erscheinen nicht
 *  - Foto/Link für alle, Bio nur bei Solist*innen; unsichere Links werden verworfen
 */
import { readFile } from "node:fs/promises";
import { renderEnsemble, sichereUrl } from "../scripts/ensemble.mjs";

let fehler = 0;
const ok = (b, msg) => { console.log(`${b ? "✓" : "✗"} ${msg}`); if (!b) fehler++; };
const text = (html) => html.replace(/<span data-lang="en">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Die echte Datei ändert sich laufend (Redaktion) – sie wird nur auf Gültigkeit geprüft.
const echt = JSON.parse(await readFile(new URL("../src/data/ensemble.json", import.meta.url), "utf8"));
ok(Array.isArray(echt.gruppen) && Array.isArray(echt.personen), "src/data/ensemble.json: gruppen + personen");
ok(new Set(echt.personen.map((p) => p.id)).size === echt.personen.length, "src/data/ensemble.json: IDs eindeutig");
ok(echt.personen.every((p) => ["ensemble", "gast", "solist"].includes(p.art || "ensemble")), "src/data/ensemble.json: Art gültig");
ok(echt.personen.every((p) => p.art !== "ensemble" || echt.gruppen.some((g) => g.key === p.gruppe)), "src/data/ensemble.json: jede Stimmgruppe vorhanden");
renderEnsemble(echt, ["de", "en"], "de");

// Startdaten (Stand 09.10.2026) als feste Vorlage
const data = JSON.parse(await readFile(new URL("./fixtures/ensemble-start.json", import.meta.url), "utf8"));
ok(data.personen.length === 20, `20 Personen in den Startdaten (gefunden ${data.personen.length})`);

const html = renderEnsemble(data, ["de", "en"], "de");
const soll =
  "1. Violine Dieter Weiß (Konzertmeister)Josef Hölzl (Konzertmeister Stv.)Dietmar FuchslochGerlinde Gürtler-LaubholdCornelia PommerMichael Schrattbauer " +
  "2. Violine Alexandra BruckmüllerEwald GreslehnerRomana Gschiel-HötzlElisabeth Gutternigg (Obmann-Stellvertreterin)Johanna Narowetz " +
  "Viola Hans Gutternigg (Kassier)Johanna HohenwallnerHelene PurtschellerMartin Weiss " +
  "Violoncello Martin Mairinger (Obmann)Stephan PunderlitschekGunther SkalaLea Voithofer " +
  "Kontrabass Chris H. Leeb (Schriftführer)";
const ist = text(html.replace(/<\/h3>/g, "</h3> ").replace(/<\/ul><\/div>/g, " "));
ok(ist === soll, "Startdaten = bisherige Liste (Deutsch)");
if (ist !== soll) console.log("   ist:  " + ist + "\n   soll: " + soll);
ok(html.includes('<span data-lang="en">concertmaster</span>'), "englische Rollen vorhanden");
ok(!/Zu Gast|Solist/.test(html), "keine Gäste/Solist*innen → keine Abschnitte");

const probe = {
  gruppen: [{ key: "vl1", name: { de: "1. Violine" } }, { key: "fl", name: { de: "Flöte", en: "Flute" } }],
  personen: [
    { id: "a", name: "Anna", art: "ensemble", gruppe: "vl1", reihenfolge: 20, aktiv: true, foto: "/assets/img/personen/a.jpg", link: "https://anna.example" },
    { id: "b", name: "Berta", art: "ensemble", gruppe: "vl1", reihenfolge: 10, aktiv: true, bio: { de: "soll nicht erscheinen" } },
    { id: "c", name: "Cäsar", art: "ensemble", gruppe: "fl", aktiv: false },
    { id: "d", name: "Dora", art: "gast", instrument: { de: "Oboe", en: "oboe" }, aktiv: true, link: "javascript:alert(1)" },
    { id: "e", name: "Emil <b>", art: "solist", instrument: { de: "Bariton" }, bio: { de: "Kurz.", en: "Short." }, link: "https://emil.example", foto: "", aktiv: true },
    { id: "f", name: "Frieda", art: "solist", aktiv: false },
  ],
};
const h = renderEnsemble(probe, ["de", "en"], "de");
ok(h.indexOf("Berta") < h.indexOf("Anna"), "Reihenfolge nach `reihenfolge`");
ok(!h.includes("Cäsar") && !h.includes("Flöte"), "inaktive Person und dadurch leere Gruppe fehlen");
ok(h.includes('src="/assets/img/personen/a.jpg"') && h.includes('href="https://anna.example/"'), "Foto + Link bei Ensemble-Mitglied");
ok(!h.includes("soll nicht erscheinen"), "Bio nur bei Solist*innen");
ok(h.includes("Zu Gast") && h.includes("Oboe") && !h.includes("javascript:"), "Gast mit Instrument, unsicherer Link verworfen");
ok(h.includes("Solist*innen") && h.includes("Emil &lt;b&gt;") && h.includes("Short.") && !h.includes("Frieda"), "Solist*innen: Name maskiert, Bio mehrsprachig, inaktive fehlen");
ok(!/<img[^>]*src=""/.test(h), "leeres Foto erzeugt kein Bild");
const teil = renderEnsemble({ gruppen: [{ key: "vl1", name: { de: "V" } }], personen: [
  { id: "x", name: "X", art: "ensemble", gruppe: "vl1", aktiv: true, position: { de: "Konzertmeister", en: "concertmaster" }, funktion: { de: "Kassier" } },
  { id: "s", name: "S", art: "solist", aktiv: true, funktion: { de: "Obmann", en: "chairman" } }] }, ["de", "en"], "de");
ok(/<span class="rolle">Kassier<\/span>/.test(teil) && /<span class="rolle"><span data-lang="de">Konzertmeister/.test(teil), "jede Rolle in eigener Sprachgruppe (fehlende Übersetzung blendet nichts aus)");
ok(/<h3>S<\/h3> <span class="person__rolle">\(<span class="rolle"><span data-lang="de">Obmann/.test(teil), "Funktion auch bei Solist*innen");
ok(sichereUrl("//evil.example") === "" && sichereUrl("/assets/x.jpg") === "/assets/x.jpg", "sichereUrl");

const leer = renderEnsemble({ gruppen: [], personen: [] }, ["de"]);
ok(leer === "", "ohne Personen kein HTML");

if (fehler) { console.error(`\n${fehler} Fehler`); process.exit(1); }
console.log("\nEnsemble: alles in Ordnung");
