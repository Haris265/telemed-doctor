import { Stack } from "expo-router";

import { useTheme } from "@/lib/theme";

export default function PatientsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Patients" }} />
      <Stack.Screen name="[uuid]" options={{ title: "Patient" }} />
    </Stack>
  );
}
