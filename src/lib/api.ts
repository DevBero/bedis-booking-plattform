// Calls to the booking API under /api/ (infra/lambda/api). CloudFront signs requests to the Lambda function URL
// (origin access control); for a body it needs the SHA-256 of the payload in x-amz-content-sha256, otherwise
// the signature does not match. With NEXT_PUBLIC_API_MOCK=true (pnpm dev:mock) a local fake answers instead.
import { API_MOCK } from "@/lib/site";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; data?: T };

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  if (API_MOCK) {
    const { mockFetch } = await import("@/lib/mock-api");
    return mockFetch<T>(path, init);
  }
  try {
    const res = await fetch(path, init);
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json as T } : { ok: false, status: res.status, error: (json as { error?: string }).error ?? "server_error", data: json as T };
  } catch {
    return { ok: false, status: 0, error: "network_error" };
  }
}

export function getApi<T>(path: string) {
  return request<T>(path, { headers: { accept: "application/json" } });
}

export async function postApi<T>(path: string, body: unknown) {
  const text = JSON.stringify(body);
  return request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-amz-content-sha256": await sha256Hex(text) },
    body: text,
  });
}

// API error codes -> text for people
export function errorText(error: string) {
  switch (error) {
    case "slot_taken":
      return "Dieser Termin wurde gerade vergeben. Bitte wähle eine andere Uhrzeit.";
    case "phone_invalid":
    case "phone_required":
      return "Bitte prüfe deine Telefonnummer.";
    case "name_required":
      return "Bitte gib deinen Namen an.";
    case "rate_limited":
      return "Zu viele Anfragen. Bitte versuch es später noch einmal oder ruf uns an.";
    case "booking_disabled":
      return "Online-Buchung ist gerade nicht möglich. Bitte ruf uns an.";
    case "network_error":
      return "Keine Verbindung. Bitte prüfe dein Internet und versuch es noch einmal.";
    default:
      return "Da ist etwas schiefgelaufen. Bitte versuch es noch einmal oder ruf uns an.";
  }
}
