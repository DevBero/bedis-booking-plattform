import type { Metadata } from "next";
import { CancelFlow } from "@/components/cancel/cancel-flow";
import { SiteFooter } from "@/components/layout/site-footer";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Termin absagen",
  robots: { index: false, follow: false },
  alternates: { canonical: "/storno/" },
};

export default function CancelPage() {
  return (
    <>
      <main id="inhalt" className="pt-8">
        <Container className="flex flex-col gap-6">
          <p className="meta text-muted">Termin absagen</p>
          <h1 className="text-display">Termin absagen</h1>
          <CancelFlow />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
