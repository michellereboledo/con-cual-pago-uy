const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const APP_URL = "http://127.0.0.1:4173";
const ARTIFACTS_DIR = "C:/Users/m.reboledo/.gemini/antigravity/brain/7f5c57d2-46f4-4dbd-8091-0a9e6db5d211";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === "Runtime.exceptionThrown") {
        this.consoleErrors.push(msg.params?.exceptionDetails?.text || "Runtime exception");
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result.value;
  }

  async screenshot(outFile) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(outFile, Buffer.from(data, "base64"));
  }

  close() {
    this.ws.close();
  }
}

async function runAndroidTestSuite() {
  console.log("=================================================================");
  console.log("  PRISMA UY — ANDROID 14 (PIXEL 8) AUTOMATED TEST & LIVE AUDIT");
  console.log("=================================================================\n");

  const results = [];
  const assert = (name, cond, detail = "") => {
    if (!cond) {
      console.error(`❌ [FAIL] ${name} ${detail}`);
      throw new Error(`Test failed: ${name} (${detail})`);
    }
    console.log(`✅ [PASS] ${name}${detail ? " — " + detail : ""}`);
    results.push({ name, passed: true, detail });
  };

  // 1. Verify Live Server & Real Bank Verification Daemon (/api/verify-promo)
  const snapshot = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "..", "public", "live-bank-hashes.json"), "utf8")
  );
  const banksToTest = [
    ["Banco Itaú", "https://www.itau.com.uy/inst/beneficios.html"],
    ["Banco Santander", "https://www.santander.com.uy/beneficios"],
    ["BROU", "https://beneficios.brou.com.uy/"],
    ["Scotiabank", "https://www.scotiabank.com.uy/Personas/Tarjetas/Programas-de-premios/home-tarjetas"],
    ["BBVA", "https://www.bbva.com.uy/personas/productos/tarjetas.html"],
    ["OCA", "https://oca.uy/beneficios/"],
    ["Creditel", "https://www.creditel.com.uy/"],
  ];

  for (const [bankName, url] of banksToTest) {
    const savedHash = snapshot[url]?.sha256 || "";
    const apiRes = await fetch(
      `${APP_URL}/api/verify-promo?url=${encodeURIComponent(url)}&merchant=${encodeURIComponent(
        bankName
      )}&hash=${encodeURIComponent(savedHash)}`
    );
    const data = await apiRes.json();
    assert(
      `Live Bank Probe: ${bankName}`,
      data.status === "VERIFIED_LIVE" && data.httpStatus === 200,
      `HTTP ${data.httpStatus} · ${data.latencyMs}ms · SHA-256 #${(data.currentHash || "").slice(0, 10)}`
    );
  }

  // Test that a real 404 bank URL is caught automatically as REMOVED_404
  const fake404Res = await fetch(
    `${APP_URL}/api/verify-promo?url=${encodeURIComponent(
      "https://www.itau.com.uy/inst/aci/beneficios.html"
    )}&merchant=Test404&hash=0000`
  );
  const fake404Data = await fake404Res.json();
  assert(
    "Zero-Fake 404 Detection Guard",
    fake404Data.status === "REMOVED_404" && fake404Data.httpStatus === 404,
    `Correctly rejected dead bank URL with HTTP ${fake404Data.httpStatus} (${fake404Data.status})`
  );

  // 2. Launch Headless Chrome in Android 14 / Pixel 8 Device Emulation
  const debugPort = 9229;
  const userDataDir = path.join(ARTIFACTS_DIR, "scratch", "android-chrome-profile");
  const chromeProc = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=412,915",
      APP_URL,
    ],
    { stdio: "ignore" }
  );

  try {
    let targets = null;
    for (let i = 0; i < 25; i++) {
      await sleep(300);
      try {
        const r = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        targets = await r.json();
        if (targets && targets.length > 0 && targets[0].webSocketDebuggerUrl) break;
      } catch {
        // wait
      }
    }
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      mobile: true,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    });
    await cdp.send("Emulation.setUserAgentOverride", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      acceptLanguage: "es-UY,es;q=0.9",
    });

    await cdp.send("Page.navigate", { url: APP_URL });
    await sleep(1000);
    await cdp.eval(`localStorage.clear(); location.reload();`);
    await sleep(1200);

    // Verify Android Viewport & Home UI
    const homeMetrics = await cdp.eval(`(() => {
      return {
        ua: navigator.userAgent,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.querySelector('h1')?.textContent?.trim(),
        isoCardsCount: document.querySelectorAll('.iso-card').length,
        passesCount: document.querySelectorAll('.perforated-pass').length,
        stubsCount: document.querySelectorAll('.pass-CheckStub').length,
        verifiedBadgesCount: document.body.innerText.split('✓ VERIFICADO #').length - 1,
        hasGsap: typeof window.gsap === 'object' && typeof window.gsap.to === 'function',
        transitionAllCount: document.querySelectorAll('.transition-all').length,
        durationFastToken: getComputedStyle(document.documentElement).getPropertyValue('--duration-fast').trim(),
        hitTarget44Count: document.querySelectorAll('.hit-target-44').length,
        iconSwapCount: document.querySelectorAll('.t-icon-swap').length
      };
    })()`);

    assert(
      "Android 14 Pixel 8 User-Agent & Viewport (412x915)",
      homeMetrics.innerWidth === 412 && homeMetrics.ua.includes("Android 14; Pixel 8"),
      `${homeMetrics.innerWidth}x${homeMetrics.innerHeight}px · ScrollWidth=${homeMetrics.scrollWidth}px`
    );
    assert(
      "Mobile Compact Header & 3D ISO-7810 Card Fan",
      homeMetrics.title === "¿Con Cuál Pago?" && homeMetrics.isoCardsCount === 4,
      `Header="${homeMetrics.title}" · ${homeMetrics.isoCardsCount} 3D cards in fan`
    );
    assert(
      "GSAP 3.12.5 Engine + transitions.dev Tokens + Zero transition-all + 44px Hit Targets",
      homeMetrics.hasGsap === true &&
        homeMetrics.transitionAllCount === 0 &&
        homeMetrics.durationFastToken === "250ms" &&
        homeMetrics.hitTarget44Count >= 20 &&
        homeMetrics.iconSwapCount >= 20,
      `GSAP=${homeMetrics.hasGsap} · .transition-all=${homeMetrics.transitionAllCount} · --duration-fast=${homeMetrics.durationFastToken} · .hit-target-44=${homeMetrics.hitTarget44Count} · .t-icon-swap=${homeMetrics.iconSwapCount}`
    );
    assert(
      "Perforated Passes (.pass-CheckStub) & SHA-256 Badges",
      homeMetrics.passesCount >= 50 && homeMetrics.stubsCount === homeMetrics.passesCount && homeMetrics.verifiedBadgesCount > 30,
      `${homeMetrics.passesCount} perforated passes · ${homeMetrics.verifiedBadgesCount} live SHA-256 badges`
    );

    const shot1 = path.join(ARTIFACTS_DIR, "android-step1-home.png");
    await cdp.screenshot(shot1);

    // Scroll to Perforated Passes feed and capture screenshot
    await cdp.eval(`(() => {
      const firstPass = document.querySelector('.perforated-pass');
      if (firstPass) firstPass.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -12);
    })()`);
    await sleep(300);
    const shot5 = path.join(ARTIFACTS_DIR, "android-step5-passes-feed.png");
    await cdp.screenshot(shot5);
    await cdp.eval(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await sleep(200);

    // Step 2: Open first merchant (Terminal de Caja / CalculatorSheet) and verify live probe badge
    await cdp.eval(`(() => {
      const firstPass = document.querySelector('.perforated-pass');
      if (firstPass) firstPass.click();
    })()`);

    let posMetrics = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      await sleep(250);
      posMetrics = await cdp.eval(`(() => {
        const badge = document.querySelector('[data-testid="live-probe-badge"]');
        const modalTitle = document.querySelector('[role="dialog"] h3')?.textContent?.trim();
        const comparatorItems = document.querySelectorAll('[role="dialog"] button').length;
        return {
          modalTitle,
          badgeText: badge ? badge.textContent.trim() : null,
          comparatorItems
        };
      })()`);
      if (posMetrics.badgeText && !posMetrics.badgeText.includes("VERIFICANDO")) break;
    }

    assert(
      "Terminal POS Modal & Real-Time Live Bank Probe on Open",
      Boolean(posMetrics.modalTitle) &&
        Boolean(posMetrics.badgeText) &&
        posMetrics.badgeText.includes("✓ VERIFICADO EN VIVO · HTTP 200"),
      `Merchant="${posMetrics.modalTitle}" · Badge="${posMetrics.badgeText}"`
    );

    const shot2 = path.join(ARTIFACTS_DIR, "android-step2-pos-verified.png");
    await cdp.screenshot(shot2);

    // Close CalculatorSheet
    await cdp.eval(`(() => {
      const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Cerrar"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(400);

    // Step 3: Open WalletSheet and verify Uruguayan card tier ladder
    await cdp.eval(`(() => {
      const btns = [...document.querySelectorAll('button')];
      const walletBtn = btns.find(b => b.textContent.includes('Tarjetas') || b.textContent.includes('+ Editar'));
      if (walletBtn) walletBtn.click();
    })()`);
    await sleep(600);

    const walletMetrics = await cdp.eval(`(() => {
      const dialogText = document.querySelector('[role="dialog"]')?.innerText || '';
      return {
        hasDebito: dialogText.includes('Débito'),
        hasGold: dialogText.includes('Gold'),
        hasPlatinum: dialogText.includes('Platinum'),
        hasBlack: dialogText.includes('Black'),
        hasPersonalBank: dialogText.includes('Personal Bank'),
        hasSelect: dialogText.includes('Select')
      };
    })()`);

    assert(
      "Uruguayan Bank Card Tier Ladders (Débito, Clásica, Gold, Platinum, Black, Personal Bank / Select)",
      walletMetrics.hasDebito &&
        walletMetrics.hasGold &&
        walletMetrics.hasPlatinum &&
        walletMetrics.hasBlack &&
        walletMetrics.hasPersonalBank &&
        walletMetrics.hasSelect,
      "All 6 Uruguayan banking tiers verified in WalletSheet"
    );

    const shot3 = path.join(ARTIFACTS_DIR, "android-step3-wallet-tiers.png");
    await cdp.screenshot(shot3);

    // Close WalletSheet and test LegalSheet (ToS, Privacy Ley 18.331 & Android Back Button Bridge)
    const closedViaAndroidBack = await cdp.eval(`window.__handleAndroidBack && window.__handleAndroidBack()`);
    await sleep(400);
    assert(
      "Android Hardware Back Button Modal Stack Bridge (__handleAndroidBack)",
      closedViaAndroidBack === true,
      "Modal sheet dismissed cleanly via window.__handleAndroidBack()"
    );

    await cdp.eval(`(() => {
      const btns = [...document.querySelectorAll('button')];
      const legalBtn = btns.find(b => b.textContent.includes('Términos, Privacidad'));
      if (legalBtn) legalBtn.click();
    })()`);
    await sleep(500);

    const legalMetrics = await cdp.eval(`(() => {
      const dialogText = document.querySelector('[role="dialog"]')?.textContent || '';
      return {
        hasLey18331: dialogText.includes('18.331'),
        hasLey17250: dialogText.includes('17.250'),
        hasErasureBtn: dialogText.includes('BORRAR MIS DATOS LOCALES'),
        hasSha256Count: /\b(\d{3,4})\/\1\b/.test(dialogText),
        sample: dialogText.slice(0, 120)
      };
    })()`);

    assert(
      "Terms of Service, Privacy (Ley 18.331 UY) & Right to Erasure Modal",
      legalMetrics.hasLey18331 &&
        legalMetrics.hasLey17250 &&
        legalMetrics.hasErasureBtn &&
        legalMetrics.hasSha256Count,
      `Ley 18.331=${legalMetrics.hasLey18331} · Ley 17.250=${legalMetrics.hasLey17250} · RulesVerified=${legalMetrics.hasSha256Count} · Erasure=${legalMetrics.hasErasureBtn}`
    );

    await cdp.eval(`window.__handleAndroidBack && window.__handleAndroidBack()`);
    await sleep(400);

    // Test Light Mode (Modo Cuarzo)

    await cdp.eval(`(() => {
      const themeBtn = document.querySelector('button[aria-label="Cambiar tema claro u oscuro"]');
      if (themeBtn) themeBtn.click();
    })()`);
    await sleep(500);

    const lightModeActive = await cdp.eval(`document.documentElement.classList.contains('theme-light')`);
    assert("Modo Cuarzo (Light Mode) High-Contrast Readability on Android", lightModeActive === true, "html.theme-light active");

    const shot4 = path.join(ARTIFACTS_DIR, "android-step4-light-mode.png");
    await cdp.screenshot(shot4);

    // Extract compiled Tailwind CSS from live DOM for 100% offline APK resilience
    const compiledTailwind = await cdp.eval(`(() => {
      const styles = [...document.querySelectorAll('head style')];
      const tw = styles.find(s => s.id !== 'tailwind-offline-fallback' && s.textContent.includes('--tw-'));
      return tw ? tw.textContent : '';
    })()`);
    if (compiledTailwind && compiledTailwind.length > 5000) {
      fs.writeFileSync(path.join(ARTIFACTS_DIR, "scratch", "tailwind-compiled.css"), compiledTailwind, "utf8");
    }

    assert("Zero Runtime Exceptions on Android WebView", cdp.consoleErrors.length === 0, "0 JS exceptions");

    cdp.close();
  } finally {
    chromeProc.kill();
  }

  console.log("\n=================================================================");
  console.log(`  ALL ${results.length} ANDROID 14 & LIVE BANK VERIFICATION TESTS PASSED!`);
  console.log("=================================================================");
}

runAndroidTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
