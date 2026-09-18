import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router } from "expo-router";

import { WhatsAppConnectGuide } from "@/components/WhatsAppConnectGuide";
import {
  WhatsAppManualConnectPanel,
  type ManualConnectFieldKey,
} from "@/components/WhatsAppManualConnectPanel";
import { Button, Screen, Subtitle, Title, useThemedStyles } from "@/components/ui";
import { api } from "@/lib/api";
import { launchWhatsAppConnect } from "@/lib/whatsappConnect";
import { useTheme } from "@/lib/theme";

type FieldAnchor = ComponentRef<typeof View>;

export default function WhatsAppConnectScreen() {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const fieldAnchors = useRef<Partial<Record<ManualConnectFieldKey, FieldAnchor | null>>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manualAllowed, setManualAllowed] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");

  const styles = useThemedStyles((c, f) => ({
    flex: { flex: 1 },
    kav: { flex: 1, backgroundColor: c.bg },
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

  const registerFieldAnchor = useCallback(
    (key: ManualConnectFieldKey, node: FieldAnchor | null) => {
      fieldAnchors.current[key] = node;
    },
    [],
  );

  const scrollFieldIntoView = useCallback((key: ManualConnectFieldKey) => {
    const run = () => {
      const field = fieldAnchors.current[key];
      const scroll = scrollRef.current;
      if (!field || !scroll) return;

      field.measureInWindow((_fx, fy, _fw, fh) => {
        scroll.measureInWindow((_sx, sy, _sw, sh) => {
          const pad = 28;
          const fieldTop = fy;
          const fieldBottom = fy + fh;
          const visibleTop = sy + pad;
          const visibleBottom = sy + sh - pad;
          let delta = 0;
          if (fieldBottom > visibleBottom) {
            delta = fieldBottom - visibleBottom;
          } else if (fieldTop < visibleTop) {
            delta = fieldTop - visibleTop;
          }
          if (delta !== 0) {
            scroll.scrollTo({
              y: Math.max(0, scrollYRef.current + delta),
              animated: true,
            });
          }
        });
      });
    };

    requestAnimationFrame(run);
    setTimeout(run, 120);
    setTimeout(run, 350);
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = e.nativeEvent.contentOffset.y;
    },
    [],
  );

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
        style={styles.kav}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={onScroll}
          scrollEventThrottle={16}
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

          <View style={{ gap: 12 }}>
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
          </View>
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
              onFieldFocus={scrollFieldIntoView}
              registerFieldAnchor={registerFieldAnchor}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
