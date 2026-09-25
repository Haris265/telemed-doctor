"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";

import {
  Button,
  ErrorText,
  FormSection,
  Input,
  PageHeader,
  PageLoader,
  Select,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  AudiencePreview,
  CampaignFilters,
  DoctorClinic,
  MessageTemplate,
} from "@/lib/types";

export default function NewCampaignPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [clinics, setClinics] = useState<DoctorClinic[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [lastVisitDays, setLastVisitDays] = useState("");
  const [hasUpcoming, setHasUpcoming] = useState(false);
  const [audience, setAudience] = useState<AudiencePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filters = useCallback((): CampaignFilters => {
    const f: CampaignFilters = {};
    if (clinicId) f.clinic_id = clinicId;
    if (city.trim()) f.city = city.trim();
    if (area.trim()) f.area = area.trim();
    if (lastVisitDays) f.last_visit_days = lastVisitDays;
    if (hasUpcoming) f.has_upcoming = true;
    return f;
  }, [clinicId, city, area, lastVisitDays, hasUpcoming]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [t, c, status] = await Promise.all([
          api.marketingTemplates(),
          api.clinics(),
          api.marketingStatus(),
        ]);
        if (!status.marketing_enabled) {
          router.replace("/marketing");
          return;
        }
        const active = t.filter((x) => x.is_active);
        setTemplates(active);
        setClinics(c);
        if (active[0]) setTemplateId(active[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function previewAudience() {
    setPreviewing(true);
    setError("");
    try {
      setAudience(await api.marketingAudience(filters()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audience preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function onCreate() {
    if (!templateId) {
      setError("Select a template.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const campaign = await api.createMarketingCampaign({
        template_id: Number(templateId),
        name: name.trim() || undefined,
        filter_json: filters(),
      });
      router.push(`/marketing/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoader label="Loading campaign form…" />;
  }

  return (
    <div>
      <PageHeader
        title="New campaign"
        subtitle="Pick a template, filter patients, preview audience, then create."
        action={
          <Link href="/marketing">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}

      {!templates.length ? (
        <FormSection title="No templates yet">
          <p className="text-sm text-[var(--muted)]">
            Create a message template before launching a campaign.
          </p>
          <Link href="/marketing/templates" className="mt-4 inline-block">
            <Button>Go to templates</Button>
          </Link>
        </FormSection>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <FormSection>
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                1 · Message
              </h2>
              <Select
                label="Template"
                value={templateId}
                onChange={(e) =>
                  setTemplateId(e.target.value ? Number(e.target.value) : "")
                }
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Campaign name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. March checkup reminder"
              />

              <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                2 · Audience filters
              </h2>
              <Select
                label="Clinic"
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
              >
                <option value="">All clinics</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.clinic.id}>
                    {c.clinic.name}
                  </option>
                ))}
              </Select>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label="Area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>

              <Input
                label="Last visit within (days)"
                type="number"
                min={1}
                value={lastVisitDays}
                onChange={(e) => setLastVisitDays(e.target.value)}
                placeholder="e.g. 90"
              />

              <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={hasUpcoming}
                  onChange={(e) => setHasUpcoming(e.target.checked)}
                  className="rounded"
                />
                Only patients with an upcoming appointment
              </label>

              <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                <Button
                  variant="secondary"
                  onClick={() => void previewAudience()}
                  disabled={previewing}
                >
                  {previewing ? "Counting…" : "Preview audience"}
                </Button>
                <Button onClick={() => void onCreate()} disabled={saving}>
                  {saving ? "Creating…" : "Create campaign"}
                </Button>
              </div>
            </div>
          </FormSection>

          <FormSection>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-brand-700" />
              <h2 className="font-semibold">Audience preview</h2>
            </div>
            {audience ? (
              <div className="mt-4">
                <p className="text-3xl font-bold text-brand-800">
                  {audience.count}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  patient{audience.count === 1 ? "" : "s"} matched
                </p>
                {audience.sample.length ? (
                  <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
                    {audience.sample.map((p) => (
                      <li
                        key={p.uuid}
                        className="flex justify-between gap-2 text-[var(--muted)]"
                      >
                        <span className="truncate font-medium text-[var(--text)]">
                          {p.name}
                        </span>
                        <span className="shrink-0">{p.phone}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    No sample patients for these filters.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Adjust filters and tap Preview audience to see who will receive
                this campaign.
              </p>
            )}
          </FormSection>
        </div>
      )}
    </div>
  );
}
