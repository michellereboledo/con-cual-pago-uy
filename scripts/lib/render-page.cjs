/**
 * Renderiza páginas con Chrome headless (CDP) y devuelve document.body.innerText.
 * Necesario para portales bancarios que cargan los beneficios por JavaScript
 * (Itaú restaurantes, Santander, BBVA).
 * Requiere Node >= 20 con --experimental-websocket (o Node 22+).
 */
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchRenderer(port = 9333) {
  const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chrome) throw new Error("Chrome no encontrado (definir CHROME_PATH)");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-audit-"));
  const proc = spawn(
    chrome,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-sandbox",
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) break;
    } catch {}
  }

  async function render(url, waitMs = 4500) {
    const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res);
      ws.addEventListener("error", rej);
    });
    let id = 0;
    const pending = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    });
    const send = (method, params = {}) =>
      new Promise((res) => {
        const i = ++id;
        pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    try {
      await send("Page.enable");
      await send("Page.navigate", { url });
      await sleep(waitMs);
      // scroll para disparar lazy-load
      await send("Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight)" });
      await sleep(800);
      const r = await send("Runtime.evaluate", {
        expression: "document.body ? document.body.innerText : ''",
        returnByValue: true,
      });
      return r.result?.result?.value || "";
    } finally {
      ws.close();
      fetch(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    }
  }

  return {
    render,
    close: () => {
      try {
        proc.kill();
      } catch {}
    },
  };
}

module.exports = { launchRenderer };
