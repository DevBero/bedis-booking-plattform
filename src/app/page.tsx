import { BookingFlow } from "@/components/booking/booking-flow";
import { SiteFooter } from "@/components/layout/site-footer";
import { Container } from "@/components/ui/container";
import { hairSalonJsonLd } from "@/lib/jsonld";

export default function BookingPage() {
  return (
    <>
      <main id="inhalt">
        <Container>
          <BookingFlow />
        </Container>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hairSalonJsonLd()).replace(/</g, "\\u003c") }} />
    </>
  );
}
