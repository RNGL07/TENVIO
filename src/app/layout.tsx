import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Tenvio",
  description: "Turn every new visit into opportunity.",
};

/** Declared explicitly rather than relying on Next's injected default —
 * this app is operated primarily from phones (see CLAUDE.md section 26),
 * so viewport behavior is a product requirement, not a framework detail.
 * Note `initial-scale: 1` does NOT prevent a browser from zooming out when
 * page content is wider than the screen; only keeping content within the
 * viewport does. Any element that can hold a long unbreakable string needs
 * `break-words`, and any grid/flex child that contains one needs
 * `min-w-0`. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
