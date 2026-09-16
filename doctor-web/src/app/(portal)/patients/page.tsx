"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Empty, ErrorText, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { DoctorPatientSummary } from "@/lib/types";

export default function PatientsPage() {
  const [items, setItems] = useState<DoctorPatientSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api.patients());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }, [items, query]);

  return (
    <div>
      <PageHeader title="Patients" subtitle="Your patient directory." />
      <div className="mb-4 max-w-md">
        <Input
          placeholder="Search name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : filtered.length ? (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Link
              key={p.uuid}
              href={`/patient/${p.uuid}`}
              className="block rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm hover:border-brand-300"
            >
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-[var(--muted)]">{p.phone}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Upcoming {p.upcoming_count} · Visits {p.total_visits}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>No patients found.</Empty>
      )}
    </div>
  );
}
