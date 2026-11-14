# R&S Auto Rentals — Project Guide

Private car rental company (Stuart & Port St. Lucie, FL; (772) 202-0853). Daily, weekly
and long-term rentals aimed at gig drivers (Uber, Lyft, DoorDash, Amazon Flex) and local
renters. This repo has:

1. **`web/`**: one Next.js app with three parts:
   - the customer-facing website (Square catalog + checkout): **built, never deployed**;
   - the **staff CRM** at `/admin` (§2): **built and tested against local Supabase**;
   - the renter **vehicle inspection** flow at `/inspect/[token]` (§4): **built and tested locally**.
2. **`supabase/`**: the CRM database (migrations, seed, Supabase CLI config).
   **Live** on Supabase project `RS_Auto-Rentals` (ref `iufxoibejaoxbuzjsjqz`, org
   RS_Autosales, us-east-2) since 2026-11-14, and runs locally in Docker for development.

**The live site, www.rsautorentals.com, is NOT built from this repo.** It's a separate
site whose "Book now" is an inquiry form (`/book-car`). **Decided 2026-11-13: the live site
stays as the public face.** This app deploys beside it, e.g. at ops.rsautorentals.com, with
`OPS_ONLY=true`: `src/proxy.ts` then serves only `/admin` and `/inspect` (plus
`/api/inspect`), sends `/` to the CRM, and 308-redirects every other path to
`MAIN_SITE_URL`. The public pages in `web/(site)` stay in the repo but aren't served there.
Next integration: the live site's booking inquiries → CRM leads.

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

Open http://localhost:3000 (staff CRM: http://localhost:3000/admin, see §2). Without Square credentials configured, the site still
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

**OneDrive breaks builds.** This folder syncs with OneDrive, which (a) makes some
`node_modules` files online-only (build fails with "The cloud file provider is not
running") and (b) locks files in `.next` while syncing (`EPERM ... unlink`).
`web/node_modules` is pinned "always keep on this device"; for reliable builds, work from
a mirror outside OneDrive with its own `node_modules`:
```powershell
robocopy "<repo>\web" "$env:LOCALAPPDATA\rs-auto-rentals\web-build" /MIR /XD node_modules .next .next-onedrive-old
cd "$env:LOCALAPPDATA\rs-auto-rentals\web-build"; npm ci; npx next build
```
`.claude/launch.json` (gitignored) runs the dev server from that copy. A `.next` junction
to a local folder does NOT work: Node then can't resolve `node_modules` from build chunks.
The real fix is moving the repo out of OneDrive (GitHub is the sync); that's MD's call.

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

- **Route groups**: public pages live in `src/app/(site)/` (its layout adds the navbar,
  footer and chat bubble). URLs are unchanged. The root layout is a bare html/body shell
  shared with `/admin` and `/inspect`.
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
    ID verification, booking). Swap for a real Claude/OpenAI call — see §6.
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

## 2. The staff CRM (`web/src/app/admin`)

Supabase Auth (email + password) via `@supabase/ssr`. `src/proxy.ts` (Next 16's renamed
middleware) refreshes the session and sends signed-out visitors on `/admin/*` to
`/admin/login`. Every page and server action also checks the user itself
(`src/lib/crm/session.ts`: `requireStaff` / `requireFinance` / `requireOwner`).

- **Sections** (`src/app/admin/(crm)/`): Dashboard (KPIs, due back/late, upcoming
  pickups, missing/unreviewed inspections, fleet ROI for finance roles); Rentals (create,
  edit, hand over keys, mark returned which bumps vehicle mileage, overdue, cancel; double
  bookings show a plain message); Vehicles; Customers (the full ID number is never sent to
  the browser, only its last 4); Leads (pipeline board; "Convert to customer" opens a new
  rental, and saving it marks the lead won); Invoices and Expenses (owner/manager only);
  Team (owner adds logins, changes roles, switches access off); Account (click your name
  in the sidebar: change your own password, e.g. replacing a temporary one).
- **Nothing is deleted** in the UI: retire a vehicle with status Inactive, a person by
  unticking "Has access", an invoice with status Cancelled.
- **Patterns**: each section has `page.tsx` (list), `new/`, `[id]/`, a `*Fields.tsx` form
  body shared by new/edit, and `actions.ts` server actions returning `{ error }` to
  `components/crm/CrmForm.tsx` (useActionState). Parse form data with the
  `src/lib/crm/form.ts` helpers; turn DB errors into plain English with
  `friendlyDbError`. Cast joined rows with `rows<T>()` (`src/lib/crm/rows.ts`), since
  there are no generated DB types. Log changes with `logActivity`.
- **Secret key**: `createAdminClient()` (`src/lib/supabase/server.ts`) bypasses RLS. It's
  used only by Team (creating logins, after checking the caller is owner) and the public
  inspection API (after checking the link token). Everything else runs as the user.
- **First owner login**: `node --env-file=.env.local scripts/create-staff-user.mjs <email> "<Name>" owner`
  (prints a one-time password). Public sign-ups are off (`supabase/config.toml`).

### Running it locally

```bash
npx supabase start             # repo root; Docker. Applies migrations + seed.sql
npx supabase status -o env     # copy API_URL / PUBLISHABLE_KEY / SECRET_KEY into web/.env.local
```
Local test logins (owner + staff) are in `web/.env.local` (`TEST_*`, gitignored). After
`npx supabase db reset` they're gone; recreate them with the script above.

---

## 3. The CRM database (`supabase/`)

**Live project**: `iufxoibejaoxbuzjsjqz` (the repo is linked: `npx supabase link`). All
migrations are applied there; the seed is NOT (production has no sample data). The first
owner login exists. Apply new migrations with
`npx supabase db push --remote --dry-run`, then without `--dry-run` (add `--yes` to skip the
prompt). The live keys are in `web/.env.production.local` (gitignored; the secret key
bypasses RLS). Fetch them with `npx supabase projects api-keys --project-ref
iufxoibejaoxbuzjsjqz --reveal`; without `--reveal` the secret comes back masked. Public
sign-ups are disabled in the dashboard (Authentication → Sign In / Providers), not just in
`config.toml`, which only affects local dev.

A multi-tenant Supabase/Postgres schema for the business's internal operations (rentals,
customers, invoices, expenses, leads, rental agreements, follow-up sequences), separate
from the public website above. R&S is the only tenant; `tenant_id` stays on every table
so the CRM could be offered to other rental companies later.

### Files (Supabase CLI layout; run in this order)

0. `supabase/migrations/20261113000000_archive_2025_drafts.sql`: the live project had the
   old drafts pasted in by hand (empty tables). If that old schema is detected
   (`tenants.stripe_customer_id`), it moves its tables, views and functions into schema
   `archive_2025_drafts` (not exposed by the API; nothing dropped). A no-op elsewhere.
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
5. `..._inspections.sql`: `inspections` + `inspection_photos` tables, tenant RLS, and the
   PRIVATE `inspections` storage bucket (staff may read only their tenant's folder; there's
   no upload policy, because uploads come from the server). See §4.
6. `..._staff_profile_on_metadata.sql`: fixes migration 2's trigger. Supabase Auth's
   `admin.createUser` writes app_metadata in a follow-up UPDATE, so the trigger now runs on
   INSERT or UPDATE of `raw_app_meta_data`, and never overwrites an existing profile.
7. `..._rs_tenant.sql`: the one real R&S tenant row (id `a1b2c3d4-…-000000000001`), so
   production has it; staff logins attach to it.
8. `supabase/seed.sql`: LOCAL sample data only (dates relative to today). Create logins with
   `scripts/create-staff-user.mjs`, not the commented-out SQL.

Without the Supabase CLI, paste each file into the Supabase SQL Editor in that order.
The original drafts are in `archive/sql-drafts/` for reference only; don't run them.

### Testing the schema

`bash db-tests/run.sh` (needs Docker) applies the migrations and seed to a throwaway
Postgres 17 container, with `db-tests/supabase-shim.sql` standing in for Supabase's
auth schema and roles, then runs `db-tests/checks.sql`: RLS per role and tenant,
double-booking, invoice numbering, KPI/ROI totals, the staff-profile trigger, and
inspection isolation (other tenants and anonymous users see nothing; the bucket is
private). Each check's label says what to expect; four ERROR lines (double booking, staff
self-promotion, staff invoice insert, a photo angle outside the shot list) are expected. Re-run after any schema change.

### Open questions

- Long-term (monthly) rentals and delivery are offered on the live site, but
  `rentals.plan_type` only allows daily/weekly and there's no delivery address or fee yet.
- Should a completed Square checkout create rows in `customers`/`rentals`/`invoices`
(Square webhook → API route → Supabase insert with the service_role key)? Leaning yes;
confirm with the project owner before building it.

---

## 4. Vehicle inspections (condition reports)

Our own design: no third-party service, and don't copy any vendor's guided walk-around.
Renters photograph the car at pickup and return; staff compare and record damage.

- **Staff send a link** from the rental page ("Send pickup/return inspection"). That
  creates an `inspections` row with a random 192-bit token, valid 72 hours; there's one
  pickup and one return inspection per rental. "New link" rotates the token and keeps the
  photos taken so far. The link is shown with a copy button, since SMS/email isn't wired yet.
- **Renter page** `/inspect/[token]` (`src/app/inspect/`, its own minimal layout: no
  navbar or chat bubble, noindex, no-referrer): a fixed 13-shot list
  (`src/lib/inspections/angles.ts`, which must match the DB CHECK), a top-down car diagram
  showing where to stand, the phone's own camera via `<input capture>`, client-side
  downscale to 1920px max, optional opt-in location, then odometer, fuel level, a condition
  statement, typed name and optional drawn signature.
- **Uploads** go through `/api/inspect/[token]/photo` and `/complete`, which re-check the
  token on every request and write with the secret key. Renters never get DB or storage
  access. Each photo gets a SHA-256 fingerprint; a retake replaces the row but keeps the
  old file. Completing closes the link and raises the vehicle's mileage from the reading.
- **Review** at `/admin/rentals/[id]/inspection`: pickup vs return side by side per angle
  (10-minute signed URLs), a clean/damage verdict with per-photo flags, printable (browser
  print; no PDF yet). On damage, owners/managers get one form that creates a pending
  damage invoice and/or a maintenance expense on the vehicle.
- **Dashboard** flags active rentals missing a pickup inspection, cars returned in the
  last 30 days missing a return inspection, and completed inspections awaiting review.
- **Stage 2 (not built)**: Claude vision comparison of photo pairs to suggest damage for
  staff to confirm, retake prompts for blurry or dark photos, SMS reminders.

---

## 5. Known stubs and integrations not yet started

None of these have credentials or real wiring yet — they're either stubbed or just
referenced in copy/schema:

| Feature | Status | Where |
|---|---|---|
| AI chat assistant | Stub — keyword FAQ matching | `web/src/app/api/chat/route.ts` |
| Contact form | Stub — logs to console | `web/src/app/api/contact/route.ts` |
| ID verification (iDenfy) | Not started — mentioned in booking copy only | `web/src/components/booking/BookingWizard.tsx` |
| BTA appointment booking | Not started | — |
| Rental agreement e-signature | Placeholder typed-signature UI only | `BookingWizard.tsx` step 3; real backend is `rental_agreements` table (Dropbox Sign fields already in schema) |
| CRM database | Live on Supabase (`iufxoibejaoxbuzjsjqz`); first owner login created | `supabase/` |
| Staff CRM UI | Built and tested locally; not deployed | `web/src/app/admin` |
| Vehicle inspections | Stage 1 built and tested locally; links shared by copy/paste (no SMS/email); no PDF; Stage 2 AI review not started | §4 |
| Live-site booking inquiries → CRM leads | Not started (the live site is a separate build) | — |

## 6. Suggested next steps, roughly in order

1. ~~Stand up a live Supabase project, run the migrations, create the owner login~~ (done
   2026-11-14). Still to do: invite Kaisey to the Supabase org and add her as a CRM owner.
2. Deploy `web/` ops-only (Vercel, `OPS_ONLY=true`, env vars from `web/.env.example`) at
   a subdomain such as ops.rsautorentals.com; set `NEXT_PUBLIC_SITE_URL` to it so
   inspection links point there, and add it to Supabase Auth's site/redirect URLs.
3. Send live-site booking inquiries into CRM `leads`.
4. Send inspection links by SMS/email; then inspection Stage 2 (§4).
5. Set up Square sandbox with real vehicles; decide the Square ↔ CRM question (§3), then
   build the Square webhook.
5. Wire `api/chat` to a real LLM (Claude or OpenAI) and `api/contact` to email or the
   `leads` table.
6. Integrate iDenfy (ID verification) and a real e-signature provider for the rental
   agreement step.
7. Monthly plans and delivery on rentals, if confirmed (§3 open questions).

## 7. Tech stack reference

- Next.js 16 (App Router, Turbopack) — routes use async `params: Promise<{...}>`;
  global `PageProps`/`LayoutProps` helper types are auto-generated by `next dev`/`build`.
- React 19, Tailwind CSS v4 (config lives in `globals.css` via `@theme`, not a
  `tailwind.config.js`).
- `square` npm package (the new Fern-generated SDK — `SquareClient`, not the legacy
  `square/legacy` client).
- `@supabase/supabase-js` + `@supabase/ssr` (publishable/secret API keys, `getClaims()`).
- No app test suite yet. The CRM schema has `db-tests/` (see §3).

## 8. Git identities

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
