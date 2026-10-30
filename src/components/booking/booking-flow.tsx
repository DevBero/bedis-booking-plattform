"use client";

import { useCallback, useEffect, useState } from "react";
import { ChoiceSummary } from "@/components/booking/choice-summary";
import { Confirmation } from "@/components/booking/confirmation";
import { CustomerForm, type CustomerData } from "@/components/booking/customer-form";
import { DateStrip } from "@/components/booking/date-strip";
import { ServiceList } from "@/components/booking/service-list";
import { Step } from "@/components/booking/step";
import { TimeGrid } from "@/components/booking/time-grid";
import { WizardProgress } from "@/components/booking/wizard-progress";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { errorText, getApi, postApi } from "@/lib/api";
import { berlinDate, duration, longDay, price, time } from "@/lib/format";
import { useFormGuard } from "@/lib/form-guard";
import { SALON } from "@/lib/salon";
import type { BookingResult, SalonConfig, Service, SlotsResponse } from "@/lib/types";
import { useStepState, visitSource } from "@/lib/url-state";

type Load<T> = { state: "loading" } | { state: "error"; error: string } | { state: "ready"; data: T };
type Done = { booking: NonNullable<BookingResult["booking"]> };

const STEPS = ["Leistung", "Termin", "Angaben"];

// The whole booking as a wizard, one page per step: service -> day + time -> details -> confirmation. Choices live in the URL (url-state.ts),
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

  // Current wizard page and the side it slides in from. Derived during render (React's "previous value" pattern),
  // so browser back/forward animate the same way as the buttons. moved: false on the first page view, so the
  // page does not grab focus on load.
  const page = !service ? 0 : !step.zeit ? 1 : 2;
  const [slide, setSlide] = useState({ page, direction: "forward" as "forward" | "back", moved: false });
  if (slide.page !== page) setSlide({ page, direction: page > slide.page ? "forward" : "back", moved: true });

  const days = slots.state === "ready" ? slots.data.days : [];
  const bookable = days.filter((d) => d.slots.length);
  const day = days.find((d) => d.date === step.tag && d.slots.length) ?? bookable[0];

  const salon = config.state === "ready" ? config.data.salon : { name: SALON.name };

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
      note: data.note,
      website: data.website,
      src: visitSource(),
      challenge: solution?.challenge,
      nonce: solution?.nonce,
    });
    setBusy(false);
    if (res.ok && res.data.booking) {
      setDone({ booking: res.data.booking });
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

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pt-8">
        <h1 className="flex flex-col gap-3">
          <span className="meta text-muted">Herzlich willkommen zur</span>
          <span className="text-display">Terminbuchung</span>
        </h1>
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
            <Notice>Online-Buchung ist gerade nicht möglich. Schau gern später noch mal vorbei.</Notice>
          ) : (
            <div className="flex flex-col gap-6">
              <WizardProgress steps={STEPS} current={page} />

              {page === 0 && (
                <Step key="leistung" number={1} title="Was dürfen wir machen?" direction={slide.direction} focusOnMount={slide.moved}>
                  <ServiceList services={services} onSelect={(id) => go({ leistung: id })} />
                </Step>
              )}

              {page === 1 && service && (
                <Step key="termin" number={2} title="Wann passt es dir?" direction={slide.direction} focusOnMount onBack={() => go({})}>
                  <div className="flex flex-col gap-6">
                    <ServiceSummary service={service} onChange={() => go({})} />
                    {notice && <Notice tone="error">{notice}</Notice>}
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
                          Gerade sind keine Termine frei. Schau gern in ein paar Tagen wieder vorbei.
                        </Notice>
                      ) : (
                        <>
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
                        </>
                      ))}
                  </div>
                </Step>
              )}

              {page === 2 && service && step.zeit && (
                <Step key="angaben" number={3} title="Fast geschafft" direction={slide.direction} focusOnMount onBack={() => go({ leistung: service.id, tag: step.tag })}>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <ServiceSummary service={service} onChange={() => go({})} />
                      <ChoiceSummary label="Termin" onChange={() => go({ leistung: service.id, tag: step.tag })} changeLabel="Uhrzeit ändern">
                        {longDay(step.zeit)}, {time(step.zeit)} Uhr
                      </ChoiceSummary>
                    </div>
                    <CustomerForm busy={busy} error={formError} onFirstInput={guard.start} onSubmit={book} />
                  </div>
                </Step>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ServiceSummary({ service, onChange }: { service: Service; onChange: () => void }) {
  return (
    <ChoiceSummary label="Leistung" onChange={onChange} changeLabel="Leistung ändern">
      {service.name}{" "}
      <span className="font-normal text-muted">
        · {duration(service.duration)}
        {price(service.price, service.priceFrom) ? ` · ${price(service.price, service.priceFrom)}` : ""}
      </span>
    </ChoiceSummary>
  );
}
