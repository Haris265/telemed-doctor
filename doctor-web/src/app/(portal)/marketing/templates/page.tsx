"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";

import {
  Button,
  Empty,
  ErrorText,
  FormSection,
  Input,
  PageHeader,
  PageLoader,
  TextArea,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { MessageTemplate } from "@/lib/types";

export default function MarketingTemplatesPage() {
  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [metaName, setMetaName] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api.marketingTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createMarketingTemplate({
        name: name.trim(),
        body: body.trim(),
        meta_template_name: metaName.trim(),
        header_image: image,
      });
      setName("");
      setBody("");
      setMetaName("");
      setImage(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Remove this template?")) return;
    try {
      await api.deleteMarketingTemplate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Message templates"
        subtitle="Design WhatsApp message + optional image for campaigns."
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form onSubmit={onCreate}>
          <FormSection
            title="New template"
            description="Message and optional image for WhatsApp campaigns."
          >
            <div className="space-y-3">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Flu season reminder"
                required
              />
              <TextArea
                label="Message body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the WhatsApp message patients will see…"
                required
              />
              <div>
                <Input
                  label="Header image (optional)"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
                {image ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <ImageIcon size={12} />
                    {image.name}
                  </p>
                ) : null}
              </div>
              <Input
                label="Meta template name (optional)"
                placeholder="Approved name on Meta Business"
                value={metaName}
                onChange={(e) => setMetaName(e.target.value)}
                hint="Without Meta approval, free-form text/image only works in the 24-hour window."
              />
              <Button
                type="submit"
                disabled={saving || !name.trim() || !body.trim()}
                className="w-full sm:w-auto"
              >
                {saving ? "Saving…" : "Save template"}
              </Button>
            </div>
          </FormSection>
        </form>

        <div>
          <h2 className="mb-3 text-base font-semibold">Your templates</h2>
          {loading ? (
            <PageLoader label="Loading templates…" />
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{t.name}</p>
                        {!t.is_active ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                            Inactive
                          </span>
                        ) : null}
                        {t.meta_template_name ? (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-800">
                            Meta
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
                        {t.body}
                      </p>
                      {t.header_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.header_image_url}
                          alt=""
                          className="mt-3 max-h-36 rounded-xl object-cover"
                        />
                      ) : null}
                      {t.meta_template_name ? (
                        <p className="mt-2 text-xs text-brand-700">
                          Meta name: {t.meta_template_name}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="danger"
                      onClick={() => void onDelete(t.id)}
                      className="shrink-0"
                    >
                      <Trash2 size={14} className="mr-1 inline" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No templates yet. Create your first on the left.</Empty>
          )}
        </div>
      </div>
    </div>
  );
}
