import { Stack } from "expo-router";

import { AppHeaderTitle } from "@/components/AppHeaderTitle";
import { useTheme } from "@/lib/theme";

export default function ClinicsLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitle: () => <AppHeaderTitle />,
        headerTitleAlign: "left",
        headerTitleStyle: {
          fontFamily: fonts.sansBold,
          color: colors.text,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Clinics" }} />
      <Stack.Screen name="[id]" options={{ title: "Clinic schedule" }} />
    </Stack>
  );
}
