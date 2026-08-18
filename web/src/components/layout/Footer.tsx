import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="text-lg font-semibold">R&S Auto Rentals</span>
          </div>
          <p className="mt-3 text-sm text-white/60">
            Flexible daily and weekly car rentals for gig drivers and local renters.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li><Link href="/vehicles" className="hover:text-white">Browse Vehicles</Link></li>
            <li><Link href="/about" className="hover:text-white">How It Works</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li>Port Saint Lucie, FL</li>
            <li>(772) 555-0100</li>
            <li>admin@rsautorentals.com</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80">Trust &amp; Safety</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li>Verified ID for every renter</li>
            <li>Insured fleet</li>
            <li>Rental agreement e-signed at booking</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} R&S Auto Rentals. All rights reserved.
      </div>
    </footer>
  );
}
