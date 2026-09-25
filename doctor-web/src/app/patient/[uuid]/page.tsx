"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  AppointmentCard,
  Button,
  Empty,
  ErrorText,
  FormPage,
  PageHeader,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { DoctorPatientDetail, VisitAttachment } from "@/lib/types";

function ClinicalBlock({
  title,
  note,
}: {
  title: string;
  note: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}) {
  const rows = [
    ["S", note.subjective],
    ["O", note.objective],
    ["A", note.assessment],
    ["P", note.plan],
  ].filter(([, v]) => v?.trim());
  if (!rows.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <h3 className="mb-2 font-bold">{title}</h3>
      <div className="space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <p key={k}>
            <span className="font-semibold text-brand-800">{k}: </span>
            <span className="text-[var(--muted)] whitespace-pre-wrap">{v}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams();
  const uuid = String(params.uuid);
  const [patient, setPatient] = useState<DoctorPatientDetail | null>(null);
  const [error, setError] = useState("");
  const [summaryDoc, setSummaryDoc] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setPatient(await api.patient(uuid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!patient && !error) {
    return <p className="text-sm text-[var(--muted)]">Loading patient…</p>;
  }

  const rx = patient?.last_prescription;
  const voiceSummaries: { visitLabel: string; att: VisitAttachment; index: number }[] =
    [];
  for (const visit of patient?.visit_history || []) {
    const voices = (visit.attachments || []).filter(
      (att) => att.kind === "voice" && att.summary_text?.trim(),
    );
    voices.forEach((att, index) => {
      voiceSummaries.push({
        visitLabel: formatDate(visit.scheduled_at),
        att,
        index,
      });
    });
  }

  return (
    <FormPage maxWidth="3xl">
      <PageHeader
        title={patient?.name || "Patient"}
        subtitle={patient?.phone}
        action={
          <Link
            href={`/appointment/book?patient=${uuid}`}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Book appointment
          </Link>
        }
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      {patient ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">Total visits</p>
              <p className="text-xl font-bold">{patient.total_visits}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">Appointments</p>
              <p className="text-xl font-bold">{patient.total_appointments}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">Rejected</p>
              <p className="text-xl font-bold">{patient.rejected_count}</p>
            </div>
          </div>

          {(patient.last_clinical_note || rx || voiceSummaries.length > 0) && (
            <div className="mt-8 space-y-4">
              <h2 className="font-bold">Clinical summary</h2>
              {patient.last_clinical_note ? (
                <ClinicalBlock
                  title="Last clinical note"
                  note={patient.last_clinical_note}
                />
              ) : null}
              {rx ? (
                <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <h3 className="mb-2 font-bold">Last prescription</h3>
                  {rx.notes?.trim() ? (
                    <p className="mb-2 text-sm text-[var(--muted)] whitespace-pre-wrap">
                      {rx.notes}
                    </p>
                  ) : null}
                  {rx.items?.length ? (
                    <ul className="space-y-2 text-sm">
                      {rx.items.map((item, i) => (
                        <li key={i} className="rounded-lg bg-[var(--surface-alt,#f8faf9)] p-2">
                          <p className="font-semibold">{item.medicine_name}</p>
                          <p className="text-[var(--muted)]">
                            {[item.dosage, item.frequency, item.duration]
                              .filter(Boolean)
                              .join(" · ")}
                            {item.instructions
                              ? ` — ${item.instructions}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No items.</p>
                  )}
                </div>
              ) : null}
              {voiceSummaries.length ? (
                <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <h3 className="mb-2 font-bold">Voice summaries</h3>
                  <ul className="space-y-2">
                    {voiceSummaries.map(({ visitLabel, att, index }) => {
                      const title =
                        voiceSummaries.filter((v) => v.att.id === att.id)
                          .length > 1 || index > 0
                          ? `Voice summary ${index + 1}`
                          : "Voice summary";
                      return (
                        <li key={`${att.id}-${index}`}>
                          <button
                            type="button"
                            className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm transition hover:border-brand-300"
                            onClick={() =>
                              setSummaryDoc({
                                title: `${title} · ${visitLabel}`,
                                body: att.summary_text!.trim(),
                              })
                            }
                          >
                            <span className="font-semibold text-brand-800">
                              {title}
                            </span>
                            <span className="text-[var(--muted)]">
                              {" "}
                              · {visitLabel}
                            </span>
                            <p className="mt-1 line-clamp-2 text-[var(--muted)]">
                              {att.summary_text!.trim()}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <h2 className="mb-3 mt-8 font-bold">Visit history</h2>
          {patient.visit_history?.length ? (
            <div className="space-y-3">
              {patient.visit_history.map((a) => (
                <AppointmentCard key={a.id} appointment={a} detailed />
              ))}
            </div>
          ) : (
            <Empty>No visit history.</Empty>
          )}
        </>
      ) : null}

      {summaryDoc ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setSummaryDoc(null)}
          role="presentation"
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-bold">{summaryDoc.title}</h3>
              <Button variant="secondary" onClick={() => setSummaryDoc(null)}>
                Close
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {summaryDoc.body}
            </p>
          </div>
        </div>
      ) : null}
    </FormPage>
  );
}
