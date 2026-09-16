import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { WhatsAppConnectGuide } from "@/components/WhatsAppConnectGuide";
import { WhatsAppManualConnectPanel } from "@/components/WhatsAppManualConnectPanel";
import { Button, Screen, Subtitle, Title, useThemedStyles } from "@/components/ui";
import { api } from "@/lib/api";
import { launchWhatsAppConnect } from "@/lib/whatsappConnect";
import { useTheme } from "@/lib/theme";

export default function WhatsAppConnectScreen() {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manualAllowed, setManualAllowed] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");

  const styles = useThemedStyles((c, f) => ({
    flex: { flex: 1 },
    error: {
      color: c.danger,
      fontFamily: f.sans,
      marginBottom: 16,
    },
    tip: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 16,
    },
  }));

  useEffect(() => {
    api
      .whatsappStatus()
      .then((status) => {
        setManualAllowed(Boolean(status.manual_connect_allowed));
        const defaults = status.manual_connect_defaults;
        if (!defaults) return;
        if (defaults.access_token) setAccessToken(defaults.access_token);
        if (defaults.phone_number_id) setPhoneNumberId(defaults.phone_number_id);
        if (defaults.waba_id) setWabaId(defaults.waba_id);
        if (defaults.display_phone) setDisplayPhone(defaults.display_phone);
      })
      .catch(() => setManualAllowed(false));
  }, []);

  const scrollManualFieldsIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const onConnect = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const status = await launchWhatsAppConnect();
      Alert.alert(
        "WhatsApp connected",
        status.display_phone
          ? `Linked number: ${status.display_phone}`
          : "Your WhatsApp Business number is linked.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect WhatsApp.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onManualConnect = useCallback(async () => {
    if (!accessToken.trim() || !wabaId.trim() || !phoneNumberId.trim()) {
      setError("Access token, WABA ID, and phone number ID are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const status = await api.whatsappConnectManual({
        access_token: accessToken.trim(),
        waba_id: wabaId.trim(),
        phone_number_id: phoneNumberId.trim(),
        display_phone: displayPhone.trim() || undefined,
      });
      Alert.alert(
        "WhatsApp connected",
        status.display_phone
          ? `Linked number: ${status.display_phone}`
          : "Your WhatsApp Business number is linked.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect WhatsApp.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [accessToken, displayPhone, phoneNumberId, wabaId]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Title>Connect WhatsApp</Title>
          <Subtitle>
            So patients can book and get visit updates on your number.
          </Subtitle>

          <View style={{ height: 20 }} />

          <WhatsAppConnectGuide variant="full" />

          <View style={{ height: 20 }} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {busy ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: 16 }}
            />
          ) : null}

          <Button
            label={busy ? "Connecting…" : "Continue with Meta"}
            onPress={onConnect}
            disabled={busy}
          />
          <Button
            label="Not now"
            variant="secondary"
            onPress={() => router.back()}
            disabled={busy}
          />

          <Text style={styles.tip}>
            Make sure your Meta Business account already has WhatsApp access, then
            approve the permissions Meta requests.
          </Text>

          {manualAllowed ? (
            <WhatsAppManualConnectPanel
              accessToken={accessToken}
              phoneNumberId={phoneNumberId}
              wabaId={wabaId}
              displayPhone={displayPhone}
              busy={busy}
              onChangeAccessToken={setAccessToken}
              onChangePhoneNumberId={setPhoneNumberId}
              onChangeWabaId={setWabaId}
              onChangeDisplayPhone={setDisplayPhone}
              onConnect={onManualConnect}
              onFieldFocus={scrollManualFieldsIntoView}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
