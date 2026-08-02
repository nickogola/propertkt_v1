# ProperTkt

A small, hostable web app for a landlord managing a few units — maintenance tickets and notices in one place. Built with Next.js 14, Prisma, and Resend.

## What it does

- **Tenant portal** — tenants sign in with their email (one-time link, no password) and submit maintenance tickets (plumbing, appliance, HVAC, electrical, pest, other) with urgency and description. They see status updates as you work on them.
- **Admin portal** — you sign in with email + password. Add/edit/remove tenants, view all tickets, update status with a note (emails the tenant automatically), and send notifications to any subset of tenants (rent reminders, trash pickup, upcoming repairs, or a custom message).

SMS is **not** included in v1 — email only. The `email.ts` abstraction makes it straightforward to add Twilio later.

## Setup (local)

Requires Node 18.17+.

```bash
# 1. Install dependencies
npm install

# 2. Create your .env.local
cp .env.example .env.local
# Then open .env.local and set:
#   SESSION_SECRET      → run `openssl rand -base64 32` (or any 32+ char string)
#   ADMIN_EMAIL         → the email you'll use to log into /admin
#   ADMIN_PASSWORD      → a strong password
#   RESEND_API_KEY      → leave blank for now (emails print to console)
#   EMAIL_FROM          → leave as-is for now
#   APP_URL             → http://localhost:3000

# 3. Create the database and seed 3 example tenants
npx prisma db push
npm run db:seed

# 4. Run it
npm run dev
```

Visit <http://localhost:3000>.

- `/admin/login` — log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set.
- `/tenant/login` — enter `tenant1@example.com` (from the seed), then look in the **server terminal** — the magic-link URL will be printed there since `RESEND_API_KEY` is blank. Copy-paste it into your browser.

## Enabling real email

When you're ready to send real emails:

1. Sign up at <https://resend.com> (free tier is generous).
2. Verify a domain you own (e.g., `yourdomain.com`). Resend walks you through DNS records.
3. Create an API key, paste it into `.env.local` as `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to something like `"Property Mgt <notifications@yourdomain.com>"` using your verified domain.

Restart `npm run dev`. Emails now go out for real.

## Deploying (when you're ready)

The simplest path is **Vercel + Postgres**:

1. Push this folder to a GitHub repo.
2. Go to <https://vercel.com>, import the repo.
3. Add a Postgres database (Vercel → Storage → Create → Postgres). It auto-sets `DATABASE_URL`.
4. Open `prisma/schema.prisma` and change `provider = "sqlite"` to `provider = "postgresql"`.
5. In Vercel project settings → Environment Variables, add the same keys from `.env.local` (except `DATABASE_URL`, which Vercel sets). Set `APP_URL` to your Vercel domain (e.g., `https://your-app.vercel.app`).
6. Deploy. On first deploy Vercel runs `prisma generate && next build`. Then run `npx prisma db push` locally with the production `DATABASE_URL` once to create the tables.

Custom domain: buy one ($10–15/yr at Namecheap/Cloudflare), point it at Vercel per their instructions, and update `APP_URL` + Resend domain.

## Enabling real WhatsApp

Notices can go out by email, WhatsApp, or both (channel picker on the Send-notice page).
Like email, WhatsApp messages log to the server console until you add Twilio keys:

1. Sign up at <https://twilio.com> (free trial works).
2. For testing, use the **WhatsApp sandbox** (Console → Messaging → Try it out → WhatsApp):
   each tenant sends the shown join code to the sandbox number once, then can receive messages.
3. Put the values in `.env.local`:
   - `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — from the console dashboard
   - `TWILIO_WHATSAPP_FROM` — the sandbox number (e.g. `+14155238886`), or your approved
     WhatsApp Business number in production.
4. Restart the dev server. Tenants need a phone number on file (admin → Tenants → Edit);
   10-digit numbers are assumed US (+1).

For production (no sandbox join step), request WhatsApp Business approval on your own
number through the Twilio console — takes a few days.

## Project layout

```
src/
  app/
    page.tsx                  # landing
    tenant/                   # tenant portal pages
    admin/                    # admin portal pages
    api/                      # JSON API endpoints
  components/                 # shared UI bits
  lib/
    db.ts                     # Prisma client
    session.ts                # signed-cookie session
    auth.ts                   # magic links, admin password
    email.ts                  # Resend wrapper + dev fallback
    ticket-ui.ts              # status/category constants + styling
  middleware.ts               # route protection for /admin and /tenant
prisma/
  schema.prisma
  seed.ts
```

## Data model

- `Tenant` — name, email, phone, unit, notes
- `Ticket` — category, title, description, urgency, status, adminNotes, tenant link
- `MagicLink` — short-lived (15min) tenant sign-in tokens, hashed
- `Notification` — audit log of every blast sent

## Security notes

- Sessions are JWTs signed with `SESSION_SECRET`, httpOnly cookie, 30-day expiry.
- Magic-link tokens are hashed (SHA-256) before storage and single-use.
- The tenant-login endpoint always returns OK regardless of whether the email is on file, to avoid leaking who's a tenant.
- Admin password is compared in constant time.
- Rotate `SESSION_SECRET` and `ADMIN_PASSWORD` if ever exposed.
