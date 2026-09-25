"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  ErrorText,
  FormActions,
  FormPage,
  FormSection,
  Input,
  PageHeader,
  PageLoader,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ProfileEditPage() {
  const { doctor, refreshMe } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [sessionTime, setSessionTime] = useState("15");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setFirstName(doctor.first_name || "");
    setLastName(doctor.last_name || "");
    setEmail(doctor.email || "");
    setSessionTime(String(doctor.session_time ?? 15));
    setFee(
      doctor.consultation_fee != null && doctor.consultation_fee !== ""
        ? String(doctor.consultation_fee)
        : "",
    );
    setReady(true);
  }, [doctor]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        session_time: Number(sessionTime) || 15,
        consultation_fee: fee.trim() === "" ? undefined : fee.trim(),
      });
      await refreshMe();
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <PageLoader label="Loading profile…" />;
  }

  return (
    <FormPage maxWidth="xl">
      <PageHeader
        title="Edit profile"
        subtitle="Name, contact, session length, and consultation fee."
      />
      {error ? (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}
      <form onSubmit={onSubmit}>
        <FormSection>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Input
              label="Session time (minutes)"
              type="number"
              min={5}
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
              required
            />
            <Input
              label="Consultation fee (PKR)"
              type="number"
              min={0}
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="e.g. 2000"
            />
          </div>
          <FormActions>
            <Link href="/profile">
              <Button type="button" variant="secondary">
                Back
              </Button>
            </Link>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </FormActions>
        </FormSection>
      </form>
    </FormPage>
  );
}
