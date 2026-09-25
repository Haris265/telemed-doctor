"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { Button, ErrorText, Input, PageLoader, PasswordInput } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { doctor, loading, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && doctor) router.replace("/home");
  }, [doctor, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api.login(email.trim(), password);
      await signIn(data.access, data.refresh, data.user, data.doctor);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <ClinicBackdrop />
        <PageLoader label="Loading…" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
      <ClinicBackdrop />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-soft)]/95 p-6 shadow-lg shadow-brand-900/5 backdrop-blur-sm sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
            <Stethoscope size={22} />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">
            PatientCare
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">
            Doctor login
          </h1>
          <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
            Sign in with your doctor account email and password.
          </p>
        </div>

        <div className="mt-7 space-y-4">
          <Input
            label="Email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@clinic.com"
            required
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
