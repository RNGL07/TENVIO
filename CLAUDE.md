# Tenvio — Project Instructions

Read this whole file before doing anything. It is the persistent product, engineering, design, and operating context for Tenvio.

Do not ask Aaron to re-explain decisions already covered here.

---

# 1. How Aaron wants this project run

Aaron wants Tenvio built efficiently and launched without becoming an endless software project.

The phase roadmap is useful for organization, but it is **not a rigid silo system**.

Primary engineering principle:

> **Build shared foundations once. Build user-facing features when they are needed.**

Avoid this pattern:

- implement something now
- knowingly rewrite it next phase
- rewrite it again later

If a nearby future requirement clearly affects today's architecture, account for it now.

However, do not use “future-proofing” as an excuse to over-engineer speculative features.

Optimize for:

- minimal duplicate work
- minimal unnecessary migrations
- centralized business logic
- reusable services/components
- tenant isolation
- safe production deployment
- maintainability
- future Admin Hub control
- fast iteration
- low operational overhead
- shipping

Prefer the fastest **correct** path to a working, deployable result over gold-plating.

For meaningful changes:

1. inspect the relevant existing code,
2. understand what future work touches the same area,
3. identify obvious rework,
4. make the smallest architectural adjustment that prevents it,
5. implement,
6. verify,
7. report what changed.

Do not repeatedly re-audit or re-explain the entire repository if targeted searches/diffs are sufficient.

If a task is genuinely ambiguous or involves billing/money/destructive behavior, ask.

Otherwise, proceed and report.

Aaron explicitly wants pushback when something is poorly sequenced, unnecessarily complex, or likely to create scope creep.

Aaron works Toyota's rotating 6-week shift schedule (nights/mids/days, mandatory Saturdays each rotation). If he says he's stepping away for work, keep working autonomously rather than waiting on him.

---

# 2. What Tenvio is

Tenvio is a **customer retention, loyalty, CRM, rewards, and SMS engagement SaaS for local businesses**.

It should not be positioned internally or externally as merely a “digital punch card.”

The broader product loop is:

> **Customer → Activity → Progress → Reward → Message → Redemption → Retention**

The product should help local businesses:

- capture customers,
- understand repeat behavior,
- reward loyalty,
- create promotions,
- bring customers back,
- track redemptions,
- run engagement programs,
- eventually detect disengagement,
- eventually automate retention decisions.

Tenvio is intended to become a simple **retention operating system for local businesses**.

---

# 3. Strategic purpose

Tenvio is intended to be a nearer-term revenue-generating SaaS while Aaron continues building his larger long-term project, ATLAS.

Therefore:

> **Bias toward revenue, validation, simplicity, and shipping.**

Do not continuously expand scope before real customers validate the need.

The important milestones are not feature count.

They are:

- businesses actively using Tenvio,
- businesses willing to pay,
- customers still paying after 90+ days,
- repeatable customer acquisition,
- low enough churn,
- measurable merchant value.

---

# 4. Initial target industries

The initial three Tenvio verticals are now confirmed:

## Food & Beverage

Examples:

- coffee shops
- boba
- smoothies
- juice shops
- bakeries
- dessert shops
- food trucks
- similar repeat-purchase local businesses

Primary Tenvio use cases:

- purchase loyalty
- one-away rewards
- reward unlocks
- promotions
- slow-hour campaigns
- birthday rewards
- customer re-engagement

---

## Beauty & Personal Care

Examples:

- barbershops
- hair salons
- nail salons
- lash studios
- eyebrow/threading businesses
- estheticians
- beauty studios
- spas where appropriate

Primary Tenvio use cases:

- repeat visit loyalty
- visit milestones
- client win-back
- birthday/customer appreciation rewards
- referral rewards
- inactive-client campaigns
- eventually normal visit-cycle detection

---

## Fitness & Wellness

Examples:

- Pilates
- yoga
- boutique gyms
- boxing
- BJJ
- cycling
- CrossFit-style studios
- recovery studios
- sauna/cold plunge
- similar businesses

Primary Tenvio use cases:

- check-ins
- classes
- attendance milestones
- engagement
- challenges
- free-class rewards
- guest-pass rewards
- referrals
- win-back
- eventually churn-risk detection

A major future differentiator for this vertical is the **Challenge system**.

Example:

> August Pilates Challenge
> Complete 12 classes → earn 1 free class

Member progress:

> 8 / 12 classes

Tenvio can eventually message:

> You're only 4 classes away from completing the challenge.

Challenge completion can automatically issue a reward.

---

# 5. One platform, not three separate products

Do NOT build separate architectures for Food, Beauty, and Fitness.

The underlying system should remain generic.

Core activity concepts should eventually support:

- purchase
- visit
- check-in
- class
- appointment

Avoid core model names such as:

- coffeeCount
- freeCoffee
- barberVisit

Prefer concepts such as:

- Customer
- Activity
- LoyaltyProgress
- Reward
- Redemption
- Campaign
- Challenge

Industry-specific terminology should primarily be presentation/configuration.

Examples:

Food:

> Log Purchase

Beauty:

> Log Visit

Fitness:

> Log Check-in

The engine underneath should remain shared.

Do not implement the full multi-industry feature set before its roadmap phase, but do not create core architecture that obviously prevents it.

---

# 6. Customer QR architecture

Tenvio uses multiple QR concepts.

## Business signup QR

A merchant has a public QR customers scan once to join the loyalty program.

Customer provides appropriate information/consent.

No customer app is required.

## Personal customer QR

After joining, each customer receives a stable, secure personal QR/customer card.

On later visits:

1. customer shows personal QR,
2. staff scans it,
3. Tenvio identifies that customer,
4. staff confirms the qualifying activity,
5. progress updates.

The personal QR should remain based on a secure nonsequential token.

Do not expose sensitive information directly in the QR.

## Reward redemption

Rewards use secure single-use redemption mechanisms/tokens.

Double redemption must remain protected at the database level where appropriate.

---

# 7. Future Rewards Wallet

The customer's personal card should eventually evolve into a lightweight **Tenvio Rewards Wallet**.

Examples of wallet content:

- loyalty progress
- ready rewards
- challenge progress
- referral reward
- birthday reward
- personal QR

Example Fitness customer:

> Free Guest Pass — Ready
> Monthly Challenge — 8/12
> Loyalty — 5/6 months

Example Beauty client:

> $15 Off — Ready
> Visit Progress — 4/5

Example Food customer:

> Free Drink — Ready
> Purchase Progress — 7/8

This is a later product expansion, not a reason to destabilize current QR architecture.

---

# 8. Flexible rewards direction

Future Tenvio rewards should eventually support types such as:

- free item
- free service
- dollar discount
- percentage discount
- credit
- free class
- free month
- guest pass
- merchandise credit
- custom reward

Business owners should eventually also be able to manually:

> **Send Reward**

Possible reasons:

- birthday
- customer appreciation
- service recovery
- promotion
- referral
- other

Do not implement every reward type early unless the current architecture needs a generic foundation now.

---

# 9. Current stack

- Next.js 14.2 — App Router
- TypeScript 5.6
- Prisma 5.20
- PostgreSQL
- Tailwind 3.4
- Stripe 16.12
- Twilio 5.3
- Railway
- Node >=18.18

SMS has a dev-log fallback when unconfigured.

Merchant application is web-based and should become a strong PWA experience before considering native apps.

Customers should **not** be required to install an app.

---

# 10. Repo / multi-tenant rules

Every business-owned model must remain securely scoped to its business.

Every query involving business-owned data MUST respect tenant boundaries.

Use the authenticated business ID from the server-side session.

Never trust a client-supplied business ID as authorization.

See:

- `src/lib/auth.ts` (`requireSession`)
- tenant-isolation comments at the top of `prisma/schema.prisma`

Multi-tenancy is a core security boundary.

Do not weaken it.

---

# 11. Database migrations

Prisma Migrate is canonical.

Do not use:

`prisma db push --accept-data-loss`

for production schema management.

Use real migrations (`npm run db:migrate` locally).

Railway runs `npm run db:migrate:deploy` on every deploy via `railway.json`'s startCommand — this is the existing migration deployment workflow; don't replace it.

Do not casually hand-write production schema changes if Prisma migration tooling can produce/track them properly.

---

# 12. Production demo account

`RNGL coffee` is Aaron's internal/demo business — his one real production Business row.

It is:

- COMPED indefinitely
- full access
- not a real paid subscriber

Never special-case the account by its name.

Its behavior should derive from:

`SubscriptionStatus.COMPED`

It must not count toward:

- paid MRR
- paid-business count
- trial count
- trial conversion
- churn

It may appear separately in Comped reporting.

Do not treat RNGL coffee as disposable test data.

---

# 13. Billing philosophy

Stripe owns payment infrastructure.

Tenvio owns product/business workflow.

## Stripe should own

- card data
- payment methods
- recurring charges
- invoices
- receipts
- payment retries
- payment security
- Checkout
- Billing Portal

## Tenvio should own

- local trials
- product access
- merchant billing UX
- Plan configuration
- Admin controls
- cancellation intent/feedback
- business lifecycle representation
- reporting
- retention workflow

Do not build custom credit-card infrastructure.

---

# 14. Pricing

Current launch price:

> **$49/month**

This is the current real public price, but it is **not permanent**.

Pricing must remain database/Stripe driven (`Plan.stripePriceId`).

Do not hard-code `$49` or `4900` throughout the application.

Tenvio initially has **one public product/plan**, not Starter/Pro/Enterprise tiers.

However, Aaron must eventually be able to change the price offered to new customers from the Admin Hub.

Example future change:

> $49 → $79

Existing subscribers should remain grandfathered on their original Stripe Price unless Aaron explicitly migrates them.

Stripe Price amounts are not treated as mutable.

Changing new-customer pricing should use the appropriate new Stripe Price while historical subscriptions remain intact.

---

# 15. Trials

Default self-service trial:

> 14 days, no card required

Trial duration is Plan/config driven, not intended to remain permanently hard-coded.

Founder/admin-controlled trials should support:

- custom duration
- extension
- comped accounts

Expired trials retain their data.

They may log in and view appropriate read-only information but operational activity is restricted.

---

# 16. Subscription/access architecture

Lifecycle state and product access are separate concepts.

`src/lib/access.ts` (`deriveAccess()`) is the centralized FULL / RESTRICTED access source of truth.

Do not duplicate subscription access logic throughout pages/actions.

Existing model includes lifecycle concepts such as:

- TRIAL
- ACTIVE
- PAST_DUE
- CANCELING
- CANCELED
- COMPED

Admin restriction can override lifecycle access.

Server-side enforcement matters more than hidden/disabled buttons.

---

# 17. Current billing status

Phase A, Phase B, and Phase C are complete.

Billing/subscriptions are confirmed working end-to-end — including a real live browser test on 2026-08-21 that walked through fresh trial signup → Stripe Checkout upgrade → mid-trial cancel → renew, and verified the Billing page reflected each state correctly (`CANCELING` with an access-end date, then back to `TRIAL` with days-left on renew).

That same test surfaced and closed the last known bug: `mapStripeSubscriptionToStatus()` in `src/app/api/webhooks/stripe/route.ts` checked `stripeStatus === "trialing"` before checking `cancelAtPeriodEnd`, so canceling mid-trial (the state every trial-preserving upgrade sits in) kept showing `TRIAL` instead of `CANCELING`. Fixed and merged via PR #6 (commit `8bf3b08`) on `main`.

Implemented and verified:

- real Stripe Checkout
- Stripe Customer/subscription creation
- webhook handling
- webhook idempotency foundation (`StripeWebhookEvent` table)
- trial-time preservation when upgrading
- database synchronization
- Stripe Billing Portal
- payment method management through Stripe
- invoice/receipt access through Stripe
- cancellation handling
- cancel-at-period-end
- subscription lifecycle state updates

Phase C is CLOSED.

Do not rebuild it unless a real bug is found.

---

# 18. Cancellation flow — CURRENT STATE

**Correction (2026-08-21): this section previously claimed the custom cancellation flow was already built. It was not** — the codebase had no cancellation questionnaire, no reason/feedback capture, and nothing ever wrote to the `Cancellation` table; canceling relied entirely on Stripe's own generic hosted Portal button. That's now fixed for real.

Now actually implemented:

- `/dashboard/billing/cancel` — reason picker (`CancellationReason` enum), optional feedback textarea, live impact summary (customer/purchase/reward/message counts, computed at render time)
- `cancelSubscriptionAction` (`src/actions/billing-actions.ts`) — writes the `Cancellation` row directly (the webhook can't know *why* someone canceled, only *that* they did) and calls the new `cancelSubscription()` in `lib/billing.ts` to set `cancel_at_period_end: true` on the real Stripe subscription
- The Stripe webhook handler now closes out the open `Cancellation` row's `reactivatedAt` when a subscription is un-canceled (Portal "Renew subscription" or otherwise), so Admin Hub reporting won't show a business as still-canceling after they reversed it

Do not rebuild this again. Open decision, not yet made: whether to disable Stripe's own Portal cancel button (Dashboard → Settings → Billing → Customer portal) now that Tenvio's own flow exists — currently both paths work, Stripe's Portal cancel doesn't capture a reason.

Later Admin Hub work should make this information (reason, feedback, effective date) operationally useful to Aaron — see section 19.

---

# 19. Admin Hub vision

This is extremely important.

The internal Tenvio Admin Hub should become the **command center for operating the SaaS**.

Aaron wants as much normal operational control as practical inside Tenvio itself.

Normal operations should eventually NOT require:

- direct database edits
- Railway console work
- code deployment
- routine Stripe dashboard manipulation

Stripe remains infrastructure, but Admin Hub should expose/manage the business workflow.

The Admin Hub should eventually provide:

## Businesses

- business directory
- owner
- status
- Plan
- actual price
- joined date
- customer count
- usage
- subscription state
- trial information
- Stripe identifiers where useful

## Pricing

Aaron should control:

- current public price
- active Plan
- future/new-customer price
- pricing history
- grandfathered subscriber visibility

Changing price for new customers must NOT silently alter existing subscribers.

## Trials

Admin controls:

- default trial duration
- custom trial length
- extend trial
- end trial
- founder-granted trial
- comp/uncomp

## Account controls

Admin should eventually be able to:

- restrict
- reactivate
- cancel
- undo cancellation
- comp
- remove comp
- terminate

Keep these distinct:

> Restrict ≠ cancel ≠ terminate ≠ delete

Sensitive actions should require confirmations/reasons and create audit logs.

## Support / cancellation intelligence

Aaron specifically wants visibility into **why customers are leaving**.

Cancellation questionnaire results should be available in Admin Hub.

Admin should be able to see:

- business
- cancellation date
- effective cancellation date
- reason
- written feedback
- account age
- Plan/price
- relevant usage/impact statistics

This should help identify:

- pricing objections
- missing features
- technical issues
- usability issues
- merchants not seeing enough value
- businesses closing
- competitors merchants are switching to
- temporary/seasonal churn

Eventually the Admin Hub should help Aaron identify recurring product/support problems from cancellation feedback.

Potential future support direction can include:

- support inbox
- merchant messages
- support requests
- account notes
- internal follow-up status

Do not build a giant Zendesk replacement prematurely.

Start with the minimum operational support tooling that actually helps Aaron manage customers.

---

# 20. Admin metrics

Eventually Admin should surface real SaaS metrics such as:

- MRR
- active paying businesses
- trials
- trials ending soon
- past due
- canceling
- canceled
- comped
- trial → paid conversion
- churn
- churned MRR
- cancellation reasons
- basic usage

Later:

- cohort retention
- ARPU
- account health
- product engagement
- support/cancellation trends

Never fabricate metrics from unavailable data.

COMPED accounts are not paid MRR.

---

# 21. Design philosophy

Tenvio should feel like a **legitimate premium SaaS**, not a side-project dashboard or generic Tailwind template.

The application should feel:

- mature
- clean
- intentional
- modern
- trustworthy
- premium
- simple
- fast
- beginner-friendly
- operational

Avoid excessive visual decoration.

Avoid giant empty cards and overly sparse pages.

Use good information density.

---

# 22. Design references

Use these as inspiration for quality and interaction philosophy:

- **folk** — CRM simplicity, whitespace, approachable feel
- **Attio** — modern CRM structure and data presentation
- **Linear** — precision, hierarchy, interaction polish
- **Stripe Dashboard** — billing clarity and trustworthy financial UX
- **Square** — merchant operational simplicity
- **Toast** — merchant workflows
- **Shopify** — approachable SaaS/admin structure

Do NOT directly copy proprietary interfaces.

The goal is:

> **folk/Attio-level modern CRM quality + Square-like merchant simplicity + Stripe-like billing confidence**

with Tenvio's own identity.

---

# 23. Visual identity

Tenvio brand direction:

- warm white / off-white backgrounds
- true white cards/surfaces where needed
- near-black text and primary actions
- restrained warm orange accent
- subtle borders
- consistent border radius
- minimal heavy shadows
- geometric modern sans typography
- strong spacing rhythm
- intentional hierarchy

Orange should feel like a recognizable brand accent rather than flooding the UI.

---

# 24. Logo direction

Current preferred logo concept:

> **T + circular return/return-path concept**

The symbolism should communicate:

> Visit → Engage → Return

Avoid:

- coffee cups
- vertical-specific imagery
- generic refresh icons if possible
- overly literal loyalty punch-card imagery

The mark should eventually work as:

- SaaS logo
- browser/favicon
- PWA icon
- mobile app icon if needed later

Current logo asset work is deferred until file-storage/asset workflow is finalized.

---

# 25. Merchant vs customer branding

Merchant-facing dashboard:

> Tenvio brand

Customer-facing loyalty experience:

> merchant brand first, subtle “Powered by Tenvio”

Businesses should eventually be able to configure:

- logo
- primary accent color

Do not create a full theme builder.

Tenvio should control:

- fonts
- layouts
- radii
- spacing
- contrast
- component design

Merchant brand color can affect:

- progress
- reward accents
- buttons where contrast is safe
- customer card accents
- QR container accents

QR itself must maintain proper contrast and white backing/quiet zone for scanning reliability.

---

# 26. Mobile-first merchant design (important product requirement, added 2026-08-21)

This is a product requirement, not a styling preference: **Tenvio must be designed mobile-first for real merchant operations.** A lot of local business owners/staff — coffee shops, barbershops/salons/nail/brow/lash, Pilates/fitness studios, food trucks, small walk-in retail — will not have a desktop next to them. For many, the merchant's phone is the primary operational device.

**The operational test for any merchant-facing screen or flow:** could a busy employee use this with one hand while a customer is standing in front of them? If no, the mobile workflow isn't finished.

## Desktop vs. mobile task split

Desktop can be the better surface for: analytics, settings, campaign management, deeper CRM work, billing, Admin Hub.

Mobile must be excellent for: scanning customers, logging purchases/visits/check-ins, finding customers, redeeming rewards, quickly seeing customer status, lightweight customer management, immediate operational actions.

Do not simply compress desktop pages for mobile — mobile screens need their own layout using mobile-native patterns: card lists, compact rows, sheets/drawers, large touch targets, sticky actions, intentional stacking. No horizontal page overflow, ever.

## Loyalty earning modes (implemented 2026-08-21)

Not every merchant wants `1 scan = 1 purchase` — validated against Square/Toast/Kangaroo/Loyalzoo (all support visit- and unit/item-based earning; Loyalzoo literally calls them "After Visiting"/"After Buying"/"After Spending"). `LoyaltyProgram.earningMode` (`LoyaltyEarningMode`: `PER_VISIT | PER_UNIT | PER_SPEND`, default `PER_VISIT`) controls this, set in Settings. `PER_SPEND` is schema-reserved only — no UI, no logic — since Tenvio has no POS/order data source to know what a customer actually spent; don't build it until a POS integration exists to feed it. `Purchase.quantity` (default 1) carries the unit count for `PER_UNIT` — one Purchase row per interaction regardless of quantity, never one row per unit (scan once, not three times). The pure math lives in `src/lib/loyalty.ts` (`calculateLoyaltyProgress`, unit-tested in `loyalty.test.ts`) so the scan and manual-entry paths can't compute this differently. Overshoot on a `PER_UNIT` quantity that crosses the threshold is discarded, not rolled into the next cycle (matches pre-existing single-unit reset behavior) — revisit only if Aaron explicitly wants rollover math.

## Scan Mode (Phase E0 — implemented and deployed to production 2026-08-21)

Merged to `main` (commit `b562335`) and confirmed by Aaron as a successful Railway deploy — the hand-written migration (no Prisma CLI was available to generate it) applied cleanly against the real production database. Treat this as live, not just merged.

Customers already have a persistent personal QR loyalty card. Staff open Scan once, scan → immediate resolve + log → success state with Undo → auto-returns to ready for the next scan, no route change. `PER_VISIT` logs immediately on decode (no extra tap, matches the pre-existing fast path). `PER_UNIT` shows a brief `[1][2][3][More]` quick-pick after a read-only customer-name lookup, then logs with the chosen quantity. See `src/components/log-purchase-scan-panel.tsx` and `src/actions/purchase-actions.ts`.

Safety rails now in place (closing every gap identified in the 2026-08-21 investigation):
- **Cooldown**: a second purchase for the same customer within `SCAN_COOLDOWN_MS` (8s) is soft-blocked with a "log anyway?" override, not silently duplicated.
- **Idempotency**: `Purchase.idempotencyKey` (client-generated UUID per scan attempt) is unique — a retried/double-submitted request is a no-op, not a duplicate.
- **Concurrency**: the `Customer` row is locked (`SELECT ... FOR UPDATE`, raw query — Prisma's query builder has no FOR UPDATE) for the write transaction, closing the two-staff-scan-same-customer and duplicate-reward races.
- **Deferred SMS / Undo**: the DB write (Purchase, loyalty counters, reward Offer) is immediate and correct; only the SMS send is deferred behind a `FINALIZE_WINDOW_MS` (5s) client-held window (`finalizePurchaseAction`), during which `undoPurchaseAction` can fully reverse everything (`voidedAt` on Purchase/Offer, not hard delete — stays visible for future Admin Hub audit) with **no new queue/background-job infrastructure** — it's the client that decides when to finalize or undo. `Purchase.loyaltyCountBefore`/`totalVisitsBefore`/`lifetimeRewardsBefore`/`oneAwayNotifiedAtBefore` snapshot the pre-purchase state so Undo restores exactly, not by fragile recomputation.
- Tenant isolation on the scanned token was already solid and needed no changes.

Known, deliberately accepted limitations — read before extending this further:
- **True persistent Scan Mode implemented 2026-08-21, needs real-device verification.** `QrScanner` now mounts once per Scan Mode session (not once per scan) and is paused/resumed via a CSS-hide + a `paused` prop rather than being torn down and recreated between customers — no re-tap of "Start Scanning" per customer, camera stays live until an explicit "Exit Scan Mode." See the doc comment in `src/components/qr-scanner.tsx` for the mechanism. **Real risk not yet verified**: `Html5QrcodeScanner`'s own canned UI includes its own internal stop/restart controls that this rework doesn't intercept — if staff tap the library's own button instead of Tenvio's "Exit Scan Mode," our `paused` state model could desync from the actual camera state. This needs a real phone to confirm before trusting it fully; couldn't be tested in the environment this was built in (no camera/browser access). If this turns out to be a real problem, the fix is switching from `Html5QrcodeScanner` (canned UI) to the lower-level `Html5Qrcode` class with a fully custom view — bigger change, but gives full control over what controls exist at all.
- **Undo's snapshot-restore assumes nothing else touched the same customer's counters mid-window** — narrow given the cooldown already blocks a second purchase without an explicit override, but not impossible.
- Redemption (`/dashboard/redeem`) is still a separate manual code-entry flow, not camera-based — untouched by this work.
- Manual "Add Purchase" entry got quantity-awareness but not the cooldown-override UI or deferred-SMS/Undo — it already has one deliberate human tap, judged lower-risk than the scan path.
- No test framework existed in this repo before this change — added Vitest with unit tests for the pure loyalty math only (`src/lib/loyalty.test.ts`). Concurrency/idempotency/tenant-isolation/end-to-end scan behavior are NOT covered by automated tests — they need a real Postgres instance or a browser, neither available in the environment this was built in. Verify manually per the branch's test plan before trusting this in production.

## Future PWA / native-app compatibility

Do not build a native app now, and do not add PWA complexity with no merchant benefit — the target is "fast to operate from a phone," not "make the website pretend to be an app." But since Tenvio may eventually become a native app or get wrapped (e.g. Capacitor), avoid frontend decisions now that would make that migration unnecessarily painful. Keep in mind for future work (not now): camera permissions UX, QR scanner architecture, deep linking, push notifications, app shortcuts, secure persistent sessions, offline/poor-connection behavior, biometric login, native navigation patterns, native-safe responsive components. Evaluate (likely in or near Phase E, not before) whether a proper web app manifest, installable/standalone PWA behavior, icons, safe-area handling, and fast-loading scan routes are worth adding — only where there's real merchant benefit.

## Mobile navigation — decision stands, revisit scope only

No five-tab bottom navigation bar. Current direction stands: compact sticky top bar, drawer for full navigation, and a highly prominent Scan/Log Activity action — the scan action matters more than permanently exposing five nav tabs. Phase E should evaluate whether the current mobile scan action is prominent enough (candidates: floating center Scan button, persistent bottom Scan button, large quick action on Overview, PWA home-screen shortcut, native quick action later) — choose based on real merchant workflow, not trend-following.

## Customer-facing QR page also needs mobile-first treatment

The customer's own card/QR page (`src/app/c/[token]/page.tsx`) should show merchant branding, the customer's QR, loyalty progress, and available reward — QR large enough to scan quickly, high contrast, white-backed with correct quiet zone (done, see section 17/Phase C-adjacent QR fix), not buried below unnecessary content. Future: challenge progress, Rewards Wallet (see sections 4/7). Merchant and customer mobile experiences need to work together, not be designed in isolation.

## Phase E mobile testing requirement

When Phase E redesigns the merchant app, every major screen must be evaluated at desktop, tablet, 430px, 390px, 375px, and 320px — explicitly: Overview, Customers, customer profile, Loyalty, Campaigns, campaign creation, Messages, Billing, Settings, Scan/Log Activity, and redemption. No horizontal page overflow anywhere. No compressed desktop tables on mobile — use card lists/compact rows/sheets instead. Mobile cannot be an afterthought tacked onto a desktop-first design pass.

Performance target for the scan flow specifically: ~2–5 seconds for a normal scan-and-log, minimizing page loads/redirects/unnecessary modals/confirmation steps/typing/avoidable network round trips — while still preserving tenant isolation, server-side authorization, duplicate protection, reward correctness, SMS correctness, and secure customer tokens. Speed must never come at the cost of correct loyalty data.

---

# 27. Existing UI/UX work

UI Phase 1 is already complete.

Existing improvements include:

- shared page/design primitives
- mobile-native Customers layout
- mobile Messages layout
- Loyalty page rebuild
- confirm-before-redeem
- scan → confirm → log → next-customer workflow

Do not redo these unless Phase E audit finds a legitimate problem.

**UI Phase 2 and Phase 3 are also now complete** (merged to `main` 2026-08-21, commit `bd46351`, visually verified live by Aaron):

- Brand color centralized under a `brand` Tailwind token (`tailwind.config.ts`) — same hex values as the old ad hoc `orange-*` classes, so this was a zero-visual-diff refactor, not a redesign. A real accent-color/visual retune is still open and deferred to Phase E — Aaron flagged wanting to revisit colors and some layout later, not urgent.
- QR codes (`src/lib/qrcode.ts`) now render with an opaque white background and a standard quiet zone instead of a transparent background — fixes scan reliability for the merchant signup QR, customer personal QR, and reward redemption QR (one shared helper, all three sites fixed at once).
- Campaign creation (`/dashboard/campaigns/new`) now shows a live SMS preview (exact composed text including the redemption link, character count, estimated segments) before sending — merchants previously committed to sending blind.
- Mobile bottom-nav question is **closed**: keep the current pattern (sticky top bar + slide-in drawer + floating Scan/Log Purchase action), no tab bar. Revisit only with real usage data.
- Unified customer activity timeline was already built (`src/app/(dashboard)/dashboard/customers/[id]/page.tsx`) — no work was needed there.

Do not redo any of this unless a real bug is found. The color-accent/layout tweak Aaron mentioned wanting "later" belongs in Phase E, not a re-open of Phase 2.

New logo picked (a "T" + circular return arrow, orange gradient) but not uploaded — deferred pending a file-storage provider decision.

---

# 28. Merchant UI/Aesthetic Overhaul

The larger product aesthetic phase should review the merchant experience as one system.

Pages include:

- Overview
- Customers
- Loyalty
- Campaigns
- Messages
- Billing
- Settings
- Scan / activity logging

Improve:

- hierarchy
- spacing
- density
- typography
- cards
- navigation
- filters
- mobile layouts
- empty states
- interaction feedback
- consistency
- perceived product quality

The Billing page should feel consistent with the rest of Tenvio rather than like a completely separate Stripe page.

Do not redesign only for appearance.

Preserve speed and operational simplicity.

---

# 29. Customer experience

The customer-facing loyalty card should eventually feel like a premium digital loyalty card.

It should include:

- merchant logo
- merchant name
- progress
- distance to reward
- personal QR
- reward state
- eventual Rewards Wallet
- eventual Challenge progress
- subtle Powered by Tenvio

No customer app should be required.

A secure personal URL/card remains the primary model.

---

# 30. Messaging / SMS

SMS is central to Tenvio.

Current/future messaging includes:

- welcome
- loyalty progress
- one-away
- reward unlock
- promotional campaigns
- win-back
- birthday
- challenge progress
- challenge completion

Marketing eligibility must remain consent-aware.

Staff entering a customer phone number does NOT automatically mean that person consented to marketing SMS.

Preserve opt-out behavior.

Do not weaken compliance to increase campaign reach.

---

# 31. Future retention intelligence

Eventually Tenvio should evolve beyond manually operated loyalty.

Potential future capabilities:

- inactive customer detection
- customer normal-return-cycle detection
- win-back suggestions
- challenge completion risk
- slow-hour identification
- customer segmentation
- favorite product/service
- campaign performance
- POS integration
- revenue attribution where reliable
- churn-risk signals
- AI-assisted recommendations

Example Beauty:

> Client normally returns every 4 weeks. It has been 7.

Example Fitness:

> Member averaged 3 classes/week and attended once in the last month.

Example Food:

> Tuesday 2–4 PM consistently underperforms.

Do not build fake “AI insights” without sufficient underlying data.

---

# 32. AI philosophy

AI should eventually provide meaningful retention intelligence.

Do not add AI merely because it sounds impressive.

Future useful AI may help answer:

- who should we contact?
- when should we contact them?
- what type of offer tends to work?
- who is disengaging?
- what campaign should we run?
- what happened after the campaign?

AI copywriting alone is not a strong moat.

Behavior + automation + measurable outcomes are more valuable.

---

# 33. Acquisition philosophy

Once commercially ready, prioritize direct validation.

Likely flow:

> targeted business → personalized email → short Loom → trial → activation → paid

Focus on quality leads rather than giant spam lists.

Potential demos:

- Food & Beverage
- Beauty
- Fitness

Measure:

- outreach
- replies
- demo views
- trials
- activation
- paid conversion
- retention
- objections
- willingness to pay

Let real market behavior determine which vertical gets the strongest go-to-market focus.

---

# 34. Naming risk

“Tenvio” remains an unresolved naming/trademark risk.

Known concerns:

- tenvio.de exists as a German SaaS
- Tenvio Technologies LLC has been identified

Aaron chose to continue building/launching for now rather than stop development.

Do not spontaneously rename the product.

Carry the risk forward until Aaron explicitly revisits branding/trademark strategy.

---

# 35. Current roadmap

Completed:

## Phase A — Database & Billing Foundation
COMPLETE.

## Phase B — Plans, Trials & Access Control
COMPLETE.

## Phase C — Stripe Billing Core
COMPLETE. Live-verified end-to-end 2026-08-21 — see section 17.

## Phase I cancellation functionality
COMPLETE as of 2026-08-21 (built for real this time — see section 18, which previously claimed this incorrectly).

Do not rebuild it.

Its Admin reporting/support side still needs to be built later.

---

Remaining major work:

## Phase D — Merchant Billing & Trial UX

Polish merchant billing lifecycle presentation and self-service UX around the already working Stripe infrastructure.

## Phase E — Merchant UI / Aesthetic Overhaul

Full merchant-app quality/design pass. UI Phase 2 (brand color + QR white-backing fix) and Phase 3 (bottom nav, activity timeline, campaign SMS preview) — see section 27 — feed into this.

Phase E is being done **page by page, mockup-first**: build an interactive mockup as an Artifact → Aaron reviews/approves the direction → implement it for real → merge. This flow is working well; keep using it rather than redesigning several pages at once.

Pages done and deployed:
- **Overview/dashboard** (2026-08-21, commit `8692c9f`) — real Next Best Action zero-state driven by actual DB signals (not fabricated analytics), stat-card hierarchy (Customers/Visits this month primary, Rewards redeemed/Campaign redemptions compact secondary), actionable empty states on all three activity columns, hands off to the existing Tenvio Insight cards once onboarding is complete.
- **Customers** (2026-08-21, commit `b7cdba0`) — replaced the horizontally-scrolling `min-width: 560px` table with one responsive row that's a real card layout below `md` and a grid at `md`+, so there's no horizontal scroll at any width. Added an All / Reward ready filter with a live count.
- **Customer profile** (2026-08-21, commit `4615142`, targeted fix not a full mockup pass) — the Activity timeline's fixed `w-28` date column was cramping entry text on 320-375px phones; date now stacks above the entry below `sm` instead.

Also fixed in passing (real bugs, not redesigns): **Loyalty** page (`b0c9457`) was hardcoding "Buy N coffees" regardless of `earningMode` or business type — now reads the actual earning mode.

- **Remaining screens** (2026-08-21, commit `cb1729a`) — Campaigns list (summary stats, plus an empty state that adapts to whether the merchant actually has anyone to message yet), campaign detail (back link, recipients link through to the customer, "Delivered" vs "Offer sent" instead of a blanket "Sent" that implied a redemption which was never possible), Log Purchase/Scan (compact header so Scan Mode sits near the top of a phone viewport; dropped `autoFocus` on the phone field because it popped the mobile keyboard on load and buried the scanner — backwards when scanning is the primary action; `type/inputMode="tel"`), Billing and Settings (subheadings, wrapping label/value rows).

**Phase E structural work is COMPLETE.** Every merchant screen has had a mobile/structure pass, and no route overflows at 430/390/375/320px (verified live, not assumed). What is deliberately NOT done is the *visual identity* pass — that's the Claude Design handoff. Treat the current look as a clean consistent base, not a finished design.

**Mobile-first merchant design is a hard requirement of this phase, not an optional pass** — see section 26 in full before starting Phase E work: the desktop-vs-mobile task split, the Scan Mode vision, the current scan architecture's safety gaps (investigated 2026-08-21, do not enable immediate-log/Undo/Quick Scan Mode without addressing them first), PWA/future-native considerations, and the explicit per-screen breakpoint testing requirement (desktop/tablet/430/390/375/320 across every major screen).

## Phase F — Admin Authentication & Admin Hub Shell

DONE (2026-08-21, commit `b0aea8c`). Completely separate session from merchant auth — `src/lib/admin-auth.ts` (different cookie, backed by `AdminUser` not `User`, no admin signup page). `/admin/login` + `/admin/(hub)/layout.tsx` shell with nav (Overview, Businesses) and logout. AdminUser rows are provisioned via `prisma/create-admin.ts` (reads credentials from env vars — run `npm run admin:create` with `ADMIN_EMAIL`/`ADMIN_PASSWORD` set — never hardcode a real admin password into a file).

## Phase G — Admin Businesses / Plans / Pricing / Trials / Subscriptions

DONE. Businesses directory (`/admin/businesses`) and detail page — name, owner email, plan/price, customer count, subscription status, derived access, trial/period dates, Stripe customer id. Plus `/admin/plans`: view plans with subscriber counts, switch which plan new signups get, and add a new plan.

Pricing model to preserve: changing the public price is **always** "add a new Plan and activate it," never editing an existing one — Stripe Prices are immutable and editing would break grandfathering. There is deliberately no edit-price form. Stripe Price IDs are pasted from the Stripe dashboard, never generated by Tenvio (standing no-invented-external-IDs rule). Activating a plan is transactional with deactivating the others, so the one-active-plan invariant in `lib/plans.ts` holds even mid-failure.

**Not built**: admin-side trial extension/granting (the `trialGrantedByAdminId`/`trialSource` fields exist and are ready for it).

## Phase H — Admin Account Controls & Audit Logs

DONE. Restrict/reactivate, comp/uncomp, admin-cancel, and terminate all live in `src/actions/admin-actions.ts`, each writing an `AdminAuditLog` row, with `/admin/audit` rendering that log (paginated, newest first, links back to each business).

Semantics chosen (were open questions, now settled — don't re-litigate without reason):
- **Admin cancel** uses the same at-period-end behavior as the merchant's own flow. A business Tenvio cancels on someone's behalf keeps the access they already paid for. Writes a `Cancellation` row with `initiatedBy: ADMIN` and the free-text reason in `feedback`, categorized as `OTHER` so admin actions don't pollute merchant churn-reason stats.
- **Terminate** ends Stripe billing immediately and applies a permanent lockout, behind a typed `TERMINATE` confirmation. It **never deletes data** — an irreversible cascade delete triggered from a web form would destroy a real merchant's history on a misclick, and those records are exactly what's needed if a billing dispute follows. A true hard-delete / data-subject-request flow is a separate deliberate workflow; see `BACKLOG.md`.

## Deferred work lives in BACKLOG.md

Anything intentionally skipped during phase work is recorded in `BACKLOG.md` at the repo root, not left implicit. Per Aaron's rule (2026-08-21): do it now if it's in the current phase or immediate workflow; if it would mean halting phase progress to build infrastructure, file it there instead and batch it before onboarding a real paying client. Read that file before declaring the product "done."

## Admin Cancellation / Support Intelligence

DONE (2026-08-21). Per-business cancellation history on the business detail page, plus `/admin/cancellations` for aggregate churn analysis: reason ranking with percentages, a product-addressable vs. merchant-circumstance split (so "9 cancellations" becomes "4 of 9 were things Tenvio could fix"), written feedback, and reactivation counts. Reactivated cancellations are excluded from the reason stats deliberately — a merchant who canceled and came back shouldn't skew churn analysis. **Not done**: support inbox / follow-up workflow (correctly deferred per section 19 — "don't build a Zendesk replacement prematurely").

Important caveat for interpreting this page: it only sees cancellations made through Tenvio's own cancel flow. Anyone canceling directly in Stripe's hosted portal produces no `Cancellation` row and no reason — which is the strongest argument for eventually disabling Stripe's own portal cancel button (open decision, see section 18).

## Phase J — Admin Metrics & Reporting

DONE (commit `44e0ba1`). `/admin` shows MRR (excludes COMPED per the "not paid MRR" rule), total businesses/customers, trials ending in 7 days, counts by subscription status, plus trial→paid conversion, 30-day churn, ARPU, and new signups.

Definitions worth preserving, since they're easy to get subtly wrong:
- **Conversion** counts "ever attached a real Stripe subscription" — durable, so the rate can't silently improve as churned customers drop out of the numerator. Denominator is businesses that actually started a trial, so comped/founder-granted accounts that never had a card aren't scored as failed conversions.
- **Churn** counts `Cancellation` records inside the window, not current status (status shows where an account landed, not that it churned *this* month), and excludes reactivated ones.
- **ARPU** divides across paying accounts only — dividing by all businesses would deflate it with trials and comps.
- Rates render `—`, never `0%`, when the denominator is empty, so missing data never reads as a real measurement.

**Known imprecision, stated on the page itself**: churn's denominator approximates "already paying 30 days ago" from subscription creation dates, because there's no paying-account history table. Directional until volume is higher. **Still not done**: cohort retention, trend-over-time charts.

## Phase K — Full QA & Production Validation

Security/correctness audit pass DONE 2026-08-21. Found and fixed three real bugs, all in code that had shipped and none caught by any test:

1. **Cross-tenant data leak** (`purchase-actions.ts`) — `idempotencyKey` is client-supplied and globally unique, and the P2002 catch path looked it up *unscoped*, then fetched that purchase's customer unscoped and returned their name/phone. A key collision leaked another merchant's customer data as a "successful" scan. Both lookups are now `businessId`-scoped.
2. **Finalize/undo race** (`purchase-actions.ts`) — both sides did read-then-write on `finalizedAt`/`voidedAt`, so the auto-finalize timer and a staff Undo tap could both win: customer gets a "you earned a reward" text for a reversed purchase, linking to an already-voided Offer. Both now use an atomic compare-and-set with the guard in the WHERE clause.
3. **Unsigned Twilio webhooks accepted** (`api/webhooks/twilio`) — signature validation was skipped entirely when `TWILIO_AUTH_TOKEN` was unset, which is a documented-supported production config. Anyone could forge STOP (opt any number out of every business) or START (re-subscribe someone who opted out — a consent decision Tenvio must legally honor). Now fails closed.

Verified clean in the same pass: every query touching business-owned data is `businessId`-scoped; all admin actions require `requireAdminSession`; all write paths gate on `getBusinessAccess`; public customer signup respects RESTRICTED; the Stripe webhook already failed closed. Live-verified: all dashboard routes redirect anonymous visitors to `/login`, all admin routes stay gated even with a valid *merchant* session, bogus `/c/` and `/r/` tokens 404, and no horizontal overflow on any route at 430/390/375/320px.

**Still outstanding for Phase K**: the audit was static + live-route testing. There is still no automated regression coverage for any of the three bugs above (needs a test database — see `BACKLOG.md` item 6), and no full lifecycle test against live Stripe in test mode.

Full lifecycle, security, mobile, migration, Stripe, Admin and multi-tenant validation.

## Phase L — Multi-Industry Foundation

DONE (2026-08-21). `Business.industry` (Industry enum, defaults FOOD_BEVERAGE so existing businesses keep their exact wording) plus `src/lib/terminology.ts` as the single place industry wording resolves. Picker lives in Settings.

**Hard rule: terminology affects LABELS ONLY, never behavior.** No industry branch exists anywhere in the loyalty/scan/reward logic, and none should be added — the moment industry drives behavior, Tenvio becomes three products to maintain instead of one. Also note wording comes from *industry*, not `earningMode`: how someone earns (per visit vs per item) and what the interaction is called are independent, and conflating them was a real bug fixed during this phase.

## Phase M — Flexible Rewards & Rewards Wallet

DONE (2026-08-21). `RewardType`/`ManualRewardReason` enums with `rewardType`/`rewardValue`/`manualReason` on Offer (FREE_ITEM default, so every pre-existing Offer keeps its meaning). "Send Reward" on the customer profile issues a one-off reward outside the loyalty cycle. `/c/[token]` is now a real Rewards Wallet: every claimable reward plus live challenge progress.

Two decisions to preserve: manual rewards deliberately **do not touch `loyaltyCount`** (a gift isn't earned progress — otherwise a service-recovery gesture silently advances someone toward their next real reward and the loyalty numbers stop meaning "activity that happened"), and they respect opt-out (reward still lands on the card, no text sent).

## Phase N — Challenges & Retention Features

Challenge engine DONE (2026-08-21). `Challenge`/`ChallengeProgress` models plus `src/lib/challenges.ts`. Challenges run **alongside** the loyalty program — one logged activity advances both. Merchant UI at `/dashboard/challenges`, and Scan Mode calls out a completion immediately since staff must hand something over on the spot.

Concurrency follows the Phase E0 pattern: progress upserts against `@@unique([challengeId, customerId])`, and completion is claimed with a conditional `updateMany(completedAt: null)` rather than read-then-write, so two simultaneous scans can't issue two rewards for one challenge. Undo reverses progress and voids an unredeemed challenge reward — an undone scan must not leave someone permanently closer to a goal.

**Not built**: inactive-customer segments and win-back automation (the retention-intelligence half of this phase). Those need the behavioral analysis described in section 31 and are genuinely post-validation work — see `BACKLOG.md`.

---

# 36. Efficiency rule for the roadmap

These phase labels are organizational.

If tightly related work from adjacent phases can be safely completed together and doing so prevents genuine duplicate work, propose combining the foundation.

Do not combine phases simply to move faster.

Combine only when:

1. requirements are clear,
2. implementation is tightly coupled,
3. separating them would create real duplicate work,
4. combined implementation is still testable and safe.

---

# 37. Before making meaningful changes

Use this mental checklist:

- Does this already exist?
- Does this conflict with the roadmap?
- Will the next phase obviously rewrite it?
- Should this be generic?
- Should Admin eventually control this?
- Is this business-owned data tenant-scoped?
- Is there a simpler approach?
- Are we solving a real near-term problem?
- Can this ship safely?

If the answers are clear, proceed.

Aaron wants Tenvio to become a **real, polished, revenue-producing SaaS without becoming an endless engineering project.**

---

# 38. Operations — deployment, environment, and git workflow

V1 is built and deployed live on Railway at usetenvio.com (domain via Namecheap; use `https://www.usetenvio.com` for anything that needs to actually resolve — the bare domain historically had no DNS record, though it resolved fine during a health-check test on 2026-08-21, worth a quick re-check before assuming the Namecheap redirect item is still needed).

## Environment variables

Never invent a value — copy real ones from Railway's dashboard (Settings → Variables on the web service). Required: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (should be `https://www.usetenvio.com` in production, `http://localhost:3000` locally), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (from the Stripe test-mode "TENVIO" account). Optional, blank-safe: `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` (blank = SMS dev-log mode), `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (blank = billing dev-active/free mode). See `.env.example` in the repo root for the full annotated list.

## Git workflow

Don't push straight to `main`. Work on a branch (e.g. `claude/<topic>`), and open a PR or clearly summarize the diff for Aaron to glance at before merging — especially anything touching billing/Stripe, since that's live money. Railway auto-deploys off `main` via `railway.json`'s startCommand, which also runs `npm run db:migrate:deploy`.

## Local environment notes

This machine's shell (Bash/PowerShell as run by Claude Code) doesn't have `gh` (GitHub CLI), `railway` CLI, or `node`/`npx` on PATH. PRs must be opened via the link `git push` prints (`.../pull/new/<branch>`) for Aaron to click; Railway env vars/deploy status need Aaron to confirm from the dashboard; typecheck/build/tests can't be run locally from this shell — review diffs carefully by hand instead.
