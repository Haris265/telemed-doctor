"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button, Empty, ErrorText, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { DoctorClinic } from "@/lib/types";

export default function ClinicsPage() {
  const [items, setItems] = useState<DoctorClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api.clinics());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createClinic({
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
        area: area.trim() || undefined,
        phone: phone.trim() || undefined,
        is_primary: items.length === 0,
      });
      setShowForm(false);
      setName("");
      setAddress("");
      setCity("");
      setArea("");
      setPhone("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clinics"
        subtitle="Manage locations and weekly schedules."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add clinic"}
          </Button>
        }
      />
      {showForm ? (
        <form
          onSubmit={onCreate}
          className="mb-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:grid-cols-2"
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
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create clinic"}
            </Button>
          </div>
        </form>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/clinic/${c.id}`}
              className="block rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.clinic.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {c.clinic.address}
                    {c.clinic.city ? ` · ${c.clinic.city}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {c.schedule_count} schedule slots
                  </p>
                </div>
                {c.is_primary ? (
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800">
                    Primary
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>No clinics yet. Add your first clinic.</Empty>
      )}
    </div>
  );
}
