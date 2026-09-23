import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, type Href } from "expo-router";

import { LoadingState } from "@/components/LoadingState";
import { Button, Card, Screen, Subtitle, Title, useThemedStyles } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";
import type { DoctorWhatsAppStatus } from "@/lib/types";

export default function ProfileScreen() {
  const { doctor, user, signOut, refreshMe } = useAuth();
  const { colors } = useTheme();
  const [waStatus, setWaStatus] = useState<DoctorWhatsAppStatus | null>(null);
  const [waStatusReady, setWaStatusReady] = useState(false);
  const [waBusy, setWaBusy] = useState(false);
  const styles = useThemedStyles((c, f) => ({
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      marginBottom: 4,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: {
      color: "#ffffff",
      fontFamily: f.sansBold,
      fontSize: 20,
      letterSpacing: 0.5,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    headerName: {
      color: c.text,
      fontSize: 20,
      fontFamily: f.sansBold,
    },
    headerEmail: {
      color: c.muted,
      fontSize: 14,
      fontFamily: f.sans,
    },
    field: {
      gap: 2,
    },
    label: {
      color: c.muted,
      fontSize: 12,
      fontFamily: f.sansBold,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    value: {
      color: c.text,
      fontSize: 16,
      fontFamily: f.sansSemi,
    },
    error: {
      color: c.danger,
      marginBottom: 12,
      fontFamily: f.sans,
    },
    sectionTitle: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 16,
      marginBottom: 4,
    },
    sectionHint: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 18,
    },
  }));

  const initials = useMemo(() => {
    const first = doctor?.first_name?.trim()?.[0] || "";
    const last = doctor?.last_name?.trim()?.[0] || "";
    const pair = `${first}${last}`.toUpperCase();
    if (pair) return pair;
    const fromFull = (doctor?.full_name || user?.full_name || "DR")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("");
    return fromFull || "DR";
  }, [doctor, user]);

  const load = useCallback(async () => {
    await refreshMe();
    setWaStatusReady(false);
    try {
      const status = await api.whatsappStatus();
      setWaStatus(status);
    } catch {
      setWaStatus(null);
    } finally {
      setWaStatusReady(true);
    }
  }, [refreshMe]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  function onSignOut() {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of your doctor account?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: signOut },
      ],
    );
  }

  function onDisconnectWhatsApp() {
    Alert.alert(
      "Disconnect WhatsApp",
      "Patients will no longer reach you on this WhatsApp number through Patient Care Doctor.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setWaBusy(true);
            try {
              const status = await api.whatsappDisconnect();
              setWaStatus(status);
            } catch (err) {
              Alert.alert(
                "Disconnect failed",
                err instanceof Error ? err.message : "Please try again.",
              );
            } finally {
              setWaBusy(false);
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
        <Title>Profile</Title>
        <Subtitle>Account details, WhatsApp, and security.</Subtitle>

        <View style={{ height: 20 }} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !refreshing && !doctor ? (
          <LoadingState label="Loading profile…" />
        ) : (
          <Card style={{ gap: 10 }}>
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {doctor?.full_name || "Doctor"}
                </Text>
                <Text style={styles.headerEmail} numberOfLines={1}>
                  {doctor?.email || user?.email || "—"}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Specialities</Text>
              <Text style={styles.value}>
                {doctor?.specialities?.map((s) => s.name).join(", ") || "—"}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Session time</Text>
              <Text style={styles.value}>
                {doctor?.session_time ?? "—"} minutes
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Consultation fee</Text>
              <Text style={styles.value}>
                {doctor?.consultation_fee != null &&
                doctor.consultation_fee !== ""
                  ? `Rs ${doctor.consultation_fee}`
                  : "Not set"}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bank accounts</Text>
              <Text style={styles.value}>
                {doctor?.bank_accounts?.length
                  ? `${doctor.bank_accounts.length} saved${
                      doctor.bank_accounts.some((b) => b.is_primary)
                        ? " · primary set"
                        : ""
                    }`
                  : "None — required for WhatsApp bank transfer"}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>
                {doctor?.is_active ? "Active" : "Inactive"}
              </Text>
            </View>

            <View style={{ height: 8 }} />
            <Button
              label="Edit profile"
              onPress={() => router.push("/(tabs)/profile/edit" as Href)}
            />
            <Button
              label="Manage bank accounts"
              variant="secondary"
              onPress={() =>
                router.push("/(tabs)/profile/bank-accounts" as Href)
              }
            />
            <Button
              label="Change password"
              variant="secondary"
              onPress={() =>
                router.push("/(tabs)/profile/change-password" as Href)
              }
            />
          </Card>
        )}

        <View style={{ height: 20 }} />

        <Card style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>WhatsApp</Text>
          {!waStatusReady ? (
            <LoadingState label="Checking WhatsApp…" />
          ) : (
            <>
              <Text style={styles.sectionHint}>
                {waStatus?.connected
                  ? "Patients can book and receive visit media on your linked WhatsApp Business number."
                  : "Follow the steps on the next screen to link your WhatsApp Business number via Meta."}
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Connection</Text>
                <Text style={styles.value}>
                  {waStatus?.connected
                    ? `Connected${waStatus.display_phone ? ` · ${waStatus.display_phone}` : ""}`
                    : waStatus?.status === "error"
                      ? "Error — reconnect required"
                      : "Not connected"}
                </Text>
              </View>

              {waStatus?.last_error && !waStatus.connected ? (
                <Text style={styles.error}>{waStatus.last_error}</Text>
              ) : null}

              {waStatus?.connected ? (
                <>
                  <Button
                    label={waBusy ? "Working…" : "Reconnect"}
                    variant="secondary"
                    onPress={() =>
                      router.push("/(tabs)/profile/whatsapp-connect" as Href)
                    }
                    disabled={waBusy}
                  />
                  <Button
                    label="Disconnect"
                    variant="danger"
                    onPress={onDisconnectWhatsApp}
                    disabled={waBusy}
                  />
                </>
              ) : (
                <Button
                  label="Connect WhatsApp"
                  onPress={() =>
                    router.push("/(tabs)/profile/whatsapp-connect" as Href)
                  }
                  disabled={waBusy}
                />
              )}
            </>
          )}
        </Card>

        <View style={{ height: 20 }} />

        <Button label="Sign out" variant="danger" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}
