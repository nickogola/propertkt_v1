// Capture "after" screenshots of the redesigned UI at phone + desktop widths.
// Run: node ui-check.mjs   (requires dev server on http://localhost:3000)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SignJWT } from "jose";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(__dirname, "ui-review");
fs.mkdirSync(outDir, { recursive: true });

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

async function sign(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(env.SESSION_SECRET));
}

const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({ executablePath, headless: "new" });

const adminToken = await sign({ role: "admin", email: env.ADMIN_EMAIL ?? "admin@localhost" });
const tenantsResp = await fetch("http://localhost:3000/api/tenants", {
  headers: { Cookie: `pm_session=${adminToken}` },
});
const { tenants } = await tenantsResp.json();
const t0 = tenants[0];
const tenantToken = await sign({ role: "tenant", tenantId: t0.id, email: t0.email });

const DESKTOP = { width: 1280, height: 800, deviceScaleFactor: 1.5 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function shoot(name, url, viewport, cookie) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (cookie) await page.setCookie({ name: "pm_session", value: cookie, domain: "localhost", path: "/" });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log("Captured", name);
  await page.close();
}

await shoot("landing-desktop", "http://localhost:3000/", DESKTOP);
await shoot("landing-mobile", "http://localhost:3000/", MOBILE);
await shoot("tenant-new-mobile", "http://localhost:3000/tenant/new", MOBILE, tenantToken);
await shoot("tenant-tickets-mobile", "http://localhost:3000/tenant/tickets", MOBILE, tenantToken);
await shoot("tenant-new-desktop", "http://localhost:3000/tenant/new", DESKTOP, tenantToken);
await shoot("admin-dashboard-desktop", "http://localhost:3000/admin", DESKTOP, adminToken);
await shoot("admin-dashboard-mobile", "http://localhost:3000/admin", MOBILE, adminToken);
await shoot("admin-tenants-mobile", "http://localhost:3000/admin/tenants", MOBILE, adminToken);
await shoot("admin-tickets-desktop", "http://localhost:3000/admin/tickets", DESKTOP, adminToken);

await browser.close();
console.log("Done.");
