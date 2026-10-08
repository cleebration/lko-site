/**
 * ensemble.mjs – erzeugt den Personen-Teil der Seite /orchester aus src/data/ensemble.json.
 *
 * Gepflegt wird die Datei in der Redaktion (Werkzeug „Ensemble“). Gezeigt werden nur
 * Personen mit aktiv=true, sortiert nach `reihenfolge`, dann Name:
 *   a) Ensemble nach Stimmgruppen (Reihenfolge wie in `gruppen`; leere Gruppen fallen weg)
 *   b) „Zu Gast“        – nur wenn jemand aktiv ist
 *   c) „Solist*innen“   – nur wenn jemand aktiv ist
 * Foto und Link sind bei allen Personen möglich, Kurzbio nur bei Solist*innen.
 * Leere Felder erscheinen nicht.
 *
 * Mehrsprachige Felder sind Objekte { de: "…", en: "…" }. Jede vorhandene Sprache wird als
 * <span data-lang="…"> ausgegeben; fehlt eine, zeigt site-i18n.js die Standardsprache.
 */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

/** Nur http(s)-Adressen und eigene Pfade (/assets/…) sind erlaubt. */
export function sichereUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^\/(?!\/)[^\s"'<>]*$/.test(s)) return s;
  try {
    const x = new URL(s);
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : "";
  } catch {
    return "";
  }
}

/** Mehrsprachiger Text → HTML. Ein String gilt als Standardsprache. */
export function mehrsprachig(wert, locales, defaultLocale = locales[0]) {
  if (wert == null) return "";
  if (typeof wert === "string") return esc(wert.trim());
  const da = locales.filter((c) => String(wert[c] ?? "").trim());
  // zusätzlich vorhandene Sprachen, die (noch) nicht in locales stehen, nicht ausgeben
  if (!da.length) return "";
  if (da.length === 1 && da[0] === defaultLocale) return esc(wert[da[0]].trim());
  return da.map((c) => `<span data-lang="${c}">${esc(wert[c].trim())}</span>`).join("");
}

const hat = (wert) =>
  wert != null && (typeof wert === "string" ? wert.trim() !== "" : Object.values(wert).some((v) => String(v ?? "").trim()));

const sortiere = (a, b) =>
  (Number(a.reihenfolge) || 0) - (Number(b.reihenfolge) || 0) || String(a.name).localeCompare(String(b.name), "de");

/** Rolle(n) in Klammern: Position im Orchester · Funktion im Verein. */
function rollen(p, L) {
  // jede Rolle in eigenem <span>: site-i18n.js gruppiert data-lang nach Eltern-Element
  const teile = [p.position, p.funktion].filter(hat).map((w) => `<span class="rolle">${mehrsprachig(w, ...L)}</span>`);
  return teile.length ? ` <span class="person__rolle">(${teile.join(" · ")})</span>` : "";
}

function name(p) {
  const n = esc(p.name);
  const link = sichereUrl(p.link);
  return link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${n}</a>` : n;
}

function foto(p, cls) {
  const src = sichereUrl(p.foto);
  return src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" width="96" height="96" />` : "";
}

/** Gibt das HTML für den Ensemble-Teil zurück (ohne die Überschrift „Das Ensemble“). */
export function renderEnsemble(data, locales = ["de"], defaultLocale = locales[0]) {
  const L = [locales, defaultLocale];
  const aktiv = (data?.personen || []).filter((p) => p && p.aktiv === true && String(p.name || "").trim());
  const nachArt = (art) => aktiv.filter((p) => (p.art || "ensemble") === art).sort(sortiere);
  const out = [];

  // a) Ensemble nach Stimmgruppen
  const ensemble = nachArt("ensemble");
  const gruppen = data?.gruppen || [];
  const bekannte = new Set(gruppen.map((g) => g.key));
  const spalten = [];
  for (const g of gruppen) {
    const leute = ensemble.filter((p) => p.gruppe === g.key);
    if (leute.length) spalten.push({ titel: mehrsprachig(g.name, ...L) || esc(g.key), leute });
  }
  const ohne = ensemble.filter((p) => !bekannte.has(p.gruppe));
  if (ohne.length) spalten.push({ titel: "", leute: ohne });
  if (spalten.length) {
    out.push('<div class="ensemble">');
    for (const s of spalten) {
      out.push(`  <div>${s.titel ? `<h3>${s.titel}</h3>` : ""}`);
      out.push("    <ul>" + s.leute.map((p) => `<li>${foto(p, "person__foto")}${name(p)}${rollen(p, L)}</li>`).join("") + "</ul></div>");
    }
    out.push("</div>");
  }

  // b) Zu Gast
  const gaeste = nachArt("gast");
  if (gaeste.length) {
    out.push('<h2 data-i18n="orchestra.guests">Zu Gast</h2>');
    out.push(
      '<ul class="gaeste">' +
        gaeste
          .map((p) => {
            const inst = mehrsprachig(p.instrument, ...L);
            return `<li>${foto(p, "person__foto")}${name(p)}${inst ? ` <span class="person__instrument">– ${inst}</span>` : ""}${rollen(p, L)}</li>`;
          })
          .join("") +
        "</ul>"
    );
  }

  // c) Solist*innen
  const solisten = nachArt("solist");
  if (solisten.length) {
    out.push('<h2 data-i18n="orchestra.soloists">Solist*innen</h2>');
    out.push('<div class="solisten">');
    for (const p of solisten) {
      const inst = mehrsprachig(p.instrument, ...L);
      const bio = hat(p.bio) ? mehrsprachig(p.bio, ...L) : "";
      const link = sichereUrl(p.link);
      out.push(
        '  <article class="solist">' +
          foto(p, "solist__foto") +
          '<div class="solist__text">' +
          `<h3>${esc(p.name)}</h3>${rollen(p, L)}` +
          (inst ? `<p class="solist__instrument">${inst}</p>` : "") +
          (bio ? `<p class="solist__bio">${bio}</p>` : "") +
          (link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener" data-i18n="orchestra.more">Mehr erfahren</a></p>` : "") +
          "</div></article>"
      );
    }
    out.push("</div>");
  }

  return out.join("\n");
}
