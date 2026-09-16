"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ErrorText, PageHeader } from "@/components/ui";
import { completeWhatsAppConnect } from "@/lib/whatsappConnect";

export default function WhatsAppCallbackPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code") || "";
    const waba_id = searchParams.get("waba_id") || "";
    const phone_number_id = searchParams.get("phone_number_id") || "";
    const state = searchParams.get("state") || "";
    if (!code || !waba_id || !phone_number_id || !state) {
      setError("Incomplete WhatsApp signup response from Meta.");
      return;
    }
    completeWhatsAppConnect({ code, waba_id, phone_number_id, state })
      .then(() => router.replace("/profile?wa=connected"))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Connect failed"),
      );
  }, [router, searchParams]);

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Connecting WhatsApp"
        subtitle="Finishing Meta signup…"
      />
      {error ? <ErrorText>{error}</ErrorText> : (
        <p className="text-sm text-[var(--muted)]">Please wait…</p>
      )}
    </div>
  );
}
