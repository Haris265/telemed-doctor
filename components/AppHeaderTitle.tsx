import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    alignSelf: "flex-start",
    alignItems: "flex-start",
    justifyContent: "center",
  },
});
