import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { MonthCalendar, parseDateKey } from "@/components/MonthCalendar";
import {
  Button,
  Card,
  ErrorText,
  Input,
  Screen,
  Subtitle,
  TextArea,
  Title,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  digitsOnly,
  formatPkMobile,
  pkMobileHint,
} from "@/lib/pkPhone";
import { openSlotsForDate } from "@/lib/slots";
import { useTheme } from "@/lib/theme";
import type {
  AvailableDateOption,
  DoctorClinic,
  DoctorPatientSummary,
} from "@/lib/types";

type PatientMode = "list" | "phone";

function slotLabel(value: string) {
  const [h, m] = value.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m || "00"} ${ampm}`;
}

export default function BookAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    patientUuid?: string;
    patientName?: string;
    patientPhone?: string;
  }>();
  const { doctor } = useAuth();
  const { colors, fonts } = useTheme();

  const [mode, setMode] = useState<PatientMode>("list");
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [clinics, setClinics] = useState<DoctorClinic[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedUuid, setSelectedUuid] = useState(params.patientUuid || "");
  const [selectedName, setSelectedName] = useState(params.patientName || "");
  const [selectedPhone, setSelectedPhone] = useState(params.patientPhone || "");
  const [phone, setPhone] = useState(
    formatPkMobile(params.patientPhone || ""),
  );
  const [newName, setNewName] = useState(params.patientName || "");
  const [lookupHint, setLookupHint] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const [clinicLinkId, setClinicLinkId] = useState<number | null>(null);
  const [clinicId, setClinicId] = useState<number | null>(null);
  const [dates, setDates] = useState<AvailableDateOption[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [tokenDate, setTokenDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { paddingBottom: 100, gap: 14 },
        section: {
          color: colors.text,
          fontSize: 15,
          fontFamily: fonts.sansBold,
          marginBottom: 8,
        },
        modeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
        modeChip: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        },
        modeChipOn: {
          borderColor: colors.primary,
          backgroundColor: colors.primary,
        },
        modeText: {
          color: colors.text,
          fontFamily: fonts.sansSemi,
          fontSize: 13,
        },
        modeTextOn: { color: "#fff" },
        searchBox: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          minHeight: 46,
        },
        searchInput: {
          flex: 1,
          color: colors.text,
          fontSize: 15,
          fontFamily: fonts.sans,
          paddingVertical: 10,
        },
        patientList: { gap: 8, marginTop: 4 },
        patientRow: {
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          gap: 2,
        },
        patientName: {
          color: colors.text,
          fontFamily: fonts.sansBold,
          fontSize: 14,
        },
        patientMeta: {
          color: colors.muted,
          fontFamily: fonts.sans,
          fontSize: 12,
        },
        selectedChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: colors.bgSoft,
        },
        selectedChipBody: { flex: 1, gap: 2 },
        selectedChipTitle: {
          color: colors.primary,
          fontFamily: fonts.sansBold,
          fontSize: 14,
        },
        selectedChipMeta: {
          color: colors.muted,
          fontFamily: fonts.sans,
          fontSize: 12,
        },
        chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        },
        chipOn: {
          borderColor: colors.primary,
          backgroundColor: colors.primary,
        },
        chipText: {
          color: colors.text,
          fontFamily: fonts.sansSemi,
          fontSize: 13,
        },
        chipTextOn: { color: "#fff" },
        slotHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        },
        slotCount: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
        },
        slotGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        },
        slot: {
          width: "30%",
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          paddingVertical: 14,
          paddingHorizontal: 8,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.bgSoft,
        },
        slotOn: {
          borderColor: colors.primary,
          backgroundColor: colors.primary,
        },
        slotLabel: {
          color: colors.text,
          fontFamily: fonts.sansBold,
          fontSize: 14,
        },
        slotLabelOn: {
          color: "#fff",
        },
        slotSub: {
          color: colors.muted,
          fontFamily: fonts.sans,
          fontSize: 11,
        },
        slotSubOn: {
          color: "rgba(255,255,255,0.85)",
        },
        hint: {
          color: colors.muted,
          fontSize: 13,
          fontFamily: fonts.sans,
          marginTop: 6,
        },
        summary: {
          color: colors.text,
          fontFamily: fonts.sansSemi,
          fontSize: 13,
          lineHeight: 20,
        },
        summaryMuted: {
          color: colors.muted,
          fontFamily: fonts.sans,
          fontSize: 13,
        },
        footer: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingTop: 12,
          gap: 8,
        },
        bookBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minHeight: 54,
          borderRadius: 16,
          backgroundColor: colors.primary,
          paddingHorizontal: 18,
        },
        bookBtnDisabled: {
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        },
        bookBtnText: {
          color: "#fff",
          fontFamily: fonts.sansBold,
          fontSize: 16,
        },
        bookBtnTextDisabled: {
          color: colors.muted,
        },
        bookBtnHint: {
          textAlign: "center",
          color: colors.muted,
          fontFamily: fonts.sans,
          fontSize: 12,
        },
      }),
    [colors, fonts],
  );

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [patientList, clinicList] = await Promise.all([
        api.patients(),
        api.clinics(),
      ]);
      setPatients(Array.isArray(patientList) ? patientList : []);
      setClinics(Array.isArray(clinicList) ? clinicList : []);
      if (params.patientUuid) {
        const match = patientList.find((p) => p.uuid === params.patientUuid);
        if (match) {
          setSelectedUuid(match.uuid);
          setSelectedName(match.name);
          setSelectedPhone(match.phone);
          setMode("list");
        } else if (params.patientPhone) {
          setMode("phone");
          setPhone(formatPkMobile(params.patientPhone));
          setNewName(params.patientName || "");
        }
      }
      const primary =
        clinicList.find((c) => c.is_primary) || clinicList[0] || null;
      if (primary) {
        setClinicLinkId(primary.id);
        setClinicId(primary.clinic.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.patientUuid, params.patientName, params.patientPhone]);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (!clinicLinkId) {
      setDates([]);
      setTokenDate("");
      setSlotTime("");
      return;
    }
    const link = clinics.find((c) => c.id === clinicLinkId);
    let cancelled = false;
    (async () => {
      setDatesLoading(true);
      setError("");
      try {
        const res = await api.clinicAvailableDates(clinicLinkId, {
          clinicId: link?.clinic.id ?? clinicId ?? 0,
          clinicName: link?.clinic.name ?? "",
        });
        if (cancelled) return;
        const nextDates = res.dates || [];
        setDates(nextDates);
        setTokenDate("");
        setSlotTime("");
        if (nextDates[0]?.date) {
          setCalendarMonth(parseDateKey(nextDates[0].date));
        }
      } catch (e) {
        if (!cancelled) {
          setDates([]);
          setError(e instanceof Error ? e.message : "Failed to load dates");
        }
      } finally {
        if (!cancelled) setDatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clinicLinkId, clinics, clinicId]);

  const searchResults = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const phoneNum = (p.phone || "").toLowerCase();
        return name.includes(q) || phoneNum.includes(q);
      })
      .slice(0, 20);
  }, [patients, patientQuery]);

  const availableSet = useMemo(
    () => new Set(dates.map((d) => d.date)),
    [dates],
  );

  const selectedDate = useMemo(
    () => dates.find((d) => d.date === tokenDate) || null,
    [dates, tokenDate],
  );

  const slots = useMemo(() => {
    if (!selectedDate || !tokenDate) return [];
    return openSlotsForDate(
      selectedDate,
      doctor?.session_time || 15,
      tokenDate,
    );
  }, [selectedDate, tokenDate, doctor?.session_time]);

  const clinicName = useMemo(() => {
    const link = clinics.find((c) => c.id === clinicLinkId);
    return link?.clinic.name || "";
  }, [clinics, clinicLinkId]);

  const patientSummary =
    mode === "list"
      ? selectedName || "No patient"
      : newName.trim() || phone.trim() || "No patient";

  const bookingSummary = [
    patientSummary,
    clinicName || null,
    tokenDate ? formatDate(tokenDate) : null,
    slotTime ? slotLabel(slotTime) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const canBook =
    !!clinicId &&
    !!tokenDate &&
    !!slotTime &&
    (mode === "list"
      ? !!selectedUuid
      : digitsOnly(phone).length === 11) &&
    !submitting;

  const bookHint = !canBook
    ? mode === "list" && !selectedUuid
      ? "Select a patient to continue"
      : mode === "phone" && digitsOnly(phone).length !== 11
        ? "Enter a valid Pakistani mobile (03XX-XXXXXXX)"
        : !clinicId
          ? "Select a clinic"
          : !tokenDate
            ? "Pick a date on the calendar"
            : !slotTime
              ? "Choose a time slot"
              : ""
    : slotTime
      ? `${formatDate(tokenDate)} · ${slotLabel(slotTime)}`
      : "";

  const onLookup = async () => {
    const digits = digitsOnly(phone);
    if (digits.length !== 11) {
      setLookupHint("Enter a valid Pakistani mobile (03XX-XXXXXXX).");
      return;
    }
    setLookupLoading(true);
    setLookupHint("");
    try {
      const found = await api.lookupPatient(digits);
      if (found) {
        setPhone(formatPkMobile(found.phone));
        setNewName(found.name);
        setLookupHint(`Found: ${found.name}`);
      } else {
        setLookupHint("New patient — enter full name below, then book.");
      }
    } catch (e) {
      setLookupHint(
        e instanceof Error
          ? e.message
          : "Lookup failed — you can still book with name.",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const clearSelectedPatient = () => {
    setSelectedUuid("");
    setSelectedName("");
    setSelectedPhone("");
  };

  const onBook = async () => {
    if (!clinicId) {
      setError("Select a clinic.");
      return;
    }
    if (!tokenDate || !slotTime) {
      setError("Select a date and time slot.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (mode === "list" && !selectedUuid) {
        setError("Select a patient.");
        setSubmitting(false);
        return;
      }
      if (mode === "phone" && digitsOnly(phone).length !== 11) {
        setError("Enter a valid Pakistani mobile (03XX-XXXXXXX).");
        setSubmitting(false);
        return;
      }

      const payload =
        mode === "list"
          ? {
              patient_uuid: selectedUuid,
              clinic_id: clinicId,
              token_date: tokenDate,
              slot_time: slotTime,
              notes: notes.trim() || undefined,
            }
          : {
              phone: digitsOnly(phone),
              name: newName.trim() || undefined,
              clinic_id: clinicId,
              token_date: tokenDate,
              slot_time: slotTime,
              notes: notes.trim() || undefined,
            };

      const appt = await api.bookAppointment(payload);
      router.replace(`/(tabs)/appointments/${appt.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: 16, paddingTop: 12 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <Title>Book appointment</Title>
        <Subtitle>Search a patient, pick a date on the calendar, then a time.</Subtitle>

        <Card>
          <Text style={styles.section}>1. Patient</Text>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode("list")}
              style={[styles.modeChip, mode === "list" && styles.modeChipOn]}
            >
              <Text
                style={[styles.modeText, mode === "list" && styles.modeTextOn]}
              >
                Search patients
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("phone")}
              style={[styles.modeChip, mode === "phone" && styles.modeChipOn]}
            >
              <Text
                style={[styles.modeText, mode === "phone" && styles.modeTextOn]}
              >
                Phone / new
              </Text>
            </Pressable>
          </View>

          {mode === "list" ? (
            <View style={{ gap: 10 }}>
              {selectedUuid ? (
                <View style={styles.selectedChip}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                  <View style={styles.selectedChipBody}>
                    <Text style={styles.selectedChipTitle}>{selectedName}</Text>
                    {selectedPhone ? (
                      <Text style={styles.selectedChipMeta}>{selectedPhone}</Text>
                    ) : null}
                  </View>
                  <Pressable onPress={clearSelectedPatient} hitSlop={10}>
                    <Ionicons name="close-circle" size={20} color={colors.muted} />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput
                  style={styles.searchInput}
                  value={patientQuery}
                  onChangeText={setPatientQuery}
                  placeholder="Search name or phone"
                  placeholderTextColor={colors.muted}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {patientQuery.length > 0 ? (
                  <Pressable onPress={() => setPatientQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>

              {!patientQuery.trim() ? (
                <Text style={styles.hint}>
                  Type to search. Patients appear only when you search.
                </Text>
              ) : searchResults.length ? (
                <View style={styles.patientList}>
                  {searchResults.map((p) => (
                    <Pressable
                      key={p.uuid}
                      onPress={() => {
                        setSelectedUuid(p.uuid);
                        setSelectedName(p.name);
                        setSelectedPhone(p.phone);
                        setPatientQuery("");
                      }}
                      style={styles.patientRow}
                    >
                      <Text style={styles.patientName}>{p.name}</Text>
                      <Text style={styles.patientMeta}>{p.phone}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.hint}>
                  No match. Try another spelling or use Phone / new.
                </Text>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Input
                label="Phone"
                value={phone}
                onChangeText={(v) => setPhone(formatPkMobile(v))}
                keyboardType="phone-pad"
                placeholder="e.g. 0377-7747664"
              />
              <Text style={styles.hint}>{pkMobileHint}</Text>
              <Button
                label={lookupLoading ? "Looking up…" : "Lookup phone"}
                variant="secondary"
                onPress={onLookup}
                loading={lookupLoading}
                disabled={lookupLoading}
              />
              {lookupHint ? <Text style={styles.hint}>{lookupHint}</Text> : null}
              <Input
                label="Full name (required if new)"
                value={newName}
                onChangeText={setNewName}
                placeholder="Patient full name"
              />
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.section}>2. Clinic</Text>
          {clinics.length ? (
            <View style={styles.chipWrap}>
              {clinics.map((link) => {
                const on = clinicLinkId === link.id;
                return (
                  <Pressable
                    key={link.id}
                    onPress={() => {
                      setClinicLinkId(link.id);
                      setClinicId(link.clinic.id);
                    }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {link.clinic.name}
                      {link.is_primary ? " · Primary" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.hint}>
              Add a clinic with a schedule before booking.
            </Text>
          )}
        </Card>

        <Card>
          <Text style={styles.section}>3. Date</Text>
          {datesLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : dates.length ? (
            <MonthCalendar
              availableDates={availableSet}
              selected={tokenDate || null}
              onSelect={(d) => {
                setTokenDate(d);
                setSlotTime("");
              }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
          ) : (
            <Text style={styles.hint}>
              No open dates for this clinic. Set weekly hours in Clinics.
            </Text>
          )}
          {tokenDate ? (
            <Text style={[styles.hint, { marginTop: 10 }]}>
              Selected: {formatDate(tokenDate)}
            </Text>
          ) : null}
        </Card>

        {tokenDate ? (
          <Card>
            <View style={styles.slotHeaderRow}>
              <Text style={[styles.section, { marginBottom: 0 }]}>4. Time slot</Text>
              {slots.length ? (
                <Text style={styles.slotCount}>
                  {slots.length} open · {doctor?.session_time || 15} min
                </Text>
              ) : null}
            </View>
            {slots.length ? (
              <View style={styles.slotGrid}>
                {slots.map((s) => {
                  const on = slotTime === s.value;
                  return (
                    <Pressable
                      key={s.value}
                      onPress={() => setSlotTime(s.value)}
                      style={({ pressed }) => [
                        styles.slot,
                        on && styles.slotOn,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={on ? "#fff" : colors.primary}
                      />
                      <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>
                        {s.label}
                      </Text>
                      <Text style={[styles.slotSub, on && styles.slotSubOn]}>
                        {on ? "Selected" : "Available"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.hint}>No open slots on this date.</Text>
            )}
          </Card>
        ) : null}

        <Card>
          <Text style={styles.section}>5. Notes (optional)</Text>
          <TextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Reason / notes"
            style={{ minHeight: 80 }}
          />
        </Card>

        <Card>
          <Text style={styles.section}>Summary</Text>
          <Text
            style={
              tokenDate && slotTime ? styles.summary : styles.summaryMuted
            }
          >
            {bookingSummary || "Complete the steps above to book."}
          </Text>
        </Card>

        {error ? <ErrorText>{error}</ErrorText> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 }]}>
        {bookHint ? <Text style={styles.bookBtnHint}>{bookHint}</Text> : null}
        <Pressable
          onPress={onBook}
          disabled={!canBook}
          style={({ pressed }) => [
            styles.bookBtn,
            !canBook && styles.bookBtnDisabled,
            pressed && canBook && { opacity: 0.88 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="calendar"
                size={20}
                color={canBook ? "#fff" : colors.muted}
              />
              <Text
                style={[
                  styles.bookBtnText,
                  !canBook && styles.bookBtnTextDisabled,
                ]}
              >
                Confirm booking
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={canBook ? "#fff" : colors.muted}
              />
            </>
          )}
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
