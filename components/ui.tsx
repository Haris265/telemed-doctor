import { ReactNode, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { useTheme } from "@/lib/theme";
import type { ThemeColors } from "@/constants/theme";
import { fonts as fontNames } from "@/constants/theme";

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ClinicBackdrop />
      <View
        style={[
          { flex: 1, paddingHorizontal: 16, paddingTop: 12, zIndex: 1 },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const { colors, fonts } = useTheme();
  return (
    <Text
      style={{
        color: colors.text,
        fontSize: 28,
        fontFamily: fonts.serifBold,
        letterSpacing: -0.4,
      }}
    >
      {children}
    </Text>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  const { colors, fonts } = useTheme();
  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 6,
        fontFamily: fonts.sans,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors, fonts } = useTheme();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : colors.surfaceAlt;
  const textColor = variant === "secondary" ? colors.text : "#ffffff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: bg,
          opacity: pressed || disabled || loading ? 0.7 : 1,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
          <Text
            style={{
              color: textColor,
              fontFamily: fonts.sansBold,
              fontSize: 15,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = "default",
  disabled,
  loading,
  size = 20,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
  loading?: boolean;
  size?: number;
}) {
  const { colors } = useTheme();
  const iconColor =
    variant === "danger"
      ? colors.danger
      : variant === "primary"
        ? "#ffffff"
        : colors.text;
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? "rgba(185,28,28,0.08)"
        : colors.surfaceAlt;
  const borderColor =
    variant === "danger"
      ? "rgba(185,28,28,0.35)"
      : variant === "primary"
        ? colors.primary
        : colors.border;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          opacity: pressed || disabled || loading ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <Ionicons name={name} size={size} color={iconColor} />
      )}
    </Pressable>
  );
}

export function Input(
  props: TextInputProps & {
    label?: string;
    hint?: string;
    required?: boolean;
    error?: string;
    secureToggle?: boolean;
  },
) {
  const { colors, fonts } = useTheme();
  const {
    label,
    hint,
    required,
    error,
    style,
    secureToggle,
    secureTextEntry,
    ...rest
  } = props;
  const [visible, setVisible] = useState(false);
  const isSecure = Boolean(secureToggle ? !visible : secureTextEntry);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily: fonts.sansSemi,
              letterSpacing: 0.3,
            }}
          >
            {label}
          </Text>
          {required ? (
            <Text
              accessibilityLabel="required"
              style={{
                color: colors.danger,
                fontSize: 13,
                fontFamily: fonts.sansBold,
                lineHeight: 14,
                marginTop: 1,
              }}
            >
              *
            </Text>
          ) : null}
          {hint ? (
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                fontFamily: fonts.sans,
              }}
            >
              {hint}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={{ position: "relative", justifyContent: "center" }}>
        <TextInput
          placeholderTextColor={colors.muted}
          secureTextEntry={isSecure}
          style={[
            {
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: error ? colors.danger : colors.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              paddingRight: secureToggle ? 46 : 14,
              color: colors.text,
              fontSize: 16,
              fontFamily: fonts.sans,
            },
            style,
          ]}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 12,
              height: "100%",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          style={{
            color: colors.danger,
            fontSize: 12,
            fontFamily: fonts.sans,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function TextArea(props: TextInputProps & { label?: string }) {
  return (
    <Input
      {...props}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      style={[{ minHeight: 90 }, props.style]}
    />
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  const { colors, fonts } = useTheme();
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    success: { bg: "rgba(4,120,87,0.12)", fg: colors.success },
    warning: { bg: "rgba(180,83,9,0.12)", fg: colors.warning },
    info: { bg: "rgba(15,118,110,0.12)", fg: colors.primary },
    danger: { bg: "rgba(185,28,28,0.12)", fg: colors.danger },
  }[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: map.bg,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontFamily: fonts.sansBold,
          color: map.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const { colors, fonts } = useTheme();
  if (!children) return null;
  return (
    <Text
      style={{
        color: colors.danger,
        fontSize: 13,
        marginTop: 10,
        marginBottom: 4,
        fontFamily: fonts.sansSemi,
        lineHeight: 18,
      }}
    >
      {children}
    </Text>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: "center", gap: 6 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontFamily: fonts.sansSemi,
        }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 14,
            lineHeight: 20,
            textAlign: "center",
            fontFamily: fonts.sans,
          }}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}

export function StatCard({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: number | string;
  color?: string;
  onPress?: () => void;
}) {
  const { colors, fonts } = useTheme();
  const accent = color ?? colors.primary;
  const content = (
    <>
      <Text
        style={{
          fontSize: 28,
          fontFamily: fonts.sansExtra,
          color: accent,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
        }}
      >
        {label}
      </Text>
    </>
  );
  const cardStyle = {
    flex: 1,
    minWidth: "45%" as const,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: accent,
    padding: 14,
    gap: 4,
  };

  if (!onPress) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.75 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

/** Build StyleSheet that tracks palette changes. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ThemeColors, f: typeof fontNames) => T,
) {
  const { colors, fonts } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, fonts)), [colors, fonts, factory]);
}
