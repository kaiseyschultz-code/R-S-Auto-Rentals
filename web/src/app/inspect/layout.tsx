import type { Metadata, Viewport } from "next";

// Renter-facing inspection flow. Deliberately outside the (site) group: no
// navbar, footer or chat bubble competing with the camera buttons on a phone.
export const metadata: Metadata = {
  title: "Vehicle condition check · R&S Auto Rentals",
  robots: { index: false, follow: false },
  // The link token is in the URL; don't leak it to other sites.
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
};

export default function InspectLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-black/[0.02]">{children}</main>;
}
