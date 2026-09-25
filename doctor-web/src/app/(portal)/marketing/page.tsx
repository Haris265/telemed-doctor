"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  MessageSquareText,
  Send,
  Smartphone,
} from "lucide-react";

import { Button, Empty, ErrorText, PageHeader, PageLoader, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import type { MarketingCampaign, MarketingStatus, MessageTemplate } from "@/lib/types";

function StatusChip({
  ok,
  label,
  okLabel,
  badLabel,
}: {
  ok: boolean;
  label: string;
  okLabel: string;
  badLabel: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-[var(--border)] bg-white text-[var(--text)]"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
      ) : (
        <Circle size={16} className="shrink-0 text-[var(--muted)]" />
      )}
      <div>
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="font-semibold">{ok ? okLabel : badLabel}</p>
      </div>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "done":
      return "bg-emerald-50 text-emerald-800";
    case "failed":
      return "bg-red-50 text-red-800";
    case "sending":
    case "queued":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-brand-50 text-brand-800";
  }
}

export default function MarketingPage() {
  const [status, setStatus] = useState<MarketingStatus | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = await api.marketingStatus();
      setStatus(s);
      if (s.marketing_enabled) {
        const [t, c] = await Promise.all([
          api.marketingTemplates(),
          api.marketingCampaigns(),
        ]);
        setTemplates(t.filter((x) => x.is_active));
        setCampaigns(c);
      } else {
        setTemplates([]);
        setCampaigns([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const enabled = Boolean(status?.marketing_enabled);
  const waConnected = Boolean(status?.whatsapp_connected);

  const campaignStats = useMemo(() => {
    const total = campaigns.length;
    const sent = campaigns.reduce(
      (n, c) => n + (c.recipient_counts?.sent ?? 0),
      0,
    );
    const failed = campaigns.reduce(
      (n, c) => n + (c.recipient_counts?.failed ?? 0),
      0,
    );
    return { total, sent, failed, templates: templates.length };
  }, [campaigns, templates.length]);

  return (
    <div>
      <PageHeader
        title="WhatsApp Marketing"
        subtitle={
          enabled
            ? "Templates and targeted patient campaigns."
            : "Activate your plan to broadcast WhatsApp messages to patients."
        }
        action={
          enabled ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/marketing/templates">
                <Button variant="secondary">Templates</Button>
              </Link>
              <Link href="/marketing/campaigns/new">
                <Button>New campaign</Button>
              </Link>
            </div>
          ) : null
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}

      {loading ? (
        <PageLoader label="Loading marketing…" />
      ) : !enabled ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusChip
              ok={false}
              label="Marketing plan"
              okLabel="Active"
              badLabel="Inactive"
            />
            <StatusChip
              ok={waConnected}
              label="WhatsApp"
              okLabel="Connected"
              badLabel="Not connected"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                <MessageSquareText size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Get WhatsApp Marketing
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Ask PatientCare admin to activate WhatsApp Marketing after
                  payment. Once active, you can design templates and send to
                  filtered patients.
                </p>
              </div>
            </div>

            <ol className="mt-6 space-y-4">
              {[
                {
                  n: 1,
                  title: "Connect WhatsApp Business",
                  body: "Link your clinic number so campaigns send from your account.",
                  done: waConnected,
                  action: !waConnected ? (
                    <Link href="/whatsapp/connect">
                      <Button variant="secondary" className="mt-2">
                        <Smartphone size={16} className="mr-1.5 inline" />
                        Connect WhatsApp
                      </Button>
                    </Link>
                  ) : null,
                },
                {
                  n: 2,
                  title: "Arrange Marketing with admin",
                  body: "Pay or confirm your Marketing plan with PatientCare admin (cash).",
                  done: false,
                },
                {
                  n: 3,
                  title: "Admin activates your plan",
                  body: "Admin records the cash enablement — this page unlocks automatically.",
                  done: false,
                },
                {
                  n: 4,
                  title: "Create templates & send campaigns",
                  body: "Design message + image, filter patients, then broadcast.",
                  done: false,
                },
              ].map((step) => (
                <li key={step.n} className="flex gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      step.done
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-brand-50 text-brand-800"
                    }`}
                  >
                    {step.done ? <CheckCircle2 size={16} /> : step.n}
                  </span>
                  <div className="min-w-0 flex-1 border-b border-[var(--border)] pb-4 last:border-0">
                    <p className="font-semibold">{step.title}</p>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {step.body}
                    </p>
                    {step.action}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusChip
              ok
              label="Marketing plan"
              okLabel="Active"
              badLabel="Inactive"
            />
            <StatusChip
              ok={waConnected}
              label="WhatsApp"
              okLabel="Connected"
              badLabel="Not connected"
            />
          </div>

          {!waConnected ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>Connect WhatsApp before sending campaigns.</p>
              <Link href="/whatsapp/connect">
                <Button variant="secondary">Connect now</Button>
              </Link>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Templates" value={campaignStats.templates} />
            <StatCard label="Campaigns" value={campaignStats.total} />
            <StatCard label="Messages sent" value={campaignStats.sent} />
            <StatCard label="Failed" value={campaignStats.failed} />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Templates</h2>
              <Link
                href="/marketing/templates"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Manage all
              </Link>
            </div>
            {templates.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{t.name}</p>
                      {t.meta_template_name ? (
                        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                          Meta
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                      {t.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>
                No templates yet.{" "}
                <Link
                  href="/marketing/templates"
                  className="font-semibold text-brand-700 underline"
                >
                  Create one
                </Link>
              </Empty>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Campaign history</h2>
              <Link href="/marketing/campaigns/new">
                <Button>
                  <Send size={16} className="mr-1.5 inline" />
                  New campaign
                </Button>
              </Link>
            </div>
            {campaigns.length ? (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <Link
                    key={c.id}
                    href={`/marketing/campaigns/${c.id}`}
                    className="block rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {c.name || `Campaign ${c.id}`}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          Template: {c.template_name}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Recipients {c.recipient_counts?.total ?? 0} · Sent{" "}
                      {c.recipient_counts?.sent ?? 0} · Failed{" "}
                      {c.recipient_counts?.failed ?? 0}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>
                No campaigns yet. Create a template, then launch your first
                broadcast.
              </Empty>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
