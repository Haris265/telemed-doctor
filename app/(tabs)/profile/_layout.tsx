import { Stack } from "expo-router";

import { useTheme } from "@/lib/theme";

export default function ProfileLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: fonts.sansBold,
          color: colors.text,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="edit" options={{ title: "Edit profile" }} />
      <Stack.Screen
        name="change-password"
        options={{ title: "Change password" }}
      />
      <Stack.Screen
        name="whatsapp-connect"
        options={{ title: "Connect WhatsApp" }}
      />
    </Stack>
  );
}
