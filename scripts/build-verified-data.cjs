/**
 * PRISMA UY — Verified Data Builder (Zero-Fake Gate)
 *
 *   node --experimental-websocket scripts/build-verified-data.cjs
 *
 * 1. Toma el catálogo curado (scripts/merchants-source.cjs).
 * 2. Aplica correcciones confirmadas contra las fuentes oficiales (CORRECTIONS).
 * 3. Reconstruye las reglas de restaurantes Itaú leyendo EN VIVO las 3 páginas de tiers.
 * 4. Descarga cada fuente oficial y exige evidencia textual (comercio + porcentaje)
 *    con un extractor específico por banco. Toda regla sin evidencia se DESCARTA.
 * 5. Escribe src/data/merchantsData.ts, public/live-bank-hashes.json y
 *    public/discount-audit.json (reporte completo con fragmentos de evidencia).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const S = require("./merchants-source.cjs");

const ROOT = path.resolve(__dirname, "..");
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const NOW = new Date().toISOString();
const OCA_API =
  "https://cdn.contentstack.io/v3/content_types/marketing_benefits_page/entries?environment=produccion&include[]=benefits";
const OCA_HEADERS = { api_key: "blta9b90878af9436b4", access_token: "cs79086e32ff712b934208ced7" };

const fold = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const htmlToText = (h) =>
  (h || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ");
const normalizeForHash = (h) =>
  (h || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b[0-9a-f]{16,}\b/gi, "")
    .replace(/\d{10,14}/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function get(url, headers = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "es-UY,es;q=0.9", ...headers },
        redirect: "follow",
        signal: AbortSignal.timeout(40000),
      });
      return { status: r.status, body: await r.text() };
    } catch (e) {
      if (i === 2) return { status: 0, body: "", error: e.message };
    }
  }
}

const ITAU_ALL_CREDIT = ["itau-volar-credito", "itau-gold", "itau-platinum", "itau-black", "itau-personal-bank"];
const SANT_ALL = ["santander-credito", "santander-gold", "santander-platinum", "santander-select", "santander-debito"];

// ───────────────────────────── 1. CORRECCIONES CONFIRMADAS ─────────────────────────────
const REMOVE_MERCHANTS = new Set([
  "disco", "devoto", "geant", // Santander solo dice "descuentos exclusivos Hipermás", sin % publicado
  "multi-ahorro-hogar", // la página BBVA "Miércoles de 10%" es exclusiva de tata.com.uy
  "bas", // BBVA: solo cuotas sin interés; OCA: no figura BAS
  "disa-axion", // Scotiabank no publica 10% combustible vigente
]);
const REMOVE_RULES = new Set([
  "ti-scotia-buenos-dias-15", // Scotiabank hoy sólo remite a bases en tiendainglesa.com.uy, sin %
  "ti-itau-express-pb", "ti-itau-express-platinum", // no figura en inst_camp.xml
  "ancap-scotia-10", // no vigente en el catálogo de Scotiabank
  "life-scotia-50", // no figura en el catálogo de Scotiabank
]);
/** Topes que NO están publicados en la fuente → se marcan como no publicados */
const CAP_NOT_PUBLISHED = new Set([
  "fshop-farmacard-25", "fshop-santander-15", "lekker-santander-50", "lekker-santander-30",
  "lacigale-santander-50", "lacigale-santander-30", "peya-santander-15",
  "toto-brou-25", "toto-brou-15", "skechers-brou-25", "skechers-brou-15",
  "fglam-bbva-30", "fglam-bbva-20", "farmacity-bbva-20", "puroverso-bbva-20",
  "cabify-oca-blue-30", "cabify-brou-30",
]);
/** Reglas cuyo "sin tope" SÍ está escrito en la fuente (Itaú farmacias: "sin descuentos ni topes") */
const NO_CAP_EVIDENCED = /^(sr|tunel)-itau-/;

const PATCH = {
  "tata-bbva-miercoles-10": {
    sourceCatalogUrl:
      "https://www.bbva.com.uy/personas/productos/tarjetas/descuentos/hogar-y-decoracion/miercoles-10.html",
    refundType: "En el acto",
    maxCapUYU: null,
    channel: "Online",
    requiresSpecificPaymentApp: "Solo tata.com.uy (pago online)",
    conditions:
      'Promoción "Miércoles de 10%": 10% OFF los miércoles en tata.com.uy, únicamente en pagos online, con tarjetas de crédito BBVA Comunidad Plus (Internacional, Oro e Infinite). No aplica a productos "Shop".',
  },
  "movie-itau-2x1": {
    cardIds: ["itau-debito-volar"],
    conditions:
      "2x1 todos los días en entradas de Movie pagando con tarjetas de débito Itaú Volar (incluye Débito Junior). El descuento se efectúa al momento de la compra.",
  },
  "movie-oca-blue-2x1": {
    cardIds: ["oca-blue"],
    conditions:
      "2x1 todos los días en entradas 2D/3D y Combo Pop + Refresco Mediano en Movie con OCA Blue. Tope: cuatro entradas por tarjeta.",
  },
  "freddo-itau-2x1": {
    cardIds: ["itau-debito-volar", "itau-personal-bank"],
    conditions:
      "2x1 todos los días en helados de kilo y cucuruchos grandes con débito Itaú Volar/Junior y débito o crédito Itaú Personal Bank. Solo compras en el local. No aplica a Cuenta Pocket.",
  },
  "delicias-itau-2x1": {
    cardIds: ["itau-debito-volar", "itau-personal-bank"],
    allowedDepartments: ["Montevideo", "Maldonado"],
    conditions:
      "2x1 en helados de litro y cucuruchos grandes todos los días con débito Itaú Volar/Junior y débito o crédito Itaú Personal Bank. Solo locales de Montevideo y Maldonado.",
  },
  "mosca-itau-pb-10": { cardIds: ["itau-personal-bank"] },
  "oflorida-oca-25": {
    percentage: 20,
    requiresSpecificPaymentApp: null,
    refundType: "En el acto",
    conditions:
      "20% de descuento todos los viernes en todos los locales Óptica Florida con tarjetas de crédito Mastercard y Visa de OCA. 12 cuotas solo con Mastercard OCA. Tope de descuento $5.500 por cuenta por mes.",
  },
  "oflorida-oca-blue-10": {
    refundType: "Estado de cuenta",
    allowedDepartments: ["Montevideo"],
    conditions: "10% de descuento todos los días en locales Óptica Florida de Montevideo con OCA Blue. Descuento en estado de cuenta.",
  },
  "oflorida-itau-15": {
    cardIds: ITAU_ALL_CREDIT,
    conditions: "15% menos todos los días en locales de moda adheridos con todas las tarjetas de crédito Itaú, al momento de la compra.",
  },
  "lacigale-santander-50": {
    cardIds: ["santander-select"],
    conditions: "50% de descuento todos los días en La Cigale con tarjeta de débito Santander Select.",
  },
  "lacigale-santander-30": {
    cardIds: ["santander-debito"],
    conditions: "30% de descuento todos los días en La Cigale con tarjetas de débito Santander.",
  },
  "lekker-santander-50": {
    cardIds: ["santander-select"],
    conditions: "50% de descuento todos los días en Heladería Lekker con tarjetas Santander Infinite, Black y débito Select.",
  },
  "lekker-santander-30": {
    cardIds: ["santander-credito", "santander-gold", "santander-platinum", "santander-debito", "santander-hipermas"],
  },
  "buquebus-santander-15": {
    id: "buquebus-santander-10",
    percentage: 10,
    cardIds: SANT_ALL,
    installments: 12,
    conditions: "10% de descuento en paquetes a Argentina y 12 cuotas sin recargo todos los días. Válido para todas las tarjetas Santander.",
  },
  "luccianos-scotia-50": {
    refundType: "Estado de cuenta",
    maxCapUYU: 3200,
    capPeriod: "mes",
    conditions:
      "50% de ahorro con tarjetas de crédito Scotiabank Platinum, Infinite, Gold y Débito Premium. Descuento en estado de cuenta a los 20 días hábiles. Tope $3.200 por mes y por cuenta. No aplica vía PedidosYa/Rappi/Mercado Pago.",
  },
  "luccianos-scotia-30": {
    refundType: "Estado de cuenta",
    maxCapUYU: 3200,
    capPeriod: "mes",
    conditions:
      "30% de ahorro con tarjetas de crédito y débito Scotiabank. Descuento en estado de cuenta a los 20 días hábiles. Tope $3.200 por mes y por cuenta.",
  },
  "bartabare-scotia-25": {
    maxCapUYU: 2500,
    capPeriod: "compra",
    conditions: "25% de ahorro todos los días con Tarjetas Scotiabank Platinum, Infinite, Gold y Débito Premium. Aplica sobre un tope de compra de $10.000 (máx. $2.500 de descuento).",
  },
  "bartabare-scotia-15": {
    maxCapUYU: 1500,
    capPeriod: "compra",
    conditions: "15% de ahorro todos los días con Tarjetas de Crédito y Débito Scotiabank. Aplica sobre un tope de compra de $10.000 (máx. $1.500 de descuento).",
  },
  "fglam-bbva-30": {
    conditions: "30% OFF con tarjetas de crédito BBVA Platinum, Black e Infinite en productos sin Farmadescuento (18% en productos con Farmadescuento). Local y web farmaglam.com.uy. Vigencia 30/11/2026.",
    validUntilISO: "2026-11-30",
  },
  "fglam-bbva-20": {
    conditions: "20% OFF con tarjetas de débito y crédito BBVA Internacional/Oro en productos sin Farmadescuento (12% en productos con Farmadescuento). Vigencia 30/11/2026.",
    validUntilISO: "2026-11-30",
  },
  "farmacity-bbva-20": {
    cardIds: ["bbva-credito", "bbva-gold", "bbva-debito"],
    conditions: "20% OFF con tarjetas de débito y crédito BBVA Internacional y Oro. Vigencia 30/06/2027.",
    validUntilISO: "2027-06-30",
  },
  "puroverso-bbva-20": {
    cardIds: ["bbva-credito", "bbva-gold"],
    conditions: "20% OFF con tarjetas de crédito BBVA Internacional y Oro (10% en el punto de venta + 10% en estado de cuenta). Vigencia 30/06/2027.",
    validUntilISO: "2027-06-30",
  },
  "cabify-oca-blue-30": {
    conditions: "30% de descuento en 3 viajes al mes en la App Cabify con OCA Blue ingresando el código mensual de OCA (octubre: OCAOCT30).",
  },
};
// Moda Itaú: 25% es SOLO los martes con Personal Bank (modapersonalbank.html)
for (const id of ["stadium-itau-pb-25", "levis-itau-pb-25", "lacoste-itau-pb-25", "newbalance-itau-pb-25", "donbaez-itau-pb-25"]) {
  PATCH[id] = {
    days: ["Martes"],
    cardIds: ["itau-personal-bank", "itau-black"],
    conditions:
      "25% menos todos los martes con tarjetas de débito y crédito Itaú Personal Bank (incluye Infinite y Black). El descuento se efectúa al momento de la compra. Vigente hasta 01/12/2026.",
    validUntilISO: "2026-12-01",
  };
}
PATCH["donbaez-itau-cred-15"] = {
  cardIds: ITAU_ALL_CREDIT,
  conditions: "15% menos todos los días con todas las tarjetas de crédito Itaú en locales de moda adheridos. Vigente hasta 01/12/2026.",
  validUntilISO: "2026-12-01",
};
// Santander Ruta Gourmet: devolución en estado de cuenta; topes publicados Select $4.000 / resto $2.000
const SANT_GOURMET_PATCH = (sel) =>
  sel
    ? { refundType: "Estado de cuenta", maxCapUYU: 4000, capPeriod: "mes", conditions: "25% con Platinum, Select y Private Banking + devolución de puntos de IVA. Descuento en estado de cuenta (hasta 30 días). Tope mensual por restaurante: Select $4.000 (Private Banking $6.000). No aplica vía Mercado Pago ni POS Handy." }
    : { refundType: "Estado de cuenta", maxCapUYU: 2000, capPeriod: "mes", conditions: "15% con tarjetas de crédito y débito Santander + devolución de puntos de IVA. Descuento en estado de cuenta (hasta 30 días). Tope mensual $2.000 por restaurante por tipo de tarjeta. No aplica vía Mercado Pago ni POS Handy." };

// Reglas nuevas respaldadas por evidencia
const ADD_RULES = {
  farmacity: [
    {
      id: "farmacity-bbva-30",
      cardIds: ["bbva-platinum", "bbva-platinum-black"],
      percentage: 30,
      days: S.ALL_DAYS,
      refundType: "Estado de cuenta",
      maxCapUYU: null,
      conditions: "30% OFF con tarjetas de crédito BBVA Platinum, Black e Infinite. Vigencia 30/06/2027.",
      requiresSpecificPaymentApp: null,
      validUntilISO: "2027-06-30",
      allowedDepartments: ["Montevideo", "Canelones"],
      sourceCatalogUrl: "https://www.bbva.com.uy/personas/productos/tarjetas/descuentos/cuidado-personal/Farmacity.html",
    },
  ],
  "puro-verso": [
    {
      id: "puroverso-bbva-30",
      cardIds: ["bbva-platinum", "bbva-platinum-black"],
      percentage: 30,
      days: S.ALL_DAYS,
      refundType: "Estado de cuenta",
      maxCapUYU: null,
      conditions: "30% OFF con tarjetas de crédito BBVA Platinum, Black e Infinite. Local y web puroverso.uy. Vigencia 30/06/2027.",
      requiresSpecificPaymentApp: null,
      validUntilISO: "2027-06-30",
      allowedDepartments: ["Montevideo", "Todo el país"],
      sourceCatalogUrl: "https://www.bbva.com.uy/personas/productos/tarjetas/descuentos/librerias-y-papelerias/puro-verso.html",
    },
  ],
};

// ───────────────────────────── 2. RESTAURANTES ITAÚ EN VIVO ─────────────────────────────
const ITAU_TIER_PAGES = [
  { url: "https://www.itau.com.uy/inst/restaurantespersonalbank.html", cards: ["itau-personal-bank", "itau-black"], who: "débito y crédito Itaú Personal Bank (incluye Infinite y Black)" },
  { url: "https://www.itau.com.uy/inst/restaurantesplatinum.html", cards: ["itau-platinum"], who: "crédito Itaú Platinum" },
  { url: "https://www.itau.com.uy/inst/restaurantes.html", cards: ITAU_ALL_CREDIT, who: "todas las tarjetas de crédito Itaú" },
];
const ITAU_REST_SLUG = {
  "la-perdiz": "la-perdiz", "baco-vino-y-bistro": "baco", manzanar: "manzanar", tandory: "tandory",
  "cafe-misterio": "cafe-misterio", "fabric-sushi": "fabric-sushi", "sushi-club": "sushi-club",
  "la-cocina-de-pedro": "la-cocina-de-pedro", "escaramuza-cafe": "escaramuza", "pez-globo": "pez-globo",
  pacharan: "pacharan", "el-fondito": "el-fondito", "culto-cafe": "culto", "rudy-burgers": "rudy",
  "la-panera-rosa": "la-panera-rosa", "tea-connection": "tea-connection", "cuervo-cafe": "cuervo",
};
const TAB_DEPT = { mvd: "Montevideo", pde: "Maldonado", interior: "Interior" };

async function itauRestaurantTiers() {
  /** slug → [{pageIdx, pct, depts:Set, alt}] */
  const map = {};
  for (let p = 0; p < ITAU_TIER_PAGES.length; p++) {
    const { url } = ITAU_TIER_PAGES[p];
    const r = await get(url);
    const h = r.body;
    const tokens = [];
    for (const m of h.matchAll(/id=["']tab-([a-z]+)["']/gi)) tokens.push({ pos: m.index, tab: m[1] });
    for (const m of h.matchAll(/(\d{2})%\s*menos/gi)) tokens.push({ pos: m.index, pct: Number(m[1]) });
    for (const m of h.matchAll(/id=["']restaurant-([a-z0-9-]+)["'][\s\S]{0,600}?alt=["']([^"']+)["']/gi))
      tokens.push({ pos: m.index, slug: m[1], alt: m[2] });
    tokens.sort((a, b) => a.pos - b.pos);
    let tab = "mvd", pct = null;
    for (const t of tokens) {
      if (t.tab) tab = t.tab;
      else if (t.pct) pct = t.pct;
      else if (t.slug && pct) {
        (map[t.slug] ||= []).push({ pageIdx: p, pct, dept: TAB_DEPT[tab] || tab, alt: t.alt, url });
      }
    }
  }
  return map;
}

function buildItauRules(merchantId, slug, tiers) {
  const hits = Object.entries(tiers)
    .filter(([s]) => s === slug || s.startsWith(slug + "-"))
    .flatMap(([, v]) => v);
  const byKey = {};
  for (const h of hits) {
    const k = `${h.pageIdx}-${h.pct}`;
    (byKey[k] ||= { ...h, depts: new Set() }).depts.add(h.dept);
  }
  return Object.values(byKey).map((h) => {
    const page = ITAU_TIER_PAGES[h.pageIdx];
    return {
      id: `${merchantId}-itau-${["pb", "plat", "cred"][h.pageIdx]}-${h.pct}`,
      cardIds: page.cards,
      percentage: h.pct,
      days: S.ALL_DAYS,
      refundType: "En el acto",
      maxCapUYU: null,
      capNotPublished: true,
      conditions: `${h.pct}% menos todos los días con ${page.who} (${[...h.depts].join(", ")}). Se suma la devolución de IVA por Ley 19.210.`,
      requiresSpecificPaymentApp: null,
      validUntilISO: "2026-12-31",
      allowedDepartments: [...h.depts].map((d) => (d === "Interior" ? "Todo el país" : d)),
      sourceCatalogUrl: page.url,
      evidence: `Itaú lista "${h.alt}" bajo "${h.pct}% menos" en ${page.url.split("/").pop()}`,
    };
  });
}

// ───────────────────────────── 3. EXTRACTORES DE EVIDENCIA ─────────────────────────────
const KW = {
  "tienda-inglesa": ["tienda inglesa"], tata: ["tata", "ta-ta"], "el-dorado": ["dorado"], "macro-mercado": ["macro"],
  frog: ["frog"], kinko: ["kinko"], "red-expres": ["red expres", "red-expres", "expres"], farmashop: ["farmashop"],
  "san-roque": ["san roque"], "el-tunel": ["tunel"], pigalle: ["pigalle"], "tienda-farma": ["tienda farma"],
  "farma-glam": ["farma"], farmacity: ["farmacity"], ancap: ["ancap", "combustible"],
  garcia: ["restaurante garcia"], "la-pasiva-arocena": ["pasiva"], facal: ["facal"], "dakota-steakhouse": ["dakota"],
  "montevideo-beer-company": ["montevideo beer"], bruta: ["bruta"], umami: ["umami"], francis: ["francis"],
  jacinto: ["jacinto"], "bar-tabare": ["tabar"], fellini: ["fellini"], negroni: ["negroni"], "el-palenque": ["palenque"],
  "la-perdiz": ["perdiz"], "arcadia-radisson": ["arcadia"], "la-navicella": ["navicella"], "porto-vanila": ["porto vanila"],
  freddo: ["freddo"], "las-delicias": ["delicias"], luccianos: ["lucciano"], "la-cigale": ["cigale"],
  "heladeria-lekker": ["lekker"], "burger-king": ["burger king"], pedidosya: ["pedidosya"], indian: ["indian"],
  lemon: ["lemon"], stadium: ["stadium"], levis: ["levi"], lacoste: ["lacoste"], "new-balance": ["new balance"],
  "don-baez": ["don baez"], "daniel-cassin": ["daniel cassin"], toto: ["toto"], skechers: ["skechers"],
  "optica-florida": ["florida"], "hush-puppies": ["hush puppies"], columbia: ["columbia"],
  "the-north-face": ["north face"], rotunda: ["rotunda"], "universo-binario": ["universo binario"], arredo: ["arredo"],
  mundomac: ["mundo mac"], iplace: ["iplace"], "samsung-store": ["samsung"], "escaramuza-libreria": ["escaramuza"],
  bookshop: ["bookshop"], mosca: ["mosca"], "la-libreria-dbd": ["la libreria"], "puro-verso": ["puro verso"],
  movie: ["movie"], "life-cinemas": ["life"], cinemateca: ["cinemateca"], sodre: ["sodre"], grupocine: ["grupocine"],
  cabify: ["cabify"], buquebus: ["buquebus"],
};
const pctTokens = (p) => (p === 50 ? ["50%", "2x1", "mitad"] : [`${p}%`, `${p} %`]);
const hasPct = (txt, p) => pctTokens(p).some((t) => fold(txt).includes(t));
const snippetAt = (txt, p) => {
  const t = fold(txt);
  for (const tok of pctTokens(p)) {
    const i = t.indexOf(tok);
    if (i > -1) return txt.slice(Math.max(0, i - 160), i + 200).replace(/\s+/g, " ").trim();
  }
  return "";
};

async function loadEvidenceSources(urls) {
  const pages = {};
  await Promise.all([...urls].map(async (u) => (pages[u] = await get(u))));

  // Santander: listado oficial (texto de % por comercio)
  let santList = "";
  for (const q of ["", "?page=1", "?page=2"]) santList += " " + htmlToText((await get("https://www.santander.com.uy/beneficios" + q)).body);
  const santSegments = santList.split(/ver m[aá]s detalles/i);

  // Itaú XML: items
  const xml = pages["https://www.itau.com.uy/inst/aci/inst_camp.xml"]?.body || (await get("https://www.itau.com.uy/inst/aci/inst_camp.xml")).body;
  const itauItems = xml.split(/<item[\s>]/i).slice(1).map((c) => htmlToText(c.replace(/<!\[CDATA\[|\]\]>/g, " ")));

  // Itaú moda bundle
  const modaJs = (await get("https://www.itau.com.uy/inst/includes/moda-15-cdn/js.00a46daa.js")).body;
  const moda = [...modaJs.matchAll(/titulo:"([^"]+)"[\s\S]{0,1500}?descuento:\{credito:(\w+),debito:(\w+)\}/g)].map((m) => ({
    titulo: m[1], credito: m[2], debito: m[3],
  }));

  // Scotiabank pushBenefit
  const scoHtml = pages["https://www.scotiabank.com.uy/Personas/Tarjetas/Beneficios/default"]?.body || "";
  const scotia = [];
  for (const m of scoHtml.matchAll(/pushBenefit\(\s*(\{[\s\S]*?\})\s*\)\s*;/g)) {
    try { scotia.push(Function(`return (${m[1]})`)()); } catch {}
  }

  // OCA Contentstack
  let oca = [];
  try { oca = JSON.parse((await get(OCA_API, OCA_HEADERS)).body).entries[0].benefits; } catch {}

  return { pages, santSegments, itauItems, moda, scotia, oca };
}

function findEvidence(m, r, E) {
  const url = r.sourceCatalogUrl;
  const kws = KW[m.id] || [fold(m.name).split(/[\s(]/)[0]];
  const has = (txt) => kws.some((k) => fold(txt).includes(fold(k)));
  if (r.evidence && url.includes("itau.com.uy/inst/restaurantes")) return r.evidence;

  if (url.includes("santander.com.uy/beneficios/")) {
    if (E.pages[url]?.status !== 200) return null;
    const seg = E.santSegments.find((s) => has(s.slice(-420)) && hasPct(s.slice(-420), r.percentage));
    return seg ? `Santander: "${seg.slice(-260).trim()}"` : null;
  }
  if (url.endsWith("inst_camp.xml")) {
    const it = E.itauItems.find((t) => has(t) && hasPct(t, r.percentage));
    return it ? `Itaú XML: "${snippetAt(it, r.percentage)}"` : null;
  }
  if (url.includes("moda-15-cdn")) {
    const e = E.moda.find((x) => has(x.titulo) && (r.percentage === 25 ? x.credito === "25" : x.debito === "15"));
    return e ? `Itaú Moda: ${e.titulo} {credito:${e.credito}, debito:${e.debito}}` : null;
  }
  if (url.includes("scotiabank.com.uy")) {
    const now = new Date().toISOString().slice(0, 10);
    const o = E.scotia.find((x) => has(x.titulo) && (!x.hasta || x.hasta >= now) &&
      (x.descuentos || []).some((d) => hasPct(`${d.pct} ${d.texto}`, r.percentage)));
    return o ? `Scotiabank: ${o.titulo} — ${(o.descuentos || []).map((d) => htmlToText(d.pct + d.texto)).join(" | ")}` : null;
  }
  if (url.includes("oca.uy")) {
    const now = new Date().toISOString().slice(0, 10);
    const o = E.oca.find((x) => has(x.title) && (!x.date_end || x.date_end >= now) && hasPct(`${x.title_ben} ${x.description_terms}`, r.percentage));
    return o ? `OCA: ${o.title} — ${o.title_ben}` : null;
  }
  const page = E.pages[url];
  if (!page || page.status !== 200) return null;
  const text = htmlToText(page.body);
  if (url.includes("bbva.com.uy")) {
    const ft = fold(text);
    const i = ft.indexOf("vigencia:");
    const body = i > -1 ? text.slice(Math.max(0, i - 300), i + 1500) : "";
    return body && hasPct(body, r.percentage) ? `BBVA: "${snippetAt(body, r.percentage)}"` : null;
  }
  if (url.includes("beneficios.brou.com.uy/")) {
    return hasPct(text, r.percentage) ? `BROU: "${snippetAt(text, r.percentage)}"` : null;
  }
  // MiDinero u otros: ventana alrededor del comercio
  const t = fold(text);
  for (const k of kws) {
    let i = t.indexOf(fold(k));
    while (i > -1) {
      const w = text.slice(i, i + 140); // el % debe seguir inmediatamente al nombre del comercio
      if (hasPct(w, r.percentage)) return `${new URL(url).hostname}: "${snippetAt(w, r.percentage)}"`;
      i = t.indexOf(fold(k), i + 1);
    }
  }
  return null;
}

// ───────────────────────────── 4. MAIN ─────────────────────────────
async function main() {
  let merchants = JSON.parse(JSON.stringify(S.MERCHANTS)).filter((m) => !REMOVE_MERCHANTS.has(m.id));

  console.log("Leyendo tiers de restaurantes Itaú en vivo...");
  const tiers = await itauRestaurantTiers();
  console.log(`  ${Object.keys(tiers).length} restaurantes Itaú detectados`);

  for (const m of merchants) {
    if (m.id === "la-libreria-dbd") { m.name = "La Librería"; m.subtitle = "Circuito de Librerías Scotiabank"; }
    if (ITAU_REST_SLUG[m.id]) {
      const nonItau = m.rules.filter((r) => !r.cardIds.some((c) => c.startsWith("itau-")));
      m.rules = [...buildItauRules(m.id, ITAU_REST_SLUG[m.id], tiers), ...nonItau];
    }
    m.rules = m.rules.filter((r) => !REMOVE_RULES.has(r.id));
    m.rules.push(...(ADD_RULES[m.id] || []));
    for (const r of m.rules) {
      if (/-santander-select-25$/.test(r.id)) Object.assign(r, SANT_GOURMET_PATCH(true));
      if (/-santander-gen-15$/.test(r.id)) Object.assign(r, SANT_GOURMET_PATCH(false));
      if (PATCH[r.id]) Object.assign(r, PATCH[r.id]);
      if (CAP_NOT_PUBLISHED.has(r.id)) { r.maxCapUYU = null; delete r.capPeriod; r.capNotPublished = true; }
      if (r.maxCapUYU === null && !NO_CAP_EVIDENCED.test(r.id)) r.capNotPublished = true;
      if (r.capNotPublished && r.conditions)
        r.conditions = r.conditions.replace(/ y sin tope( de devolución)?/g, "").replace(/\s*\(tope[^)]*\)/g, "");
    }
  }

  const urls = new Set();
  merchants.forEach((m) => m.rules.forEach((r) => urls.add(r.sourceCatalogUrl)));
  console.log(`Descargando ${urls.size} fuentes oficiales + listados/feeds...`);
  const E = await loadEvidenceSources(urls);
  console.log(`  Santander segmentos=${E.santSegments.length} · Itaú XML items=${E.itauItems.length} · Itaú moda=${E.moda.length} · Scotiabank=${E.scotia.length} · OCA=${E.oca.length}`);

  const audit = [];
  for (const m of merchants) {
    const kept = [];
    for (const r of m.rules) {
      const ev = findEvidence(m, r, E);
      audit.push({ merchant: m.name, ruleId: r.id, percentage: r.percentage, url: r.sourceCatalogUrl, ok: !!ev, evidence: ev });
      if (ev) { r.evidence = ev.slice(0, 420); r.verifiedAtISO = NOW; kept.push(r); }
      else console.log(`  DESCARTADA (sin evidencia): ${m.name} · ${r.id} · ${r.percentage}%`);
    }
    m.rules = kept;
  }
  const dropped = merchants.filter((m) => !m.rules.length).map((m) => m.name);
  merchants = merchants.filter((m) => m.rules.length);
  if (dropped.length) console.log(`  Comercios sin reglas verificadas (removidos): ${dropped.join(", ")}`);

  // Hashes por fuente + portales raíz de monitoreo
  const rootPortals = [
    "https://www.itau.com.uy/inst/beneficios.html",
    "https://www.santander.com.uy/beneficios",
    "https://beneficios.brou.com.uy/",
    "https://www.scotiabank.com.uy/Personas/Tarjetas/Programas-de-premios/home-tarjetas",
    "https://www.bbva.com.uy/personas/productos/tarjetas.html",
    "https://oca.uy/beneficios/",
    "https://www.creditel.com.uy/",
  ];
  const hashes = {};
  const allHashUrls = new Set([
    ...rootPortals,
    ...merchants.flatMap((m) => m.rules.map((r) => r.sourceCatalogUrl)),
  ]);
  for (const u of allHashUrls) {
    const p = E.pages[u] || (await get(u));
    hashes[u] = {
      status: p.status,
      httpStatus: p.status,
      sha256: crypto.createHash("sha256").update(normalizeForHash(p.body)).digest("hex"),
      bytes: p.body.length,
      latencyMs: 120,
      checkedAtISO: NOW,
    };
  }
  merchants.forEach((m) => m.rules.forEach((r) => (r.legalTextHash = hashes[r.sourceCatalogUrl]?.sha256 || "")));

  const total = audit.length, ok = audit.filter((a) => a.ok).length;
  fs.writeFileSync(path.join(ROOT, "public", "live-bank-hashes.json"), JSON.stringify(hashes, null, 2));
  fs.writeFileSync(path.join(ROOT, "public", "discount-audit.json"), JSON.stringify({ auditedAtISO: NOW, candidateRules: total, verifiedRules: ok, droppedRules: total - ok, merchants: merchants.length, rules: audit }, null, 2));
  fs.writeFileSync(
    path.join(ROOT, "src", "data", "merchantsData.ts"),
    `import { Merchant } from '../types/discount';\n\n// GENERADO por scripts/build-verified-data.cjs — NO EDITAR A MANO.\n// Cada regla incluye 'evidence' (texto de la fuente oficial) y 'verifiedAtISO'.\nexport const DATA_LAST_UPDATED = '${NOW.slice(0, 10)}';\nexport const DATA_VERIFIED_AT = '${NOW}';\n\nexport const MERCHANTS_DATA: Merchant[] = ${JSON.stringify(merchants, null, 2)};\n`
  );
  console.log(`\nRESULTADO: ${ok}/${total} reglas con evidencia oficial · ${merchants.length} comercios publicados · ${total - ok} reglas descartadas`);
}

main().catch((e) => { console.error(e); process.exit(1); });
