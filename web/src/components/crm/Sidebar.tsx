"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string };

export default function Sidebar({
  items,
  user,
  signOut,
}: {
  items: NavItem[];
  user: { name: string; role: string };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 print:hidden lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-ink"
          aria-expanded={open}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} border-b border-black/5 bg-white print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r`}
      >
        <div className="hidden px-5 py-5 lg:block">
          <Brand />
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-brand/15 text-ink"
                  : "text-ink/60 hover:bg-black/[0.03] hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-black/5 px-5 py-4">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="text-xs capitalize text-ink/50">{user.role}</p>
          <div className="mt-3 flex gap-3 text-xs font-semibold">
            <Link href="/" className="text-ink/50 hover:text-ink">
              View website
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-ink/50 hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-brand" />
      <span className="font-semibold tracking-tight text-ink">R&S Ops</span>
    </Link>
  );
}
