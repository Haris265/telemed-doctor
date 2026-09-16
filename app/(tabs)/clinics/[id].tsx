import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DayScheduleEditor,
  dayRangesToApiSlots,
  dayScheduleFromSlots,
  formatDateLabel,
  validateDayRanges,
  weekdayFullName,
} from "@/components/DayScheduleEditor";
import { LoadingState } from "@/components/LoadingState";
import { MonthCalendar } from "@/components/MonthCalendar";
import {
  WeeklyScheduleEditor,
  defaultWeekSchedule,
  slotsToWeekSchedule,
  weekScheduleToSlots,
  type DaySchedule,
  type WeekSchedule,
} from "@/components/WeeklyScheduleEditor";
import {
  Button,
  Card,
  ErrorText,
  Input,
  Screen,
  Subtitle,
  Title,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pakistanParts, upcomingOpenDateKeys } from "@/lib/slots";
import type { AvailabilitySlot, ClinicFormPayload, DoctorClinic } from "@/lib/types";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

export default function ClinicScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clinicLinkId = Number(id);
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const { doctor } = useAuth();
  const sessionMins = doctor?.session_time || 15;

  const [link, setLink] = useState<DoctorClinic | null>(null);
  const [allSlots, setAllSlots] = useState<AvailabilitySlot[]>([]);
  const [schedule, setSchedule] = useState<WeekSchedule>(defaultWeekSchedule);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [daySaving, setDaySaving] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  const todayKey = pakistanParts().dateKey;
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const selectedDateRef = useRef<string | null>(todayKey);
  selectedDateRef.current = selectedDate;
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [y, m] = todayKey.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [dayDraft, setDayDraft] = useState<DaySchedule>({
    enabled: false,
    ranges: [{ start_time: "09:00", end_time: "17:00" }],
  });
  const [daySource, setDaySource] = useState<
    "override" | "closed" | "weekly" | "empty"
  >("empty");
  const [weeklyOpen, setWeeklyOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ClinicFormPayload>({
    name: "",
    address: "",
    city: "",
    area: "",
    phone: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const applyDayFromSlots = useCallback(
    (dateKey: string, slots: AvailabilitySlot[], weekly: WeekSchedule) => {
      const resolved = dayScheduleFromSlots(dateKey, slots, weekly);
      setDayDraft(resolved.schedule);
      setDaySource(resolved.source);
      setDayError(null);
    },
    [],
  );

  const load = useCallback(async () => {
    const [clinic, slots] = await Promise.all([
      api.clinic(clinicLinkId),
      api.clinicAvailability(clinicLinkId),
    ]);
    setLink(clinic);
    setAllSlots(slots);
    const weekly = slotsToWeekSchedule(slots);
    setSchedule(weekly);
    const dateKey = selectedDateRef.current || pakistanParts().dateKey;
    if (!selectedDateRef.current) {
      setSelectedDate(dateKey);
    }
    applyDayFromSlots(dateKey, slots, weekly);
  }, [clinicLinkId, applyDayFromSlots]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  const title = useMemo(
    () => link?.clinic.name || "Clinic schedule",
    [link?.clinic.name],
  );

  const { openDates, closedDates } = useMemo(() => {
    const open = upcomingOpenDateKeys(
      Object.entries(schedule).flatMap(([weekday, day]) =>
        day.enabled
          ? day.ranges.map((r) => ({
              weekday: Number(weekday),
              start_time: r.start_time,
              end_time: r.end_time,
              is_active: true,
            }))
          : [],
      ),
      93,
    );
    const closed = new Set<string>();
    for (const slot of allSlots) {
      if (!slot.specific_date) continue;
      if (slot.is_active) {
        open.add(slot.specific_date);
        closed.delete(slot.specific_date);
      } else {
        // Only mark closed if no active override windows for that date.
        const hasActive = allSlots.some(
          (s) => s.specific_date === slot.specific_date && s.is_active,
        );
        if (!hasActive) {
          open.delete(slot.specific_date);
          closed.add(slot.specific_date);
        }
      }
    }
    // Active date overrides that aren't from weekly already in open.
    for (const slot of allSlots) {
      if (slot.specific_date && slot.is_active) {
        open.add(slot.specific_date);
      }
    }
    return { openDates: open, closedDates: closed };
  }, [allSlots, schedule]);

  function onSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
    applyDayFromSlots(dateKey, allSlots, schedule);
  }

  async function reloadSlotsKeepingDate(dateKey: string) {
    const slots = await api.clinicAvailability(clinicLinkId);
    setAllSlots(slots);
    const weekly = slotsToWeekSchedule(slots);
    setSchedule(weekly);
    applyDayFromSlots(dateKey, slots, weekly);
  }

  async function onSaveDay() {
    if (!selectedDate) return;
    const err = validateDayRanges(dayDraft.ranges);
    if (err) {
      setDayError(err);
      return;
    }
    setDaySaving(true);
    setDayError(null);
    try {
      await api.replaceClinicDateAvailability(clinicLinkId, {
        date: selectedDate,
        closed: false,
        slots: dayRangesToApiSlots(dayDraft.ranges),
      });
      await reloadSlotsKeepingDate(selectedDate);
      Alert.alert("Saved", `Saved for ${formatDateLabel(selectedDate)}.`);
    } catch (e) {
      setDayError(e instanceof Error ? e.message : "Could not save day hours.");
    } finally {
      setDaySaving(false);
    }
  }

  async function onMarkClosed() {
    if (!selectedDate) return;
    setDaySaving(true);
    setDayError(null);
    try {
      await api.replaceClinicDateAvailability(clinicLinkId, {
        date: selectedDate,
        closed: true,
        slots: [],
      });
      await reloadSlotsKeepingDate(selectedDate);
      Alert.alert(
        "Closed",
        `Marked closed for ${formatDateLabel(selectedDate)} (weekly hours ignored).`,
      );
    } catch (e) {
      setDayError(e instanceof Error ? e.message : "Could not mark day closed.");
    } finally {
      setDaySaving(false);
    }
  }

  async function onClearOverride() {
    if (!selectedDate) return;
    setDaySaving(true);
    setDayError(null);
    try {
      await api.replaceClinicDateAvailability(clinicLinkId, {
        date: selectedDate,
        closed: false,
        slots: [],
      });
      await reloadSlotsKeepingDate(selectedDate);
      Alert.alert("Cleared", "Date override removed. Weekly hours apply again.");
    } catch (e) {
      setDayError(
        e instanceof Error ? e.message : "Could not clear date override.",
      );
    } finally {
      setDaySaving(false);
    }
  }

  async function onRepeatWeekly() {
    if (!selectedDate) return;
    const err = validateDayRanges(dayDraft.ranges);
    if (err) {
      setDayError(err);
      return;
    }
    const weekday = (() => {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      return (js + 6) % 7;
    })();

    setDaySaving(true);
    setDayError(null);
    try {
      // Save date override first so this day is explicit.
      await api.replaceClinicDateAvailability(clinicLinkId, {
        date: selectedDate,
        closed: false,
        slots: dayRangesToApiSlots(dayDraft.ranges),
      });

      const nextWeekly: WeekSchedule = {
        ...schedule,
        [weekday]: {
          enabled: true,
          ranges: dayDraft.ranges.map((r) => ({ ...r })),
        },
      };
      const { slots, error: validationError } = weekScheduleToSlots(nextWeekly);
      if (validationError) {
        setDayError(validationError);
        setDaySaving(false);
        return;
      }
      await api.replaceClinicAvailability(clinicLinkId, slots);
      await reloadSlotsKeepingDate(selectedDate);
      Alert.alert(
        "Saved",
        `Saved for ${formatDateLabel(selectedDate)} and every ${weekdayFullName(selectedDate)}.`,
      );
    } catch (e) {
      setDayError(
        e instanceof Error ? e.message : "Could not save weekly repeat.",
      );
    } finally {
      setDaySaving(false);
    }
  }

  async function onSaveWeekly() {
    const { slots, error: validationError } = weekScheduleToSlots(schedule);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await api.replaceClinicAvailability(clinicLinkId, slots);
      Alert.alert("Saved", "Default weekly schedule updated.");
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function onMakePrimary() {
    if (!link || link.is_primary) return;
    try {
      const updated = await api.updateClinic(link.id, { is_primary: true });
      setLink(updated);
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Could not update primary clinic.",
      );
    }
  }

  function openEdit() {
    if (!link) return;
    setEditForm({
      name: link.clinic.name,
      address: link.clinic.address,
      city: link.clinic.city || "",
      area: link.clinic.area || "",
      phone: link.clinic.phone || "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function onSaveClinicDetails() {
    if (!link) return;
    if (!editForm.name.trim() || !editForm.address.trim()) {
      setEditError("Clinic name and address are required.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await api.updateClinic(link.id, {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        city: editForm.city?.trim() || "",
        area: editForm.area?.trim() || "",
        phone: editForm.phone?.trim() || "",
      });
      setLink(updated);
      setEditOpen(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not update clinic.");
    } finally {
      setEditSaving(false);
    }
  }

  function onDeleteClinic() {
    if (!link) return;
    Alert.alert(
      "Delete clinic",
      `Delete "${link.clinic.name}" and its schedule?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteClinic(link.id);
              router.replace("/(tabs)/clinics");
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Could not delete clinic.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (!Number.isFinite(clinicLinkId)) {
    return (
      <Screen>
        <ErrorText>Invalid clinic.</ErrorText>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: "Clinic schedule" }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={onRefresh}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Title>{title}</Title>
        <Subtitle>
          Select a date to set your hours. Patients book on days you open
          (Pakistan time).
        </Subtitle>

        <View style={{ height: 16 }} />

        {error ? <ErrorText>{error}</ErrorText> : null}

        {loading && !link ? (
          <LoadingState label="Loading schedule…" />
        ) : (
          <>
            {link ? (
              <Card style={{ marginBottom: 14, gap: 4 }}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {link.clinic.address}
                </Text>
                {(link.clinic.area || link.clinic.city) && (
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {[link.clinic.area, link.clinic.city]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
                {link.clinic.phone ? (
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {link.clinic.phone}
                  </Text>
                ) : null}
                {!link.is_primary ? (
                  <Pressable onPress={onMakePrimary} style={{ marginTop: 8 }}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.sansBold,
                        fontSize: 13,
                      }}
                    >
                      Set as primary clinic
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={{
                      color: colors.primary,
                      marginTop: 6,
                      fontSize: 12,
                      fontFamily: fonts.sansBold,
                    }}
                  >
                    Primary clinic
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Edit clinic"
                      variant="secondary"
                      onPress={openEdit}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Delete"
                      variant="danger"
                      loading={deleting}
                      onPress={onDeleteClinic}
                    />
                  </View>
                </View>
              </Card>
            ) : null}

            <MonthCalendar
              availableDates={openDates}
              closedDates={closedDates}
              selected={selectedDate}
              onSelect={onSelectDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              selectAnyFromMin
              minSelectableDate={todayKey}
            />

            <View style={{ height: 14 }} />

            {selectedDate ? (
              <>
                <DayScheduleEditor
                  dateKey={selectedDate}
                  value={dayDraft}
                  source={daySource}
                  onChange={setDayDraft}
                  sessionMinutes={sessionMins}
                  saving={daySaving}
                  onSave={onSaveDay}
                  onMarkClosed={onMarkClosed}
                  onClearOverride={onClearOverride}
                  onRepeatWeekly={onRepeatWeekly}
                />
                <ErrorText>{dayError}</ErrorText>
              </>
            ) : null}

            <View style={{ height: 18 }} />

            <Pressable
              onPress={() => setWeeklyOpen((v) => !v)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                marginBottom: weeklyOpen ? 12 : 0,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.sansBold,
                    fontSize: 15,
                  }}
                >
                  Default weekly hours
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Recurring Mon–Sun schedule when a date has no override
                </Text>
              </View>
              <Ionicons
                name={weeklyOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.muted}
              />
            </Pressable>

            {weeklyOpen ? (
              <>
                <WeeklyScheduleEditor
                  value={schedule}
                  onChange={setSchedule}
                  sessionMinutes={sessionMins}
                />
                <ErrorText>{saveError}</ErrorText>
                <View style={{ height: 16 }} />
                <Button
                  label="Save weekly schedule"
                  loading={saving}
                  onPress={onSaveWeekly}
                />
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(15,23,42,0.45)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                paddingBottom: Math.max(insets.bottom, 20),
                maxHeight: "90%",
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontFamily: fonts.serifBold,
                }}
              >
                Edit clinic
              </Text>
              <View style={{ height: 12 }} />
              <Input
                label="Clinic name"
                value={editForm.name}
                onChangeText={(name) => setEditForm((f) => ({ ...f, name }))}
              />
              <View style={{ height: 10 }} />
              <Input
                label="Address"
                value={editForm.address}
                onChangeText={(address) =>
                  setEditForm((f) => ({ ...f, address }))
                }
              />
              <View style={{ height: 10 }} />
              <Input
                label="City"
                value={editForm.city}
                onChangeText={(city) => setEditForm((f) => ({ ...f, city }))}
              />
              <View style={{ height: 10 }} />
              <Input
                label="Area"
                value={editForm.area}
                onChangeText={(area) => setEditForm((f) => ({ ...f, area }))}
              />
              <View style={{ height: 10 }} />
              <Input
                label="Phone"
                value={editForm.phone}
                onChangeText={(phone) => setEditForm((f) => ({ ...f, phone }))}
                keyboardType="phone-pad"
              />
              <ErrorText>{editError}</ErrorText>
              <View style={{ height: 16 }} />
              <Button
                label="Update clinic"
                loading={editSaving}
                onPress={onSaveClinicDetails}
              />
              <View style={{ height: 10 }} />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setEditOpen(false)}
              />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
