"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import {
  Button,
  Empty,
  ErrorText,
  FormActions,
  FormPage,
  FormSection,
  Input,
  PageHeader,
  PageLoader,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { DoctorBankAccount } from "@/lib/types";

const emptyForm = {
  bank_name: "",
  account_title: "",
  account_number: "",
  iban: "",
  is_primary: false,
};

export default function BankAccountsPage() {
  const [items, setItems] = useState<DoctorBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api.bankAccounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, is_primary: items.length === 0 });
    setShowForm(true);
  }

  function openEdit(a: DoctorBankAccount) {
    setEditingId(a.id);
    setForm({
      bank_name: a.bank_name,
      account_title: a.account_title,
      account_number: a.account_number,
      iban: a.iban || "",
      is_primary: a.is_primary,
    });
    setShowForm(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        bank_name: form.bank_name.trim(),
        account_title: form.account_title.trim(),
        account_number: form.account_number.trim(),
        iban: form.iban.trim() || undefined,
        is_primary: form.is_primary,
      };
      if (editingId) {
        await api.updateBankAccount(editingId, payload);
      } else {
        await api.createBankAccount(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this bank account?")) return;
    try {
      await api.deleteBankAccount(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <FormPage maxWidth="2xl">
      <PageHeader
        title="Bank accounts"
        subtitle="Used for WhatsApp bank-transfer payments from patients."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/profile">
              <Button variant="secondary">Back</Button>
            </Link>
            <Button onClick={openCreate}>
              {showForm && !editingId ? "Add another" : "Add account"}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={onSubmit} className="mb-6">
          <FormSection
            title={editingId ? "Edit account" : "New account"}
            description="Fee + bank details help patients pay via WhatsApp."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Bank name"
                value={form.bank_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bank_name: e.target.value }))
                }
                required
              />
              <Input
                label="Account title"
                value={form.account_title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, account_title: e.target.value }))
                }
                required
              />
              <Input
                label="Account number"
                value={form.account_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, account_number: e.target.value }))
                }
                required
              />
              <Input
                label="IBAN (optional)"
                value={form.iban}
                onChange={(e) =>
                  setForm((f) => ({ ...f, iban: e.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_primary: e.target.checked }))
                  }
                />
                Primary account
              </label>
            </div>
            <FormActions>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </FormActions>
          </FormSection>
        </form>
      ) : null}

      {loading ? (
        <PageLoader label="Loading bank accounts…" />
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {a.bank_name}
                    {a.is_primary ? (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-800">
                        Primary
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {a.account_title}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {a.account_number}
                    {a.iban ? ` · ${a.iban}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(a)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => void onDelete(a.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No bank accounts yet. Add one for patient transfers.</Empty>
      )}
    </FormPage>
  );
}
