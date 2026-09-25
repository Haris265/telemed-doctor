"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  ErrorText,
  FormActions,
  FormPage,
  FormSection,
  Input,
  PageHeader,
} from "@/components/ui";
import { api } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.changePassword({
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      });
      setOk(res.detail || "Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => router.push("/profile"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormPage maxWidth="md">
      <PageHeader
        title="Change password"
        subtitle="Use a strong password you do not reuse elsewhere."
      />
      <form onSubmit={onSubmit}>
        <FormSection>
          <div className="space-y-3">
            <Input
              label="Current password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
            <Input
              label="New password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {error ? <ErrorText>{error}</ErrorText> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
          </div>
          <FormActions>
            <Link href="/profile">
              <Button type="button" variant="secondary">
                Back
              </Button>
            </Link>
            <Button type="submit" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </FormActions>
        </FormSection>
      </form>
    </FormPage>
  );
}
