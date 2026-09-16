import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Redirect, Stack, useRouter, useSegments, type Href } from "expo-router";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { WhatsAppConnectGuide } from "@/components/WhatsAppConnectGuide";
import { Button, useThemedStyles } from "@/components/ui";
import { ErrorBoundary as GlobalErrorBoundary } from "@/components/ErrorBoundary";
import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { ThemeProvider, useTheme } from "@/lib/theme";

export { ErrorBoundary } from "expo-router";

const WA_SKIP_KEY = "opd_whatsapp_connect_skipped";

function WhatsAppConnectPrompt({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const styles = useThemedStyles((c, f) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(8, 14, 24, 0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
      gap: 12,
    },
    title: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 18,
    },
    body: {
      color: c.muted,
      fontFamily: f.sans,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 4,
    },
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Connect WhatsApp</Text>
          <Text style={styles.body}>
            Link your WhatsApp Business number so patients can book and receive
            visit updates on WhatsApp.
          </Text>
          <WhatsAppConnectGuide variant="compact" />
          <Button
            label="Connect now"
            onPress={() => {
              onClose();
              router.push("/(tabs)/profile/whatsapp-connect" as Href);
            }}
          />
          <Button
            label="Skip for now"
            variant="secondary"
            onPress={async () => {
              await storage.setItem(WA_SKIP_KEY, "1");
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { doctor, loading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const [showWaPrompt, setShowWaPrompt] = useState(false);
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !doctor) return;
    const doctorKey = String(doctor.id);
    if (checkedRef.current === doctorKey) return;
    checkedRef.current = doctorKey;
    (async () => {
      try {
        const skipped = await storage.getItem(WA_SKIP_KEY);
        if (skipped === "1") return;
        const status = await api.whatsappStatus();
        if (!status.connected) {
          setShowWaPrompt(true);
        }
      } catch {
        // Backend may not expose the endpoint yet on older deploys.
      }
    })();
  }, [doctor, loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const onLogin = segments[0] === "login";
  if (!doctor && !onLogin) return <Redirect href="/login" />;
  if (doctor && onLogin) return <Redirect href="/(tabs)" />;

  return (
    <>
      {children}
      <WhatsAppConnectPrompt
        visible={showWaPrompt}
        onClose={() => setShowWaPrompt(false)}
      />
    </>
  );
}

function ThemedRoot() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style="dark" />
      <AuthProvider>
        <Gate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: {
                fontFamily: "Manrope_700Bold",
                color: colors.text,
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack>
        </Gate>
      </AuthProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GlobalErrorBoundary>
        <ThemeProvider>
          <ThemedRoot />
        </ThemeProvider>
      </GlobalErrorBoundary>
    </SafeAreaProvider>
  );
}
