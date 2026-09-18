import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router } from "expo-router";

import { useTheme } from "@/lib/theme";

type Props = {
  fallbackHref?: Href;
};

export function HeaderBackButton({ fallbackHref }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        if (fallbackHref) {
          router.replace(fallbackHref);
        }
      }}
      style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Ionicons name="arrow-back" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginRight: 4,
  },
});
