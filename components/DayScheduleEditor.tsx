import { useMemo, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { TimeRangePickerModal } from "@/components/TimeRangePickerModal";
import {
  WEEKDAY_META,
  type DaySchedule,
  type TimeRange,
} from "@/components/WeeklyScheduleEditor";
import { Button, Card, useThemedStyles } from "@/components/ui";
import { countSlotsForRanges } from "@/lib/slots";
import { useTheme } from "@/lib/theme";
import type { AvailabilitySlot, DateScheduleSlotInput } from "@/lib/types";

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

function weekdayFromDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (js + 6) % 7;
}

export function formatDateLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][js];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${short} ${d} ${months[m - 1]} ${y}`;
}

export function weekdayFullName(dateKey: string) {
  const wd = weekdayFromDateKey(dateKey);
  return WEEKDAY_META[wd]?.full || "day";
}

/** Resolve editor state for a date from all availability rows + weekly draft. */
export function dayScheduleFromSlots(
  dateKey: string,
  allSlots: AvailabilitySlot[],
  weekly: Record<number, DaySchedule>,
): {
  schedule: DaySchedule;
  source: "override" | "closed" | "weekly" | "empty";
} {
  const dateRows = allSlots.filter((s) => s.specific_date === dateKey);
  if (dateRows.length) {
    const active = dateRows.filter((s) => s.is_active);
    if (!active.length) {
      return {
        schedule: {
          enabled: false,
          ranges: [{ start_time: "09:00", end_time: "17:00" }],
        },
        source: "closed",
      };
    }
    const ranges = active
      .map((s) => ({
        start_time: toHm(s.start_time),
        end_time: toHm(s.end_time),
      }))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return {
      schedule: { enabled: true, ranges },
      source: "override",
    };
  }

  const wd = weekdayFromDateKey(dateKey);
  const weekDay = weekly[wd];
  if (weekDay?.enabled && weekDay.ranges.length) {
    return {
      schedule: {
        enabled: true,
        ranges: weekDay.ranges.map((r) => ({ ...r })),
      },
      source: "weekly",
    };
  }

  return {
    schedule: {
      enabled: false,
      ranges: [{ start_time: "09:00", end_time: "17:00" }],
    },
    source: "empty",
  };
}

export function validateDayRanges(ranges: TimeRange[]): string | null {
  if (!ranges.length) return "Add at least one time range.";
  const normalized = ranges.map((r) => ({
    start: toHm(r.start_time),
    end: toHm(r.end_time),
  }));
  for (const r of normalized) {
    if (!/^\d{2}:\d{2}$/.test(r.start) || !/^\d{2}:\d{2}$/.test(r.end)) {
      return "Invalid time.";
    }
    if (r.end !== "00:00" && r.start >= r.end) {
      return `End must be after start (${label12(r.start)}–${label12(r.end)}).`;
    }
  }
  const sorted = [...normalized].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      return "Overlapping hours. Adjust your ranges.";
    }
  }
  return null;
}

export function dayRangesToApiSlots(ranges: TimeRange[]): DateScheduleSlotInput[] {
  return [...ranges]
    .map((r) => ({
      start_time: toApiTime(r.start_time),
      end_time: toApiTime(r.end_time),
      is_active: true,
    }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

type Props = {
  dateKey: string;
  value: DaySchedule;
  source: "override" | "closed" | "weekly" | "empty";
  onChange: (next: DaySchedule) => void;
  sessionMinutes?: number;
  saving?: boolean;
  onSave: () => void;
  onMarkClosed: () => void;
  onClearOverride: () => void;
  onRepeatWeekly: () => void;
};

export function DayScheduleEditor({
  dateKey,
  value,
  source,
  onChange,
  sessionMinutes = 15,
  saving = false,
  onSave,
  onMarkClosed,
  onClearOverride,
  onRepeatWeekly,
}: Props) {
  const { colors } = useTheme();
  const [picker, setPicker] = useState<{
    rangeIndex: number;
    start: string;
    end: string;
  } | null>(null);

  const styles = useThemedStyles((c, f) => ({
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
    sourceBadge: {
      alignSelf: "flex-start" as const,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: c.bgSoft,
      marginBottom: 12,
    },
    sourceText: {
      color: c.primary,
      fontSize: 12,
      fontFamily: f.sansSemi,
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
    closedBox: {
      paddingVertical: 18,
      alignItems: "center" as const,
    },
    closedText: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 14,
      textAlign: "center" as const,
    },
    actions: {
      gap: 10,
      marginTop: 14,
    },
    linkRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 12,
      marginTop: 4,
    },
    linkText: {
      color: c.primary,
      fontFamily: f.sansSemi,
      fontSize: 13,
    },
    dangerLink: {
      color: c.danger,
    },
  }));

  const weekdayName = weekdayFullName(dateKey);
  const dateLabel = formatDateLabel(dateKey);

  const sourceLabel =
    source === "override"
      ? "Custom hours for this date"
      : source === "closed"
        ? "Marked closed for this date"
        : source === "weekly"
          ? `Using default ${weekdayName} hours`
          : "No hours yet — add when you're available";

  const slotCount = useMemo(() => {
    if (!value.enabled) return 0;
    return countSlotsForRanges(value.ranges, sessionMinutes);
  }, [value, sessionMinutes]);

  function setEnabled(enabled: boolean) {
    onChange({
      enabled,
      ranges:
        enabled && !value.ranges.length
          ? [{ start_time: "09:00", end_time: "17:00" }]
          : value.ranges,
    });
  }

  function addRange() {
    const last = value.ranges[value.ranges.length - 1];
    const nextStart = last?.end_time || "14:00";
    let end = "18:00";
    if (nextStart >= end) end = "21:00";
    onChange({
      enabled: true,
      ranges: [...value.ranges, { start_time: nextStart, end_time: end }],
    });
  }

  function removeRange(index: number) {
    const ranges = value.ranges.filter((_, i) => i !== index);
    onChange({
      ranges: ranges.length
        ? ranges
        : [{ start_time: "09:00", end_time: "17:00" }],
      enabled: ranges.length > 0 ? value.enabled : false,
    });
  }

  return (
    <Card>
      <Text style={styles.panelTitle}>{dateLabel}</Text>
      <Text style={styles.panelSub}>
        Set when you are available on this day (Pakistan time).
      </Text>

      <View style={styles.sourceBadge}>
        <Text style={styles.sourceText}>{sourceLabel}</Text>
      </View>

      <View style={styles.openRow}>
        <Text style={styles.openLabel}>
          {value.enabled ? "Open for bookings" : "Closed"}
        </Text>
        <Switch
          value={value.enabled}
          onValueChange={setEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>

      {value.enabled ? (
        <>
          {value.ranges.map((range, index) => (
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
          <Text style={styles.closedText}>
            {source === "closed"
              ? "Marked closed for this date (weekly hours ignored)."
              : "No hours yet — add when you're available."}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          label={value.enabled ? "Save day" : "Mark closed"}
          loading={saving}
          onPress={() => {
            if (value.enabled) onSave();
            else onMarkClosed();
          }}
        />
        {value.enabled ? (
          <Button
            label={`Also use every ${weekdayName}`}
            variant="secondary"
            loading={saving}
            onPress={onRepeatWeekly}
          />
        ) : null}
        {source === "override" || source === "closed" ? (
          <View style={styles.linkRow}>
            <Pressable onPress={onClearOverride} disabled={saving}>
              <Text style={[styles.linkText, styles.dangerLink]}>
                Clear date override
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <TimeRangePickerModal
        visible={picker != null}
        title={`${dateLabel} hours`}
        start={picker?.start || "09:00"}
        end={picker?.end || "17:00"}
        onCancel={() => setPicker(null)}
        onSave={(start, end) => {
          if (picker == null) return;
          const ranges = value.ranges.map((r, i) =>
            i === picker.rangeIndex
              ? { start_time: start, end_time: end }
              : r,
          );
          onChange({ enabled: true, ranges });
          setPicker(null);
        }}
      />
    </Card>
  );
}
