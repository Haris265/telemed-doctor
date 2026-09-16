import { useMemo, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { TimeRangePickerModal } from "@/components/TimeRangePickerModal";
import { Button, Card, useThemedStyles } from "@/components/ui";
import { countSlotsForRanges } from "@/lib/slots";
import { useTheme } from "@/lib/theme";
import type { AvailabilitySlot, ScheduleSlotInput } from "@/lib/types";

export const WEEKDAY_META = [
  { value: 0, label: "Mon", full: "Monday" },
  { value: 1, label: "Tue", full: "Tuesday" },
  { value: 2, label: "Wed", full: "Wednesday" },
  { value: 3, label: "Thu", full: "Thursday" },
  { value: 4, label: "Fri", full: "Friday" },
  { value: 5, label: "Sat", full: "Saturday" },
  { value: 6, label: "Sun", full: "Sunday" },
] as const;

export type TimeRange = { start_time: string; end_time: string };

export type DaySchedule = {
  enabled: boolean;
  ranges: TimeRange[];
};

export type WeekSchedule = Record<number, DaySchedule>;

function toHm(value: string) {
  const parts = value.split(":");
  if (parts.length < 2) return "09:00";
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

function toApiTime(value: string) {
  return `${toHm(value.trim())}:00`;
}

function label12(hm: string) {
  const [hs, ms] = toHm(hm).split(":").map(Number);
  const ampm = hs >= 12 ? "PM" : "AM";
  const h12 = hs % 12 || 12;
  return `${h12}:${String(ms).padStart(2, "0")} ${ampm}`;
}

export function defaultWeekSchedule(): WeekSchedule {
  return Object.fromEntries(
    WEEKDAY_META.map((d) => [
      d.value,
      { enabled: false, ranges: [{ start_time: "09:00", end_time: "17:00" }] },
    ]),
  ) as WeekSchedule;
}

export function slotsToWeekSchedule(slots: AvailabilitySlot[]): WeekSchedule {
  const draft = defaultWeekSchedule();
  const byDay = new Map<number, TimeRange[]>();
  for (const slot of slots) {
    if (!slot.is_active) continue;
    if (slot.specific_date) continue;
    const list = byDay.get(slot.weekday) || [];
    list.push({
      start_time: toHm(slot.start_time),
      end_time: toHm(slot.end_time),
    });
    byDay.set(slot.weekday, list);
  }
  for (const [weekday, ranges] of byDay) {
    ranges.sort((a, b) => a.start_time.localeCompare(b.start_time));
    draft[weekday] = {
      enabled: ranges.length > 0,
      ranges: ranges.length
        ? ranges
        : [{ start_time: "09:00", end_time: "17:00" }],
    };
  }
  return draft;
}

export function weekScheduleToSlots(schedule: WeekSchedule): {
  slots: ScheduleSlotInput[];
  error: string | null;
} {
  const slots: ScheduleSlotInput[] = [];
  for (const day of WEEKDAY_META) {
    const row = schedule[day.value];
    if (!row?.enabled) continue;
    if (!row.ranges.length) {
      return { slots: [], error: `${day.full}: add at least one time range.` };
    }
    const normalized = row.ranges.map((r) => ({
      start: toHm(r.start_time),
      end: toHm(r.end_time),
    }));
    for (const r of normalized) {
      if (!/^\d{2}:\d{2}$/.test(r.start) || !/^\d{2}:\d{2}$/.test(r.end)) {
        return {
          slots: [],
          error: `Invalid time on ${day.full}.`,
        };
      }
      if (r.end !== "00:00" && r.start >= r.end) {
        return {
          slots: [],
          error: `${day.full}: end must be after start (${label12(r.start)}–${label12(r.end)}).`,
        };
      }
    }
    const sorted = [...normalized].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        return {
          slots: [],
          error: `${day.full}: overlapping hours. Adjust your ranges.`,
        };
      }
    }
    for (const r of sorted) {
      slots.push({
        weekday: day.value,
        start_time: toApiTime(r.start),
        end_time: toApiTime(r.end),
        is_active: true,
      });
    }
  }
  return { slots, error: null };
}

type Props = {
  value: WeekSchedule;
  onChange: (next: WeekSchedule) => void;
  sessionMinutes?: number;
};

export function WeeklyScheduleEditor({
  value,
  onChange,
  sessionMinutes = 15,
}: Props) {
  const { colors } = useTheme();
  const [selectedDay, setSelectedDay] = useState(0);
  const [picker, setPicker] = useState<{
    rangeIndex: number;
    start: string;
    end: string;
  } | null>(null);

  const styles = useThemedStyles((c, f) => ({
    strip: {
      flexDirection: "row" as const,
      gap: 6,
      marginBottom: 14,
    },
    dayChip: {
      flex: 1,
      alignItems: "center" as const,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    dayChipOpen: {
      borderColor: c.primary,
      backgroundColor: c.bgSoft,
    },
    dayChipSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    dayChipLabel: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 12,
    },
    dayChipLabelOn: {
      color: "#fff",
    },
    dayChipHint: {
      marginTop: 2,
      fontSize: 9,
      color: c.muted,
      fontFamily: f.sans,
    },
    dayChipHintOn: {
      color: "rgba(255,255,255,0.85)",
    },
    panelTitle: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 16,
      marginBottom: 4,
    },
    panelSub: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 13,
      marginBottom: 12,
    },
    openRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 12,
    },
    openLabel: {
      color: c.text,
      fontFamily: f.sansSemi,
      fontSize: 14,
    },
    rangeCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      marginBottom: 8,
    },
    rangeText: {
      flex: 1,
      color: c.text,
      fontFamily: f.sansSemi,
      fontSize: 15,
    },
    rangeMeta: {
      color: c.muted,
      fontSize: 12,
      fontFamily: f.sans,
      marginTop: 2,
    },
    iconBtn: {
      padding: 6,
    },
    preview: {
      marginTop: 8,
      color: c.primary,
      fontFamily: f.sansSemi,
      fontSize: 13,
    },
    quickRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      marginTop: 12,
    },
    quickChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    quickText: {
      color: c.text,
      fontSize: 12,
      fontFamily: f.sansSemi,
    },
    closedBox: {
      paddingVertical: 18,
      alignItems: "center" as const,
    },
    closedText: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 14,
    },
  }));

  const day = value[selectedDay] || {
    enabled: false,
    ranges: [{ start_time: "09:00", end_time: "17:00" }],
  };

  const slotCount = useMemo(() => {
    if (!day.enabled) return 0;
    return countSlotsForRanges(day.ranges, sessionMinutes);
  }, [day, sessionMinutes]);

  function patchDay(weekday: number, patch: Partial<DaySchedule>) {
    const current = value[weekday];
    onChange({
      ...value,
      [weekday]: {
        ...current,
        ...patch,
        ranges: patch.ranges ?? current.ranges,
      },
    });
  }

  function setEnabled(enabled: boolean) {
    patchDay(selectedDay, {
      enabled,
      ranges:
        enabled && (!day.ranges.length)
          ? [{ start_time: "09:00", end_time: "17:00" }]
          : day.ranges,
    });
  }

  function addRange() {
    const last = day.ranges[day.ranges.length - 1];
    const nextStart = last?.end_time || "14:00";
    let end = "18:00";
    if (nextStart >= end) end = "21:00";
    patchDay(selectedDay, {
      enabled: true,
      ranges: [...day.ranges, { start_time: nextStart, end_time: end }],
    });
  }

  function removeRange(index: number) {
    const ranges = day.ranges.filter((_, i) => i !== index);
    patchDay(selectedDay, {
      ranges: ranges.length
        ? ranges
        : [{ start_time: "09:00", end_time: "17:00" }],
      enabled: ranges.length > 0 ? day.enabled : false,
    });
  }

  function applyMonFri() {
    const next = { ...value };
    for (let d = 0; d <= 4; d++) {
      next[d] = {
        enabled: true,
        ranges: [{ start_time: "09:00", end_time: "17:00" }],
      };
    }
    for (let d = 5; d <= 6; d++) {
      next[d] = {
        enabled: false,
        ranges: [{ start_time: "09:00", end_time: "17:00" }],
      };
    }
    onChange(next);
    setSelectedDay(0);
  }

  function copyToAll() {
    const template: DaySchedule = {
      enabled: day.enabled,
      ranges: day.ranges.map((r) => ({ ...r })),
    };
    const next = { ...value };
    for (const meta of WEEKDAY_META) {
      next[meta.value] = {
        enabled: template.enabled,
        ranges: template.ranges.map((r) => ({ ...r })),
      };
    }
    onChange(next);
  }

  const selectedMeta = WEEKDAY_META[selectedDay];

  return (
    <View>
      <View style={styles.strip}>
        {WEEKDAY_META.map((meta) => {
          const row = value[meta.value];
          const open = Boolean(row?.enabled && row.ranges.length);
          const selected = selectedDay === meta.value;
          return (
            <Pressable
              key={meta.value}
              onPress={() => setSelectedDay(meta.value)}
              style={[
                styles.dayChip,
                open && styles.dayChipOpen,
                selected && styles.dayChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.dayChipLabel,
                  selected && styles.dayChipLabelOn,
                ]}
              >
                {meta.label}
              </Text>
              <Text
                style={[styles.dayChipHint, selected && styles.dayChipHintOn]}
              >
                {open ? "Open" : "Off"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <Text style={styles.panelTitle}>{selectedMeta.full}</Text>
        <Text style={styles.panelSub}>
          Set when patients can book this day. Add morning and evening shifts if
          needed.
        </Text>

        <View style={styles.openRow}>
          <Text style={styles.openLabel}>
            {day.enabled ? "Open for bookings" : "Closed"}
          </Text>
          <Switch
            value={day.enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        {day.enabled ? (
          <>
            {day.ranges.map((range, index) => (
              <Pressable
                key={`${range.start_time}-${range.end_time}-${index}`}
                onPress={() =>
                  setPicker({
                    rangeIndex: index,
                    start: range.start_time,
                    end: range.end_time,
                  })
                }
                style={styles.rangeCard}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rangeText}>
                    {label12(range.start_time)} – {label12(range.end_time)}
                  </Text>
                  <Text style={styles.rangeMeta}>Tap to edit hours</Text>
                </View>
                <Pressable
                  onPress={() => removeRange(index)}
                  hitSlop={10}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </Pressable>
            ))}
            <Button label="Add time range" variant="secondary" onPress={addRange} />
            <Text style={styles.preview}>
              ~{slotCount} visit slot{slotCount === 1 ? "" : "s"} with{" "}
              {sessionMinutes}-min sessions
            </Text>
          </>
        ) : (
          <View style={styles.closedBox}>
            <Text style={styles.closedText}>This day is closed.</Text>
          </View>
        )}

        <View style={styles.quickRow}>
          <Pressable style={styles.quickChip} onPress={applyMonFri}>
            <Text style={styles.quickText}>Mon–Fri 9–5</Text>
          </Pressable>
          <Pressable style={styles.quickChip} onPress={copyToAll}>
            <Text style={styles.quickText}>Copy day to all</Text>
          </Pressable>
        </View>
      </Card>

      <TimeRangePickerModal
        visible={picker != null}
        title={`${selectedMeta.full} hours`}
        start={picker?.start || "09:00"}
        end={picker?.end || "17:00"}
        onCancel={() => setPicker(null)}
        onSave={(start, end) => {
          if (picker == null) return;
          const ranges = day.ranges.map((r, i) =>
            i === picker.rangeIndex
              ? { start_time: start, end_time: end }
              : r,
          );
          patchDay(selectedDay, { enabled: true, ranges });
          setPicker(null);
        }}
      />
    </View>
  );
}
