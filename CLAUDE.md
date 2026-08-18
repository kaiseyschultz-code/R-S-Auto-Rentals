# R&S Auto Rentals — Project Guide

Private car rental company (Port Saint Lucie, FL). Daily/weekly rentals aimed at gig
drivers (Uber, DoorDash, Lyft) and local renters. This repo has two independent halves:

1. **`web/`** — the customer-facing website. Next.js + Square. **Built and working.**
2. **Repo root SQL files** — an internal CRM/ops backend schema (Supabase/Postgres).
   **Designed but not yet applied to a live database, and not yet connected to `web/`.**

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

## 2. The CRM/ops backend (SQL files at repo root)

**Not yet applied to any database, and not yet connected to `web/`.** This is a
multi-tenant Supabase/Postgres schema for the business's internal operations — rentals,
customers, invoices, expenses, leads, rental agreements, follow-up sequences — separate
from the public website above.

### Files, in the order they must be run in the Supabase SQL Editor

1. `schema1-sql.txt` — core tables (tenants, users, vehicles, customers, rentals,
   invoices, expenses, leads, rental_agreements, follow_up_sequences, activity_log,
   social_posts)
2. `002_functions-sql.txt` — triggers, invoice auto-numbering, the `public.tenant_id()`
   helper RLS depends on, vehicle status sync, dashboard KPI + vehicle ROI views
3. `003_rls.sql.txt` — row-level security (tenant-isolated; invoices/expenses restricted
   to owner/manager roles)
4. `004_indexes.sql.txt` — performance indexes
5. `005_Seed-sql.txt` — seeds one tenant ("R&S Auto Rentals") with sample data. Has a
   commented-out owner-user insert — create your first user via Supabase Auth first,
   copy their UUID in, then uncomment and run.

**Delete before running**: `001_functions-sql.txt` and `schema2-sql.txt` are stale
duplicate drafts (they define `auth.tenant_id()`, which Supabase blocks — Supabase
doesn't allow user-created functions in the `auth` schema). `002_functions-sql.txt` is
the corrected version that `003_rls.sql.txt` actually depends on. Don't run the stale
files or RLS will fail to find the function it expects.

### Open question before building further

The `tenants` table has `plan` and Stripe subscription fields, suggesting this schema
was designed as a resellable multi-tenant SaaS product — but the seed data only
populates R&S's own tenant, and nothing in `web/` talks to this schema yet. Before
building either direction, confirm with the project owner:
- Is the CRM internal-only for R&S, or a product to sell to other rental companies?
- Should a completed Square checkout create a row in `rentals`/`customers` (e.g. via a
  Square webhook → API route → Supabase insert), or do the two systems stay separate?

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
| CRM database | Schema written, not applied, not connected to the website | repo root `*.sql.txt` files |

## 4. Suggested next steps, roughly in order

1. Set up a Square sandbox account, add a few real vehicles, confirm the live catalog
   path works end-to-end (not just the mock fallback).
2. Stand up a Supabase project and run the CRM migrations (§2).
3. Decide the Square ↔ CRM integration question (§2) before building a connector.
4. Wire `api/chat` to a real LLM (Claude or OpenAI) and `api/contact` to email or the
   `leads` table.
5. Integrate iDenfy (ID verification) and a real e-signature provider for the rental
   agreement step.
6. Deploy `web/` to Vercel or Netlify; set the production env vars from `.env.example`.

## 5. Tech stack reference

- Next.js 16 (App Router, Turbopack) — routes use async `params: Promise<{...}>`;
  global `PageProps`/`LayoutProps` helper types are auto-generated by `next dev`/`build`.
- React 19, Tailwind CSS v4 (config lives in `globals.css` via `@theme`, not a
  `tailwind.config.js`).
- `square` npm package (the new Fern-generated SDK — `SquareClient`, not the legacy
  `square/legacy` client).
- No test suite yet.
