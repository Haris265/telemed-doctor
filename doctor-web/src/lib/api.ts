import { storage } from "./storage";
import type {
  Appointment,
  AvailabilitySlot,
  ClinicAvailableDatesResponse,
  ClinicFormPayload,
  DashboardStats,
  DoctorBookPayload,
  DoctorClinic,
  DoctorPatientDetail,
  DoctorPatientSummary,
  DoctorProfile,
  DoctorWhatsAppSession,
  DoctorWhatsAppStatus,
  PatientLookup,
  ScheduleSlotInput,
  UserInfo,
  VisitAttachment,
} from "./types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://telemed-api.hnhsofttechsolutions.com"
).replace(/\/+$/, "");

const ACCESS_KEY = "opd_doctor_access";
const REFRESH_KEY = "opd_doctor_refresh";
const USER_KEY = "opd_doctor_user";
const DOCTOR_KEY = "opd_doctor_profile";

export async function getAccessToken() {
  return storage.getItem(ACCESS_KEY);
}

export async function getStoredUser(): Promise<UserInfo | null> {
  const raw = storage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export async function getStoredDoctor(): Promise<DoctorProfile | null> {
  const raw = storage.getItem(DOCTOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DoctorProfile;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  storage.deleteItem(ACCESS_KEY);
  storage.deleteItem(REFRESH_KEY);
  storage.deleteItem(USER_KEY);
  storage.deleteItem(DOCTOR_KEY);
}

export async function setAuth(
  access: string,
  refresh: string,
  user: UserInfo,
  doctor?: DoctorProfile,
) {
  storage.setItem(ACCESS_KEY, access);
  storage.setItem(REFRESH_KEY, refresh);
  storage.setItem(USER_KEY, JSON.stringify(user));
  if (doctor) {
    storage.setItem(DOCTOR_KEY, JSON.stringify(doctor));
  }
}

function unwrapList<T>(data: T[] | { results?: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
  isRetry = false,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      `Cannot reach server. Check your internet and that the API is online.\n(${API_URL})`,
    );
  }

  if (res.status === 401 && auth && !isRetry) {
    const refresh = storage.getItem(REFRESH_KEY);
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          storage.setItem(ACCESS_KEY, data.access);
          if (data.refresh) {
            storage.setItem(REFRESH_KEY, data.refresh);
          }
          return request<T>(path, options, auth, true);
        }
      } catch {
        // Fall through
      }
    }
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (res.status === 404) {
      throw new Error("API endpoint not found (404). Backend may need deploy.");
    }
    throw new Error(`Invalid API response (${res.status})`);
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    if (res.status === 404) {
      throw new Error("API endpoint not found (404). Backend may need deploy.");
    }
    const err = data as Record<string, unknown>;
    const statusField = err?.status;
    const statusMsg = Array.isArray(statusField) ? statusField[0] : undefined;
    let detail: unknown =
      err?.detail ||
      statusMsg ||
      (typeof data === "object" ? null : "Request failed");
    if (!detail && err && typeof err === "object") {
      const firstKey = Object.keys(err)[0];
      const firstVal = firstKey ? err[firstKey] : null;
      if (Array.isArray(firstVal) && firstVal[0]) detail = String(firstVal[0]);
      else if (typeof firstVal === "string") detail = firstVal;
      else detail = JSON.stringify(data);
    }
    throw new Error(typeof detail === "string" ? detail : "Request failed");
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
      file: File | Blob;
      name?: string;
      durationSeconds?: number;
    },
  ) => {
    const form = new FormData();
    form.append("kind", payload.kind);
    if (payload.durationSeconds != null) {
      form.append("duration_seconds", String(payload.durationSeconds));
    }
    const name =
      payload.name ||
      (payload.kind === "image" ? "photo.jpg" : "voice.webm");
    form.append("file", payload.file, name);
    return request<VisitAttachment>(
      `/api/doctor/appointments/${id}/attachments/`,
      { method: "POST", body: form },
    );
  },

  deleteAttachment: (appointmentId: number, attachmentId: number) =>
    request<void>(
      `/api/doctor/appointments/${appointmentId}/attachments/${attachmentId}/`,
      { method: "DELETE" },
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

  updateClinic: (
    id: number,
    payload: Partial<ClinicFormPayload & { is_active: boolean }>,
  ) =>
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

  replaceClinicAvailability: (
    clinicLinkId: number,
    slots: ScheduleSlotInput[],
  ) =>
    request<AvailabilitySlot[]>(
      `/api/doctor/clinics/${clinicLinkId}/availability/replace/`,
      {
        method: "PUT",
        body: JSON.stringify({ slots }),
      },
    ),

  whatsappStatus: () =>
    request<DoctorWhatsAppStatus>("/api/doctor/whatsapp/status/"),

  whatsappSession: (redirectUri?: string) =>
    request<DoctorWhatsAppSession>("/api/doctor/whatsapp/session/", {
      method: "POST",
      body: JSON.stringify(
        redirectUri ? { redirect_uri: redirectUri } : {},
      ),
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
