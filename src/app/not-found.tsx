import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Seite nicht gefunden", robots: { index: false, follow: false } };

// Exported as 404.html; CloudFront answers missing files with it (status 404)
export default function NotFound() {
  return (
    <>
      <main id="inhalt" className="pt-16">
        <Container className="flex flex-col items-start gap-6">
          <p className="meta text-muted">404</p>
          <h1 className="text-display">Diese Seite gibt es nicht.</h1>
          <p className="text-lead text-muted">Vielleicht hat sich ein Tippfehler eingeschlichen. Hier geht es zur Terminbuchung:</p>
          <Link href="/" className={buttonStyles()}>
            Termin buchen
          </Link>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
