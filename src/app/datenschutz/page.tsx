import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { SALON } from "@/lib/salon";

export const metadata: Metadata = { title: "Datenschutz", alternates: { canonical: "/datenschutz/" } };

// Entwurf, vor dem Launch rechtlich prüfen lassen (BD-602). Beschreibt genau das, was die Plattform tut:
// keine Cookies, kein Tracking, Buchungsdaten in Sanity, Mails über Amazon SES, Hosting bei AWS in Stockholm.
export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <p>
        {SALON.name}, {SALON.owner}
        <br />
        {SALON.street}, {SALON.zip} {SALON.city}
        <br />
        Telefon: {SALON.phone}, E-Mail: <a href={`mailto:${SALON.email}`}>{SALON.email}</a>
      </p>

      <h2>2. Das Wichtigste in Kürze</h2>
      <ul>
        <li>Diese Seite setzt keine Cookies und nutzt kein Tracking und keine Analyse-Werkzeuge.</li>
        <li>Wir speichern nur, was wir für deinen Termin brauchen: Name, Telefonnummer und – wenn du willst – E-Mail-Adresse und eine Notiz.</li>
        <li>Deine Buchung wird automatisch gelöscht, spätestens 30 Tage nach dem Termin.</li>
      </ul>

      <h2>3. Aufruf der Website</h2>
      <p>
        Die Website wird bei Amazon Web Services EMEA SARL (38 Avenue John F. Kennedy, L-1855 Luxemburg) gehostet. Server und Daten liegen in der Region
        Stockholm (Schweden); ausgeliefert wird über das Netzwerk Amazon CloudFront. Beim Aufruf verarbeitet der Server technisch notwendig deine IP-Adresse,
        um die Seite an dein Gerät zu senden. Wir führen keine Zugriffsprotokolle mit IP-Adressen.
      </p>
      <p>
        Zum Schutz vor Missbrauch (z. B. massenhafte Scheinbuchungen) zählen wir Anfragen pro Absender. Dafür speichern wir nicht die IP-Adresse selbst, sondern
        nur einen gekürzten, verschlüsselten Prüfwert (Hash), der höchstens 24 Stunden aufbewahrt wird. Rechtsgrundlage ist unser berechtigtes Interesse an
        einem sicheren Buchungssystem (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>4. Online-Terminbuchung</h2>
      <p>
        Wenn du einen Termin buchst, verarbeiten wir die gewählte Leistung und Uhrzeit, deinen Namen und deine Telefonnummer (Pflicht) sowie freiwillig deine
        E-Mail-Adresse und eine Notiz. Wir nutzen die Daten nur, um den Termin zu vergeben, dich bei Rückfragen zu erreichen und – wenn du eine E-Mail-Adresse
        angibst – dir eine Bestätigung mit Link zum Absagen zu senden. Rechtsgrundlage ist die Durchführung des Vertrags bzw. vorvertraglicher Maßnahmen
        (Art. 6 Abs. 1 lit. b DSGVO).
      </p>
      <p>
        Die Termine werden im Content-Management-System Sanity gespeichert (Sanity AS, Grensen 13, 0159 Oslo, Norwegen; Speicherort der Daten: [Region laut
        Sanity-Projekt eintragen]). Mit Sanity besteht ein Vertrag zur Auftragsverarbeitung. Benachrichtigungen per E-Mail versenden wir über Amazon Simple
        Email Service (AWS, Region Stockholm).
      </p>
      <p>
        <strong>Speicherdauer:</strong> Buchungen werden automatisch 30 Tage nach dem Termin gelöscht. Gesetzliche Aufbewahrungspflichten betreffen diese
        Daten nicht.
      </p>

      <h2>5. Kontakt per Telefon oder E-Mail</h2>
      <p>Wenn du uns anrufst oder schreibst, verarbeiten wir deine Angaben, um dein Anliegen zu bearbeiten (Art. 6 Abs. 1 lit. b bzw. f DSGVO).</p>

      <h2>6. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
        Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine kurze Nachricht an die oben
        genannte Adresse genügt.
      </p>
      <p>
        Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der Behörde des Bundeslandes, in dem der Salon seinen Sitz
        hat.
      </p>

      <h2>7. Änderungen</h2>
      <p>Wir passen diese Erklärung an, wenn sich die Website oder die Rechtslage ändert. Stand: [Monat Jahr].</p>
    </LegalPage>
  );
}
