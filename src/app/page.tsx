import { BookingFlow } from "@/components/booking/booking-flow";
import { Container } from "@/components/ui/container";

export default function BookingPage() {
  return (
    <main id="inhalt" className="pb-16">
      <Container>
        <BookingFlow />
      </Container>
    </main>
  );
}
