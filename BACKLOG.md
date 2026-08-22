# Tenvio — Deferred Backlog

Things deliberately **not** built during normal phase work, because they'd have meant stopping the current phase to go build infrastructure, or because they need a decision only Aaron can make.

Rule this file follows (Aaron, 2026-08-21): if something is in the immediate workflow or the current phase, just do it. If it requires going out of the way and halting phase progress, note it here instead. Everything here gets tackled together before onboarding a real paying client.

**Nothing in this file is a bug in shipped code.** Known bugs get fixed immediately, not filed here.

---

## Blockers before a real paying customer

### 1. No password reset / account recovery
**Status:** Not built. **Blocks:** real merchants.

A merchant who forgets their password is permanently locked out — there is no self-service recovery, and no "forgot password" link exists anywhere in the app.

Why it's deferred rather than done: it needs transactional email, and Tenvio has **no email infrastructure at all** (Twilio covers SMS only). That means picking a provider (Resend/Postmark/SES), adding a dependency, new env vars, a token table or signed-token scheme, and templates. That's a project, not a task.

Decision needed from Aaron: which email provider.

Also worth doing at the same time, since they share the same infrastructure: email verification at signup, and billing-related emails (trial ending, payment failed) — right now Stripe sends its own, Tenvio sends none.

### 2. Live-mode Stripe setup
**Status:** Test mode only. **Blocks:** charging real money.

Everything billing-side runs against the Stripe **test** account. Before real customers: create live-mode Product/Price/webhook endpoint/Portal configuration, set live `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` on Railway, and point the production `Plan.stripePriceId` at the live Price (not the test one). Carried over from the Phase C checklist.

---

## Decisions needed (cheap to build once decided)

### 3. Stripe Portal's own cancel button
Tenvio now has its own cancellation flow that captures a reason. Stripe's hosted Portal *also* still exposes a generic cancel button (account-level setting, not controlled by this codebase). Anyone using that path produces **no `Cancellation` row and no reason**, which silently undercuts `/admin/cancellations`.

Decision: disable cancellation in the Stripe Portal config so Tenvio's flow is the only path? Recommended yes.

### 4. Reward overflow on PER_UNIT
If a customer is at 8/10 and staff log quantity 5, they hit 13 — one reward is earned and the extra 3 are **discarded**, not rolled into the next cycle. This mirrors the pre-existing single-unit behavior rather than inventing new reward math unilaterally. Competitors generally do roll over.

Decision: keep discard, or implement rollover?

---

## Known gaps, no decision needed, just not scheduled yet

### 5. Persistent Scan Mode — untested edge case
`Html5QrcodeScanner` renders its own canned UI including its own internal stop/restart controls, which Tenvio's pause/resume model doesn't intercept. If staff tap the library's button instead of Tenvio's "Exit Scan Mode," the pause state could desync from the actual camera state. Needs a real phone to confirm; couldn't be tested in the environment it was built in.

If it's real, the fix is switching to the lower-level `Html5Qrcode` class with a fully custom camera view.

### 6. Automated test coverage is thin
Vitest exists but only covers the pure loyalty math (`src/lib/loyalty.test.ts`). **Not covered:** concurrency/idempotency on scan, tenant isolation, the finalize/undo window, webhook handling, access derivation. These need a real Postgres instance (or a mocked Prisma layer) to test properly.

Given how much of Phase E0 was safety-critical transaction work, this is the highest-value engineering debt in the repo.

### 7. Admin metrics depth
`/admin` shows MRR, counts by status, trials ending soon. **Missing:** churn rate, trial→paid conversion rate, cohort retention, ARPU, and any trend-over-time view. All computable from existing data — just not built.

### 8. Bare domain redirect
`usetenvio.com` (no `www`) has no A/AAAA record. `www` works and is what everything uses. A Namecheap redirect record would catch people typing the bare domain. Low impact, trivial fix.

### 9. Test-mode data cleanup
"Phase C Test Cafe" and a couple of earlier demo businesses are harmless clutter in Stripe test mode and the production DB.

---

## Explicitly out of scope until customers validate the need

Per the product principles in `CLAUDE.md` (sections 3, 16, 31, 32) these are **not** oversights:

- Multi-industry terminology system (Phase L)
- Rewards Wallet (Phase M)
- Challenges (Phase N)
- Spend-based loyalty (`PER_SPEND` is schema-reserved only — needs POS data Tenvio doesn't have)
- POS integrations
- AI-driven retention insights
- Native mobile app
- Support inbox / ticketing
