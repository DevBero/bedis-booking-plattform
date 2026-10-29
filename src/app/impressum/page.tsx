import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { SALON } from "@/lib/salon";

export const metadata: Metadata = { title: "Impressum", alternates: { canonical: "/impressum/" } };

// Angaben gemäß § 5 DDG. Verantwortlich ist der Salon, nicht der Entwickler. Platzhalter in src/lib/salon.ts (BD-601).
export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {SALON.name}
        <br />
        Inhaber/in: {SALON.owner}
        <br />
        {SALON.street}
        <br />
        {SALON.zip} {SALON.city}
      </p>
      <h2>Kontakt</h2>
      <p>
        Telefon: {SALON.phone}
        <br />
        E-Mail: <a href={`mailto:${SALON.email}`}>{SALON.email}</a>
      </p>
      {SALON.vatId && (
        <>
          <h2>Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {SALON.vatId}</p>
        </>
      )}
      <h2>Berufsrechtliche Angaben</h2>
      <p>
        Berufsbezeichnung: Friseur (verliehen in der Bundesrepublik Deutschland)
        <br />
        Eingetragen in die Handwerksrolle der zuständigen Kammer: {SALON.chamber}
        <br />
        Berufsrechtliche Regelungen: Handwerksordnung (HwO), abrufbar unter{" "}
        <a href="https://www.gesetze-im-internet.de/hwo/" rel="noopener">
          gesetze-im-internet.de/hwo
        </a>
      </p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      <h2>Preise</h2>
      <p>Alle angegebenen Preise sind Endpreise inklusive der gesetzlichen Mehrwertsteuer.</p>
    </LegalPage>
  );
}
