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
