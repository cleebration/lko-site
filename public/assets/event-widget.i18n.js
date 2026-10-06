/*
 * event-widget.i18n.js
 * Sprachfaehige Variante des Event-Moduls. Gegenueber der einsprachigen Version
 * sind GENAU vier Dinge anders (dieselben vier Schritte gelten 1:1 fuer das Blog-
 * und Galerie-Modul – siehe RETROFIT.md):
 *
 *   (1) STRINGS-Tabelle pro Sprache (Status-Labels, Datums-Locale, Buttontexte)
 *   (2) currentLang(): liest die aktive Sprache von window.SiteI18n
 *                      (Rueckfall: lang-Attribut, dann "de")
 *   (3) Feed-URL mit Platzhalter {lang}: feed=".../cleebration.{lang}.json"
 *   (4) auf "i18n:change" hoeren -> Sprache neu bestimmen, ggf. neu laden, neu rendern
 *
 * Einbetten:
 *   <script type="module" src="/event-widget.i18n.js"></script>
 *   <event-list  feed="https://HUB/feed/sites/cleebration.{lang}.json"
 *                detail-url="/events/event.html"></event-list>
 *   <event-detail feed="https://HUB/feed/sites/cleebration.{lang}.json"></event-detail>
 *
 * Themebar ueber --evt-* CSS-Variablen (identisch zur einsprachigen Version).
 */

/* (1) ---- Sprachabhaengige UI-Texte ------------------------------------- */
const STRINGS = {
  de: {
    locale: "de-AT",
    status: { scheduled: null, soldout: "Ausverkauft", cancelled: "Abgesagt", postponed: "Verschoben" },
    tickets: "Tickets",
    details: "Details",
    none: "Derzeit keine Veranstaltungen.",
    loadError: "Veranstaltungen konnten nicht geladen werden.",
    frueher: "Frühere Veranstaltung",
    spaeter: "Spätere Veranstaltung",
    alleTermine: "Alle Veranstaltungen",
    fallbackNote: "Übersetzung folgt"
  },
  en: {
    locale: "en-GB",
    status: { scheduled: null, soldout: "Sold out", cancelled: "Cancelled", postponed: "Postponed" },
    tickets: "Tickets",
    details: "Details",
    none: "No events at the moment.",
    loadError: "Events could not be loaded.",
    frueher: "Earlier event",
    spaeter: "Later event",
    alleTermine: "All events",
    fallbackNote: "Translation pending"
  }
};
const DEFAULT_LANG = "de";

/* (2) ---- Aktive Sprache bestimmen -------------------------------------- */
function currentLang(el) {
  if (window.SiteI18n && window.SiteI18n.lang) return window.SiteI18n.lang;
  const attr = el && el.getAttribute("lang");
  if (attr) return attr;
  return DEFAULT_LANG;
}
/* Rückfall über die Basissprache: "pt-BR" nimmt "pt", bevor es auf die
   Standardsprache zurückfällt. Dieselbe Regel wie im Galerie-, Blog- und
   Newsletter-Modul, damit sich alle vier gleich verhalten. */
function strings(lang) {
  return (
    STRINGS[lang] ||
    STRINGS[String(lang).split("-")[0]] ||
    STRINGS[DEFAULT_LANG]
  );
}

const STYLES = `
  :host {
    --evt-font-display: var(--evt-font, Georgia, "Times New Roman", serif);
    --evt-font-body: var(--evt-font, system-ui, -apple-system, "Segoe UI", sans-serif);
    --evt-bg: transparent; --evt-surface: #fff; --evt-text: #1a1a1a;
    --evt-muted: #6b6b6b; --evt-accent: #1a1a1a; --evt-accent-contrast: #fff;
    --evt-border: #e4e1da; --evt-radius: 4px; --evt-gap: 1.75rem; --evt-maxwidth: 1120px;
    display: block; color: var(--evt-text); background: var(--evt-bg);
    font-family: var(--evt-font-body); line-height: 1.55; box-sizing: border-box;
  }
  *, *::before, *::after { box-sizing: inherit; }
  .wrap { max-width: var(--evt-maxwidth); margin: 0 auto; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--evt-gap); }
  .card { display: flex; flex-direction: column; background: var(--evt-surface);
    border: 1px solid var(--evt-border); border-radius: var(--evt-radius); overflow: hidden;
    text-decoration: none; color: inherit; transition: transform .18s ease, box-shadow .18s ease; }
  .card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,.10); }
  .card:focus-visible { outline: 3px solid var(--evt-accent); outline-offset: 2px; }
  .card__media { aspect-ratio: 3 / 2; background: var(--evt-border); overflow: hidden; }
  .card__media img { width: 100%; height: 100%; object-fit: cover; }
  .card__body { padding: 1.1rem 1.2rem 1.3rem; display: flex; flex-direction: column; gap: .5rem; flex: 1; }
  .date { font-size: .82rem; letter-spacing: .04em; text-transform: uppercase; color: var(--evt-muted); }
  .title { font-family: var(--evt-font-display); font-size: 1.3rem; margin: 0; line-height: 1.2; }
  .summary { color: var(--evt-muted); margin: 0; }
  .meta { margin-top: auto; display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; padding-top: .4rem; }
  .pill { font-size: .72rem; font-weight: 600; padding: .15rem .55rem; border-radius: 999px;
    background: var(--evt-accent); color: var(--evt-accent-contrast); }
  .pill--muted { background: var(--evt-border); color: var(--evt-text); }
  .empty, .error { color: var(--evt-muted); padding: 2rem 0; }
  /* Detail */
  .detail__media { aspect-ratio: 16/7; background: var(--evt-border); border-radius: var(--evt-radius); overflow: hidden; margin-bottom: 1.5rem; }
  .detail__media img { width: 100%; height: 100%; object-fit: cover; }
  .detail__title { font-family: var(--evt-font-display); font-size: clamp(1.8rem, 4vw, 2.6rem); margin: 0 0 .5rem; }
  .detail__facts { display: flex; gap: 1.4rem; flex-wrap: wrap; color: var(--evt-muted); margin-bottom: 1.4rem; }
  .detail__body { max-width: 70ch; }
  .detail__body a { color: var(--evt-accent); }
  /* Blaettern zwischen Terminen. Zwei Spalten, damit der spaetere Termin
     rechts bleibt, auch wenn es links keinen frueheren gibt. */
  .umblaettern { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
                 margin-top: 2.5rem; padding-top: 1.25rem;
                 border-top: 1px solid var(--evt-border); }
  .umblaettern a { text-decoration: none; color: inherit; }
  .umblaettern a:hover .blatt__titel { color: var(--evt-accent); }
  .blatt--rechts { text-align: right; }
  .blatt__richtung { display: block; font-size: .78rem; color: var(--evt-muted);
                     text-transform: uppercase; letter-spacing: .06em; margin-bottom: .2rem; }
  .blatt__titel { display: block; font-family: var(--evt-font-display);
                  font-size: 1.05rem; line-height: 1.25; }
  @media (max-width: 34rem) {
    .umblaettern { grid-template-columns: 1fr; }
    .blatt--rechts { text-align: left; }
  }
  .btn { display: inline-block; margin-top: 1.4rem; padding: .7rem 1.4rem; border-radius: var(--evt-radius);
    background: var(--evt-accent); color: var(--evt-accent-contrast); text-decoration: none; font-weight: 600; }
`;

function fmtDate(iso, tz, locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short", day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: tz || "Europe/Vienna"
    }).format(new Date(iso));
  } catch { return iso; }
}

async function loadFeed(rawUrl, lang) {
  const url = rawUrl.replace(/\{lang\}/g, lang);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


/* Warten, bis die Sprache der Seite feststeht.

   Ohne das zeichnet das Modul in der Standardsprache, holt deren Feed, und
   zeichnet unmittelbar danach noch einmal in der wirklichen Sprache — zwei
   Abrufe und ein sichtbares Flackern.

   Auf einer fremden Seite ohne SiteI18n gibt es nichts zu warten; dort
   zeichnet das Modul sofort. */
function spracheBereit() {
  const i = window.SiteI18n;
  if (!i || !i.ready) return Promise.resolve();
  /* Notausgang: bindet eine Seite site-i18n.js ein, ruft aber nie init()
     auf, loest das Versprechen nie auf -- und das Modul bliebe fuer immer
     leer. Nach zwei Sekunden wird deshalb in der Standardsprache
     gezeichnet. */
  const notausgang = new Promise((r) => setTimeout(r, 2000));
  return Promise.race([i.ready, notausgang]).catch(() => {});
}

/* ---- <event-list> ------------------------------------------------------- */
class EventList extends HTMLElement {
  static get observedAttributes() { return ["feed", "lang", "detail-url", "show"]; }
  connectedCallback() {
    this.attachShadow({ mode: "open" });
    // (4) auf Sprachwechsel reagieren
    this._unsub = window.SiteI18n
      ? window.SiteI18n.onChange(() => { if (this._gezeichnet) this.refresh(); })
      : () => {};
    spracheBereit().then(() => { this._gezeichnet = true; this.refresh(); });
  }
  disconnectedCallback() { this._unsub && this._unsub(); }
  attributeChangedCallback() { if (this.shadowRoot) this.refresh(); }

  async refresh() {
    const lang = currentLang(this);
    const t = strings(lang);
    const feed = this.getAttribute("feed");
    const detailUrl = this.getAttribute("detail-url") || "#";
    const show = this.getAttribute("show") || "upcoming";
    this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="wrap"><p class="empty">…</p></div>`;

    let items;
    try { items = await loadFeed(feed, lang); }
    catch { this.shadowRoot.querySelector(".wrap").innerHTML = `<p class="error">${t.loadError}</p>`; return; }

    const now = Date.now();
    if (show === "upcoming") items = items.filter((e) => new Date(e.date).getTime() >= now - 36e5);
    // PATCH cleebration (siehe site/README.md): Vergangenes liest man rückwärts —
    // das zuletzt Gespielte zuerst, wie schon auf der alten Wix-Seite.
    if (show === "past") {
      items = items
        .filter((e) => new Date(e.date).getTime() < now)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const wrap = this.shadowRoot.querySelector(".wrap");
    if (!items.length) { wrap.innerHTML = `<p class="empty">${t.none}</p>`; return; }

    wrap.innerHTML = `<div class="grid">${items.map((e) => card(e, t, detailUrl)).join("")}</div>`;
  }
}

function card(e, t, detailUrl) {
  const statusLabel = t.status[e.status];
  const href = `${detailUrl}${detailUrl.includes("?") ? "&" : "?"}event=${encodeURIComponent(e.slug)}`;
  return `
    <a class="card" href="${href}">
      ${e.image ? `<div class="card__media"><img src="${e.image}" alt="" loading="lazy"></div>` : ""}
      <div class="card__body">
        <div class="date">${fmtDate(e.date, e.timeZone, t.locale)}</div>
        <h3 class="title">${esc(e.title)}</h3>
        ${e.summary ? `<p class="summary">${esc(e.summary)}</p>` : ""}
        <div class="meta">
          ${statusLabel ? `<span class="pill">${statusLabel}</span>` : ""}
          ${e.translated === false ? `<span class="pill pill--muted">${t.fallbackNote}</span>` : ""}
          ${e.venue ? `<span class="date">${esc(e.venue)}</span>` : ""}
        </div>
      </div>
    </a>`;
}

/* ---- <event-detail> ----------------------------------------------------- */
class EventDetail extends HTMLElement {
  static get observedAttributes() { return ["feed", "lang", "event"]; }
  connectedCallback() {
    this.attachShadow({ mode: "open" });
    this._unsub = window.SiteI18n
      ? window.SiteI18n.onChange(() => { if (this._gezeichnet) this.refresh(); })
      : () => {};
    spracheBereit().then(() => { this._gezeichnet = true; this.refresh(); });
  }
  disconnectedCallback() { this._unsub && this._unsub(); }
  attributeChangedCallback() { if (this.shadowRoot) this.refresh(); }

  async refresh() {
    const lang = currentLang(this);
    const t = strings(lang);
    const feed = this.getAttribute("feed");
    const slug = this.getAttribute("event") ||
      new URLSearchParams(location.search).get("event");
    this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="wrap"><p class="empty">…</p></div>`;

    let items;
    try { items = await loadFeed(feed, lang); }
    catch { this.shadowRoot.querySelector(".wrap").innerHTML = `<p class="error">${t.loadError}</p>`; return; }

    const i = items.findIndex((x) => x.slug === slug);
    const wrap = this.shadowRoot.querySelector(".wrap");
    if (i < 0) { wrap.innerHTML = `<p class="error">${t.none}</p>`; return; }
    const e = items[i];

    /* Der Feed kommt chronologisch aufsteigend: davor liegt der fruehere
       Termin, danach der spaetere. Bewusst ohne Ringschluss -- vom letzten
       auf den ersten Termin zu springen waere keine Navigation, sondern
       eine Ueberraschung. */
    const frueher = items[i - 1] || null;
    const spaeter = items[i + 1] || null;

    const detailUrl = this.getAttribute("detail-url") || location.pathname;
    const nachbarUrl = (s) => `${detailUrl}${detailUrl.includes("?") ? "&" : "?"}event=${encodeURIComponent(s)}`;
    const blatt = (eintrag, richtung, seite) => eintrag
      ? `<a class="blatt blatt--${seite}" href="${esc(nachbarUrl(eintrag.slug))}" rel="${seite === "links" ? "prev" : "next"}">
           <span class="blatt__richtung">${esc(richtung)}</span>
           <span class="blatt__titel">${seite === "links" ? "\u2039 " : ""}${esc(eintrag.title)}${seite === "rechts" ? " \u203a" : ""}</span>
         </a>`
      : `<span class="blatt blatt--${seite}"></span>`;
    const umblaettern = (frueher || spaeter)
      ? `<nav class="umblaettern" aria-label="${esc(t.alleTermine)}">
           ${blatt(frueher, t.frueher, "links")}
           ${blatt(spaeter, t.spaeter, "rechts")}
         </nav>`
      : "";

    const statusLabel = t.status[e.status];
    wrap.innerHTML = `
      ${e.image ? `<div class="detail__media"><img src="${e.image}" alt=""></div>` : ""}
      <h1 class="detail__title">${esc(e.title)}</h1>
      <div class="detail__facts">
        <span>${fmtDate(e.date, e.timeZone, t.locale)}</span>
        ${e.venue ? `<span>${esc(e.venue)}${e.city ? ", " + esc(e.city) : ""}</span>` : ""}
        ${statusLabel ? `<span class="pill">${statusLabel}</span>` : ""}
        ${e.translated === false ? `<span class="pill pill--muted">${t.fallbackNote}</span>` : ""}
      </div>
      <div class="detail__body">${e.body || ""}</div>
      ${e.ticketUrl ? `<a class="btn" href="${e.ticketUrl}" target="_blank" rel="noopener">${t.tickets}</a>` : ""}
      ${umblaettern}
    `;
  }
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

customElements.define("event-list", EventList);
customElements.define("event-detail", EventDetail);
