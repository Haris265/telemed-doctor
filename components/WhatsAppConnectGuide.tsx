import { Text, View } from "react-native";

import { useThemedStyles } from "@/components/ui";

const FULL_BEFORE = [
  "WhatsApp Business number ready (or Meta will help you add one)",
  "Access to the Meta / Facebook account that owns or can manage that WhatsApp Business account",
  "Stable internet (a browser opens for Meta signup)",
];

const FULL_STEPS = [
  "Tap Continue with Meta below.",
  "Sign in to Meta if asked.",
  "Choose (or create) your WhatsApp Business account and phone number.",
  "Allow the permissions Meta shows (messaging / management).",
  "Wait until the app returns — you should see your number as Connected.",
];

const COMPACT_BULLETS = [
  "Opens Meta to link your Business WhatsApp",
  "Patients book and get visit updates on that number",
  "Takes about a few minutes",
];

export function WhatsAppConnectGuide({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  const styles = useThemedStyles((c, f) => ({
    sectionLabel: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 15,
      marginBottom: 8,
      marginTop: 4,
    },
    body: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 16,
    },
    after: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
      marginBottom: 8,
    },
    tip: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    list: {
      gap: 10,
      marginBottom: 16,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 10,
    },
    badge: {
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
    badgeText: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 11,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
      marginTop: 7,
    },
    itemText: {
      flex: 1,
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 14,
      lineHeight: 20,
    },
  }));

  if (variant === "compact") {
    return (
      <View style={styles.list}>
        {COMPACT_BULLETS.map((text) => (
          <View key={text} style={styles.row}>
            <View style={styles.bulletDot} />
            <Text style={styles.itemText}>{text}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.body}>
        Patients message your WhatsApp Business number to book appointments and
        receive visit media. PatientCare Doctor links that number through Meta — you keep
        control of the Business account.
      </Text>

      <Text style={styles.sectionLabel}>Before you start</Text>
      <View style={styles.list}>
        {FULL_BEFORE.map((text) => (
          <View key={text} style={styles.row}>
            <View style={styles.bulletDot} />
            <Text style={styles.itemText}>{text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Steps</Text>
      <View style={styles.list}>
        {FULL_STEPS.map((text, index) => (
          <View key={text} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.itemText}>{text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.after}>
        After connect: Profile → WhatsApp shows the linked number. You can
        reconnect or disconnect anytime.
      </Text>

      <Text style={styles.tip}>
        Tip: If Meta says you lack access, ask your clinic admin to add you to
        the Business portfolio, then try again.
      </Text>
    </View>
  );
}
