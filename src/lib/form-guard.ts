"use client";

import { useCallback, useRef } from "react";
import { getApi } from "@/lib/api";

// Invisible bot check of the booking form (API: infra/lambda/api/guard.ts). As soon as someone
// starts filling a form, the browser fetches a challenge from /api/challenge and searches a nonce whose SHA-256
// starts with the required number of zero bits. That takes well under a second and runs while they type.
type Solution = { challenge: string; nonce: string; issuedAt: number };

// The API drops submissions within 3 seconds of the challenge; waiting a little longer never loses a real one
const MIN_FILL_MS = 3500;

function zeroBits(hash: Uint8Array) {
  let bits = 0;
  for (const byte of hash) {
    if (byte) return bits + Math.clz32(byte) - 24;
    bits += 8;
  }
  return bits;
}

async function solve(): Promise<Solution | null> {
  const res = await getApi<{ id: string; difficulty: number }>("/api/challenge");
  if (!res.ok) return null;
  const issuedAt = Date.now();
  const { id, difficulty } = res.data;
  const encoder = new TextEncoder();
  for (let n = 0; ; n++) {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`${id}:${n}`)));
    if (zeroBits(hash) >= difficulty) return { challenge: id, nonce: String(n), issuedAt };
  }
}

// start() on the first focus (or when the form appears), solution() right before sending. Each solution is used
// once; the next submission fetches a new one.
export function useFormGuard() {
  const pending = useRef<Promise<Solution | null> | null>(null);

  const start = useCallback(() => {
    pending.current ??= solve();
  }, []);

  const solution = useCallback(async () => {
    pending.current ??= solve();
    const result = await pending.current;
    pending.current = null;
    if (!result) return null;
    const wait = result.issuedAt + MIN_FILL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return { challenge: result.challenge, nonce: result.nonce };
  }, []);

  return { start, solution };
}
