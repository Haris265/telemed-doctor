"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button, ErrorText, FormPage, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type {
  AvailabilitySlot,
  DateScheduleSlotInput,
  DoctorClinic,
  ScheduleSlotInput,
} from "@/lib/types";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function withSeconds(t: string) {
  return t.length === 5 ? `${t}:00` : t;
}

export default function ClinicSchedulePage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const [clinic, setClinic] = useState<DoctorClinic | null>(null);
  const [allSlots, setAllSlots] = useState<AvailabilitySlot[]>([]);
  const [slots, setSlots] = useState<ScheduleSlotInput[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");

  const [overrideDate, setOverrideDate] = useState(todayKey());
  const [dayRanges, setDayRanges] = useState<DateScheduleSlotInput[]>([
    { start_time: "09:00", end_time: "13:00", is_active: true },
  ]);
  const [dayBusy, setDayBusy] = useState(false);
  const [dayMsg, setDayMsg] = useState("");

  const applyDayFromSlots = useCallback(
    (dateKey: string, avail: AvailabilitySlot[]) => {
      const dateSlots = avail.filter((s) => s.specific_date === dateKey);
      if (!dateSlots.length) {
        setDayRanges([
          { start_time: "09:00", end_time: "13:00", is_active: true },
        ]);
        return;
      }
      const active = dateSlots.filter((s) => s.is_active);
      if (!active.length) {
        setDayRanges([]);
        return;
      }
      setDayRanges(
        active.map((s) => ({
          start_time: s.start_time.slice(0, 5),
          end_time: s.end_time.slice(0, 5),
          is_active: true,
        })),
      );
    },
    [],
  );

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
      setAllSlots(avail);
      setSlots(
        avail
          .filter((s) => !s.specific_date)
          .map((s: AvailabilitySlot) => ({
            weekday: s.weekday,
            start_time: s.start_time.slice(0, 5),
            end_time: s.end_time.slice(0, 5),
            is_active: s.is_active,
          })),
      );
      applyDayFromSlots(overrideDate, avail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [id, overrideDate, applyDayFromSlots]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial + id only; date changes handled below
  }, [id]);

  useEffect(() => {
    applyDayFromSlots(overrideDate, allSlots);
  }, [overrideDate, allSlots, applyDayFromSlots]);

  const daySource = useMemo(() => {
    const dateSlots = allSlots.filter((s) => s.specific_date === overrideDate);
    if (!dateSlots.length) return "weekly" as const;
    if (dateSlots.every((s) => !s.is_active)) return "closed" as const;
    return "override" as const;
  }, [allSlots, overrideDate]);

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
          start_time: withSeconds(s.start_time),
          end_time: withSeconds(s.end_time),
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

  async function onSaveDayOverride() {
    setDayBusy(true);
    setDayMsg("");
    setError("");
    try {
      if (
        dayRanges.some(
          (r) => !r.start_time || !r.end_time || r.start_time >= r.end_time,
        )
      ) {
        setError("Each day range needs a valid start before end time.");
        return;
      }
      await api.replaceClinicDateAvailability(id, {
        date: overrideDate,
        closed: false,
        slots: dayRanges.map((r) => ({
          start_time: withSeconds(r.start_time),
          end_time: withSeconds(r.end_time),
          is_active: true,
        })),
      });
      setDayMsg(`Saved hours for ${overrideDate}.`);
      const avail = await api.clinicAvailability(id);
      setAllSlots(avail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Day save failed");
    } finally {
      setDayBusy(false);
    }
  }

  async function onMarkClosed() {
    setDayBusy(true);
    setDayMsg("");
    setError("");
    try {
      await api.replaceClinicDateAvailability(id, {
        date: overrideDate,
        closed: true,
        slots: [],
      });
      setDayMsg(`Marked closed for ${overrideDate}.`);
      setDayRanges([]);
      const avail = await api.clinicAvailability(id);
      setAllSlots(avail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark closed");
    } finally {
      setDayBusy(false);
    }
  }

  async function onClearOverride() {
    setDayBusy(true);
    setDayMsg("");
    setError("");
    try {
      // Clear by replacing with empty non-closed? Mobile sends closed:false and empty/weekly.
      // Looking at mobile: closed: false with empty slots clears override.
      await api.replaceClinicDateAvailability(id, {
        date: overrideDate,
        closed: false,
        slots: [],
      });
      setDayMsg("Date override cleared. Weekly hours apply again.");
      const avail = await api.clinicAvailability(id);
      setAllSlots(avail);
      applyDayFromSlots(overrideDate, avail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear override");
    } finally {
      setDayBusy(false);
    }
  }

  if (!clinic && !error) {
    return <p className="text-sm text-[var(--muted)]">Loading clinic…</p>;
  }

  const sourceLabel =
    daySource === "override"
      ? "Custom hours for this date"
      : daySource === "closed"
        ? "Marked closed (weekly hours ignored)"
        : "Using weekly schedule (no override)";

  return (
    <FormPage maxWidth="3xl">
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
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          className="sm:col-span-2"
        />
        <Input
          label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <Input
          label="Area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            Save clinic
          </Button>
          {!clinic?.is_primary ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void onSetPrimary()}
            >
              Set primary
            </Button>
          ) : (
            <span className="self-center text-sm font-semibold text-brand-700">
              Primary clinic
            </span>
          )}
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Delete
          </Button>
        </div>
      </form>

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-white p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Day override</h2>
          <Input
            label="Date"
            type="date"
            value={overrideDate}
            min={todayKey()}
            onChange={(e) => {
              setDayMsg("");
              setOverrideDate(e.target.value);
            }}
            className="w-auto"
          />
        </div>
        <p className="mb-4 text-sm text-[var(--muted)]">{sourceLabel}</p>
        {dayMsg ? (
          <p className="mb-3 text-sm text-emerald-700">{dayMsg}</p>
        ) : null}
        <div className="space-y-3">
          {dayRanges.map((range, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-3"
            >
              <input
                type="time"
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
                value={range.start_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...dayRanges];
                  next[idx] = { ...range, start_time: e.target.value };
                  setDayRanges(next);
                }}
              />
              <input
                type="time"
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
                value={range.end_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...dayRanges];
                  next[idx] = { ...range, end_time: e.target.value };
                  setDayRanges(next);
                }}
              />
              <Button
                variant="secondary"
                onClick={() =>
                  setDayRanges(dayRanges.filter((_, i) => i !== idx))
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              setDayRanges((prev) => [
                ...prev,
                { start_time: "14:00", end_time: "18:00", is_active: true },
              ])
            }
          >
            Add range
          </Button>
          <Button disabled={dayBusy} onClick={() => void onSaveDayOverride()}>
            {dayBusy ? "Saving…" : "Save day hours"}
          </Button>
          <Button
            variant="secondary"
            disabled={dayBusy}
            onClick={() => void onMarkClosed()}
          >
            Mark closed
          </Button>
          {daySource !== "weekly" ? (
            <Button
              variant="secondary"
              disabled={dayBusy}
              onClick={() => void onClearOverride()}
            >
              Clear override
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Weekly hours</h2>
            <p className="text-sm text-[var(--muted)]">
              Recurring Mon–Sun schedule when a date has no override.
            </p>
          </div>
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
        <div className="mt-4 flex justify-end">
          <Button disabled={busy} onClick={() => void onSaveSchedule()}>
            Save schedule
          </Button>
        </div>
      </div>
    </FormPage>
  );
}
