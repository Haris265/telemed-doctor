"use client";

import { useCallback, useEffect, useState } from "react";

import { AppointmentCard, Empty, ErrorText, PageHeader, PageLoader, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DashboardStats } from "@/lib/types";

export default function HomePage() {
  const { doctor, refreshMe } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [data] = await Promise.all([api.dashboard(), refreshMe()]);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [refreshMe]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Today's clinic"
        subtitle={`Dr. ${doctor?.full_name || "Doctor"} — refresh to update your queue.`}
        action={
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
        }
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      {loading && !stats ? (
        <PageLoader label="Loading dashboard…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Today upcoming"
              value={stats?.today_upcoming ?? "—"}
              href="/appointments?filter=today"
            />
            <StatCard
              label="Today completed"
              value={stats?.today_completed ?? "—"}
              href="/appointments?filter=completed"
            />
            <StatCard
              label="Today rejected"
              value={stats?.today_rejected ?? "—"}
              href="/appointments?filter=rejected"
            />
            <StatCard
              label="Future bookings"
              value={stats?.future_bookings ?? "—"}
              href="/appointments?filter=future"
            />
          </div>
          <div className="mt-3">
            <StatCard
              label="Total patients seen"
              value={stats?.total_patients_seen ?? "—"}
              href="/patients"
            />
          </div>
          <h2 className="mb-3 mt-8 text-lg font-bold">Today&apos;s queue</h2>
          {stats?.upcoming_today?.length ? (
            <div className="space-y-3">
              {stats.upcoming_today.map((a) => (
                <AppointmentCard key={a.id} appointment={a} detailed />
              ))}
            </div>
          ) : (
            <Empty>No upcoming appointments for today.</Empty>
          )}
        </>
      )}
    </div>
  );
}
