export type Speciality = {
  id: number;
  name: string;
  display_icon: string;
  is_active: boolean;
};

export type Clinic = {
  id: number;
  name: string;
  address: string;
  city: string;
  area: string;
  phone: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  created_at: string;
};

export type DoctorClinic = {
  id: number;
  clinic: Clinic;
  is_primary: boolean;
  schedule_count: number;
  created_at: string;
};

export type AvailabilitySlot = {
  id: number;
  clinic: number | null;
  clinic_name?: string | null;
  weekday: number;
  weekday_display: string;
  /** YYYY-MM-DD when this is a date override; null/undefined = weekly. */
  specific_date?: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
};

export type ClinicFormPayload = {
  name: string;
  address: string;
  city?: string;
  area?: string;
  phone?: string;
  is_primary?: boolean;
};

export type ScheduleSlotInput = {
  weekday: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

export type DateScheduleSlotInput = {
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

export type DateAvailabilityReplacePayload = {
  date: string;
  slots: DateScheduleSlotInput[];
  closed?: boolean;
};

export type DateAvailabilityReplaceResponse = {
  date: string;
  closed: boolean;
  slots: AvailabilitySlot[];
};

export type DoctorBankAccount = {
  id: number;
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DoctorBankAccountPayload = {
  bank_name: string;
  account_title: string;
  account_number: string;
  iban?: string;
  is_primary?: boolean;
  is_active?: boolean;
};

export type DoctorProfile = {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  specialities: Speciality[];
  session_time: number;
  consultation_fee?: string | number;
  bank_accounts?: DoctorBankAccount[];
  is_active: boolean;
  created_at: string;
};

export type DoctorProfileUpdatePayload = {
  first_name?: string;
  last_name?: string;
  email?: string;
  session_time?: number;
  consultation_fee?: string | number;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type UserInfo = {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
};

export type AppointmentStatus = "upcoming" | "completed" | "cancelled" | "rejected";

export type ClinicalNote = {
  id?: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  created_at?: string;
  updated_at?: string;
};

export type PrescriptionItem = {
  id?: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type Prescription = {
  id?: number;
  notes: string;
  items: PrescriptionItem[];
  created_at?: string;
  updated_at?: string;
};

export type VisitAttachment = {
  id: number;
  kind: "image" | "voice";
  url: string;
  original_name: string;
  mime_type: string;
  duration_seconds?: number | null;
  sent_via_whatsapp?: boolean;
  transcript_text?: string;
  summary_text?: string;
  summary_status?: "pending" | "ready" | "failed" | "skipped";
  summary_error?: string;
  created_at: string;
};

export type AppointmentPaymentMethod = "bank_transfer" | "cash_at_clinic" | "";
export type AppointmentPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "not_required";
export type AppointmentPaymentOcrStatus =
  | "pending"
  | "passed"
  | "failed"
  | "skipped";

export type Appointment = {
  id: number;
  patient: number;
  patient_uuid?: string;
  patient_name: string;
  patient_phone: string;
  doctor: number;
  doctor_name: string;
  clinic?: number | null;
  clinic_name?: string | null;
  scheduled_at: string;
  token_date: string;
  token_number: number;
  token_code: string;
  status: AppointmentStatus;
  notes: string;
  rejection_reason?: string;
  payment_method?: AppointmentPaymentMethod | string;
  payment_status?: AppointmentPaymentStatus | string;
  payment_amount_expected?: string | number | null;
  payment_amount_received?: string | number | null;
  payment_reference?: string;
  payment_slip?: string | null;
  payment_ocr_status?: AppointmentPaymentOcrStatus | string;
  payment_verified_at?: string | null;
  visit_started_at?: string | null;
  visit_ended_at?: string | null;
  visit_duration_seconds?: number | null;
  attachment_count?: number;
  created_at: string;
  updated_at: string;
  clinical_note?: ClinicalNote | null;
  prescription?: Prescription | null;
  attachments?: VisitAttachment[];
};

export type AvailabilityWindow = {
  start: string;
  end: string;
};

export type AvailableDateOption = {
  date: string;
  label?: string;
  start: string;
  end: string;
  windows?: AvailabilityWindow[];
  booked_count?: number;
  booked_times?: string[];
  clinic_id?: number | null;
};

export type ClinicAvailableDatesResponse = {
  clinic_id: number;
  clinic_name: string;
  dates: AvailableDateOption[];
};

export type PatientLookup = {
  uuid: string;
  name: string;
  phone: string;
};

export type DoctorBookPayload = {
  patient_uuid?: string;
  phone?: string;
  name?: string;
  clinic_id: number;
  token_date: string;
  slot_time: string;
  notes?: string;
};

export type DashboardStats = {
  today_upcoming: number;
  today_completed: number;
  today_rejected: number;
  future_bookings: number;
  total_patients_seen: number;
  upcoming_today: Appointment[];
};

export type DoctorPatientSummary = {
  uuid: string;
  name: string;
  phone: string;
  upcoming_count: number;
  total_visits: number;
  next_appointment: Appointment | null;
};

export type DoctorPatientDetail = {
  uuid: string;
  name: string;
  phone: string;
  total_visits: number;
  total_appointments: number;
  rejected_count: number;
  rejection_rate: number;
  last_visit_date: string | null;
  last_clinical_note: ClinicalNote | null;
  last_prescription: Prescription | null;
  next_appointment: Appointment | null;
  visit_history: Appointment[];
};

export type WhatsAppConnectStatus =
  | "pending"
  | "connected"
  | "disconnected"
  | "error";

export type DoctorWhatsAppStatus = {
  connected: boolean;
  status: WhatsAppConnectStatus | string;
  display_phone: string;
  phone_number_id: string;
  waba_id?: string;
  connected_at?: string | null;
  last_error?: string;
  /** Present when backend DEBUG=True — enables paste-credentials testing UI. */
  manual_connect_allowed?: boolean;
  /** DEBUG-only prefill from server META_WA_* env for testing. */
  manual_connect_defaults?: {
    access_token?: string;
    phone_number_id?: string;
    waba_id?: string;
    display_phone?: string;
  };
};

export type DoctorWhatsAppSession = {
  app_id: string;
  config_id: string;
  state: string;
  signup_url: string;
  redirect_scheme: string;
};
