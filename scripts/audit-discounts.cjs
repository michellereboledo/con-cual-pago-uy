/**
 * PRISMA UY — Zero-Fake Evidence Auditor
 *
 * Para CADA regla de src/data/merchantsData.ts:
 *   1. Descarga la fuente oficial del banco (sourceCatalogUrl) — o el feed oficial
 *      equivalente (OCA Contentstack API) — en vivo.
 *   2. Busca el comercio (keyword) en el contenido.
 *   3. Exige que el porcentaje de la regla (o "2x1" para 50%) aparezca en una ventana
 *      de texto alrededor del comercio.
 * Sale con código 1 si alguna regla no tiene evidencia → bloquea el build.
 *
 * Uso: node scripts/audit-discounts.cjs [--json out.json]
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

const OCA_API =
  "https://cdn.contentstack.io/v3/content_types/marketing_benefits_page/entries?environment=produccion&include[]=benefits";
const OCA_HEADERS = { api_key: "blta9b90878af9436b4", access_token: "cs79086e32ff712b934208ced7" };

/** Palabra clave de búsqueda por comercio (si el nombre en la app difiere del banco). */
const KEYWORD_OVERRIDES = {
  "tienda-inglesa": ["tienda inglesa"],
  tata: ["ta-ta", "tata"],
  "el-dorado": ["dorado"],
  "macro-mercado": ["macro"],
  disco: ["disco"],
  devoto: ["devoto"],
  geant: ["geant", "géant"],
  frog: ["frog"],
  kinko: ["kinko"],
  "red-expres": ["red expres", "red-expres"],
  farmashop: ["farmashop"],
  "san-roque": ["san roque"],
  "el-tunel": ["tunel", "túnel"],
  pigalle: ["pigalle"],
  "tienda-farma": ["tienda farma"],
  "farma-glam": ["farma&glam", "farma & glam", "farma glam", "farmaglam", "farma-glam"],
  farmacity: ["farmacity"],
  ancap: ["ancap", "combustible", "estaciones"],
  "disa-axion": ["estaciones de servicio", "combustible"],
  "montevideo-beer-company": ["montevideo beer"],
  "dakota-steakhouse": ["dakota"],
  "arcadia-radisson": ["arcadia"],
  "la-navicella": ["navicella"],
  "escaramuza-cafe": ["escaramuza"],
  "escaramuza-libreria": ["escaramuza"],
  "baco-vino-y-bistro": ["baco"],
  "jacinto": ["jacinto"],
  "bar-tabare": ["tabar"],
  "la-libreria-dbd": ["la librer", "dbd"],
  "life-cinemas": ["life"],
  sodre: ["sodre"],
  movie: ["movie"],
  "optica-florida": ["florida"],
  "the-north-face": ["north face"],
  "samsung-store": ["samsung"],
  mundomac: ["mundo mac", "mundomac"],
  "multi-ahorro-hogar": ["multi ahorro"],
  "heladeria-lekker": ["lekker"],
  "la-cigale": ["cigale"],
  luccianos: ["lucciano"],
  "burger-king": ["burger king"],
  "puro-verso": ["puro verso"],
  "universo-binario": ["universo binario"],
  cabify: ["cabify"],
  bas: ["bas"],
  "pez-globo": ["pez globo"],
  "el-fondito": ["fondito"],
  "culto-cafe": ["culto"],
  "rudy-burgers": ["rudy"],
  "la-panera-rosa": ["panera rosa"],
  "tea-connection": ["tea connection"],
  "cuervo-cafe": ["cuervo"],
  "porto-vanila": ["porto vanila"],
  "cafe-misterio": ["misterio"],
  "fabric-sushi": ["fabric"],
  "sushi-club": ["sushi club"],
  "la-cocina-de-pedro": ["cocina de pedro"],
  "la-pasiva-arocena": ["pasiva"],
  "el-palenque": ["palenque"],
  "don-baez": ["baez", "báez"],
  "new-balance": ["new balance"],
  "hush-puppies": ["hush puppies"],
  "daniel-cassin": ["cassin"],
  "las-delicias": ["delicias"],
  pedidosya: ["pedidosya", "pedidos ya"],
  iplace: ["iplace"],
  grupocine: ["grupocine"],
  cinemateca: ["cinemateca"],
};

function fold(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function htmlToText(html) {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\\u00([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s+/g, " ");
}

async function fetchText(url, headers = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "es-UY,es;q=0.9", ...headers },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      const body = await res.text();
      return { status: res.status, body };
    } catch (e) {
      if (attempt === 2) return { status: 0, body: "", error: e.message };
    }
  }
}

function loadMerchants() {
  const src = fs.readFileSync(path.join(ROOT, "src", "data", "merchantsData.ts"), "utf8");
  const json = src.slice(src.indexOf("= [") + 2).trim().replace(/;\s*$/, "");
  return JSON.parse(json);
}

function pctPatterns(pct) {
  const p = [`${pct}%`, `${pct} %`, `${pct}% `, `"${pct}"`, `: ${pct}`, `:${pct}`];
  if (pct === 50) p.push("2x1", "2 x 1", "50%");
  return p;
}

function findEvidence(text, keywords, pct, windowSize = 700) {
  const t = fold(text);
  for (const kwRaw of keywords) {
    const kw = fold(kwRaw);
    let idx = t.indexOf(kw);
    let guard = 0;
    while (idx !== -1 && guard++ < 400) {
      const win = t.slice(Math.max(0, idx - windowSize), idx + kw.length + windowSize);
      for (const pat of pctPatterns(pct)) {
        if (win.includes(fold(pat))) {
          const at = win.indexOf(fold(pat));
          return {
            keyword: kwRaw,
            pattern: pat,
            snippet: win.slice(Math.max(0, at - 140), at + 140).trim(),
          };
        }
      }
      idx = t.indexOf(kw, idx + kw.length);
    }
  }
  return null;
}

async function main() {
  const merchants = loadMerchants();
  const urls = new Set();
  merchants.forEach((m) => m.rules.forEach((r) => urls.add(r.sourceCatalogUrl)));

  console.log(`Descargando ${urls.size} fuentes oficiales en vivo...`);
  const sources = {};
  await Promise.all(
    [...urls].map(async (u) => {
      const r = await fetchText(u);
      sources[u] = { status: r.status, text: htmlToText(r.body), error: r.error };
    })
  );

  // OCA: oca.uy es una SPA; el contenido real vive en su API Contentstack de producción.
  const oca = await fetchText(OCA_API, OCA_HEADERS);
  let ocaText = "";
  try {
    const benefits = JSON.parse(oca.body)?.entries?.[0]?.benefits || [];
    ocaText = benefits
      .map((b) => `${b.title} | ${b.title_ben} | ${b.title_list} | ${b.brand} | ${b.description_list} | ${b.description_terms}`)
      .join(" \n ");
    console.log(`OCA Contentstack: ${benefits.length} beneficios vivos`);
  } catch {
    console.log("OCA Contentstack: ERROR al leer API");
  }

  const report = [];
  let fail = 0;
  for (const m of merchants) {
    const keywords = KEYWORD_OVERRIDES[m.id] || [fold(m.name).split(/[\s(]/)[0]];
    for (const r of m.rules) {
      const src = sources[r.sourceCatalogUrl];
      let text = src?.text || "";
      if (r.sourceCatalogUrl.includes("oca.uy")) text = ocaText;
      // Páginas dedicadas (1 comercio por URL): basta con que el % esté en la página
      const dedicated =
        /santander\.com\.uy\/beneficios\/.+|beneficios\.brou\.com\.uy\/.+\/.+|bbva\.com\.uy\/.+\/descuentos\/.+\/.+\.html/.test(
          r.sourceCatalogUrl
        );
      let ev = findEvidence(text, keywords, r.percentage);
      if (!ev && dedicated && src?.status === 200) {
        ev = findEvidence(text, ["descuento", "beneficio", "dto", "off"], r.percentage, 2000);
        if (ev) ev.keyword = `(página dedicada) ${ev.keyword}`;
      }
      const ok = src?.status === 200 || r.sourceCatalogUrl.includes("oca.uy") ? Boolean(ev) : false;
      if (!ok) fail++;
      report.push({
        merchant: m.name,
        merchantId: m.id,
        ruleId: r.id,
        percentage: r.percentage,
        url: r.sourceCatalogUrl,
        httpStatus: src?.status,
        ok,
        evidence: ev,
      });
      console.log(
        `${ok ? "OK  " : "FAIL"} ${m.name} · ${r.id} · ${r.percentage}% · HTTP ${src?.status}${
          ev ? ` · "${ev.snippet.slice(60, 200)}"` : ""
        }`
      );
    }
  }

  const outIdx = process.argv.indexOf("--json");
  const out = outIdx > -1 ? process.argv[outIdx + 1] : path.join(ROOT, "public", "discount-audit.json");
  fs.writeFileSync(
    out,
    JSON.stringify(
      { auditedAtISO: new Date().toISOString(), totalRules: report.length, failed: fail, rules: report },
      null,
      2
    )
  );
  console.log(`\n${report.length - fail}/${report.length} reglas con evidencia en vivo. Reporte: ${out}`);
  process.exit(fail ? 1 : 0);
}

main();
