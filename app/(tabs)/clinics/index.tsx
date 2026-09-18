import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { LoadingState } from "@/components/LoadingState";
import {
  Button,
  Card,
  Empty,
  ErrorText,
  Input,
  Screen,
  Subtitle,
  Title,
  useThemedStyles,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  hasClinicFieldErrors,
  validateClinicForm,
  type ClinicFieldErrors,
} from "@/lib/clinicForm";
import { formatPkMobile, pkMobileHint } from "@/lib/pkPhone";
import type { ClinicFormPayload, DoctorClinic } from "@/lib/types";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

const emptyForm: ClinicFormPayload = {
  name: "",
  address: "",
  city: "",
  area: "",
  phone: "",
  is_primary: false,
};

function clinicToForm(item: DoctorClinic): ClinicFormPayload {
  return {
    name: item.clinic.name,
    address: item.clinic.address,
    city: item.clinic.city || "",
    area: item.clinic.area || "",
    phone: formatPkMobile(item.clinic.phone || ""),
    is_primary: item.is_primary,
  };
}

export default function ClinicsScreen() {
  const { colors, fonts } = useTheme();
  const styles = useThemedStyles((c, f) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 12,
    },
    name: {
      color: c.text,
      fontSize: 17,
      fontFamily: f.sansBold,
      flex: 1,
    },
    meta: {
      color: c.muted,
      fontSize: 13,
      fontFamily: f.sans,
      marginTop: 4,
      lineHeight: 18,
    },
    badge: {
      backgroundColor: "rgba(15,118,110,0.12)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    badgeText: {
      color: c.primary,
      fontSize: 11,
      fontFamily: f.sansBold,
    },
    actions: {
      flexDirection: "row" as const,
      gap: 8,
      marginTop: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 10,
    },
    actionDanger: {
      borderColor: "rgba(185,28,28,0.35)",
      backgroundColor: "rgba(185,28,28,0.08)",
    },
    actionText: {
      color: c.text,
      fontSize: 13,
      fontFamily: f.sansSemi,
    },
    actionDangerText: {
      color: c.danger,
      fontSize: 13,
      fontFamily: f.sansSemi,
    },
    scheduleLink: {
      marginTop: 10,
      color: c.primary,
      fontSize: 13,
      fontFamily: f.sansBold,
    },
    modalTitle: {
      color: c.text,
      fontSize: 20,
      fontFamily: f.serifBold,
    },
  }));

  const [clinics, setClinics] = useState<DoctorClinic[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorClinic | null>(null);
  const [form, setForm] = useState<ClinicFormPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ClinicFieldErrors>({});

  const load = useCallback(async () => {
    const data = await api.clinics();
    setClinics(data);
  }, []);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(item: DoctorClinic) {
    setEditing(item);
    setForm(clinicToForm(item));
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function patchForm<K extends keyof ClinicFormPayload>(
    key: K,
    value: ClinicFormPayload[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as keyof ClinicFieldErrors]) return prev;
      const next = { ...prev };
      delete next[key as keyof ClinicFieldErrors];
      return next;
    });
  }

  async function onSave() {
    const errors = validateClinicForm(form);
    setFieldErrors(errors);
    if (hasClinicFieldErrors(errors)) {
      setFormError(null);
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city?.trim() || "",
      area: form.area?.trim() || "",
      phone: form.phone?.trim() || "",
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.updateClinic(editing.id, payload);
      } else {
        await api.createClinic({
          ...payload,
          is_primary: clinics.length === 0,
        });
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setFieldErrors({});
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save clinic.");
    } finally {
      setSaving(false);
    }
  }

  function onDelete(item: DoctorClinic) {
    Alert.alert(
      "Delete clinic",
      `Delete "${item.clinic.name}" and its schedule? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteClinic(item.id);
              await load();
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Could not delete clinic.",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
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
      >
        <Title>My Clinics</Title>
        <Subtitle>
          Add clinics where you practice and set weekly timings for each.
        </Subtitle>

        <View style={{ height: 16 }} />
        <Button label="Add clinic" onPress={openCreate} />

        <View style={{ height: 16 }} />
        {error ? <ErrorText>{error}</ErrorText> : null}

        {loading && !refreshing && clinics.length === 0 ? (
          <LoadingState label="Loading clinics…" />
        ) : clinics.length === 0 ? (
          <Empty
            title="No clinics yet"
            body="Add your clinic address, then set open hours so patients can book."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {clinics.map((item) => (
              <Card key={item.id}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.clinic.name}</Text>
                  {item.is_primary ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Primary</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  {[item.clinic.area, item.clinic.city]
                    .filter(Boolean)
                    .join(", ") || item.clinic.address}
                </Text>
                <Text style={styles.meta}>{item.clinic.address}</Text>
                <Text style={styles.meta}>
                  {item.schedule_count > 0
                    ? `${item.schedule_count} timing slot${item.schedule_count === 1 ? "" : "s"}`
                    : "No schedule set"}
                </Text>

                <Pressable onPress={() => router.push(`/(tabs)/clinics/${item.id}`)}>
                  <Text style={styles.scheduleLink}>Manage schedule →</Text>
                </Pressable>

                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => openEdit(item)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.text} />
                    <Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionDanger]}
                    onPress={() => onDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={styles.actionDangerText}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomSheetModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        keyboardAvoiding
      >
        <Text style={styles.modalTitle}>
          {editing ? "Edit clinic" : "Add clinic"}
        </Text>
        <View style={{ height: 12 }} />
        <Input
          label="Clinic name"
          required
          value={form.name}
          error={fieldErrors.name}
          onChangeText={(name) => patchForm("name", name)}
          placeholder="e.g. City Clinic"
        />
        <View style={{ height: 10 }} />
        <Input
          label="Address"
          required
          value={form.address}
          error={fieldErrors.address}
          onChangeText={(address) => patchForm("address", address)}
          placeholder="e.g. Street address"
        />
        <View style={{ height: 10 }} />
        <Input
          label="City"
          required
          value={form.city}
          error={fieldErrors.city}
          onChangeText={(city) => patchForm("city", city)}
          placeholder="e.g. Karachi"
        />
        <View style={{ height: 10 }} />
        <Input
          label="Area"
          required
          value={form.area}
          error={fieldErrors.area}
          onChangeText={(area) => patchForm("area", area)}
          placeholder="e.g. Gulshan"
        />
        <View style={{ height: 10 }} />
        <Input
          label="Phone"
          hint="optional"
          value={form.phone}
          error={fieldErrors.phone}
          onChangeText={(phone) => patchForm("phone", formatPkMobile(phone))}
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
          label={editing ? "Update clinic" : "Save clinic"}
          loading={saving}
          onPress={onSave}
        />
        <ErrorText>{formError}</ErrorText>
      </BottomSheetModal>
    </Screen>
  );
}
