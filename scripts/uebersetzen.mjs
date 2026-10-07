/**
 * uebersetzen.mjs – kleine Hilfe für die Claude-API (Übersetzen).
 *
 * Gemeinsam benutzt von scripts/sprache.mjs in den Websites und in den Hubs.
 * Kopiert von cleebration-web/_sprache/ (dort pflegen, dann
 * „Sprach-Knopf einrichten.command“ erneut ausführen).
 *
 * Umgebung:
 *   ANTHROPIC_API_KEY  – Pflicht (GitHub-Secret)
 *   ANTHROPIC_MODEL    – optional, Standard claude-sonnet-5-5
 *   UEBERSETZEN_TEST   – "1": nichts abrufen, Text nur mit [code] markieren (für Tests)
 */

const MODELL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

/** Sprachname für den Auftrag ("fr" → "French (fr)"). */
export function sprachName(code) {
  try {
    const n = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    return n && n !== code ? `${n} (${code})` : code;
  } catch {
    return code;
  }
}

/** Passendes Format-Locale ("fr" → "fr-FR", "pt-BR" bleibt). */
export function formatLocale(code) {
  if (code.includes("-")) return code;
  const f = { en: "en-GB", de: "de-AT", pt: "pt-PT", zh: "zh-CN", ja: "ja-JP", cs: "cs-CZ", sl: "sl-SI", sk: "sk-SK" };
  return f[code] || `${code}-${code.toUpperCase()}`;
}

async function claude(system, user, maxTokens = 16000) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY fehlt (GitHub → Settings → Secrets).");
  for (let versuch = 1; ; versuch++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (res.ok) {
      const j = await res.json();
      if (j.stop_reason === "max_tokens") throw new Error("Antwort zu lang (max_tokens) – Text aufteilen.");
      return j.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    }
    const t = await res.text();
    if ((res.status === 429 || res.status >= 500) && versuch < 5) {
      await new Promise((r) => setTimeout(r, 2000 * versuch * versuch));
      continue;
    }
    throw new Error(`Claude-API ${res.status}: ${t.slice(0, 300)}`);
  }
}

const STIL = (von, nach, kontext) =>
  `You are a professional translator for a website (${kontext}). Translate from ${sprachName(von)} to ${sprachName(nach)}. ` +
  "Natural, idiomatic, same tone and register as the original (informal 'du' stays informal). " +
  "Keep proper names, brand names, place names, URLs, e-mail addresses, numbers and dates unchanged. " +
  "Keep Markdown, HTML tags, attributes, entities and placeholders like {name} or {{x}} exactly as they are.";

/**
 * Ein Objekt mit Texten übersetzen. Schlüssel bleiben, nur String-Werte werden übersetzt.
 * Schlüssel `locale`/`formatLocale` bekommen das passende Format-Locale.
 */
export async function uebersetzeObjekt(obj, von, nach, kontext = "website") {
  if (process.env.UEBERSETZEN_TEST === "1") return markiere(obj, nach);
  const system = STIL(von, nach, kontext) +
    " You receive JSON. Return ONLY the same JSON structure with every string value translated. " +
    "Do not add, remove or rename keys. Leave null, numbers and booleans unchanged. No commentary, no code fences.";
  const raw = await claude(system, JSON.stringify(obj, null, 2));
  const json = JSON.parse(raw.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ""));
  pruefeForm(obj, json, "");
  return setzeLocale(json, nach);
}

/** HTML-Ausschnitt übersetzen (Tags bleiben). */
export async function uebersetzeHtml(html, von, nach, kontext = "website") {
  if (process.env.UEBERSETZEN_TEST === "1") return html.replace(/>([^<>]*\S[^<>]*)</g, (_, t) => `>[${nach}] ${t.trim()}<`);
  const system = STIL(von, nach, kontext) +
    " You receive an HTML fragment. Return ONLY the translated HTML fragment, with identical tags, attributes and structure. " +
    "Translate visible text and the attributes alt, title and aria-label. No commentary, no code fences.";
  return (await claude(system, html)).replace(/^\s*```(?:html)?\s*|\s*```\s*$/g, "");
}

function pruefeForm(a, b, pfad) {
  if (a && typeof a === "object" && !Array.isArray(a)) {
    if (!b || typeof b !== "object") throw new Error(`Übersetzung: ${pfad || "Wurzel"} fehlt`);
    for (const k of Object.keys(a)) {
      if (!(k in b)) throw new Error(`Übersetzung: Schlüssel ${pfad}${k} fehlt`);
      pruefeForm(a[k], b[k], `${pfad}${k}.`);
    }
  } else if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length !== a.length) throw new Error(`Übersetzung: Liste ${pfad} verändert`);
    a.forEach((x, i) => pruefeForm(x, b[i], `${pfad}${i}.`));
  }
}

function setzeLocale(o, nach) {
  if (!o || typeof o !== "object") return o;
  for (const k of Object.keys(o)) {
    if ((k === "locale" || k === "formatLocale") && typeof o[k] === "string") o[k] = formatLocale(nach);
    else setzeLocale(o[k], nach);
  }
  return o;
}

function markiere(o, nach) {
  if (typeof o === "string") return o.startsWith("__FN__:") ? o.replace(/`([^`$]*)/, "`[" + nach + "] $1") : `[${nach}] ${o}`;
  if (Array.isArray(o)) return o.map((x) => markiere(x, nach));
  if (o && typeof o === "object") return setzeLocale(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, markiere(v, nach)])), nach);
  return o;
}
