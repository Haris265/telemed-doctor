import { useCallback, useEffect, useState } from "react";
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
  const [waBusy, setWaBusy] = useState(false);
  const styles = useThemedStyles((c, f) => ({
    label: {
      color: c.muted,
      fontSize: 12,
      fontFamily: f.sansBold,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
      marginTop: 4,
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

  const load = useCallback(async () => {
    await refreshMe();
    try {
      const status = await api.whatsappStatus();
      setWaStatus(status);
    } catch {
      setWaStatus(null);
    }
  }, [refreshMe]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

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
      "Patients will no longer reach you on this WhatsApp number through PatientCare Doctor.",
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
        <Subtitle>Pull down to refresh your account details.</Subtitle>

        <View style={{ height: 20 }} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !refreshing && !doctor ? (
          <LoadingState label="Loading profile…" />
        ) : (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{doctor?.full_name || "—"}</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{doctor?.email || user?.email || "—"}</Text>

            <Text style={styles.label}>Specialities</Text>
            <Text style={styles.value}>
              {doctor?.specialities?.map((s) => s.name).join(", ") || "—"}
            </Text>

            <Text style={styles.label}>Session time</Text>
            <Text style={styles.value}>
              {doctor?.session_time ?? "—"} minutes
            </Text>

            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>
              {doctor?.is_active ? "Active" : "Inactive"}
            </Text>
          </Card>
        )}

        <View style={{ height: 20 }} />

        <Card style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>WhatsApp</Text>
          <Text style={styles.sectionHint}>
            {waStatus?.connected
              ? "Patients can book and receive visit media on your linked WhatsApp Business number."
              : "Follow the steps on the next screen to link your WhatsApp Business number via Meta."}
          </Text>

          <Text style={styles.label}>Connection</Text>
          <Text style={styles.value}>
            {waStatus?.connected
              ? `Connected${waStatus.display_phone ? ` · ${waStatus.display_phone}` : ""}`
              : waStatus?.status === "error"
                ? "Error — reconnect required"
                : "Not connected"}
          </Text>

          {waStatus?.last_error && !waStatus.connected ? (
            <Text style={styles.error}>{waStatus.last_error}</Text>
          ) : null}

          {waStatus?.connected ? (
            <>
              <Button
                label={waBusy ? "Working…" : "Reconnect"}
                variant="secondary"
                onPress={() => router.push("/(tabs)/profile/whatsapp-connect" as Href)}
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
              onPress={() => router.push("/(tabs)/profile/whatsapp-connect" as Href)}
              disabled={waBusy}
            />
          )}
        </Card>

        <View style={{ height: 20 }} />

        <Button label="Sign out" variant="danger" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}
