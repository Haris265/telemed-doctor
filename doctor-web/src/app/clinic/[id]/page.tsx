"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button, ErrorText, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { AvailabilitySlot, DoctorClinic, ScheduleSlotInput } from "@/lib/types";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function ClinicSchedulePage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const [clinic, setClinic] = useState<DoctorClinic | null>(null);
  const [slots, setSlots] = useState<ScheduleSlotInput[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const c = await api.clinic(id);
      setClinic(c);
      setName(c.clinic.name);
      setAddress(c.clinic.address);
      setCity(c.clinic.city || "");
      setArea(c.clinic.area || "");
      setPhone(c.clinic.phone || "");
      const avail = await api.clinicAvailability(id);
      setSlots(
        avail.map((s: AvailabilitySlot) => ({
          weekday: s.weekday,
          start_time: s.start_time.slice(0, 5),
          end_time: s.end_time.slice(0, 5),
          is_active: s.is_active,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function addSlot() {
    setSlots((prev) => [
      ...prev,
      { weekday: 0, start_time: "09:00", end_time: "13:00", is_active: true },
    ]);
  }

  async function onSaveClinic(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.updateClinic(id, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        area: area.trim(),
        phone: phone.trim(),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveSchedule() {
    setBusy(true);
    setError("");
    try {
      await api.replaceClinicAvailability(
        id,
        slots.map((s) => ({
          ...s,
          start_time: s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
          end_time: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
        })),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSetPrimary() {
    setBusy(true);
    try {
      await api.updateClinic(id, { is_primary: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this clinic?")) return;
    setBusy(true);
    try {
      await api.deleteClinic(id);
      router.replace("/clinics");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  if (!clinic && !error) {
    return <p className="text-sm text-[var(--muted)]">Loading clinic…</p>;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Clinic schedule"
        subtitle={clinic?.clinic.name}
        action={
          <Button variant="secondary" onClick={() => router.push("/clinics")}>
            Back
          </Button>
        }
      />
      {error ? <ErrorText>{error}</ErrorText> : null}

      <form
        onSubmit={onSaveClinic}
        className="mb-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-5 sm:grid-cols-2"
      >
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          className="sm:col-span-2"
        />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="Area" value={area} onChange={(e) => setArea(e.target.value)} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            Save clinic
          </Button>
          {!clinic?.is_primary ? (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void onSetPrimary()}>
              Set primary
            </Button>
          ) : (
            <span className="self-center text-sm font-semibold text-brand-700">Primary clinic</span>
          )}
          <Button type="button" variant="danger" disabled={busy} onClick={() => void onDelete()}>
            Delete
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold">Weekly hours</h2>
          <Button variant="secondary" onClick={addSlot}>
            Add slot
          </Button>
        </div>
        <div className="space-y-3">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-4"
            >
              <select
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
                value={slot.weekday}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { ...slot, weekday: Number(e.target.value) };
                  setSlots(next);
                }}
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
                value={slot.start_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { ...slot, start_time: e.target.value };
                  setSlots(next);
                }}
              />
              <input
                type="time"
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
                value={slot.end_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { ...slot, end_time: e.target.value };
                  setSlots(next);
                }}
              />
              <Button
                variant="secondary"
                onClick={() => setSlots(slots.filter((_, i) => i !== idx))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button disabled={busy} onClick={() => void onSaveSchedule()}>
            Save schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
