import { storage } from "./storage";
import type {
  Appointment,
  AvailabilitySlot,
  ClinicAvailableDatesResponse,
  ClinicFormPayload,
  DashboardStats,
  DateAvailabilityReplacePayload,
  DateAvailabilityReplaceResponse,
  DoctorBankAccount,
  DoctorBankAccountPayload,
  DoctorBookPayload,
  DoctorClinic,
  DoctorPatientDetail,
  DoctorPatientSummary,
  DoctorProfile,
  DoctorProfileUpdatePayload,
  ChangePasswordPayload,
  DoctorWhatsAppSession,
  DoctorWhatsAppStatus,
  PatientLookup,
  ScheduleSlotInput,
  UserInfo,
  VisitAttachment,
} from "./types";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "https://telemed-api.hnhsofttechsolutions.com"
).replace(/\/+$/, "");

const ACCESS_KEY = "opd_doctor_access";
const REFRESH_KEY = "opd_doctor_refresh";
const USER_KEY = "opd_doctor_user";
const DOCTOR_KEY = "opd_doctor_profile";

export async function getAccessToken() {
  return storage.getItem(ACCESS_KEY);
}

export async function getStoredUser(): Promise<UserInfo | null> {
  const raw = await storage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export async function getStoredDoctor(): Promise<DoctorProfile | null> {
  const raw = await storage.getItem(DOCTOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DoctorProfile;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  await storage.deleteItem(ACCESS_KEY);
  await storage.deleteItem(REFRESH_KEY);
  await storage.deleteItem(USER_KEY);
  await storage.deleteItem(DOCTOR_KEY);
}

export async function setAuth(
  access: string,
  refresh: string,
  user: UserInfo,
  doctor?: DoctorProfile,
) {
  await storage.setItem(ACCESS_KEY, access);
  await storage.setItem(REFRESH_KEY, refresh);
  await storage.setItem(USER_KEY, JSON.stringify(user));
  if (doctor) {
    await storage.setItem(DOCTOR_KEY, JSON.stringify(doctor));
  }
}

function unwrapList<T>(data: T[] | { results?: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
}

/** RN/Hermes can fail `instanceof FormData`; detect by append() as well. */
function isFormDataBody(body: BodyInit | null | undefined): body is FormData {
  if (!body || typeof body !== "object") return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return true;
  return typeof (body as FormData).append === "function";
}

function normalizeUploadUri(uri: string) {
  const trimmed = (uri || "").trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `file://${trimmed}`;
  return trimmed;
}

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractErrorDetail(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data !== "object") {
    return typeof data === "string" ? data : null;
  }
  const err = data as Record<string, unknown>;
  const statusField = err.status;
  const statusMsg = Array.isArray(statusField) ? statusField[0] : undefined;
  let detail: unknown = err.detail || statusMsg || err.non_field_errors || null;
  if (Array.isArray(detail)) detail = detail[0];
  if (!detail) {
    const firstKey = Object.keys(err)[0];
    const firstVal = firstKey ? err[firstKey] : null;
    if (Array.isArray(firstVal) && firstVal[0]) detail = String(firstVal[0]);
    else if (typeof firstVal === "string") detail = firstVal;
  }
  return typeof detail === "string" && detail.trim() ? detail.trim() : null;
}

function isCredentialFailureMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("credentials") ||
    lower.includes("password") ||
    lower.includes("no active account") ||
    lower.includes("unable to log in") ||
    lower.includes("authentication failed") ||
    lower.includes("invalid email") ||
    lower.includes("incorrect")
  );
}

function throwForFailedStatus(status: number, data: unknown, text: string): never {
  if (status === 401) {
    const detail = extractErrorDetail(data);
    if (detail && isCredentialFailureMessage(detail)) {
      throw new Error("Password was incorrect.");
    }
    if (detail) {
      throw new Error(detail);
    }
    throw new Error("Unauthorized");
  }
  if (status === 404) {
    throw new Error("API endpoint not found (404). Backend may need deploy.");
  }
  if (status === 405) {
    throw new Error(
      "Booking not supported on this server yet. Deploy telemed-backend.",
    );
  }
  if (data == null && text) {
    throw new Error(`Invalid API response (${status})`);
  }
  const detail = extractErrorDetail(data);
  throw new Error(detail || "Request failed");
}

async function tryRefreshAccessToken(): Promise<boolean> {
  const refresh = await storage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  try {
    const refreshRes = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!refreshRes.ok) return false;
    const data = await refreshRes.json();
    await storage.setItem(ACCESS_KEY, data.access);
    if (data.refresh) {
      await storage.setItem(REFRESH_KEY, data.refresh);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * RN-safe multipart upload. Avoids fetch+Headers FormData failures on Android
 * ("Network request failed" → misleading "Cannot reach server").
 */
async function uploadMultipart<T>(
  path: string,
  form: FormData,
  auth = true,
  isRetry = false,
): Promise<T> {
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const token = auth ? await getAccessToken() : null;

  const result = await new Promise<{ status: number; text: string }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      // Do NOT set Content-Type — RN must add multipart boundary.
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      xhr.onload = () => {
        resolve({ status: xhr.status, text: xhr.responseText || "" });
      };
      xhr.onerror = () => {
        reject(
          new Error(
            `Cannot reach server. Check your internet and that the API is online.\n(${API_URL})\nNetwork request failed (upload)`,
          ),
        );
      };
      xhr.ontimeout = () => {
        reject(new Error(`Upload timed out.\n(${API_URL})`));
      };
      xhr.timeout = 120_000;
      xhr.send(form);
    },
  );

  if (result.status === 401 && auth && !isRetry) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return uploadMultipart<T>(path, form, auth, true);
    }
    throw new Error("Unauthorized");
  }

  const data = parseJsonSafe(result.text);
  if (result.status < 200 || result.status >= 300) {
    if (data == null && result.status === 404) {
      throw new Error("API endpoint not found (404). Backend may need deploy.");
    }
    throwForFailedStatus(result.status, data, result.text);
  }
  if (data == null && result.text) {
    throw new Error(`Invalid API response (${result.status})`);
  }
  return data as T;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
  isRetry = false,
): Promise<T> {
  const formBody = isFormDataBody(options.body);
  // Plain object headers — RN Android is more reliable than Headers for multipart.
  const headers: Record<string, string> = {};
  if (!formBody) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot reach server. Check your internet and that the API is online.\n(${API_URL})\n${detail}`,
    );
  }

  if (res.status === 401 && auth && !isRetry) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, auth, true);
    }
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  const data = parseJsonSafe(text);
  if (data == null && text) {
    if (res.status === 404) {
      throw new Error("API endpoint not found (404). Backend may need deploy.");
    }
    throw new Error(`Invalid API response (${res.status})`);
  }
  if (!res.ok) {
    throwForFailedStatus(res.status, data, text);
  }
  return data as T;
}

export const api = {
  login: async (username: string, password: string) => {
    const data = await request<{
      access: string;
      refresh: string;
      user: UserInfo;
    }>(
      "/api/auth/login/",
      { method: "POST", body: JSON.stringify({ username, password }) },
      false,
    );
    if (data.user.role !== "doctor") {
      throw new Error("Doctor account required.");
    }
    await setAuth(data.access, data.refresh, data.user);
    const doctor = await request<DoctorProfile>("/api/doctor/me/");
    await setAuth(data.access, data.refresh, data.user, doctor);
    return { ...data, doctor };
  },

  me: () => request<DoctorProfile>("/api/doctor/me/"),

  updateMe: (payload: DoctorProfileUpdatePayload) =>
    request<DoctorProfile>("/api/doctor/me/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  bankAccounts: () =>
    request<DoctorBankAccount[]>("/api/doctor/bank-accounts/"),

  createBankAccount: (payload: DoctorBankAccountPayload) =>
    request<DoctorBankAccount>("/api/doctor/bank-accounts/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateBankAccount: (id: number, payload: Partial<DoctorBankAccountPayload>) =>
    request<DoctorBankAccount>(`/api/doctor/bank-accounts/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteBankAccount: (id: number) =>
    request<void>(`/api/doctor/bank-accounts/${id}/`, {
      method: "DELETE",
    }),

  changePassword: (payload: ChangePasswordPayload) =>
    request<{ detail: string }>("/api/auth/change-password/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  dashboard: () => request<DashboardStats>("/api/doctor/dashboard/"),

  appointments: async (params?: {
    status?: string;
    today?: boolean;
    date_from?: string;
    date_to?: string;
    upcoming?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.today) qs.set("today", "1");
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    if (params?.upcoming === false) qs.set("upcoming", "0");
    const query = qs.toString();
    const data = await request<Appointment[] | { results: Appointment[] }>(
      query ? `/api/doctor/appointments/?${query}` : "/api/doctor/appointments/",
    );
    return unwrapList(data);
  },

  appointment: (id: number) =>
    request<Appointment>(`/api/doctor/appointments/${id}/`),

  updateAppointmentStatus: (
    id: number,
    payload: { status: "completed" | "rejected"; rejection_reason?: string },
  ) =>
    request<Appointment>(`/api/doctor/appointments/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  startVisit: (id: number) =>
    request<Appointment>(`/api/doctor/appointments/${id}/start/`, {
      method: "POST",
    }),

  endVisit: (id: number) =>
    request<Appointment>(`/api/doctor/appointments/${id}/end/`, {
      method: "POST",
    }),

  uploadAttachment: async (
    id: number,
    payload: {
      kind: "image" | "voice";
      uri: string;
      name?: string;
      mimeType?: string;
      durationSeconds?: number;
    },
  ) => {
    const form = new FormData();
    form.append("kind", payload.kind);
    if (payload.durationSeconds != null) {
      form.append("duration_seconds", String(payload.durationSeconds));
    }

    const uri = normalizeUploadUri(payload.uri);
    const isImage = payload.kind === "image";
    let name =
      payload.name ||
      (isImage ? "photo.jpg" : "voice.m4a");
    if (isImage && !/\.(jpe?g|png|webp)$/i.test(name)) {
      name = `${name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    }
    if (!isImage && !/\.(m4a|mp4|aac|mp3|wav|webm|ogg|3gp)$/i.test(name)) {
      name = `${name.replace(/\.[^.]+$/, "") || "voice"}.m4a`;
    }

    let mimeType =
      payload.mimeType ||
      (isImage ? "image/jpeg" : "audio/mp4");
    if (!isImage && (mimeType === "audio/m4a" || mimeType === "audio/x-m4a")) {
      mimeType = "audio/mp4";
    }
    if (isImage && (!mimeType || mimeType === "image/jpg")) {
      mimeType = "image/jpeg";
    }

    form.append("file", {
      uri,
      name,
      type: mimeType,
    } as unknown as Blob);

    return uploadMultipart<VisitAttachment>(
      `/api/doctor/appointments/${id}/attachments/`,
      form,
    );
  },

  deleteAttachment: (appointmentId: number, attachmentId: number) =>
    request<void>(
      `/api/doctor/appointments/${appointmentId}/attachments/${attachmentId}/`,
      { method: "DELETE" },
    ),

  updateAttachmentSummary: (
    appointmentId: number,
    attachmentId: number,
    payload: { summary_text: string },
  ) =>
    request<VisitAttachment>(
      `/api/doctor/appointments/${appointmentId}/attachments/${attachmentId}/`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),

  regenerateAttachmentSummary: (
    appointmentId: number,
    attachmentId: number,
  ) =>
    request<VisitAttachment>(
      `/api/doctor/appointments/${appointmentId}/attachments/${attachmentId}/regenerate-summary/`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  patients: () => request<DoctorPatientSummary[]>("/api/doctor/patients/"),

  patient: (uuid: string) =>
    request<DoctorPatientDetail>(`/api/doctor/patients/${uuid}/`),

  lookupPatient: async (phone: string): Promise<PatientLookup | null> => {
    try {
      return await request<PatientLookup>(
        `/api/doctor/patients/lookup/?phone=${encodeURIComponent(phone)}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        return null;
      }
      throw err;
    }
  },

  bookAppointment: (payload: DoctorBookPayload) =>
    request<Appointment>("/api/doctor/appointments/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  clinics: () => request<DoctorClinic[]>("/api/doctor/clinics/"),

  clinicAvailableDates: async (
    clinicLinkId: number,
    meta?: { clinicId: number; clinicName: string },
  ) => {
    try {
      return await request<ClinicAvailableDatesResponse>(
        `/api/doctor/clinics/${clinicLinkId}/available-dates/`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Production may not have available-dates yet — fall back to weekly schedule.
      if (!msg.includes("404") && !msg.toLowerCase().includes("not found")) {
        throw err;
      }
      const weekly = await request<AvailabilitySlot[]>(
        `/api/doctor/clinics/${clinicLinkId}/availability/`,
      );
      const { datesFromWeeklyAvailability } = await import("./slots");
      return {
        clinic_id: meta?.clinicId ?? weekly[0]?.clinic ?? 0,
        clinic_name: meta?.clinicName ?? "",
        dates: datesFromWeeklyAvailability(weekly),
      } satisfies ClinicAvailableDatesResponse;
    }
  },

  clinic: (id: number) => request<DoctorClinic>(`/api/doctor/clinics/${id}/`),

  createClinic: (payload: ClinicFormPayload) =>
    request<DoctorClinic>("/api/doctor/clinics/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateClinic: (id: number, payload: Partial<ClinicFormPayload & { is_active: boolean }>) =>
    request<DoctorClinic>(`/api/doctor/clinics/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteClinic: (id: number) =>
    request<void>(`/api/doctor/clinics/${id}/`, { method: "DELETE" }),

  clinicAvailability: (clinicLinkId: number) =>
    request<AvailabilitySlot[]>(
      `/api/doctor/clinics/${clinicLinkId}/availability/`,
    ),

  replaceClinicAvailability: (clinicLinkId: number, slots: ScheduleSlotInput[]) =>
    request<AvailabilitySlot[]>(
      `/api/doctor/clinics/${clinicLinkId}/availability/replace/`,
      {
        method: "PUT",
        body: JSON.stringify({ slots }),
      },
    ),

  replaceClinicDateAvailability: (
    clinicLinkId: number,
    payload: DateAvailabilityReplacePayload,
  ) =>
    request<DateAvailabilityReplaceResponse>(
      `/api/doctor/clinics/${clinicLinkId}/availability/date/`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    ),

  deleteAvailability: (id: number) =>
    request<void>(`/api/doctor/availability/${id}/`, { method: "DELETE" }),
  whatsappStatus: () =>
    request<DoctorWhatsAppStatus>("/api/doctor/whatsapp/status/"),

  whatsappSession: () =>
    request<DoctorWhatsAppSession>("/api/doctor/whatsapp/session/", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  whatsappConnect: (payload: {
    code: string;
    waba_id: string;
    phone_number_id: string;
    state: string;
  }) =>
    request<DoctorWhatsAppStatus>("/api/doctor/whatsapp/connect/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  whatsappConnectManual: (payload: {
    access_token: string;
    waba_id: string;
    phone_number_id: string;
    display_phone?: string;
  }) =>
    request<DoctorWhatsAppStatus>("/api/doctor/whatsapp/connect-manual/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  whatsappDisconnect: () =>
    request<DoctorWhatsAppStatus>("/api/doctor/whatsapp/disconnect/", {
      method: "DELETE",
    }),
};
