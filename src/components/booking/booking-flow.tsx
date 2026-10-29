"use client";

import { MapPin, Phone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ChoiceSummary } from "@/components/booking/choice-summary";
import { Confirmation } from "@/components/booking/confirmation";
import { CustomerForm, type CustomerData } from "@/components/booking/customer-form";
import { DateStrip } from "@/components/booking/date-strip";
import { ServiceList } from "@/components/booking/service-list";
import { Step } from "@/components/booking/step";
import { TimeGrid } from "@/components/booking/time-grid";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { errorText, getApi, postApi } from "@/lib/api";
import { berlinDate, duration, longDay, price, time } from "@/lib/format";
import { useFormGuard } from "@/lib/form-guard";
import { SALON } from "@/lib/salon";
import type { BookingResult, SalonConfig, SlotsResponse } from "@/lib/types";
import { useStepState, visitSource } from "@/lib/url-state";

type Load<T> = { state: "loading" } | { state: "error"; error: string } | { state: "ready"; data: T };
type Done = { booking: NonNullable<BookingResult["booking"]>; mailSent: boolean };

// The whole booking: service -> day -> time -> details -> confirmation. Choices live in the URL (url-state.ts),
// everything that changes (services, free times) comes live from the API.
export function BookingFlow() {
  const [step, go] = useStepState();
  const [config, setConfig] = useState<Load<SalonConfig>>({ state: "loading" });
  const [slotsResult, setSlotsResult] = useState<{ key: string; load: Load<SlotsResponse> } | null>(null);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const guard = useFormGuard();

  const fetchConfig = useCallback(() => {
    getApi<SalonConfig>(`/api/config?src=${encodeURIComponent(visitSource())}`).then((r) =>
      setConfig(r.ok ? { state: "ready", data: r.data } : { state: "error", error: r.error }),
    );
  }, []);
  useEffect(() => fetchConfig(), [fetchConfig]);
  const retryConfig = () => {
    setConfig({ state: "loading" });
    fetchConfig();
  };

  const services = config.state === "ready" ? config.data.services : [];
  const service = services.find((s) => s.id === step.leistung);

  // Free times for the chosen service; reloaded after "slot taken". The result is stored with the request it
  // answers, so a newer request shows "loading" until its own answer arrives.
  const slotsKey = service ? `${service.id}#${slotsVersion}` : null;
  useEffect(() => {
    if (!slotsKey) return;
    let current = true;
    getApi<SlotsResponse>(`/api/slots?service=${encodeURIComponent(slotsKey.split("#")[0])}`).then((r) => {
      if (!current) return;
      setSlotsResult({ key: slotsKey, load: r.ok ? { state: "ready", data: r.data } : { state: "error", error: r.error } });
      // A time in the URL that is no longer free (e.g. reloaded later) -> back to choosing a time
      const params = new URLSearchParams(window.location.search);
      const zeit = params.get("zeit");
      if (r.ok && zeit && !r.data.days.some((d) => d.slots.includes(zeit))) {
        setNotice("Diese Uhrzeit ist leider nicht mehr frei. Bitte wähle eine andere.");
        go({ leistung: params.get("leistung") ?? undefined, tag: params.get("tag") ?? undefined }, "replace");
      }
    });
    return () => {
      current = false;
    };
  }, [slotsKey, go]);
  const slots: Load<SlotsResponse> = slotsResult?.key === slotsKey ? slotsResult.load : { state: "loading" };

  // Unknown service in the URL (renamed, switched off) -> back to the list
  useEffect(() => {
    if (config.state === "ready" && step.leistung && !service) go({}, "replace");
  }, [config.state, step.leistung, service, go]);

  const days = slots.state === "ready" ? slots.data.days : [];
  const bookable = days.filter((d) => d.slots.length);
  const day = days.find((d) => d.date === step.tag && d.slots.length) ?? bookable[0];

  const salon = config.state === "ready" ? config.data.salon : { name: SALON.name, street: "", zip: "", city: "", phone: "" };
  const address = [salon.street, [salon.zip, salon.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const tel = salon.phone ? `tel:${salon.phone.replace(/[^\d+]/g, "")}` : null;

  async function book(data: CustomerData) {
    if (!service || !step.zeit) return;
    setBusy(true);
    setFormError(null);
    const solution = await guard.solution();
    const res = await postApi<BookingResult>("/api/book", {
      service: service.id,
      start: step.zeit,
      name: data.name,
      phone: data.phone,
      email: data.email,
      note: data.note,
      website: data.website,
      src: visitSource(),
      challenge: solution?.challenge,
      nonce: solution?.nonce,
    });
    setBusy(false);
    if (res.ok && res.data.booking) {
      setDone({ booking: res.data.booking, mailSent: Boolean(res.data.confirmationMail) });
      go({}, "replace");
      window.scrollTo({ top: 0 });
      requestAnimationFrame(() => document.getElementById("done")?.focus());
      return;
    }
    if (res.ok) {
      setFormError(errorText("server_error"));
      return;
    }
    if (res.error === "slot_taken") {
      setNotice(errorText("slot_taken"));
      setSlotsVersion((v) => v + 1);
      go({ leistung: step.leistung, tag: step.tag });
      return;
    }
    setFormError(errorText(res.error));
  }

  const emailHint =
    config.state === "ready" && config.data.customerMail ? "Dann bekommst du eine Bestätigung mit Link zum Absagen." : "Nur falls wir dich per E-Mail erreichen sollen.";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pt-8">
        <p className="meta text-muted">Online-Terminbuchung</p>
        <h1 className="text-display">{salon.name}</h1>
        {(address || tel) && (
          <div className="flex flex-col gap-1 text-small text-muted">
            {address && (
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden className="size-4 shrink-0" />
                {address}
              </span>
            )}
            {tel && (
              <a href={tel} className="inline-flex items-center gap-2 self-start py-1 font-semibold text-accent">
                <Phone aria-hidden className="size-4 shrink-0" />
                {salon.phone}
              </a>
            )}
          </div>
        )}
      </header>

      {config.state === "loading" && <Spinner label="Leistungen werden geladen …" />}
      {config.state === "error" && (
        <Notice tone="error">
          <p>{errorText(config.error)}</p>
          <Button variant="ghost" className="mt-1 min-h-0 px-0" onClick={retryConfig}>
            Erneut versuchen
          </Button>
        </Notice>
      )}

      {done && config.state === "ready" && (
        <Confirmation
          booking={done.booking}
          salon={salon}
          mailSent={done.mailSent}
          onRestart={() => {
            setDone(null);
            go({});
          }}
        />
      )}

      {!done && config.state === "ready" && (
        <>
          {config.data.notice && <Notice>{config.data.notice}</Notice>}

          {!config.data.bookingEnabled || services.length === 0 ? (
            <Notice>
              Online-Buchung ist gerade nicht möglich.{" "}
              {tel ? (
                <>
                  Ruf uns gern an:{" "}
                  <a href={tel} className="font-semibold underline">
                    {salon.phone}
                  </a>
                </>
              ) : null}
            </Notice>
          ) : (
            <>
              {!service ? (
                <Step number={1} title="Leistung wählen">
                  <ServiceList services={services} onSelect={(id) => go({ leistung: id })} />
                </Step>
              ) : (
                <ChoiceSummary label="Leistung" onChange={() => go({})} changeLabel="Leistung ändern">
                  {service.name}{" "}
                  <span className="font-normal text-muted">
                    · {duration(service.duration)}
                    {price(service.price, service.priceFrom) ? ` · ${price(service.price, service.priceFrom)}` : ""}
                  </span>
                </ChoiceSummary>
              )}

              {notice && (
                <Notice tone="error" className="-mb-2">
                  {notice}
                </Notice>
              )}

              {service && !step.zeit && (
                <Step number={2} title="Tag und Uhrzeit" focusOnMount>
                  {slots.state === "loading" && <Spinner label="Freie Zeiten werden geladen …" />}
                  {slots.state === "error" && (
                    <Notice tone="error">
                      <p>{errorText(slots.error)}</p>
                      <Button variant="ghost" className="mt-1 min-h-0 px-0" onClick={() => setSlotsVersion((v) => v + 1)}>
                        Erneut versuchen
                      </Button>
                    </Notice>
                  )}
                  {slots.state === "ready" &&
                    (bookable.length === 0 ? (
                      <Notice>
                        In den nächsten {config.data.horizonDays} Tagen ist leider nichts mehr frei.{tel ? " Ruf uns gern an, vielleicht finden wir trotzdem einen Termin." : ""}
                      </Notice>
                    ) : (
                      <div className="flex flex-col gap-6">
                        <DateStrip
                          days={days}
                          selected={day?.date}
                          onSelect={(date) => {
                            setNotice(null);
                            go({ leistung: service.id, tag: date }, "replace");
                          }}
                        />
                        {day && (
                          <div>
                            <p className="mb-4 font-semibold" aria-live="polite">
                              {longDay(day.date)}
                            </p>
                            <TimeGrid
                              slots={day.slots}
                              onSelect={(iso) => {
                                setNotice(null);
                                setFormError(null);
                                go({ leistung: service.id, tag: berlinDate(iso), zeit: iso });
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </Step>
              )}

              {service && step.zeit && (
                <>
                  <ChoiceSummary label="Termin" onChange={() => go({ leistung: service.id, tag: step.tag })} changeLabel="Uhrzeit ändern">
                    {longDay(step.zeit)}, {time(step.zeit)} Uhr
                  </ChoiceSummary>
                  <Step number={3} title="Deine Angaben" focusOnMount>
                    <CustomerForm busy={busy} error={formError} onFirstInput={guard.start} onSubmit={book} emailHint={emailHint} />
                  </Step>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
