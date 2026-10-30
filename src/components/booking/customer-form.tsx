"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

export interface CustomerData {
  name: string;
  phone: string;
  note: string;
  website: string;
}

const EMPTY: CustomerData = { name: "", phone: "", note: "", website: "" };

// Name and phone required, note optional (docs/BRIEF.md). The honeypot field "website" is hidden from
// people and assistive tech; bots fill it. onFirstInput starts the invisible bot check (form-guard.ts).
export function CustomerForm({
  busy,
  error,
  onFirstInput,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onFirstInput: () => void;
  onSubmit: (data: CustomerData) => void;
}) {
  const [data, setData] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const set = (key: keyof CustomerData) => (e: { target: { value: string } }) => setData((d) => ({ ...d, [key]: e.target.value }));

  const nameError = touched && data.name.trim().length < 2 ? "Bitte gib deinen Namen an." : undefined;
  const phoneError = touched && !/^[+(\d][\d\s()/.-]{5,}$/.test(data.phone.trim()) ? "Bitte gib eine Telefonnummer an, unter der wir dich erreichen." : undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (data.name.trim().length < 2 || !/^[+(\d][\d\s()/.-]{5,}$/.test(data.phone.trim())) return;
    onSubmit(data);
  }

  return (
    <form onSubmit={submit} onFocus={onFirstInput} noValidate className="flex flex-col gap-5">
      <Input label="Name" name="name" autoComplete="name" value={data.name} onChange={set("name")} error={nameError} maxLength={120} />
      <Input
        label="Telefon"
        name="tel"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={data.phone}
        onChange={set("phone")}
        error={phoneError}
        hint="Nur für Rückfragen zu deinem Termin."
        maxLength={40}
      />
      <Textarea label="Notiz" name="note" optional value={data.note} onChange={set("note")} placeholder="z. B. Wünsche oder Hinweise" maxLength={1000} />
      {/* Honeypot: off-screen, not focusable, not announced */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={data.website} onChange={set("website")} />
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <p className="text-small text-muted">
        Mit der Buchung werden deine Angaben zur Terminvergabe gespeichert.
      </p>
      <Button type="submit" width="full" disabled={busy} className="min-h-14 text-lead">
        {busy ? "Wird gebucht …" : "Verbindlich buchen"}
      </Button>
    </form>
  );
}
