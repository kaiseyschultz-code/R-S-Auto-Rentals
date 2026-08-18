import Link from "next/link";

const links = [
  { href: "/vehicles", label: "Browse Vehicles" },
  { href: "/about", label: "How It Works" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <span className="text-lg font-semibold tracking-tight text-ink">R&S Auto Rentals</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/70 transition hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/vehicles"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Rent Now
        </Link>
      </div>
    </header>
  );
}
