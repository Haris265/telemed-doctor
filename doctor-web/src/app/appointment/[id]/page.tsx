"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Button,
  Empty,
  ErrorText,
  FormPage,
  PageHeader,
  TextArea,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  statusLabel,
} from "@/lib/format";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import type { Appointment, VisitAttachment } from "@/lib/types";

function paymentMethodLabel(method?: string) {
  if (method === "bank_transfer") return "Bank transfer";
  if (method === "cash_at_clinic") return "Cash at clinic";
  return method || "—";
}

function paymentStatusLabel(status?: string) {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  if (status === "failed") return "Failed";
  if (status === "not_required") return "Not required";
  return status || "—";
}

function ocrStatusLabel(status?: string) {
  if (status === "passed") return "Verified";
  if (status === "failed") return "Failed";
  if (status === "pending") return "Pending";
  return status || "—";
}

function VoiceSummaryBlock({
  appointmentId,
  attachment,
  onUpdated,
}: {
  appointmentId: number;
  attachment: VisitAttachment;
  onUpdated: (att: VisitAttachment) => void;
}) {
  const status = attachment.summary_status || "skipped";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(attachment.summary_text || "");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!editing) setDraft(attachment.summary_text || "");
  }, [attachment.summary_text, editing]);

  if (status === "skipped") return null;

  async function onSave() {
    setSaving(true);
    setLocalError("");
    try {
      const updated = await api.updateAttachmentSummary(
        appointmentId,
        attachment.id,
        { summary_text: draft },
      );
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onRetry() {
    setRetrying(true);
    setLocalError("");
    try {
      const updated = await api.regenerateAttachmentSummary(
        appointmentId,
        attachment.id,
      );
      onUpdated(updated);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  const statusLabelText =
    status === "pending"
      ? "Generating Roman Urdu summary…"
      : status === "failed"
        ? "Summary failed"
        : "Voice summary (Roman Urdu)";

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-[var(--surface-alt,#f8faf9)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {statusLabelText}
      </p>

      {status === "pending" ? (
        <p className="text-sm text-[var(--muted)]">Please wait…</p>
      ) : null}

      {status === "failed" ? (
        <div className="space-y-2">
          <p className="text-sm text-red-600">
            {attachment.summary_error || "Could not generate summary."}
          </p>
          <Button
            variant="secondary"
            disabled={retrying}
            onClick={() => void onRetry()}
          >
            {retrying ? "Retrying…" : "Retry summary"}
          </Button>
        </div>
      ) : null}

      {(status === "ready" ||
        (status === "failed" && attachment.summary_text)) &&
      !editing ? (
        <div className="space-y-2">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {attachment.summary_text?.trim() || "—"}
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-brand-700"
            onClick={() => {
              setDraft(attachment.summary_text || "");
              setLocalError("");
              setEditing(true);
            }}
          >
            Edit summary
          </button>
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-2">
          <TextArea
            label="Roman Urdu summary"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
          />
          {localError ? <ErrorText>{localError}</ErrorText> : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => void onSave()}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setDraft(attachment.summary_text || "");
                setLocalError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {localError && !editing ? (
        <p className="text-xs text-red-600">{localError}</p>
      ) : null}
    </div>
  );
}

export default function VisitPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setError("");
    try {
      setAppt(await api.appointment(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!appt?.visit_started_at || appt.visit_ended_at) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [appt?.visit_started_at, appt?.visit_ended_at]);

  const hasPendingSummary = useMemo(
    () =>
      (appt?.attachments || []).some(
        (a) => a.kind === "voice" && a.summary_status === "pending",
      ),
    [appt?.attachments],
  );

  useEffect(() => {
    if (!hasPendingSummary || !id) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const data = await api.appointment(id);
        if (cancelled) return;
        setAppt(data);
      } catch {
        // ignore transient poll errors
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasPendingSummary, id]);

  const liveSeconds =
    appt?.visit_started_at && !appt.visit_ended_at
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(appt.visit_started_at).getTime()) / 1000,
          ),
        ) + tick * 0
      : appt?.visit_duration_seconds || 0;

  async function run(action: () => Promise<Appointment>) {
    setBusy(true);
    setError("");
    try {
      setAppt(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function patchAttachment(updated: VisitAttachment) {
    setAppt((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attachments: (prev.attachments || []).map((a) =>
          a.id === updated.id ? updated : a,
        ),
      };
    });
  }

  async function onUploadImage(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await api.uploadAttachment(id, { kind: "image", file, name: file.name });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadVoice(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await api.uploadAttachment(id, {
        kind: "voice",
        file,
        name: file.name || "voice.webm",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!appt && !error) {
    return <p className="text-sm text-[var(--muted)]">Loading visit…</p>;
  }

  const showPayment = Boolean(appt?.payment_method);

  return (
    <FormPage maxWidth="3xl">
      <PageHeader
        title="Visit"
        subtitle={appt ? `${appt.patient_name} · Token ${appt.token_code}` : ""}
        action={
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
        }
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      {appt ? (
        <>
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{appt.patient_name}</p>
                <p className="text-sm text-[var(--muted)]">{appt.patient_phone}</p>
                {appt.patient_uuid ? (
                  <Link
                    href={`/patient/${appt.patient_uuid}`}
                    className="mt-1 inline-block text-sm font-semibold text-brand-700"
                  >
                    Patient profile →
                  </Link>
                ) : null}
              </div>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                {statusLabel(appt.status)}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
              <p>
                {formatDate(appt.scheduled_at)} · {formatTime(appt.scheduled_at)}
              </p>
              <p>{appt.clinic_name || "No clinic"}</p>
              <p>Token {appt.token_code}</p>
              <p>
                Visit timer:{" "}
                {appt.visit_started_at
                  ? formatDuration(
                      appt.visit_ended_at
                        ? appt.visit_duration_seconds || 0
                        : Math.max(
                            0,
                            Math.floor(
                              (Date.now() -
                                new Date(appt.visit_started_at).getTime()) /
                                1000,
                            ),
                          ),
                    )
                  : "Not started"}
                <span className="sr-only">{liveSeconds}</span>
              </p>
            </div>
          </div>

          {showPayment ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold">Payment</h2>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[var(--muted)]">Method</p>
                  <p className="font-medium">
                    {paymentMethodLabel(appt.payment_method)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Status</p>
                  <p className="font-medium">
                    {paymentStatusLabel(appt.payment_status)}
                  </p>
                </div>
                {appt.payment_amount_expected != null &&
                appt.payment_amount_expected !== "" ? (
                  <div>
                    <p className="text-[var(--muted)]">Expected</p>
                    <p className="font-medium">
                      Rs {appt.payment_amount_expected}
                    </p>
                  </div>
                ) : null}
                {appt.payment_amount_received != null &&
                appt.payment_amount_received !== "" ? (
                  <div>
                    <p className="text-[var(--muted)]">Received</p>
                    <p className="font-medium">
                      Rs {appt.payment_amount_received}
                    </p>
                  </div>
                ) : null}
                {appt.payment_reference ? (
                  <div className="sm:col-span-2">
                    <p className="text-[var(--muted)]">Reference</p>
                    <p className="font-medium">{appt.payment_reference}</p>
                  </div>
                ) : null}
                {appt.payment_ocr_status &&
                appt.payment_ocr_status !== "skipped" ? (
                  <div>
                    <p className="text-[var(--muted)]">Slip OCR</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        appt.payment_ocr_status === "passed"
                          ? "bg-emerald-50 text-emerald-800"
                          : appt.payment_ocr_status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {ocrStatusLabel(appt.payment_ocr_status)}
                    </span>
                  </div>
                ) : null}
              </div>
              {appt.payment_slip ? (
                <a
                  href={resolveMediaUrl(appt.payment_slip)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-brand-700"
                >
                  View payment slip →
                </a>
              ) : null}
            </div>
          ) : null}

          {appt.status === "upcoming" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {!appt.visit_started_at ? (
                <Button
                  disabled={busy}
                  onClick={() => void run(() => api.startVisit(id))}
                >
                  Start visit
                </Button>
              ) : !appt.visit_ended_at ? (
                <Button
                  disabled={busy}
                  onClick={() => void run(() => api.endVisit(id))}
                >
                  End visit
                </Button>
              ) : null}
              <Button
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    api.updateAppointmentStatus(id, { status: "completed" }),
                  )
                }
              >
                Complete
              </Button>
              <div className="w-full space-y-2 sm:w-auto sm:min-w-[280px]">
                <TextArea
                  label="Rejection reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      api.updateAppointmentStatus(id, {
                        status: "rejected",
                        rejection_reason: reason.trim() || undefined,
                      }),
                    )
                  }
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="mb-3 font-bold">Attachments</h2>
            <div className="mb-4 flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">
                Add photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) =>
                    void onUploadImage(e.target.files?.[0] || null)
                  }
                />
              </label>
              <label className="cursor-pointer rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">
                Add voice
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) =>
                    void onUploadVoice(e.target.files?.[0] || null)
                  }
                />
              </label>
            </div>
            {appt.attachments?.length ? (
              <div className="space-y-3">
                {appt.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="rounded-xl border border-[var(--border)] bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      {att.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(att.url)}
                          alt={att.original_name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <audio
                          controls
                          src={resolveMediaUrl(att.url)}
                          className="max-w-full"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {att.original_name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatDateTime(att.created_at)}
                          {att.sent_via_whatsapp ? " · Sent on WhatsApp" : ""}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api.deleteAttachment(id, att.id);
                            return api.appointment(id);
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                    {att.kind === "voice" ? (
                      <VoiceSummaryBlock
                        appointmentId={id}
                        attachment={att}
                        onUpdated={patchAttachment}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No attachments yet.</Empty>
            )}
          </div>
        </>
      ) : null}
    </FormPage>
  );
}
