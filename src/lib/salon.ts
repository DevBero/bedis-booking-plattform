// Static salon details for the legal pages and the structured data (JSON-LD). The booking page itself loads name,
// address and phone live from Sanity (/api/config); these values must match. TODO(BD-601): fill in.
export const SALON = {
  name: "Salon Bedi",
  owner: "[Vor- und Nachname Inhaber/in]",
  legalForm: "Einzelunternehmen",
  street: "[Straße Hausnummer]",
  zip: "[PLZ]",
  city: "[Ort]",
  country: "DE",
  phone: "[Telefonnummer]",
  email: "[E-Mail-Adresse]",
  // USt-IdNr. if there is one, otherwise empty
  vatId: "",
  // Supervisory chamber for the craft (Handwerkskammer); hairdressers are a "zulassungspflichtiges Handwerk"
  chamber: "[Handwerkskammer …]",
  // Link to the Google Business Profile, empty until it exists (BD-702)
  googleProfile: "",
  // Opening hours for search engines (schema.org). The bookable times come from Sanity.
  openingHours: [
    { days: ["Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
    { days: ["Saturday"], opens: "09:00", closes: "14:00" },
  ],
} as const;
