"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button, Empty, ErrorText, PageHeader, TextArea } from "@/components/ui";
import { api } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  statusLabel,
} from "@/lib/format";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import type { Appointment } from "@/lib/types";

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

  return (
    <div className="max-w-3xl">
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
              <p>{formatDate(appt.scheduled_at)} · {formatTime(appt.scheduled_at)}</p>
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

          {appt.status === "upcoming" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {!appt.visit_started_at ? (
                <Button disabled={busy} onClick={() => void run(() => api.startVisit(id))}>
                  Start visit
                </Button>
              ) : !appt.visit_ended_at ? (
                <Button disabled={busy} onClick={() => void run(() => api.endVisit(id))}>
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
                  onChange={(e) => void onUploadImage(e.target.files?.[0] || null)}
                />
              </label>
              <label className="cursor-pointer rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">
                Add voice
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => void onUploadVoice(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            {appt.attachments?.length ? (
              <div className="space-y-3">
                {appt.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-3"
                  >
                    {att.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(att.url)}
                        alt={att.original_name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <audio controls src={resolveMediaUrl(att.url)} className="max-w-full" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{att.original_name}</p>
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
                ))}
              </div>
            ) : (
              <Empty>No attachments yet.</Empty>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
