"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorText, FormActions, FormPage, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import {
  getWhatsAppRedirectUri,
  launchWhatsAppConnect,
} from "@/lib/whatsappConnect";
import type { DoctorWhatsAppStatus } from "@/lib/types";

export default function WhatsAppConnectPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DoctorWhatsAppStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");

  useEffect(() => {
    api
      .whatsappStatus()
      .then((s) => {
        setStatus(s);
        const d = s.manual_connect_defaults;
        if (!d) return;
        if (d.access_token) setAccessToken(d.access_token);
        if (d.phone_number_id) setPhoneNumberId(d.phone_number_id);
        if (d.waba_id) setWabaId(d.waba_id);
        if (d.display_phone) setDisplayPhone(d.display_phone);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load status"),
      );
  }, []);

  async function onMetaConnect() {
    setBusy(true);
    setError("");
    try {
      await launchWhatsAppConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
      setBusy(false);
    }
  }

  async function onManual(e: FormEvent) {
    e.preventDefault();
    if (!accessToken.trim() || !wabaId.trim() || !phoneNumberId.trim()) {
      setError("Access token, WABA ID, and phone number ID are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await api.whatsappConnectManual({
        access_token: accessToken.trim(),
        waba_id: wabaId.trim(),
        phone_number_id: phoneNumberId.trim(),
        display_phone: displayPhone.trim() || undefined,
      });
      setStatus(next);
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual connect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormPage maxWidth="2xl">
      <PageHeader
        title="Connect WhatsApp"
        subtitle="So patients can book and get visit updates on your number."
      />
      {error ? <ErrorText>{error}</ErrorText> : null}

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>Tap Continue with Meta.</li>
          <li>Sign in and choose your WhatsApp Business number.</li>
          <li>Allow messaging permissions.</li>
          <li>You will return here when connected.</li>
        </ol>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Web callback: {getWhatsAppRedirectUri()}
        </p>
        <FormActions>
          <Button variant="secondary" onClick={() => router.push("/profile")}>
            Not now
          </Button>
          <Button disabled={busy} onClick={() => void onMetaConnect()}>
            {busy ? "Opening Meta…" : "Continue with Meta"}
          </Button>
        </FormActions>
        {status?.connected ? (
          <p className="mt-4 text-sm font-semibold text-brand-700">
            Currently connected: {status.display_phone || status.phone_number_id}
          </p>
        ) : null}
      </div>

      {status?.manual_connect_allowed ? (
        <form
          onSubmit={onManual}
          className="mt-6 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Testing only
          </p>
          <h2 className="font-bold">Link with Meta API credentials</h2>
          <p className="text-sm text-[var(--muted)]">
            Use when Embedded Signup is not set up. Temporary tokens expire in about
            24 hours.
          </p>
          <Input
            label="Access token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <Input
            label="Phone number ID"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
          <Input
            label="WABA ID"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
          />
          <Input
            label="Display phone (optional)"
            value={displayPhone}
            onChange={(e) => setDisplayPhone(e.target.value)}
          />
          <FormActions>
            <Button type="submit" disabled={busy}>
              Connect manually
            </Button>
          </FormActions>
        </form>
      ) : null}
    </FormPage>
  );
}
