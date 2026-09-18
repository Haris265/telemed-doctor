import { Text, View } from "react-native";
import type { ComponentRef } from "react";

import { Badge, Button, Card, Input, useThemedStyles } from "@/components/ui";

const HOW_TO_STEPS = [
  "Go to developers.facebook.com → open your Meta app",
  "Open WhatsApp → API Setup",
  "Copy Temporary access token, Phone number ID, and WhatsApp Business Account ID",
  "Paste them below and tap Connect for testing",
];

export type ManualConnectFieldKey =
  | "accessToken"
  | "phoneNumberId"
  | "wabaId"
  | "displayPhone";

type FieldAnchor = ComponentRef<typeof View>;

type Props = {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhone: string;
  busy: boolean;
  onChangeAccessToken: (value: string) => void;
  onChangePhoneNumberId: (value: string) => void;
  onChangeWabaId: (value: string) => void;
  onChangeDisplayPhone: (value: string) => void;
  onConnect: () => void;
  onFieldFocus?: (key: ManualConnectFieldKey) => void;
  registerFieldAnchor?: (key: ManualConnectFieldKey, node: FieldAnchor | null) => void;
};

export function WhatsAppManualConnectPanel({
  accessToken,
  phoneNumberId,
  wabaId,
  displayPhone,
  busy,
  onChangeAccessToken,
  onChangePhoneNumberId,
  onChangeWabaId,
  onChangeDisplayPhone,
  onConnect,
  onFieldFocus,
  registerFieldAnchor,
}: Props) {
  const styles = useThemedStyles((c, f) => ({
    card: {
      gap: 12,
      marginTop: 28,
    },
    title: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 16,
    },
    intro: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 13,
      lineHeight: 19,
    },
    howTitle: {
      color: c.text,
      fontFamily: f.sansSemi,
      fontSize: 13,
      marginTop: 4,
    },
    stepRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 10,
    },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: 1,
    },
    stepNum: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 11,
    },
    stepText: {
      flex: 1,
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 13,
      lineHeight: 19,
    },
    fieldBlock: {
      gap: 6,
    },
    helper: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 12,
      lineHeight: 17,
    },
    footer: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
  }));

  return (
    <Card style={styles.card}>
      <Badge label="Testing only" tone="warning" />
      <Text style={styles.title}>Link with Meta API credentials</Text>
      <Text style={styles.intro}>
        Use this when Embedded Signup is not set up yet. Open your Meta Developer
        App → WhatsApp → API Setup, paste the values below, then connect.
        Patients who message this WhatsApp number will use your booking bot on
        the same number.
      </Text>

      <Text style={styles.howTitle}>How to get these values</Text>
      {HOW_TO_STEPS.map((text, index) => (
        <View key={text} style={styles.stepRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNum}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{text}</Text>
        </View>
      ))}

      <View
        style={styles.fieldBlock}
        ref={(node) => registerFieldAnchor?.("accessToken", node)}
        collapsable={false}
      >
        <Input
          label="Access token"
          value={accessToken}
          onChangeText={onChangeAccessToken}
          placeholder="EAA…"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          editable={!busy}
          onFocus={() => onFieldFocus?.("accessToken")}
        />
        <Text style={styles.helper}>
          Long secret from API Setup (“Temporary access token”). Lets PatientCare
          send and receive on your behalf. Temporary tokens expire in about 24
          hours.
        </Text>
      </View>

      <View
        style={styles.fieldBlock}
        ref={(node) => registerFieldAnchor?.("phoneNumberId", node)}
        collapsable={false}
      >
        <Input
          label="Phone number ID"
          value={phoneNumberId}
          onChangeText={onChangePhoneNumberId}
          placeholder="Phone number ID"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          editable={!busy}
          onFocus={() => onFieldFocus?.("phoneNumberId")}
        />
        <Text style={styles.helper}>
          Numeric ID shown next to your test number on API Setup — not the phone
          digits like 0300….
        </Text>
      </View>

      <View
        style={styles.fieldBlock}
        ref={(node) => registerFieldAnchor?.("wabaId", node)}
        collapsable={false}
      >
        <Input
          label="WABA ID"
          value={wabaId}
          onChangeText={onChangeWabaId}
          placeholder="WABA ID"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          editable={!busy}
          onFocus={() => onFieldFocus?.("wabaId")}
        />
        <Text style={styles.helper}>
          WhatsApp Business Account ID on the same API Setup page (or Business
          settings).
        </Text>
      </View>

      <View
        style={styles.fieldBlock}
        ref={(node) => registerFieldAnchor?.("displayPhone", node)}
        collapsable={false}
      >
        <Input
          label="Display phone (optional)"
          value={displayPhone}
          onChangeText={onChangeDisplayPhone}
          placeholder="923001234567"
          keyboardType="phone-pad"
          editable={!busy}
          onFocus={() => onFieldFocus?.("displayPhone")}
        />
        <Text style={styles.helper}>
          Number as patients see it. Leave blank to auto-fetch from Meta.
        </Text>
      </View>

      <Button
        label={busy ? "Connecting…" : "Connect for testing"}
        onPress={onConnect}
        disabled={busy}
      />

      <Text style={styles.footer}>
        After connect, patients message this WhatsApp number. The bot replies
        from the same number and books under your doctor profile.
      </Text>
    </Card>
  );
}
