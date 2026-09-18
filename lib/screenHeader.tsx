import { AppHeaderTitle } from "@/components/AppHeaderTitle";
import type { ThemeColors } from "@/constants/theme";
import { fonts } from "@/constants/theme";
import { HEADER_ROW_HEIGHT } from "@/lib/headerConstants";

export { HEADER_ROW_HEIGHT };

export function screenHeaderOptions(
  colors: ThemeColors,
  themeFonts: typeof fonts = fonts,
) {
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerTitle: () => <AppHeaderTitle />,
    headerTitleAlign: "center" as const,
    headerShadowVisible: false,
    headerTitleContainerStyle: {
      height: HEADER_ROW_HEIGHT,
      justifyContent: "center" as const,
    },
    headerLeftContainerStyle: {
      height: HEADER_ROW_HEIGHT,
      justifyContent: "center" as const,
    },
    headerRightContainerStyle: {
      height: HEADER_ROW_HEIGHT,
      justifyContent: "center" as const,
    },
    headerTitleStyle: {
      fontFamily: themeFonts.sansBold,
      color: colors.text,
    },
  };
}
