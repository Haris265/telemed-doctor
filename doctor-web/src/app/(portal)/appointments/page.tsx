"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import {
  AppointmentCard,
  Empty,
  ErrorText,
  Input,
  PageHeader,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/format";
import type { Appointment } from "@/lib/types";

type Filter = "all" | "today" | "future" | "completed" | "rejected";
const FILTERS: Filter[] = ["all", "today", "future", "completed", "rejected"];

async function fetchFilterData(filter: Filter, today: string) {
  if (filter === "today") {
    return api.appointments({ today: true, upcoming: false });
  }
  if (filter === "future") {
    const data = await api.appointments({ status: "upcoming", upcoming: false });
    return data.filter((a) => a.token_date > today);
  }
  if (filter === "completed") {
    return api.appointments({ status: "completed", upcoming: false });
  }
  if (filter === "rejected") {
    return api.appointments({ status: "rejected", upcoming: false });
  }
  return api.appointments({ status: "upcoming", upcoming: false });
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <AppointmentsInner />
    </Suspense>
  );
}

function AppointmentsInner() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get("filter") as Filter) || "today";
  const [filter, setFilter] = useState<Filter>(
    FILTERS.includes(initial) ? initial : "today",
  );
  const [items, setItems] = useState<Appointment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchFilterData(filter, today));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.patient_name.toLowerCase().includes(q) ||
        a.patient_phone.includes(q) ||
        a.token_code.toLowerCase().includes(q),
    );
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const list = map.get(a.token_date) || [];
      list.push(a);
      map.set(a.token_date, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Filter and search your OPD queue."
        action={
          <Link
            href="/appointment/book"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Book
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${
              filter === f
                ? "bg-brand-600 text-white"
                : "border border-[var(--border)] bg-white text-[var(--muted)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="mb-4 max-w-md">
        <Input
          placeholder="Search name, phone, token…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : groups.length ? (
        <div className="space-y-6">
          {groups.map(([date, list]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm font-bold text-[var(--muted)]">
                {formatDate(list[0].scheduled_at)}
              </h2>
              <div className="space-y-3">
                {list.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} detailed />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Empty>No appointments for this filter.</Empty>
      )}
    </div>
  );
}
