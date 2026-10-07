/**
 * Kleinkram, den jede Seite braucht. Bewusst winzig gehalten —
 * alles Inhaltliche machen die Kit-Module.
 */

/* Jahreszahl im Fußbereich aktuell halten */
for (const el of document.querySelectorAll("[data-year]")) {
  el.textContent = String(new Date().getFullYear());
}

/* Beim Sprachwechsel auch die Seitentitel-Sprache mitziehen.
   (SiteI18n setzt <html lang> selbst; hier hängen wir nur die
   Metabeschreibung an, damit Vorschauen stimmen.) */
document.addEventListener("i18n:change", (e) => {
  const key = document.documentElement.dataset.descriptionKey;
  if (key && window.SiteI18n) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", window.SiteI18n.t(key));
  }
  document.documentElement.setAttribute("lang", e.detail.lang);
});

/* Startseite: nächster Termin aus dem Events-Feed in den roten Kopfbereich.
   Ohne kommenden Termin bleibt der Platzhaltertext („Die nächsten Termine
   folgen …"). Sprache kommt von SiteI18n; bei Sprachwechsel neu füllen. */
const nextBox = document.querySelector("[data-next-feed]");
async function fillNext() {
  if (!nextBox) return;
  const lang = (window.SiteI18n && SiteI18n.lang) || document.documentElement.lang || "de";
  const t = (k, fb) => (window.SiteI18n && SiteI18n.t ? SiteI18n.t(k) : null) || fb;
  const set = (k, v) => { const el = nextBox.querySelector(`[data-next="${k}"]`); if (el) el.textContent = v; };
  try {
    const url = nextBox.dataset.nextFeed.replace("{lang}", lang);
    const items = await fetch(url).then((r) => r.json());
    const now = Date.now() - 36e5;
    const up = (Array.isArray(items) ? items : items.events || [])
      .filter((e) => new Date(e.date).getTime() >= now && e.status !== "cancelled")
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    if (!up) { set("summary", t("home.none", "Die nächsten Termine folgen in Kürze.")); return; }
    const loc = lang === "en" ? "en-GB" : "de-AT";
    const tz = up.timeZone || "Europe/Vienna";
    const d = new Date(up.date);
    set("title", up.title);
    set("summary", up.summary || "");
    set("date", d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: tz }));
    set("time", d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", timeZone: tz }) + (lang === "en" ? "" : " Uhr"));
    set("place", [up.venue, up.address].filter(Boolean).join(", "));
    nextBox.querySelector('[data-next="facts"]').hidden = false;
    nextBox.querySelector('[data-next="link"]').href = "/event?event=" + encodeURIComponent(up.slug);
  } catch { set("summary", t("home.none", "Die nächsten Termine folgen in Kürze.")); }
}
fillNext();
document.addEventListener("i18n:change", fillNext);
