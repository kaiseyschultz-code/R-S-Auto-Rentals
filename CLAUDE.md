# R&S Auto Rentals — Project Guide

Private car rental company (Port Saint Lucie, FL). Daily/weekly rentals aimed at gig
drivers (Uber, DoorDash, Lyft) and local renters. This repo has two independent halves:

1. **`web/`** — the customer-facing website. Next.js + Square. **Built and working.**
2. **`supabase/`** — the internal CRM/ops backend schema (Supabase/Postgres).
   **Migrations written and tested on local Postgres; not yet applied to a live Supabase
   project, and not yet connected to `web/`. No staff CRM UI exists yet.**

**Payments are Square only.** No Stripe, no Shopify anywhere: not in the site, not in the
CRM schema. Don't add fields or integrations for either.

Read this whole file before making changes — it covers what exists, what's stubbed,
what's not started, and the decisions already made so you don't re-litigate them.

---

## 1. The website (`web/`)

Next.js 16 (App Router, TypeScript, Tailwind v4). Square is the commerce backend —
**not Shopify**, despite what an older planning doc in this repo (`R&S Rentals_Prompt.docx`)
says. That doc was the original spec; it's kept for historical reference only. Square
was chosen later and is what's actually implemented.

### Setup

```bash
cd web
npm install
cp .env.example .env.local   # fill in Square credentials, see below
npm run dev
```

Open http://localhost:3000. Without Square credentials configured, the site still
works — it falls back to placeholder vehicle data (`src/lib/square/mock-vehicles.ts`)
so you can browse the full flow before Square is connected.

**If `npm run dev`/`build`/`lint` fail on Windows** with an error like
`'S' is not recognized as an internal or external command`: this happens if the repo's
local folder path contains `&` (npm's `.cmd` shims invoke `cmd.exe`, which treats `&`
as a command separator). Rename the folder to remove the `&`, or run the underlying
binary directly as a workaround:
```bash
node node_modules/next/dist/bin/next dev
node node_modules/next/dist/bin/next build
node node_modules/eslint/bin/eslint.js .
```

### Square setup (required for real inventory + checkout)

1. Create a Square account and app at https://developer.squareup.com/apps.
2. In the Square Dashboard, add each rental vehicle as a Catalog **Item**, with two
   **Variations** named exactly `Daily` and `Weekly` — their prices become the site's
   daily/weekly rates. Add a photo and a Category (e.g. "Sedan", "SUV", "Minivan").
3. Optionally add Custom Attributes to items named `Make`, `Model`, `Year`,
   `Mileage Limit`, `Seats`, `Platforms` (comma-separated, e.g. "Uber, DoorDash") — the
   site reads these automatically and shows them on the vehicle detail page. Anything
   not set is just omitted, nothing is faked.
4. Copy your **sandbox** access token and location ID into `web/.env.local`:
   ```
   SQUARE_ACCESS_TOKEN=...
   SQUARE_LOCATION_ID=...
   SQUARE_ENVIRONMENT=sandbox
   ```
5. Switch `SQUARE_ENVIRONMENT=production` and use production credentials when going live.
6. Checkout uses Square's hosted **Payment Links** (`src/app/api/checkout/route.ts`) —
   the site never touches card data directly. A booking for N days/weeks creates a
   payment link with quantity = N against the chosen Daily/Weekly variation, and the
   buyer is redirected to Square's hosted page, then back to `/booking/confirmed`.

### What's built

- **Pages**: Home, Browse Vehicles (`/vehicles`, with client-side type/platform/price
  filters), Vehicle Detail (`/vehicles/[id]`), Booking Flow (`/vehicles/[id]/book`,
  4 steps: dates & plan → renter info → rental agreement → review & pay), About/How It
  Works (`/about`), Contact (`/contact`), Booking Confirmed (`/booking/confirmed`).
- **`src/lib/square/`** — `client.ts` (Square SDK client, guarded against missing env
  vars), `catalog.ts` (fetches + maps Square Catalog data to the `Vehicle` type),
  `mock-vehicles.ts` (placeholder fallback data), `types.ts` (`Vehicle`, `RentalPlan`).
- **API routes** (`src/app/api/`):
  - `checkout` — creates a Square Payment Link. Returns HTTP 501 with a clear message
    if Square isn't configured yet (doesn't crash).
  - `chat` — **stub**. Keyword-matches a handful of FAQs (pricing, mileage, insurance,
    ID verification, booking). Swap for a real Claude/OpenAI call — see §4.
  - `contact` — **stub**. Validates and `console.log`s the submission. Wire to an
    email service or the CRM's `leads` table.
- Brand color (`--brand: #4db8e8`) intentionally matches the CRM schema's
  `tenants.primary_color` default, for visual consistency once the two are connected.

### Verified working

Full `next build` (clean typecheck), ESLint (clean), and a live `next dev` smoke test —
confirmed real data renders on every page and all three API routes respond correctly.
Re-run these after any significant change:
```bash
cd web
node node_modules/next/dist/bin/next build
node node_modules/eslint/bin/eslint.js .
```

---

## 2. The CRM/ops backend (`supabase/`)

**Not yet applied to a live Supabase project, and not yet connected to `web/`.** A
multi-tenant Supabase/Postgres schema for the business's internal operations (rentals,
customers, invoices, expenses, leads, rental agreements, follow-up sequences), separate
from the public website above. R&S is the only tenant; `tenant_id` stays on every table
so the CRM could be offered to other rental companies later.

### Files (Supabase CLI layout; run in this order)

1. `supabase/migrations/20261113000001_schema.sql`: core tables, plus Square ID columns
   (`vehicles.square_item_id` / `square_daily_variation_id` / `square_weekly_variation_id`,
   `customers.square_customer_id`, `rentals.square_order_id`, `invoices.square_*`) and a
   `rentals_no_double_booking` exclusion constraint (needs `btree_gist`).
2. `..._functions.sql`: `updated_at` triggers; per-tenant invoice numbering via an
   `invoice_counters` table; RLS helpers `public.tenant_id()`, `public.user_role()`,
   `public.is_finance_user()`; a guard trigger so only owners change role/tenant/active;
   `handle_new_auth_user` (creates a staff profile from the auth user's **app_metadata**
   `tenant_id`/`role`/`full_name`; never user_metadata, which public sign-ups control);
   vehicle status sync; `dashboard_kpis` and `vehicle_roi` views (`security_invoker`).
3. `..._rls.sql`: tenant isolation. Invoices and expenses are owner/manager only.
   Postgres ORs permissive policies, so never add a broad policy on a table that has a
   stricter one.
4. `..._indexes.sql`.
5. `supabase/seed.sql`: sample data for R&S (dates relative to today). The owner-user
   insert is commented out: create your login in Supabase Auth first, then run it with
   your UUID.

Without the Supabase CLI, paste each file into the Supabase SQL Editor in that order.
The original drafts are in `archive/sql-drafts/` for reference only; don't run them.

### Testing the schema

`bash db-tests/run.sh` (needs Docker) applies the migrations and seed to a throwaway
Postgres 17 container, with `db-tests/supabase-shim.sql` standing in for Supabase's
auth schema and roles, then runs `db-tests/checks.sql`: RLS per role and tenant,
double-booking, invoice numbering, KPI/ROI totals. Each check's label says what to expect;
three ERROR lines (double booking, staff self-promotion, staff invoice insert) are
expected. Re-run after any schema change.

### Open question

Should a completed Square checkout create rows in `customers`/`rentals`/`invoices`
(Square webhook → API route → Supabase insert with the service_role key)? Leaning yes;
confirm with the project owner before building it.

---

## 3. Known stubs and integrations not yet started

None of these have credentials or real wiring yet — they're either stubbed or just
referenced in copy/schema:

| Feature | Status | Where |
|---|---|---|
| AI chat assistant | Stub — keyword FAQ matching | `web/src/app/api/chat/route.ts` |
| Contact form | Stub — logs to console | `web/src/app/api/contact/route.ts` |
| ID verification (iDenfy) | Not started — mentioned in booking copy only | `web/src/components/booking/BookingWizard.tsx` |
| BTA appointment booking | Not started | — |
| Rental agreement e-signature | Placeholder typed-signature UI only | `BookingWizard.tsx` step 3; real backend is `rental_agreements` table (Dropbox Sign fields already in schema) |
| CRM database | Migrations tested locally; not applied to Supabase, not connected to the website | `supabase/` |
| Staff CRM UI | Not started | — |

## 4. Suggested next steps, roughly in order

1. Set up a Square sandbox account, add a few real vehicles, confirm the live catalog
   path works end-to-end (not just the mock fallback).
2. Stand up a Supabase project and run the CRM migrations (§2).
3. Build the staff CRM UI (planned: an `/admin` area inside `web/` with Supabase Auth):
   dashboard, vehicles, customers, rentals, invoices, expenses, leads pipeline.
4. Decide the Square ↔ CRM integration question (§2), then build the Square webhook.
5. Wire `api/chat` to a real LLM (Claude or OpenAI) and `api/contact` to email or the
   `leads` table.
6. Integrate iDenfy (ID verification) and a real e-signature provider for the rental
   agreement step.
7. Deploy `web/` to Vercel or Netlify; set the production env vars from `.env.example`.

## 5. Tech stack reference

- Next.js 16 (App Router, Turbopack) — routes use async `params: Promise<{...}>`;
  global `PageProps`/`LayoutProps` helper types are auto-generated by `next dev`/`build`.
- React 19, Tailwind CSS v4 (config lives in `globals.css` via `@theme`, not a
  `tailwind.config.js`).
- `square` npm package (the new Fern-generated SDK — `SquareClient`, not the legacy
  `square/legacy` client).
- No app test suite yet. The CRM schema has `db-tests/` (see §2).

## 6. Git identities

This repo sets its own identity in `.git/config`, so the global `DeployWise` identity in
`~/.gitconfig` doesn't apply here (and should be left alone).

- **MD's work, including Claude Code sessions working with MD:** commit normally. The
  author is `mdschultz01 <mdschultz01@gmail.com>`.
- **Automated / agent work** (the ops tooling that helps run the business): commit through
  the repo alias, e.g. `git ops commit -m "..."`. The author is
  `R&S Auto Rentals Ops <ops@rs-auto-rentals.invalid>`. The email is a placeholder; swap it
  for a real address (or a GitHub noreply address of a bot account) once one exists, with
  `git config alias.ops '!git -c "user.name=R&S Auto Rentals Ops" -c "user.email=NEW"'`.

Both settings live in `.git/config`, which isn't committed, so a fresh clone needs them set
again.
