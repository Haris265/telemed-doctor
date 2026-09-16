import * as WebBrowser from "expo-web-browser";

import { api } from "./api";
import { storage } from "./storage";
import type { DoctorWhatsAppStatus } from "./types";

WebBrowser.maybeCompleteAuthSession();

const CALLBACK_SCHEME = "opd-doctor://whatsapp-callback";
const WA_SKIP_KEY = "opd_whatsapp_connect_skipped";

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  if (Array.isArray(value)) return (value[0] || "").trim();
  return (value || "").trim();
}

function parseCallbackUrl(url: string): {
  code: string;
  waba_id: string;
  phone_number_id: string;
  state: string;
} {
  const parsed = new URL(url.replace("opd-doctor://", "https://callback/"));
  const params: Record<string, string> = {};
  parsed.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  return {
    code: firstParam(params, "code"),
    waba_id: firstParam(params, "waba_id"),
    phone_number_id: firstParam(params, "phone_number_id"),
    state: firstParam(params, "state"),
  };
}

export async function launchWhatsAppConnect(): Promise<DoctorWhatsAppStatus> {
  const session = await api.whatsappSession();
  const result = await WebBrowser.openAuthSessionAsync(
    session.signup_url,
    session.redirect_scheme || CALLBACK_SCHEME,
  );

  if (result.type !== "success" || !("url" in result) || !result.url) {
    throw new Error(
      result.type === "cancel" || result.type === "dismiss"
        ? "WhatsApp connect was cancelled."
        : "WhatsApp connect did not complete.",
    );
  }

  const payload = parseCallbackUrl(result.url);
  if (
    !payload.code ||
    !payload.waba_id ||
    !payload.phone_number_id ||
    !payload.state
  ) {
    throw new Error("Incomplete WhatsApp signup response from Meta.");
  }

  const status = await api.whatsappConnect(payload);
  await storage.deleteItem(WA_SKIP_KEY);
  return status;
}
