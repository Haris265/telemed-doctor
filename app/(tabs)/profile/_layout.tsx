import { Stack } from "expo-router";

import { HeaderBackButton } from "@/components/HeaderBackButton";
import { screenHeaderOptions } from "@/lib/screenHeader";
import { useTheme } from "@/lib/theme";

export default function ProfileLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        ...screenHeaderOptions(colors, fonts),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen
        name="edit"
        options={{
          title: "Edit profile",
          headerLeft: () => (
            <HeaderBackButton fallbackHref="/(tabs)/profile" />
          ),
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: "Change password",
          headerLeft: () => (
            <HeaderBackButton fallbackHref="/(tabs)/profile" />
          ),
        }}
      />
      <Stack.Screen
        name="whatsapp-connect"
        options={{
          title: "Connect WhatsApp",
          headerLeft: () => (
            <HeaderBackButton fallbackHref="/(tabs)/profile" />
          ),
        }}
      />
    </Stack>
  );
}
