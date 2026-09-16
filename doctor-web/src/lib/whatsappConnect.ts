import { api } from "./api";
import { storage } from "./storage";
import type { DoctorWhatsAppStatus } from "./types";

const WA_SKIP_KEY = "opd_whatsapp_connect_skipped";

export function getWhatsAppRedirectUri() {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_WHATSAPP_REDIRECT_URI ||
      `${window.location.origin}/whatsapp/callback`
    );
  }
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_REDIRECT_URI ||
    "http://localhost:3001/whatsapp/callback"
  );
}

export async function launchWhatsAppConnect(): Promise<DoctorWhatsAppStatus> {
  const redirectUri = getWhatsAppRedirectUri();
  const session = await api.whatsappSession(redirectUri);
  window.location.href = session.signup_url;
  // Navigation leaves the page; return never used.
  return new Promise(() => undefined);
}

export async function completeWhatsAppConnect(params: {
  code: string;
  waba_id: string;
  phone_number_id: string;
  state: string;
}): Promise<DoctorWhatsAppStatus> {
  const status = await api.whatsappConnect(params);
  storage.deleteItem(WA_SKIP_KEY);
  return status;
}

export function skipWhatsAppPrompt() {
  storage.setItem(WA_SKIP_KEY, "1");
}

export function wasWhatsAppSkipped() {
  return storage.getItem(WA_SKIP_KEY) === "1";
}
