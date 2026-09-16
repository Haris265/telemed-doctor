"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorText, Input } from "@/components/ui";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          PatientCare
        </p>
        <h1 className="mt-1 text-2xl font-bold">Doctor login</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use the same credentials as the doctor mobile app.
        </p>
        <div className="mt-6 space-y-4">
          <Input
            label="Email / username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="Password"
            type="password"
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
