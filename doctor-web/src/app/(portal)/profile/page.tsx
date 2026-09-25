"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, CreditCard, KeyRound, Pencil } from "lucide-react";

import {
  Button,
  doctorInitials,
  ErrorText,
  FormPage,
  FormSection,
  PageHeader,
  PageLoader,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DoctorWhatsAppStatus } from "@/lib/types";

export default function ProfilePage() {
  const { doctor, signOut, refreshMe } = useAuth();
  const [wa, setWa] = useState<DoctorWhatsAppStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      await refreshMe();
      setWa(await api.whatsappStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [refreshMe]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDisconnect() {
    if (
      !confirm(
        "Disconnect WhatsApp? Patients will not reach this number via PatientCare.",
      )
    ) {
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

  if (loading && !doctor) {
    return <PageLoader label="Loading profile…" />;
  }

  const banks = doctor?.bank_accounts || [];
  const fee =
    doctor?.consultation_fee != null && doctor.consultation_fee !== ""
      ? `Rs ${doctor.consultation_fee}`
      : "Not set";

  return (
    <FormPage maxWidth="2xl">
      <PageHeader title="Profile" subtitle="Account, fees, banks, and WhatsApp." />
      {error ? (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}

      <FormSection>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
            {doctorInitials(doctor?.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">Dr. {doctor?.full_name}</p>
            <p className="text-sm text-[var(--muted)]">{doctor?.email}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Session {doctor?.session_time ?? "—"} min · Fee {fee}
              {doctor?.specialities?.length
                ? ` · ${doctor.specialities.map((s) => s.name).join(", ")}`
                : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/profile/edit">
            <Button variant="secondary">
              <Pencil size={14} className="mr-1.5" />
              Edit profile
            </Button>
          </Link>
          <Link href="/profile/change-password">
            <Button variant="secondary">
              <KeyRound size={14} className="mr-1.5" />
              Password
            </Button>
          </Link>
        </div>
      </FormSection>

      <Link
        href="/profile/bank-accounts"
        className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:border-brand-300"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-brand-50 p-2 text-brand-700">
            <CreditCard size={18} />
          </span>
          <div>
            <p className="font-semibold">Bank accounts</p>
            <p className="text-sm text-[var(--muted)]">
              {banks.length
                ? `${banks.length} account${banks.length === 1 ? "" : "s"} · ${
                    banks.find((b) => b.is_primary)?.bank_name || banks[0].bank_name
                  }`
                : "Add accounts for patient bank transfers"}
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-[var(--muted)]" />
      </Link>

      <FormSection
        className="mt-6"
        title="WhatsApp"
        description={
          wa?.connected
            ? "Patients can book on your linked WhatsApp Business number."
            : "Connect your WhatsApp Business number for patient booking."
        }
      >
        {loading && !wa ? (
          <PageLoader label="Checking WhatsApp…" className="py-8" />
        ) : (
          <>
            <p className="text-sm">
              Status:{" "}
              <span className="font-semibold">
                {wa?.connected
                  ? `Connected · ${wa.display_phone || wa.phone_number_id}`
                  : "Not connected"}
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
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => void onDisconnect()}
                >
                  Disconnect
                </Button>
              ) : null}
            </div>
          </>
        )}
      </FormSection>

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
    </FormPage>
  );
}
