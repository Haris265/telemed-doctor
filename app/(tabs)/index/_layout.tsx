import { Stack } from "expo-router";

import { screenHeaderOptions } from "@/lib/screenHeader";
import { useTheme } from "@/lib/theme";

export default function HomeLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        ...screenHeaderOptions(colors, fonts),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
    </Stack>
  );
}
