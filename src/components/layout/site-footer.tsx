import Link from "next/link";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line py-8 text-small text-muted">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/impressum/" className="underline-offset-4 hover:text-ink hover:underline">
          Impressum
        </Link>
        <Link href="/datenschutz/" className="underline-offset-4 hover:text-ink hover:underline">
          Datenschutz
        </Link>
      </Container>
    </footer>
  );
}
