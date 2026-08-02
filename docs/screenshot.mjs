// Capture screenshots of the running ProperTkt app for the spec doc.
// Run: node screenshot.mjs   (requires the dev server on http://localhost:3000)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "node:fs";
import { SignJWT } from "jose";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(__dirname, "screenshots");
fs.mkdirSync(outDir, { recursive: true });

// Parse the project's .env.local for SESSION_SECRET, ADMIN_EMAIL
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/i);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const env = { ...loadEnv(path.join(projectRoot, ".env")), ...loadEnv(path.join(projectRoot, ".env.local")) };
const SESSION_SECRET = env.SESSION_SECRET;
const ADMIN_EMAIL = env.ADMIN_EMAIL ?? "admin@localhost";
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET missing or too short in .env.local. Aborting.");
  process.exit(1);
}

const SQLITE_DB = path.join(projectRoot, "prisma", "dev.db");

async function sign(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(SESSION_SECRET));
}

// We need a tenant ID. Read it straight from the SQLite file via better-sqlite is overkill —
// just hit the API after admin login.
async function adminFetch(browser, url) {
  const adminToken = await sign({ role: "admin", email: ADMIN_EMAIL });
  const page = await browser.newPage();
  await page.setCookie({ name: "pm_session", value: adminToken, domain: "localhost", path: "/" });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const body = await page.evaluate(() => document.body.innerText);
  await page.close();
  return body;
}

const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge found in standard locations.");
  process.exit(1);
}
console.log("Using browser:", executablePath);

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
});

async function shoot(name, url, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  if (opts.cookie) {
    await page.setCookie({ name: "pm_session", value: opts.cookie, domain: "localhost", path: "/" });
  }
  if (opts.mobile) {
    await page.setViewport({ width: 414, height: 820, deviceScaleFactor: 2, isMobile: true });
  }
  await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
  // Small settle to let fonts/transitions finish
  await new Promise((r) => setTimeout(r, 300));
  if (opts.click) {
    for (const sel of opts.click) {
      try { await page.click(sel); await new Promise((r) => setTimeout(r, 200)); } catch {}
    }
  }
  const out = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: out, fullPage: opts.fullPage ?? true });
  console.log("Captured", name, "→", out);
  await page.close();
}

// Fetch a tenant ID via the admin tenants API
const adminToken = await sign({ role: "admin", email: ADMIN_EMAIL });
const tenantsResp = await fetch("http://localhost:3000/api/tenants", {
  headers: { Cookie: `pm_session=${adminToken}` },
});
const { tenants } = await tenantsResp.json();
if (!tenants?.length) {
  console.error("No tenants in DB — seed first.");
  process.exit(1);
}
const tenantId = tenants[0].id;
const tenantEmail = tenants[0].email;
const tenantToken = await sign({ role: "tenant", tenantId, email: tenantEmail });

// Ensure at least one ticket exists for nicer screenshots
const ticketsResp = await fetch("http://localhost:3000/api/tickets", {
  headers: { Cookie: `pm_session=${adminToken}` },
});
const ticketsData = await ticketsResp.json();
if ((ticketsData.tickets ?? []).length === 0) {
  console.log("Seeding a sample ticket…");
  await fetch("http://localhost:3000/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `pm_session=${tenantToken}` },
    body: JSON.stringify({
      category: "Plumbing",
      title: "Kitchen sink leaking under cabinet",
      description: "Water pooling overnight; placed a bucket. Available evenings.",
      urgency: "high",
    }),
  });
}

await shoot("01-landing", "http://localhost:3000/");
await shoot("02-tenant-login", "http://localhost:3000/tenant/login");
await shoot("03-tenant-dashboard", "http://localhost:3000/tenant", { cookie: tenantToken });
await shoot("04-admin-login", "http://localhost:3000/admin/login");
await shoot("05-admin-dashboard", "http://localhost:3000/admin", { cookie: adminToken });
await shoot("06-admin-tenants", "http://localhost:3000/admin/tenants", { cookie: adminToken });
await shoot("07-admin-tickets", "http://localhost:3000/admin/tickets", { cookie: adminToken, click: ["li.card button"] });
await shoot("08-admin-notify", "http://localhost:3000/admin/notify", { cookie: adminToken });

// One mobile shot to illustrate responsiveness
await shoot("09-mobile-tenant", "http://localhost:3000/tenant", { cookie: tenantToken, mobile: true });

await browser.close();
console.log("Done.");
