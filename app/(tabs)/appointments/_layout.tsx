import { Stack } from "expo-router";

import { AppHeaderTitle } from "@/components/AppHeaderTitle";
import { HeaderBackButton } from "@/components/HeaderBackButton";
import { useTheme } from "@/lib/theme";

export default function AppointmentsLayout() {
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
