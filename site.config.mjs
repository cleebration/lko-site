/**
 * Zentrale Konfiguration der Website linzer-kammerorchester.at.
 * Abgeleitet von babowalls-site / cleebration.com (gleiche Kits, gleicher Aufbau).
 */
export default {
  // Kanonischer Name: mit www — so war die Seite auf Wix bekannt
  // (www.linzer-kammerorchester.at). Der Worker führt den Namen ohne www dorthin.
  siteUrl: "https://www.linzer-kammerorchester.at",
  canonicalHost: "www.linzer-kammerorchester.at",

  fonts: {
    selfHost: true,
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,400;0,500;0,600;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap"
  },

  locales: ["de", "en"],
  defaultLocale: "de",
  autoDetectLanguage: true,

  /* Kein eigener Hub: Events und Beiträge liegen in den cleebration-Hubs
     und tragen dort `sites: [kammerorchester]` (Entscheidung Chris, 06.10.2026). */
  feeds: {
    events: "https://cleebration-events-hub.vercel.app/feed/sites/kammerorchester.{lang}.json",
    blog:   "https://cleebration-blog-hub.vercel.app/feed/sites/kammerorchester.{lang}.json"
  },

  images: {
    logo: "/assets/img/lko-logo-weiss.png",
    logoColor: "/assets/img/lko-logo-rot.png",
    og:   "/assets/img/og-lko.png"
  },

  // Adresse aus dem Wix-Impressum. Postfach bleibt, wo es ist (Google).
  mail: "info@linzer-kammerorchester.at"
};
