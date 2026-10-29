// Response shapes of the booking API (infra/lambda/api/index.ts, docs/TECH.md §4)
export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number | null;
  priceFrom: boolean;
  description: string | null;
}

export interface SalonConfig {
  salon: { name: string; street: string; zip: string; city: string; phone: string };
  bookingEnabled: boolean;
  notice: string | null;
  horizonDays: number;
  services: Service[];
  // Confirmation mails to customers are on (needs SES production access)
  customerMail: boolean;
  timeZone: string;
}

export interface SlotDay {
  date: string;
  slots: string[];
}

export interface SlotsResponse {
  service: string;
  duration: number;
  days: SlotDay[];
}

export interface BookingResult {
  ok: true;
  booking?: { id: string; service: string; duration: number; start: string; end: string; name: string };
  confirmationMail?: boolean;
}

export interface CancelResult {
  ok?: boolean;
  cancelled?: boolean;
  error?: string;
  booking?: { service: string; start: string; status: string; phone: string; salon: string };
}
