/**
 * Stand 2026-11-23 (Claude, Projekt „Music LKO“).
 * Spreadshop des Linzer Kammerorchesters einbetten – erst nach Klick.
 * Anleitung Spreadshop: Shop Settings → Website Integration with JavaScript.
 * Öffnet jemand /shop#!/… (Shop-Unterseite, z. B. aus einem geteilten Link),
 * wird der Shop sofort geladen – der Besuch wollte ja in den Shop.
 */
const SHOP = "linzer-kammerorchester";
const PREFIX = `https://${SHOP}.myspreadshop.at`;

function laden() {
  const box = document.getElementById("lko-shop");
  const knopf = document.getElementById("shop-load");
  if (!box || box.dataset.geladen) return;
  box.dataset.geladen = "1";
  box.hidden = false;
  box.textContent = (window.SiteI18n?.t?.("shop.loading")) || "Shop wird geladen …";
  if (knopf) knopf.hidden = true;

  window.spread_shop_config = {
    shopName: SHOP,
    locale: "de_AT",
    prefix: PREFIX,
    baseId: "lko-shop",
    updateMetadata: false,
    swipeMenu: true
  };
  const s = document.createElement("script");
  s.src = `${PREFIX}/shopfiles/shopclient/shopclient.nocache.js`;
  s.async = true;
  s.onerror = () => {
    box.innerHTML = "";
    const a = document.createElement("a");
    a.href = PREFIX + "/";
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "button";
    a.textContent = "Shop öffnen / open shop";
    box.append(a);
  };
  document.body.append(s);
}

document.getElementById("shop-load")?.addEventListener("click", laden);
if (location.hash.startsWith("#!")) laden();
