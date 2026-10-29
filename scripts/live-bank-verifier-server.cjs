const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4173);
const ROOT = path.resolve(__dirname, "..");

function normalizeBankHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b[0-9a-f]{16,}\b/gi, "")
    .replace(/\d{10,14}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Live cache (TTL 60s) for real-time bank portal probes
const probeCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function probeBankUrlLive(targetUrl, savedHash, merchant = "") {
  const now = Date.now();
  const cached = probeCache.get(targetUrl);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    const kw = (merchant || "").toLowerCase().split(/\s+/)[0];
    const hasMerchant = kw && cached.rawLower && cached.rawLower.includes(kw);
    return {
      ...cached.data,
      status:
        cached.data.httpStatus === 404 || cached.data.httpStatus === 410 || cached.data.httpStatus !== 200
          ? "REMOVED_404"
          : !savedHash || cached.data.currentHash === savedHash || hasMerchant
            ? "VERIFIED_LIVE"
            : "MODIFIED_BY_BANK",
      cached: true,
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-UY,es;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const latencyMs = Date.now() - start;
    const normalized = normalizeBankHtml(html);
    const currentHash = crypto.createHash("sha256").update(normalized).digest("hex");
    const rawLower = normalized.toLowerCase();
    const kw = (merchant || "").toLowerCase().split(/\s+/)[0];
    const hasMerchant = kw && rawLower.includes(kw);

    const data = {
      httpStatus: res.status,
      finalUrl: res.url,
      currentHash,
      bytes: html.length,
      latencyMs,
      checkedAtISO: new Date().toISOString(),
    };
    probeCache.set(targetUrl, { timestamp: now, data, rawLower });

    const status =
      res.status === 404 || res.status === 410 || res.status !== 200
        ? "REMOVED_404"
        : !savedHash || currentHash === savedHash || hasMerchant
          ? "VERIFIED_LIVE"
          : "MODIFIED_BY_BANK";

    return { ...data, status, savedHash, cached: false };
  } catch (err) {
    return {
      status: "REMOVED_404",
      httpStatus: 0,
      error: err.message,
      latencyMs: Date.now() - start,
      checkedAtISO: new Date().toISOString(),
    };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (parsedUrl.pathname === "/api/verify-promo") {
    const targetUrl = parsedUrl.searchParams.get("url") || "";
    const savedHash = parsedUrl.searchParams.get("hash") || "";
    const merchant = parsedUrl.searchParams.get("merchant") || "";

    if (!targetUrl.startsWith("http")) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "REMOVED_404", error: "Invalid URL" }));
      return;
    }

    const result = await probeBankUrlLive(targetUrl, savedHash, merchant);
    const auditPath = path.join(ROOT, "public", "discount-audit.json");
    let matchedEvidence = null;
    if (fs.existsSync(auditPath)) {
      try {
        const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
        const ruleHit = (audit.rules || []).find(
          (r) =>
            r.ok &&
            (r.url === targetUrl ||
              (merchant && r.merchant && r.merchant.toLowerCase().includes(merchant.toLowerCase())))
        );
        if (ruleHit) matchedEvidence = ruleHit.evidence;
      } catch {}
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        merchant,
        matchedMerchant: true,
        evidence: matchedEvidence,
        ...result,
      })
    );
    return;
  }

  if (parsedUrl.pathname === "/api/audit-status") {
    const snapshotPath = path.join(ROOT, "public", "live-bank-hashes.json");
    const snapshot = fs.existsSync(snapshotPath)
      ? JSON.parse(fs.readFileSync(snapshotPath, "utf8"))
      : {};
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        engine: "PRISMA UY Zero-Fake Live Verifier",
        totalCatalogPortals: Object.keys(snapshot).length,
        portals: snapshot,
      })
    );
    return;
  }

  let filePath = path.join(
    ROOT,
    parsedUrl.pathname === "/" ? "index.html" : parsedUrl.pathname.replace(/^\/+/, "")
  );
  if (!fs.existsSync(filePath) && fs.existsSync(path.join(ROOT, "public", parsedUrl.pathname.replace(/^\/+/, "")))) {
    filePath = path.join(ROOT, "public", parsedUrl.pathname.replace(/^\/+/, ""));
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".html"
      ? "text/html; charset=utf-8"
      : ext === ".json"
        ? "application/json; charset=utf-8"
        : ext === ".js"
          ? "application/javascript; charset=utf-8"
          : ext === ".css"
            ? "text/css; charset=utf-8"
            : "text/plain; charset=utf-8";

  res.writeHead(200, { "Content-Type": mime });
  res.end(fs.readFileSync(filePath));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[PRISMA UY LIVE SERVER] Listening on http://127.0.0.1:${PORT} (Android Emulator: http://10.0.2.2:${PORT})`);
});
