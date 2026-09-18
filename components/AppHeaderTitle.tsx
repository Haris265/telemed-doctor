import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { HEADER_ROW_HEIGHT } from "@/lib/headerConstants";
import { useTheme } from "@/lib/theme";

export function AppHeaderTitle() {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Doctor">
      <Ionicons name="fitness" size={28} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HEADER_ROW_HEIGHT,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
});
