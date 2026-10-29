import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { SiteFooter } from "@/components/layout/site-footer";

// Impressum, Datenschutz: plain readable text with a way back to booking
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <main id="inhalt" className="py-10">
        <Container>
          <Link href="/" className="text-small font-semibold text-accent underline-offset-4 hover:underline">
            ← Zur Terminbuchung
          </Link>
          <h1 className="mt-6 text-display">{title}</h1>
          <div className="legal mt-8 flex flex-col gap-4 text-body [&_a]:text-accent [&_a]:underline [&_h2]:mt-6 [&_h2]:text-title [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
            {children}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
