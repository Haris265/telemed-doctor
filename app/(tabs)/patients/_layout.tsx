import { Stack } from "expo-router";

import { HeaderBackButton } from "@/components/HeaderBackButton";
import { screenHeaderOptions } from "@/lib/screenHeader";
import { useTheme } from "@/lib/theme";

export default function PatientsLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        ...screenHeaderOptions(colors, fonts),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Patients" }} />
      <Stack.Screen
        name="[uuid]"
        options={{
          title: "Patient",
          headerLeft: () => (
            <HeaderBackButton fallbackHref="/(tabs)/patients" />
          ),
        }}
      />
    </Stack>
  );
}
