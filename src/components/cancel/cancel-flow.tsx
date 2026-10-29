"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { errorText, postApi } from "@/lib/api";
import { longDay, time } from "@/lib/format";
import type { CancelResult } from "@/lib/types";

type State =
  | { step: "loading" }
  | { step: "confirm" | "cancelled" | "too_late" | "not_active"; booking: NonNullable<CancelResult["booking"]> }
  | { step: "not_found" }
  | { step: "error"; error: string };

const noop = () => () => {};
// Token from the link; null while prerendering (no URL at build time)
const readToken = () => new URLSearchParams(window.location.search).get("t") ?? "";

// /storno/?t=<token> from the confirmation mail: first shows the appointment, cancels only after a click, so link
// previews in mail apps never cancel anything
export function CancelFlow() {
  const token = useSyncExternalStore(noop, readToken, () => null);
  const [loaded, setState] = useState<State>({ step: "loading" });
  const [busy, setBusy] = useState(false);
  const state: State = token === "" ? { step: "not_found" } : loaded;

  useEffect(() => {
    if (!token) return;
    postApi<CancelResult>("/api/cancel", { token }).then((r) => {
      if (r.ok && r.data.booking) setState({ step: "confirm", booking: r.data.booking });
      else if (!r.ok && r.data?.booking && (r.error === "too_late" || r.error === "not_active")) setState({ step: r.error, booking: r.data.booking });
      else if (!r.ok && r.status === 404) setState({ step: "not_found" });
      else setState({ step: "error", error: r.ok ? "server_error" : r.error });
    });
  }, [token]);

  async function cancel() {
    setBusy(true);
    const r = await postApi<CancelResult>("/api/cancel", { token, confirm: true });
    setBusy(false);
    if (r.ok && r.data.cancelled && r.data.booking) setState({ step: "cancelled", booking: r.data.booking });
    else if (!r.ok && r.data?.booking && (r.error === "too_late" || r.error === "not_active")) setState({ step: r.error, booking: r.data.booking });
    else setState({ step: "error", error: r.ok ? "server_error" : r.error });
  }

  if (state.step === "loading") return <Spinner label="Termin wird geladen …" />;
  if (state.step === "not_found") return <Notice tone="error">Dieser Link ist ungültig oder abgelaufen. Bitte ruf uns an, wenn du einen Termin absagen möchtest.</Notice>;
  if (state.step === "error") return <Notice tone="error">{errorText(state.error)}</Notice>;

  const b = state.booking;
  const when = `${longDay(b.start)}, ${time(b.start)} Uhr`;
  const tel = b.phone ? `tel:${b.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-lg bg-card p-5 shadow-card">
        <dt className="text-muted">Leistung</dt>
        <dd className="font-semibold">{b.service}</dd>
        <dt className="text-muted">Wann</dt>
        <dd className="font-semibold">{when}</dd>
      </dl>
      {state.step === "confirm" && (
        <>
          <p>Möchtest du diesen Termin wirklich absagen?</p>
          <Button width="full" onClick={cancel} disabled={busy}>
            {busy ? "Wird abgesagt …" : "Ja, Termin absagen"}
          </Button>
          <Link href="/" className="self-start text-small font-semibold text-accent underline-offset-4 hover:underline">
            Nein, Termin behalten
          </Link>
        </>
      )}
      {state.step === "cancelled" && (
        <>
          <Notice tone="success">Dein Termin ist abgesagt. Danke für die Nachricht!</Notice>
          <Link href="/" className="self-start font-semibold text-accent underline-offset-4 hover:underline">
            Neuen Termin buchen
          </Link>
        </>
      )}
      {state.step === "too_late" && (
        <Notice tone="error">
          Online absagen geht so kurz vorher nicht mehr.{" "}
          {tel && (
            <>
              Bitte ruf uns an:{" "}
              <a href={tel} className="font-semibold underline">
                {b.phone}
              </a>
            </>
          )}
        </Notice>
      )}
      {state.step === "not_active" && <Notice>Dieser Termin ist bereits abgesagt oder vorbei.</Notice>}
    </div>
  );
}
