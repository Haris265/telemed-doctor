"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";

import { Button, Empty, ErrorText, PageHeader, PageLoader, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import type { CampaignRecipient, MarketingCampaign } from "@/lib/types";

function statusTone(status: string) {
  switch (status) {
    case "sent":
    case "done":
      return "bg-emerald-50 text-emerald-800";
    case "failed":
      return "bg-red-50 text-red-800";
    case "skipped":
      return "bg-slate-100 text-slate-700";
    case "sending":
    case "queued":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-brand-50 text-brand-800";
  }
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [c, r] = await Promise.all([
        api.marketingCampaign(id),
        api.marketingCampaignRecipients(id),
      ]);
      setCampaign(c);
      setRecipients(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSend() {
    if (!campaign) return;
    const pending =
      campaign.recipient_counts?.pending ??
      campaign.recipient_counts?.total ??
      0;
    if (!confirm(`Send to ${pending} pending recipient(s)?`)) {
      return;
    }
    setSending(true);
    setError("");
    setWarning("");
    try {
      const result = await api.sendMarketingCampaign(campaign.id);
      setCampaign(result.campaign);
      if (result.warning) setWarning(result.warning);
      setRecipients(await api.marketingCampaignRecipients(campaign.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <PageLoader label="Loading campaign…" />;
  }

  if (!campaign) {
    return (
      <div>
        <ErrorText>{error || "Campaign not found."}</ErrorText>
        <Link href="/marketing" className="mt-4 inline-block text-sm underline">
          Back to marketing
        </Link>
      </div>
    );
  }

  const canSend =
    campaign.status === "draft" ||
    campaign.status === "queued" ||
    campaign.status === "sending" ||
    campaign.status === "failed";

  return (
    <div>
      <PageHeader
        title={campaign.name || `Campaign ${campaign.id}`}
        subtitle={`Template: ${campaign.template_name}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(campaign.status)}`}
            >
              {campaign.status}
            </span>
            <Link href="/marketing">
              <Button variant="secondary">Back</Button>
            </Link>
            {canSend ? (
              <Button onClick={() => void onSend()} disabled={sending}>
                <Send size={16} className="mr-1.5 inline" />
                {sending ? "Sending…" : "Send now"}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}

      {warning ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {warning}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total recipients"
          value={campaign.recipient_counts?.total ?? 0}
        />
        <StatCard
          label="Pending"
          value={campaign.recipient_counts?.pending ?? 0}
        />
        <StatCard label="Sent" value={campaign.recipient_counts?.sent ?? 0} />
        <StatCard
          label="Failed"
          value={campaign.recipient_counts?.failed ?? 0}
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Recipients</h2>
      {recipients.length ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-brand-50/40 text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    {r.patient_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{r.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusTone(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-[var(--muted)]">
                    {r.error || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No recipients for this campaign.</Empty>
      )}
    </div>
  );
}
