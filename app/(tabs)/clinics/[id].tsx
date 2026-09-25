import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";

import { BottomSheetModal } from "@/components/BottomSheetModal";
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
  IconButton,
  Input,
  Screen,
  Subtitle,
  Title,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  hasClinicFieldErrors,
  validateClinicForm,
  type ClinicFieldErrors,
} from "@/lib/clinicForm";
import { formatPkMobile, pkMobileHint } from "@/lib/pkPhone";
import { pakistanParts, upcomingOpenDateKeys } from "@/lib/slots";
import type { AvailabilitySlot, ClinicFormPayload, DoctorClinic } from "@/lib/types";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

export default function ClinicScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clinicLinkId = Number(id);
  const { colors, fonts } = useTheme();
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
  const [editFieldErrors, setEditFieldErrors] = useState<ClinicFieldErrors>({});
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
      phone: formatPkMobile(link.clinic.phone || ""),
    });
    setEditError(null);
    setEditFieldErrors({});
    setEditOpen(true);
  }

  function patchEditForm<K extends keyof ClinicFormPayload>(
    key: K,
    value: ClinicFormPayload[K],
  ) {
    setEditForm((f) => ({ ...f, [key]: value }));
    setEditFieldErrors((prev) => {
      if (!prev[key as keyof ClinicFieldErrors]) return prev;
      const next = { ...prev };
      delete next[key as keyof ClinicFieldErrors];
      return next;
    });
  }

  async function onSaveClinicDetails() {
    if (!link) return;
    const errors = validateClinicForm(editForm);
    setEditFieldErrors(errors);
    if (hasClinicFieldErrors(errors)) {
      setEditError(null);
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
      setEditFieldErrors({});
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
      <Stack.Screen
        options={{
          headerShown: true,
        }}
      />
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
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
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <IconButton
                      name="create-outline"
                      accessibilityLabel="Edit clinic"
                      onPress={openEdit}
                    />
                    <IconButton
                      name="trash-outline"
                      accessibilityLabel="Delete clinic"
                      variant="danger"
                      loading={deleting}
                      onPress={onDeleteClinic}
                    />
                  </View>
                </View>
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

      <BottomSheetModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        keyboardAvoiding
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
          required
          value={editForm.name}
          error={editFieldErrors.name}
          onChangeText={(name) => patchEditForm("name", name)}
          placeholder="e.g. City Clinic"
        />
        <View style={{ height: 10 }} />
        <Input
          label="Address"
          required
          value={editForm.address}
          error={editFieldErrors.address}
          onChangeText={(address) => patchEditForm("address", address)}
          placeholder="e.g. Street address"
        />
        <View style={{ height: 10 }} />
        <Input
          label="City"
          required
          value={editForm.city}
          error={editFieldErrors.city}
          onChangeText={(city) => patchEditForm("city", city)}
          placeholder="e.g. Karachi"
        />
        <View style={{ height: 10 }} />
        <Input
          label="Area"
          required
          value={editForm.area}
          error={editFieldErrors.area}
          onChangeText={(area) => patchEditForm("area", area)}
          placeholder="e.g. Gulshan"
        />
        <View style={{ height: 10 }} />
        <Input
          label="Phone"
          hint="optional"
          value={editForm.phone}
          error={editFieldErrors.phone}
          onChangeText={(phone) =>
            patchEditForm("phone", formatPkMobile(phone))
          }
          placeholder="e.g. 0377-7747664"
          keyboardType="phone-pad"
          maxLength={12}
        />
        <Text
          style={{
            color: colors.muted,
            fontSize: 11,
            fontFamily: fonts.sans,
            marginTop: 4,
          }}
        >
          {pkMobileHint}
        </Text>
        <View style={{ height: 16 }} />
        <Button
          label="Update clinic"
          loading={editSaving}
          onPress={onSaveClinicDetails}
        />
        <ErrorText>{editError}</ErrorText>
      </BottomSheetModal>
    </Screen>
  );
}
