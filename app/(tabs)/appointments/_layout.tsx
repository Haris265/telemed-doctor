import { Stack } from "expo-router";

import { HeaderBackButton } from "@/components/HeaderBackButton";
import { screenHeaderOptions } from "@/lib/screenHeader";
import { useTheme } from "@/lib/theme";

export default function AppointmentsLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        ...screenHeaderOptions(colors, fonts),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Appointments" }} />
      <Stack.Screen
        name="book"
        options={{
          title: "Book appointment",
          headerLeft: () => (
            <HeaderBackButton fallbackHref="/(tabs)/appointments" />
          ),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Visit",
          headerLeft: () => (
            <HeaderBackButton fallbackHref="/(tabs)/appointments" />
          ),
        }}
      />
    </Stack>
  );
}
