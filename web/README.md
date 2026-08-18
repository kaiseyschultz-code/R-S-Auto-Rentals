R&S Auto Rentals — customer-facing site. Next.js (App Router) + Square (Catalog for
inventory, Checkout API for payment) as the commerce backend.

## Getting Started

Copy `.env.example` to `.env.local` and fill in Square credentials once you have a
Square account (see below). Without them, the site falls back to placeholder vehicle
data so it's still browsable.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Windows note:** this repo lives under a path containing `&` ("R&S Rentals"), which
> breaks `npm run <script>` on Windows — npm's generated `.cmd` shims invoke `cmd.exe`,
> which treats `&` as a command separator. If `npm run dev`/`build`/`lint` fail with
> `'S' is not recognized as an internal or external command`, run the underlying binary
> directly instead:
>
> ```bash
> node node_modules/next/dist/bin/next dev
> node node_modules/next/dist/bin/next build
> node node_modules/eslint/bin/eslint.js .
> ```
>
> The permanent fix is renaming the project folder to remove the `&`.

## Square setup

1. Create a Square account and app at [developer.squareup.com](https://developer.squareup.com/apps).
2. In the Square Dashboard, add vehicles to your Catalog as **Items**, each with two
   **Variations** named "Daily" and "Weekly" (their prices become the daily/weekly rate).
   Upload photos, assign a Category (Sedan, SUV, etc.), and optionally set Custom
   Attributes named `Make`, `Model`, `Year`, `Mileage Limit`, `Seats`, `Platforms` — the
   site reads these automatically (`src/lib/square/catalog.ts`).
3. Copy your sandbox access token and location ID into `.env.local`.
4. Checkout uses Square's hosted Payment Links (`src/app/api/checkout/route.ts`) — no
   card handling happens on this site.

## Structure

- `src/app` — routes (Home, Browse, Vehicle Detail, Booking flow, About, Contact)
- `src/components` — UI, grouped by feature (`home`, `vehicles`, `booking`, `chat`, `layout`)
- `src/lib/square` — Square Catalog/Checkout integration and the `Vehicle` type
- `src/app/api` — `checkout` (Square payment links), `chat` (AI assistant stub), `contact` (form stub)

## Known stubs (not wired to a real backend yet)

- **AI chat assistant** (`src/app/api/chat`) — keyword-based FAQ answers; swap for a real
  Claude/OpenAI call when ready.
- **Contact form** (`src/app/api/contact`) — logs to console; wire to email or the CRM's
  `leads` table.
- **ID verification (iDenfy)** and **BTA appointment booking** — mentioned in the booking
  flow copy but not integrated; no credentials configured yet.
- **Rental agreement e-signature** — the booking flow collects a typed signature as a
  placeholder; real e-signing (e.g. Dropbox Sign) should populate the CRM's
  `rental_agreements` table.
