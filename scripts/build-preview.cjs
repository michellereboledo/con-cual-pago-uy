const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Babel = require("C:/Users/m.reboledo/.gemini/antigravity/brain/7f5c57d2-46f4-4dbd-8091-0a9e6db5d211/scratch/babel.min.js");

const root = "c:/Users/m.reboledo/Documents/antigravity/radiant-goodall";
const scratch = "C:/Users/m.reboledo/.gemini/antigravity/brain/7f5c57d2-46f4-4dbd-8091-0a9e6db5d211/scratch";
const files = [
  "src/types/discount.ts",
  "src/lib/dates.ts",
  "src/data/cards.ts",
  "src/data/merchantsData.ts",
  "src/lib/engine.ts",
  "src/lib/bank-scraper-pipeline.ts",
  "src/lib/live-catalog-sync.ts",
  "src/hooks/usePersistentState.ts",
  "src/hooks/useGsapChoreography.ts",
  "src/components/Sheet.tsx",
  "src/components/MerchantLogo.tsx",
  "src/components/MerchantCard.tsx",
  "src/components/CalculatorSheet.tsx",
  "src/components/WalletSheet.tsx",
  "src/components/AffiliateSheet.tsx",
  "src/components/ProSheet.tsx",
  "src/components/LegalSheet.tsx",
  "src/App.tsx",
];

let combined = `
const { useState, useEffect, useMemo, useRef, useCallback } = React;
const { createPortal } = ReactDOM;
const _Icon = (paths: string[]) => ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {paths.map((d, i) => <path key={i} d={d} />)}
  </svg>
);
const Search = _Icon(["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "m21 21-4.3-4.3"]);
const Wallet = _Icon(["M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1", "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"]);
const Sparkles = _Icon(["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"]);
const Calculator = _Icon(["M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M8 6h8v4H8z", "M8 14h.01", "M12 14h.01", "M16 14h.01", "M8 18h.01", "M12 18h.01", "M16 18h.01"]);
const CheckCircle2 = _Icon(["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "m9 12 2 2 4-4"]);
const AlertTriangle = _Icon(["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3", "M12 9v4", "M12 17h.01"]);
const ArrowUpRight = _Icon(["M7 7h10v10", "M7 17 17 7"]);
const BellRing = _Icon(["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"]);
const X = _Icon(["M18 6 6 18", "m6 6 12 12"]);
const CreditCard = _Icon(["M2 5h20v14H2z", "M2 10h20"]);
const MapPin = _Icon(["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"]);
const ShieldCheck = _Icon(["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z", "m9 12 2 2 4-4"]);
const Info = _Icon(["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"]);
const Flame = _Icon(["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"]);
const ChevronRight = _Icon(["m9 18 6-6-6-6"]);
const Receipt = _Icon(["M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z", "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8", "M12 17.5v-11"]);
const Check = _Icon(["M20 6 9 17l-5-5"]);
const Crown = _Icon(["M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z", "M5 21h14"]);
const Star = _Icon(["m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"]);
const Zap = _Icon(["M13 2 3 14h9l-1 8 10-12h-9l1-8z"]);
const Share2 = _Icon(["M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "m8.59 13.51 6.83 3.98", "m15.41 6.51-6.82 3.98"]);
`;

for (const f of files) {
  let content = fs.readFileSync(path.join(root, f), "utf8");
  content = content.replace(/^\s*import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "");
  content = content.replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "");
  content = content.replace(/export\s+default\s+function\s+App/, "function App");
  content = content.replace(/^\s*export\s+async\s+function/gm, "async function");
  content = content.replace(/^\s*export\s+(type|interface|const|function)/gm, "$1");
  combined += `\n// --- ${f} ---\n` + content;
}

const compiled = Babel.transform(combined, {
  filename: "app.tsx",
  presets: [
    ["typescript", { isTSX: true, allExtensions: true }],
    ["react", { runtime: "classic" }]
  ]
}).code;

const liveBankHashesJson = fs.readFileSync(path.join(root, "public/live-bank-hashes.json"), "utf8");
const liveBankHashes = JSON.parse(liveBankHashesJson);

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  __LIVE_BANK_HASHES: liveBankHashes,
  localStorage: { getItem: () => null, setItem: () => {} },
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    documentElement: {
      classList: { add: () => {}, remove: () => {} },
      style: { setProperty: () => {} }
    },
    body: {},
    getElementById: () => ({})
  }
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(scratch, "react.min.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(scratch, "react-dom-server.min.js"), "utf8"), sandbox);
sandbox.ReactDOM = { createPortal: (node) => node };
vm.runInContext(
  compiled +
    "\nwindow.__App = App; window.__WalletSheet = WalletSheet; window.__CalculatorSheet = CalculatorSheet; window.__AffiliateSheet = AffiliateSheet; window.__ProSheet = ProSheet; window.__LegalSheet = LegalSheet; window.__MERCHANTS = MERCHANTS_DATA; window.__CARDS = URUGUAY_CARDS; window.__CARD_MAP = CARD_MAP;",
  sandbox
);

// STRICT ZERO-FAKE BUILD AUDIT
let totalRules = 0;
for (const m of sandbox.__MERCHANTS) {
  for (const r of m.rules) {
    totalRules++;
    if (!r.cardIds || r.cardIds.length === 0) {
      throw new Error(`Rule ${r.id} in ${m.id} has empty cardIds!`);
    }
    const issuers = new Set();
    for (const cid of r.cardIds) {
      const card = sandbox.__CARD_MAP.get(cid);
      if (!card) throw new Error(`Rule ${r.id} references unknown cardId: ${cid}`);
      issuers.add(card.issuerId);
    }
    if (issuers.size > 1 && r.id !== "pigalle-debito-todos") {
      throw new Error(`Rule ${r.id} in ${m.id} mixes multiple banks: ${[...issuers].join(", ")}!`);
    }
    const snap = liveBankHashes[r.sourceCatalogUrl];
    if (!snap || snap.status !== 200) {
      throw new Error(`Rule ${r.id} in ${m.id} has unverified/non-200 URL: ${r.sourceCatalogUrl}`);
    }
    if (r.legalTextHash !== snap.sha256) {
      throw new Error(`Rule ${r.id} in ${m.id} hash mismatch vs live bank snapshot!`);
    }
  }
}
console.log(`[ZERO-FAKE AUDIT PASSED] ${sandbox.__MERCHANTS.length} merchants, ${totalRules} rules, ${sandbox.__CARDS.length} card tiers verified against live HTTP 200 bank snapshots.`);

const appHtml = sandbox.ReactDOMServer.renderToString(sandbox.React.createElement(sandbox.__App));
const walletHtml = sandbox.ReactDOMServer.renderToString(
  sandbox.React.createElement(sandbox.__WalletSheet, {
    walletSet: new Set(["itau-volar-credito", "brou-credito-recompensa"]),
    onToggle: () => {},
    onClear: () => {},
    onClose: () => {},
    onDone: () => {},
  })
);
const calcHtml = sandbox.ReactDOMServer.renderToString(
  sandbox.React.createElement(sandbox.__CalculatorSheet, {
    merchant: sandbox.__MERCHANTS[0],
    selectedDay: "Martes",
    selectedDate: new Date(),
    walletSet: new Set(["itau-volar-credito"]),
    initialAmount: 1600,
    onAmountChange: () => {},
    onClose: () => {},
    onUpsell: () => {},
  })
);
const legalHtml = sandbox.ReactDOMServer.renderToString(
  sandbox.React.createElement(sandbox.__LegalSheet, {
    onClose: () => {},
    onResetAllData: () => {},
  })
);

console.log(
  "SSR verified cleanly! App:",
  appHtml.length,
  "WalletSheet:",
  walletHtml.length,
  "CalculatorSheet:",
  calcHtml.length,
  "LegalSheet:",
  legalHtml.length
);

const reactInline = fs.readFileSync(path.join(scratch, "react.min.js"), "utf8");
const reactDomInline = fs.readFileSync(path.join(scratch, "react-dom.min.js"), "utf8");
const gsapInline = fs.readFileSync(path.join(scratch, "gsap.min.js"), "utf8");

const customCss = fs
  .readFileSync(path.join(root, "src/index.css"), "utf8")
  .replace(/@tailwind\s+\w+;/g, "");

const tailwindOfflinePath = path.join(scratch, "tailwind-compiled.css");
const tailwindOfflineCss = fs.existsSync(tailwindOfflinePath)
  ? fs.readFileSync(tailwindOfflinePath, "utf8")
  : "";

const html = `<!doctype html>
<html lang="es-UY" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>¿Con Cuál Pago? · PRISMA UY — Motor Fiscal & Bancario</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          fontFamily: {
            display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
            syne: ['"Syne"', 'system-ui', 'sans-serif'],
            editorial: ['"Instrument Serif"', 'Georgia', 'serif'],
            serif: ['"Instrument Serif"', 'Georgia', 'serif'],
            sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          keyframes: {
            "slide-up": {
              "0%": { transform: "translateY(24px)", opacity: "0" },
              "100%": { transform: "translateY(0)", opacity: "1" }
            },
            "fade-in": {
              "0%": { opacity: "0" },
              "100%": { opacity: "1" }
            }
          },
          animation: {
            "slide-up": "slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            "fade-in": "fade-in 150ms ease-out"
          }
        }
      }
    };
  </script>
  <style id="tailwind-offline-fallback">
${tailwindOfflineCss}
  </style>
  <style>
${customCss}
  </style>
  <script>window.__LIVE_BANK_HASHES = ${liveBankHashesJson};</script>
  <script>${reactInline}</script>
  <script>${reactDomInline}</script>
  <script>${gsapInline}</script>
</head>
<body class="antialiased">
  <div id="root">${appHtml}</div>
  <script>
    try {
${compiled}
      var rootEl = document.getElementById("root");
      if (ReactDOM.createRoot) {
        ReactDOM.createRoot(rootEl).render(React.createElement(App));
      } else {
        ReactDOM.render(React.createElement(App), rootEl);
      }
    } catch (err) {
      console.error(err);
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(root, "preview.html"), html, "utf8");
fs.writeFileSync(path.join(root, "index.html"), html, "utf8");
const androidAssetDir = path.join(root, "android-app", "app", "src", "main", "assets");
fs.mkdirSync(androidAssetDir, { recursive: true });
fs.writeFileSync(path.join(androidAssetDir, "index.html"), html, "utf8");
console.log("Generated pre-compiled PRISMA UY index.html, preview.html & android-app asset:", fs.statSync(path.join(root, "index.html")).size, "bytes");
