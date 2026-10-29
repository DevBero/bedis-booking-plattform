import { SALON } from "@/lib/salon";
import { APP_URL } from "@/lib/site";

// schema.org HairSalon for local search (name, address, opening hours, booking link)
export function hairSalonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: SALON.name,
    url: `${APP_URL}/`,
    telephone: SALON.phone,
    address: { "@type": "PostalAddress", streetAddress: SALON.street, postalCode: SALON.zip, addressLocality: SALON.city, addressCountry: SALON.country },
    openingHoursSpecification: SALON.openingHours.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    potentialAction: { "@type": "ReserveAction", target: `${APP_URL}/`, name: "Termin buchen" },
    ...(SALON.googleProfile ? { sameAs: [SALON.googleProfile] } : {}),
  };
}
