# Tenvio — Loyalty & SMS CRM for Local Shops (V1)

Tenvio turns first-time customers into regulars. A shop prints a QR code on
the counter, customers scan it and join with just a phone number (no app to
download), staff tap a button after each purchase to log a visit, and Tenvio
automatically tracks loyalty progress and texts the customer when they're
close to (or have earned) a reward. Shop owners can also blast a one-off
promo campaign to their whole opted-in list to fill a slow afternoon.

This is the V1 build: one full, real product loop — signup → purchase
logging → loyalty progress → reward → redemption → campaigns — built to
actually run a pilot with a real coffee shop, not a prototype.

## How it works, in one loop

1. A customer scans the shop's QR code and joins with their phone number.
2. Each time they buy something, staff search their number on the **Log
   Purchase** screen and tap **Add Purchase**.
3. Tenvio counts visits automatically. One visit before the goal, the
   customer gets a "you're almost there" text. On the goal visit, they get a
   "you earned it" text with a link to their reward.
4. The customer shows that reward page (QR + 6-digit code) at the counter.
   Staff type the code into the **Redeem** screen — it's marked used
   instantly and can't be redeemed twice.
5. Anytime, the owner can send a one-off **Campaign** (e.g. "$1 off any latte
   today") to everyone who's opted in, with its own trackable redemption
   code.

Everything above works today **without a Twilio account or a Stripe
account** — see "Demo mode" below. You can fully click through and pilot the
product before wiring up either one.

## Tech stack

- **Next.js 14** (App Router, Server Components, Server Actions) + TypeScript
- **PostgreSQL** via **Prisma ORM**
- **Tailwind CSS** with a small hand-built UI kit (no external component
  library)
- **Twilio** for SMS, with a built-in dev-mode fallback
- **Stripe** for billing (Tenvio charging the shop owner — not the shop's own
  payment processing), also with a dev-mode fallback
- Deployed on **Railway**

## Project structure

```
src/
  app/
    (auth)/signup, (auth)/login        Owner sign-up / login (split-screen)
    onboarding/                        First-time business setup (no sidebar)
    (dashboard)/dashboard/...          Everything behind the sidebar
      page.tsx                         Overview (KPIs + insights)
      customers/                       Customer list + profile
      loyalty/                         Program stats + QR code
      log-purchase/                    The staff "add a visit" screen
      redeem/                          The staff "type a code" screen
      campaigns/                       Campaign list, new campaign, detail
      messages/                        Every SMS ever sent, with filters
      settings/                        Business / loyalty / messaging / account
    join/[slug]/                       Public customer sign-up page + welcome
    r/[token]/                         Public customer-facing reward page
    api/webhooks/twilio, stripe/       Inbound SMS + billing webhooks
    api/health/                        Simple uptime check for Railway
  actions/                             Server Actions (all the writes)
  lib/                                 auth, db, sms, billing, validation, etc.
  components/                          Sidebar, icons, small UI primitives
prisma/
  schema.prisma                        The full data model
  seed.ts                              Seeds one demo shop with sample data
```

## Running it locally

You'll need Node 18+ and a PostgreSQL database (a free one from Railway,
Supabase, or Neon works fine — or run Postgres locally / in Docker).

```bash
# 1. Install dependencies
npm install

# 2. Copy the env file and fill in the two required values
cp .env.example .env
```

Open `.env` and set:

- `DATABASE_URL` — your Postgres connection string
- `AUTH_SECRET` — any long random string. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Leave `NEXT_PUBLIC_APP_URL` as `http://localhost:3000` for local dev
- Leave the Twilio and Stripe blocks blank for now — see "Demo mode" below

```bash
# 3. Create the database tables
npm run db:migrate

# 4. Load one demo shop with sample customers, purchases, and messages
npm run db:seed

# 5. Start the app
npm run dev
```

Open `http://localhost:3000` — you'll land on the login page. Log in with
the seeded demo account:

```
Email:    demo@tenvio.local
Password: TenvioDemo123!
```

(This login is also shown directly on the login page.) Or click "Create
account" to start completely fresh as your own new business.

## Demo mode — no Twilio or Stripe account required

**SMS:** if `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` /
`TWILIO_PHONE_NUMBER` aren't set, Tenvio doesn't fail or skip sending — it
simulates the send. Every text still gets logged to the **Messages** page
(marked "Simulated") and printed to your terminal, so every SMS-triggered
flow (welcome text, one-away text, reward text, campaign text) is fully
testable end to end before you have a Twilio account.

**Billing:** if `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` aren't set, a new
business gets full dashboard access immediately with a `dev_active`
subscription status instead of being sent to Stripe Checkout. Nothing is
gated behind billing in dev mode.

### Turning on real SMS later

1. Create a Twilio account, buy a phone number capable of SMS.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in
   your environment (Railway → your service → Variables) and redeploy. No
   code changes needed — `SMS_LIVE_MODE` flips on automatically.
3. In the Twilio console, point your number's "A message comes in" webhook
   to `https://<your-app-domain>/api/webhooks/twilio` (POST). This is what
   handles customers texting STOP/START to opt out or back in.
4. **Before texting real customers at any volume, register for A2P 10DLC**
   with Twilio (required by US carriers for business SMS, or messages will
   be filtered/blocked). This has its own review timeline — start it early,
   it is not instant.
5. **Important V1 limitation:** all businesses currently share one Twilio
   number. This is fine for piloting with a single shop, but before onboarding
   a second paying business, revisit this — the STOP-webhook currently opts a
   phone number out *globally across every business* on a shared number
   (see the comment in `schema.prisma` on `Business.twilioFromNumber` and in
   `src/app/api/webhooks/twilio/route.ts` for the full reasoning). Giving
   each business its own number is the fix, and the schema already has a
   field reserved for it.

### Turning on real billing later

1. Create a Stripe account, create one recurring Price for the Tenvio
   subscription plan.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in your environment.
3. In the Stripe dashboard, add a webhook endpoint pointing to
   `https://<your-app-domain>/api/webhooks/stripe` (POST) listening for at
   least `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy the webhook's signing secret into
   `STRIPE_WEBHOOK_SECRET`.
4. New sign-ups will now be redirected to real Stripe Checkout instead of
   getting instant `dev_active` access.

## Deploying to Railway

1. Push this repo to GitHub, then create a new Railway project from it.
2. Add a **PostgreSQL** plugin to the project.
3. On the web service, set `DATABASE_URL` to reference the Postgres plugin
   (Railway can wire this automatically — `${{Postgres.DATABASE_URL}}`), and
   set `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL` (use the Railway-generated
   domain, e.g. `https://tenvio-production.up.railway.app`).
4. Deploy. `railway.json` already tells Railway to run
   `npx prisma migrate deploy` before `npm run start` on every deploy, so
   your schema stays in sync automatically — no manual migration step.
5. Once it's live, SSH in or use Railway's one-off command runner to seed
   demo data if you want it: `npm run db:seed`. (Skip this for a real pilot
   shop — let them sign up for real instead.)
6. Add Twilio and Stripe env vars whenever you're ready to go live with
   either (see above) — everything works without them until then.

`/api/health` returns `{"status":"ok"}` and is a good target for a Railway
health check if you want one.

## Troubleshooting

**"Environment variable not found: DATABASE_URL"** — you haven't set
`DATABASE_URL` in `.env` (local) or in your Railway service's Variables
(deployed).

**Migrations fail with a permissions or connection error** — double check
the Postgres connection string, and that the database server allows
connections from wherever you're running the app (Railway's own Postgres
plugin allows this by default; a local Postgres install may need
`pg_hba.conf` adjusted).

**Logged in, but every dashboard page redirects to `/onboarding` in a loop**
— this means no `LoyaltyProgram` row exists yet for your business. Finish
the onboarding form (purchases-needed + reward description) — this is
expected for a brand-new account and resolves itself after the first save.

**Texts aren't actually arriving on a phone** — check the Messages page: if
rows show "Simulated," Twilio isn't configured yet (see "Demo mode" above).
If a row shows "Failed" with Twilio configured, check your Railway logs for
the Twilio error (common causes: unverified trial number, A2P 10DLC not yet
approved, or a malformed phone number).

**QR code shows/links to `localhost`** — set `NEXT_PUBLIC_APP_URL` to your
real deployed domain; it's used to build every QR code and SMS link.

**Seeding fails with a unique-constraint error** — the seed script is safe
to re-run (it upserts the business/customers and only creates purchases/
messages/campaign once), but if you've manually edited seeded rows in a way
that breaks its assumptions, the simplest fix is to drop and re-migrate a
fresh dev database.

## What's deliberately not in V1

Per the product plan, these are known, intentional deferrals — not bugs:

- No staff accounts / roles beyond a single Owner login per business
- No campaign audience segmentation (a campaign always goes to every
  opted-in customer)
- No scheduled/recurring campaigns — sending is always immediate and manual
- No birthday-triggered messages yet
- No analytics beyond what's on the Overview page
- No multi-location support per business

These are natural Phase 2 candidates once the core loop is validated with a
real pilot shop.
