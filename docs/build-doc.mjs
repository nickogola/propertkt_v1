// Build the ProperTkt functional & technical specification (.docx).
// Run: node build-doc.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageBreak, PageNumber, TableOfContents,
  Bookmark, InternalHyperlink, ExternalHyperlink,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shotsDir = path.join(__dirname, "screenshots");
const outPath = path.join(__dirname, "ProperTkt-Functional-Spec.docx");

// Read PNG dimensions from header
function pngDims(file) {
  const buf = fs.readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), data: buf };
}

// Embed an image scaled to a target width (px ≈ 1/96 in for docx-js).
function img(file, targetWidthPx = 540, alt = "Screenshot") {
  const { w, h, data } = pngDims(file);
  const ratio = h / w;
  const width = Math.round(targetWidthPx);
  const height = Math.round(width * ratio);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [
      new ImageRun({
        type: "png",
        data,
        transformation: { width, height },
        altText: { title: alt, description: alt, name: alt.replace(/\W+/g, "_") },
      }),
    ],
  });
}

// Quick helpers
const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: opts.before ?? 40, after: opts.after ?? 40 },
    alignment: opts.align,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color, size: opts.size })],
  });
// pageBreakBefore is reserved for explicit transitions; H1 flows by default so
// content packs into the 10-page budget.
const H1 = (text, bookmark, opts = {}) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: opts.pageBreak ?? false,
    children: bookmark
      ? [new Bookmark({ id: bookmark, children: [new TextRun(text)] })]
      : [new TextRun(text)],
  });
const H2 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const H3 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
const Bul = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: typeof text === "string" ? [new TextRun(text)] : text,
  });
const Num = (text) =>
  new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun(text)] });
const Code = (text) =>
  new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Consolas", size: 18 })],
    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
  });

// Table helpers
const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
const borders = { top: border, bottom: border, left: border, right: border };
function cell({ text, bold, fill, width }) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: Array.isArray(text)
          ? text
          : [new TextRun({ text: String(text), bold, size: 18 })],
      }),
    ],
  });
}
function table(columnWidths, rows, headerRow = true) {
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: rows.map((row, i) =>
      new TableRow({
        children: row.map((c, j) =>
          cell({
            text: c,
            bold: i === 0 && headerRow,
            fill: i === 0 && headerRow ? "E0E7FF" : undefined,
            width: columnWidths[j],
          }),
        ),
      }),
    ),
  });
}

// ---------- CONTENT ----------

const cover = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 120 },
    children: [new TextRun({ text: "ProperTkt", bold: true, size: 56, color: "4F46E5" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Functional & Technical Specification", size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: "Maintenance tickets and notices for small landlords", italics: true, color: "475569", size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: "Audience: senior application developer building the desktop and mobile builds.", size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Web reference: Next.js 14 + Prisma + SQLite/Postgres + Resend.", size: 20 })] }),
];

const overview = [
  H1("1. Overview", "sec1"),
  P("ProperTkt is a thin operations app for a single small landlord (1–10 units). Tenants submit maintenance tickets from any device with email-only authentication; the landlord triages tickets and sends notices (rent reminders, trash pickup, repair windows) from an admin portal. The product is intentionally narrow so the desktop and mobile builds can ship quickly on top of the existing API."),
  H2("Goals (v1)"),
  Bul("Tenants can sign in by email and file a maintenance ticket in under 30 seconds."),
  Bul("Landlord can manage tenants, triage tickets, and email notices from one place."),
  Bul("All status changes by the landlord automatically email the tenant."),
  Bul("The desktop and mobile builds reuse the same HTTP API and data model; no UI parity is required."),
  H2("Out of scope (v1)"),
  Bul("SMS / push notifications (architected for later — see §7)."),
  Bul("Payments, rent ledger, lease document storage."),
  Bul("Multi-property / multi-landlord tenancy. The app assumes one landlord."),
  Bul("Tenant-to-tenant messaging or public listing pages."),
  H2("Reference stack"),
  table([3200, 6160], [
    ["Layer", "Implementation"],
    ["Frontend", "Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS"],
    ["API", "Next.js Route Handlers (REST/JSON)"],
    ["Database", "Prisma ORM; SQLite for dev, Postgres for prod"],
    ["Auth", "Signed JWT cookie (jose, HS256); admin password from env; tenant magic link"],
    ["Email", "Resend (REST). Console fallback when API key is unset."],
    ["Hosting", "Vercel + Vercel Postgres (target)"],
  ]),
];

const flows = [
  H1("2. Personas & user flows", "sec2"),
  H2("Personas"),
  Bul([new TextRun({ text: "Tenant — ", bold: true }), new TextRun("non-technical, mobile-first. Opens link from email or app, reports an issue, checks status.")]),
  Bul([new TextRun({ text: "Landlord (admin) — ", bold: true }), new TextRun("one user. Manages 1–10 tenants, triages tickets, sends notices. Equally likely on phone or laptop.")]),
  H2("Tenant flow"),
  Num("Tenant opens app → enters email → receives one-time sign-in link (15 min TTL, single-use)."),
  Num("Clicks link → session cookie set (30 days) → lands on tenant dashboard."),
  Num("Selects category (Plumbing, Appliance, HVAC, Electrical, Pest, Other), urgency, types title + details, submits."),
  Num("Sees ticket in their list with status pill. Receives email when landlord updates status or adds a note."),
  H2("Admin flow"),
  Num("Admin signs in with email + password (single account, stored in env)."),
  Num("Dashboard shows tenant count, open ticket count, recent activity."),
  Num("From Tenants page: add / edit / delete tenants (cascade deletes their tickets)."),
  Num("From Tickets page: filter active / closed / all, expand a ticket, change status, add a private note → tenant is emailed."),
  Num("From Send notice page: choose a template (rent / trash / repair / custom), edit subject + body, pick recipients, send. Each send is audit-logged."),
  H2("Email touchpoints (v1)"),
  table([3200, 6160], [
    ["Trigger", "Recipient"],
    ["Tenant requests sign-in link", "Tenant"],
    ["Tenant submits a ticket", "Landlord (admin email)"],
    ["Admin updates ticket status", "Tenant"],
    ["Admin sends notice blast", "Selected tenants"],
  ]),
];

const uiTenant = [
  H1("3. UI specification — tenant", "sec3"),
  P("All tenant routes are responsive web pages today. The mobile build should mirror the same information architecture (sign-in → dashboard with form + ticket list). Tenant pages are gated by a session cookie; an unauthenticated visitor is redirected to /tenant/login by middleware."),
  H2("3.1 Landing & login"),
  img(path.join(shotsDir, "02-tenant-login.png"), 320, "Tenant login"),
  P("Email-only sign-in (left). The API always returns 200 to avoid revealing which addresses are on file. In dev mode (NODE_ENV=development) the request endpoint signs the user in immediately so testing is fast. The public landing route (/) is a static marketing splash with two role cards; the native builds can skip it and deep-link to tenant or admin sign-in."),
  H2("3.2 Tenant dashboard"),
  img(path.join(shotsDir, "03-tenant-dashboard.png"), 380, "Tenant dashboard"),
  P("One screen: hero summary (\"You have N open tickets\"), maintenance form (category tiles + urgency segmented control + title + details), and a reverse-chronological list of the tenant's tickets with category icon, urgency pill, status pill, and any landlord note."),
];

const uiAdmin = [
  H1("4. UI specification — admin", "sec4"),
  P("Admin sign-in is email + password (credentials in env: ADMIN_EMAIL, ADMIN_PASSWORD; constant-time comparison). After sign-in the sticky header exposes four destinations: Dashboard, Tenants, Tickets, Send notice. Below: the dashboard and the three working surfaces."),
  H2("4.1 Dashboard"),
  img(path.join(shotsDir, "05-admin-dashboard.png"), 400, "Admin dashboard"),
  P("Three stat tiles link to detail pages; recent tickets list reuses the ticket card pattern; quick-action row provides one-tap routes."),
  H2("4.2 Tenants"),
  img(path.join(shotsDir, "06-admin-tenants.png"), 400, "Admin tenants"),
  P("Table of unit, name, email, phone, and ticket count. Add/Edit opens a modal with backdrop blur; delete cascades to tickets after a confirm."),
  H2("4.3 Tickets"),
  img(path.join(shotsDir, "07-admin-tickets.png"), 400, "Admin tickets"),
  P("Segmented filter (Active / All / Closed) with live counts. Rows expand inline to show full description, status dropdown, and a free-form note that is emailed to the tenant on save."),
  H2("4.4 Send notice"),
  img(path.join(shotsDir, "08-admin-notify.png"), 400, "Admin notify"),
  P("Template tiles (rent, trash, repair, custom) populate subject + body; admin edits, picks recipients (preselected to all), and sends. Every blast is logged to a Notification row."),
];

const designSystem = [
  H1("5. Design system", "sec5"),
  H2("Palette"),
  table([2400, 2400, 4560], [
    ["Token", "Hex", "Usage"],
    ["brand-600", "#4F46E5", "Primary buttons, active nav, focus rings"],
    ["brand-50/100", "#EEF2FF / #E0E7FF", "Selected states, badge backgrounds"],
    ["slate-50/100/200", "#F8FAFC / #F1F5F9 / #E2E8F0", "Surfaces, hover, borders"],
    ["emerald-600", "#059669", "Success, online indicator"],
    ["amber-700", "#B45309", "In-progress status, warnings"],
    ["red-600", "#DC2626", "Emergency urgency, destructive"],
  ]),
  H2("Type"),
  Bul("System UI sans (Segoe UI / SF / Roboto). H1 24–32px / 700; H2 18px / 600; body 14px / 400."),
  Bul("Tracking-tight on H1; numeric lining figures for stat tiles."),
  H2("Components"),
  Bul("Card: rounded-xl, border-slate-200, soft shadow; hover variant lifts and tints border."),
  Bul("Pill: rounded-full, 12px, ring-1 inset; one variant per state and urgency."),
  Bul("Button: 14px, rounded-lg, primary / secondary / ghost / danger. All have :focus-visible ring."),
  Bul("Modal: fixed overlay 40% slate-900 with backdrop-blur; close on overlay click or ✕."),
  Bul("Status & urgency tokens live in src/lib/ticket-ui.ts and should be ported verbatim to native builds."),
  H2("Mobile reference"),
  img(path.join(shotsDir, "09-mobile-tenant.png"), 180, "Mobile tenant view"),
  P("The web build is already mobile-responsive at 414px. The native mobile build should preserve the category-tile picker and pill metaphors but consider replacing the dashboard form with a full-screen \"New ticket\" sheet."),
];

const apiSpec = [
  H1("6. API specification", "sec6"),
  P("All endpoints are JSON over HTTPS, hosted under /api. The session is carried in the pm_session cookie (HS256 JWT, httpOnly, 30-day max-age, SameSite=Lax). Native clients should reuse this exact contract; the cookie can be replaced with an Authorization: Bearer <jwt> header in v1.1 (see §9)."),
  H2("6.1 Auth model"),
  table([2400, 7000], [
    ["Role", "Acquisition"],
    ["admin", "POST /api/auth/admin/login with { email, password }. Server compares against env values (constant-time) and sets cookie."],
    ["tenant", "POST /api/auth/tenant/request with { email }. Server issues a single-use, 15-min token; emails a magic link. GET /api/auth/tenant/verify?token=… exchanges it for a session cookie."],
    ["logout", "POST /api/auth/logout clears the cookie."],
  ]),
  H2("6.2 Endpoints"),
  table([1100, 3000, 1400, 3860], [
    ["Method", "Path", "Role", "Purpose"],
    ["POST", "/api/auth/admin/login", "public", "Admin password sign-in. 401 on mismatch."],
    ["POST", "/api/auth/tenant/request", "public", "Issue a magic link (always 200, even if email unknown)."],
    ["GET",  "/api/auth/tenant/verify", "public", "Exchange token → session cookie → 307 to /tenant."],
    ["POST", "/api/auth/logout", "any", "Clear session cookie."],
    ["GET",  "/api/tenants", "admin", "List all tenants with ticket counts."],
    ["POST", "/api/tenants", "admin", "Create tenant { name, email, unit, phone?, notes? }."],
    ["PATCH","/api/tenants/{id}", "admin", "Partial update of a tenant."],
    ["DELETE","/api/tenants/{id}", "admin", "Delete tenant; cascades tickets."],
    ["GET",  "/api/tickets", "admin|tenant", "Admin: all tickets. Tenant: own tickets only."],
    ["POST", "/api/tickets", "tenant", "Create ticket. Emails admin."],
    ["PATCH","/api/tickets/{id}", "admin", "Update status / adminNotes. Emails tenant on status change."],
    ["POST", "/api/notify", "admin", "Send blast { subject, body, recipientIds[] }. Returns { sent, total, failures[] }."],
  ]),
  H2("6.3 Validation & errors"),
  Bul("Every body is parsed with Zod; 400 returns { error, issues? }."),
  Bul("401 with { error: \"Unauthorized\" } for missing/invalid session."),
  Bul("5xx returns { error: string } with no stack traces in production."),
  H2("6.4 Example: create ticket"),
  Code("POST /api/tickets   Cookie: pm_session=<JWT>"),
  Code("{ \"category\": \"Plumbing\", \"urgency\": \"high\", \"title\": \"…\", \"description\": \"…\" }"),
  Code("→ 200 { \"ticket\": { id, tenantId, category, urgency, status, createdAt, … } }"),
];

const backend = [
  H1("7. Backend specification", "sec7"),
  H2("7.1 Data model"),
  P("Prisma schema lives at prisma/schema.prisma. All IDs are CUIDs."),
  table([2000, 7360], [
    ["Entity", "Fields"],
    ["Tenant", "id, name, email (unique), phone?, unit, notes?, createdAt, updatedAt → has many Tickets (cascade delete)"],
    ["Ticket", "id, tenantId, category, title, description, urgency (low|normal|high|emergency), status (open|in_progress|resolved|closed), adminNotes?, createdAt, updatedAt"],
    ["MagicLink", "id, email, tokenHash (SHA-256, unique), expiresAt (15 min), usedAt?, createdAt"],
    ["Notification", "id, subject, body, recipients (JSON), sentCount, sentAt — audit log of every blast"],
  ]),
  H2("7.2 Sessions"),
  Bul("Cookie name pm_session. Value is a HS256 JWT { role, email, tenantId? } signed with SESSION_SECRET (≥32 bytes)."),
  Bul("Token expiration 30 days; rotated on each successful sign-in."),
  Bul("Middleware (src/middleware.ts) gates /admin/* and /tenant/* in front of route handlers."),
  H2("7.3 Email"),
  Bul("Single abstraction src/lib/email.ts → Resend. When RESEND_API_KEY is unset, messages print to stdout (dev mode)."),
  Bul("EMAIL_FROM must be on a verified Resend domain in production."),
  Bul("All outbound mail is plain-text with optional HTML twin for the magic link."),
  H2("7.4 Business rules / invariants"),
  Bul("Magic links: single-use, hashed at rest (only the hash is stored), TTL 15 min."),
  Bul("Tenant-login endpoint always returns 200 — never leak existence of an email."),
  Bul("Tenants can only read their own tickets; admin can read all."),
  Bul("Deleting a tenant cascades their tickets but does not delete past Notification audit rows."),
  Bul("Status updates from admin always trigger a tenant email — there is no \"silent\" change in v1."),
  H2("7.5 Configuration"),
  table([3000, 6360], [
    ["Env var", "Purpose"],
    ["DATABASE_URL", "Prisma connection string (file:./dev.db for SQLite; postgres://… for prod)"],
    ["SESSION_SECRET", "32+ byte HMAC key for JWT signing"],
    ["ADMIN_EMAIL / ADMIN_PASSWORD", "Single admin credential"],
    ["RESEND_API_KEY", "Email transport; blank ⇒ console mode"],
    ["EMAIL_FROM", "From: header, must be on a verified domain in prod"],
    ["APP_URL", "Public base URL used inside magic-link emails"],
  ]),
];

const desktopMobile = [
  H1("8. Desktop & mobile build guidance", "sec8"),
  P("Both builds should be thin clients of the existing HTTP API. Treat the web app as the API host and reference UI."),
  H2("8.1 Recommended stacks"),
  table([2400, 3500, 3460], [
    ["Target", "Recommended", "Why"],
    ["Desktop (Win/Mac)", "Tauri 2 (Rust shell + web UI)", "Small bundles (~3 MB), single codebase shared with web, secure IPC, code-sign on both platforms."],
    ["Desktop (alt.)", "Electron", "Pick only if the team already ships Electron — heavier bundles but more docs and integrations."],
    ["Mobile (iOS/Android)", "React Native + Expo", "Reuses TS types from /src/lib/ticket-ui.ts; first-class push, deep-linking, and OTA updates via EAS."],
    ["Mobile (alt.)", "Flutter", "Choose if the team prefers Dart or already has Flutter staff. The API is identical."],
  ]),
  H2("8.2 What to reuse"),
  Bul("HTTP contract from §6 — do not fork."),
  Bul("Status/urgency/category constants and colors from src/lib/ticket-ui.ts (port verbatim)."),
  Bul("Email templates and subject lines from src/app/admin/notify/notify-client.tsx."),
  H2("8.3 What changes vs. web"),
  Bul([new TextRun({ text: "Authentication. ", bold: true }), new TextRun("Replace the cookie with an Authorization: Bearer <JWT> header. Add POST /api/auth/tenant/exchange that returns the raw JWT (instead of Set-Cookie) so native clients can store it in OS keychain / Keystore.")]),
  Bul([new TextRun({ text: "Magic link → universal/app link. ", bold: true }), new TextRun("Configure Apple Associated Domains and Android App Links so /tenant/verify deep-links into the app.")]),
  Bul([new TextRun({ text: "Push notifications. ", bold: true }), new TextRun("Add a Device model { id, tenantId|adminId, platform, pushToken } and a POST /api/devices endpoint. Trigger push instead of (or in addition to) email when a ticket status changes.")]),
  Bul([new TextRun({ text: "Offline. ", bold: true }), new TextRun("Cache the tickets list (last 30 days) and the new-ticket form; queue submissions when offline. Use SQLite (Tauri) / WatermelonDB (RN).")]),
  Bul([new TextRun({ text: "File attachments. ", bold: true }), new TextRun("Plan for photo uploads on tickets in v1.1 — see §10. Mobile should pre-wire the camera permission.")]),
  H2("8.4 Build / release"),
  Bul("Desktop: Tauri's tauri build produces signed installers; ship via GitHub Releases + auto-update."),
  Bul("Mobile: Expo EAS for builds and OTA. TestFlight for iOS, internal track for Play Console."),
  Bul("Versioning: align native app build number to the API minor version it requires."),
];

const nfr = [
  H1("9. Non-functional requirements", "sec9"),
  H2("Security"),
  Bul("Session JWT signed HS256 with rotated 32-byte secret. Cookie httpOnly + Secure + SameSite=Lax."),
  Bul("Magic-link tokens hashed (SHA-256) before persistence; single-use; 15-min TTL."),
  Bul("Constant-time password comparison; rate-limit /api/auth/* in production (target 10/min/IP)."),
  Bul("Input validated with Zod at every route; SQL access only via Prisma."),
  Bul("PII (tenant emails, phones) never appears in URLs or logs."),
  H2("Performance"),
  Bul("Web TTFB < 300 ms on Vercel edge; pages ship < 80 KB JS gzipped at p50."),
  Bul("Database: single-property load (<10 tenants, <1k tickets/yr) easily fits SQLite/Postgres free tier."),
  Bul("Native: cold start < 2 s on a midrange phone; first paint < 800 ms."),
  H2("Accessibility"),
  Bul("All controls keyboard reachable; visible focus rings retained."),
  Bul("Color contrast meets WCAG AA against slate-50 background."),
  Bul("Form errors announced via aria-live and associated with their input."),
  H2("Internationalization"),
  Bul("Current copy is en-US. Native builds should externalize strings to a JSON catalog and plan for es-US (NJ market)."),
  H2("Observability"),
  Bul("Server logs: every email send (id, recipient, result) and every notification audit row."),
  Bul("Add Sentry or Logflare for production error capture before launching mobile."),
];

const roadmap = [
  H1("10. Roadmap & open questions", "sec10"),
  H2("v1.1 (next 6–8 weeks)"),
  Bul("Bearer-token auth endpoint for native clients (§8.3)."),
  Bul("SMS via Twilio behind the same email.ts abstraction; recipient picker grows a channel toggle."),
  Bul("Push notifications with FCM/APNs."),
  Bul("Photo attachments on tickets (S3 / Vercel Blob)."),
  H2("v2 (later)"),
  Bul("Rent ledger and payment recording (read-only first)."),
  Bul("Multi-property support — promotes the schema from one landlord to many."),
  Bul("Contractor accounts (read tickets assigned to them, mark complete)."),
  H2("Open questions for the senior dev"),
  Bul("Should desktop be a Tauri wrapper around the existing web build, or a fully native Tauri+React UI?"),
  Bul("Do we want one mobile codebase (RN) or split iOS/Android native? Recommend RN unless we need deep platform features."),
  Bul("Acceptable cold-start budget for the offline cache (target 30 days of tickets)?"),
  Bul("Does the landlord need an on-call mode (forward emergency tickets to SMS even on weekends)?"),
];

// ---------- ASSEMBLE ----------

const doc = new Document({
  creator: "ProperTkt",
  title: "ProperTkt Functional & Technical Specification",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } }, // 11pt
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "1E293B" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "4F46E5" },
        paragraph: { spacing: { before: 140, after: 60 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 20, bold: true, font: "Arial", color: "334155" },
        paragraph: { spacing: { before: 100, after: 40 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 900, right: 1080, bottom: 900, left: 1080 }, // 0.625" / 0.75" margins for density
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "ProperTkt · Functional & Technical Spec", color: "94A3B8", size: 18 })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", color: "94A3B8", size: 18 }),
          new TextRun({ children: [PageNumber.CURRENT], color: "94A3B8", size: 18 }),
          new TextRun({ text: " of ", color: "94A3B8", size: 18 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: "94A3B8", size: 18 }),
        ],
      })] }),
    },
    children: [
      ...cover,
      ...overview,
      ...flows,
      ...uiTenant,
      ...uiAdmin,
      ...designSystem,
      ...apiSpec,
      ...backend,
      ...desktopMobile,
      ...nfr,
      ...roadmap,
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log("Wrote", outPath, `(${(buffer.length / 1024).toFixed(0)} KB)`);
