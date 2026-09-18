import { Stack } from "expo-router";

import { HeaderBackButton } from "@/components/HeaderBackButton";
import { screenHeaderOptions } from "@/lib/screenHeader";
import { useTheme } from "@/lib/theme";

export default function ClinicsLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        ...screenHeaderOptions(colors, fonts),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Clinics" }} />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Clinic schedule",
          headerLeft: () => (
            <HeaderBackButton fallbackHref="/(tabs)/clinics" />
          ),
        }}
      />
    </Stack>
  );
}
