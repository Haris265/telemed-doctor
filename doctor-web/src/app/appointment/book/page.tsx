"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, ErrorText, FormActions, FormPage, Input, PageHeader, TextArea } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openSlotsForDate } from "@/lib/slots";
import type {
  AvailableDateOption,
  DoctorClinic,
  PatientLookup,
} from "@/lib/types";

export default function BookPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <BookInner />
    </Suspense>
  );
}

function BookInner() {
  const { doctor } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clinics, setClinics] = useState<DoctorClinic[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [patient, setPatient] = useState<PatientLookup | null>(null);
  const [clinicId, setClinicId] = useState<number | "">("");
  const [dates, setDates] = useState<AvailableDateOption[]>([]);
  const [tokenDate, setTokenDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prefillUuid = searchParams.get("patient");
    void (async () => {
      try {
        const list = await api.clinics();
        setClinics(list);
        const primary = list.find((c) => c.is_primary) || list[0];
        if (primary) setClinicId(primary.clinic.id);
        if (prefillUuid) {
          const detail = await api.patient(prefillUuid);
          setPatient({ uuid: detail.uuid, name: detail.name, phone: detail.phone });
          setPhone(detail.phone);
          setName(detail.name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clinics");
      }
    })();
  }, [searchParams]);

  const selectedClinicLink = useMemo(
    () => clinics.find((c) => c.clinic.id === clinicId),
    [clinics, clinicId],
  );

  const loadDates = useCallback(async () => {
    if (!selectedClinicLink) return;
    setError("");
    try {
      const res = await api.clinicAvailableDates(selectedClinicLink.id, {
        clinicId: selectedClinicLink.clinic.id,
        clinicName: selectedClinicLink.clinic.name,
      });
      setDates(res.dates || []);
      setTokenDate("");
      setSlotTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dates");
    }
  }, [selectedClinicLink]);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  const selectedDate = dates.find((d) => d.date === tokenDate);
  const slots = selectedDate
    ? openSlotsForDate(selectedDate, doctor?.session_time || 15, tokenDate)
    : [];

  async function onLookup() {
    setError("");
    try {
      const found = await api.lookupPatient(phone.trim());
      setPatient(found);
      if (found) setName(found.name);
      else setError("Patient not found — enter a name to create on book.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clinicId || !tokenDate || !slotTime) {
      setError("Select clinic, date, and time slot.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const appt = await api.bookAppointment({
        patient_uuid: patient?.uuid,
        phone: patient ? undefined : phone.trim(),
        name: patient ? undefined : name.trim(),
        clinic_id: Number(clinicId),
        token_date: tokenDate,
        slot_time: slotTime.length === 5 ? `${slotTime}:00` : slotTime,
        notes: notes.trim() || undefined,
      });
      router.replace(`/appointment/${appt.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormPage maxWidth="2xl">
      <PageHeader title="Book appointment" subtitle="Walk-in or phone booking." />
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Patient phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPatient(null);
              }}
              required
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void onLookup()}>
            Lookup
          </Button>
        </div>
        <Input
          label="Patient name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required={!patient}
          disabled={!!patient}
        />
        {patient ? (
          <p className="text-sm text-brand-700">Existing patient: {patient.name}</p>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Clinic</span>
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5"
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value ? Number(e.target.value) : "")}
            required
          >
            <option value="">Select clinic</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.clinic.id}>
                {c.clinic.name}
                {c.is_primary ? " (primary)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Date</span>
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5"
            value={tokenDate}
            onChange={(e) => {
              setTokenDate(e.target.value);
              setSlotTime("");
            }}
            required
          >
            <option value="">Select date</option>
            {dates.map((d) => (
              <option key={d.date} value={d.date}>
                {d.label || d.date}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Time slot</span>
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5"
            value={slotTime}
            onChange={(e) => setSlotTime(e.target.value)}
            required
          >
            <option value="">Select slot</option>
            {slots.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {error ? <ErrorText>{error}</ErrorText> : null}
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Booking…" : "Confirm booking"}
          </Button>
        </FormActions>
      </form>
    </FormPage>
  );
}
