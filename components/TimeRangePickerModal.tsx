import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Button, useThemedStyles } from "@/components/ui";
import { useTheme } from "@/lib/theme";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseHm(value: string): { h: number; m: number } {
  const [hs, ms] = (value || "09:00").split(":");
  const h = Math.min(23, Math.max(0, parseInt(hs, 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(ms, 10) || 0));
  // Snap to 5-minute steps for a clean picker.
  return { h, m: Math.round(m / 5) * 5 === 60 ? 55 : Math.round(m / 5) * 5 };
}

function formatHm(h: number, m: number) {
  return `${pad2(h)}:${pad2(m)}`;
}

function label12(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${pad2(m)} ${ampm}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type Props = {
  visible: boolean;
  title?: string;
  start: string;
  end: string;
  onCancel: () => void;
  onSave: (start: string, end: string) => void;
};

export function TimeRangePickerModal({
  visible,
  title = "Clinic hours",
  start,
  end,
  onCancel,
  onSave,
}: Props) {
  const { colors, fonts } = useTheme();
  const [startH, setStartH] = useState(9);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(17);
  const [endM, setEndM] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const s = parseHm(start);
    const e = parseHm(end);
    setStartH(s.h);
    setStartM(s.m);
    setEndH(e.h);
    setEndM(e.m);
    setError("");
  }, [visible, start, end]);

  const styles = useThemedStyles((c, f) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.45)",
      justifyContent: "flex-end" as const,
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "88%" as const,
    },
    title: {
      color: c.text,
      fontSize: 20,
      fontFamily: f.serifBold,
      marginBottom: 4,
    },
    subtitle: {
      color: c.muted,
      fontSize: 13,
      fontFamily: f.sans,
      marginBottom: 16,
    },
    section: {
      marginBottom: 16,
    },
    sectionLabel: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 14,
      marginBottom: 8,
    },
    preview: {
      color: c.primary,
      fontFamily: f.sansSemi,
      fontSize: 15,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row" as const,
      gap: 10,
    },
    col: {
      flex: 1,
    },
    colLabel: {
      color: c.muted,
      fontSize: 11,
      fontFamily: f.sansSemi,
      marginBottom: 6,
      textTransform: "uppercase" as const,
    },
    chipScroll: {
      maxHeight: 140,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      marginBottom: 6,
      alignItems: "center" as const,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      color: c.text,
      fontFamily: f.sansSemi,
      fontSize: 14,
    },
    chipTextActive: {
      color: "#fff",
      fontFamily: f.sansBold,
    },
    error: {
      color: c.danger,
      fontFamily: f.sans,
      fontSize: 13,
      marginBottom: 10,
    },
  }));

  const startLabel = useMemo(
    () => label12(startH, startM),
    [startH, startM],
  );
  const endLabel = useMemo(() => label12(endH, endM), [endH, endM]);

  function confirm() {
    const s = startH * 60 + startM;
    const e = endH * 60 + endM;
    if (e !== 0 && s >= e) {
      setError("End time must be after start time.");
      return;
    }
    onSave(formatHm(startH, startM), formatHm(endH, endM));
  }

  function ChipColumn({
    label,
    values,
    selected,
    onSelect,
    format,
  }: {
    label: string;
    values: number[];
    selected: number;
    onSelect: (v: number) => void;
    format: (v: number) => string;
  }) {
    return (
      <View style={styles.col}>
        <Text style={styles.colLabel}>{label}</Text>
        <ScrollView style={styles.chipScroll} nestedScrollEnabled>
          {values.map((v) => {
            const active = v === selected;
            return (
              <Pressable
                key={v}
                onPress={() => onSelect(v)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {format(v)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Pick when you are available (Pakistan time).
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>From</Text>
            <Text style={styles.preview}>{startLabel}</Text>
            <View style={styles.row}>
              <ChipColumn
                label="Hour"
                values={HOURS}
                selected={startH}
                onSelect={setStartH}
                format={(h) => pad2(h)}
              />
              <ChipColumn
                label="Min"
                values={MINUTES}
                selected={startM}
                onSelect={setStartM}
                format={(m) => pad2(m)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>To</Text>
            <Text style={styles.preview}>{endLabel}</Text>
            <View style={styles.row}>
              <ChipColumn
                label="Hour"
                values={HOURS}
                selected={endH}
                onSelect={setEndH}
                format={(h) => pad2(h)}
              />
              <ChipColumn
                label="Min"
                values={MINUTES}
                selected={endM}
                onSelect={setEndM}
                format={(m) => pad2(m)}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Apply hours" onPress={confirm} />
          <View style={{ height: 10 }} />
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
