import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { geist } from "@/lib/fonts";
import { SALON } from "@/lib/salon";
import { APP_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `Terminbuchung – ${SALON.name}`, template: `%s – ${SALON.name}` },
  description: `Online einen Termin bei ${SALON.name} buchen: Leistung wählen, freie Uhrzeit aussuchen, fertig.`,
  alternates: { canonical: "/" },
  // Internal tool for the salon's customers (QR code), never in search engines; CloudFront adds X-Robots-Tag too
  robots: { index: false, follow: false },
  openGraph: { type: "website", locale: "de_DE", siteName: SALON.name, url: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={geist.variable}>
      <body className="min-h-dvh">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-md focus:bg-card focus:px-4 focus:py-2">
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
