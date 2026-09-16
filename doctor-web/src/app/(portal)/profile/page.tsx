"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button, ErrorText, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DoctorWhatsAppStatus } from "@/lib/types";

export default function ProfilePage() {
  const { doctor, signOut, refreshMe } = useAuth();
  const [wa, setWa] = useState<DoctorWhatsAppStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      await refreshMe();
      setWa(await api.whatsappStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [refreshMe]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDisconnect() {
    if (!confirm("Disconnect WhatsApp? Patients will not reach this number via PatientCare.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      setWa(await api.whatsappDisconnect());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" subtitle="Account and WhatsApp connection." />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="text-lg font-bold">Dr. {doctor?.full_name}</p>
        <p className="text-sm text-[var(--muted)]">{doctor?.email}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Session {doctor?.session_time ?? "—"} min
          {doctor?.specialities?.length
            ? ` · ${doctor.specialities.map((s) => s.name).join(", ")}`
            : ""}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <h2 className="font-bold">WhatsApp</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {wa?.connected
            ? "Patients can book on your linked WhatsApp Business number."
            : "Connect your WhatsApp Business number for patient booking."}
        </p>
        <p className="mt-3 text-sm">
          Status:{" "}
          <span className="font-semibold">
            {wa?.connected ? `Connected · ${wa.display_phone || wa.phone_number_id}` : "Not connected"}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/whatsapp/connect"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {wa?.connected ? "Manage connection" : "Connect WhatsApp"}
          </Link>
          {wa?.connected ? (
            <Button variant="danger" disabled={busy} onClick={() => void onDisconnect()}>
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
