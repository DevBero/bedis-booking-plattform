// Phone numbers to E.164 with Germany as default country: "0171 123 45 67" -> "+491711234567".
// Returns null for anything that cannot be a phone number.
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!/^[+(\d][\d\s()/.-]*$/.test(trimmed)) return null;
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  else if (digits.startsWith("0")) digits = `+49${digits.slice(1)}`;
  else if (!digits.startsWith("+")) digits = `+49${digits}`;
  // E.164: country code + subscriber number, at most 15 digits; German numbers have at least 7 after +49
  return /^\+[1-9]\d{8,14}$/.test(digits) ? digits : null;
}
