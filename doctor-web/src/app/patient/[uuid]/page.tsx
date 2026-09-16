"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AppointmentCard, Empty, ErrorText, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { DoctorPatientDetail } from "@/lib/types";

export default function PatientDetailPage() {
  const params = useParams();
  const uuid = String(params.uuid);
  const [patient, setPatient] = useState<DoctorPatientDetail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setPatient(await api.patient(uuid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!patient && !error) {
    return <p className="text-sm text-[var(--muted)]">Loading patient…</p>;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={patient?.name || "Patient"}
        subtitle={patient?.phone}
        action={
          <Link
            href={`/appointment/book?patient=${uuid}`}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Book appointment
          </Link>
        }
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      {patient ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">Total visits</p>
              <p className="text-xl font-bold">{patient.total_visits}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">Appointments</p>
              <p className="text-xl font-bold">{patient.total_appointments}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">Rejected</p>
              <p className="text-xl font-bold">{patient.rejected_count}</p>
            </div>
          </div>
          <h2 className="mb-3 mt-8 font-bold">Visit history</h2>
          {patient.visit_history?.length ? (
            <div className="space-y-3">
              {patient.visit_history.map((a) => (
                <AppointmentCard key={a.id} appointment={a} detailed />
              ))}
            </div>
          ) : (
            <Empty>No visit history.</Empty>
          )}
        </>
      ) : null}
    </div>
  );
}
